import os
import asyncio
import httpx

API_URL = "https://api.anthropic.com/v1/messages"


async def main():
    # key = os.getenv("ANTHROPIC_API_KEY")
    key = "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"
    if not key:
        print("No ANTHROPIC_API_KEY in environment")
        return

    headers = {
        "Authorization": f"Bearer {key}",
        "Anthropic-Version": "2024-12-18",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "claude-2.1",
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens_to_sample": 20,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(API_URL, json=payload, headers=headers)
        except Exception as e:
            print("Request failed:", e)
            return

    print("Status:", r.status_code)
    try:
        print("JSON:", r.json())
    except Exception:
        print("Text:", r.text)


if __name__ == "__main__":
    asyncio.run(main())
