from __future__ import annotations

from typing import Any, Iterable

from app.db.client import supabase
from app.services.package_service import PackageNotFoundError, getPackageBySlug


class QuestionError(Exception):
    """Base error for question operations."""


class QuestionNotFoundError(QuestionError):
    """Raised when a question cannot be found or is not owned by the user."""


class QuestionValidationError(QuestionError):
    """Raised when question payloads or tag payloads are invalid."""


def _extract_data(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    return data or []


def _normalize_weight(weight: float) -> float:
    value = float(weight)
    if value < 0 or value > 1:
        raise QuestionValidationError("Concept weight must be between 0 and 1")
    return value


def _question_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return dict(row)


def _question_link_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return dict(row)


def _assert_owned_question(user_id: str, question_id: str) -> dict[str, Any]:
    res = (
        supabase.table("questions")
        .select("*")
        .eq("id", question_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = _extract_data(res)
    if not rows:
        raise QuestionNotFoundError("Question not found or not owned by user")
    return rows[0]


def _resolve_package(package_slug: str) -> dict[str, Any]:
    try:
        return getPackageBySlug(package_slug)
    except PackageNotFoundError:
        raise


def _fetch_question_concepts(question_id: str) -> list[dict[str, Any]]:
    res = (
        supabase.table("question_concepts")
        .select("*")
        .eq("question_id", question_id)
        .execute()
    )
    return _extract_data(res)


def _fetch_concepts_for_package(
    package_id: str, concept_ids: Iterable[str]
) -> dict[str, dict[str, Any]]:
    unique_ids = list(dict.fromkeys(concept_ids))
    if not unique_ids:
        return {}
    res = (
        supabase.table("concepts")
        .select("*")
        .eq("package_id", package_id)
        .in_("id", unique_ids)
        .execute()
    )
    concepts = _extract_data(res)
    return {row["id"]: row for row in concepts if row.get("id")}


def _validate_concept_payloads(
    package_id: str, concept_weights: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    concept_ids: list[str] = []
    seen: set[str] = set()
    normalized: list[dict[str, Any]] = []

    for item in concept_weights:
        concept_id = str(item.get("concept_id") or "").strip()
        if not concept_id:
            raise QuestionValidationError("Each concept tag needs a concept_id")
        if concept_id in seen:
            raise QuestionValidationError("Duplicate concept tags are not allowed")
        seen.add(concept_id)
        concept_ids.append(concept_id)
        normalized.append(
            {
                "concept_id": concept_id,
                "weight": _normalize_weight(item.get("weight", 1.0)),
            }
        )

    concept_map = _fetch_concepts_for_package(package_id, concept_ids)
    missing = [concept_id for concept_id in concept_ids if concept_id not in concept_map]
    if missing:
        raise QuestionValidationError(
            f"One or more concepts are not part of this package: {', '.join(missing)}"
        )

    return normalized


def create_question(
    *,
    user_id: str,
    package_slug: str,
    title: str | None,
    question_text: str,
    source: str | None = None,
    difficulty: float = 0.5,
    concept_weights: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    package = _resolve_package(package_slug)
    payload = {
        "user_id": user_id,
        "package_id": package["id"],
        "title": title,
        "question_text": question_text,
        "source": source,
        "difficulty": float(difficulty),
    }
    res = supabase.table("questions").insert(payload).execute()
    rows = _extract_data(res)
    if not rows:
        raise QuestionError("Failed to create question")

    question = rows[0]
    if concept_weights:
        set_question_concepts(
            user_id=user_id,
            question_id=question["id"],
            concept_weights=concept_weights,
        )
    return question


def update_question(
    *, user_id: str, question_id: str, updates: dict[str, Any]
) -> dict[str, Any]:
    if not updates:
        return _assert_owned_question(user_id, question_id)

    if "package_id" in updates or "package_slug" in updates:
        raise QuestionValidationError("Question package cannot be changed")

    res = (
        supabase.table("questions")
        .update(updates)
        .eq("id", question_id)
        .eq("user_id", user_id)
        .execute()
    )
    rows = _extract_data(res)
    if not rows:
        raise QuestionNotFoundError("Question not found or not owned by user")
    return rows[0]


def delete_question(*, user_id: str, question_id: str) -> None:
    _assert_owned_question(user_id, question_id)
    supabase.table("questions").delete().eq("id", question_id).eq(
        "user_id", user_id
    ).execute()


def get_question(*, user_id: str, question_id: str) -> dict[str, Any]:
    return _assert_owned_question(user_id, question_id)


def list_questions(
    *, user_id: str, package_slug: str | None = None
) -> list[dict[str, Any]]:
    query = supabase.table("questions").select("*").eq("user_id", user_id)
    if package_slug:
        package = _resolve_package(package_slug)
        query = query.eq("package_id", package["id"])
    res = query.order("created_at", desc=True).execute()
    return _extract_data(res)


def get_question_detail(*, user_id: str, question_id: str) -> dict[str, Any]:
    question = _assert_owned_question(user_id, question_id)
    return {
        "question": question,
        "concepts": get_question_concepts(user_id=user_id, question_id=question_id),
    }


def get_question_concepts(*, user_id: str, question_id: str) -> list[dict[str, Any]]:
    question = _assert_owned_question(user_id, question_id)
    links = _fetch_question_concepts(question_id)
    concept_map = _fetch_concepts_for_package(
        question["package_id"], [row["concept_id"] for row in links]
    )

    associations: list[dict[str, Any]] = []
    for link in links:
        concept = concept_map.get(link["concept_id"])
        if concept is None:
            continue
        associations.append(
            {
                "question_concept": _question_link_from_row(link),
                "concept": concept,
            }
        )

    return associations


def set_question_concepts(
    *, user_id: str, question_id: str, concept_weights: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    question = _assert_owned_question(user_id, question_id)
    normalized = _validate_concept_payloads(question["package_id"], concept_weights)

    supabase.table("question_concepts").delete().eq("question_id", question_id).execute()

    if normalized:
        payload = [
            {
                "package_id": question["package_id"],
                "question_id": question_id,
                "concept_id": item["concept_id"],
                "weight": item["weight"],
            }
            for item in normalized
        ]
        res = supabase.table("question_concepts").insert(payload).execute()
        if not _extract_data(res):
            raise QuestionError("Failed to tag question concepts")

    return get_question_concepts(user_id=user_id, question_id=question_id)


def add_question_concept(
    *, user_id: str, question_id: str, concept_id: str, weight: float = 1.0
) -> list[dict[str, Any]]:
    question = _assert_owned_question(user_id, question_id)
    concept_map = _fetch_concepts_for_package(question["package_id"], [concept_id])
    if concept_id not in concept_map:
        raise QuestionValidationError("Concept is not part of the question package")

    payload = {
        "package_id": question["package_id"],
        "question_id": question_id,
        "concept_id": concept_id,
        "weight": _normalize_weight(weight),
    }
    res = (
        supabase.table("question_concepts")
        .upsert(payload, on_conflict="question_id,concept_id")
        .execute()
    )
    if not _extract_data(res):
        raise QuestionError("Failed to tag question concept")
    return get_question_concepts(user_id=user_id, question_id=question_id)


def remove_question_concept(
    *, user_id: str, question_id: str, concept_id: str
) -> list[dict[str, Any]]:
    _assert_owned_question(user_id, question_id)
    supabase.table("question_concepts").delete().eq("question_id", question_id).eq(
        "concept_id", concept_id
    ).execute()
    return get_question_concepts(user_id=user_id, question_id=question_id)


def get_questions_by_concept(
    *, user_id: str, concept_id: str
) -> list[dict[str, Any]]:
    concept_rows = (
        supabase.table("concepts")
        .select("*")
        .eq("id", concept_id)
        .limit(1)
        .execute()
    )
    concept_list = _extract_data(concept_rows)
    if not concept_list:
        raise QuestionValidationError("Concept not found")
    concept = concept_list[0]

    link_rows = (
        supabase.table("question_concepts")
        .select("*")
        .eq("concept_id", concept_id)
        .eq("package_id", concept["package_id"])
        .execute()
    )
    links = _extract_data(link_rows)
    if not links:
        return []

    question_ids = [row["question_id"] for row in links]
    question_rows = (
        supabase.table("questions")
        .select("*")
        .eq("user_id", user_id)
        .in_("id", question_ids)
        .order("created_at", desc=True)
        .execute()
    )
    questions = _extract_data(question_rows)
    question_map = {row["id"]: row for row in questions if row.get("id")}

    associations: list[dict[str, Any]] = []
    for link in links:
        question = question_map.get(link["question_id"])
        if question is None:
            continue
        associations.append(
            {
                "question_concept": _question_link_from_row(link),
                "question": _question_from_row(question),
            }
        )

    return associations