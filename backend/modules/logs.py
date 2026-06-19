"""Log modules: Docker, Journal."""
import logging
import subprocess

from backend.modules import registry

log = logging.getLogger(__name__)


@registry.register("docker", "Docker", "fa-docker", "logs")
def collect_docker() -> dict:
    try:
        r = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}|{{.Status}}|{{.Image}}"],
            capture_output=True, text=True, timeout=2,
        )
        if r.returncode == 0:
            containers = []
            for line in r.stdout.strip().splitlines():
                parts = line.split("|")
                if len(parts) >= 3:
                    containers.append({
                        "name": parts[0],
                        "status": parts[1],
                        "image": parts[2],
                    })
            return {"containers": containers}
    except FileNotFoundError:
        log.debug("docker not found — Docker data unavailable")
    except subprocess.TimeoutExpired:
        log.warning("docker ps timed out")
    except Exception:
        log.exception("Docker collector failed")
    return {"containers": []}


@registry.register("journal", "Journal", "fa-scroll", "logs")
def collect_journal() -> dict:
    try:
        r = subprocess.run(
            ["journalctl", "-n", "30", "--no-pager", "-o", "short-iso"],
            capture_output=True, text=True, timeout=3,
        )
        if r.returncode == 0:
            entries = []
            for line in r.stdout.strip().splitlines()[-20:]:
                parts = line.split(None, 5)
                if len(parts) >= 5:
                    ts = parts[0] + " " + parts[1]
                    msg = parts[-1][:120]
                    lower = msg.lower()
                    level = "info"
                    if any(w in lower for w in ["error", "fail", "crit", "alert"]):
                        level = "error"
                    elif any(w in lower for w in ["warn", "deprecated"]):
                        level = "warn"
                    entries.append({"time": ts, "msg": msg, "level": level})
            return {"entries": entries}
    except FileNotFoundError:
        log.debug("journalctl not found")
    except subprocess.TimeoutExpired:
        log.warning("journalctl timed out")
    except Exception:
        log.exception("Journal collector failed")
    return {"entries": []}
