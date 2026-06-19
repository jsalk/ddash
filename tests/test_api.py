"""
ddash v2.0 — API Contract Tests

Run: .venv/bin/pytest tests/ -v
"""
import json
import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── Module Registry ────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_modules_list_returns_array(client):
    """GET /api/modules must return a list of module definitions."""
    r = await client.get("/api/modules")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.anyio
async def test_module_has_required_fields(client):
    """Each module must have: id, title, icon, category."""
    r = await client.get("/api/modules")
    for mod in r.json():
        assert "id" in mod, f"Module missing 'id': {mod}"
        assert "title" in mod, f"Module missing 'title': {mod}"
        assert "icon" in mod, f"Module missing 'icon': {mod}"
        assert "category" in mod, f"Module missing 'category': {mod}"


@pytest.mark.anyio
async def test_module_ids_are_unique(client):
    """No two modules can share the same id."""
    r = await client.get("/api/modules")
    ids = [m["id"] for m in r.json()]
    assert len(ids) == len(set(ids)), f"Duplicate module IDs: {ids}"


@pytest.mark.anyio
async def test_known_modules_exist(client):
    """Core modules must be registered."""
    r = await client.get("/api/modules")
    ids = {m["id"] for m in r.json()}
    required = {"cpu", "gpu", "memory", "network", "temps", "nowplaying", "disks"}
    missing = required - ids
    assert not missing, f"Missing required modules: {missing}"


# ── Module Data ────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_module_data_returns_object(client):
    """GET /api/module/{id} must return a JSON object with 'id' and 'data'."""
    r = await client.get("/api/module/cpu")
    assert r.status_code == 200
    body = r.json()
    assert "id" in body
    assert body["id"] == "cpu"
    assert "data" in body
    assert isinstance(body["data"], dict)


@pytest.mark.anyio
async def test_module_data_cpu_has_fields(client):
    """CPU module data must include percent, user, sys, cores, freq."""
    r = await client.get("/api/module/cpu")
    d = r.json()["data"]
    for key in ["percent", "user", "sys", "cores", "freq"]:
        assert key in d, f"CPU data missing '{key}'"


@pytest.mark.anyio
async def test_module_data_gpu_has_fields(client):
    """GPU module data must include name, utilization, temp, power."""
    r = await client.get("/api/module/gpu")
    d = r.json()["data"]
    for key in ["name", "utilization", "temp", "power"]:
        assert key in d, f"GPU data missing '{key}'"


@pytest.mark.anyio
async def test_module_data_memory_has_fields(client):
    """Memory module must include ram and swap with percent/used/total."""
    r = await client.get("/api/module/memory")
    d = r.json()["data"]
    assert "ram" in d
    assert "swap" in d
    for pool in [d["ram"], d["swap"]]:
        for key in ["percent", "used", "total"]:
            assert key in pool, f"Memory pool missing '{key}'"


@pytest.mark.anyio
async def test_unknown_module_returns_404(client):
    """Requesting a non-existent module must return 404."""
    r = await client.get("/api/module/nonexistent")
    assert r.status_code == 404


# ── All Data ───────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_all_returns_all_modules(client):
    """GET /api/all must return data for every registered module."""
    r = await client.get("/api/all")
    assert r.status_code == 200
    body = r.json()
    assert "modules" in body
    assert isinstance(body["modules"], dict)
    # Should have at least the core modules
    for mid in ["cpu", "gpu", "memory", "network", "temps"]:
        assert mid in body["modules"], f"Missing '{mid}' in /api/all"


# ── SSE Stream ─────────────────────────────────────────────────────────────

@pytest.mark.anyio
@pytest.mark.skip(reason="httpx async stream blocks on SSE — manual test required")
async def test_stream_returns_sse(client):
    """GET /api/stream must return text/event-stream with data events.
    Manual test: curl -N http://localhost:9000/api/stream?interval=1
    """


# ── Layouts ────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_layouts_list_returns_array(client):
    """GET /api/layouts must return a list of layout definitions."""
    r = await client.get("/api/layouts")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6, "Must have at least 6 layout patterns"


@pytest.mark.anyio
async def test_layout_has_required_fields(client):
    """Each layout must have: id, name, description, slots."""
    r = await client.get("/api/layouts")
    for layout in r.json():
        assert "id" in layout
        assert "name" in layout
        assert "description" in layout
        assert "slots" in layout
        assert isinstance(layout["slots"], list)


@pytest.mark.anyio
async def test_layout_slots_have_positions(client):
    """Each slot must define its grid position (row, col, span)."""
    r = await client.get("/api/layouts")
    for layout in r.json():
        for slot in layout["slots"]:
            assert "row" in slot, f"Slot in '{layout['id']}' missing 'row'"
            assert "col" in slot, f"Slot in '{layout['id']}' missing 'col'"
            assert "colSpan" in slot, f"Slot in '{layout['id']}' missing 'colSpan'"
            assert "rowSpan" in slot, f"Slot in '{layout['id']}' missing 'rowSpan'"


@pytest.mark.anyio
async def test_known_layouts_exist(client):
    """All 6 layout patterns must be registered."""
    r = await client.get("/api/layouts")
    ids = {l["id"] for l in r.json()}
    required = {"sidebar-stack", "bento-grid", "center-spotlight",
                "tabbed-workspace", "timeline-board", "two-column"}
    missing = required - ids
    assert not missing, f"Missing layouts: {missing}"


# ── Health ─────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_health(client):
    """GET /api/health must return 200 with status ok."""
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Config ─────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_config_returns_weather_city(client):
    """GET /api/config must return weather_city."""
    r = await client.get("/api/config")
    assert r.status_code == 200
    body = r.json()
    assert "weather_city" in body
    assert isinstance(body["weather_city"], str)
