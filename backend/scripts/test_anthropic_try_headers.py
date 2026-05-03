import os
import asyncio
import httpx

API_URL = "https://api.anthropic.com/v1/messages"


async def try_header(name, value):
    headers = {
        name: value,
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
            return {"error": str(e)}
    out = {"status": r.status_code}
    try:
        out["json"] = r.json()
    except Exception:
        out["text"] = r.text
    return out


async def main():
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        print("No ANTHROPIC_API_KEY in environment")
        return

    # print a masked preview so user can confirm value loaded
    print("Loaded key length:", len(key))
    print("Key preview:", key[:8] + "..." + key[-8:])

    print("\nTrying Authorization: Bearer header...")
    res1 = await try_header("Authorization", f"Bearer {key}")
    print(res1)

    print("\nTrying x-api-key header...")
    res2 = await try_header("x-api-key", key)
    print(res2)

    print("\nTrying Authorization as x-api-key value (some setups expect this)")
    res3 = await try_header("x-api-key", f"Bearer {key}")
    print(res3)


if __name__ == "__main__":
    asyncio.run(main())
