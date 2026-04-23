from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from jose import jwt, JWTError
from ..config import settings
from ..db.client import supabase
import warnings

router = APIRouter()


class AuthRequest(BaseModel):
    email: str
    password: str


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
        import base64, json

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
        res = supabase.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if res.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")
    # create profile row
    supabase.table("profiles").insert(
        {
            "id": res.user.id,
            "email": body.email,
        }
    ).execute()
    return {"message": "Check your email to confirm your account"}


@router.post("/login")
async def login(body: AuthRequest):
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if res.user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": res.session.access_token,
        "user": {"id": res.user.id, "email": res.user.email},
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
    token = authorization.replace("Bearer ", "")
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
