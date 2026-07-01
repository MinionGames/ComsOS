from types import SimpleNamespace

import pytest

from app.services.mastery_service import (
    MasteryValidationError,
    getConceptMastery,
    getMastery,
    initializeMastery,
    updateMastery,
)


class _Query:
    def __init__(self, table):
        self._table = table
        self._action = "select"
        self._payload = None
        self._filters = []
        self._limit = None
        self._orders = []

    def select(self, *_args, **_kwargs):
        self._action = "select"
        return self

    def insert(self, payload):
        self._action = "insert"
        self._payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._payload = payload
        return self

    def eq(self, field, value):
        self._filters.append((field, value, "eq"))
        return self

    def limit(self, value):
        self._limit = value
        return self

    def order(self, field, desc=False):
        self._orders.append((field, desc))
        return self

    def not_(self):
        return self

    def is_(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self._action == "insert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = []
            for payload in payloads:
                row = dict(payload)
                if not row.get("id"):
                    row["id"] = self._table.make_id()
                self._table.rows.append(row)
                inserted.append(row)
            return SimpleNamespace(data=inserted)

        if self._action == "update":
            updated = []
            for row in self._apply_filters(self._table.rows):
                row.update(self._payload)
                updated.append(row)
            return SimpleNamespace(data=updated)

        rows = self._apply_filters(self._table.rows)
        return SimpleNamespace(data=rows)

    def _apply_filters(self, rows):
        result = list(rows)
        for field, value, mode in self._filters:
            if mode == "eq":
                result = [row for row in result if row.get(field) == value]
        for field, desc in reversed(self._orders):
            result.sort(key=lambda row: row.get(field), reverse=desc)
        if self._limit is not None:
            result = result[: self._limit]
        return result


class _Table:
    def __init__(self, name):
        self.name = name
        self.rows = []
        self.counter = 1

    def make_id(self):
        value = f"{self.name.rstrip('s')}-{self.counter}"
        self.counter += 1
        return value


class _SupabaseStub:
    def __init__(self):
        self.tables = {
            "concepts": _Table("concepts"),
            "student_concept_mastery": _Table("student_concept_mastery"),
        }

    def table(self, name):
        return _Query(self.tables[name])


@pytest.fixture()
def mastery_stub(monkeypatch):
    stub = _SupabaseStub()
    stub.tables["concepts"].rows.extend(
        [
            {"id": "concept-1", "package_id": "package-1"},
            {"id": "concept-2", "package_id": "package-1"},
            {"id": "user-concept", "package_id": None},
        ]
    )
    monkeypatch.setattr("app.services.mastery_service.supabase", stub)
    return stub


def test_initialize_mastery_creates_rows_for_package_concepts(mastery_stub):
    records = initializeMastery("user-1")

    assert len(records) == 2
    assert {record.concept_id for record in records} == {"concept-1", "concept-2"}
    assert all(0.0 <= record.mastery <= 1.0 for record in records)
    assert all(0.0 <= record.confidence <= 1.0 for record in records)


def test_get_and_update_mastery_clamps_values(mastery_stub):
    initializeMastery("user-1")

    updated = updateMastery("user-1", "concept-1", 0.75)
    fetched = getConceptMastery("user-1", "concept-1")

    assert updated.mastery == 1.0
    assert fetched.mastery == 1.0
    assert 0.0 <= fetched.confidence <= 1.0


def test_update_mastery_rejects_invalid_delta(mastery_stub):
    initializeMastery("user-1")

    with pytest.raises(MasteryValidationError):
        updateMastery("user-1", "concept-1", float("nan"))


def test_get_mastery_returns_all_rows(mastery_stub):
    initializeMastery("user-1")

    mastery_rows = getMastery("user-1")

    assert len(mastery_rows) == 2
    assert mastery_rows[0].user_id == "user-1"