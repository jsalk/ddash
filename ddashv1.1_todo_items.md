# ddash v1.1 — Todo Items

## Priority 1 — High (core functionality broken) ✅ DONE

1. ~~**Reset layout should respect current mode**~~ ✅ — Reset now keeps current layoutMode (Grid/Rails), only clears positions/sizes/modules.

## Priority 2 — Medium (UX improvements) ✅ DONE

2. ~~**Add play/pause to Journal and Connections**~~ ✅ — Toggle button pauses/resumes auto-scroll. Each module independent. Visual: ⏸/▶ icon, yellow when paused.

3. ~~**Temps as bar graph**~~ ✅ — Horizontal bars, 0-100°C scale, color coded (green <50, yellow 50-75, red >75). Sensor name left, value right.

4. ~~**Uptime/Load line graph**~~ ✅ — Rolling Chart.js line chart for load 1m. X axis: time, Y axis: load. Overlay with uptime, load 1m/5m/15m, boot date.

## Priority 3 — Medium-Low (layout workspace overhaul)

5. **Layout workspace — full placement control** — Currently the workspace only swaps module positions. Needs to support:
   - Place a module above/below any existing module (insert, not just swap)
   - Resize modules in both height and width via controls
   - Move any module to any grid position freely
   - No snap-to-edge requirement — modules can overlap or leave gaps
   - Visual feedback: show grid lines, highlight drop target
   - "Add row" / "Add column" buttons to expand the workspace grid
   - "Delete row" / "Delete column" to contract

## Notes

- All fixes should be tested on both desktop and mobile viewports
- Maintain backward compatibility with existing localStorage data
- Each fix should be independently testable
