from fastapi import APIRouter, Depends
from .auth import get_current_user
from ..db.client import supabase

router = APIRouter()


@router.get("/")
async def list_decks(user_id: str = Depends(get_current_user)):
    # Return decks for the authenticated user, newest first
    res = (
        supabase.table("decks")
        .select("id, deck_name, mastery_level, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []
