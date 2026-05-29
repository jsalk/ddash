"""ddash — live system dashboard backend."""

import asyncio
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import psutil
import requests
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="ddash")

# ── config ────────────────────────────────────────────────────────────────────
_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.json"
if _CONFIG_PATH.exists():
    import json as _json
    _cfg = _json.loads(_CONFIG_PATH.read_text())
else:
    _cfg = {}

ABS_URL = _cfg.get("ABS_URL", "http://192.168.0.92:13378")
ABS_TOKEN = _cfg.get("ABS_TOKEN", "")
ABS_FRESHNESS_SEC = _cfg.get("ABS_FRESHNESS_SEC", 60)
ABS_POLL_SEC = _cfg.get("ABS_POLL_SEC", 5)

WEATHER_CITY = _cfg.get("WEATHER_CITY", "Chicago")
WEATHER_CACHE_SEC = _cfg.get("WEATHER_CACHE_SEC", 600)  # 10 min

_static = Path(__file__).resolve().parent.parent / "static"

# ── helpers ───────────────────────────────────────────────────────────────────

_prev_net = None
_prev_net_time = None


def _get_cpu_times():
    """Return (user, system, idle) as percentages."""
    c = psutil.cpu_times_percent(interval=0)
    return c.user + c.nice, c.system + c.iowait, c.idle


def _get_network_rates():
    global _prev_net, _prev_net_time
    counters = psutil.net_io_counters()
    now = time.monotonic()
    rx, tx = counters.bytes_recv, counters.bytes_sent
    if _prev_net is None or _prev_net_time is None:
        _prev_net = (rx, tx)
        _prev_net_time = now
        return 0.0, 0.0
    dt = now - _prev_net_time
    if dt < 0.1:
        dt = 0.1
    rx_rate = (rx - _prev_net[0]) / dt
    tx_rate = (tx - _prev_net[1]) / dt
    _prev_net = (rx, tx)
    _prev_net_time = now
    return rx_rate, tx_rate


def _fmt_bytes(b):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(b) < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} PB"


def _fmt_rate(bps):
    return _fmt_bytes(bps) + "/s"


def _get_temps():
    """Read temps via sensors command."""
    try:
        r = subprocess.run(["sensors", "-j"], capture_output=True, text=True, timeout=3)
        if r.returncode != 0:
            return _get_temps_text()
        data = json.loads(r.stdout)
        temps = {}
        for chip, features in data.items():
            for feat, vals in features.items():
                if isinstance(vals, dict) and "temp1_input" in vals:
                    label = f"{chip}/{feat}"
                    temps[label] = round(vals["temp1_input"], 1)
        return temps
    except Exception:
        return _get_temps_text()


def _get_temps_text():
    """Fallback: parse sensors text output."""
    try:
        r = subprocess.run(["sensors"], capture_output=True, text=True, timeout=3)
        temps = {}
        for line in r.stdout.splitlines():
            if "temp1:" in line or "Tctl:" in line or "Tccd" in line:
                parts = line.split()
                for i, p in enumerate(parts):
                    if p.startswith("+") and "°C" in p:
                        try:
                            val = float(p.replace("°C", "").replace("+", ""))
                            key = parts[0].rstrip(":")
                            temps[key] = val
                        except ValueError:
                            pass
        return temps
    except Exception:
        return {}


def _get_gpu():
    """Parse nvidia-smi for GPU stats."""
    try:
        r = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,"
                "memory.used,memory.total,power.draw,power.limit,fan.speed",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if r.returncode != 0:
            return None
        parts = [p.strip() for p in r.stdout.strip().split(",")]
        if len(parts) < 9:
            return None
        return {
            "name": parts[0],
            "temp": _safe_int(parts[1]),
            "gpu_util": _safe_int(parts[2]),
            "mem_util": _safe_int(parts[3]),
            "mem_used": _safe_int(parts[4]),
            "mem_total": _safe_int(parts[5]),
            "power_draw": _safe_float(parts[6]),
            "power_limit": _safe_float(parts[7]),
            "fan_speed": _safe_float(parts[8]),
        }
    except Exception:
        return None


def _safe_int(s):
    try:
        return int(s.strip())
    except (ValueError, TypeError):
        return 0


def _safe_float(s):
    try:
        return float(s.strip())
    except (ValueError, TypeError):
        return 0.0


# ── MPRIS / Audiobookshelf ──────────────────────────────────────────────────

_abs_cache = None
_abs_last_poll = 0.0


