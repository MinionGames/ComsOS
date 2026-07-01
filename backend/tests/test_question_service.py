from types import SimpleNamespace

import pytest

from app.services.question_service import (
    QuestionValidationError,
    add_question_concept,
    create_question,
    get_question_concepts,
    get_questions_by_concept,
    list_questions,
    set_question_concepts,
)


class _Query:
    def __init__(self, table):
        self._table = table
        self._action = "select"
        self._payload = None
        self._filters = []
        self._orders = []
        self._limit = None
        self._conflict = None

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

    def delete(self):
        self._action = "delete"
        return self

    def upsert(self, payload, on_conflict=None):
        self._action = "upsert"
        self._payload = payload
        self._conflict = on_conflict
        return self

    def eq(self, field, value):
        self._filters.append((field, value, "eq"))
        return self

    def in_(self, field, values):
        self._filters.append((field, list(values), "in"))
        return self

    def order(self, field, desc=False):
        self._orders.append((field, desc))
        return self

    def limit(self, value):
        self._limit = value
        return self

    def _make_id(self):
        prefix = self._table.name.rstrip("s")
        value = f"{prefix}-{self._table.next_id}"
        self._table.next_id += 1
        return value

    def _conflict_key(self, row, on_conflict):
        if not on_conflict:
            return row.get("id")
        fields = [field.strip() for field in on_conflict.split(",")]
        return tuple(row.get(field) for field in fields)

    def _apply_filters(self, rows):
        result = list(rows)
        for field, value, mode in self._filters:
            if mode == "eq":
                result = [row for row in result if row.get(field) == value]
            elif mode == "in":
                value_set = set(value)
                result = [row for row in result if row.get(field) in value_set]
        for field, desc in reversed(self._orders):
            result.sort(key=lambda row: row.get(field), reverse=desc)
        if self._limit is not None:
            result = result[: self._limit]
        return result

    def execute(self):
        if self._action == "select":
            return SimpleNamespace(data=self._apply_filters(self._table.rows))

        if self._action == "insert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = []
            for payload in payloads:
                row = dict(payload)
                if not row.get("id"):
                    row["id"] = self._make_id()
                self._table.rows.append(row)
                inserted.append(row)
            return SimpleNamespace(data=inserted)

        if self._action == "update":
            updated = []
            for row in self._apply_filters(self._table.rows):
                row.update(self._payload)
                updated.append(row)
            return SimpleNamespace(data=updated)

        if self._action == "delete":
            remaining = []
            deleted = []
            matched = self._apply_filters(self._table.rows)
            for row in self._table.rows:
                if row in matched:
                    deleted.append(row)
                else:
                    remaining.append(row)
            self._table.rows = remaining
            return SimpleNamespace(data=deleted)

        if self._action == "upsert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            upserted = []
            for payload in payloads:
                row = dict(payload)
                conflict_key = self._conflict_key(row, self._conflict)
                existing = None
                for candidate in self._table.rows:
                    if self._conflict_key(candidate, self._conflict) == conflict_key:
                        existing = candidate
                        break
                if existing is None:
                    if not row.get("id"):
                        row["id"] = self._make_id()
                    self._table.rows.append(row)
                    upserted.append(row)
                else:
                    existing.update(row)
                    upserted.append(existing)
            return SimpleNamespace(data=upserted)

        raise AssertionError(f"Unsupported action: {self._action}")


class _Table:
    def __init__(self, name):
        self.name = name
        self.rows = []
        self.next_id = 1


class _SupabaseStub:
    def __init__(self):
        self.tables = {
            "packages": _Table("packages"),
            "concepts": _Table("concepts"),
            "questions": _Table("questions"),
            "question_concepts": _Table("question_concepts"),
        }

    def table(self, name):
        return _Query(self.tables[name])


@pytest.fixture()
def question_stub(monkeypatch):
    stub = _SupabaseStub()
    package_row = {
        "id": "package-1",
        "name": "SAT Package",
        "slug": "sat",
        "description": "SAT graph",
        "version": "1.0.0",
        "status": "active",
    }
    concept_a = {
        "id": "concept-1",
        "package_id": "package-1",
        "slug": "linear-equations",
        "name": "Linear Equations",
        "description": None,
        "domain": "Math",
        "difficulty": 0.5,
        "created_at": None,
        "updated_at": None,
    }
    concept_b = {
        "id": "concept-2",
        "package_id": "package-1",
        "slug": "functions",
        "name": "Functions",
        "description": None,
        "domain": "Math",
        "difficulty": 0.5,
        "created_at": None,
        "updated_at": None,
    }
    stub.tables["packages"].rows.append(package_row)
    stub.tables["concepts"].rows.extend([concept_a, concept_b])

    monkeypatch.setattr("app.services.question_service.supabase", stub)
    monkeypatch.setattr(
        "app.services.question_service.getPackageBySlug", lambda slug: package_row
    )
    return stub


def test_question_create_tag_and_retrieve_by_concept(question_stub):
    question = create_question(
        user_id="user-1",
        package_slug="sat",
        title="Solve the system",
        question_text="Which substitution solves the system?",
        concept_weights=[{"concept_id": "concept-1", "weight": 0.8}],
    )

    add_question_concept(
        user_id="user-1",
        question_id=question["id"],
        concept_id="concept-2",
        weight=0.6,
    )

    concepts = get_question_concepts(user_id="user-1", question_id=question["id"])
    questions = get_questions_by_concept(user_id="user-1", concept_id="concept-1")
    package_questions = list_questions(user_id="user-1", package_slug="sat")

    assert question["package_id"] == "package-1"
    assert len(concepts) == 2
    assert concepts[0]["concept"]["package_id"] == "package-1"
    assert len(questions) == 1
    assert questions[0]["question"]["id"] == question["id"]
    assert len(package_questions) == 1


def test_question_set_tags_rejects_cross_package_concepts(question_stub):
    question = create_question(
        user_id="user-1",
        package_slug="sat",
        title="Reading question",
        question_text="What is the main idea?",
    )

    question_stub.tables["concepts"].rows.append(
        {
            "id": "concept-99",
            "package_id": "package-2",
            "slug": "other-package",
            "name": "Other Package Concept",
            "description": None,
            "domain": "Reading",
            "difficulty": 0.2,
            "created_at": None,
            "updated_at": None,
        }
    )

    with pytest.raises(QuestionValidationError):
        set_question_concepts(
            user_id="user-1",
            question_id=question["id"],
            concept_weights=[{"concept_id": "concept-99", "weight": 0.5}],
        )