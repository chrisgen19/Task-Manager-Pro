# Task Manager Pro

A Chrome extension that provides a full-page task manager with four views: List, Kanban, Calendar, and Timeline. Tasks persist across sessions using Chrome Sync Storage and sync across devices.

## Features

- **4 Views** — List (sortable table), Kanban (drag-and-drop board), Calendar (month grid), Timeline (Gantt-style)
- **4 Priority Levels** — Low (green), Medium (yellow), High (orange), Critical (red)
- **5 Kanban Columns** — Backlog, To Do, In Progress, Review, Done
- **Chrome Sync Storage** — Tasks persist across restarts and sync across devices
- **Dark/Light Theme** — Toggle between themes
- **Keyboard Shortcuts** — `N` new task, `1-4` switch views, `Esc` close modal, `Ctrl+Enter` save
- **Jira Integration** — Optional Jira URL field on each task

## Task Fields

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Task name |
| Description | No | Details or notes |
| Jira URL | No | Link to a Jira ticket |
| Priority | Yes | Low, Medium, High, Critical |
| Status | Yes | Backlog, To Do, In Progress, Review, Done |
| Due Date | No | Target completion date |
| Created | Auto | Set automatically on creation |

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `task-manager/` folder
5. The extension icon appears in the toolbar

## Usage

- **New tab** — Opening a new tab shows the task manager
- **Toolbar icon** — Click the extension icon to open (reuses existing tab if already open)
- **Create a task** — Click "New Task" or press `N`
- **Edit a task** — Click any task card or table row
- **Kanban drag-and-drop** — Drag cards between columns to change status
- **Calendar** — Click a day to create a task with that due date
- **Inline status edit** — Change status directly from the List view dropdown
- **Filter** — Use sidebar filters for priority/status, or the search bar for text search

## Architecture

```
newtab/
├── js/
│   ├── app.js               # Entry point, view routing, keyboard shortcuts
│   ├── event-bus.js          # Pub/sub for inter-module communication
│   ├── storage.js            # Chrome Sync Storage with chunking
│   ├── task-model.js         # Task CRUD, filtering, sorting
│   ├── components/
│   │   ├── header.js         # Search bar, view tabs, new task button
│   │   ├── sidebar.js        # Stats, filters, storage meter, theme toggle
│   │   ├── task-modal.js     # Create/edit/delete modal
│   │   └── task-card.js      # Reusable card component
│   └── views/
│       ├── list-view.js      # Sortable table with inline status editing
│       ├── kanban-view.js    # 5-column board with HTML5 drag-and-drop
│       ├── calendar-view.js  # Month grid with task chips and navigation
│       └── timeline-view.js  # Horizontal Gantt chart with zoom levels
└── css/
    ├── variables.css         # Design tokens, light/dark themes
    ├── base.css              # Reset, global styles
    ├── layout.css            # App shell grid
    ├── components.css        # Buttons, modals, forms, badges, cards
    ├── list-view.css
    ├── kanban-view.css
    ├── calendar-view.css
    └── timeline-view.css
```

**Data flow:** View → EventBus → TaskModel → Storage → EventBus → All Views re-render

### Storage Strategy

Chrome Sync Storage has a 100KB total limit and 8KB per-item limit. Tasks are serialized with compact single-character field names and split into ~7KB chunks (`tm_tasks_0`, `tm_tasks_1`, ...). Writes are debounced at 500ms to stay within the 120 writes/min rate limit. A `chrome.storage.onChanged` listener keeps multiple tabs in sync.

## Tech Stack

- Pure HTML, CSS, and JavaScript (ES Modules)
- No build tools, frameworks, or external dependencies
- Chrome Manifest V3

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Persist tasks in Chrome Sync Storage |
| `tabs` | Reuse existing tab when clicking toolbar icon |
