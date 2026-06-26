from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import cmm_service, notes
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
