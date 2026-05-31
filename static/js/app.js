/**
 * ddash v2.0 — Frontend App
 *
 * Architecture:
 * - Layout engine: renders grid from layout definitions
 * - Module renderers: each module has a render(data) function
 * - SSE: live data stream from backend
 * - Settings: persisted to localStorage
 */
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const SK = 'ddash-v2';
const S = Object.assign({
  layout: 'center-spotlight',
  modules: {},  // Auto-populated from layout slots on first load
  refresh: 2,
  theme: 'default',
  tempUnit: 'F',
  clock24: true,
}, JSON.parse(localStorage.getItem(SK) || '{}'));
function save() { localStorage.setItem(SK, JSON.stringify(S)); }

let layouts = [];
let moduleData = {};
let sseSource = null;
const MODULE_IDS = ['cpu','gpu','memory','network','temps','nowplaying','disks','docker','journal','connections','uptime','ifaces'];
const TAIL_MODULES = new Set(['journal', 'connections']);
const tailState = {}; // { modId: { paused: bool, buffer: [], seen: Set, replaying: bool } }

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT ENGINE
// ═══════════════════════════════════════════════════════════════════════════
function getLayout(id) { return layouts.find(l => l.id === id) || layouts[0]; }

function renderLayout() {
  const layout = getLayout(S.layout);
  const grid = $('dashboard');
  grid.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${Math.max(...layout.slots.map(s => s.row + s.rowSpan))}, 1fr)`;
  grid.innerHTML = '';

  // Auto-populate modules from layout slots if empty
  if (Object.keys(S.modules).length === 0) {
    for (const slot of layout.slots) {
      if (MODULE_IDS.includes(slot.id) && !Object.values(S.modules).includes(slot.id)) {
        S.modules[slot.id] = slot.id;
      }
    }
    save();
  }

  for (const slot of layout.slots) {
    const div = document.createElement('div');
    div.className = 'module';
    div.id = `slot-${slot.id}`;
    div.style.gridRow = `${slot.row} / span ${slot.rowSpan}`;
    div.style.gridColumn = `${slot.col} / span ${slot.colSpan}`;

    // Find which module is assigned to this slot
    const modId = Object.entries(S.modules).find(([_, s]) => s === slot.id)?.[0];
    if (modId) {
      const isTail = TAIL_MODULES.has(modId);
      const scrollClass = isTail ? ' scrollable' : '';
      div.innerHTML = `
        <div class="module-head"><i class="fas ${getModuleIcon(modId)}"></i> ${getModuleTitle(modId)}</div>
        <div class="module-body${scrollClass}" id="body-${slot.id}"></div>
        ${isTail ? `<div class="module-tail">
          <span class="tail-status live" id="tail-status-${modId}">● LIVE</span>
          <button class="tail-btn" id="tail-btn-${modId}" data-mod="${modId}"><i class="fas fa-pause"></i> Pause</button>
        </div>` : ''}`;
    } else {
      div.innerHTML = `<div class="module-head" style="color:var(--text-muted)">Empty slot</div>
        <div class="module-body" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:10px">—</div>`;
    }
    grid.appendChild(div);
  }

  // Wire tail toggle buttons
  for (const modId of TAIL_MODULES) {
    const btn = $(`tail-btn-${modId}`);
    if (btn) {
      btn.addEventListener('click', () => toggleTailPause(modId));
    }
  }

  // Update header
  updateHeader();
  // Render current data
  if (Object.keys(moduleData).length) renderModules();
}

function getModuleIcon(id) {
  const icons = { cpu:'fa-microchip', gpu:'fa-display', memory:'fa-memory', network:'fa-network-wired',
    temps:'fa-thermometer-half', nowplaying:'fa-play', disks:'fa-hard-drive', docker:'fa-docker',
    journal:'fa-scroll', connections:'fa-plug', uptime:'fa-clock', ifaces:'fa-ethernet' };
  return icons[id] || 'fa-circle';
}

function getModuleTitle(id) {
  const titles = { cpu:'CPU', gpu:'GPU', memory:'Memory', network:'Network', temps:'Temps',
    nowplaying:'Now Playing', disks:'Disks', docker:'Docker', journal:'Journal',
    connections:'Connections', uptime:'Uptime / Load', ifaces:'Interfaces' };
  return titles[id] || id;
}

// ── Tail state management (journal, connections) ────────────────────────
function initTail(modId) {
  if (!tailState[modId]) {
    tailState[modId] = { paused: false, buffer: [], seen: new Set(), replaying: false };
  }
}

