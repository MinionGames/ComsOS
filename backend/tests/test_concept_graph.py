from fastapi.testclient import TestClient

from app.api import concept_graph
from app.main import app
from app.services.concept_graph import (
    ConceptEdge,
    GraphValidationError,
    detect_cycle,
    get_dependent_ids,
    get_prerequisite_ids,
)


def test_graph_traversal_prerequisites_and_dependents():
    edges = [
        ConceptEdge("functions", "quadratics", "prerequisite"),
        ConceptEdge("algebra", "functions", "prerequisite"),
        ConceptEdge("quadratics", "projectile-motion", "prerequisite"),
        ConceptEdge("vectors", "projectile-motion", "related"),
    ]

    prereqs = get_prerequisite_ids(edges, "projectile-motion")
    dependents = get_dependent_ids(edges, "algebra")

    assert prereqs == ["quadratics", "functions", "algebra"]
    assert dependents == ["functions", "quadratics", "projectile-motion"]


def test_detect_cycle_true_when_path_exists():
    edges = [
        ConceptEdge("a", "b", "prerequisite"),
        ConceptEdge("b", "c", "prerequisite"),
    ]

    assert detect_cycle(edges, "c", "a") is True
    assert detect_cycle(edges, "a", "c") is False


def test_relationship_cycle_validation_route(monkeypatch):
    def _raise_cycle(**_kwargs):
        raise GraphValidationError("Relationship would create a prerequisite cycle")

    monkeypatch.setattr(
        concept_graph.RelationshipService, "create_relationship", _raise_cycle
    )
    app.dependency_overrides[concept_graph.get_current_user] = lambda: "user-1"

    with TestClient(app) as client:
        response = client.post(
            "/relationships/",
            json={
                "source_concept_id": "a",
                "target_concept_id": "b",
                "relationship_type": "prerequisite",
                "strength": 1.0,
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "cycle" in response.json()["detail"].lower()


def test_get_concepts_route_passes_subject_id_parameter(monkeypatch):
    received = {}

    def _stub_get_concepts_by_subject(**kwargs):
        received.update(kwargs)
        return [{"id": "concept-1", "name": "Functions"}]

    monkeypatch.setattr(
        concept_graph.ConceptService,
        "get_concepts_by_subject",
        _stub_get_concepts_by_subject,
    )
    app.dependency_overrides[concept_graph.get_current_user] = lambda: "user-1"

    with TestClient(app) as client:
        response = client.get("/concepts/?subject_id=sub-1")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [{"id": "concept-1", "name": "Functions"}]
    assert received["user_id"] == "user-1"
    assert received["subject_id"] == "sub-1"
