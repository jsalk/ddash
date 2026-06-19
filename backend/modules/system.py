"""System modules: CPU, GPU, Memory, Disks, Uptime."""
import logging
import time
import subprocess
from datetime import datetime

import psutil

from backend.modules import registry

log = logging.getLogger(__name__)


@registry.register("cpu", "CPU", "fa-microchip", "system")
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


@registry.register("gpu", "GPU", "fa-display", "system")
def collect_gpu() -> dict:
    try:
        r = subprocess.run(
            ["nvidia-smi",
             "--query-gpu=name,utilization.gpu,temperature.gpu,power.draw,memory.used,memory.total",
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
    except FileNotFoundError:
        log.debug("nvidia-smi not found — GPU data unavailable")
    except subprocess.TimeoutExpired:
        log.warning("nvidia-smi timed out")
    except Exception:
        log.exception("GPU collector failed")
    return {"name": "N/A", "utilization": 0, "temp": 0, "power": 0, "vram_used": 0, "vram_total": 0}


@registry.register("memory", "Memory", "fa-memory", "system")
def collect_memory() -> dict:
    m = psutil.virtual_memory()
    s = psutil.swap_memory()
    return {
        "ram": {"percent": m.percent, "used": m.used, "total": m.total, "available": m.available},
        "swap": {"percent": s.percent, "used": s.used, "total": s.total},
    }


@registry.register("disks", "Disks", "fa-hard-drive", "system")
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
            log.debug("Permission denied for disk %s", part.mountpoint)
    return {"disks": disks}


@registry.register("uptime", "Uptime / Load", "fa-clock", "system")
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


@registry.register("temps", "Temps", "fa-thermometer-half", "system")
def collect_temps() -> dict:
    try:
        temps = psutil.sensors_temperatures()
        return {k: v[0].current for k, v in temps.items() if v}
    except Exception:
        log.exception("Temperature sensor read failed")
        return {}
