# ddash

A single-pane system monitoring dashboard — a web-based view into all the relevant metrics you keep track of while using your computer.

## Status

**v2.0-beta** — Backend + Frontend + Layout Editor complete.

- Backend: 12 monitoring modules, 6 layout patterns, full test suite
- Frontend: layout engine, live SSE data, module renderers, settings
- Layout Editor: drag-move, drag-resize, undo/redo, save/load JSON, preview
- TDD approach: tests written first, implementation follows

## Architecture

```
ddash/
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── config.py            # Config dataclass + loader
│   ├── layouts.py           # 6 layout pattern definitions
│   └── modules/
│       ├── __init__.py      # Registry class + Module dataclass
│       ├── system.py        # CPU, GPU, Memory, Disks, Uptime, Temps
│       ├── network.py       # Network, Connections, Interfaces
│       ├── media.py         # Now Playing (MPRIS + Audiobookshelf)
│       └── logs.py          # Docker, Journal
├── static/
│   ├── index.html           # Dashboard frontend
│   ├── editor.html          # Layout editor
│   ├── css/
│   │   ├── base.css         # Dashboard styles
│   │   ├── modules.css      # Module-specific styles
│   │   ├── menu.css         # Settings panel styles
│   │   └── editor.css       # Editor styles (showcase-matched)
│   └── js/
│       ├── app.js           # Dashboard frontend logic
│       └── editor.js        # Layout editor engine
├── tests/
│   ├── conftest.py          # pytest config
│   └── test_api.py          # 16 API contract tests
├── archive/v0.1/            # Original v1.0 code
├── config.json              # ABS token, weather city
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

Each layout has default slots pre-assigned with the 7 core modules (CPU, GPU, Memory, Network, Temps, Journal, Connections):

1. **Sidebar Stack** — CPU nav rail, KPI strip, stacked content
2. **Bento Grid** — CPU hero, mixed card sizes
3. **Center Spotlight** — Journal center stage, side rails
4. **Tabbed Workspace** — grouped by category
5. **Timeline Board** — Journal event stream, side context
6. **Two-Column Command** — wide analysis + narrow rail

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

# Dashboard: http://localhost:9000
# Layout Editor: http://localhost:9000/editor

# Tests
.venv/bin/pip install pytest httpx anyio
.venv/bin/pytest tests/ -v
```

## Layout Editor

The editor (http://localhost:9000/editor) provides:

- **6 preset layouts** loaded from defaults
- **Drag from palette** to add modules/structure to canvas
- **Drag to move** elements within the grid
- **Drag resize handles** (edges + corner) to resize
- **Module type dropdown** in properties panel
- **Structural elements**: blank, text block, H/V separators
- **Undo/redo** (Ctrl+Z / Ctrl+Y, 50 levels)
- **Save/load** layout as JSON
- **Preview mode** to see the result
- **Reset button** with confirmation (single layout or all)
- **Auto-save** to localStorage on every change

## History

- **v0.1** — Original terminal-style dashboard (single HTML file)
- **v1.0** — AdminLTE-based rebuild with themes, edit mode, layout workspace
- **v2.0** — Clean rebuild: modular backend, 6 layouts, layout editor, TDD

## Tech Stack

- **Backend:** Python 3.14, FastAPI, psutil, nvidia-smi, playerctl
- **Frontend:** vanilla JS, CSS custom properties, Font Awesome
- **Tests:** pytest, httpx, anyio
- **Auth:** SSH (GitHub: jsalk)

## License

Personal project — not published.
