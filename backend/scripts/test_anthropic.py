import asyncio
from app.config import settings
from app.services.anthropic_service import complete


async def main():
    if not settings.anthropic_api_key:
        print("No ANTHROPIC_API_KEY configured in .env or environment")
        return

    prompt = "Write a single-line friendly confirmation message saying Anthropic is connected."
    try:
        resp = await complete(prompt, max_tokens=60)
        print("Anthropic response:")
        print(resp)
    except Exception as e:
        print("Anthropic call failed:", e)


if __name__ == "__main__":
    asyncio.run(main())
