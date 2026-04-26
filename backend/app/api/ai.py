from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.anthropic_service import complete
from app.config import settings
from app.services.anthropic_service import list_models
from app.services.card_generator import generate_cards_from_text
from app.api.auth import get_current_user
from app.db.client import supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class CompletionRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 300
    model: Optional[str] = None


class GenerateCardsRequest(BaseModel):
    extracted_text: str
    # pass subject_id (or leave null) to associate cards with a subject
    subject_name: Optional[str] = None
    model: Optional[str] = None


@router.post("/complete")
async def create_completion(req: CompletionRequest):
    try:
        model = req.model or settings.anthropic_default_model
        text = await complete(req.prompt, req.max_tokens or 300, model)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_anthropic(model: Optional[str] = None):
    """Quick test endpoint that runs a small prompt through Anthropic and returns the result.

    Use `?model=claude-haiku-3` to try a different model. If you get a 404, your Anthropic
    account likely doesn't have access to that model.
    """
    model = model or settings.anthropic_default_model
    prompt = "Write a single-line friendly confirmation message saying Anthropic is connected."
    try:
        text = await complete(prompt, max_tokens=60, model=model)
        return {"ok": True, "model": model, "text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def models():
    """Return the models your API key can access (proxied)."""
    try:
        data = await list_models()
        return {"ok": True, "models": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-cards")
async def generate_cards(
    req: GenerateCardsRequest, user_id: str = Depends(get_current_user)
):
    try:
        cards = await generate_cards_from_text(
            req.extracted_text, subject_name=req.subject_name or "", model=req.model
        )

        # prepare records for bulk insert
        subject_id = req.subject_name or None
        records = []
        for c in cards:
            # basic validation to avoid DB errors
            front = (c.get("front") or "").strip()
            back = (c.get("back") or "").strip()
            if not front or not back:
                logger.warning("Skipping invalid card without front/back: %s", c)
                continue
            records.append(
                {
                    "user_id": user_id,
                    "front": front,
                    "back": back,
                    "difficulty": c.get("difficulty") or "medium",
                    "card_type": c.get("card_type") or "definition",
                    "subject_id": subject_id,
                }
            )

        if not records:
            raise HTTPException(status_code=400, detail="No valid cards to insert")

        # Perform bulk insert and check for Supabase errors
        try:
            res = supabase.table("cards").insert(records).execute()
        except Exception as db_exc:
            logger.exception("Supabase insert raised exception")
            raise HTTPException(
                status_code=500, detail=f"Database insert failed: {db_exc}"
            )

        # SDK may return .error
        err = getattr(res, "error", None)
        data = None
        try:
            data = res.data
        except Exception:
            data = None

        if err:
            logger.error("Supabase insert error: %s; payload: %s", err, records)
            # surface the error message if present
            detail = getattr(err, "message", str(err))
            raise HTTPException(status_code=500, detail=f"Database error: {detail}")

        return {"ok": True, "cards": cards, "inserted": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to generate and insert cards")
        raise HTTPException(status_code=500, detail=str(e))
