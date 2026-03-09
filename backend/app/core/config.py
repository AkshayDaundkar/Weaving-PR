"""App configuration via pydantic-settings. Single source of truth."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Load from env and .env file. Single Settings for API, scripts, and pipeline."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Data paths (file-based, no DB)
    data_dir: str = "data"

    # GitHub
    github_token: str = ""
    github_org: str = "PostHog"
    github_repo: str = "posthog"

    # LLM / classification
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = "openai"  # "openai" | "anthropic"
    llm_model_classify: str = "gpt-4o-mini"
    llm_model_narrative: str = "claude-3-5-sonnet-20241022"
    llm_batch_size: int = 25  # PRs per API call

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Pipeline / app
    days_lookback: int = 90
    min_prs_to_qualify: int = 3
    min_reviews_to_qualify: int = 5

    @property
    def data_path(self) -> Path:
        """Root data directory (e.g. backend/data)."""
        return Path(self.data_dir)

    @property
    def raw_path(self) -> Path:
        """Raw pipeline output (e.g. data/raw)."""
        return self.data_path / "raw"

    @property
    def processed_path(self) -> Path:
        """Processed pipeline output (e.g. data/processed)."""
        return self.data_path / "processed"

    @property
    def output_path(self) -> Path:
        """Output directory (e.g. data/output); engineers.json lives here."""
        return self.data_path / "output"


@lru_cache
def get_settings() -> Settings:
    return Settings()
