from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.auth import get_current_user
from app.config import settings
from app.db.client import supabase
from app.services.package_service import (
    PackageError,
    PackageNotFoundError,
    getPackageGraphBySlug,
)

router = APIRouter()


def _extract_data(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    return data or []


def _admin_email_allowlist() -> set[str]:
    raw = (settings.internal_admin_emails or "").strip()
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def require_internal_admin(user_id: str = Depends(get_current_user)) -> str:
    allowlist = _admin_email_allowlist()
    if not allowlist:
        raise HTTPException(
            status_code=403,
            detail="Internal admin access is disabled. Configure INTERNAL_ADMIN_EMAILS.",
        )

    profile_res = supabase.table("profiles").select("email").eq("id", user_id).limit(1).execute()
    profile_rows = _extract_data(profile_res)
    profile_email = (profile_rows[0].get("email") if profile_rows else "") or ""
    normalized = profile_email.strip().lower()

    if normalized not in allowlist:
        raise HTTPException(status_code=403, detail="Developer-only route")

    return user_id


def _relationship_counts_by_concept(relationship_rows: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"incoming": 0, "outgoing": 0})
    for row in relationship_rows:
        source_id = row.get("source_concept_id")
        target_id = row.get("target_concept_id")
        if source_id:
            counts[str(source_id)]["outgoing"] += 1
        if target_id:
            counts[str(target_id)]["incoming"] += 1
    return counts


@router.get("/observability")
def get_observability_snapshot(
    package_slug: str | None = Query(default="sat"),
    top_n: int = Query(default=10, ge=1, le=50),
    _user_id: str = Depends(require_internal_admin),
):
    package_rows = _extract_data(supabase.table("packages").select("id,slug,name").execute())
    package_count = len(package_rows)

    package_id: str | None = None
    selected_package: dict[str, Any] | None = None
    if package_slug:
        selected_package = next((row for row in package_rows if row.get("slug") == package_slug), None)
        if not selected_package:
            raise HTTPException(status_code=404, detail=f"Package not found: {package_slug}")
        package_id = selected_package.get("id")

    concepts_query = supabase.table("concepts").select("id,slug,name,package_id")
    relationships_query = supabase.table("concept_relationships").select(
        "id,source_concept_id,target_concept_id,package_id"
    )
    questions_query = supabase.table("questions").select("id,package_id")

    if package_id:
        concepts_query = concepts_query.eq("package_id", package_id)
        relationships_query = relationships_query.eq("package_id", package_id)
        questions_query = questions_query.eq("package_id", package_id)

    concept_rows = _extract_data(concepts_query.execute())
    relationship_rows = _extract_data(relationships_query.execute())
    question_rows = _extract_data(questions_query.execute())

    concept_by_id = {str(row["id"]): row for row in concept_rows if row.get("id")}
    degree_by_concept = _relationship_counts_by_concept(relationship_rows)

    top_connected = []
    for concept_id, counters in degree_by_concept.items():
        concept = concept_by_id.get(concept_id)
        if not concept:
            continue
        incoming = counters["incoming"]
        outgoing = counters["outgoing"]
        top_connected.append(
            {
                "concept_id": concept_id,
                "slug": concept.get("slug"),
                "name": concept.get("name"),
                "incoming": incoming,
                "outgoing": outgoing,
                "total": incoming + outgoing,
            }
        )

    top_connected.sort(key=lambda item: (-item["total"], -(item["outgoing"]), str(item["slug"] or "")))
    top_connected = top_connected[:top_n]

    graph_validation = {"valid": None, "error": None}
    if package_slug:
        try:
            getPackageGraphBySlug(package_slug)
            graph_validation = {"valid": True, "error": None}
        except (PackageNotFoundError, PackageError) as exc:
            graph_validation = {"valid": False, "error": str(exc)}
        except Exception as exc:  # pragma: no cover
            graph_validation = {"valid": False, "error": f"Unexpected validation error: {exc}"}

    return {
        "scope": {
            "package_slug": package_slug,
            "package": selected_package,
        },
        "counts": {
            "package_count": package_count,
            "concept_count": len(concept_rows),
            "relationship_count": len(relationship_rows),
            "question_count": len(question_rows),
        },
        "graph_validation": graph_validation,
        "top_connected_concepts": top_connected,
    }
