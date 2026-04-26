from app.config import settings
import httpx
import logging
from typing import Any, Dict, Optional
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

try:
    import anthropic
except Exception:  # pragma: no cover - optional SDK
    anthropic = None

API_URL = "https://api.anthropic.com/v1/messages"


class ClaudeServiceError(RuntimeError):
    pass


def _extract_text_from_response(data: dict) -> str:
    # Try several possible response shapes to extract a text string
    if not isinstance(data, dict):
        return str(data)

    if "message" in data:
        msg = data["message"]
        if isinstance(msg, dict) and "content" in msg:
            return (
                msg["content"]
                if isinstance(msg["content"], str)
                else str(msg["content"])
            )
        return str(msg)

    if "completion" in data:
        comp = data["completion"]
        if isinstance(comp, dict):
            for k in ("content", "text", "output_text"):
                if k in comp:
                    return comp[k] if isinstance(comp[k], str) else str(comp[k])
        return str(comp)

    if "choices" in data and isinstance(data["choices"], list) and data["choices"]:
        choice = data["choices"][0]
        if isinstance(choice, dict):
            if (
                "message" in choice
                and isinstance(choice["message"], dict)
                and "content" in choice["message"]
            ):
                return choice["message"]["content"]
            for k in ("text", "completion"):
                if k in choice:
                    return choice[k]
        return str(choice)

    # Fallback: stringify the whole payload
    return str(data)


class ClaudeService:
    def __init__(self, api_key: str, default_model: str = "claude-opus-4-7"):
        self.api_key = api_key
        self.default_model = default_model

    async def complete(
        self, prompt: str, max_tokens: int = 300, model: Optional[str] = None
    ) -> str:
        model = model or self.default_model
        if not self.api_key:
            raise ClaudeServiceError(
                "ANTHROPIC_API_KEY is not configured in environment"
            )

        # SDK path
        if anthropic is not None:
            client = anthropic.Client(api_key=self.api_key)

            def _sdk_call():
                # messages API
                if hasattr(client, "messages") and hasattr(client.messages, "create"):
                    try:
                        resp = client.messages.create(
                            model=model,
                            messages=[{"role": "user", "content": prompt}],
                            max_tokens=max_tokens,
                        )
                        # attempt to extract text
                        if isinstance(resp, dict):
                            return _extract_text_from_response(resp)
                        if hasattr(resp, "message"):
                            msg = getattr(resp, "message")
                            return (
                                _extract_text_from_response(msg)
                                if isinstance(msg, dict)
                                else str(msg)
                            )
                        if hasattr(resp, "completion"):
                            return getattr(resp, "completion")
                        return str(resp)
                    except Exception as e:
                        logger.exception("Anthropic SDK messages.create failed")
                        raise ClaudeServiceError(str(e))

                # fallback to completions API on SDK
                if hasattr(client, "completions") and hasattr(
                    client.completions, "create"
                ):
                    try:
                        resp = client.completions.create(
                            model=model,
                            prompt=prompt,
                            max_tokens_to_sample=max_tokens,
                        )
                        if isinstance(resp, dict):
                            return _extract_text_from_response(resp)
                        if hasattr(resp, "completion"):
                            return getattr(resp, "completion")
                        return str(resp)
                    except Exception as e:
                        logger.exception("Anthropic SDK completions.create failed")
                        raise ClaudeServiceError(str(e))

                raise ClaudeServiceError(
                    "Installed Anthropic SDK does not expose messages or completions APIs"
                )

            return await run_in_threadpool(_sdk_call)

        # HTTP path
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # include acceptable Anthropic-Version if needed; keep optional
            "Anthropic-Version": "2024-12-18",
            "Accept": "application/json",
        }

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(API_URL, json=payload, headers=headers)

        # Rate limit logging
        if resp.status_code == 429 or resp.headers.get("Retry-After"):
            rl_info = {
                "status_code": resp.status_code,
                "retry_after": resp.headers.get("Retry-After"),
                "limit": resp.headers.get("x-rate-limit-limit"),
                "remaining": resp.headers.get("x-rate-limit-remaining"),
            }
            logger.warning("Anthropic rate limit: %s", rl_info)

        if resp.status_code >= 400:
            logger.error("Anthropic HTTP error: %s %s", resp.status_code, resp.text)
            raise ClaudeServiceError(f"Error code: {resp.status_code} - {resp.text}")

        data = resp.json()
        return _extract_text_from_response(data)

    async def list_models(self) -> Any:
        if not self.api_key:
            raise ClaudeServiceError(
                "ANTHROPIC_API_KEY is not configured in environment"
            )

        if anthropic is not None:
            client = anthropic.Client(api_key=self.api_key)

            def _sdk_call():
                if hasattr(client, "models") and hasattr(client.models, "list"):
                    return client.models.list()
                if hasattr(client, "models"):
                    try:
                        return client.models()
                    except Exception:
                        pass
                if hasattr(client, "request"):
                    return client.request("GET", "/v1/models")
                raise ClaudeServiceError(
                    "Installed Anthropic SDK does not expose a models listing API"
                )

            return await run_in_threadpool(_sdk_call)

        url = "https://api.anthropic.com/v1/models"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code >= 400:
            logger.error(
                "Anthropic models list error: %s %s", resp.status_code, resp.text
            )
            raise ClaudeServiceError(f"Error code: {resp.status_code} - {resp.text}")

        return resp.json()


# module-level instance for convenience
claude = ClaudeService(settings.anthropic_api_key, settings.anthropic_default_model)


async def complete(
    prompt: str, max_tokens: int = 300, model: Optional[str] = None
) -> str:
    return await claude.complete(prompt, max_tokens=max_tokens, model=model)


async def list_models() -> Any:
    return await claude.list_models()


async def list_models() -> Any:
    """Return available models for the configured API key.

    Uses the installed SDK when available, otherwise falls back to an HTTP GET.
    """
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured in environment")

    # SDK path
    if anthropic is not None:
        client = anthropic.Client(api_key=settings.anthropic_api_key)

        def _sdk_call():
            # different SDK versions expose models list differently
            if hasattr(client, "models") and hasattr(client.models, "list"):
                return client.models.list()
            if hasattr(client, "models"):
                try:
                    return client.models()
                except Exception:
                    pass
            # some SDKs offer a raw request helper
            if hasattr(client, "request"):
                return client.request("GET", "/v1/models")
            raise RuntimeError(
                "Installed Anthropic SDK does not expose a models listing API"
            )

        return await run_in_threadpool(_sdk_call)

    # HTTP fallback
    url = "https://api.anthropic.com/v1/models"
    headers = {
        "Authorization": f"Bearer {settings.anthropic_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code >= 400:
        raise RuntimeError(f"Error code: {resp.status_code} - {resp.text}")

    return resp.json()
