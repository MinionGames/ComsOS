import asyncio
import json
import sys

from app.config import settings

# Ensure backend package imports work when running from repo root
# Script expects to be run with cwd=backend

from app.services.card_generator import generate_cards_from_text

# If the real Claude call fails (no key or API error), we'll monkeypatch a mock response
try:
    from app.services import anthropic_service
except Exception:
    anthropic_service = None

SAMPLE_TEXT = """
Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water. Photosynthesis in plants generally involves the green pigment chlorophyll and generates oxygen as a byproduct.
"""

MOCK_OUTPUT = json.dumps(
    [
        {
            "front": "What is photosynthesis?",
            "back": "Photosynthesis is the process by which plants convert light energy into chemical energy, producing oxygen as a byproduct.",
        },
        {
            "front": "Which pigment is primarily involved in photosynthesis?",
            "back": "Chlorophyll is the primary pigment that absorbs light for photosynthesis.",
        },
        {
            "front": "What are the main inputs and outputs of photosynthesis?",
            "back": "Inputs: carbon dioxide and water; Output: glucose (chemical energy) and oxygen.",
        },
    ]
)


async def main():
    # If there's no API key or the service isn't available, patch the claude.complete call
    use_mock = False
    if not settings.anthropic_api_key:
        print("No Anthropic API key configured; using mock response.")
        use_mock = True

    if anthropic_service is None:
        print("Anthropic service module unavailable; using mock response.")
        use_mock = True

    if use_mock and anthropic_service is not None:

        async def _mock_complete(
            prompt: str, max_tokens: int = 300, model: str | None = None
        ):
            return MOCK_OUTPUT

        anthropic_service.claude.complete = _mock_complete

    try:
        cards = await generate_cards_from_text(SAMPLE_TEXT, subject_name="Biology")
        print(json.dumps(cards, indent=2, ensure_ascii=False))
    except Exception as e:
        print("First attempt failed:", e, file=sys.stderr)
        # fallback to mock if possible
        if anthropic_service is not None:
            print("Falling back to mock response and retrying...")

            async def _mock_complete(
                prompt: str, max_tokens: int = 300, model: str | None = None
            ):
                return MOCK_OUTPUT

            anthropic_service.claude.complete = _mock_complete
            try:
                cards = await generate_cards_from_text(
                    SAMPLE_TEXT, subject_name="Biology"
                )
                print(json.dumps(cards, indent=2, ensure_ascii=False))
            except Exception as e2:
                print("Mock retry failed:", e2, file=sys.stderr)
                sys.exit(3)
        else:
            sys.exit(2)


if __name__ == "__main__":
    asyncio.run(main())
