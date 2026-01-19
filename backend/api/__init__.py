"""API routes package."""

from .routes_trials import router as trials_router
from .routes_search import router as search_router
from .routes_users import router as users_router
from .routes_languages import router as languages_router
from .routes_webhooks import router as webhooks_router

__all__ = [
    "trials_router",
    "search_router",
    "users_router",
    "languages_router",
    "webhooks_router",
]
