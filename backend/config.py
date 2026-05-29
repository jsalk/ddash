"""Configuration loader."""
import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Config:
    abs_url: str = "http://192.168.0.92:13378"
    abs_token: str = ""
    weather_city: str = "Chicago"
    refresh_interval: int = 2

    @classmethod
    def load(cls, path: Path | None = None) -> "Config":
        if path is None:
            path = Path(__file__).resolve().parent.parent / "config.json"
        if path.exists():
            data = json.loads(path.read_text())
            return cls(
                abs_url=data.get("ABS_URL", cls.abs_url),
                abs_token=data.get("ABS_TOKEN", cls.abs_token),
                weather_city=data.get("WEATHER_CITY", cls.weather_city),
                refresh_interval=data.get("REFRESH_INTERVAL", cls.refresh_interval),
            )
        return cls()
