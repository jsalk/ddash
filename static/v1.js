/* ── ddash v1.0 — flexbox layout engine ─────────────────────────────────── */
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════════════
// MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
const MODULES = {
  cpu:     { title: 'CPU',     icon: 'fa-microchip',     defaultFlex: 1 },
  gpu:     { title: 'GPU',     icon: 'fa-display',       defaultFlex: 1 },
  temps:   { title: 'Temps',   icon: 'fa-thermometer-half', defaultFlex: 1 },
  memory:  { title: 'Memory',  icon: 'fa-memory',        defaultFlex: 1 },
  network: { title: 'Network', icon: 'fa-arrow-down-up', defaultFlex: 1 },
  nowplay: { title: 'Now Playing', icon: 'fa-play-circle', defaultFlex: 2 },
  disks:   { title: 'Disks',   icon: 'fa-hard-drive',    defaultFlex: 2 },
  docker:  { title: 'Docker',  icon: 'fa-docker',        defaultFlex: 2 },
  journal: { title: 'Journal', icon: 'fa-scroll',        defaultFlex: 1 },
  conns:   { title: 'Connections', icon: 'fa-network-wired', defaultFlex: 1 },
  uptime:  { title: 'Uptime / Load', icon: 'fa-clock',   defaultFlex: 1 },
  ifaces:  { title: 'Interfaces', icon: 'fa-ethernet',   defaultFlex: 1 },
};

const DEFAULT_LAYOUT = ['cpu', 'gpu', 'temps', 'memory', 'network', 'nowplay', 'disks', 'docker'];

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
const SK = 'ddash-v1-settings';
const defs = { theme: '', refresh: 2, tempUnit: 'F', clock24: true, weatherCity: 'Chicago', editMode: false, layout: null, modules: null, sizes: null, layoutMode: 'grid', rails: null };
let S = Object.assign({}, defs, JSON.parse(localStorage.getItem(SK) || '{}'));
if (S.layout && !Array.isArray(S.layout)) S.layout = [...DEFAULT_LAYOUT];
if (!S.layout) S.layout = [...DEFAULT_LAYOUT];
if (!S.modules) S.modules = {};
if (!S.sizes) S.sizes = {};
if (!S.rails) S.rails = { left: ['temps', 'uptime'], center: ['cpu', 'gpu', 'nowplay'], right: ['memory', 'network'] };
function save() { localStorage.setItem(SK, JSON.stringify(S)); }

function isEnabled(modId) { if (modId === '_blank') return true; return S.modules[modId] !== undefined ? S.modules[modId] : !['docker','journal','conns','uptime','ifaces'].includes(modId); }
function getFlex(modId) { return S.sizes?.[modId]?.flex || MODULES[modId]?.defaultFlex || 1; }
function setFlex(modId, flex) { if (!S.sizes) S.sizes = {}; if (!S.sizes[modId]) S.sizes[modId] = {}; S.sizes[modId].flex = Math.max(0.5, Math.min(4, flex)); save(); }

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function fmtB(b) { for (const u of ['B','KB','MB','GB','TB']) { if (Math.abs(b) < 1024) return b.toFixed(b < 10 ? 1 : 0) + ' ' + u; b /= 1024; } return b.toFixed(1) + ' PB'; }
function fmtR(b) { return fmtB(b) + '/s'; }
function fmtT(s) { s = Math.floor(s); const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60; return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}` : `${m}:${String(ss).padStart(2,'0')}`; }
function barC(p) { return p < 60 ? 'green' : p < 85 ? 'yellow' : 'red'; }
function tC(t) { return t > 80 ? 'hot' : t > 65 ? 'warm' : ''; }
function esc(s) { const e = document.createElement('span'); e.textContent = s; return e.innerHTML; }
function setGauge(ringId, pctId, pct) {
  const ring = $(ringId), text = $(pctId); if (!ring) return;
  const circ = 87.96;
  ring.style.strokeDashoffset = circ - (circ * Math.min(100, pct) / 100);
  ring.style.stroke = pct < 60 ? 'var(--green)' : pct < 85 ? 'var(--yellow)' : 'var(--red)';
  text.textContent = Math.round(pct) + '%';
}
function setBar(id, pct) { const b = $(id); if (!b) return; b.style.width = Math.min(100, pct) + '%'; b.className = 'bar-fill ' + barC(pct); }

// ═══════════════════════════════════════════════════════════════════════════
// MODULE HTML
// ═══════════════════════════════════════════════════════════════════════════
function moduleBody(id) {
  switch (id) {
    case 'cpu': return `<div class="sys-row"><div class="gauge-ring"><svg viewBox="0 0 36 36"><circle class="gauge-bg" cx="18" cy="18" r="14"></circle><circle class="gauge-fill" id="cpu-ring" cx="18" cy="18" r="14" stroke-dasharray="87.96" stroke-dashoffset="87.96"></circle></svg><div class="gauge-text" id="cpu-pct">0%</div></div><div style="flex:1"><div class="mrow"><span class="ml">User</span><span class="mv" id="cpu-user">--</span></div><div class="mrow"><span class="ml">System</span><span class="mv" id="cpu-sys">--</span></div><div class="mrow"><span class="ml">Cores</span><span class="mv" id="cpu-cores">--</span></div><div class="mrow"><span class="ml">Freq</span><span class="mv" id="cpu-freq">--</span></div><div class="mrow"><span class="ml">Load</span><span class="mv" id="cpu-load">--</span></div></div></div><div class="module-sub"><span class="dot"></span>Top Processes</div><div id="proc-list" style="font-size:10px;overflow:hidden"></div>`;
    case 'gpu': return `<div class="sys-row"><div class="gauge-ring"><svg viewBox="0 0 36 36"><circle class="gauge-bg" cx="18" cy="18" r="14"></circle><circle class="gauge-fill" id="gpu-ring" cx="18" cy="18" r="14" stroke-dasharray="87.96" stroke-dashoffset="87.96"></circle></svg><div class="gauge-text" id="gpu-pct">0%</div></div><div style="flex:1"><div class="mrow"><span class="ml">Name</span><span class="mv" id="gpu-name">--</span></div><div class="mrow"><span class="ml">Temp</span><span class="mv" id="gpu-temp">--</span></div><div class="mrow"><span class="ml">Power</span><span class="mv" id="gpu-power">--</span></div><div class="mrow"><span class="ml">Fan</span><span class="mv" id="gpu-fan">--</span></div></div></div><div class="bar-label"><span class="ml">VRAM</span><span class="mv" id="gpu-mem">--</span></div><div class="bar-track bar-lg"><div class="bar-fill accent" id="gpu-mem-bar" style="width:0%"></div></div>`;
    case 'temps': return `<div id="temp-bars" style="display:flex;flex-direction:column;gap:3px;flex:1;overflow:hidden"></div>`;
    case 'memory': return `<div class="bar-label"><span>RAM</span><span id="mem-pct">--</span></div><div class="bar-track bar-lg"><div class="bar-fill" id="mem-bar" style="width:0%"></div></div><div class="bar-label sub"><span id="mem-detail">-- / --</span><span id="mem-avail">avail --</span></div><div class="bar-label"><span>Swap</span><span id="swap-pct">--</span></div><div class="bar-track"><div class="bar-fill" id="swap-bar" style="width:0%"></div></div><div class="bar-label sub"><span id="swap-detail">-- / --</span></div>`;
    case 'network': return `<div class="net-row"><span class="net-arrow down">↓</span><span class="mv" id="net-rx">--</span></div><div class="net-row"><span class="net-arrow up">↑</span><span class="mv" id="net-tx">--</span></div><div class="bar-label sub"><span>RX: <span id="net-rx-total">--</span></span><span>TX: <span id="net-tx-total">--</span></span></div>`;
    case 'nowplay': return `<div class="np-content" id="media-content"><span class="np-idle">No media playing</span></div>`;
    case 'disks': return `<div id="disk-bars" class="temp-grid" style="gap:6px"></div>`;
    case 'docker': return `<div id="docker-chips" class="temp-grid" style="gap:4px"></div>`;
    case 'journal': return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px"><span class="tail-status" data-tail="journal" style="font-size:8px;color:var(--green)">● LIVE</span><button class="tail-toggle" data-tail="journal" title="Pause/Resume">⏸</button></div><div id="journal-entries" style="font-size:10px;overflow-y:auto;flex:1;font-family:inherit;line-height:1.4"></div>`;
    case 'conns': return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px"><span class="tail-status" data-tail="conns" style="font-size:8px;color:var(--green)">● LIVE</span><button class="tail-toggle" data-tail="conns" title="Pause/Resume">⏸</button></div><div id="conn-list" style="font-size:10px;overflow-y:auto;flex:1;font-family:inherit;line-height:1.4"></div>`;
    case 'uptime': return `<div style="position:relative;flex:1;min-height:120px"><canvas id="uptime-chart" style="width:100%;height:100%"></canvas><div id="uptime-overlay" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border-radius:3px;padding:4px 6px;font-size:9px;line-height:1.4"></div></div>`;
    case 'ifaces': return `<div id="iface-list" style="font-size:10px;overflow:hidden;flex:1"></div>`;
    default: return '';
  }
}

