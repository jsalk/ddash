/**
 * ddash Layout Editor — core engine
 *
 * Grid-based layout editor with drag-move, drag-resize,
 * undo/redo, save/load JSON, and preview mode.
 */
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════════════
// SANITIZE — XSS prevention
// ═══════════════════════════════════════════════════════════════════════════
const _esc = document.createElement('div');
function esc(str) {
  if (str == null) return '';
  _esc.textContent = String(str);
  return _esc.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const MODULE_TYPES = [
  { id: 'cpu', label: 'CPU', icon: 'fa-microchip' },
  { id: 'gpu', label: 'GPU', icon: 'fa-display' },
  { id: 'memory', label: 'Memory', icon: 'fa-memory' },
  { id: 'network', label: 'Network', icon: 'fa-network-wired' },
  { id: 'temps', label: 'Temps', icon: 'fa-thermometer-half' },
  { id: 'nowplaying', label: 'Now Playing', icon: 'fa-play' },
  { id: 'disks', label: 'Disks', icon: 'fa-hard-drive' },
  { id: 'docker', label: 'Docker', icon: 'fa-docker' },
  { id: 'journal', label: 'Journal', icon: 'fa-scroll' },
  { id: 'connections', label: 'Connections', icon: 'fa-plug' },
  { id: 'uptime', label: 'Uptime / Load', icon: 'fa-clock' },
  { id: 'ifaces', label: 'Interfaces', icon: 'fa-ethernet' },
];

const STRUCT_TYPES = [
  { id: 'blank', label: 'Blank', icon: 'fa-square' },
  { id: 'text', label: 'Text Block', icon: 'fa-font' },
  { id: 'separator-h', label: 'H-Separator', icon: 'fa-minus' },
  { id: 'separator-v', label: 'V-Separator', icon: 'fa-grip-lines-vertical' },
];

const PRESETS = [
  // Sidebar Stack: nav rail + KPI strip + stacked content
  { id: 'sidebar-stack', name: 'Sidebar Stack', cols: 5, rows: 5, elements: [
    { type: 'cpu', col: 1, row: 1, colSpan: 1, rowSpan: 5 },
    { type: 'gpu', col: 2, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'memory', col: 3, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'network', col: 4, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'temps', col: 5, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'journal', col: 2, row: 2, colSpan: 4, rowSpan: 2 },
    { type: 'connections', col: 2, row: 4, colSpan: 4, rowSpan: 2 },
  ]},
  // Bento Grid: mixed card sizes, hero + supporting tiles
  { id: 'bento-grid', name: 'Bento Grid', cols: 4, rows: 5, elements: [
    { type: 'cpu', col: 1, row: 1, colSpan: 2, rowSpan: 2 },
    { type: 'gpu', col: 3, row: 1, colSpan: 2, rowSpan: 1 },
    { type: 'temps', col: 3, row: 2, colSpan: 2, rowSpan: 1 },
    { type: 'memory', col: 1, row: 3, colSpan: 1, rowSpan: 1 },
    { type: 'network', col: 2, row: 3, colSpan: 1, rowSpan: 1 },
    { type: 'journal', col: 3, row: 3, colSpan: 2, rowSpan: 2 },
    { type: 'connections', col: 1, row: 4, colSpan: 2, rowSpan: 2 },
  ]},
  // Center Spotlight: one dominant panel, side rails
  { id: 'center-spotlight', name: 'Center Spotlight', cols: 5, rows: 4, elements: [
    { type: 'journal', col: 2, row: 1, colSpan: 3, rowSpan: 3 },
    { type: 'cpu', col: 1, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'temps', col: 1, row: 2, colSpan: 1, rowSpan: 2 },
    { type: 'gpu', col: 5, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'memory', col: 5, row: 2, colSpan: 1, rowSpan: 1 },
    { type: 'network', col: 5, row: 3, colSpan: 1, rowSpan: 1 },
    { type: 'connections', col: 1, row: 4, colSpan: 5, rowSpan: 1 },
  ]},
  // Tabbed Workspace: grouped by category
  { id: 'tabbed-workspace', name: 'Tabbed Workspace', cols: 4, rows: 4, elements: [
    { type: 'cpu', col: 1, row: 1, colSpan: 2, rowSpan: 1 },
    { type: 'gpu', col: 3, row: 1, colSpan: 2, rowSpan: 1 },
    { type: 'memory', col: 1, row: 2, colSpan: 1, rowSpan: 2 },
    { type: 'network', col: 2, row: 2, colSpan: 1, rowSpan: 2 },
    { type: 'journal', col: 3, row: 2, colSpan: 2, rowSpan: 1 },
    { type: 'connections', col: 3, row: 3, colSpan: 2, rowSpan: 1 },
    { type: 'temps', col: 1, row: 4, colSpan: 4, rowSpan: 1 },
  ]},
  // Timeline Board: center event stream, side context
  { id: 'timeline-board', name: 'Timeline Board', cols: 5, rows: 4, elements: [
    { type: 'journal', col: 2, row: 1, colSpan: 2, rowSpan: 3 },
    { type: 'cpu', col: 1, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'temps', col: 1, row: 2, colSpan: 1, rowSpan: 2 },
    { type: 'gpu', col: 4, row: 1, colSpan: 2, rowSpan: 1 },
    { type: 'memory', col: 4, row: 2, colSpan: 2, rowSpan: 1 },
    { type: 'network', col: 4, row: 3, colSpan: 2, rowSpan: 1 },
    { type: 'connections', col: 1, row: 4, colSpan: 5, rowSpan: 1 },
  ]},
  // Two-Column: wide analysis + narrow rail
  { id: 'two-column', name: 'Two-Column', cols: 4, rows: 5, elements: [
    { type: 'cpu', col: 1, row: 1, colSpan: 3, rowSpan: 1 },
    { type: 'gpu', col: 1, row: 2, colSpan: 3, rowSpan: 1 },
    { type: 'journal', col: 1, row: 3, colSpan: 3, rowSpan: 2 },
    { type: 'connections', col: 1, row: 5, colSpan: 3, rowSpan: 1 },
    { type: 'memory', col: 4, row: 1, colSpan: 1, rowSpan: 1 },
    { type: 'network', col: 4, row: 2, colSpan: 1, rowSpan: 1 },
    { type: 'temps', col: 4, row: 3, colSpan: 1, rowSpan: 3 },
  ]},
  // Custom: empty canvas for user-defined layout
  { id: 'custom', name: 'Custom', cols: 4, rows: 4, elements: [] },
];

// Deep copy of presets for reset reference
const DEFAULT_PRESETS = JSON.parse(JSON.stringify(PRESETS));

let state = {
  cols: 4, rows: 6,
  elements: [],
  selectedId: null,
  activePreset: 'center-spotlight',
};
const STORAGE_KEY = 'ddash-editor-layouts';
let undoStack = [];
let redoStack = [];
let nextId = 1;
let dragState = null;
let dragRafPending = false;

// ── localStorage persistence ──────────────────────────────────────────────
function saveLayouts() {
  const data = {};
  for (const preset of PRESETS) {
    data[preset.id] = { cols: preset.cols, rows: preset.rows, elements: preset.elements };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadLayouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const preset of PRESETS) {
      if (data[preset.id]) {
        preset.cols = data[preset.id].cols;
        preset.rows = data[preset.id].rows;
        preset.elements = data[preset.id].elements;
      }
    }
  } catch(e) { console.warn('Failed to load layouts:', e); }
}

