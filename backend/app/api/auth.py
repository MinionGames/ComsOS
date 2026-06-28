from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from ..config import settings
from ..db.client import supabase
import httpx
import traceback
import os
from urllib.parse import urlparse
from typing import Optional

router = APIRouter()


class AuthRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


def _ensure_profile_row(user_id: str, email: Optional[str] = None) -> None:
    """Best-effort profile upsert for users authenticated via Supabase auth."""
    try:
        existing = (
            supabase.table("profiles")
            .select("id,email")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = getattr(existing, "data", None) or []
        if rows:
            # If row exists but email is missing, try to backfill it.
            if email and not rows[0].get("email"):
                try:
                    (
                        supabase.table("profiles")
                        .update({"email": email})
                        .eq("id", user_id)
                        .execute()
                    )
                except Exception:
                    pass
            return

        payload = {"id": user_id}
        if email:
            payload["email"] = email
        supabase.table("profiles").insert(payload).execute()
    except Exception:
        # Profiles are optional for auth endpoints; never block login/signup.
        pass


def _is_missing_profiles_table_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "profiles" in msg and (
        "404" in msg
        or "could not find" in msg
        or "relation" in msg
        or "does not exist" in msg
    )


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not isinstance(authorization, str) or not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    raw = authorization.strip()
    parts = raw.split()
    token = parts[-1] if len(parts) >= 2 else raw

    publishable = (
        settings.supabase_anon_key
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )
    if not publishable:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in environment",
        )

    url = settings.supabase_url.rstrip("/") + "/auth/v1/user"
    headers = {
        "apikey": publishable,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, headers=headers)
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

    if r.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Invalid token")
    if r.status_code >= 400:
        detail = r.text
        try:
            ej = r.json()
            if isinstance(ej, dict):
                detail = ej.get("msg") or ej.get("message") or detail
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Supabase auth failed: {detail}")

    user = r.json() if r.text else {}
    user_id = user.get("id") if isinstance(user, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


@router.post("/signup")
async def signup(body: AuthRequest):
    try:
        publishable = (
            settings.supabase_anon_key
            or os.getenv("SUPABASE_PUBLISHABLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
        )
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
        if body.name:
            payload["data"] = {"name": body.name}
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
                    if (
                        status == 429
                        or "rate limit" in msg.lower()
                        or "rate_limit" in err_code.lower()
                    ):
                        status = 429
                    detail = msg or detail
            except Exception:
                pass
            raise HTTPException(status_code=status, detail=detail)

        j = r.json()

        class _Res:
            pass

        res = _Res()
        # Supabase can return either {"user": {...}} or user fields at the top level.
        if isinstance(j, dict) and isinstance(j.get("user"), dict):
            res.user = j.get("user")
        elif isinstance(j, dict) and j.get("id"):
            res.user = j
        else:
            res.user = None
    except HTTPException:
        raise
    except Exception as e:
        print("Signup exception:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    if not getattr(res, "user", None):
        raise HTTPException(status_code=400, detail="Signup failed")

    user_id = (
        res.user.get("id")
        if isinstance(res.user, dict)
        else getattr(res.user, "id", None)
    )
    if not user_id:
        raise HTTPException(
            status_code=502, detail="Supabase signup response missing user id"
        )

    _ensure_profile_row(user_id, body.email)

    return {"message": "Check your email to confirm your account"}


@router.post("/login")
async def login(body: AuthRequest):
    # Try a direct REST call to Supabase auth token endpoint using the
    # publishable/anon key. This avoids library paths that may attempt to
    # use legacy/service keys for auth and trigger "Legacy API keys are disabled".
    try:
        publishable = (
            settings.supabase_anon_key
            or os.getenv("SUPABASE_PUBLISHABLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
        )
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
        print(
            "Auth request using publishable key (masked)",
            publishable[:8] + "..." + publishable[-6:],
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                url,
                json={"email": body.email, "password": body.password},
                headers=headers,
            )
        if r.status_code >= 400:
            detail = r.text
            status = 401
            try:
                ej = r.json()
                if isinstance(ej, dict):
                    msg = ej.get("msg") or ej.get("message") or ""
                    err_code = ej.get("error_code") or ""
                    if (
                        r.status_code == 429
                        or "rate limit" in msg.lower()
                        or "rate_limit" in err_code.lower()
                    ):
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

    user_id = (
        res.user.get("id")
        if isinstance(res.user, dict)
        else getattr(res.user, "id", None)
    )
    user_email = (
        res.user.get("email")
        if isinstance(res.user, dict)
        else getattr(res.user, "email", None)
    )
    if not user_id:
        raise HTTPException(
            status_code=502, detail="Supabase login response missing user id"
        )

    _ensure_profile_row(user_id, user_email)

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
        # Do not fail auth when the optional profiles table is absent.
        if _is_missing_profiles_table_error(e):
            return {"user": {"id": user_id}, "profile": None}
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if not authorization:
        return {"ok": True}

    raw = authorization.strip()
    parts = raw.split()
    token = parts[-1] if len(parts) >= 2 else raw

    publishable = (
        settings.supabase_anon_key
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )
    if not publishable:
        return {"ok": True}

    url = settings.supabase_url.rstrip("/") + "/auth/v1/logout"
    headers = {
        "apikey": publishable,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(url, headers=headers)
    except Exception:
        pass

    return {"ok": True}
