# ddash

A single-pane system monitoring dashboard — a web-based view into all the relevant metrics you keep track of while using your computer.

## Status

**v2.0-alpha** — Backend API complete, frontend pending.

- Backend: 12 monitoring modules, 6 layout patterns, full test suite
- Frontend: not yet started (planned for next phase)
- TDD approach: tests written first, implementation follows

## Architecture

```
ddash/
├── backend/
│   └── main.py          # FastAPI app + module registry + layout definitions
├── static/              # Frontend (v2.0 — not yet built)
├── tests/
│   ├── conftest.py      # pytest config
│   └── test_api.py      # 16 API contract tests (15 pass, 1 skipped)
├── archive/v0.1/        # Original v1.0 code (preserved for reference)
├── config.json          # ABS token, weather city, etc.
└── README.md
```

## Modules (12)

| Module | Data | Category |
|--------|------|----------|
| CPU | usage %, user/sys, cores, freq, load | system |
| GPU | utilization, temp, power, VRAM (nvidia-smi) | system |
| Memory | RAM + swap percent/used/total | system |
| Network | RX/TX rates + totals | system |
| Temps | all hardware sensor readings | system |
| Disks | per-mount usage bars | system |
| Docker | container status | system |
| Now Playing | MPRIS + Audiobookshelf | media |
| Journal | journalctl tail (ERR/WARN colored) | logs |
| Connections | active network connections | network |
| Uptime / Load | uptime, load averages, boot time | system |
| Interfaces | NIC status, IPs, speed | network |

## Layouts (6)

Each layout defines a grid with named slots that modules can be assigned to:

1. **Sidebar Stack** — persistent left nav, KPI strip, stacked content
2. **Bento Grid** — mixed card sizes, modular rows
3. **Center Spotlight** — one dominant panel, side rails
4. **Tabbed Workspace** — category tabs, each with own canvas
5. **Timeline Board** — center event stream, side context, footer stats
6. **Two-Column Command** — wide analysis + narrow support rail

## API

```
GET /api/health          → { status, version, modules }
GET /api/modules         → [{ id, title, icon, category }, ...]
GET /api/module/{id}     → { id, data: {...} }
GET /api/all             → { modules: { id: data, ... }, timestamp }
GET /api/stream          → SSE (text/event-stream)
GET /api/layouts         → [{ id, name, description, slots, columns }, ...]
```

## Quick Start

```bash
# Clone
git clone git@github.com:jsalk/ddash.git
cd ddash

# Backend
python3 -m venv .venv
.venv/bin/pip install fastapi uvicorn psutil requests
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 9000

# Tests
.venv/bin/pip install pytest httpx anyio
.venv/bin/pytest tests/ -v
```

## History

- **v0.1** — Original terminal-style dashboard (single HTML file)
- **v1.0** — AdminLTE-based rebuild with themes, edit mode, layout workspace
- **v2.0** — Clean rebuild with modular backend, 6 layout patterns, TDD

## Tech Stack

- **Backend:** Python 3.14, FastAPI, psutil, nvidia-smi, playerctl
- **Frontend:** vanilla JS, CSS custom properties (planned)
- **Tests:** pytest, httpx, anyio
- **Auth:** SSH (GitHub: jsalk)

## License

Personal project — not published.
