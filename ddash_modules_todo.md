# ddash — Remaining Module Ideas

## Not Yet Implemented

6. **DNS Queries** — recent DNS activity (if dnsmasq/unbound logging)
7. **Package Updates** — available apt/dnf updates
8. **Cron Jobs** — upcoming scheduled tasks
9. **Git Activity** — recent commits across repos
10. **File Watchers** — recently modified files in key directories
11. **Container Logs** — last N lines per container (docker logs)
12. **Container Stats** — CPU/MEM per container (docker stats)
13. **GPU Processes** — which apps are using the GPU (nvidia-smi)
14. **SMART Status** — disk health (smartctl)
15. **Fan Speeds** — all fan RPMs (sensors)
16. **Bandwidth Per Interface** — per-NIC traffic (enp12s0, tailscale0)
17. **Speed Test** — periodic speedtest results

## Potential v1.2+ Features

- Custom widget API (user-defined data sources)
- Dashboard export/import (JSON layout snapshot)
- Notification alerts (threshold-based, e.g. temp > 80°C)
- Multi-monitor support (different layouts per screen)
- Dark/light theme toggle (auto based on system preference)
