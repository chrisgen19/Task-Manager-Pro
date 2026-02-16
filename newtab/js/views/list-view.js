import { bus, Events } from '../event-bus.js';
import { PRIORITIES, STATUSES, PRIORITY_CLASSES, STATUS_CLASSES, updateTask, sortTasks } from '../task-model.js';

let currentSort = { field: 'created', direction: 'desc' };

export function initListView(container, tasks) {
  const sorted = sortTasks(tasks, currentSort.field, currentSort.direction);

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="12" y="8" width="40" height="48" rx="4"/>
          <line x1="22" y1="20" x2="42" y2="20"/><line x1="22" y1="28" x2="42" y2="28"/>
          <line x1="22" y1="36" x2="34" y2="36"/>
        </svg>
        <h3>No tasks yet</h3>
        <p>Press <kbd>N</kbd> or click "New Task" to create one.</p>
      </div>
    `;
    return;
  }

  const sortIcon = (field) => {
    if (currentSort.field !== field) return '';
    return currentSort.direction === 'asc' ? ' &#9650;' : ' &#9660;';
  };

  container.innerHTML = `
    <div class="list-view">
      <table class="task-table">
        <thead>
          <tr>
            <th class="col-priority sortable" data-sort="priority">Priority${sortIcon('priority')}</th>
            <th class="col-title sortable" data-sort="title">Title${sortIcon('title')}</th>
            <th class="col-status sortable" data-sort="status">Status${sortIcon('status')}</th>
            <th class="col-due sortable" data-sort="dueDate">Due Date${sortIcon('dueDate')}</th>
            <th class="col-created sortable" data-sort="created">Created${sortIcon('created')}</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(task => renderRow(task)).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Sortable column headers
  container.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }
      bus.emit(Events.TASKS_CHANGED, null);
    });
  });

  // Inline status editing
  container.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const taskId = e.target.dataset.taskId;
      updateTask(taskId, { status: parseInt(e.target.value) });
    });
    // Prevent row click when using select
    select.addEventListener('click', (e) => e.stopPropagation());
  });

  // Row click to edit
  container.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('select')) return;
      bus.emit(Events.MODAL_OPEN, { id: row.dataset.taskId });
    });
  });
}

function renderRow(task) {
  const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—';
  const createdStr = new Date(task.created).toLocaleDateString();
  const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 4;
  const jiraLink = task.jiraUrl
    ? `<a href="${escapeHtml(task.jiraUrl)}" target="_blank" rel="noopener" class="task-jira-link" title="Open in Jira">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7"/><path d="M7 1h4v4"/><path d="M5 7L11 1"/></svg>
       </a>`
    : '';

  return `
    <tr class="task-row" data-task-id="${task.id}">
      <td><span class="badge ${PRIORITY_CLASSES[task.priority]}">${PRIORITIES[task.priority]}</span></td>
      <td class="cell-title">
        <span>${escapeHtml(task.title)}</span>
        ${jiraLink}
      </td>
      <td>
        <select class="status-select ${STATUS_CLASSES[task.status]}" data-task-id="${task.id}">
          ${STATUSES.map((s, i) => `<option value="${i}" ${i === task.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td class="${isOverdue ? 'overdue' : ''}">${dueStr}</td>
      <td class="cell-date">${createdStr}</td>
      <td></td>
    </tr>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