def _get_mpris():
    """Get media state from playerctl."""
    try:
        r = subprocess.run(
            [
                "playerctl", "metadata", "--format",
                "{{status}}\t{{title}}\t{{artist}}\t{{position}}\t{{mpris:length}}\t{{xesam:url}}\t{{playerName}}",
            ],
            capture_output=True, text=True, timeout=2,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return None
        parts = r.stdout.strip().split("\t")
        if len(parts) < 7:
            return None
        status, title, artist, position, length, url, player = parts
        if status not in ("Playing", "Paused"):
            return None
        pos = int(position) / 1_000_000 if position.lstrip("-").isdigit() else 0.0
        dur = int(length) / 1_000_000 if length.lstrip("-").isdigit() else 0.0
        return {
            "status": status,
            "title": title or "Unknown",
            "artist": artist or "",
            "pos": pos,
            "dur": dur,
            "source": _detect_source(url, player),
        }
    except Exception:
        return None


def _detect_source(url, player):
    u = (url or "").lower()
    if "music.youtube.com" in u:
        return "YT Music"
    if "youtube.com" in u or "youtu.be" in u:
        return "YouTube"
    if "spotify.com" in u:
        return "Spotify"
    if "soundcloud.com" in u:
        return "SoundCloud"
    if "bandcamp.com" in u:
        return "Bandcamp"
    return player.capitalize() if player else "Unknown"


def _get_abs():
    global _abs_cache, _abs_last_poll
    now = time.time()
    if now - _abs_last_poll < ABS_POLL_SEC:
        return _abs_cache
    _abs_last_poll = now
    try:
        resp = requests.get(
            f"{ABS_URL}/api/me/listening-sessions",
            headers={"Authorization": f"Bearer {ABS_TOKEN}"},
            params={"itemsPerPage": 1},
            timeout=3,
        )
        if resp.status_code != 200:
            _abs_cache = None
            return None
        sessions = resp.json().get("sessions", [])
        if not sessions:
            _abs_cache = None
            return None
        s = sessions[0]
        age = (now * 1000 - s.get("updatedAt", 0)) / 1000
        if age > ABS_FRESHNESS_SEC:
            _abs_cache = None
            return None
        _abs_cache = {
            "status": "Playing",
            "title": s.get("displayTitle", "Unknown"),
            "artist": s.get("displayAuthor", ""),
            "pos": float(s.get("currentTime", 0)),
            "dur": float(s.get("duration", 0)),
            "source": "Audiobookshelf",
        }
        return _abs_cache
    except Exception:
        _abs_cache = None
        return None


def _get_media():
    return _get_mpris() or _get_abs()


# ── Docker ────────────────────────────────────────────────────────────────────

def _get_docker():
    """Get Docker container statuses."""
    try:
        r = subprocess.run(
            ["docker", "ps", "-a", "--format",
             '{"name":"{{.Names}}","status":"{{.Status}}","image":"{{.Image}}","ports":"{{.Ports}}","state":"{{.State}}"}'],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode != 0:
            return []
        containers = []
        for line in r.stdout.strip().splitlines():
            if line:
                containers.append(json.loads(line))
        return containers
    except Exception:
        return []


# ── Weather ───────────────────────────────────────────────────────────────────

_weather_cache = None
_weather_last_fetch = 0.0


def _get_weather():
    global _weather_cache, _weather_last_fetch
    now = time.time()
    if _weather_cache and (now - _weather_last_fetch) < WEATHER_CACHE_SEC:
        return _weather_cache
    try:
        r = requests.get(
            f"https://wttr.in/{WEATHER_CITY}?format=j1",
            timeout=5,
        )
        if r.status_code != 200:
            return _weather_cache
        d = r.json()
        c = d["current_condition"][0]
        _weather_cache = {
            "temp_f": c["temp_F"],
            "feels_like_f": c["FeelsLikeF"],
            "description": c["weatherDesc"][0]["value"],
            "humidity": c["humidity"],
            "wind_mph": c["windspeedMiles"],
            "wind_dir": c["winddir16Point"],
            "visibility_miles": c["visibility"],
            "uv_index": c.get("uvIndex", "?"),
        }
        _weather_last_fetch = now
        return _weather_cache
    except Exception:
        return _weather_cache


# ── Disk ──────────────────────────────────────────────────────────────────────

def _get_disks():
    disks = []
    for part in psutil.disk_partitions():
        try:
            u = psutil.disk_usage(part.mountpoint)
            disks.append({
                "device": part.device,
                "mount": part.mountpoint,
                "fstype": part.fstype,
                "total": u.total,
                "used": u.used,
                "free": u.free,
                "percent": u.percent,
            })
        except PermissionError:
            pass
    return disks


# ── Combined endpoint ─────────────────────────────────────────────────────────

@app.get("/api/all")
async def api_all():
    """Single payload for initial page load."""
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_user, cpu_sys, cpu_idle = _get_cpu_times()
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    rx_rate, tx_rate = _get_network_rates()
    temps = _get_temps()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "system": {
            "cpu_percent": cpu_percent,
            "cpu_user": cpu_user,
            "cpu_sys": cpu_sys,
            "cpu_count": psutil.cpu_count(),
            "cpu_freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
            "mem_total": mem.total,
            "mem_used": mem.used,
            "mem_available": mem.available,
            "mem_percent": mem.percent,
            "swap_total": swap.total,
            "swap_used": swap.used,
            "swap_percent": swap.percent,
            "rx_rate": rx_rate,
            "tx_rate": tx_rate,
            "rx_total": psutil.net_io_counters().bytes_recv,
            "tx_total": psutil.net_io_counters().bytes_sent,
            "uptime": time.time() - psutil.boot_time(),
            "load_avg": list(psutil.getloadavg()),
            "temps": temps,
        },
        "gpu": _get_gpu(),
        "media": _get_media(),
        "docker": _get_docker(),
        "weather": _get_weather(),
        "disks": _get_disks(),
    }


# ── SSE stream ────────────────────────────────────────────────────────────────

@app.get("/api/stream")
async def api_stream(interval: int = 2):
    """Server-Sent Events — pushes /api/all every `interval` seconds (1-60)."""
    interval = max(1, min(60, interval))
    async def gen():
        while True:
            data = await api_all()
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(interval)

    return StreamingResponse(gen(), media_type="text/event-stream")


# ── Static files ──────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    return (_static / "index.html").read_text()


app.mount("/static", StaticFiles(directory=str(_static)), name="static")