function makeModule(id, idx) {
  const m = MODULES[id];
  const flex = getFlex(id);
  const handles = ['n','s','e','w','ne','nw','se','sw'].map(d => `<div class="resize-handle resize-${d}" data-dir="${d}"></div>`).join('');
  const opts = Object.entries(MODULES).map(([mid, mm]) => `<option value="${mid}" ${mid === id ? 'selected' : ''}>${mm.title}</option>`).join('');
  return `<div class="module" data-module="${id}" data-idx="${idx}">
    <div class="module-head">
      <span class="dot"></span>
      <select class="mod-select" data-idx="${idx}" ${S.editMode ? '' : 'disabled'}>${opts}</select>
    </div>
    <div class="module-body">${moduleBody(id)}</div>
    ${handles}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER GRID — flexbox rows
// ═══════════════════════════════════════════════════════════════════════════
const main = $('dash-main');
const tailPaused = { journal: false, conns: false };
const tailBuffer = { journal: [], conns: [] };
const tailReplay = { journal: false, conns: false };
const tailSeen = { journal: new Set(), conns: new Set() };
const tailPendingNew = { journal: [], conns: [] }; // new entries arriving during replay
const TAIL_HISTORY = 500;

function replayTail(tail) {
  tailReplay[tail] = true;
  const elId = tail === 'journal' ? 'journal-entries' : 'conn-list';
  const el = $(elId);

  // If buffer has items, append one
  if (tailBuffer[tail].length > 0) {
    const item = tailBuffer[tail].shift();
    el.insertAdjacentHTML('beforeend', item);
    while (el.children.length > TAIL_HISTORY) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
    if (!tailPaused[tail]) {
      setTimeout(() => replayTail(tail), 80);
    } else {
      tailReplay[tail] = false;
    }
  } else {
    // Buffer empty — check if there are new unseen entries to append
    const lastSeen = [...tailSeen[tail]].pop();
    const newEntries = tailPendingNew[tail] || [];
    if (newEntries.length > 0) {
      // Append new entries one at a time
      const item = newEntries.shift();
      tailPendingNew[tail] = newEntries;
      el.insertAdjacentHTML('beforeend', item);
      while (el.children.length > TAIL_HISTORY) el.removeChild(el.firstChild);
      el.scrollTop = el.scrollHeight;
      if (!tailPaused[tail]) {
        setTimeout(() => replayTail(tail), 80);
      } else {
        tailReplay[tail] = false;
      }
    } else {
      // Fully caught up — switch to live mode
      tailReplay[tail] = false;
      tailPendingNew[tail] = [];
    }
  }
}

function renderTailEntry(type, entry) {
  if (type === 'journal') {
    const color = entry.level === 'error' ? 'var(--red)' : entry.level === 'warn' ? 'var(--yellow)' : 'var(--text-dim)';
    const tag = entry.level === 'error' ? ' ERR ' : entry.level === 'warn' ? 'WARN ' : '     ';
    return `<div style="white-space:pre;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--border);padding:1px 0"><span style="color:var(--text-dim)">${entry.time}</span> <span style="color:${color};font-weight:${entry.level==='error'?'700':'400'}">${tag}</span><span style="color:${entry.level==='info'?'var(--text)':'inherit'}">${esc(entry.msg)}</span></div>`;
  } else {
    const isOpen = entry.event === 'open';
    const isClose = entry.event === 'close';
    const color = isClose ? 'var(--red)' : entry.status === 'ESTABLISHED' ? 'var(--green)' : 'var(--text-dim)';
    const tag = isClose ? 'CLOSE' : isOpen ? 'OPEN ' : entry.status === 'ESTABLISHED' ? 'EST ' : entry.status.substring(0, 4).padEnd(4);
    return `<div style="white-space:pre;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--border);padding:1px 0"><span style="color:var(--text-dim)">${entry.time || ''}</span> <span style="color:${color};font-weight:${isClose?'700':'400'}">${tag}</span><span style="color:var(--text-dim)">${entry.proto.padEnd(3)}</span> <span style="color:var(--text)">${esc(entry.raddr || '--')}</span></div>`;
  }
}

function updateTail(type, el, entries, keyFn) {
  if (!el || !entries || entries.length === 0) return;

  if (tailReplay[type]) {
    // During replay: collect new unseen entries for the replay to consume
    for (const entry of entries) {
      const k = keyFn(entry);
      if (!tailSeen[type].has(k)) {
        tailSeen[type].add(k);
        tailPendingNew[type].push(renderTailEntry(type, entry));
      }
    }
    return;
  }

  if (tailPaused[type]) {
    // Paused: buffer only NEW entries
    for (const entry of entries) {
      const k = keyFn(entry);
      if (!tailSeen[type].has(k)) {
        tailSeen[type].add(k);
        tailBuffer[type].push(renderTailEntry(type, entry));
      }
    }
    if (tailBuffer[type].length > TAIL_HISTORY * 2) {
      tailBuffer[type] = tailBuffer[type].slice(-TAIL_HISTORY);
    }
    return;
  }

  // Live: rebuild DOM, mark all as seen
  tailSeen[type].clear();
  tailPendingNew[type] = [];
  el.innerHTML = entries.map(e => {
    const k = keyFn(e);
    tailSeen[type].add(k);
    return renderTailEntry(type, e);
  }).join('');
  while (el.children.length > TAIL_HISTORY) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
  tailBuffer[type] = [];
}
const loadHistory = { labels: [], datasets: [{ data: [] }] }; // rolling load data
const LOAD_MAX = 30; // max data points
let uptimeChart = null;

function renderGrid() {
  const isBlank = id => id === '_blank';
  // Helper to build module HTML
  function modHtml(id, idx) {
    const flex = getFlex(id);
    const blank = isBlank(id);
    const opts = '<option value="_blank"' + (blank ? ' selected' : '') + '>&lt;blank&gt;</option>' +
      Object.entries(MODULES).map(([mid, mm]) => `<option value="${mid}" ${mid === id && !blank ? 'selected' : ''}>${mm.title}</option>`).join('');
    return `<div class="module${blank ? ' module-blank' : ''}" data-module="${id}" data-idx="${idx}" style="flex:${flex}">
      <div class="module-head"><span class="dot"></span>
        <select class="mod-select" data-idx="${idx}" ${S.editMode ? '' : 'disabled'}>${opts}</select>
        ${S.editMode ? `<button class="mod-remove" data-idx="${idx}" title="Remove">&times;</button>` : ''}
      </div>
      ${blank ? '<div class="module-body" style="display:flex;align-items:center;justify-content:center"><span style="color:var(--text-dim);font-size:10px;font-style:italic">empty slot</span></div>' : `<div class="module-body">${moduleBody(id)}</div>`}
      ${['n','s','e','w','ne','nw','se','sw'].map(d => `<div class="resize-handle resize-${d}" data-dir="${d}"></div>`).join('')}
    </div>`;
  }

  if (S.layoutMode === 'rails') {
    // Side-rail layout: left rail | center | right rail
    main.className = 'dash-main layout-rails';
    const r = S.rails;
    const railHtml = (ids) => ids.filter(id => isEnabled(id)).map((id, i) => modHtml(id, i)).join('');
    const leftHtml = railHtml(r.left);
    const rightHtml = railHtml(r.right);
    main.innerHTML = `
      ${leftHtml ? `<div class="rail-left">${leftHtml}</div>` : ''}
      <div class="rail-center">${railHtml(r.center)}</div>
      ${rightHtml ? `<div class="rail-right">${rightHtml}</div>` : ''}`;
  } else {
    // Standard flexbox rows
    main.className = 'dash-main';
    const layout = S.layout || [...DEFAULT_LAYOUT];
    const rows = [];
    let currentRow = [];
    let idx = 0;
    for (const modId of layout) {
      if (!isEnabled(modId)) continue;
      const flex = getFlex(modId);
      if (flex >= 2) {
        if (currentRow.length > 0) { rows.push(currentRow); currentRow = []; }
        rows.push([{ id: modId, idx }]);
      } else {
        currentRow.push({ id: modId, idx });
        if (currentRow.length === 2) { rows.push(currentRow); currentRow = []; }
      }
      idx++;
    }
    if (currentRow.length > 0) rows.push(currentRow);
    main.innerHTML = rows.map(row =>
      `<div class="dash-row${row.length === 1 ? ' row-auto' : ''}">${row.map(({ id, idx }) => modHtml(id, idx)).join('')}</div>`
    ).join('');
  }

  main.classList.toggle('edit-mode', S.editMode);

  // Wire select dropdowns
  main.querySelectorAll('.mod-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const newMod = sel.value;
      const mod = sel.closest('.module');
      const modId = mod.dataset.module;
      if (S.layoutMode === 'rails') {
        for (const rail of ['left', 'center', 'right']) {
          const ri = S.rails[rail].indexOf(modId);
          if (ri !== -1) { S.rails[rail][ri] = newMod; break; }
        }
      } else {
        const layout = S.layout || [...DEFAULT_LAYOUT];
        const li = layout.indexOf(modId);
        if (li !== -1) layout[li] = newMod;
      }
      if (newMod !== '_blank') S.modules[newMod] = true;
      save(); renderGrid(); renderModuleList(); if (lastData) update(lastData);
    });
  });

  // Wire remove buttons
  main.querySelectorAll('.mod-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      // Replace with blank
      if (S.layoutMode === 'rails') {
        let enabledIdx = 0;
        for (const rail of ['left', 'center', 'right']) {
          for (let i = 0; i < S.rails[rail].length; i++) {
            if (isEnabled(S.rails[rail][i]) || S.rails[rail][i] === '_blank') {
              if (enabledIdx === idx) { S.rails[rail][i] = '_blank'; break; }
              enabledIdx++;
            }
          }
        }
      } else {
        const layout = S.layout || [...DEFAULT_LAYOUT];
        let enabledIdx = 0;
        for (let i = 0; i < layout.length; i++) {
          if (isEnabled(layout[i]) || layout[i] === '_blank') {
            if (enabledIdx === idx) { layout[i] = '_blank'; break; }
            enabledIdx++;
          }
        }
      }
      save(); renderGrid(); if (lastData) update(lastData);
    });
  });

  // Wire tail toggle buttons
  main.querySelectorAll('.tail-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const tail = btn.dataset.tail;
      tailPaused[tail] = !tailPaused[tail];
      btn.textContent = tailPaused[tail] ? '▶' : '⏸';
      btn.title = tailPaused[tail] ? 'Resume (replay backlog)' : 'Pause';
      btn.style.color = tailPaused[tail] ? 'var(--yellow)' : '';
      // Update LIVE/PAUSED indicator
      const statusEl = btn.parentElement.querySelector('.tail-status');
      if (statusEl) {
        statusEl.textContent = tailPaused[tail] ? '● PAUSED' : '● LIVE';
        statusEl.style.color = tailPaused[tail] ? 'var(--yellow)' : 'var(--green)';
      }
      if (!tailPaused[tail] && tailBuffer[tail].length > 0 && !tailReplay[tail]) {
        replayTail(tail);
      }
    });
    const tail = btn.dataset.tail;
    if (tailPaused[tail]) {
      btn.textContent = '▶';
      btn.title = 'Resume (replay backlog)';
      btn.style.color = 'var(--yellow)';
      const statusEl = btn.parentElement.querySelector('.tail-status');
      if (statusEl) { statusEl.textContent = '● PAUSED'; statusEl.style.color = 'var(--yellow)'; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE LIST — dual-listbox with double-click
// ═══════════════════════════════════════════════════════════════════════════
function renderModuleList() {
  const list = $('module-list');
  // Show ALL modules in the list, not just layout ones
  const enabled = [], disabled = [];
  for (const [id, m] of Object.entries(MODULES)) {
    (isEnabled(id) ? enabled : disabled).push({ id, ...m });
  }

  list.innerHTML = `
    <div class="dual-list">
      <div class="dual-col">
        <div class="dual-header">Enabled</div>
        <div class="dual-select" id="mod-enabled" data-list="enabled">
          ${enabled.map(m => `<div class="dual-opt" draggable="true" data-mod="${m.id}"><i class="fas ${m.icon}"></i> ${m.title}</div>`).join('')}
        </div>
      </div>
      <div class="dual-arrows">
        <button class="arrow-btn" id="arrow-to-disabled" title="Disable">&gt;</button>
        <button class="arrow-btn" id="arrow-to-enabled" title="Enable">&lt;</button>
      </div>
      <div class="dual-col">
        <div class="dual-header">Disabled</div>
        <div class="dual-select" id="mod-disabled" data-list="disabled">
          ${disabled.map(m => `<div class="dual-opt" draggable="true" data-mod="${m.id}"><i class="fas ${m.icon}"></i> ${m.title}</div>`).join('')}
          ${disabled.length === 0 ? '<div class="mod-empty">All active</div>' : ''}
        </div>
      </div>
    </div>`;

  // Arrow buttons
  function moveSelected(srcId, destId) {
    const enabling = destId === 'mod-enabled';
    $(srcId).querySelectorAll('.dual-opt.selected').forEach(opt => {
      const modId = opt.dataset.mod;
      S.modules[modId] = enabling;
      // Add to layout if enabling and not already there
      if (enabling) {
        const layout = S.layout || [...DEFAULT_LAYOUT];
        if (!layout.includes(modId)) layout.push(modId);
      }
    });
    save(); renderModuleList(); renderGrid(); if (lastData) update(lastData);
  }
  $('arrow-to-disabled').addEventListener('click', () => moveSelected('mod-enabled', 'mod-disabled'));
  $('arrow-to-enabled').addEventListener('click', () => moveSelected('mod-disabled', 'mod-enabled'));

  // Click to select
  list.querySelectorAll('.dual-opt').forEach(opt => {
    opt.addEventListener('click', e => {
      if (!e.ctrlKey && !e.metaKey) {
        opt.closest('.dual-select').querySelectorAll('.dual-opt').forEach(o => o.classList.remove('selected'));
      }
      opt.classList.toggle('selected');
    });
    // Double-click to move
    opt.addEventListener('dblclick', () => {
      const modId = opt.dataset.mod;
      const isCurrentlyEnabled = isEnabled(modId);
      S.modules[modId] = !isCurrentlyEnabled;
      // Add to layout if enabling
      if (!isCurrentlyEnabled) {
        const layout = S.layout || [...DEFAULT_LAYOUT];
        if (!layout.includes(modId)) layout.push(modId);
      }
      save(); renderModuleList(); renderGrid(); if (lastData) update(lastData);
    });
  });

  // Drag between lists
  list.querySelectorAll('.dual-opt').forEach(opt => {
    opt.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', opt.dataset.mod); e.dataTransfer.effectAllowed = 'move'; opt.classList.add('dragging'); });
    opt.addEventListener('dragend', () => opt.classList.remove('dragging'));
  });
  list.querySelectorAll('.dual-select').forEach(sel => {
    sel.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; sel.classList.add('drag-over'); });
    sel.addEventListener('dragleave', () => sel.classList.remove('drag-over'));
    sel.addEventListener('drop', e => {
      e.preventDefault(); sel.classList.remove('drag-over');
      const modId = e.dataTransfer.getData('text/plain');
      if (!modId) return;
      const enabling = sel.dataset.list === 'enabled';
      S.modules[modId] = enabling;
      if (enabling) {
        const layout = S.layout || [...DEFAULT_LAYOUT];
        if (!layout.includes(modId)) layout.push(modId);
      }
      save(); renderModuleList(); renderGrid(); if (lastData) update(lastData);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RESIZE — change flex value (no drag-to-move)
// ═══════════════════════════════════════════════════════════════════════════
let resizeState = null;

main.addEventListener('mousedown', e => {
  const handle = e.target.closest('.resize-handle');
  if (!handle || !S.editMode) return;
  e.preventDefault();
  e.stopPropagation();
  const mod = handle.closest('.module');
  const modId = mod.dataset.module;
  const dir = handle.dataset.dir;
  const startFlex = getFlex(modId);

  resizeState = { mod, modId, dir, startX: e.clientX, startY: e.clientY, startFlex };
  document.body.style.cursor = handle.style.cursor;
});

document.addEventListener('mousemove', e => {
  if (!resizeState) return;
  const { mod, modId, dir, startX, startY, startFlex } = resizeState;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const mainWidth = main.offsetWidth;

  let newFlex = startFlex;

  // Horizontal: drag right = bigger, left = smaller
  if (dir.includes('e') || dir.includes('w')) {
    const delta = dx / mainWidth * 4; // normalize to ~0-1 range
    newFlex = dir.includes('e') ? startFlex + delta : startFlex - delta;
  }
  // Vertical: drag down = bigger, up = smaller
  if (dir.includes('s') || dir.includes('n')) {
    const delta = dy / 300; // rough scaling
    newFlex = dir.includes('s') ? startFlex + delta : startFlex - delta;
  }

  newFlex = Math.max(0.5, Math.min(4, newFlex));
  mod.style.flex = newFlex;
  resizeState.newFlex = newFlex;
});

document.addEventListener('mouseup', () => {
  if (resizeState && resizeState.newFlex !== undefined) {
    setFlex(resizeState.modId, resizeState.newFlex);
    renderGrid();
    if (lastData) update(lastData);
  }
  document.body.style.cursor = '';
  resizeState = null;
});

// ═══════════════════════════════════════════════════════════════════════════
// DATA UPDATE
// ═══════════════════════════════════════════════════════════════════════════
let lastData = null;

function update(d) {
  lastData = d;
  const sys = d.system;
  setGauge('cpu-ring', 'cpu-pct', sys.cpu_percent);
  if ($('cpu-user')) $('cpu-user').textContent = sys.cpu_user.toFixed(1) + '%';
  if ($('cpu-sys')) $('cpu-sys').textContent = sys.cpu_sys.toFixed(1) + '%';
  if ($('cpu-cores')) $('cpu-cores').textContent = sys.cpu_count;
  if ($('cpu-freq')) $('cpu-freq').textContent = sys.cpu_freq ? (sys.cpu_freq.current / 1000).toFixed(1) + ' GHz' : '--';
  if ($('cpu-load')) $('cpu-load').textContent = sys.load_avg.map(v => v.toFixed(2)).join(' ');
  if (d.gpu) {
    setGauge('gpu-ring', 'gpu-pct', d.gpu.gpu_util);
    if ($('gpu-name')) $('gpu-name').textContent = d.gpu.name.replace('NVIDIA GeForce ', '');
    if ($('gpu-temp')) $('gpu-temp').textContent = d.gpu.temp + '°C';
    if ($('gpu-power')) $('gpu-power').textContent = d.gpu.power_draw.toFixed(0) + 'W / ' + d.gpu.power_limit.toFixed(0) + 'W';
    if ($('gpu-fan')) $('gpu-fan').textContent = d.gpu.fan_speed >= 0 ? d.gpu.fan_speed.toFixed(0) + '%' : '--';
    if (d.gpu.mem_total && $('gpu-mem')) { $('gpu-mem').textContent = d.gpu.mem_used + '/' + d.gpu.mem_total + ' MB'; setBar('gpu-mem-bar', d.gpu.mem_used / d.gpu.mem_total * 100); }
  }
  setBar('mem-bar', sys.mem_percent);
  if ($('mem-pct')) $('mem-pct').textContent = sys.mem_percent.toFixed(1) + '%';
  if ($('mem-detail')) $('mem-detail').textContent = fmtB(sys.mem_used) + ' / ' + fmtB(sys.mem_total);
  if ($('mem-avail')) $('mem-avail').textContent = 'avail ' + fmtB(sys.mem_available);
  if (sys.swap_total > 0) { setBar('swap-bar', sys.swap_percent); if ($('swap-pct')) $('swap-pct').textContent = sys.swap_percent.toFixed(1) + '%'; if ($('swap-detail')) $('swap-detail').textContent = fmtB(sys.swap_used) + ' / ' + fmtB(sys.swap_total); }
  if ($('net-rx')) $('net-rx').textContent = fmtR(sys.rx_rate);
  if ($('net-tx')) $('net-tx').textContent = fmtR(sys.tx_rate);
  if ($('net-rx-total')) $('net-rx-total').textContent = fmtB(sys.rx_total);
  if ($('net-tx-total')) $('net-tx-total').textContent = fmtB(sys.tx_total);
  const u = sys.uptime, ud = Math.floor(u/86400), uh = Math.floor((u%86400)/3600), um = Math.floor((u%3600)/60);
  $('uptime-display').textContent = `up ${ud}d ${uh}h ${um}m`;
  // temps — bar graph
  const tEl = $('temp-bars');
  if (tEl) {
    const temps = sys.temps || {};
    const entries = Object.entries(temps);
    if (entries.length) {
      tEl.innerHTML = entries.map(([k, v]) => {
        const short = k.replace(/-.*/, '').replace(/_pci.*/, '');
        const pct = Math.min(100, (v / 100) * 100);
        const color = v > 75 ? 'var(--red)' : v > 50 ? 'var(--yellow)' : 'var(--green)';
        return `<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:9px;color:var(--text-dim);width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">${short}</span>
          <div style="flex:1;height:4px;background:var(--surface2);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 0.5s"></div>
          </div>
          <span style="font-size:9px;color:${color};width:30px;text-align:right;flex-shrink:0">${v}°</span>
        </div>`;
      }).join('');
    } else {
      tEl.innerHTML = '<span style="color:var(--text-dim);font-size:9px">No sensors</span>';
    }
  }
  const dEl = $('disk-bars');
  if (dEl) dEl.innerHTML = d.disks.map(dk => `<div class="disk-item"><div class="disk-mount">${dk.mount}</div><div class="bar-track"><div class="bar-fill ${barC(dk.percent)}" style="width:${dk.percent}%"></div></div><div class="disk-info"><span>${fmtB(dk.used)}</span><span>${dk.percent}%</span></div></div>`).join('');
  const dcEl = $('docker-chips');
  if (dcEl) dcEl.innerHTML = d.docker.length === 0 ? '<span style="color:var(--text-dim);font-size:9px">no containers</span>' : d.docker.map(c => `<div class="docker-chip"><span class="status-dot ${c.state}"></span>${c.name}</div>`).join('');
  const m = d.media, mc = $('media-content');
  if (mc) {
    if (m) {
      const pct = m.dur > 0 ? Math.min(100, (m.pos / m.dur) * 100) : 0;
      const icon = m.status === 'Playing' ? 'fa-pause' : 'fa-play';
      const color = m.status === 'Playing' ? 'var(--green)' : 'var(--yellow)';
      mc.innerHTML = `<i class="fas ${icon} np-icon" style="color:${color}"></i><span class="np-badge">${m.source}</span><span class="np-info">${esc(m.artist ? m.artist + ' — ' + m.title : m.title)}</span><div class="np-progress"><span class="np-time">${fmtT(m.pos)}</span><div class="bar-track"><div class="bar-fill accent" style="width:${pct}%"></div></div><span class="np-time">${fmtT(m.dur)}</span></div>`;
    } else { mc.innerHTML = '<span class="np-idle">No media playing</span>'; }
  }
  // processes (in CPU module)
  const pl = $('proc-list');
  if (pl && d.processes) {
    pl.innerHTML = d.processes.slice(0, 6).map(p => {
      const cpuW = Math.min(100, p.cpu);
      return `<div class="mrow"><span class="ml" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(p.name)}">${esc(p.name)}</span><span class="mv" style="width:35px;text-align:right">${p.cpu.toFixed(0)}%</span></div>`;
    }).join('');
  }

  // journal — tail-style display
  const je = $('journal-entries');
  if (je && d.journal) {
    updateTail('journal', je, d.journal, e => e.time + e.msg);
  }

  // connections — tail-style display
  const cl = $('conn-list');
  if (cl && d.connections) {
    updateTail('conns', cl, d.connections, c => c.laddr + c.raddr + c.status);
  }

  // uptime / load — line graph + overlay
  const uo = $('uptime-overlay');
  const uc = $('uptime-chart');
  if (uo && d.system) {
    const u = d.system.uptime;
    const ud = Math.floor(u/86400), uh = Math.floor((u%86400)/3600), um = Math.floor((u%3600)/60);
    const la = d.system.load_avg;
    uo.innerHTML = `<div style="color:var(--text)">Up ${ud}d ${uh}h ${um}m</div>
      <div><span style="color:var(--text-dim)">1m</span> <span style="color:var(--text)">${la[0].toFixed(2)}</span></div>
      <div><span style="color:var(--text-dim)">5m</span> <span style="color:var(--text)">${la[1].toFixed(2)}</span></div>
      <div><span style="color:var(--text-dim)">15m</span> <span style="color:var(--text)">${la[2].toFixed(2)}</span></div>
      <div style="color:var(--text-dim)">${new Date((Date.now()/1000 - u) * 1000).toLocaleDateString()}</div>`;
    // Update load history
    const now = new Date();
    loadHistory.labels.push(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    loadHistory.datasets[0].data.push(la[0]);
    if (loadHistory.labels.length > LOAD_MAX) { loadHistory.labels.shift(); loadHistory.datasets[0].data.shift(); }
    // Create or update chart
    if (uc) {
      if (!uptimeChart) {
        uptimeChart = new Chart(uc, {
          type: 'line',
          data: { labels: loadHistory.labels, datasets: [{ ...loadHistory.datasets[0], borderColor: 'var(--green)', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.3 }] },
          options: { responsive: true, maintainAspectRatio: false, animation: { duration: 300 }, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { min: 0, ticks: { color: '#6b7280', font: { size: 9 } }, grid: { color: '#2a2d35' } } } }
        });
      } else {
        uptimeChart.data.labels = [...loadHistory.labels];
        uptimeChart.data.datasets[0].data = [...loadHistory.datasets[0].data];
        uptimeChart.update('none');
      }
    }
  }

  // interfaces — graphical display
  const il = $('iface-list');
  if (il && d.interfaces) {
    il.innerHTML = d.interfaces.map(iface => {
      const upColor = iface.up ? 'var(--green)' : 'var(--red)';
      const upIcon = iface.up ? '●' : '○';
      const speedBar = iface.speed ? Math.min(100, iface.speed / 10) : 0;
      const speedColor = iface.speed >= 1000 ? 'var(--green)' : iface.speed >= 100 ? 'var(--cyan)' : 'var(--text-dim)';
      const ipStr = iface.ips.map(ip => ip.address).join(' / ');
      return `<div style="border-bottom:1px solid var(--border);padding:4px 0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:${upColor};font-size:8px">${upIcon}</span>
          <span style="color:var(--text);font-weight:500;font-size:11px">${iface.name}</span>
          <span style="color:var(--text-dim);font-size:9px">${iface.speed ? iface.speed + ' Mb/s' : ''}</span>
        </div>
        ${iface.speed ? `<div class="bar-track" style="margin:2px 0"><div class="bar-fill" style="width:${speedBar}%;background:${speedColor}"></div></div>` : ''}
        <div style="font-size:9px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:14px" title="${ipStr}">${ipStr}</div>
      </div>`;
    }).join('');
  }

  const w = d.weather;
  if (w) { const tf = S.tempUnit === 'C' ? Math.round((w.temp_f - 32) * 5/9) : w.temp_f; $('w-display').innerHTML = `<i class="fas fa-cloud-sun"></i> ${tf}°${S.tempUnit} ${w.description}`; }
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT WORKSPACE — list-based with miniature preview
// ═══════════════════════════════════════════════════════════════════════════
// w values: 1 = quarter, 2 = half, 4 = full
let wsState = null;

