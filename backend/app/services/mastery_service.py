from __future__ import annotations

from datetime import datetime, timezone
from math import isfinite
from typing import Any

from app.db.client import supabase
from app.models.mastery import StudentConceptMastery


class MasteryError(Exception):
    """Base error for student mastery operations."""


class MasteryNotFoundError(MasteryError):
    """Raised when a mastery row or concept cannot be found."""


class MasteryValidationError(MasteryError):
    """Raised when mastery values or inputs are invalid."""


def _extract_data(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    return data or []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clamp(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def _validate_unit_interval(label: str, value: float) -> float:
    number = float(value)
    if not isfinite(number):
        raise MasteryValidationError(f"{label} must be finite")
    if number < 0.0 or number > 1.0:
        raise MasteryValidationError(f"{label} must be between 0 and 1")
    return number


def _mastery_from_row(row: dict[str, Any]) -> StudentConceptMastery:
    mastery = _validate_unit_interval("mastery", float(row.get("mastery", 0.5)))
    confidence = _validate_unit_interval(
        "confidence", float(row.get("confidence", 0.5))
    )
    return StudentConceptMastery(
        id=row.get("id"),
        user_id=str(row.get("user_id") or ""),
        concept_id=str(row.get("concept_id") or ""),
        mastery=mastery,
        confidence=confidence,
        forgetting_rate=float(row.get("forgetting_rate", 0.0) or 0.0),
        last_reviewed_at=row.get("last_reviewed_at"),
        updated_at=row.get("updated_at"),
    )


def _select_concept(concept_id: str) -> dict[str, Any]:
    response = (
        supabase.table("concepts")
        .select("id, package_id")
        .eq("id", concept_id)
        .limit(1)
        .execute()
    )
    rows = _extract_data(response)
    if not rows:
        raise MasteryNotFoundError("Concept not found")
    concept = rows[0]
    if not concept.get("package_id"):
        raise MasteryValidationError("Mastery is only supported for package concepts")
    return concept


def _select_user_mastery(user_id: str) -> list[dict[str, Any]]:
    response = (
        supabase.table("student_concept_mastery")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return _extract_data(response)


def _select_user_concept_mastery(user_id: str, concept_id: str) -> dict[str, Any]:
    response = (
        supabase.table("student_concept_mastery")
        .select("*")
        .eq("user_id", user_id)
        .eq("concept_id", concept_id)
        .limit(1)
        .execute()
    )
    rows = _extract_data(response)
    if not rows:
        raise MasteryNotFoundError("Mastery row not found")
    return rows[0]


def _all_package_concept_ids() -> list[str]:
    response = supabase.table("concepts").select("id, package_id").execute()
    rows = _extract_data(response)
    return [str(row["id"]) for row in rows if row.get("id") and row.get("package_id")]


def getMastery(userId: str) -> list[StudentConceptMastery]:
    return [_mastery_from_row(row) for row in _select_user_mastery(userId)]


def getConceptMastery(userId: str, conceptId: str) -> StudentConceptMastery:
    _select_concept(conceptId)
    return _mastery_from_row(_select_user_concept_mastery(userId, conceptId))


def initializeMastery(userId: str) -> list[StudentConceptMastery]:
    concept_ids = _all_package_concept_ids()
    if not concept_ids:
        return getMastery(userId)

    existing_rows = _select_user_mastery(userId)
    existing_ids = {str(row.get("concept_id")) for row in existing_rows if row.get("concept_id")}
    missing_ids = [concept_id for concept_id in concept_ids if concept_id not in existing_ids]

    if missing_ids:
        payload = [
            {
                "user_id": userId,
                "concept_id": concept_id,
                "mastery": 0.5,
                "confidence": 0.5,
                "forgetting_rate": 0.0,
                "last_reviewed_at": None,
                "updated_at": _now_iso(),
            }
            for concept_id in missing_ids
        ]
        response = supabase.table("student_concept_mastery").insert(payload).execute()
        if not _extract_data(response):
            raise MasteryError("Failed to initialize mastery rows")

    return getMastery(userId)


def updateMastery(userId: str, conceptId: str, scoreDelta: float) -> StudentConceptMastery:
    _select_concept(conceptId)
    delta = float(scoreDelta)
    if not isfinite(delta):
        raise MasteryValidationError("scoreDelta must be finite")

    try:
        existing = _mastery_from_row(_select_user_concept_mastery(userId, conceptId))
    except MasteryNotFoundError:
        initializeMastery(userId)
        existing = _mastery_from_row(_select_user_concept_mastery(userId, conceptId))

    updated_mastery = _clamp(existing.mastery + delta)
    payload = {
        "mastery": updated_mastery,
        "confidence": _clamp(existing.confidence),
        "last_reviewed_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    response = (
        supabase.table("student_concept_mastery")
        .update(payload)
        .eq("user_id", userId)
        .eq("concept_id", conceptId)
        .execute()
    )
    rows = _extract_data(response)
    if not rows:
        raise MasteryError("Failed to update mastery")
    return _mastery_from_row(rows[0])