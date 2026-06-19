"""Media modules: Now Playing (MPRIS + Audiobookshelf)."""
import logging
import subprocess

import requests

from backend.modules import registry
from backend.config import Config

log = logging.getLogger(__name__)

_config = Config.load()
_session = requests.Session()


@registry.register("nowplaying", "Now Playing", "fa-play", "media")
def collect_nowplaying() -> dict | None:
    # MPRIS (local players)
    try:
        r = subprocess.run(
            ["playerctl", "metadata",
             "--format", "{{ playerName }}|{{ title }}|{{ artist }}|{{ position }}|{{ mpris:length }}"],
            capture_output=True, text=True, timeout=1,
        )
        if r.returncode == 0 and r.stdout.strip():
            parts = r.stdout.strip().split("|")
            if len(parts) >= 5:
                pos = int(parts[3]) / 1e6 if parts[3].isdigit() else 0
                dur = int(parts[4]) / 1e6 if parts[4].isdigit() else 0
                status_r = subprocess.run(
                    ["playerctl", "status"], capture_output=True, text=True, timeout=1,
                )
                status = status_r.stdout.strip() if status_r.returncode == 0 else "Unknown"
                return {
                    "source": parts[0],
                    "title": parts[1],
                    "artist": parts[2] if parts[2] else "",
                    "position": pos,
                    "duration": dur,
                    "status": status,
                }
    except FileNotFoundError:
        log.debug("playerctl not found — MPRIS unavailable")
    except subprocess.TimeoutExpired:
        log.debug("playerctl timed out")
    except Exception:
        log.exception("MPRIS collector failed")

    # Audiobookshelf (remote)
    if _config.abs_token:
        try:
            r = _session.get(
                f"{_config.abs_url}/api/me/listening-sessions?itemsPerPage=1",
                headers={"Authorization": f"Bearer {_config.abs_token}"},
                timeout=3,
            )
            if r.ok:
                sessions = r.json().get("sessions", [])
                if sessions:
                    s = sessions[0]
                    meta = s.get("libraryItem", {}).get("media", {}).get("metadata", {})
                    return {
                        "source": "Audiobookshelf",
                        "title": meta.get("title", "Unknown"),
                        "artist": meta.get("authorName", ""),
                        "position": s.get("currentTime", 0),
                        "duration": meta.get("duration", 0),
                        "status": "Playing" if not s.get("stopped", True) else "Paused",
                    }
        except requests.ConnectionError:
            log.debug("Audiobookshelf unreachable at %s", _config.abs_url)
        except Exception:
            log.exception("Audiobookshelf collector failed")
    return None
