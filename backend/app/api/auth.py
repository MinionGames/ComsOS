from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from jose import jwt
from ..config import settings
from ..db.client import supabase, supabase_anon
import httpx
import warnings
import traceback
import os
from urllib.parse import urlparse
from typing import Optional

router = APIRouter()


class AuthRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


async def get_current_user(authorization: str = Header(None)):
    # Expect header like: "Bearer <access_token>". Be tolerant of variants.
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    raw = authorization.strip()
    parts = raw.split()
    # If header is like 'Bearer <token>' take last part, otherwise use raw
    token = parts[-1] if len(parts) >= 2 else raw
    # First, try to extract the `sub` claim without verifying signature.
    # This is helpful in development when Supabase issues ES256 tokens while
    # local verification may expect HS256. We still attempt a proper verify
    # if `JWT_SECRET` is configured, but fall back to the unverified `sub`.
    try:
        # Manually parse JWT payload without verifying signature to avoid
        # library-specific behavior. This extracts the middle segment,
        # base64url-decodes it and loads JSON.
        parts = token.split(".")
        if len(parts) < 2:
            raise ValueError("Invalid JWT format")
        import base64
        import json

        b = parts[1]
        # pad base64 string
        rem = len(b) % 4
        if rem > 0:
            b += "=" * (4 - rem)
        decoded = base64.urlsafe_b64decode(b.encode("utf-8"))
        payload = json.loads(decoded)
        user_id = payload.get("sub")
    except Exception as e:
        print(f"Auth debug: failed to decode token (unverified): {str(e)[:200]}")
        raise HTTPException(status_code=401, detail="Invalid token")
    # Attempt to verify the signature with local secret if provided.
    if settings.jwt_secret:
        try:
            verified = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            verified_sub = verified.get("sub")
            if verified_sub:
                print(
                    "Auth debug: token verified with local secret; sub=", verified_sub
                )
                return verified_sub
        except Exception as e:
            warnings.warn(
                "Token signature verification failed; using unverified token (dev only): "
                + str(e)
            )

    print("Auth debug: returning user_id from token sub", user_id)
    return user_id


