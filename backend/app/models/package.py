from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class Package:
    id: str | None = None
    name: str = ""
    slug: str = ""
    description: str | None = None
    version: str = "1.0.0"
    status: str = "draft"
    created_at: str | None = None
    updated_at: str | None = None


@dataclass(frozen=True, slots=True)
class Concept:
    slug: str = ""
    name: str = ""
    description: str | None = None
    domain: str = ""
    difficulty: float = 0.5
    package_id: str | None = None
    id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass(frozen=True, slots=True)
class Relationship:
    source_slug: str = ""
    target_slug: str = ""
    relationship_type: str = "prerequisite"
    strength: float = 1.0
    package_id: str | None = None
    id: str | None = None
    created_at: str | None = None


@dataclass(frozen=True, slots=True)
class PackageGraph:
    package: Package
    concepts: list[Concept] = field(default_factory=list)
    relationships: list[Relationship] = field(default_factory=list)