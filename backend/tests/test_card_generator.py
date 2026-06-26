import asyncio

from app.services import card_generator


def test_generate_cards_from_text_strips_fences_and_invalid_entries(monkeypatch):
    async def fake_complete(
        prompt: str, max_tokens: int = 4096, model: str | None = None
    ):
        return """```json
[{"front": "Front", "back": "Back"}, {"front": "", "back": "skip"}]
```"""

    monkeypatch.setattr(card_generator.claude, "complete", fake_complete)

    cards = asyncio.run(card_generator.generate_cards_from_text("sample text"))

    assert cards == [{"front": "Front", "back": "Back"}]