function openWorkspace() {
  const layout = S.layout || [...DEFAULT_LAYOUT];
  const items = layout.map(id => ({
    id,
    w: getFlex(id) >= 4 ? 4 : getFlex(id) >= 2 ? 2 : 1,
  }));
  wsState = { items, dragIdx: null, dragOverIdx: null, resizing: null };
  $('ws-overlay').classList.add('open');
  renderWorkspace();
}

function renderWorkspace() {
  if (!wsState) return;
  const { items, dragIdx, dragOverIdx } = wsState;
  const canvas = $('ws-canvas');

  // ── Build miniature dashboard preview ──
  let previewHtml = '<div class="ws-preview">';
  let rowSlots = []; // current row's items
  const COLS = 4; // 4-column grid for quarter support

  function flushRow() {
    if (rowSlots.length === 0) return;
    const totalW = rowSlots.reduce((s, r) => s + r.w, 0);
    previewHtml += '<div class="ws-row">';
    for (const r of rowSlots) {
      const m = r.id !== '_blank' ? MODULES[r.id] : null;
      const isDrag = dragIdx === r.idx;
      const isTarget = dragOverIdx === r.idx && dragIdx !== null && dragIdx !== r.idx;
      const wClass = r.w >= 4 ? '' : r.w >= 2 ? ' half' : ' quarter';
      previewHtml += `<div class="ws-block${wClass}${isDrag ? ' dragging' : ''}${isTarget ? ' drag-target' : ''}" data-idx="${r.idx}" draggable="true" style="flex:${r.w}">
        <div class="ws-block-inner">
          ${m ? `<i class="fas ${m.icon}"></i> <span>${m.title}</span>` : '<span style="color:var(--text-dim)">blank</span>'}
        </div>
        <div class="ws-block-controls">
          <button class="ws-block-btn" data-action="w-cycle" title="Cycle width (quarter→half→full)">⊞</button>
          <button class="ws-block-btn ws-block-remove" data-action="remove" title="Remove">&times;</button>
        </div>
        <div class="ws-resize-handle ws-resize-e" data-idx="${r.idx}" data-dir="e"></div>
      </div>`;
    }
    previewHtml += '</div>';
    rowSlots = [];
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // If this item is full-width, flush any pending row first
    if (item.w >= 4) {
      flushRow();
      const m = item.id !== '_blank' ? MODULES[item.id] : null;
      const isDrag = dragIdx === i;
      const isTarget = dragOverIdx === i && dragIdx !== null && dragIdx !== i;
      previewHtml += `<div class="ws-row"><div class="ws-block full${isDrag ? ' dragging' : ''}${isTarget ? ' drag-target' : ''}" data-idx="${i}" draggable="true" style="flex:4">
        <div class="ws-block-inner">
          ${m ? `<i class="fas ${m.icon}"></i> <span>${m.title}</span>` : '<span style="color:var(--text-dim)">blank</span>'}
        </div>
        <div class="ws-block-controls">
          <button class="ws-block-btn" data-action="w-cycle" title="Cycle width">⊞</button>
          <button class="ws-block-btn ws-block-remove" data-action="remove" title="Remove">&times;</button>
        </div>
        <div class="ws-resize-handle ws-resize-e" data-idx="${i}" data-dir="e"></div>
      </div></div>`;
    } else {
      // Partial-width — add to current row
      rowSlots.push({ idx: i, id: item.id, w: item.w });
      // Flush if row is full (total width >= COLS)
      const totalW = rowSlots.reduce((s, r) => s + r.w, 0);
      if (totalW >= COLS) flushRow();
    }
  }
  flushRow(); // flush any remaining
  previewHtml += '</div>';

  // ── Build module list (for reordering) ──
  let listHtml = '<div class="ws-list">';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const m = item.id !== '_blank' ? MODULES[item.id] : null;
    const isTarget = dragOverIdx === i && dragIdx !== null && dragIdx !== i;
    const wLabel = item.w >= 4 ? 'full' : item.w >= 2 ? 'half' : 'quarter';
    // Build module options for select
    const modOpts = Object.entries(MODULES).map(([id, mod]) =>
      `<option value="${id}" ${id === item.id ? 'selected' : ''}>${mod.title}</option>`
    ).join('');
    listHtml += `<div class="ws-list-item${isTarget ? ' drag-target' : ''}" data-idx="${i}" draggable="true">
      <span class="ws-list-drag" title="Drag to reorder">⠿</span>
      <select class="ws-list-select" data-idx="${i}">${modOpts}<option value="_blank" ${item.id === '_blank' ? 'selected' : ''}>blank</option></select>
      <span class="ws-list-size">${wLabel}</span>
      <button class="ws-list-btn" data-action="w-cycle" title="Cycle width">⊞</button>
      <button class="ws-list-btn ws-list-remove" data-action="remove" title="Remove">&times;</button>
    </div>`;
  }
  listHtml += '</div>';

  canvas.innerHTML = `
    <div class="ws-preview-label">Preview</div>
    ${previewHtml}
    <div class="ws-preview-label">Modules (drag to reorder)</div>
    ${listHtml}
    <div style="margin-top:8px">
      <button class="ws-btn ws-add" id="ws-add-slot" style="width:100%">+ Add Blank Slot</button>
    </div>`;

  // ── Wire list drag-and-drop (insert) ──
  canvas.querySelectorAll('.ws-list-item').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.addEventListener('dragstart', e => {
      wsState.dragIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      wsState.dragIdx = null; wsState.dragOverIdx = null; renderWorkspace();
    });
    el.addEventListener('dragover', e => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      if (wsState.dragIdx !== null && wsState.dragIdx !== idx) {
        wsState.dragOverIdx = idx; renderWorkspace();
      }
    });
    el.addEventListener('dragleave', () => {
      if (wsState.dragOverIdx === idx) { wsState.dragOverIdx = null; renderWorkspace(); }
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      if (from === idx) return;
      const [moved] = wsState.items.splice(from, 1);
      wsState.items.splice(idx, 0, moved);
      wsState.dragIdx = null; wsState.dragOverIdx = null;
      renderWorkspace();
    });
  });

  // ── Wire module selector dropdowns ──
  canvas.querySelectorAll('.ws-list-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.idx);
      wsState.items[idx].id = sel.value;
      renderWorkspace();
    });
  });

  // ── Wire width cycle buttons ──
  canvas.querySelectorAll('[data-action="w-cycle"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const itemEl = btn.closest('[data-idx]');
      const idx = parseInt(itemEl.dataset.idx);
      const item = wsState.items[idx];
      // Cycle: quarter(1) → half(2) → full(4) → quarter(1)
      item.w = item.w >= 4 ? 1 : item.w * 2;
      renderWorkspace();
    });
  });

  // ── Wire remove buttons ──
  canvas.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const itemEl = btn.closest('[data-idx]');
      const idx = parseInt(itemEl.dataset.idx);
      wsState.items.splice(idx, 1);
      renderWorkspace();
    });
  });

  // ── Wire drag-to-resize handles ──
  canvas.querySelectorAll('.ws-resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const idx = parseInt(handle.dataset.idx);
      const item = wsState.items[idx];
      const startX = e.clientX;
      const startW = item.w;
      const canvasRect = canvas.getBoundingClientRect();
      const colWidth = canvasRect.width / 4; // width of one quarter-column

      const onMove = ev => {
        const dx = ev.clientX - startX;
        const dw = Math.round(dx / colWidth); // convert px to quarter-column units
        let newW = startW + dw;
        // Snap to 1, 2, or 4
        if (newW <= 1) newW = 1;
        else if (newW <= 2) newW = 2;
        else newW = 4;
        // Prevent overlap: check if new width would push into next module's space
        if (newW !== item.w) {
          item.w = newW;
          renderWorkspace();
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });

  // ── Wire add slot ──
  const addBtn = $('ws-add-slot');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      wsState.items.push({ id: '_blank', w: 2 });
      renderWorkspace();
    });
  }
}

