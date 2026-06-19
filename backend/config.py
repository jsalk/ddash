"""Configuration loader.

Priority: environment variables > config.json > defaults.
"""
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass
class Config:
    abs_url: str = ""
    abs_token: str = ""
    weather_city: str = "Chicago"
    refresh_interval: int = 2

    @classmethod
    def load(cls, path: Path | None = None) -> "Config":
        # Start with defaults
        cfg = cls()

        # Layer 1: config.json (if it exists)
        if path is None:
            path = Path(__file__).resolve().parent.parent / "config.json"
        if path.exists():
            try:
                data = json.loads(path.read_text())
                cfg.abs_url = data.get("ABS_URL", cfg.abs_url)
                cfg.abs_token = data.get("ABS_TOKEN", cfg.abs_token)
                cfg.weather_city = data.get("WEATHER_CITY", cfg.weather_city)
                cfg.refresh_interval = data.get("REFRESH_INTERVAL", cfg.refresh_interval)
            except (json.JSONDecodeError, OSError) as e:
                log.warning("Failed to load config.json: %s", e)

        # Layer 2: env vars override everything
        cfg.abs_url = os.environ.get("DDASH_ABS_URL", cfg.abs_url)
        cfg.abs_token = os.environ.get("DDASH_ABS_TOKEN", cfg.abs_token)
        cfg.weather_city = os.environ.get("DDASH_WEATHER_CITY", cfg.weather_city)

        return cfg
