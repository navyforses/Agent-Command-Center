"""Configuration management for Trial Navigator."""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (Supabase)
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    database_url: Optional[str] = None

    # OpenAI
    openai_api_key: Optional[str] = None

    # Anthropic (fallback)
    anthropic_api_key: Optional[str] = None

    # Email (Resend)
    resend_api_key: Optional[str] = None
    from_email: str = "noreply@trialnavigator.com"

    # Stripe
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None

    # App
    app_url: str = "http://localhost:8000"
    secret_key: str = "your-secret-key-change-in-production"
    debug: bool = True

    # Rate limits
    clinicaltrials_gov_rate_limit: float = 3.0  # requests per second
    pubmed_rate_limit: float = 3.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
