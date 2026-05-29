# ddash — Completed Modules

## Implemented in v1.0

1. **CPU** — gauge, user/system/cores/freq/load, top processes list
2. **GPU** — gauge, name/temp/power/fan, VRAM bar
3. **Temps** — sensor badges (all hwmon readings)
4. **Memory** — RAM/Swap usage bars (split from memnet)
5. **Network** — RX/TX rates and totals (split from memnet)
6. **Now Playing** — MPRIS + Audiobookshelf, progress bar, source badge
7. **Disks** — per-mount usage bars
8. **Docker** — container status chips (optional, disabled by default)
9. **Journal** — journalctl tail, ERR/WARN colored, auto-scroll
10. **Connections** — active network connections, tail-style display
11. **Uptime / Load** — uptime, load averages, boot date, proc count
12. **Interfaces** — per-NIC status, speed bar, IP addresses, up/down LED

## Theme System

- Default (dark blue/gray)
- Cyberpunk 2077 (scanlines, glitch, angular clip-paths)
- OCP / RoboCop (CRT scanlines, Courier font, square corners, blinking cursor)
- Green Lantern (energy pulse, hexagonal docker chips, diamond temp badges)
- BTOP / ASCII Terminal (pure terminal, no backgrounds, monospace)

## Layout System

- Grid mode (flexbox rows, 2-col)
- Rails mode (left rail | center | right rail)
- Layout workspace modal (miniature grid editor)
- Module dropdowns in edit mode
- Red X remove buttons in edit mode
- Blank slot support
- Resize handles (flex-based)
- Dual-listbox module manager (Enabled/Disabled)
- Double-click to move between lists

## Data Sources

- Backend: FastAPI + psutil + nvidia-smi + playerctl + journalctl
- SSE streaming at configurable interval
- Browser geolocation for weather
- All settings persisted to localStorage
