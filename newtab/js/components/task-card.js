import { bus, Events } from '../event-bus.js';
import { PRIORITIES, STATUSES, PRIORITY_CLASSES, STATUS_CLASSES } from '../task-model.js';

export function createTaskCard(task, options = {}) {
  const { compact = false } = options;

  const card = document.createElement('div');
  card.className = `task-card ${PRIORITY_CLASSES[task.priority]}`;
  card.dataset.taskId = task.id;
  card.draggable = true;

  const dueDateStr = task.dueDate ? formatDate(task.dueDate) : '';
  const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 4;
  const jiraLink = task.jiraUrl
    ? `<a class="task-jira-link" href="${escapeHtml(task.jiraUrl)}" target="_blank" rel="noopener" title="Open in Jira">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7"/><path d="M7 1h4v4"/><path d="M5 7L11 1"/></svg>
       </a>`
    : '';

  if (compact) {
    card.innerHTML = `
      <div class="card-priority-stripe"></div>
      <span class="card-title">${escapeHtml(task.title)}</span>
      ${jiraLink}
    `;
  } else {
    card.innerHTML = `
      <div class="card-priority-stripe"></div>
      <div class="card-content">
        <div class="card-header">
          <span class="card-title">${escapeHtml(task.title)}</span>
          ${jiraLink}
        </div>
        ${task.description ? `<p class="card-desc">${truncateDesc(task.description, 100)}</p>` : ''}
        <div class="card-meta">
          <span class="badge ${PRIORITY_CLASSES[task.priority]}">${PRIORITIES[task.priority]}</span>
          ${dueDateStr ? `<span class="card-due ${isOverdue ? 'overdue' : ''}">${dueDateStr}</span>` : ''}
        </div>
      </div>
    `;
  }

  // Click to edit
  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // Don't open modal when clicking links
    bus.emit(Events.MODAL_OPEN, { id: task.id });
  });

  // Drag events
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  return card;
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';

  const month = d.toLocaleString('default', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}`;
}

function truncateDesc(html, max) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent || '';
  const truncated = text.length > max ? text.substring(0, max) + '...' : text;
  return escapeHtml(truncated);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
