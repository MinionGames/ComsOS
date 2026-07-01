from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import admin, cmm_service, notes, questions
from app.main import app


class _NotesQuery:
    def __init__(self, data):
        self._data = data

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=self._data)


class _SupabaseStub:
    def __init__(self, data):
        self._data = data

    def table(self, name):
        assert name == "notes"
        return _NotesQuery(self._data)


def test_notes_router_uses_crud_handler(monkeypatch):
    monkeypatch.setattr(
        notes, "supabase", _SupabaseStub([{"id": "note-1", "title": "Exam notes"}])
    )
    app.dependency_overrides[notes.get_current_user] = lambda: "user-1"

    with TestClient(app) as client:
        response = client.get("/notes/")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [{"id": "note-1", "title": "Exam notes"}]


def test_cmm_routes_are_mounted():
    app.dependency_overrides[cmm_service.get_current_user] = lambda: "user-1"

    with TestClient(app) as client:
        response = client.post(
            "/cmm/predict",
            json={
                "theta": 0.0,
                "beta": 0.5,
                "S": 2.0,
                "t": 24.0,
                "c": 0.1,
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert 0.0 <= response.json()["predicted"] <= 1.0


def test_questions_routes_are_mounted(monkeypatch):
    monkeypatch.setattr(
        questions, "list_questions", lambda **_kwargs: [{"id": "question-1"}]
    )
    app.dependency_overrides[questions.get_current_user] = lambda: "user-1"

    with TestClient(app) as client:
        response = client.get("/questions/?package_slug=sat")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [{"id": "question-1"}]


def test_admin_observability_route_is_mounted(monkeypatch):
    class _Query:
        def __init__(self, rows):
            self._rows = rows

        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def limit(self, *_args, **_kwargs):
            return self

        def execute(self):
            return SimpleNamespace(data=self._rows)

    class _Supabase:
        def table(self, name):
            if name == "packages":
                return _Query([{"id": "pkg-1", "slug": "sat", "name": "SAT"}])
            if name == "concepts":
                return _Query(
                    [
                        {"id": "c-1", "slug": "linear-functions", "name": "Linear Functions", "package_id": "pkg-1"},
                        {"id": "c-2", "slug": "systems", "name": "Systems", "package_id": "pkg-1"},
                    ]
                )
            if name == "concept_relationships":
                return _Query(
                    [
                        {"id": "r-1", "source_concept_id": "c-1", "target_concept_id": "c-2", "package_id": "pkg-1"}
                    ]
                )
            if name == "questions":
                return _Query([{"id": "q-1", "package_id": "pkg-1"}])
            raise AssertionError(f"Unexpected table: {name}")

    monkeypatch.setattr(admin, "supabase", _Supabase())
    monkeypatch.setattr(admin, "getPackageGraphBySlug", lambda _slug: None)
    app.dependency_overrides[admin.require_internal_admin] = lambda: "user-1"

    with TestClient(app) as client:
        response = client.get("/admin/observability?package_slug=sat")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["counts"]["package_count"] == 1