function toggleTailPause(modId) {
  initTail(modId);
  const t = tailState[modId];
  t.paused = !t.paused;

  // Update button
  const btn = $(`tail-btn-${modId}`);
  const status = $(`tail-status-${modId}`);
  if (btn) {
    btn.innerHTML = t.paused ? '<i class="fas fa-play"></i> Resume' : '<i class="fas fa-pause"></i> Pause';
    btn.classList.toggle('active', t.paused);
  }
  if (status) {
    status.textContent = t.paused ? '● PAUSED' : '● LIVE';
    status.className = `tail-status ${t.paused ? 'paused' : 'live'}`;
  }

  // If unpausing and buffer has items, start replay
  if (!t.paused && t.buffer.length > 0 && !t.replaying) {
    replayTail(modId);
  }
}

function replayTail(modId) {
  initTail(modId);
  const t = tailState[modId];
  t.replaying = true;

  const body = findTailBody(modId);
  if (!body || t.buffer.length === 0) { t.replaying = false; return; }

  // Append next buffered entry
  const html = t.buffer.shift();
  body.insertAdjacentHTML('beforeend', html);

  // Trim to 200 entries max
  while (body.children.length > 200) body.removeChild(body.firstChild);

  // Smooth scroll to bottom
  body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });

  // Continue replay or finish
  if (t.buffer.length > 0 && !t.paused) {
    setTimeout(() => replayTail(modId), 80); // ~12 entries/sec
  } else {
    t.replaying = false;
  }
}

function findTailBody(modId) {
  // Find the slot this module is assigned to
  const slotId = Object.entries(S.modules).find(([mid]) => mid === modId)?.[1];
  if (!slotId) return null;
  return $(`body-${slotId}`);
}

