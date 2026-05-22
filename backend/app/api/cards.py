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


@router.get("/due-today")
async def cards_due_today(user_id: str = Depends(get_current_user)):
    """Return cards due today for the authenticated user.

    This tries to use a `due_date` column if present. If the column does not
    exist (older schema), it falls back to returning cards created today.
    All datetimes are compared in UTC.
    """
    try:
        from datetime import datetime, timezone, timedelta

        now_utc = datetime.now(timezone.utc)
        start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)

        # Try using due_date column first. If the column doesn't exist the SDK
        # may return an error; handle that and fall back to created_at range.
        try:
            res = (
                supabase.table("cards")
                .select("id, front, back, subject_id, due_date, deck_id")
                .eq("user_id", user_id)
                .gte("due_date", start.isoformat())
                .lt("due_date", end.isoformat())
                .order("due_date", desc=False)
                .execute()
            )
        except Exception:
            res = None

        # If we got a valid response with data, return it
        if res is not None:
            err = getattr(res, "error", None)
            data = getattr(res, "data", None)
            if not err and data:
                return data

        # Fallback: use created_at to find cards created today
        res2 = (
            supabase.table("cards")
            .select("id, front, back, subject_id, created_at, deck_id")
            .eq("user_id", user_id)
            .gte("created_at", start.isoformat())
            .lt("created_at", end.isoformat())
            .order("created_at", desc=True)
            .execute()
        )
        return res2.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
