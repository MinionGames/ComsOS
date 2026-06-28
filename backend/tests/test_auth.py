import asyncio

import pytest
from fastapi import HTTPException

from app.api import auth
from app.api.auth import AuthRequest, get_current_user


def test_get_current_user_requires_authorization_header():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user())

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing Authorization header"


def test_signup_accepts_nested_user_payload(monkeypatch):
    class _Resp:
        status_code = 200

        @staticmethod
        def json():
            return {"user": {"id": "user_nested_123", "email": "x@y.com"}}

    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *_args, **_kwargs):
            return _Resp()

    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda *args, **kwargs: _Client())
    monkeypatch.setattr(auth, "_ensure_profile_row", lambda *_args, **_kwargs: None)

    res = asyncio.run(
        auth.signup(
            AuthRequest(email="nested@example.com", password="password123", name="N")
        )
    )

    assert res["message"].lower().startswith("check your email")


def test_signup_accepts_top_level_user_payload(monkeypatch):
    class _Resp:
        status_code = 200

        @staticmethod
        def json():
            return {"id": "user_flat_123", "email": "x@y.com"}

    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *_args, **_kwargs):
            return _Resp()

    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda *args, **kwargs: _Client())
    monkeypatch.setattr(auth, "_ensure_profile_row", lambda *_args, **_kwargs: None)

    res = asyncio.run(
        auth.signup(
            AuthRequest(email="flat@example.com", password="password123", name="F")
        )
    )

    assert res["message"].lower().startswith("check your email")
