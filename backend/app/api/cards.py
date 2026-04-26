from fastapi import APIRouter, Depends, HTTPException
from ..api.auth import get_current_user
from ..db.client import supabase

router = APIRouter()


@router.get("/counts")
async def card_counts(user_id: str = Depends(get_current_user)):
    try:
        res = (
            supabase.table("cards")
            .select("id, subject_id")
            .eq("user_id", user_id)
            .execute()
        )
        rows = res.data or []
        counts = {}
        for r in rows:
            sid = r.get("subject_id")
            if sid:
                counts[sid] = counts.get(sid, 0) + 1
        return counts
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_cards(user_id: str = Depends(get_current_user)):
    try:
        res = (
            supabase.table("cards")
            .select("id, front, back, subject_id, created_at, deck_id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