function resetLayout(presetId) {
  const def = DEFAULT_PRESETS.find(p => p.id === presetId);
  const live = PRESETS.find(p => p.id === presetId);
  if (!def || !live) return;
  live.cols = def.cols;
  live.rows = def.rows;
  live.elements = JSON.parse(JSON.stringify(def.elements));
  saveLayouts();
}

function resetAllLayouts() {
  for (const def of DEFAULT_PRESETS) {
    const live = PRESETS.find(p => p.id === def.id);
    if (live) {
      live.cols = def.cols;
      live.rows = def.rows;
      live.elements = JSON.parse(JSON.stringify(def.elements));
    }
  }
  saveLayouts();
}

// ═══════════════════════════════════════════════════════════════════════════
// UNDO / REDO
// ═══════════════════════════════════════════════════════════════════════════
function pushUndo() {
  undoStack.push(JSON.parse(JSON.stringify(state.elements)));
  redoStack = [];
  if (undoStack.length > 50) undoStack.shift();
  updateUndoRedoBtns();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.parse(JSON.stringify(state.elements)));
  state.elements = undoStack.pop();
  state.selectedId = null;
  render();
  updateUndoRedoBtns();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.parse(JSON.stringify(state.elements)));
  state.elements = redoStack.pop();
  state.selectedId = null;
  render();
  updateUndoRedoBtns();
}

