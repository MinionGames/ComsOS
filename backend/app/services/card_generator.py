import json
import re
from typing import List, Dict, Optional
from app.services.prompts import (
    CARD_GENERATION_SYSTEM_PROMPT,
    CARD_GENERATION_USER_MESSAGE,
)
from app.services.anthropic_service import claude, ClaudeServiceError


async def generate_cards_from_text(
    extracted_text: str, subject_name: str = "", model: Optional[str] = None
) -> List[Dict]:
    """
    Sends extracted PDF text to Claude and returns a list of card dicts.
    Each dict contains: front, back.
    Raises ValueError on parse errors or ClaudeServiceError for API issues.
    """

    # truncate if over token limit — ~12,000 words is safe
    max_chars = 48_000
    if len(extracted_text) > max_chars:
        extracted_text = extracted_text[:max_chars] + "\n\n[Text truncated for length]"

    system_prompt = CARD_GENERATION_SYSTEM_PROMPT.replace(
        "{extracted_text}", extracted_text
    )

    # Combine system prompt and user instruction into a single prompt string
    prompt = system_prompt + "\n\n" + CARD_GENERATION_USER_MESSAGE

    try:
        raw = await claude.complete(prompt, max_tokens=4096, model=model)
    except ClaudeServiceError:
        raise

    if not isinstance(raw, str):
        raw = str(raw)

    raw = raw.strip()

    # strip markdown fences if the model includes them despite instructions
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        cards = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model returned invalid JSON: {e}\n\nRaw output:\n{raw}")

    if not isinstance(cards, list):
        raise ValueError(f"Expected a JSON array, got: {type(cards)}")

    # validate and sanitise each card
    validated: List[Dict] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        if not card.get("front") or not card.get("back"):
            continue
        validated.append(
            {
                "front": str(card["front"]).strip(),
                "back": str(card["back"]).strip(),
            }
        )

    if len(validated) == 0:
        raise ValueError("Model returned zero valid cards")

    return validated
