from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any

from app.db.client import supabase


class ConceptGraphError(Exception):
    """Base error for concept graph operations."""


class ConceptNotFoundError(ConceptGraphError):
    """Raised when a concept is missing or not owned by the user."""


class RelationshipNotFoundError(ConceptGraphError):
    """Raised when a relationship is missing or not owned by the user."""


class GraphValidationError(ConceptGraphError):
    """Raised on invalid concept-graph operations."""


@dataclass(frozen=True)
class ConceptEdge:
    source_concept_id: str
    target_concept_id: str
    relationship_type: str


def _normalize_relationship_type(value: str) -> str:
    return value.strip().lower()


def get_prerequisite_ids(edges: list[ConceptEdge], concept_id: str) -> list[str]:
    reverse_adj: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        if _normalize_relationship_type(edge.relationship_type) != "prerequisite":
            continue
        reverse_adj[edge.target_concept_id].append(edge.source_concept_id)

    ordered: list[str] = []
    seen: set[str] = set()
    queue: deque[str] = deque(reverse_adj.get(concept_id, []))

    while queue:
        node = queue.popleft()
        if node in seen:
            continue
        seen.add(node)
        ordered.append(node)
        queue.extend(reverse_adj.get(node, []))

    return ordered


def get_dependent_ids(edges: list[ConceptEdge], concept_id: str) -> list[str]:
    adj: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        if _normalize_relationship_type(edge.relationship_type) != "prerequisite":
            continue
        adj[edge.source_concept_id].append(edge.target_concept_id)

    ordered: list[str] = []
    seen: set[str] = set()
    queue: deque[str] = deque(adj.get(concept_id, []))

    while queue:
        node = queue.popleft()
        if node in seen:
            continue
        seen.add(node)
        ordered.append(node)
        queue.extend(adj.get(node, []))

    return ordered


def detect_cycle(
    edges: list[ConceptEdge], source_concept_id: str, target_concept_id: str
) -> bool:
    """Return whether adding a prerequisite edge would create a cycle."""
    if source_concept_id == target_concept_id:
        return True

    adj: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        if _normalize_relationship_type(edge.relationship_type) != "prerequisite":
            continue
        adj[edge.source_concept_id].append(edge.target_concept_id)

    queue: deque[str] = deque([target_concept_id])
    seen: set[str] = set()

    while queue:
        node = queue.popleft()
        if node in seen:
            continue
        if node == source_concept_id:
            return True
        seen.add(node)
        queue.extend(adj.get(node, []))

    return False


