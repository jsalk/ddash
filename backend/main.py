"""
ddash v2.0 — Backend API

Modular architecture: each monitoring module is a self-contained unit
with its own data collector. The API registry exposes them all.

Run: uvicorn backend.main:app --host 0.0.0.0 --port 9000
"""
import asyncio
import json
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

import psutil
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="ddash", version="2.0.0")

# ── Config ──────────────────────────────────────────────────────────────────
_cfg_path = Path(__file__).resolve().parent.parent / "config.json"
_cfg = json.loads(_cfg_path.read_text()) if _cfg_path.exists() else {}

# ── Module Registry ─────────────────────────────────────────────────────────
# Each module: { id, title, icon, category, collect() -> dict }
MODULES: dict[str, dict] = {}


def register(id: str, title: str, icon: str, category: str):
    """Decorator to register a monitoring module."""
    def decorator(func):
        MODULES[id] = {
            "id": id,
            "title": title,
            "icon": icon,
            "category": category,
            "collect": func,
        }
        return func
    return decorator


# ── Data Collectors ─────────────────────────────────────────────────────────

@register("cpu", "CPU", "fa-microchip", "system")
def collect_cpu() -> dict:
    p = psutil.cpu_percent(interval=0.1, percpu=False)
    times = psutil.cpu_times_percent(interval=0)
    freq = psutil.cpu_freq()
    load = psutil.getloadavg()
    return {
        "percent": p,
        "user": times.user,
        "sys": times.system,
        "cores": psutil.cpu_count(logical=True),
        "freq": round(freq.current / 1000, 1) if freq else 0,
        "load": [round(l, 2) for l in load],
    }


@register("gpu", "GPU", "fa-display", "system")
def collect_gpu() -> dict:
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,utilization.gpu,temperature.gpu,power.draw,memory.used,memory.total",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=2,
        )
        if r.returncode == 0 and r.stdout.strip():
            parts = [x.strip() for x in r.stdout.strip().split(",")]
            if len(parts) >= 6:
                return {
                    "name": parts[0],
                    "utilization": int(parts[1]),
                    "temp": int(parts[2]),
                    "power": float(parts[3]),
                    "vram_used": int(parts[4]),
                    "vram_total": int(parts[5]),
                }
    except Exception:
        pass
    return {"name": "N/A", "utilization": 0, "temp": 0, "power": 0, "vram_used": 0, "vram_total": 0}


@register("memory", "Memory", "fa-memory", "system")
def collect_memory() -> dict:
    m = psutil.virtual_memory()
    s = psutil.swap_memory()
    return {
        "ram": {"percent": m.percent, "used": m.used, "total": m.total, "available": m.available},
        "swap": {"percent": s.percent, "used": s.used, "total": s.total},
    }


@register("network", "Network", "fa-network-wired", "system")
def collect_network() -> dict:
    n1 = psutil.net_io_counters()
    time.sleep(0.1)
    n2 = psutil.net_io_counters()
    dt = 0.1
    return {
        "rx_rate": int((n2.bytes_recv - n1.bytes_recv) / dt),
        "tx_rate": int((n2.bytes_sent - n1.bytes_sent) / dt),
        "rx_total": n2.bytes_recv,
        "tx_total": n2.bytes_sent,
    }


@register("temps", "Temps", "fa-thermometer-half", "system")
def collect_temps() -> dict:
    try:
        temps = psutil.sensors_temperatures()
        return {k: v[0].current for k, v in temps.items() if v}
    except Exception:
        return {}


