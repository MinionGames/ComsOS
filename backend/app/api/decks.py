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


@router.get("/counts")
async def deck_counts(user_id: str = Depends(get_current_user)):
    """Return a mapping of subject_id -> number of decks for the authenticated user."""
    # Fallback: fetch decks for user and aggregate counts in Python
    # (some supabase clients don't support SQL grouping via the builder)
    res = (
        supabase.table("decks").select("subject_id,id").eq("user_id", user_id).execute()
    )
    rows = res.data or []
    counts: dict = {}
    for row in rows:
        sid = row.get("subject_id")
        if sid is None:
            continue
        counts[sid] = counts.get(sid, 0) + 1
    return counts
