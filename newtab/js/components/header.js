import { bus, Events } from '../event-bus.js';

const VIEW_TABS = [
  { key: 'list', label: 'List', icon: 'list' },
  { key: 'kanban', label: 'Kanban', icon: 'kanban' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'timeline', label: 'Timeline', icon: 'timeline' },
];

const ICONS = {
  list: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>`,
  kanban: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="2" width="4" height="12" rx="1"/><rect x="6" y="2" width="4" height="8" rx="1"/><rect x="11" y="2" width="4" height="10" rx="1"/></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="3" width="14" height="12" rx="1.5"/><line x1="1" y1="7" x2="15" y2="7"/><line x1="5" y1="1" x2="5" y2="4"/><line x1="11" y1="1" x2="11" y2="4"/></svg>`,
  timeline: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="2" width="8" height="3" rx="1" fill="currentColor" opacity="0.3"/><rect x="5" y="7" width="10" height="3" rx="1" fill="currentColor" opacity="0.3"/><rect x="1" y="12" width="6" height="3" rx="1" fill="currentColor" opacity="0.3"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>`,
};

let activeTab = 'list';

export function initHeader() {
  const header = document.getElementById('header');

  header.innerHTML = `
    <div class="header-brand">
      <svg class="brand-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-todo)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
      <span class="brand-name">Task Manager Pro</span>
    </div>

    <div class="header-search">
      <span class="search-icon">${ICONS.search}</span>
      <input type="text" id="search-input" placeholder="Search tasks..." autocomplete="off">
    </div>

    <nav class="header-tabs" role="tablist">
      ${VIEW_TABS.map(tab => `
        <button class="tab-btn ${tab.key === activeTab ? 'active' : ''}"
                data-view="${tab.key}"
                role="tab"
                aria-selected="${tab.key === activeTab}"
                title="${tab.label} (${VIEW_TABS.indexOf(tab) + 1})">
          ${ICONS[tab.icon]}
          <span class="tab-label">${tab.label}</span>
        </button>
      `).join('')}
    </nav>

    <button class="btn btn-primary btn-new-task" id="btn-new-task">
      ${ICONS.plus}
      <span>New Task</span>
    </button>
  `;

  // Tab clicks
  header.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bus.emit(Events.VIEW_CHANGE, btn.dataset.view);
    });
  });

  // Search
  let searchTimer;
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      bus.emit(Events.SEARCH_CHANGE, searchInput.value.trim());
    }, 200);
  });

  // New task
  document.getElementById('btn-new-task').addEventListener('click', () => {
    bus.emit(Events.MODAL_OPEN, {});
  });

  // Update active tab on view change
  bus.on(Events.VIEW_CHANGE, (view) => {
    activeTab = view;
    header.querySelectorAll('.tab-btn').forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
  });
}
