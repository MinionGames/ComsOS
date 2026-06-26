import asyncio

import pytest
from fastapi import HTTPException

from app.api.auth import get_current_user


def test_get_current_user_requires_authorization_header():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user())

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing Authorization header"