function confirmWorkspace() {
  if (!wsState) return;
  const layout = wsState.items.map(i => i.id);
  S.layout = layout;
  for (const item of wsState.items) {
    if (item.id !== '_blank') setFlex(item.id, item.w);
  }
  save();
  $('ws-overlay').classList.remove('open');
  renderGrid(); renderModuleList(); if (lastData) update(lastData);
}

function cancelWorkspace() {
  $('ws-overlay').classList.remove('open');
  wsState = null;
}

$('layout-workspace-btn').addEventListener('click', openWorkspace);
$('ws-confirm').addEventListener('click', confirmWorkspace);
$('ws-cancel').addEventListener('click', cancelWorkspace);
$('ws-overlay').addEventListener('click', e => { if (e.target === $('ws-overlay')) cancelWorkspace(); });

// ═══════════════════════════════════════════════════════════════════════════
// CLOCK, SSE, THEME, EDIT, MENU
// ═══════════════════════════════════════════════════════════════════════════
function updateClock() { $('nav-clock').textContent = new Date().toLocaleTimeString('en-US', { hour12: !S.clock24 }); }
setInterval(updateClock, 1000); updateClock();

let sse = null, rt = null;
function connect() {
  if (sse) { sse.close(); sse = null; } clearTimeout(rt);
  sse = new EventSource('/api/stream?interval=' + S.refresh);
  sse.onopen = () => { $('conn-dot').className = 'conn-dot'; const m = $('menu-conn'); if (m) { m.textContent = 'Connected'; m.style.color = 'var(--green)'; } };
  sse.onmessage = (ev) => { try { update(JSON.parse(ev.data)); const l = $('menu-last'); if (l) l.textContent = new Date().toLocaleTimeString('en-US', { hour12: false }); } catch(e){} };
  sse.onerror = () => { sse.close(); sse = null; $('conn-dot').className = 'conn-dot off'; const m = $('menu-conn'); if (m) { m.textContent = 'Disconnected'; m.style.color = 'var(--red)'; } rt = setTimeout(connect, 3000); };
}
fetch('/api/all').then(r => r.json()).then(update).catch(() => {}); connect();