function processTailData(modId, entries, keyFn) {
  initTail(modId);
  const t = tailState[modId];
  const body = findTailBody(modId);
  if (!body) return;

  if (t.replaying) {
    // During replay: buffer new entries for later
    for (const entry of entries) {
      const k = keyFn(entry);
      if (!t.seen.has(k)) {
        t.seen.add(k);
        const wrapper = modId === 'journal' ? { entries: [entry] } : { connections: [entry] };
        t.buffer.push(renderers[modId](wrapper));
      }
    }
    return;
  }

  if (t.paused) {
    // Paused: buffer new entries only
    for (const entry of entries) {
      const k = keyFn(entry);
      if (!t.seen.has(k)) {
        t.seen.add(k);
        const wrapper = modId === 'journal' ? { entries: [entry] } : { connections: [entry] };
        t.buffer.push(renderers[modId](wrapper));
      }
    }
    return;
  }

  // Live: append only NEW entries (don't rebuild DOM)
  let appended = 0;
  for (const entry of entries) {
    const k = keyFn(entry);
    if (!t.seen.has(k)) {
      t.seen.add(k);
      const wrapper = modId === 'journal' ? { entries: [entry] } : { connections: [entry] };
      body.insertAdjacentHTML('beforeend', renderers[modId](wrapper));
      appended++;
    }
  }
  // Trim to 200 entries max
  while (body.children.length > 200) body.removeChild(body.firstChild);
  // Auto-scroll if we added something
  if (appended > 0) {
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  }
  t.buffer = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE RENDERERS
// ═══════════════════════════════════════════════════════════════════════════
const renderers = {
  cpu(d) {
    const pct = d.percent || 0;
    const off = 87.96 * (1 - pct / 100);
    const color = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--yellow)' : 'var(--accent)';
    return `<div class="gauge-row">
      <div class="gauge-ring"><svg viewBox="0 0 36 36"><circle class="gauge-bg" cx="18" cy="18" r="14"></circle><circle class="gauge-fill" cx="18" cy="18" r="14" stroke="${color}" stroke-dasharray="87.96" stroke-dashoffset="${off}"></circle><text class="gauge-text" x="18" y="18">${Math.round(pct)}%</text></svg></div>
      <div class="gauge-info">
        <div class="mrow"><span class="ml">User</span><span class="mv">${(d.user||0).toFixed(1)}%</span></div>
        <div class="mrow"><span class="ml">System</span><span class="mv">${(d.sys||0).toFixed(1)}%</span></div>
        <div class="mrow"><span class="ml">Cores</span><span class="mv">${d.cores||'--'}</span></div>
        <div class="mrow"><span class="ml">Freq</span><span class="mv">${d.freq||'--'} GHz</span></div>
        <div class="mrow"><span class="ml">Load</span><span class="mv">${(d.load||[]).join(' ')}</span></div>
      </div>
    </div>`;
  },

  gpu(d) {
    const pct = d.utilization || 0;
    const off = 87.96 * (1 - pct / 100);
    const color = d.temp > 80 ? 'var(--red)' : 'var(--accent)';
    return `<div class="gauge-row">
      <div class="gauge-ring"><svg viewBox="0 0 36 36"><circle class="gauge-bg" cx="18" cy="18" r="14"></circle><circle class="gauge-fill" cx="18" cy="18" r="14" stroke="${color}" stroke-dasharray="87.96" stroke-dashoffset="${off}"></circle><text class="gauge-text" x="18" y="18">${pct}%</text></svg></div>
      <div class="gauge-info">
        <div class="mrow"><span class="ml">Name</span><span class="mv">${d.name||'--'}</span></div>
        <div class="mrow"><span class="ml">Temp</span><span class="mv">${d.temp||0}°C</span></div>
        <div class="mrow"><span class="ml">Power</span><span class="mv">${d.power||0}W</span></div>
      </div>
    </div>
    <div class="bar-label"><span>VRAM</span><span>${fmtBytes(d.vram_used)}/${fmtBytes(d.vram_total)}</span></div>
    <div class="bar-track"><div class="bar-fill accent" style="width:${d.vram_total?d.vram_used/d.vram_total*100:0}%"></div></div>`;
  },

  memory(d) {
    const r = d.ram || {};
    const s = d.swap || {};
    return `
      <div class="bar-label"><span>RAM</span><span class="val">${(r.percent||0).toFixed(1)}%</span></div>
      <div class="bar-track"><div class="bar-fill ${barColor(r.percent)}" style="width:${r.percent||0}%"></div></div>
      <div class="bar-label" style="font-size:9px"><span>${fmtBytes(r.used)} / ${fmtBytes(r.total)}</span></div>
      <div class="bar-label" style="margin-top:4px"><span>Swap</span><span class="val">${(s.percent||0).toFixed(1)}%</span></div>
      <div class="bar-track"><div class="bar-fill ${barColor(s.percent)}" style="width:${s.percent||0}%"></div></div>
      <div class="bar-label" style="font-size:9px"><span>${fmtBytes(s.used)} / ${fmtBytes(s.total)}</span></div>`;
  },

  network(d) {
    const maxRate = Math.max(d.rx_rate || 0, d.tx_rate || 0, 1000);
    const rxPct = Math.min(100, ((d.rx_rate || 0) / maxRate) * 100);
    const txPct = Math.min(100, ((d.tx_rate || 0) / maxRate) * 100);
    return `
      <div style="margin-bottom:6px">
        <div class="bar-label"><span style="color:var(--green)">↓ Download</span><span class="val">${fmtRate(d.rx_rate)}</span></div>
        <div class="bar-track"><div class="bar-fill green" style="width:${rxPct}%"></div></div>
      </div>
      <div style="margin-bottom:6px">
        <div class="bar-label"><span style="color:var(--orange)">↑ Upload</span><span class="val">${fmtRate(d.tx_rate)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${txPct}%;background:var(--orange)"></div></div>
      </div>
      <div class="net-totals">RX: ${fmtBytes(d.rx_total)} · TX: ${fmtBytes(d.tx_total)}</div>`;
  },

  temps(d) {
    if (!d || Object.keys(d).length === 0) return '<div style="color:var(--text-muted)">No sensors</div>';
    return Object.entries(d).map(([k, v]) => {
      const short = k.replace(/-.*/, '').replace(/_pci.*/, '');
      const pct = Math.min(100, v);
      const color = v > 75 ? 'var(--red)' : v > 50 ? 'var(--yellow)' : 'var(--green)';
      return `<div class="temp-bar">
        <span class="name">${short}</span>
        <div class="track"><div class="fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="val" style="color:${color}">${v.toFixed?v.toFixed(1):v}°</span>
      </div>`;
    }).join('');
  },

  nowplaying(d) {
    if (!d) return '<div class="np-idle">No media playing</div>';
    const pct = d.duration > 0 ? (d.position / d.duration * 100) : 0;
    return `
      <div class="np-source">${d.source}</div>
      <div class="np-title">${d.title || 'Unknown'}</div>
      <div class="np-artist">${d.artist || ''}</div>
      <div class="np-progress"><div class="bar-track"><div class="bar-fill accent" style="width:${pct}%"></div></div></div>
      <div class="np-time"><span>${fmtTime(d.position)}</span><span>${fmtTime(d.duration)}</span></div>`;
  },

  disks(d) {
    if (!d?.disks) return '';
    return d.disks.map(dk => `
      <div class="disk-item">
        <div class="disk-mount">${dk.mount}</div>
        <div class="bar-track"><div class="bar-fill ${barColor(dk.percent)}" style="width:${dk.percent}%"></div></div>
        <div class="disk-info"><span>${fmtBytes(dk.used)}</span><span>${dk.percent}%</span></div>
      </div>`).join('');
  },

  docker(d) {
    if (!d?.containers?.length) return '<div style="color:var(--text-muted)">No containers</div>';
    return d.containers.map(c => {
      const up = c.status.toLowerCase().includes('up');
      return `<span class="chip"><span class="dot ${up?'up':'down'}"></span>${c.name}</span>`;
    }).join('');
  },

  uptime(d) {
    return `<div style="font-size:10px">
      <div class="mrow"><span class="ml">Uptime</span><span class="mv">${d.uptime_human||'--'}</span></div>
      <div class="mrow"><span class="ml">Load 1m</span><span class="mv">${d.load_1m||'--'}</span></div>
      <div class="mrow"><span class="ml">Load 5m</span><span class="mv">${d.load_5m||'--'}</span></div>
      <div class="mrow"><span class="ml">Load 15m</span><span class="mv">${d.load_15m||'--'}</span></div>
      <div class="mrow"><span class="ml">Procs</span><span class="mv">${d.processes||'--'}</span></div>
    </div>`;
  },

  ifaces(d) {
    if (!d?.interfaces) return '';
    return d.interfaces.map(iface => `
      <div class="iface-item">
        <span class="iface-led ${iface.up?'up':'down'}"></span>
        <span class="iface-name">${iface.name}</span>
        <span class="iface-ip">${iface.ips[0]||'--'}</span>
        <span class="iface-speed">${iface.speed||0} Mb/s</span>
      </div>`).join('');
  },

  journal(d) {
    if (!d?.entries?.length) return '<div style="color:var(--text-muted)">No entries</div>';
    return d.entries.map(e => {
      const cls = e.level === 'error' ? 'err' : e.level === 'warn' ? 'warn' : '';
      return `<div class="tail-entry"><span class="ts">${e.time}</span> <span class="${cls}">${e.msg}</span></div>`;
    }).join('');
  },

  connections(d) {
    if (!d?.connections?.length) return '<div style="color:var(--text-muted)">No connections</div>';
    return d.connections.map(c => {
      const cls = c.status === 'ESTABLISHED' ? 'est' : 'other';
      return `<div class="tail-entry"><span class="ts">${c.time || ''}</span> <span class="conn-status ${cls}">${c.status.substring(0,4)}</span> <span class="conn-proto">${c.proto}</span> <span class="conn-addr">${c.raddr}</span></div>`;
    }).join('');
  },
};

