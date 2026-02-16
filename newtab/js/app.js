import { bus, Events } from './event-bus.js';
import * as TaskModel from './task-model.js';
import { initHeader } from './components/header.js';
import { initSidebar } from './components/sidebar.js';
import { initTaskModal } from './components/task-modal.js';
import { initListView } from './views/list-view.js';
import { initKanbanView } from './views/kanban-view.js';
import { initCalendarView } from './views/calendar-view.js';
import { initTimelineView } from './views/timeline-view.js';

const views = {
  list: { init: initListView, label: 'List' },
  kanban: { init: initKanbanView, label: 'Kanban' },
  calendar: { init: initCalendarView, label: 'Calendar' },
  timeline: { init: initTimelineView, label: 'Timeline' },
};

let currentView = null;
let currentViewDestroy = null;

// Filters state
let filters = { search: '', priority: -1, status: -1 };

function switchView(viewName) {
  if (currentView === viewName) return;
  if (currentViewDestroy) {
    currentViewDestroy();
    currentViewDestroy = null;
  }

  const main = document.getElementById('main-content');
  main.innerHTML = '';
  currentView = viewName;

  const tasks = getFilteredTasks();
  const result = views[viewName].init(main, tasks);
  if (typeof result === 'function') {
    currentViewDestroy = result;
  }

  localStorage.setItem('tm_view', viewName);
}

function getFilteredTasks() {
  return TaskModel.filterTasks(filters);
}

function refreshView() {
  if (!currentView) return;
  const main = document.getElementById('main-content');
  if (currentViewDestroy) {
    currentViewDestroy();
    currentViewDestroy = null;
  }
  main.innerHTML = '';
  const tasks = getFilteredTasks();
  const result = views[currentView].init(main, tasks);
  if (typeof result === 'function') {
    currentViewDestroy = result;
  }
}

// Apply saved theme
function initTheme() {
  const saved = localStorage.getItem('tm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case 'n':
      case 'N':
        e.preventDefault();
        bus.emit(Events.MODAL_OPEN, {});
        break;
      case '1':
        bus.emit(Events.VIEW_CHANGE, 'list');
        break;
      case '2':
        bus.emit(Events.VIEW_CHANGE, 'kanban');
        break;
      case '3':
        bus.emit(Events.VIEW_CHANGE, 'calendar');
        break;
      case '4':
        bus.emit(Events.VIEW_CHANGE, 'timeline');
        break;
      case 'Escape':
        bus.emit(Events.MODAL_CLOSE);
        break;
    }
  });
}

async function main() {
  initTheme();

  await TaskModel.init();

  initHeader();
  initSidebar();
  initTaskModal();
  initKeyboardShortcuts();

  // Event listeners
  bus.on(Events.VIEW_CHANGE, switchView);
  bus.on(Events.TASKS_CHANGED, refreshView);
  bus.on(Events.FILTER_CHANGE, (newFilters) => {
    filters = { ...filters, ...newFilters };
    refreshView();
  });
  bus.on(Events.SEARCH_CHANGE, (search) => {
    filters.search = search;
    refreshView();
  });
  bus.on(Events.THEME_TOGGLE, () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tm_theme', next);
  });

  // Restore last view or default to list
  const savedView = localStorage.getItem('tm_view') || 'list';
  switchView(savedView);
  bus.emit(Events.VIEW_CHANGE, savedView); // Sync header tabs
}

main();