function setTheme(cls) {
  document.body.className = cls ? 'dark-mode ' + cls : 'dark-mode';
  if (S.editMode) document.body.classList.add('edit-mode');
  S.theme = cls; save();
  document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === cls));
}
$('theme-grid').addEventListener('click', e => { const b = e.target.closest('.theme-card'); if (b) setTheme(b.dataset.theme); });

const editToggle = $('edit-toggle'), editBadge = $('edit-badge');
function setEditMode(on) { S.editMode = on; save(); editToggle.classList.toggle('on', on); editBadge.classList.toggle('show', on); document.body.classList.toggle('edit-mode', on); renderGrid(); if (lastData) update(lastData); }
editToggle.addEventListener('click', () => setEditMode(!S.editMode));
function doReset() {
  S.layout = [...DEFAULT_LAYOUT]; S.modules = {}; S.sizes = {};
  S.rails = { left: ['temps', 'uptime'], center: ['cpu', 'gpu', 'nowplay'], right: ['memory', 'network'] };
  // Keep current layoutMode — don't force Grid
  save();
  renderGrid(); renderModuleList(); if (lastData) update(lastData);
  setEditMode(false);
  // Sync layout toggle UI
  document.querySelectorAll('#layout-opts .opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === S.layoutMode);
  });
}
$('layout-reset').addEventListener('click', doReset);