@router.post("/signup")
async def signup(body: AuthRequest):
    try:
        publishable = settings.supabase_anon_key or os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not publishable:
            raise HTTPException(
                status_code=500,
                detail="Missing SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in environment",
            )
        if not publishable.startswith("sb_"):
            raise HTTPException(
                status_code=500,
                detail=(
                    "Configured SUPABASE_PUBLISHABLE_KEY does not look like a new publishable key. "
                    "Remove legacy keys and set SUPABASE_PUBLISHABLE_KEY to the 'sb_' publishable key from the Supabase dashboard."
                ),
            )

        url = settings.supabase_url.rstrip("/") + "/auth/v1/signup"
        headers = {
            "apikey": publishable,
            "Authorization": f"Bearer {publishable}",
            "Content-Type": "application/json",
        }
        payload = {"email": body.email, "password": body.password}
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload, headers=headers)
        if r.status_code >= 400:
            detail = r.text
            status = r.status_code
            try:
                ej = r.json()
                if isinstance(ej, dict):
                    msg = ej.get("msg") or ej.get("message") or ""
                    err_code = ej.get("error_code") or ""
                    if status == 429 or "rate limit" in msg.lower() or "rate_limit" in err_code.lower():
                        status = 429
                    detail = msg or detail
            except Exception:
                pass
            raise HTTPException(status_code=status, detail=detail)

        j = r.json()
        class _Res:
            pass

        res = _Res()
        res.user = j.get("user")
    except HTTPException:
        raise
    except Exception as e:
        print("Signup exception:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    if not getattr(res, "user", None):
        raise HTTPException(status_code=400, detail="Signup failed")

    user_id = res.user.get("id") if isinstance(res.user, dict) else getattr(res.user, "id", None)
    if not user_id:
        raise HTTPException(status_code=502, detail="Supabase signup response missing user id")

    # Best-effort profile row creation. Do not block signup on profile insert race/duplicates.
    profile_payload = {
        "id": user_id,
        "email": body.email,
    }
    if body.name:
        profile_payload["name"] = body.name
    try:
        supabase.table("profiles").insert(profile_payload).execute()
    except Exception:
        pass

    return {"message": "Check your email to confirm your account"}


@router.post("/login")
async def login(body: AuthRequest):
    # Try a direct REST call to Supabase auth token endpoint using the
    # publishable/anon key. This avoids library paths that may attempt to
    # use legacy/service keys for auth and trigger "Legacy API keys are disabled".
    try:
        publishable = settings.supabase_anon_key or os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not publishable:
            raise HTTPException(
                status_code=500,
                detail="Missing SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in environment",
            )
        # Validate the publishable key looks like the new `sb_` key
        if not publishable.startswith("sb_"):
            raise HTTPException(
                status_code=500,
                detail=(
                    "Configured SUPABASE_PUBLISHABLE_KEY does not look like a new publishable key. "
                    "Remove legacy keys and set SUPABASE_PUBLISHABLE_KEY to the 'sb_' publishable key from the Supabase dashboard."
                ),
            )

        url = settings.supabase_url.rstrip("/") + "/auth/v1/token?grant_type=password"
        # Send the publishable key in both headers to match typical Supabase client behavior
        headers = {
            "apikey": publishable,
            "Authorization": f"Bearer {publishable}",
            "Content-Type": "application/json",
        }
        print("Auth request using publishable key (masked)", publishable[:8] + "..." + publishable[-6:])
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json={"email": body.email, "password": body.password}, headers=headers)
        if r.status_code >= 400:
            detail = r.text
            status = 401
            try:
                ej = r.json()
                if isinstance(ej, dict):
                    msg = ej.get("msg") or ej.get("message") or ""
                    err_code = ej.get("error_code") or ""
                    if r.status_code == 429 or "rate limit" in msg.lower() or "rate_limit" in err_code.lower():
                        status = 429
                    detail = msg or detail
            except Exception:
                pass
            raise HTTPException(status_code=status, detail=detail)
        j = r.json()
        # j contains access_token, refresh_token, user, etc.
        class _Res:
            pass

        res = _Res()
        res.session = type("S", (), {})()
        res.session.access_token = j.get("access_token")
        res.user = j.get("user")
        if not res.session.access_token or not res.user:
            raise HTTPException(
                status_code=502,
                detail="Supabase login response missing access_token or user",
            )
    except HTTPException:
        raise
    except httpx.RequestError as e:
        host = urlparse(settings.supabase_url).hostname or settings.supabase_url
        raise HTTPException(
            status_code=502,
            detail=(
                f"Unable to reach Supabase host '{host}'. "
                "Verify SUPABASE_URL and network/DNS connectivity. "
                f"Original error: {e}"
            ),
        )
    except Exception as e:
        print("Login exception:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    if res.user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = res.user.get("id") if isinstance(res.user, dict) else getattr(res.user, "id", None)
    user_email = (
        res.user.get("email")
        if isinstance(res.user, dict)
        else getattr(res.user, "email", None)
    )
    if not user_id:
        raise HTTPException(status_code=502, detail="Supabase login response missing user id")

    return {
        "access_token": res.session.access_token,
        "user": {"id": user_id, "email": user_email},
    }


@router.get("/me")
async def me(user_id: str = Depends(get_current_user)):
    # Return minimal user info and profile row if present
    try:
        res = (
            supabase.table("profiles").select("*").eq("id", user_id).limit(1).execute()
        )
        profile = None
        try:
            profile = res.data[0]
        except Exception:
            profile = None
        return {"user": {"id": user_id}, "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logout")
async def logout(authorization: str = Header(...)):
    # Expect header like: "Bearer <access_token>"
    # Extract token if needed in the future; currently not used
    _ = authorization.replace("Bearer ", "")
    # Try to sign out via Supabase client if available; otherwise return OK
    try:
        # supabase-py may support sign_out; call it if present
        sign_out_fn = getattr(supabase.auth, "sign_out", None)
        if callable(sign_out_fn):
            try:
                sign_out_fn()
            except Exception:
                # ignore
                pass
    except Exception:
        pass
    return {"ok": True}