@register("nowplaying", "Now Playing", "fa-play", "media")
def collect_nowplaying() -> dict | None:
    # Check MPRIS
    try:
        r = subprocess.run(
            ["playerctl", "metadata", "--format", "{{ playerName }}|{{ title }}|{{ artist }}|{{ position }}|{{ mpris:length }}"],
            capture_output=True, text=True, timeout=1,
        )
        if r.returncode == 0 and r.stdout.strip():
            parts = r.stdout.strip().split("|")
            if len(parts) >= 5:
                pos = int(parts[3]) / 1e6 if parts[3].isdigit() else 0
                dur = int(parts[4]) / 1e6 if parts[4].isdigit() else 0
                status_r = subprocess.run(["playerctl", "status"], capture_output=True, text=True, timeout=1)
                status = status_r.stdout.strip() if status_r.returncode == 0 else "Unknown"
                return {
                    "source": parts[0],
                    "title": parts[1],
                    "artist": parts[2] if parts[2] else "",
                    "position": pos,
                    "duration": dur,
                    "status": status,
                }
    except Exception:
        pass

    # Check Audiobookshelf
    abs_url = _cfg.get("ABS_URL", "http://192.168.0.92:13378")
    abs_token = _cfg.get("ABS_TOKEN", "")
    if abs_token:
        try:
            r = requests.get(
                f"{abs_url}/api/me/listening-sessions?itemsPerPage=1",
                headers={"Authorization": f"Bearer {abs_token}"},
                timeout=3,
            )
            if r.ok:
                sessions = r.json().get("sessions", [])
                if sessions:
                    s = sessions[0]
                    return {
                        "source": "Audiobookshelf",
                        "title": s.get("libraryItem", {}).get("media", {}).get("metadata", {}).get("title", "Unknown"),
                        "artist": s.get("libraryItem", {}).get("media", {}).get("metadata", {}).get("authorName", ""),
                        "position": s.get("currentTime", 0),
                        "duration": s.get("libraryItem", {}).get("media", {}).get("metadata", {}).get("duration", 0),
                        "status": "Playing" if not s.get("stopped", True) else "Paused",
                    }
        except Exception:
            pass
    return None


@register("disks", "Disks", "fa-hard-drive", "system")
def collect_disks() -> dict:
    disks = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "device": part.device,
                "mount": part.mountpoint,
                "total": usage.total,
                "used": usage.used,
                "percent": usage.percent,
            })
        except PermissionError:
            pass
    return {"disks": disks}


@register("docker", "Docker", "fa-docker", "system")
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
    except Exception:
        pass
    return {"containers": []}


@register("journal", "Journal", "fa-scroll", "logs")
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
    except Exception:
        pass
    return {"entries": []}


@register("connections", "Connections", "fa-plug", "network")
def collect_connections() -> dict:
    conns = []
    for c in psutil.net_connections(kind="inet"):
        try:
            conns.append({
                "proto": "TCP" if c.type == 1 else "UDP",
                "laddr": f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "--",
                "raddr": f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "--",
                "status": c.status or "--",
            })
        except Exception:
            pass
    established = [c for c in conns if c["status"] == "ESTABLISHED"]
    others = [c for c in conns if c["status"] != "ESTABLISHED"]
    return {"connections": (established + others)[:30]}


