from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.auth import get_current_user
from app.services.package_service import PackageNotFoundError
from app.services.question_service import (
    QuestionError,
    QuestionNotFoundError,
    QuestionValidationError,
    add_question_concept,
    create_question,
    delete_question,
    get_question,
    get_question_concepts,
    get_question_detail,
    get_questions_by_concept,
    list_questions,
    remove_question_concept,
    set_question_concepts,
    update_question,
)

router = APIRouter()


class QuestionConceptWeightRequest(BaseModel):
    concept_id: str
    weight: float = Field(default=1.0, ge=0.0, le=1.0)


class QuestionCreateRequest(BaseModel):
    package_slug: str = Field(..., min_length=1)
    title: str | None = Field(default=None, max_length=255)
    question_text: str = Field(..., min_length=1)
    source: str | None = None
    difficulty: float = Field(default=0.5, ge=0.0, le=1.0)
    concepts: list[QuestionConceptWeightRequest] | None = None


class QuestionUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    question_text: str | None = None
    source: str | None = None
    difficulty: float | None = Field(default=None, ge=0.0, le=1.0)
    concepts: list[QuestionConceptWeightRequest] | None = None


class QuestionConceptTagRequest(BaseModel):
    concept_id: str
    weight: float = Field(default=1.0, ge=0.0, le=1.0)


def _translate_error(exc: Exception) -> HTTPException:
    if isinstance(exc, QuestionNotFoundError | PackageNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, QuestionValidationError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, QuestionError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@router.get("/")
async def get_questions(
    package_slug: str | None = Query(default=None),
    user_id: str = Depends(get_current_user),
):
    try:
        return list_questions(user_id=user_id, package_slug=package_slug)
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/")
async def create_question_route(
    body: QuestionCreateRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        question = create_question(
            user_id=user_id,
            package_slug=body.package_slug,
            title=body.title,
            question_text=body.question_text,
            source=body.source,
            difficulty=body.difficulty,
            concept_weights=[item.model_dump() for item in body.concepts or []] or None,
        )
        return get_question_detail(user_id=user_id, question_id=question["id"])
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/{question_id}")
async def get_question_route(question_id: str, user_id: str = Depends(get_current_user)):
    try:
        return get_question_detail(user_id=user_id, question_id=question_id)
    except Exception as exc:
        raise _translate_error(exc)


@router.patch("/{question_id}")
async def update_question_route(
    question_id: str,
    body: QuestionUpdateRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        question = update_question(
            user_id=user_id,
            question_id=question_id,
            updates=body.model_dump(exclude_none=True, exclude={"concepts"}),
        )
        if body.concepts is not None:
            set_question_concepts(
                user_id=user_id,
                question_id=question["id"],
                concept_weights=[item.model_dump() for item in body.concepts],
            )
        return get_question_detail(user_id=user_id, question_id=question_id)
    except Exception as exc:
        raise _translate_error(exc)


@router.delete("/{question_id}")
async def delete_question_route(
    question_id: str, user_id: str = Depends(get_current_user)
):
    try:
        delete_question(user_id=user_id, question_id=question_id)
        return {"deleted": True}
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/{question_id}/concepts")
async def get_question_concepts_route(
    question_id: str, user_id: str = Depends(get_current_user)
):
    try:
        return get_question_concepts(user_id=user_id, question_id=question_id)
    except Exception as exc:
        raise _translate_error(exc)


@router.put("/{question_id}/concepts")
async def set_question_concepts_route(
    question_id: str,
    body: list[QuestionConceptWeightRequest],
    user_id: str = Depends(get_current_user),
):
    try:
        return set_question_concepts(
            user_id=user_id,
            question_id=question_id,
            concept_weights=[item.model_dump() for item in body],
        )
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/{question_id}/concepts")
async def add_question_concept_route(
    question_id: str,
    body: QuestionConceptTagRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        return add_question_concept(
            user_id=user_id,
            question_id=question_id,
            concept_id=body.concept_id,
            weight=body.weight,
        )
    except Exception as exc:
        raise _translate_error(exc)


@router.delete("/{question_id}/concepts/{concept_id}")
async def remove_question_concept_route(
    question_id: str,
    concept_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        return remove_question_concept(
            user_id=user_id,
            question_id=question_id,
            concept_id=concept_id,
        )
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/by-concept/{concept_id}")
async def get_questions_by_concept_route(
    concept_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        return get_questions_by_concept(user_id=user_id, concept_id=concept_id)
    except Exception as exc:
        raise _translate_error(exc)