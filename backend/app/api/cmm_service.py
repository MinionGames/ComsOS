from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.services.cmm import SRSModel, SRSConfig
from app.api.auth import get_current_user
import time

router = APIRouter(prefix="/cmm")


class PredictRequest(BaseModel):
	theta: float
	beta: float
	S: float
	t_hours: float = Field(..., alias="t")
	c: float
	config: Optional[Dict[str, Any]] = None


class PredictResponse(BaseModel):
	predicted: float


class ScheduleRequest(BaseModel):
	theta: float
	beta: float
	S: float
	c: float
	config: Optional[Dict[str, Any]] = None


class ScheduleResponse(BaseModel):
	next_interval_hours: float


class CardIn(BaseModel):
	card_id: Optional[str] = None
	beta: float
	c: float
	review_count: int = 0


class StateIn(BaseModel):
	S: float
	last_review_time_hours: Optional[float] = None


class ReviewRequest(BaseModel):
	subject: str
	card: CardIn
	state: StateIn
	actual_score: float = Field(..., ge=0.0, le=1.0)
	now_hours: Optional[float] = None
	config: Optional[Dict[str, Any]] = None


class ReviewResponse(BaseModel):
	predicted: float
	error: float
	S: float
	theta: float
	beta: float
	c: float


def _build_model_from_config(cfg: Optional[Dict[str, Any]] = None) -> SRSModel:
	if not cfg:
		return SRSModel()
	try:
		conf = SRSConfig(**cfg)
		return SRSModel(conf)
	except Exception:
		# On invalid config, fall back to defaults
		return SRSModel()


@router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest, user_id: str = Depends(get_current_user)):
	try:
		model = _build_model_from_config(req.config)
		pred = model.predict_recall(req.theta, req.beta, req.S, req.t_hours, req.c)
		return {"predicted": float(pred)}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedule", response_model=ScheduleResponse)
async def schedule(req: ScheduleRequest, user_id: str = Depends(get_current_user)):
	try:
		model = _build_model_from_config(req.config)
		# build minimal objects expected by schedule
		from app.services.cmm import User, Card, UserCardState

		user = User(user_id=user_id, theta={})
		card = Card(card_id="tmp", beta=req.beta, c=req.c, review_count=0)
		state = UserCardState(S=req.S)
		t_next = model.schedule(user, card, state, subject="default")
		return {"next_interval_hours": float(t_next)}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.post("/review", response_model=ReviewResponse)
async def review(req: ReviewRequest, user_id: str = Depends(get_current_user)):
	try:
		model = _build_model_from_config(req.config)
		from app.services.cmm import User, Card, UserCardState

		# Use provided now or wall-clock hours
		now = req.now_hours if req.now_hours is not None else time.time() / 3600.0

		# Initialize structures
		user = User(user_id=user_id, theta={})
		card = Card(card_id=req.card.card_id or "tmp", beta=req.card.beta, c=req.card.c, review_count=req.card.review_count)
		state = UserCardState(S=req.state.S, last_review_time=(req.state.last_review_time_hours or now - 24.0))

		out = model.review(user, card, state, req.subject, req.actual_score, now_hours=now)

		return {
			"predicted": float(out.get("predicted", 0.0)),
			"error": float(out.get("error", 0.0)),
			"S": float(out.get("S", req.state.S)),
			"theta": float(out.get("theta", 0.0)),
			"beta": float(out.get("beta", req.card.beta)),
			"c": float(out.get("c", req.card.c)),
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))



