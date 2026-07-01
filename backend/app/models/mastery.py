from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StudentConceptMastery:
    id: str | None = None
    user_id: str = ""
    concept_id: str = ""
    mastery: float = 0.5
    confidence: float = 0.5
    forgetting_rate: float = 0.0
    last_reviewed_at: str | None = None
    updated_at: str | None = None
