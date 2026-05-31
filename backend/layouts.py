"""Layout pattern definitions — 6 dashboard layout types with default modules."""

LAYOUTS = [
    # Sidebar Stack: CPU nav rail, KPI strip, stacked content
    {
        "id": "sidebar-stack",
        "name": "Sidebar Stack",
        "description": "Persistent left nav, KPI strip at top, stacked content blocks.",
        "columns": 5,
        "slots": [
            {"id": "cpu", "row": 1, "col": 1, "rowSpan": 5, "colSpan": 1},
            {"id": "gpu", "row": 1, "col": 2, "rowSpan": 1, "colSpan": 1},
            {"id": "memory", "row": 1, "col": 3, "rowSpan": 1, "colSpan": 1},
            {"id": "network", "row": 1, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "temps", "row": 1, "col": 5, "rowSpan": 1, "colSpan": 1},
            {"id": "journal", "row": 2, "col": 2, "rowSpan": 2, "colSpan": 4},
            {"id": "connections", "row": 4, "col": 2, "rowSpan": 2, "colSpan": 4},
        ],
    },
    # Bento Grid: CPU hero, mixed card sizes
    {
        "id": "bento-grid",
        "name": "Bento Grid",
        "description": "Mixed card sizes for modular, prioritized layout.",
        "columns": 4,
        "slots": [
            {"id": "cpu", "row": 1, "col": 1, "rowSpan": 2, "colSpan": 2},
            {"id": "gpu", "row": 1, "col": 3, "rowSpan": 1, "colSpan": 2},
            {"id": "temps", "row": 2, "col": 3, "rowSpan": 1, "colSpan": 2},
            {"id": "memory", "row": 3, "col": 1, "rowSpan": 1, "colSpan": 1},
            {"id": "network", "row": 3, "col": 2, "rowSpan": 1, "colSpan": 1},
            {"id": "journal", "row": 3, "col": 3, "rowSpan": 2, "colSpan": 2},
            {"id": "connections", "row": 4, "col": 1, "rowSpan": 2, "colSpan": 2},
        ],
    },
    # Center Spotlight: Journal center stage, side rails
    {
        "id": "center-spotlight",
        "name": "Center Spotlight",
        "description": "One dominant live panel, side rails for supporting stats.",
        "columns": 5,
        "slots": [
            {"id": "journal", "row": 1, "col": 2, "rowSpan": 3, "colSpan": 3},
            {"id": "cpu", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 1},
            {"id": "temps", "row": 2, "col": 1, "rowSpan": 2, "colSpan": 1},
            {"id": "gpu", "row": 1, "col": 5, "rowSpan": 1, "colSpan": 1},
            {"id": "memory", "row": 2, "col": 5, "rowSpan": 1, "colSpan": 1},
            {"id": "network", "row": 3, "col": 5, "rowSpan": 1, "colSpan": 1},
            {"id": "connections", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 5},
        ],
    },
    # Tabbed Workspace: grouped by category
    {
        "id": "tabbed-workspace",
        "name": "Tabbed Workspace",
        "description": "Category tabs, each with its own canvas.",
        "columns": 4,
        "slots": [
            {"id": "cpu", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 2},
            {"id": "gpu", "row": 1, "col": 3, "rowSpan": 1, "colSpan": 2},
            {"id": "memory", "row": 2, "col": 1, "rowSpan": 2, "colSpan": 1},
            {"id": "network", "row": 2, "col": 2, "rowSpan": 2, "colSpan": 1},
            {"id": "journal", "row": 2, "col": 3, "rowSpan": 1, "colSpan": 2},
            {"id": "connections", "row": 3, "col": 3, "rowSpan": 1, "colSpan": 2},
            {"id": "temps", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 4},
        ],
    },
    # Timeline Board: Journal center stream, side context
    {
        "id": "timeline-board",
        "name": "Timeline Board",
        "description": "Center event stream, side context, footer stats.",
        "columns": 5,
        "slots": [
            {"id": "journal", "row": 1, "col": 2, "rowSpan": 3, "colSpan": 2},
            {"id": "cpu", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 1},
            {"id": "temps", "row": 2, "col": 1, "rowSpan": 2, "colSpan": 1},
            {"id": "gpu", "row": 1, "col": 4, "rowSpan": 1, "colSpan": 2},
            {"id": "memory", "row": 2, "col": 4, "rowSpan": 1, "colSpan": 2},
            {"id": "network", "row": 3, "col": 4, "rowSpan": 1, "colSpan": 2},
            {"id": "connections", "row": 4, "col": 1, "rowSpan": 1, "colSpan": 5},
        ],
    },
    # Two-Column: wide analysis + narrow rail
    {
        "id": "two-column",
        "name": "Two-Column Command",
        "description": "Wide analysis column + narrow support rail.",
        "columns": 4,
        "slots": [
            {"id": "cpu", "row": 1, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "gpu", "row": 2, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "journal", "row": 3, "col": 1, "rowSpan": 2, "colSpan": 3},
            {"id": "connections", "row": 5, "col": 1, "rowSpan": 1, "colSpan": 3},
            {"id": "memory", "row": 1, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "network", "row": 2, "col": 4, "rowSpan": 1, "colSpan": 1},
            {"id": "temps", "row": 3, "col": 4, "rowSpan": 3, "colSpan": 1},
        ],
    },
]
