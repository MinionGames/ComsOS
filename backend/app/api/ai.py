from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.anthropic_service import complete
from app.config import settings
from app.services.anthropic_service import list_models

router = APIRouter()


class CompletionRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 300
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
