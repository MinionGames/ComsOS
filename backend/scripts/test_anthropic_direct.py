import os
import asyncio
import httpx

API_URL = "https://api.anthropic.com/v1/messages"


async def main():
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        print("No ANTHROPIC_API_KEY in environment")
        return
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