const fab = $('menu-fab'), panel = $('menu-panel'), overlay = $('menu-overlay');
function toggleMenu() { const o = panel.classList.toggle('open'); fab.classList.toggle('open', o); overlay.classList.toggle('open', o); }
fab.addEventListener('click', toggleMenu); overlay.addEventListener('click', toggleMenu);

function wire(id, cur, fn) { const g = $(id); if (!g) return; g.querySelectorAll('.opt-btn').forEach(b => { b.classList.toggle('active', b.dataset.val === String(cur)); b.addEventListener('click', () => { g.querySelectorAll('.opt-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); fn(b.dataset.val); }); }); }
wire('refresh-opts', S.refresh, v => { S.refresh = parseInt(v); save(); connect(); });
wire('temp-unit-opts', S.tempUnit, v => { S.tempUnit = v; save(); });
wire('clock-opts', S.clock24 ? '24' : '12', v => { S.clock24 = v === '24'; save(); updateClock(); });
wire('layout-opts', S.layoutMode, v => { S.layoutMode = v; save(); renderGrid(); if (lastData) update(lastData); });
let cd; $('weather-city').addEventListener('input', () => { clearTimeout(cd); cd = setTimeout(() => { S.weatherCity = $('weather-city').value.trim() || 'Chicago'; save(); }, 800); });

$('weather-city').value = S.weatherCity;
renderGrid(); renderModuleList();
if (S.theme) setTheme(S.theme);
if (S.editMode) setEditMode(true);

// Request device geolocation for weather
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      fetch(`/api/geo?lat=${lat}&lon=${lon}`).then(() => {
        // Force weather refresh on next poll
        if (lastData) update(lastData);
      });
    },
    () => {}, // silently ignore denial
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}
