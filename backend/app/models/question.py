from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class Question:
    id: str | None = None
    user_id: str | None = None
    package_id: str | None = None
    title: str | None = None
    question_text: str = ""
    source: str | None = None
    difficulty: float = 0.5
    created_at: str | None = None
    updated_at: str | None = None


@dataclass(frozen=True, slots=True)
class QuestionConceptLink:
    id: str | None = None
    package_id: str | None = None
    question_id: str | None = None
    concept_id: str | None = None
    weight: float = 1.0
    created_at: str | None = None


@dataclass(frozen=True, slots=True)
class QuestionConceptAssociation:
    question_concept: QuestionConceptLink
    concept: dict[str, object]


@dataclass(frozen=True, slots=True)
class QuestionDetail:
    question: Question
    concepts: list[QuestionConceptAssociation] = field(default_factory=list)