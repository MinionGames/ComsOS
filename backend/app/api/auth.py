from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings
from app.db.client import supabase

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"],
                             options={"verify_aud": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/signup")
async def signup(email: str, password: str):
    res = supabase.auth.sign_up({"email": email, "password": password})
    if res.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")
    # create profile row
    supabase.table("profiles").insert({
        "id": res.user.id,
        "email": email,
    }).execute()
    return {"message": "Check your email to confirm your account"}

@router.post("/login")
async def login(email: str, password: str):
    res = supabase.auth.sign_in_with_password({"email": email, "password": password})
    if res.user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": res.session.access_token,
        "user": {"id": res.user.id, "email": res.user.email}
    }