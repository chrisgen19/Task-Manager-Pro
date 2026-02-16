import { bus, Events } from '../event-bus.js';
import { getAllTasks, PRIORITIES, STATUSES, PRIORITY_CLASSES, STATUS_CLASSES } from '../task-model.js';

export function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  let currentFilters = { priority: -1, status: -1 };

  function render() {
    const tasks = getAllTasks();
    const totalTasks = tasks.length;

    // Count by status
    const statusCounts = STATUSES.map((_, i) => tasks.filter(t => t.status === i).length);
    // Count by priority
    const priorityCounts = PRIORITIES.map((_, i) => tasks.filter(t => t.priority === i).length);

    // Overdue count
    const now = Date.now();
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 4).length;

    sidebar.innerHTML = `
      <div class="sidebar-section">
        <h3 class="sidebar-title">Overview</h3>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-value">${totalTasks}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${statusCounts[4]}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${statusCounts[2]}</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat-card ${overdue > 0 ? 'stat-alert' : ''}">
            <span class="stat-value">${overdue}</span>
            <span class="stat-label">Overdue</span>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-title">Filter by Priority</h3>
        <div class="filter-list">
          <button class="filter-btn ${currentFilters.priority === -1 ? 'active' : ''}" data-filter="priority" data-value="-1">
            <span class="filter-dot" style="background: var(--text-tertiary)"></span>
            All
            <span class="filter-count">${totalTasks}</span>
          </button>
          ${PRIORITIES.map((name, i) => `
            <button class="filter-btn ${currentFilters.priority === i ? 'active' : ''}" data-filter="priority" data-value="${i}">
              <span class="filter-dot ${PRIORITY_CLASSES[i]}"></span>
              ${name}
              <span class="filter-count">${priorityCounts[i]}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-title">Filter by Status</h3>
        <div class="filter-list">
          <button class="filter-btn ${currentFilters.status === -1 ? 'active' : ''}" data-filter="status" data-value="-1">
            <span class="filter-dot" style="background: var(--text-tertiary)"></span>
            All
            <span class="filter-count">${totalTasks}</span>
          </button>
          ${STATUSES.map((name, i) => `
            <button class="filter-btn ${currentFilters.status === i ? 'active' : ''}" data-filter="status" data-value="${i}">
              <span class="filter-dot ${STATUS_CLASSES[i]}"></span>
              ${name}
              <span class="filter-count">${statusCounts[i]}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="sidebar-section sidebar-section-bottom">
        <h3 class="sidebar-title">Storage</h3>
        <div class="storage-meter" id="storage-meter">
          <div class="storage-bar">
            <div class="storage-bar-fill" style="width: 0%"></div>
          </div>
          <span class="storage-label">Calculating...</span>
        </div>
        <button class="btn btn-ghost btn-theme-toggle" id="btn-theme-toggle">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <circle cx="8" cy="8" r="3.5"/>
            <line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/>
            <line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/>
            <line x1="3.05" y1="3.05" x2="4.46" y2="4.46"/>
            <line x1="11.54" y1="11.54" x2="12.95" y2="12.95"/>
            <line x1="3.05" y1="12.95" x2="4.46" y2="11.54"/>
            <line x1="11.54" y1="4.46" x2="12.95" y2="3.05"/>
          </svg>
          <span>Toggle Theme</span>
        </button>
      </div>
    `;

    // Filter click handlers
    sidebar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        const value = parseInt(btn.dataset.value);
        currentFilters[filter] = value;
        bus.emit(Events.FILTER_CHANGE, { [filter]: value });
        render();
      });
    });

    // Theme toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      bus.emit(Events.THEME_TOGGLE);
    });
  }

  render();

  bus.on(Events.TASKS_CHANGED, render);

  bus.on(Events.STORAGE_USAGE, ({ bytesInUse, quota }) => {
    const meter = document.getElementById('storage-meter');
    if (!meter) return;
    const pct = Math.round((bytesInUse / quota) * 100);
    const fill = meter.querySelector('.storage-bar-fill');
    const label = meter.querySelector('.storage-label');
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${(bytesInUse / 1024).toFixed(1)}KB / ${(quota / 1024).toFixed(0)}KB (${pct}%)`;
  });
}