function renderModules() {
  for (const [modId, slotId] of Object.entries(S.modules)) {
    const body = $(`body-${slotId}`);
    if (!body || !moduleData[modId]) continue;

    if (TAIL_MODULES.has(modId)) {
      // Tail modules: use processTailData for buffered scrolling
      const data = moduleData[modId];
      if (modId === 'journal') {
        processTailData(modId, data.entries || [], e => e.time + e.msg);
      } else if (modId === 'connections') {
        processTailData(modId, data.connections || [], c => c.laddr + c.raddr + c.status);
      }
    } else {
      const renderer = renderers[modId];
      if (renderer) {
        body.innerHTML = renderer(moduleData[modId]);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA / SSE
// ═══════════════════════════════════════════════════════════════════════════
function connect() {
  if (sseSource) sseSource.close();
  sseSource = new EventSource(`/api/stream?interval=${S.refresh}`);
  sseSource.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      moduleData = d.modules || {};
      renderModules();
    } catch(e) {}
  };
  sseSource.onerror = () => { sseSource.close(); sseSource = null; setTimeout(connect, 3000); };
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════════════════
function updateHeader() {
  // Clock
  const now = new Date();
  $('clock').textContent = now.toLocaleTimeString('en-US', { hour12: !S.clock24 });
  // Uptime from module data
  if (moduleData.uptime) {
    $('uptime').textContent = 'up ' + (moduleData.uptime.uptime_human || '');
  }
  // Weather placeholder
  $('weather').textContent = S.weatherCity || '';
}

setInterval(() => {
  const now = new Date();
  $('clock').textContent = now.toLocaleTimeString('en-US', { hour12: !S.clock24 });
}, 1000);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function fmtBytes(b) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  let i = 0; let v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(i > 0 ? 1 : 0) + ' ' + u[i];
}

function fmtRate(b) {
  if (!b) return '0 B/s';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB/s';
  if (b > 1e3) return (b / 1e3).toFixed(0) + ' KB/s';
  return b + ' B/s';
}

function fmtTime(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function barColor(pct) {
  if (pct > 80) return 'red';
  if (pct > 60) return 'yellow';
  return 'green';
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════════════════
function initMenu() {
  const fab = $('menu-fab');
  const panel = $('menu-panel');
  const overlay = $('menu-overlay');
  function toggleMenu() {
    const open = panel.classList.toggle('open');
    fab.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
  }
  fab.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);

  // Layout list
  renderLayoutList();

  // Settings
  $('opt-refresh').value = S.refresh;
  $('opt-theme').value = S.theme;
  $('opt-temp').value = S.tempUnit;
  $('opt-clock').value = S.clock24 ? '24' : '12';

  $('opt-refresh').addEventListener('change', e => { S.refresh = parseInt(e.target.value); save(); connect(); });
  $('opt-theme').addEventListener('change', e => { S.theme = e.target.value; save(); applyTheme(); });
  $('opt-temp').addEventListener('change', e => { S.tempUnit = e.target.value; save(); renderModules(); });
  $('opt-clock').addEventListener('change', e => { S.clock24 = e.target.value === '24'; save(); updateHeader(); });

  // Module assignment arrows
  // > moves from Assigned to Available (unassign)
  // < moves from Available to Assigned (assign)
  $('mod-add').addEventListener('click', () => assignSelected(false));
  $('mod-remove').addEventListener('click', () => assignSelected(true));

  applyTheme();
}

function renderLayoutList() {
  const list = $('layout-list');
  list.innerHTML = layouts.map(l => `
    <div class="layout-card ${l.id === S.layout ? 'active' : ''}" data-id="${l.id}">
      <div class="lc-name">${l.name}</div>
      <div class="lc-desc">${l.description}</div>
    </div>`).join('');

  list.querySelectorAll('.layout-card').forEach(card => {
    card.addEventListener('click', () => {
      S.layout = card.dataset.id;
      S.modules = {}; // Reset module assignments
      save();
      renderLayoutList();
      renderModuleLists();
      renderLayout();
    });
  });
}

function renderModuleLists() {
  const layout = getLayout(S.layout);
  const slotIds = layout.slots.map(s => s.id);
  const assigned = Object.entries(S.modules).filter(([_, s]) => slotIds.includes(s));
  const allModIds = ['cpu','gpu','memory','network','temps','nowplaying','disks','docker','journal','connections','uptime','ifaces'];
  const available = allModIds.filter(id => !S.modules[id]);

  const assignedEl = $('mod-assigned');
  const availableEl = $('mod-available');
  assignedEl.innerHTML = assigned.map(([id]) => `<div class="dual-item" data-mod="${id}">${getModuleTitle(id)}</div>`).join('');
  availableEl.innerHTML = available.map(id => `<div class="dual-item" data-mod="${id}">${getModuleTitle(id)}</div>`).join('');

  // Click to select
  [assignedEl, availableEl].forEach(el => {
    el.querySelectorAll('.dual-item').forEach(item => {
      item.addEventListener('click', () => {
        el.querySelectorAll('.dual-item').forEach(i => i.classList.remove('selected'));
        item.classList.toggle('selected');
      });
    });
  });
}

function assignSelected(toAssigned) {
  const fromEl = toAssigned ? $('mod-available') : $('mod-assigned');
  const selected = fromEl.querySelector('.dual-item.selected');
  if (!selected) return;
  const modId = selected.dataset.mod;
  const layout = getLayout(S.layout);

  if (toAssigned) {
    // Find first unoccupied slot
    const occupied = new Set(Object.values(S.modules));
    const freeSlot = layout.slots.find(s => !occupied.has(s.id));
    if (freeSlot) {
      S.modules[modId] = freeSlot.id;
    }
  } else {
    delete S.modules[modId];
  }
  save();
  renderModuleLists();
  renderLayout();
}

function applyTheme() {
  document.body.className = S.theme ? `theme-${S.theme}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
async function init() {
  // Fetch layouts
  try {
    const r = await fetch('/api/layouts');
    layouts = await r.json();
  } catch(e) { layouts = []; }

  renderLayout();
  renderModuleLists();
  initMenu();
  connect();
}

init();
