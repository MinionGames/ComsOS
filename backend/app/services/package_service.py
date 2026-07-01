from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from app.db.client import supabase
from app.models.package import Concept, Package, PackageGraph, Relationship


ALLOWED_PACKAGE_STATUSES = {"draft", "active", "archived"}
PACKAGE_DATA_DIR = Path(__file__).resolve().parents[1] / "data"


class PackageError(Exception):
    """Base error for package operations."""


class PackageNotFoundError(PackageError):
    """Raised when a package manifest or database row cannot be found."""


class PackageValidationError(PackageError):
    """Raised when a package graph is invalid."""


@dataclass(frozen=True, slots=True)
class PackageSeedReport:
    package_count: int
    concept_count: int
    relationship_count: int


def _extract_data(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    return data or []


def _manifest_path(slug: str) -> Path:
    return PACKAGE_DATA_DIR / f"{slug}Package.ts"


def _parse_manifest(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8").strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end < 0 or end <= start:
        raise PackageError(f"Invalid package manifest: {path.name}")
    return json.loads(raw[start : end + 1])


def _concept_from_dict(data: dict[str, Any]) -> Concept:
    return Concept(
        slug=data["slug"],
        name=data["name"],
        description=data.get("description"),
        domain=data["domain"],
        difficulty=float(data.get("difficulty", 0.5)),
        package_id=data.get("package_id"),
        id=data.get("id"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )


def _relationship_from_dict(data: dict[str, Any]) -> Relationship:
    return Relationship(
        source_slug=data["source_slug"],
        target_slug=data["target_slug"],
        relationship_type=data.get("relationship_type", "prerequisite"),
        strength=float(data.get("strength", 1.0)),
        package_id=data.get("package_id"),
        id=data.get("id"),
        created_at=data.get("created_at"),
    )


def _expand_chains(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    relationships = list(manifest.get("relationships", []))
    for chain in manifest.get("prerequisite_chains", []):
        if len(chain) < 2:
            continue
        for index in range(len(chain) - 1):
            relationships.append(
                {
                    "source_slug": chain[index],
                    "target_slug": chain[index + 1],
                    "relationship_type": "prerequisite",
                    "strength": 1.0,
                }
            )
    return relationships


def _package_from_dict(data: dict[str, Any]) -> Package:
    return Package(
        id=data.get("id"),
        name=data["name"],
        slug=data["slug"],
        description=data.get("description"),
        version=data.get("version", "1.0.0"),
        status=data.get("status", "draft"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )


def _graph_from_manifest(manifest: dict[str, Any]) -> PackageGraph:
    graph = PackageGraph(
        package=_package_from_dict(manifest["package"]),
        concepts=[_concept_from_dict(item) for item in manifest.get("concepts", [])],
        relationships=[
            _relationship_from_dict(item)
            for item in _expand_chains(manifest)
        ],
    )
    validatePackageGraph(graph)
    return graph


def detectCycles(
    relationships: Iterable[Relationship], concept_slugs: Iterable[str] | None = None
) -> list[list[str]]:
    adjacency: dict[str, list[str]] = defaultdict(list)
    nodes: set[str] = set(concept_slugs or [])

    for relationship in relationships:
        if relationship.relationship_type.strip().lower() != "prerequisite":
            continue
        adjacency[relationship.source_slug].append(relationship.target_slug)
        nodes.add(relationship.source_slug)
        nodes.add(relationship.target_slug)

    visited: set[str] = set()
    active: set[str] = set()
    stack: list[str] = []
    cycles: list[list[str]] = []

    def visit(node: str) -> None:
        visited.add(node)
        active.add(node)
        stack.append(node)

        for neighbor in adjacency.get(node, []):
            if neighbor not in visited:
                visit(neighbor)
            elif neighbor in active:
                try:
                    start_index = stack.index(neighbor)
                except ValueError:
                    continue
                cycles.append(stack[start_index:] + [neighbor])

        stack.pop()
        active.remove(node)

    for node in sorted(nodes):
        if node not in visited:
            visit(node)

    return cycles


def countConcepts(graph: PackageGraph) -> int:
    return len(graph.concepts)


def countRelationships(graph: PackageGraph) -> int:
    return len(graph.relationships)


def validatePackageGraph(graph: PackageGraph) -> None:
    concept_slugs = [concept.slug for concept in graph.concepts]
    if len(concept_slugs) != len(set(concept_slugs)):
        raise PackageValidationError("Duplicate concept slugs detected")

    if graph.package.status not in ALLOWED_PACKAGE_STATUSES:
        raise PackageValidationError(f"Invalid package status: {graph.package.status}")

    unknown_refs = [
        relationship
        for relationship in graph.relationships
        if relationship.source_slug not in concept_slugs
        or relationship.target_slug not in concept_slugs
    ]
    if unknown_refs:
        raise PackageValidationError("Relationship references unknown concept slugs")

    unique_edges = set()
    for relationship in graph.relationships:
        edge_key = (
            relationship.source_slug,
            relationship.target_slug,
            relationship.relationship_type.strip().lower(),
        )
        if edge_key in unique_edges:
            raise PackageValidationError("Duplicate relationship edges detected")
        unique_edges.add(edge_key)

    cycles = detectCycles(graph.relationships, concept_slugs)
    if cycles:
        raise PackageValidationError(f"Package graph contains a cycle: {cycles[0]}")


def loadPackage(slug: str) -> PackageGraph:
    manifest_path = _manifest_path(slug)
    if not manifest_path.exists():
        raise PackageNotFoundError(f"Package manifest not found for slug: {slug}")

    manifest = _parse_manifest(manifest_path)
    package = manifest.get("package", {})
    if package.get("slug") != slug:
        raise PackageError(
            f"Package manifest slug mismatch: expected {slug}, got {package.get('slug')}"
        )

    return _graph_from_manifest(manifest)


def listPackages() -> list[Package]:
    packages: list[Package] = []
    for manifest_path in sorted(PACKAGE_DATA_DIR.glob("*Package.ts")):
        manifest = _parse_manifest(manifest_path)
        packages.append(_package_from_dict(manifest["package"]))
    return packages


def getPackageBySlug(slug: str) -> dict[str, Any]:
    response = supabase.table("packages").select("*").eq("slug", slug).limit(1).execute()
    data = _extract_data(response)
    if not data:
        raise PackageNotFoundError(f"Package not found: {slug}")
    return data[0]


def getPackageGraphBySlug(slug: str) -> PackageGraph:
    package_row = getPackageBySlug(slug)
    package_id = package_row["id"]

    concepts_response = (
        supabase.table("concepts").select("*").eq("package_id", package_id).execute()
    )
    relationships_response = (
        supabase.table("concept_relationships")
        .select("*")
        .eq("package_id", package_id)
        .execute()
    )

    graph = PackageGraph(
        package=_package_from_dict(package_row),
        concepts=[_concept_from_dict(row) for row in _extract_data(concepts_response)],
        relationships=[
            _relationship_from_dict(row)
            for row in _extract_data(relationships_response)
        ],
    )
    validatePackageGraph(graph)
    return graph


def seedPackage(slug: str) -> dict[str, Any]:
    graph = loadPackage(slug)

    package_payload = {
        "slug": graph.package.slug,
        "name": graph.package.name,
        "description": graph.package.description,
        "version": graph.package.version,
        "status": graph.package.status,
    }
    package_result = (
        supabase.table("packages").upsert(package_payload, on_conflict="slug").execute()
    )
    package_rows = _extract_data(package_result)
    if not package_rows:
        raise PackageError("Failed to seed package metadata")
    package_row = package_rows[0]

    concept_payloads = [
        {
            "package_id": package_row["id"],
            "slug": concept.slug,
            "name": concept.name,
            "description": concept.description,
            "domain": concept.domain,
            "difficulty": concept.difficulty,
        }
        for concept in graph.concepts
    ]
    concept_result = (
        supabase.table("concepts")
        .upsert(concept_payloads, on_conflict="package_id,slug")
        .execute()
    )
    concept_rows = _extract_data(concept_result)
    if not concept_rows:
        concept_rows = _extract_data(
            supabase.table("concepts").select("*").eq("package_id", package_row["id"]).execute()
        )
    concept_id_by_slug = {
        row["slug"]: row["id"]
        for row in concept_rows
        if row.get("slug") and row.get("id")
    }

    relationship_payloads = []
    for relationship in graph.relationships:
        source_id = concept_id_by_slug.get(relationship.source_slug)
        target_id = concept_id_by_slug.get(relationship.target_slug)
        if not source_id or not target_id:
            raise PackageError(
                f"Unable to resolve relationship endpoints for {relationship.source_slug} -> {relationship.target_slug}"
            )
        relationship_payloads.append(
            {
                "package_id": package_row["id"],
                "source_concept_id": source_id,
                "target_concept_id": target_id,
                "relationship_type": relationship.relationship_type,
                "strength": relationship.strength,
            }
        )

    deduped_relationship_payloads = []
    seen_relationships: set[tuple[str, str, str, str]] = set()
    for payload in relationship_payloads:
        key = (
            str(payload["package_id"]),
            str(payload["source_concept_id"]),
            str(payload["target_concept_id"]),
            str(payload["relationship_type"]),
        )
        if key in seen_relationships:
            continue
        seen_relationships.add(key)
        deduped_relationship_payloads.append(payload)

    relationship_result = (
        supabase.table("concept_relationships")
        .upsert(
            deduped_relationship_payloads,
            on_conflict="package_id,source_concept_id,target_concept_id,relationship_type",
        )
        .execute()
    )

    return {
        "package": package_row,
        "concepts": concept_rows,
        "relationships": _extract_data(relationship_result),
    }


def generateSeedReport(slug: str) -> PackageSeedReport:
    package_row = getPackageBySlug(slug)
    package_id = package_row["id"]

    concept_rows = _extract_data(
        supabase.table("concepts").select("id").eq("package_id", package_id).execute()
    )
    relationship_rows = _extract_data(
        supabase.table("concept_relationships")
        .select("id")
        .eq("package_id", package_id)
        .execute()
    )

    return PackageSeedReport(
        package_count=1,
        concept_count=len(concept_rows),
        relationship_count=len(relationship_rows),
    )


def seedPackageInfrastructure(slug: str) -> dict[str, Any]:
    result = seedPackage(slug)
    report = generateSeedReport(slug)
    return {
        "package": result["package"],
        "concepts": result["concepts"],
        "relationships": result["relationships"],
        "report": {
            "package_count": report.package_count,
            "concept_count": report.concept_count,
            "relationship_count": report.relationship_count,
        },
    }


def seedSATPackageInfrastructure() -> dict[str, Any]:
    return seedPackageInfrastructure("sat")