class ConceptService:
    @staticmethod
    def _extract_data(response: Any) -> list[dict[str, Any]]:
        data = getattr(response, "data", None)
        return data or []

    @staticmethod
    def _assert_owned_concept(user_id: str, concept_id: str) -> dict[str, Any]:
        res = (
            supabase.table("concepts")
            .select("*")
            .eq("id", concept_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        data = ConceptService._extract_data(res)
        if not data:
            raise ConceptNotFoundError("Concept not found or not owned by user")
        return data[0]

    @staticmethod
    def _owned_concept_ids(user_id: str) -> set[str]:
        res = supabase.table("concepts").select("id").eq("user_id", user_id).execute()
        return {row["id"] for row in ConceptService._extract_data(res) if row.get("id")}

    @staticmethod
    def create_concept(
        *, user_id: str, name: str, description: str | None, subject_id: str | None
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "subject_id": subject_id,
        }
        res = supabase.table("concepts").insert(payload).execute()
        data = ConceptService._extract_data(res)
        if not data:
            raise ConceptGraphError("Failed to create concept")
        return data[0]

    @staticmethod
    def update_concept(
        *, user_id: str, concept_id: str, updates: dict[str, Any]
    ) -> dict[str, Any]:
        if not updates:
            return ConceptService._assert_owned_concept(user_id, concept_id)

        res = (
            supabase.table("concepts")
            .update(updates)
            .eq("id", concept_id)
            .eq("user_id", user_id)
            .execute()
        )
        data = ConceptService._extract_data(res)
        if not data:
            raise ConceptNotFoundError("Concept not found or not owned by user")
        return data[0]

    @staticmethod
    def delete_concept(*, user_id: str, concept_id: str) -> None:
        ConceptService._assert_owned_concept(user_id, concept_id)
        supabase.table("concepts").delete().eq("id", concept_id).eq(
            "user_id", user_id
        ).execute()

    @staticmethod
    def get_concept(*, user_id: str, concept_id: str) -> dict[str, Any]:
        return ConceptService._assert_owned_concept(user_id, concept_id)

    @staticmethod
    def get_concepts_by_subject(
        *, user_id: str, subject_id: str | None = None
    ) -> list[dict[str, Any]]:
        query = supabase.table("concepts").select("*").eq("user_id", user_id)
        if subject_id:
            query = query.eq("subject_id", subject_id)
        res = query.order("created_at").execute()
        return ConceptService._extract_data(res)


class RelationshipService:
    @staticmethod
    def _get_user_edges(user_id: str) -> list[dict[str, Any]]:
        concept_ids = list(ConceptService._owned_concept_ids(user_id))
        if not concept_ids:
            return []

        res = (
            supabase.table("concept_relationships")
            .select("*")
            .in_("source_concept_id", concept_ids)
            .in_("target_concept_id", concept_ids)
            .execute()
        )
        return ConceptService._extract_data(res)

    @staticmethod
    def _ensure_owned_concepts(user_id: str, concept_ids: list[str]) -> None:
        owned = ConceptService._owned_concept_ids(user_id)
        if not set(concept_ids).issubset(owned):
            raise ConceptNotFoundError("One or more concepts not found for user")

    @staticmethod
    def create_relationship(
        *,
        user_id: str,
        source_concept_id: str,
        target_concept_id: str,
        relationship_type: str,
        strength: float,
    ) -> dict[str, Any]:
        rel_type = _normalize_relationship_type(relationship_type)
        RelationshipService._ensure_owned_concepts(
            user_id, [source_concept_id, target_concept_id]
        )

        edges = [
            ConceptEdge(
                source_concept_id=row["source_concept_id"],
                target_concept_id=row["target_concept_id"],
                relationship_type=row["relationship_type"],
            )
            for row in RelationshipService._get_user_edges(user_id)
        ]

        if rel_type == "prerequisite" and detect_cycle(
            edges, source_concept_id, target_concept_id
        ):
            raise GraphValidationError("Relationship would create a prerequisite cycle")

        payload = {
            "source_concept_id": source_concept_id,
            "target_concept_id": target_concept_id,
            "relationship_type": rel_type,
            "strength": strength,
        }
        res = supabase.table("concept_relationships").insert(payload).execute()
        data = ConceptService._extract_data(res)
        if not data:
            raise ConceptGraphError("Failed to create relationship")
        return data[0]

    @staticmethod
    def delete_relationship(*, user_id: str, relationship_id: str) -> None:
        rows = RelationshipService._get_user_edges(user_id)
        matching = [row for row in rows if row.get("id") == relationship_id]
        if not matching:
            raise RelationshipNotFoundError("Relationship not found")
        supabase.table("concept_relationships").delete().eq(
            "id", relationship_id
        ).execute()

    @staticmethod
    def get_outgoing_relationships(
        *, user_id: str, concept_id: str
    ) -> list[dict[str, Any]]:
        ConceptService._assert_owned_concept(user_id, concept_id)
        return [
            row
            for row in RelationshipService._get_user_edges(user_id)
            if row.get("source_concept_id") == concept_id
        ]

    @staticmethod
    def get_incoming_relationships(
        *, user_id: str, concept_id: str
    ) -> list[dict[str, Any]]:
        ConceptService._assert_owned_concept(user_id, concept_id)
        return [
            row
            for row in RelationshipService._get_user_edges(user_id)
            if row.get("target_concept_id") == concept_id
        ]

    @staticmethod
    def get_relationships(
        *, user_id: str, concept_id: str | None = None
    ) -> list[dict[str, Any]]:
        rows = RelationshipService._get_user_edges(user_id)
        if not concept_id:
            return rows
        return [
            row
            for row in rows
            if row.get("source_concept_id") == concept_id
            or row.get("target_concept_id") == concept_id
        ]


class GraphTraversalService:
    @staticmethod
    def _concept_map(
        user_id: str, concept_ids: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        query = supabase.table("concepts").select("*").eq("user_id", user_id)
        if concept_ids:
            query = query.in_("id", list(concept_ids))
        res = query.execute()
        concepts = ConceptService._extract_data(res)
        return {concept["id"]: concept for concept in concepts if concept.get("id")}

    @staticmethod
    def get_prerequisites(*, user_id: str, concept_id: str) -> list[dict[str, Any]]:
        ConceptService._assert_owned_concept(user_id, concept_id)
        rows = RelationshipService._get_user_edges(user_id)
        edges = [
            ConceptEdge(
                source_concept_id=row["source_concept_id"],
                target_concept_id=row["target_concept_id"],
                relationship_type=row["relationship_type"],
            )
            for row in rows
        ]
        prerequisite_ids = get_prerequisite_ids(edges, concept_id)
        concept_map = GraphTraversalService._concept_map(user_id, set(prerequisite_ids))
        return [
            concept_map[prereq_id]
            for prereq_id in prerequisite_ids
            if prereq_id in concept_map
        ]

    @staticmethod
    def get_dependents(*, user_id: str, concept_id: str) -> list[dict[str, Any]]:
        ConceptService._assert_owned_concept(user_id, concept_id)
        rows = RelationshipService._get_user_edges(user_id)
        edges = [
            ConceptEdge(
                source_concept_id=row["source_concept_id"],
                target_concept_id=row["target_concept_id"],
                relationship_type=row["relationship_type"],
            )
            for row in rows
        ]
        dependent_ids = get_dependent_ids(edges, concept_id)
        concept_map = GraphTraversalService._concept_map(user_id, set(dependent_ids))
        return [
            concept_map[dependent_id]
            for dependent_id in dependent_ids
            if dependent_id in concept_map
        ]