@register("uptime", "Uptime / Load", "fa-clock", "system")
def collect_uptime() -> dict:
    u = psutil.boot_time()
    elapsed = time.time() - u
    days = int(elapsed // 86400)
    hours = int((elapsed % 86400) // 3600)
    mins = int((elapsed % 3600) // 60)
    load = psutil.getloadavg()
    procs = len(psutil.pids())
    return {
        "uptime_seconds": elapsed,
        "uptime_human": f"{days}d {hours}h {mins}m",
        "boot_time": datetime.fromtimestamp(u).isoformat(),
        "load_1m": round(load[0], 2),
        "load_5m": round(load[1], 2),
        "load_15m": round(load[2], 2),
        "processes": procs,
    }


@register("ifaces", "Interfaces", "fa-ethernet", "network")
def collect_ifaces() -> dict:
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    ifaces = []
    for name, addr_list in addrs.items():
        ips = []
        for a in addr_list:
            if a.family.name in ("AF_INET", "AF_INET6"):
                ips.append(a.address)
        s = stats.get(name)
        ifaces.append({
            "name": name,
            "ips": ips,
            "up": s.isup if s else False,
            "speed": s.speed if s else 0,
        })
    return {"interfaces": ifaces}


# ── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "modules": len(MODULES)}


@app.get("/api/modules")
async def list_modules():
    """Return registry of all available modules."""
    return [
        {"id": m["id"], "title": m["title"], "icon": m["icon"], "category": m["category"]}
        for m in MODULES.values()
    ]


@app.get("/api/module/{module_id}")
async def get_module(module_id: str):
    """Return data for a single module."""
    if module_id not in MODULES:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")
    mod = MODULES[module_id]
    data = await asyncio.to_thread(mod["collect"])
    return {"id": module_id, "data": data}


@app.get("/api/all")
async def get_all():
    """Return data for all modules."""
    results = {}
    for mid, mod in MODULES.items():
        try:
            results[mid] = await asyncio.to_thread(mod["collect"])
        except Exception:
            results[mid] = None
    return {"modules": results, "timestamp": datetime.now().isoformat()}


@app.get("/api/stream")
async def stream(interval: int = 2):
    """SSE endpoint — pushes /api/all every `interval` seconds."""
    interval = max(1, min(60, interval))

    async def gen():
        while True:
            data = await get_all()
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(interval)

    return StreamingResponse(gen(), media_type="text/event-stream")


# ── Layouts ─────────────────────────────────────────────────────────────────

LAYOUTS = [
    {
        "id": "sidebar-stack",
        "name": "Sidebar Stack",
        "description": "Persistent left nav, KPI strip at top, stacked content blocks.",
        "slots": [
            {"id": "nav", "row": 1, "col": 1, "rowSpan": 4, "colSpan": 1},
            {"id": "kpi", "row": 1, "col": 2, "rowSpan": 1, "colSpan": 4},
            {"id": "main-chart", "row": 2, "col": 2, "rowSpan": 1, "colSpan": 4},
            {"id": "row3", "row": 3, "col": 2, "rowSpan": 1, "colSpan": 4},
            {"id": "row4", "row": 4, "col": 2, "rowSpan": 1, "colSpan": 4},
        ],
        "columns": 5,
    },
    {
        "id": "bento-grid",
        "name": "Bento Grid",
        "description": "Mixed card sizes for modular, prioritized layout.",
        "slots": [
            {"id": "hero", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 2},
            {"id": "side1", "row": 1, "col": 3, "rowSpan": 1, "colSpan": 1},
            {"id": "side2", "row": 1, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "wide1", "row": 2, "col": 1, "rowSpan": 1, "colSpan": 1},
            {"id": "wide2", "row": 2, "col": 2, "rowSpan": 1, "colSpan": 1},
            {"id": "wide3", "row": 2, "col": 3, "rowSpan": 1, "colSpan": 1},
            {"id": "wide4", "row": 2, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "row3a", "row": 3, "col": 1, "rowSpan": 1, "colSpan": 1},
            {"id": "row3b", "row": 3, "col": 2, "rowSpan": 1, "colSpan": 1},
            {"id": "row3c", "row": 3, "col": 3, "rowSpan": 1, "colSpan": 1},
            {"id": "row3d", "row": 3, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "footer", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 4},
        ],
        "columns": 4,
    },
    {
        "id": "center-spotlight",
        "name": "Center Spotlight",
        "description": "One dominant live panel, side rails for supporting stats.",
        "slots": [
            {"id": "header", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 5},
            {"id": "left", "row": 2, "col": 1, "rowSpan": 2, "colSpan": 1},
            {"id": "stage", "row": 2, "col": 2, "rowSpan": 2, "colSpan": 3},
            {"id": "right", "row": 2, "col": 5, "rowSpan": 2, "colSpan": 1},
            {"id": "bottom", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 5},
        ],
        "columns": 5,
    },
    {
        "id": "tabbed-workspace",
        "name": "Tabbed Workspace",
        "description": "Category tabs, each with its own canvas.",
        "slots": [
            {"id": "toolbar", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 4},
            {"id": "tabs", "row": 2, "col": 1, "rowSpan": 1, "colSpan": 4},
            {"id": "ws1", "row": 3, "col": 1, "rowSpan": 1, "colSpan": 1},
            {"id": "ws2", "row": 3, "col": 2, "rowSpan": 1, "colSpan": 1},
            {"id": "ws3", "row": 3, "col": 3, "rowSpan": 1, "colSpan": 1},
            {"id": "ws4", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 4},
        ],
        "columns": 4,
    },
    {
        "id": "timeline-board",
        "name": "Timeline Board",
        "description": "Center event stream, side context, footer stats.",
        "slots": [
            {"id": "header", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 5},
            {"id": "left", "row": 2, "col": 1, "rowSpan": 2, "colSpan": 1},
            {"id": "center", "row": 2, "col": 2, "rowSpan": 2, "colSpan": 3},
            {"id": "right", "row": 2, "col": 5, "rowSpan": 2, "colSpan": 1},
            {"id": "footer", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 5},
        ],
        "columns": 5,
    },
    {
        "id": "two-column",
        "name": "Two-Column Command",
        "description": "Wide analysis column + narrow support rail.",
        "slots": [
            {"id": "header", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 4},
            {"id": "kpi-row", "row": 2, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "main-chart", "row": 3, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "main-row1", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "main-row2", "row": 5, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "rail1", "row": 2, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "rail2", "row": 3, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "rail3", "row": 4, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "rail4", "row": 5, "col": 4, "rowSpan": 1, "colSpan": 1},
        ],
        "columns": 4,
    },
]


@app.get("/api/layouts")
async def list_layouts():
    """Return all available layout patterns."""
    return LAYOUTS


# ── Static files (after API routes) ────────────────────────────────────────
_static = Path(__file__).resolve().parent.parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="static")