function updateUndoRedoBtns() {
  $('btn-undo').disabled = undoStack.length === 0;
  $('btn-redo').disabled = redoStack.length === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function createElement(type, col, row, colSpan = 2, rowSpan = 1) {
  const isModule = MODULE_TYPES.some(m => m.id === type);
  const info = isModule
    ? MODULE_TYPES.find(m => m.id === type)
    : STRUCT_TYPES.find(s => s.id === type);
  return {
    id: nextId++,
    type,
    label: info?.label || type,
    icon: info?.icon || 'fa-square',
    col, row, colSpan, rowSpan,
    isModule,
    content: type === 'text' ? 'Text block' : '',
    depth: 0, // z-index ordering
  };
}

function boundsOK(el) {
  return el.col >= 1 && el.row >= 1 &&
         el.col + el.colSpan - 1 <= state.cols &&
         el.row + el.rowSpan - 1 <= state.rows &&
         el.colSpan >= 1 && el.rowSpan >= 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════
function render() {
  const canvas = $('canvas');
  canvas.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  canvas.style.gridTemplateRows = `repeat(${state.rows}, 1fr)`;

  canvas.innerHTML = state.elements.map(el => {
    const sel = el.id === state.selectedId ? ' selected' : '';
    const mod = el.isModule ? ' is-module' : '';
    const typeClass = el.type.startsWith('separator') ? ` is-${el.type}` : el.type === 'text' ? ' is-text' : '';
    let bodyContent = '';
    if (el.isModule) bodyContent = `<i class="fas ${esc(el.icon)}"></i>`;
    else if (el.type === 'text') bodyContent = esc(el.content || 'Text');
    else if (el.type === 'blank') bodyContent = '';
    else bodyContent = ''; // separator has its own styling

    return `<div class="ce${sel}${mod}${typeClass}" data-id="${el.id}"
      style="grid-column:${el.col}/span${el.colSpan};grid-row:${el.row}/span${el.rowSpan};z-index:${(el.depth || 0) + 1}">
      <div class="ce-head">
        <span class="ce-label">${esc(el.label)}</span>
        <span class="ce-type">${el.isModule ? 'module' : esc(el.type)}</span>
      </div>
      <div class="ce-body">${bodyContent}</div>
      <div class="resize-handle rh-e" data-dir="e"></div>
      <div class="resize-handle rh-s" data-dir="s"></div>
      <div class="resize-handle rh-se" data-dir="se"></div>
    </div>`;
  }).join('');

  // Render depth buttons as overlay (outside stacking context)
  state.elements.forEach(el => {
    const gCol = el.col;
    const gRow = el.row;
    canvas.insertAdjacentHTML('beforeend',
      `<div class="ce-depth-overlay" data-id="${el.id}" data-col="${gCol}" data-row="${gRow}" data-cspan="${el.colSpan}" data-rspan="${el.rowSpan}" style="z-index:${(el.depth || 0) + 100}">
        <button class="ce-depth-btn" data-action="depth-down" data-id="${el.id}" title="Send backward">&#11015;</button>
        <span class="ce-depth-val">${el.depth || 0}</span>
        <button class="ce-depth-btn" data-action="depth-up" data-id="${el.id}" title="Bring forward">&#11014;</button>
      </div>`
    );
  });

  renderElementList();
  renderProps();

  // Position depth overlays over their modules
  requestAnimationFrame(() => {
    canvas.querySelectorAll('.ce-depth-overlay').forEach(ov => {
      const id = parseInt(ov.dataset.id);
      const ce = canvas.querySelector(`.ce[data-id="${id}"]`);
      if (!ce) return;
      const ceRect = ce.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      ov.style.position = 'absolute';
      ov.style.left = (ceRect.left - canvasRect.left + 4) + 'px';
      ov.style.top = (ceRect.top - canvasRect.top + 4) + 'px';
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS EVENT DELEGATION — set up ONCE in init(), not in render()
// ═══════════════════════════════════════════════════════════════════════════
function initCanvasEvents() {
  const canvas = $('canvas');

  // Single delegated mousedown for element select/move/resize
  canvas.addEventListener('mousedown', e => {
    // Depth button
    const depthBtn = e.target.closest('.ce-depth-btn');
    if (depthBtn) {
      e.stopPropagation();
      e.preventDefault();
      const id = parseInt(depthBtn.dataset.id);
      const elem = state.elements.find(x => x.id === id);
      if (!elem) return;
      pushUndo();
      if (depthBtn.dataset.action === 'depth-up') {
        elem.depth = (elem.depth || 0) + 1;
      } else {
        elem.depth = Math.max(0, (elem.depth || 0) - 1);
      }
      render();
      saveCurrentPreset();
      return;
    }

    // Element click
    const ce = e.target.closest('.ce');
    if (ce) {
      // Ignore clicks on depth overlays
      if (e.target.closest('.ce-depth-overlay')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const id = parseInt(ce.dataset.id);
      const elem = state.elements.find(x => x.id === id);
      if (!elem) return;

      selectElement(id);
      pushUndo();

      // Check if clicking a resize handle
      const resizeHandle = e.target.closest('.resize-handle');
      if (resizeHandle) {
        dragState = {
          type: 'resize',
          id,
          dir: resizeHandle.dataset.dir,
          startCol: elem.col,
          startRow: elem.row,
          startColSpan: elem.colSpan,
          startRowSpan: elem.rowSpan,
          startMouseX: e.clientX,
          startMouseY: e.clientY,
        };
      } else {
        // Move
        dragState = {
          type: 'move',
          id,
          startCol: elem.col,
          startRow: elem.row,
          startMouseX: e.clientX,
          startMouseY: e.clientY,
        };
      }
      return;
    }

    // Click on empty canvas — deselect
    if (e.target === canvas) {
      state.selectedId = null;
      render();
    }
  });

  // RAF-throttled drag handler
  document.addEventListener('mousemove', e => {
    if (!dragState) return;
    if (dragRafPending) return;
    dragRafPending = true;

    requestAnimationFrame(() => {
      dragRafPending = false;
      if (!dragState) return;

      const canvas = $('canvas');
      const rect = canvas.getBoundingClientRect();
      const cellW = rect.width / state.cols;
      const cellH = rect.height / state.rows;
      const dx = e.clientX - dragState.startMouseX;
      const dy = e.clientY - dragState.startMouseY;
      const dcol = Math.round(dx / cellW);
      const drow = Math.round(dy / cellH);

      const elem = state.elements.find(x => x.id === dragState.id);
      if (!elem) return;

      if (dragState.type === 'move') {
        elem.col = Math.max(1, Math.min(state.cols - elem.colSpan + 1, dragState.startCol + dcol));
        elem.row = Math.max(1, Math.min(state.rows - elem.rowSpan + 1, dragState.startRow + drow));
      } else if (dragState.type === 'resize') {
        const dir = dragState.dir;
        if (dir.includes('e')) {
          elem.colSpan = Math.max(1, Math.min(state.cols - elem.col + 1, dragState.startColSpan + dcol));
        }
        if (dir.includes('s')) {
          elem.rowSpan = Math.max(1, Math.min(state.rows - elem.row + 1, dragState.startRowSpan + drow));
        }
      }
      render();
    });
  });

  document.addEventListener('mouseup', () => {
    if (dragState) {
      dragState = null;
      saveCurrentPreset();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTION & PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════
function selectElement(id) {
  state.selectedId = id;
  render();
}

function renderProps() {
  const panel = $('props-panel');
  const el = state.elements.find(x => x.id === state.selectedId);
  if (!el) {
    panel.innerHTML = '<div class="props-empty">Select an element to edit</div>';
    return;
  }

  let html = '';

  // Type dropdown
  if (el.isModule) {
    const opts = MODULE_TYPES.map(m =>
      `<option value="${esc(m.id)}" ${m.id === el.type ? 'selected' : ''}>${esc(m.label)}</option>`
    ).join('');
    html += `<div class="props-row"><label class="props-label">Module Type</label>
      <select class="props-select" id="prop-type">${opts}</select></div>`;
  } else {
    const opts = STRUCT_TYPES.map(s =>
      `<option value="${esc(s.id)}" ${s.id === el.type ? 'selected' : ''}>${esc(s.label)}</option>`
    ).join('');
    html += `<div class="props-row"><label class="props-label">Element Type</label>
      <select class="props-select" id="prop-type">${opts}</select></div>`;
  }

  // Label
  html += `<div class="props-row"><label class="props-label">Label</label>
    <input class="props-input" id="prop-label" value="${esc(el.label)}"></div>`;

  // Position
  html += `<div class="props-row"><label class="props-label">Position</label>
    <div class="props-row-inline">
      <input class="props-input" id="prop-col" type="number" min="1" max="${state.cols}" value="${el.col}" title="Column">
      <input class="props-input" id="prop-row" type="number" min="1" max="${state.rows}" value="${el.row}" title="Row">
    </div></div>`;

  // Size
  html += `<div class="props-row"><label class="props-label">Size</label>
    <div class="props-row-inline">
      <input class="props-input" id="prop-cspan" type="number" min="1" max="${state.cols}" value="${el.colSpan}" title="Col Span">
      <input class="props-input" id="prop-rspan" type="number" min="1" max="${state.rows}" value="${el.rowSpan}" title="Row Span">
    </div></div>`;

  // Content (for text blocks)
  if (el.type === 'text') {
    html += `<div class="props-row"><label class="props-label">Content</label>
      <textarea class="props-input" id="prop-content" rows="3">${esc(el.content)}</textarea></div>`;
  }

  // Depth (z-order)
  html += `<div class="props-row"><label class="props-label">Depth (z-order)</label>
    <div class="props-row-inline">
      <button class="ct-btn" id="depth-down" title="Send backward">&#11015; Back</button>
      <span style="font-size:11px;min-width:20px;text-align:center">${el.depth || 0}</span>
      <button class="ct-btn" id="depth-up" title="Bring forward">&#11014; Front</button>
    </div></div>`;

  // Delete button
  html += `<button class="ct-btn" id="prop-delete" style="color:var(--danger);margin-top:8px;width:100%;justify-content:center">
    <i class="fas fa-trash"></i> Delete Element</button>`;

  panel.innerHTML = html;

  // Wire props
  const wire = (id, key, transform = v => v) => {
    const input = $(id);
    if (!input) return;
    input.addEventListener('input', () => {
      pushUndo();
      el[key] = transform(input.value);
      if (key === 'type') {
        const isMod = MODULE_TYPES.some(m => m.id === el.type);
        el.isModule = isMod;
        const info = isMod ? MODULE_TYPES.find(m => m.id === el.type) : STRUCT_TYPES.find(s => s.id === el.type);
        el.icon = info?.icon || 'fa-square';
        el.label = info?.label || el.type;
      }
      render();
      saveCurrentPreset();
    });
  };

  wire('prop-type', 'type');
  wire('prop-label', 'label');
  wire('prop-col', 'col', v => parseInt(v) || 1);
  wire('prop-row', 'row', v => parseInt(v) || 1);
  wire('prop-cspan', 'colSpan', v => parseInt(v) || 1);
  wire('prop-rspan', 'rowSpan', v => parseInt(v) || 1);
  wire('prop-content', 'content');

  const delBtn = $('prop-delete');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      pushUndo();
      state.elements = state.elements.filter(x => x.id !== el.id);
      state.selectedId = null;
      render();
      saveCurrentPreset();
    });
  }

  // Depth controls
  const depthUp = $('depth-up');
  const depthDown = $('depth-down');
  if (depthUp) {
    depthUp.addEventListener('click', () => {
      pushUndo();
      el.depth = (el.depth || 0) + 1;
      render();
      saveCurrentPreset();
    });
  }
  if (depthDown) {
    depthDown.addEventListener('click', () => {
      pushUndo();
      el.depth = Math.max(0, (el.depth || 0) - 1);
      render();
      saveCurrentPreset();
    });
  }
}

function renderElementList() {
  const list = $('element-list');
  list.innerHTML = state.elements.map(el => {
    const active = el.id === state.selectedId ? ' active' : '';
    return `<div class="el-item${active}" data-id="${el.id}">
      <i class="fas ${esc(el.icon)}"></i>
      <span class="el-name">${esc(el.label)}</span>
      <span class="el-pos">${el.col},${el.row}</span>
    </div>`;
  }).join('');

  list.querySelectorAll('.el-item').forEach(item => {
    item.addEventListener('click', () => {
      selectElement(parseInt(item.dataset.id));
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE (drag from sidebar to canvas)
// ═══════════════════════════════════════════════════════════════════════════
function initPalette() {
  const modPalette = $('palette-modules');
  const structPalette = $('palette-structure');

  // Build palette items without innerHTML +=
  const modItems = MODULE_TYPES.map(m =>
    `<div class="palette-item" data-type="${esc(m.id)}" data-module="true" draggable="true">
      <i class="fas ${esc(m.icon)}"></i><span class="pi-label">${esc(m.label)}</span></div>`
  ).join('');
  modPalette.innerHTML = modItems;

  const structItems = STRUCT_TYPES.map(s =>
    `<div class="palette-item" data-type="${esc(s.id)}" data-module="false" draggable="true">
      <i class="fas ${esc(s.icon)}"></i><span class="pi-label">${esc(s.label)}</span></div>`
  ).join('');
  structPalette.innerHTML = structItems;

  // Drag from palette to canvas
  document.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: item.dataset.type,
        isModule: item.dataset.module === 'true',
      }));
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  const canvas = $('canvas');
  canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const rect = canvas.getBoundingClientRect();
      const cellW = rect.width / state.cols;
      const cellH = rect.height / state.rows;
      const col = Math.max(1, Math.min(state.cols, Math.floor((e.clientX - rect.left) / cellW) + 1));
      const row = Math.max(1, Math.min(state.rows, Math.floor((e.clientY - rect.top) / cellH) + 1));
      const el = createElement(data.type, col, row, 2, 1);
      pushUndo();
      state.elements.push(el);
      selectElement(el.id);
      saveCurrentPreset();
    } catch(err) { console.warn('Drop failed:', err); }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════
function loadPreset(id) {
  const preset = PRESETS.find(p => p.id === id);
  if (!preset) return;
  pushUndo();
  state.cols = preset.cols;
  state.rows = preset.rows;
  state.elements = preset.elements.map(e => createElement(e.type, e.col, e.row, e.colSpan, e.rowSpan));
  state.activePreset = id;
  state.selectedId = null;
  $('grid-cols').value = state.cols;
  $('grid-rows').value = state.rows;
  renderPresetTabs();
  render();
}

function saveCurrentPreset() {
  const preset = PRESETS.find(p => p.id === state.activePreset);
  if (!preset) return;
  preset.cols = state.cols;
  preset.rows = state.rows;
  preset.elements = state.elements.map(e => ({
    type: e.type, col: e.col, row: e.row,
    colSpan: e.colSpan, rowSpan: e.rowSpan,
  }));
  saveLayouts();
}

function renderPresetTabs() {
  const tabs = $('preset-tabs');
  tabs.innerHTML = PRESETS.map(p =>
    `<button class="preset-tab${p.id === state.activePreset ? ' active' : ''}" data-id="${esc(p.id)}">${esc(p.name)}</button>`
  ).join('');

  tabs.querySelectorAll('.preset-tab').forEach(tab => {
    tab.addEventListener('click', () => loadPreset(tab.dataset.id));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════════════════════════════════
function saveJSON() {
  const data = {
    name: $('layout-name').value,
    description: $('layout-desc').value,
    cols: state.cols,
    rows: state.rows,
    elements: state.elements.map(e => ({
      type: e.type, label: e.label, col: e.col, row: e.row,
      colSpan: e.colSpan, rowSpan: e.rowSpan, content: e.content, depth: e.depth || 0,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      pushUndo();
      state.cols = data.cols || 4;
      state.rows = data.rows || 6;
      state.elements = (data.elements || []).map(e => {
        const el = createElement(e.type, e.col, e.row, e.colSpan, e.rowSpan);
        el.depth = e.depth || 0;
        el.content = e.content || '';
        el.label = e.label || el.label;
        return el;
      });
      $('layout-name').value = data.name || 'Untitled';
      $('layout-desc').value = data.description || '';
      $('grid-cols').value = state.cols;
      $('grid-rows').value = state.rows;
      state.activePreset = null;
      renderPresetTabs();
      render();
    } catch(err) { showNotification('Invalid JSON file', 'error'); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function showPreview() {
  const overlay = $('preview-overlay');
  const canvas = $('preview-canvas');
  canvas.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  canvas.style.gridTemplateRows = `repeat(${state.rows}, 1fr)`;

  canvas.innerHTML = state.elements.map(el => {
    const isSep = el.type.startsWith('separator');
    const isText = el.type === 'text';
    const isBlank = el.type === 'blank';
    let cls = 'ce';
    if (isSep) cls += ` is-${el.type}`;
    if (isText) cls += ' is-text';
    let inner = '';
    if (el.isModule) inner = `<div class="ce-head"><span class="ce-label">${esc(el.label)}</span></div><div class="ce-body"><i class="fas ${esc(el.icon)}"></i></div>`;
    else if (isText) inner = `<div class="ce-body">${esc(el.content)}</div>`;
    else if (isBlank) inner = '';
    else inner = '<div class="ce-body"></div>';

    return `<div class="${cls}" style="grid-column:${el.col}/span${el.colSpan};grid-row:${el.row}/span${el.rowSpan}">${inner}</div>`;
  }).join('');

  overlay.classList.add('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION (replaces alert/confirm where possible)
// ═══════════════════════════════════════════════════════════════════════════
function showNotification(msg, type = 'info') {
  let el = document.getElementById('editor-notification');
  if (!el) {
    el = document.createElement('div');
    el.id = 'editor-notification';
    el.style.cssText = 'position:fixed;top:48px;right:16px;z-index:10000;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:500;transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = type === 'error' ? 'var(--danger)' : 'var(--accent)';
  el.style.color = '#fff';
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
function init() {
  loadLayouts(); // Load saved layouts from localStorage
  initPalette();
  initCanvasEvents(); // Single mousedown delegation — NOT inside render()
  renderPresetTabs();
  loadPreset('center-spotlight');

  // Grid size controls
  $('grid-cols').addEventListener('change', () => {
    state.cols = parseInt($('grid-cols').value) || 4;
    pushUndo();
    // Clamp elements
    state.elements.forEach(e => {
      e.col = Math.min(e.col, state.cols);
      e.colSpan = Math.min(e.colSpan, state.cols - e.col + 1);
    });
    render();
  });
  $('grid-rows').addEventListener('change', () => {
    state.rows = parseInt($('grid-rows').value) || 6;
    pushUndo();
    state.elements.forEach(e => {
      e.row = Math.min(e.row, state.rows);
      e.rowSpan = Math.min(e.rowSpan, state.rows - e.row + 1);
    });
    render();
  });

  $('btn-add-row').addEventListener('click', () => { pushUndo(); state.rows++; $('grid-rows').value = state.rows; render(); saveCurrentPreset(); });
  $('btn-add-col').addEventListener('click', () => { pushUndo(); state.cols++; $('grid-cols').value = state.cols; render(); saveCurrentPreset(); });
  $('btn-return-default').addEventListener('click', () => {
    const def = DEFAULT_PRESETS.find(p => p.id === state.activePreset);
    if (!def) return;
    if (!confirm(`Return "${PRESETS.find(p => p.id === state.activePreset)?.name}" to its default layout?`)) return;
    pushUndo();
    state.cols = def.cols;
    state.rows = def.rows;
    state.elements = JSON.parse(JSON.stringify(def.elements)).map(e => createElement(e.type, e.col, e.row, e.colSpan, e.rowSpan));
    $('grid-cols').value = state.cols;
    $('grid-rows').value = state.rows;
    saveCurrentPreset();
    render();
  });
  $('btn-clear').addEventListener('click', () => {
    if (confirm('Clear all elements?')) { pushUndo(); state.elements = []; state.selectedId = null; render(); saveCurrentPreset(); }
  });

  // Undo / Redo
  $('btn-undo').addEventListener('click', undo);
  $('btn-redo').addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    if (e.key === 'Delete' && state.selectedId) {
      pushUndo();
      state.elements = state.elements.filter(x => x.id !== state.selectedId);
      state.selectedId = null;
      render();
    }
  });

  // Save / Load
  $('btn-save').addEventListener('click', saveJSON);
  $('btn-load').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', e => { if (e.target.files[0]) loadJSON(e.target.files[0]); });

  // Reset with confirmation
  $('btn-reset').addEventListener('click', () => {
    const preset = PRESETS.find(p => p.id === state.activePreset);
    const name = preset?.name || 'this layout';
    const choice = confirm(
      `Reset "${name}" to default?\n\nOK = Reset this layout only\nCancel = No change`
    );
    if (!choice) return;
    // Second prompt: reset just this one or all?
    const allChoice = confirm(
      `Also reset ALL other layouts to default?\n\nOK = Reset ALL layouts\nCancel = Reset only "${name}"`
    );
    pushUndo();
    if (allChoice) {
      resetAllLayouts();
    } else {
      resetLayout(state.activePreset);
    }
    loadPreset(state.activePreset);
  });

  // Preview
  $('btn-preview').addEventListener('click', showPreview);
  $('btn-exit-preview').addEventListener('click', () => $('preview-overlay').classList.remove('open'));

  // Apply — POST current preset layout to backend
  $('btn-apply').addEventListener('click', async () => {
    const preset = PRESETS.find(p => p.id === state.activePreset);
    if (!preset) {
      showNotification('No active preset to apply', 'error');
      return;
    }
    try {
      const r = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: preset.id,
          name: preset.name,
          cols: preset.cols,
          rows: preset.rows,
          elements: preset.elements,
        }),
      });
      if (r.ok) {
        showNotification('Layout applied to dashboard');
      } else {
        showNotification('Failed to apply layout', 'error');
      }
    } catch(err) {
      showNotification('Network error — is ddash running?', 'error');
    }
  });

  updateUndoRedoBtns();
}

init();
