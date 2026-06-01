/**
 * ddash Layout Editor — core engine
 *
 * Grid-based layout editor with drag-move, drag-resize,
 * undo/redo, save/load JSON, and preview mode.
 */
const $ = id => document.getElementById(id);

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
  } catch(e) {}
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

function getElementAt(col, row) {
  return state.elements.find(e =>
    col >= e.col && col < e.col + e.colSpan &&
    row >= e.row && row < e.row + e.rowSpan
  );
}

function wouldOverlap(el, excludeId = null) {
  // Overlap is allowed — depth controls stacking
  return false;
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
    if (el.isModule) bodyContent = `<i class="fas ${el.icon}"></i>`;
    else if (el.type === 'text') bodyContent = el.content || 'Text';
    else if (el.type === 'blank') bodyContent = '';
    else bodyContent = ''; // separator has its own styling

    return `<div class="ce${sel}${mod}${typeClass}" data-id="${el.id}"
      style="grid-column:${el.col}/span${el.colSpan};grid-row:${el.row}/span${el.rowSpan};z-index:${(el.depth || 0) + 1}">
      <div class="ce-head">
        <span class="ce-label">${el.label}</span>
        <span class="ce-type">${el.isModule ? 'module' : el.type}</span>
      </div>
      <div class="ce-body">${bodyContent}</div>
      <div class="resize-handle rh-e" data-dir="e"></div>
      <div class="resize-handle rh-s" data-dir="s"></div>
      <div class="resize-handle rh-se" data-dir="se"></div>
    </div>`;
  }).join('');

  // Render depth buttons as overlay (outside stacking context)
  state.elements.forEach(el => {
    canvas.insertAdjacentHTML('beforeend',
      `<div class="ce-depth-overlay" data-id="${el.id}" style="grid-column:${el.col}/span${el.colSpan};grid-row:${el.row}/span${el.rowSpan};z-index:${(el.depth || 0) + 100}">
        <button class="ce-depth-btn" data-action="depth-down" data-id="${el.id}" title="Send backward">⬇</button>
        <span class="ce-depth-val">${el.depth || 0}</span>
        <button class="ce-depth-btn" data-action="depth-up" data-id="${el.id}" title="Bring forward">⬆</button>
      </div>`
    );
  });

  // Wire element interactions — combined select + move
  canvas.querySelectorAll('.ce').forEach(el => {
    const id = parseInt(el.dataset.id);

    el.addEventListener('mousedown', e => {
      // Ignore clicks on resize handles and depth overlays
      if (e.target.closest('.resize-handle') || e.target.closest('.ce-depth-overlay')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      selectElement(id);

      const elem = state.elements.find(x => x.id === id);
      if (!elem) return;
      pushUndo();
      dragState = {
        type: 'move',
        id,
        startCol: elem.col,
        startRow: elem.row,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
      };
    });
  });

  // Wire resize handles
  canvas.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      const el = handle.closest('.ce');
      const id = parseInt(el.dataset.id);
      const elem = state.elements.find(x => x.id === id);
      if (!elem) return;
      pushUndo();
      dragState = {
        type: 'resize',
        id,
        dir: handle.dataset.dir,
        startCol: elem.col,
        startRow: elem.row,
        startColSpan: elem.colSpan,
        startRowSpan: elem.rowSpan,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
      };
      selectElement(id);
    });
  });

  // Canvas click to deselect + depth buttons via delegation
  canvas.addEventListener('mousedown', e => {
    // Depth button (in overlay or properties)
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
    if (e.target === canvas) {
      state.selectedId = null;
      render();
    }
  });

  renderElementList();
  renderProps();
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAG HANDLER
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('mousemove', e => {
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
    const newCol = Math.max(1, Math.min(state.cols - elem.colSpan + 1, dragState.startCol + dcol));
    const newRow = Math.max(1, Math.min(state.rows - elem.rowSpan + 1, dragState.startRow + drow));
    // Check overlap before applying
    const testEl = { ...elem, col: newCol, row: newRow };
    if (!wouldOverlap(testEl, elem.id)) {
      elem.col = newCol;
      elem.row = newRow;
    }
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

document.addEventListener('mouseup', () => {
  if (dragState) {
    dragState = null;
    saveCurrentPreset();
  }
});

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
      `<option value="${m.id}" ${m.id === el.type ? 'selected' : ''}>${m.label}</option>`
    ).join('');
    html += `<div class="props-row"><label class="props-label">Module Type</label>
      <select class="props-select" id="prop-type">${opts}</select></div>`;
  } else {
    const opts = STRUCT_TYPES.map(s =>
      `<option value="${s.id}" ${s.id === el.type ? 'selected' : ''}>${s.label}</option>`
    ).join('');
    html += `<div class="props-row"><label class="props-label">Element Type</label>
      <select class="props-select" id="prop-type">${opts}</select></div>`;
  }

  // Label
  html += `<div class="props-row"><label class="props-label">Label</label>
    <input class="props-input" id="prop-label" value="${el.label}"></div>`;

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
      <textarea class="props-input" id="prop-content" rows="3">${el.content}</textarea></div>`;
  }

  // Depth (z-order)
  html += `<div class="props-row"><label class="props-label">Depth (z-order)</label>
    <div class="props-row-inline">
      <button class="ct-btn" id="depth-down" title="Send backward">⬇ Back</button>
      <span style="font-size:11px;min-width:20px;text-align:center">${el.depth || 0}</span>
      <button class="ct-btn" id="depth-up" title="Bring forward">⬆ Front</button>
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
      <i class="fas ${el.icon}"></i>
      <span class="el-name">${el.label}</span>
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

  MODULE_TYPES.forEach(m => {
    modPalette.innerHTML += `<div class="palette-item" data-type="${m.id}" data-module="true" draggable="true">
      <i class="fas ${m.icon}"></i><span class="pi-label">${m.label}</span></div>`;
  });

  STRUCT_TYPES.forEach(s => {
    structPalette.innerHTML += `<div class="palette-item" data-type="${s.id}" data-module="false" draggable="true">
      <i class="fas ${s.icon}"></i><span class="pi-label">${s.label}</span></div>`;
  });

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
      const colSpan = data.isModule ? 2 : 2;
      const el = createElement(data.type, col, row, colSpan, 1);
      if (!wouldOverlap(el)) {
        pushUndo();
        state.elements.push(el);
        selectElement(el.id);
        saveCurrentPreset();
      }
    } catch(err) {}
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
    `<button class="preset-tab${p.id === state.activePreset ? ' active' : ''}" data-id="${p.id}">${p.name}</button>`
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
    } catch(err) { alert('Invalid JSON file'); }
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
    if (el.isModule) inner = `<div class="ce-head"><span class="ce-label">${el.label}</span></div><div class="ce-body"><i class="fas ${el.icon}"></i></div>`;
    else if (isText) inner = `<div class="ce-body">${el.content}</div>`;
    else if (isBlank) inner = '';
    else inner = '<div class="ce-body"></div>';

    return `<div class="${cls}" style="grid-column:${el.col}/span${el.colSpan};grid-row:${el.row}/span${el.rowSpan}">${inner}</div>`;
  }).join('');

  overlay.classList.add('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
function init() {
  loadLayouts(); // Load saved layouts from localStorage
  initPalette();
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

  // Apply (placeholder — would POST to backend)
  $('btn-apply').addEventListener('click', () => {
    alert('Layout saved! (In production this would POST to /api/layouts)');
  });

  updateUndoRedoBtns();
}

init();
