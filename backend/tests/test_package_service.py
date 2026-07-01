from types import SimpleNamespace

import pytest

from app.services.package_service import (
    PackageValidationError,
    countConcepts,
    countRelationships,
    detectCycles,
    generateSeedReport,
    loadPackage,
    seedPackage,
    seedSATPackageInfrastructure,
    validatePackageGraph,
)


class _Operation:
    def __init__(self, table, action, payload=None, on_conflict=None):
        self._table = table
        self._action = action
        self._payload = payload
        self._on_conflict = on_conflict
        self._filters = []
        self._limit = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, field, value):
        self._filters.append((field, value))
        return self

    def limit(self, value):
        self._limit = value
        return self

    def upsert(self, payload, on_conflict=None):
        return _Operation(self._table, "upsert", payload=payload, on_conflict=on_conflict)

    def execute(self):
        if self._action == "upsert":
            rows = self._table._upsert(self._payload, self._on_conflict)
            return SimpleNamespace(data=rows)

        rows = self._table._select(self._filters)
        if self._limit is not None:
            rows = rows[: self._limit]
        return SimpleNamespace(data=rows)


class _Table:
    def __init__(self, name):
        self.name = name
        self.rows = []
        self.next_id = 1

    def _make_id(self):
        prefix = self.name.rstrip("s")
        value = f"{prefix}-{self.next_id}"
        self.next_id += 1
        return value

    def _conflict_key(self, row, on_conflict):
        if not on_conflict:
            return row.get("id")
        fields = [field.strip() for field in on_conflict.split(",")]
        return tuple(row.get(field) for field in fields)

    def _upsert(self, payload, on_conflict):
        payload_rows = payload if isinstance(payload, list) else [payload]
        output = []

        for row in payload_rows:
            candidate = dict(row)
            conflict_key = self._conflict_key(candidate, on_conflict)
            matched = None
            for existing in self.rows:
                if self._conflict_key(existing, on_conflict) == conflict_key:
                    matched = existing
                    break

            if matched is None:
                if "id" not in candidate or candidate["id"] is None:
                    candidate["id"] = self._make_id()
                self.rows.append(candidate)
                output.append(candidate)
            else:
                for key, value in candidate.items():
                    if key != "id":
                        matched[key] = value
                output.append(matched)

        return output

    def _select(self, filters):
        rows = list(self.rows)
        for field, value in filters:
            rows = [row for row in rows if row.get(field) == value]
        return rows


class _SupabaseStub:
    def __init__(self):
        self.tables = {
            "packages": _Table("packages"),
            "concepts": _Table("concepts"),
            "concept_relationships": _Table("concept_relationships"),
        }

    def table(self, name):
        return _Operation(self.tables[name], "select")


def test_sat_package_manifest_loads_and_validates():
    graph = loadPackage("sat")

    assert graph.package.slug == "sat"
    assert graph.package.status == "active"
    assert countConcepts(graph) == 68
    assert countRelationships(graph) == 106
    assert detectCycles(graph.relationships, [concept.slug for concept in graph.concepts]) == []

    validatePackageGraph(graph)


def test_sat_package_rejects_cycles():
    graph = loadPackage("sat")
    cycle_relationships = list(graph.relationships) + [
        graph.relationships[0].__class__(
            source_slug=graph.relationships[0].target_slug,
            target_slug=graph.relationships[0].source_slug,
            relationship_type="prerequisite",
            strength=1.0,
        )
    ]

    with pytest.raises(PackageValidationError):
        validatePackageGraph(
            graph.__class__(
                package=graph.package,
                concepts=graph.concepts,
                relationships=cycle_relationships,
            )
        )


def test_seed_package_is_idempotent(monkeypatch):
    stub = _SupabaseStub()
    monkeypatch.setattr("app.services.package_service.supabase", stub)

    first = seedPackage("sat")
    second = seedPackage("sat")

    assert first["package"]["slug"] == "sat"
    assert second["package"]["slug"] == "sat"
    assert len(stub.tables["packages"].rows) == 1
    assert len(stub.tables["concepts"].rows) == 68
    assert len(stub.tables["concept_relationships"].rows) == 106


def test_seed_report_counts(monkeypatch):
    stub = _SupabaseStub()
    monkeypatch.setattr("app.services.package_service.supabase", stub)

    seedPackage("sat")
    report = generateSeedReport("sat")

    assert report.package_count == 1
    assert report.concept_count == 68
    assert report.relationship_count == 106


def test_seed_sat_infrastructure_returns_report(monkeypatch):
    stub = _SupabaseStub()
    monkeypatch.setattr("app.services.package_service.supabase", stub)

    first = seedSATPackageInfrastructure()
    second = seedSATPackageInfrastructure()

    assert first["report"]["package_count"] == 1
    assert second["report"]["package_count"] == 1
    assert first["report"]["concept_count"] == 68
    assert second["report"]["concept_count"] == 68
    assert first["report"]["relationship_count"] == 106
    assert second["report"]["relationship_count"] == 106