from fastapi import APIRouter, Depends
from .auth import get_current_user
from ..db.client import supabase
from fastapi import HTTPException

router = APIRouter()


@router.get("/")
async def list_decks(user_id: str = Depends(get_current_user)):
    # Return decks for the authenticated user, newest first
    res = (
        supabase.table("decks")
        .select("id, deck_name, subject_id, created_at")
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


@router.patch("/{deck_id}")
async def update_deck(
    deck_id: str, body: dict, user_id: str = Depends(get_current_user)
):
    # Accepts partial updates: deck_name, subject_id
    updates = {}
    if "deck_name" in body:
        updates["deck_name"] = body["deck_name"]
    if "subject_id" in body:
        # allow null to clear subject
        updates["subject_id"] = body["subject_id"]

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        res = (
            supabase.table("decks")
            .update(updates)
            .eq("id", deck_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    err = getattr(res, "error", None)
    if err:
        raise HTTPException(status_code=500, detail=getattr(err, "message", str(err)))

    data = getattr(res, "data", None)
    return data[0] if data and len(data) > 0 else {}
