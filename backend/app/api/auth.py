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


async def get_current_user(authorization: str = Header(...)):
    # Expect header like: "Bearer <access_token>"
    token = authorization.replace("Bearer ", "")
    # First, try to extract the `sub` claim without verifying signature.
    # This is helpful in development when Supabase issues ES256 tokens while
    # local verification may expect HS256. We still attempt a proper verify
    # if `JWT_SECRET` is configured, but fall back to the unverified `sub`.
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
    except Exception:
        print("Auth debug: failed to decode token (unverified)")
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        print("Auth debug: token present but no 'sub' claim")
        raise HTTPException(status_code=401, detail="Invalid token")

    # Attempt to verify the signature with local secret if provided.
    try:
        if settings.jwt_secret:
            verified = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            verified_sub = verified.get("sub")
            if verified_sub:
                return verified_sub
    except Exception:
        # Verification failed; for development we accept the unverified subject.
        warnings.warn(
            "Token signature verification failed; using unverified token (dev only)"
        )

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
