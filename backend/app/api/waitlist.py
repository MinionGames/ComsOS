from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ..db.client import supabase

router = APIRouter()


class WaitlistSignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    current_sat_score: Optional[int] = Field(default=None, ge=400, le=1600)
    target_sat_score: Optional[int] = Field(default=None, ge=400, le=1600)


@router.post("/")
async def join_waitlist(payload: WaitlistSignupRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    try:
        existing = (
            supabase.table("waitlist")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if (getattr(existing, "data", None) or []):
            raise HTTPException(status_code=409, detail="Email already on waitlist")

        insert_payload = {
            "email": email,
            "current_sat_score": payload.current_sat_score,
            "target_sat_score": payload.target_sat_score,
        }

        supabase.table("waitlist").insert(insert_payload).execute()
        return {
            "message": "You're on the list. We'll let you know when ComsOS opens beta access."
        }
    except HTTPException:
        raise
    except Exception as exc:
        msg = str(exc).lower()
        # Fallback in case two requests race and unique constraint catches duplicate.
        if "duplicate" in msg or "unique" in msg:
            raise HTTPException(status_code=409, detail="Email already on waitlist")
        raise HTTPException(status_code=500, detail="Failed to join waitlist")
