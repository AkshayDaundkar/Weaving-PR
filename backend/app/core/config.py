"""App configuration via pydantic-settings. Single source of truth."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Load from env and .env file. No defaults that hide required vars in production."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Data paths (file-based, no DB)
    data_dir: str = "data"
    output_file: str = "output/engineers.json"

    # Optional: future GitHub / LLM
    github_token: str = ""
    github_org: str = "PostHog"
    github_repo: str = "posthog"

    @property
    def output_path(self) -> Path:
        return Path(self.data_dir) / self.output_file


@lru_cache
def get_settings() -> Settings:
    return Settings()
