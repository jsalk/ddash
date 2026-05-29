"""
ddash v2.0 — Backend API (refactored)

Thin app shell — modules and layouts are imported, not defined here.
Run: uvicorn backend.main:app --host 0.0.0.0 --port 9000
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from starlette.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Import module collectors (registration happens on import)
from backend.modules import registry
from backend.modules import system, network, media, logs  # noqa: F401
from backend.layouts import LAYOUTS

app = FastAPI(title="ddash", version="2.0.0")


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
            data = await get_all()
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(interval)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/layouts")
async def list_layouts():
    """Return all available layout patterns."""
    return LAYOUTS


# ── Static files (after API routes) ────────────────────────────────────────
_static = Path(__file__).resolve().parent.parent / "static"
if _static.exists():
    app.mount("/static", StaticFiles(directory=str(_static)), name="static")

# Serve index.html at root
@app.get("/")
async def root():
    return FileResponse(str(_static / "index.html"), media_type="text/html")


@app.get("/editor")
async def editor():
    return FileResponse(str(_static / "editor.html"), media_type="text/html")
