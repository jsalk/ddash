"""
ddash v2.0 — Backend API (refactored)

Thin app shell — modules and layouts are imported, not defined here.
Run: uvicorn backend.main:app --host 0.0.0.0 --port 9000
"""
import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Import module collectors (registration happens on import)
from backend.modules import registry
from backend.modules import system, network, media, logs  # noqa: F401
from backend.layouts import LAYOUTS
from backend.config import Config

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ddash")

app = FastAPI(title="ddash", version="2.0.0")
_config = Config.load()


# ── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "modules": len(registry.all())}


@app.get("/api/modules")
async def list_modules():
    """Return registry of all available modules."""
    return registry.list_meta()


@app.get("/api/module/{module_id}")
async def get_module(module_id: str):
    """Return data for a single module."""
    if registry.get(module_id) is None:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")
    data = await asyncio.to_thread(registry.collect, module_id)
    return {"id": module_id, "data": data}


@app.get("/api/all")
async def get_all():
    """Return data for all modules."""
    results = await asyncio.to_thread(registry.collect_all)
    return {"modules": results, "timestamp": datetime.now().isoformat()}


@app.get("/api/stream")
async def stream(interval: int = 2):
    """SSE endpoint — pushes /api/all every `interval` seconds."""
    interval = max(1, min(60, interval))

    async def gen():
        while True:
            try:
                data = await get_all()
                yield f"data: {json.dumps(data)}\n\n"
            except Exception:
                log.exception("SSE stream error — sending error event")
                yield f"event: error\ndata: {json.dumps({'error': 'collection failed'})}\n\n"
            await asyncio.sleep(interval)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/layouts")
async def list_layouts():
    """Return all available layout patterns."""
    return LAYOUTS


@app.post("/api/layouts")
async def save_layout(request: Request):
    """Accept a layout update from the editor."""
    try:
        data = await request.json()
        layout_id = data.get("id")
        if not layout_id:
            raise HTTPException(status_code=400, detail="Missing layout 'id'")
        # Find and update the matching layout
        for layout in LAYOUTS:
            if layout["id"] == layout_id:
                layout["columns"] = data.get("cols", layout.get("columns", 4))
                layout["slots"] = _elements_to_slots(data.get("elements", []), layout.get("columns", 4))
                log.info("Layout '%s' updated via editor", layout_id)
                return {"status": "ok", "id": layout_id}
        raise HTTPException(status_code=404, detail=f"Layout '{layout_id}' not found")
    except HTTPException:
        raise
    except Exception:
        log.exception("Failed to save layout")
        raise HTTPException(status_code=400, detail="Invalid layout data")


def _elements_to_slots(elements: list[dict], columns: int) -> list[dict]:
    """Convert editor element format to backend slot format."""
    slots = []
    for el in elements:
        if el.get("type") in ("blank", "text", "separator-h", "separator-v"):
            continue
        slots.append({
            "id": el["type"],
            "row": el.get("row", 1),
            "col": el.get("col", 1),
            "rowSpan": el.get("rowSpan", 1),
            "colSpan": el.get("colSpan", 1),
        })
    return slots


@app.get("/api/config")
async def get_config():
    """Return non-secret config values for the frontend."""
    return {
        "weather_city": _config.weather_city,
        "refresh_interval": _config.refresh_interval,
    }


# ── Static files (after API routes) ────────────────────────────────────────
_static = Path(__file__).resolve().parent.parent / "static"
if not _static.exists():
    log.warning("Static directory not found at %s — frontend will 404", _static)
else:
    app.mount("/static", StaticFiles(directory=str(_static)), name="static")

# Serve index.html at root
@app.get("/")
async def root():
    return FileResponse(str(_static / "index.html"), media_type="text/html")


@app.get("/editor")
async def editor():
    return FileResponse(str(_static / "editor.html"), media_type="text/html")
