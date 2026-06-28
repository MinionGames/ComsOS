from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.auth import get_current_user
from app.services.concept_graph import (
    ConceptGraphError,
    ConceptNotFoundError,
    ConceptService,
    GraphTraversalService,
    GraphValidationError,
    RelationshipNotFoundError,
    RelationshipService,
)

concepts_router = APIRouter()
relationships_router = APIRouter()


class ConceptCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    subject_id: str | None = None


class ConceptUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    subject_id: str | None = None


class RelationshipCreateRequest(BaseModel):
    source_concept_id: str
    target_concept_id: str
    relationship_type: str = Field(default="prerequisite", min_length=1, max_length=64)
    strength: float = Field(default=1.0, ge=0.0, le=1.0)


def _translate_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ConceptNotFoundError | RelationshipNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, GraphValidationError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, ConceptGraphError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@concepts_router.get("/")
async def get_concepts(
    subject_id: str | None = Query(default=None),
    user_id: str = Depends(get_current_user),
):
    try:
        return ConceptService.get_concepts_by_subject(
            user_id=user_id,
            subject_id=subject_id,
        )
    except Exception as exc:
        raise _translate_error(exc)


@concepts_router.post("/")
async def create_concept(
    body: ConceptCreateRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        return ConceptService.create_concept(
            user_id=user_id,
            name=body.name,
            description=body.description,
            subject_id=body.subject_id,
        )
    except Exception as exc:
        raise _translate_error(exc)


@concepts_router.get("/{concept_id}/prerequisites")
async def get_prerequisites(concept_id: str, user_id: str = Depends(get_current_user)):
    try:
        return GraphTraversalService.get_prerequisites(
            user_id=user_id,
            concept_id=concept_id,
        )
    except Exception as exc:
        raise _translate_error(exc)


@concepts_router.get("/{concept_id}/dependents")
async def get_dependents(concept_id: str, user_id: str = Depends(get_current_user)):
    try:
        return GraphTraversalService.get_dependents(
            user_id=user_id,
            concept_id=concept_id,
        )
    except Exception as exc:
        raise _translate_error(exc)


@concepts_router.get("/{concept_id}")
async def get_concept(concept_id: str, user_id: str = Depends(get_current_user)):
    try:
        return ConceptService.get_concept(user_id=user_id, concept_id=concept_id)
    except Exception as exc:
        raise _translate_error(exc)


@concepts_router.patch("/{concept_id}")
async def update_concept(
    concept_id: str,
    body: ConceptUpdateRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        return ConceptService.update_concept(
            user_id=user_id,
            concept_id=concept_id,
            updates=body.model_dump(exclude_none=True),
        )
    except Exception as exc:
        raise _translate_error(exc)


@concepts_router.delete("/{concept_id}")
async def delete_concept(concept_id: str, user_id: str = Depends(get_current_user)):
    try:
        ConceptService.delete_concept(user_id=user_id, concept_id=concept_id)
        return {"deleted": True}
    except Exception as exc:
        raise _translate_error(exc)


@relationships_router.get("/")
async def get_relationships(
    concept_id: str | None = Query(default=None),
    direction: str | None = Query(default=None),
    user_id: str = Depends(get_current_user),
):
    try:
        if concept_id and direction == "incoming":
            return RelationshipService.get_incoming_relationships(
                user_id=user_id,
                concept_id=concept_id,
            )
        if concept_id and direction == "outgoing":
            return RelationshipService.get_outgoing_relationships(
                user_id=user_id,
                concept_id=concept_id,
            )
        return RelationshipService.get_relationships(
            user_id=user_id,
            concept_id=concept_id,
        )
    except Exception as exc:
        raise _translate_error(exc)


@relationships_router.post("/")
async def create_relationship(
    body: RelationshipCreateRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        return RelationshipService.create_relationship(
            user_id=user_id,
            source_concept_id=body.source_concept_id,
            target_concept_id=body.target_concept_id,
            relationship_type=body.relationship_type,
            strength=body.strength,
        )
    except Exception as exc:
        raise _translate_error(exc)


@relationships_router.delete("/{relationship_id}")
async def delete_relationship(
    relationship_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        RelationshipService.delete_relationship(
            user_id=user_id,
            relationship_id=relationship_id,
        )
        return {"deleted": True}
    except Exception as exc:
        raise _translate_error(exc)
