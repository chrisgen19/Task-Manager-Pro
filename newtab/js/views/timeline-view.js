import { bus, Events } from '../event-bus.js';
import { PRIORITIES, PRIORITY_CLASSES, STATUS_CLASSES, STATUSES } from '../task-model.js';

const ZOOM_LEVELS = {
  day: { label: 'Day', cellWidth: 40, format: formatDay },
  week: { label: 'Week', cellWidth: 100, format: formatWeek },
  month: { label: 'Month', cellWidth: 160, format: formatMonth },
};

let currentZoom = 'week';

export function initTimelineView(container, tasks) {
  // Filter tasks that have either created + dueDate for a bar, or just created for a point
  const timelineTasks = tasks.filter(t => t.created);

  if (timelineTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="32" x2="56" y2="32"/>
          <rect x="16" y="16" width="20" height="8" rx="4"/>
          <rect x="28" y="40" width="16" height="8" rx="4"/>
        </svg>
        <h3>No tasks to display</h3>
        <p>Create tasks with due dates to see them on the timeline.</p>
      </div>
    `;
    return;
  }

  // Determine date range
  const allDates = [];
  timelineTasks.forEach(t => {
    allDates.push(t.created);
    if (t.dueDate) allDates.push(t.dueDate);
  });
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));

  // Add padding
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);

  const zoom = ZOOM_LEVELS[currentZoom];
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  const dayWidth = zoom.cellWidth / (currentZoom === 'day' ? 1 : currentZoom === 'week' ? 7 : 30);

  const timelineEl = document.createElement('div');
  timelineEl.className = 'timeline-view';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'timeline-toolbar';
  toolbar.innerHTML = `
    <div class="timeline-zoom-group">
      ${Object.entries(ZOOM_LEVELS).map(([key, val]) => `
        <button class="btn btn-sm ${key === currentZoom ? 'btn-primary' : 'btn-secondary'} zoom-btn" data-zoom="${key}">
          ${val.label}
        </button>
      `).join('')}
    </div>
    <span class="timeline-info">${timelineTasks.length} task${timelineTasks.length !== 1 ? 's' : ''}</span>
  `;
  timelineEl.appendChild(toolbar);

  // Main timeline container
  const wrapper = document.createElement('div');
  wrapper.className = 'timeline-wrapper';

  // Labels column
  const labels = document.createElement('div');
  labels.className = 'timeline-labels';
  timelineTasks.forEach(task => {
    const label = document.createElement('div');
    label.className = 'timeline-label';
    label.innerHTML = `
      <span class="timeline-label-dot ${PRIORITY_CLASSES[task.priority]}"></span>
      <span class="timeline-label-text" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
    `;
    label.addEventListener('click', () => {
      bus.emit(Events.MODAL_OPEN, { id: task.id });
    });
    labels.appendChild(label);
  });

  // Scroll area with bars
  const scrollArea = document.createElement('div');
  scrollArea.className = 'timeline-scroll-area';

  const totalWidth = totalDays * dayWidth;

  // Header (date columns)
  const headerRow = document.createElement('div');
  headerRow.className = 'timeline-header-row';
  headerRow.style.width = `${totalWidth}px`;

  const dateColumns = generateDateColumns(minDate, maxDate, currentZoom);
  dateColumns.forEach(col => {
    const el = document.createElement('div');
    el.className = `timeline-header-cell ${col.isToday ? 'today' : ''}`;
    el.style.width = `${col.days * dayWidth}px`;
    el.textContent = col.label;
    headerRow.appendChild(el);
  });
  scrollArea.appendChild(headerRow);

  // Bars area
  const barsArea = document.createElement('div');
  barsArea.className = 'timeline-bars';
  barsArea.style.width = `${totalWidth}px`;

  // Today marker
  const today = new Date();
  const todayOffset = (today - minDate) / (1000 * 60 * 60 * 24) * dayWidth;
  if (todayOffset >= 0 && todayOffset <= totalWidth) {
    const marker = document.createElement('div');
    marker.className = 'timeline-today-marker';
    marker.style.left = `${todayOffset}px`;
    barsArea.appendChild(marker);
  }

  // Task bars
  timelineTasks.forEach(task => {
    const row = document.createElement('div');
    row.className = 'timeline-bar-row';

    const startDate = new Date(task.created);
    const endDate = task.dueDate ? new Date(task.dueDate) : new Date(task.created + 86400000); // +1 day if no due date

    const startOffset = Math.max(0, (startDate - minDate) / (1000 * 60 * 60 * 24) * dayWidth);
    const barWidth = Math.max(dayWidth, (endDate - startDate) / (1000 * 60 * 60 * 24) * dayWidth);

    const bar = document.createElement('div');
    bar.className = `timeline-bar ${PRIORITY_CLASSES[task.priority]} ${STATUS_CLASSES[task.status]}`;
    bar.style.left = `${startOffset}px`;
    bar.style.width = `${barWidth}px`;
    bar.title = `${task.title}\n${PRIORITIES[task.priority]} | ${STATUSES[task.status]}`;

    bar.addEventListener('click', () => {
      bus.emit(Events.MODAL_OPEN, { id: task.id });
    });

    row.appendChild(bar);
    barsArea.appendChild(row);
  });

  scrollArea.appendChild(barsArea);

  wrapper.appendChild(labels);
  wrapper.appendChild(scrollArea);
  timelineEl.appendChild(wrapper);
  container.appendChild(timelineEl);

  // Synced scroll between labels and bars
  scrollArea.addEventListener('scroll', () => {
    labels.scrollTop = scrollArea.scrollTop;
  });

  // Zoom buttons
  toolbar.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentZoom = btn.dataset.zoom;
      bus.emit(Events.TASKS_CHANGED, null);
    });
  });

  // Scroll to today
  if (todayOffset > 0) {
    scrollArea.scrollLeft = todayOffset - scrollArea.clientWidth / 3;
  }
}

function generateDateColumns(minDate, maxDate, zoom) {
  const columns = [];
  const current = new Date(minDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (zoom === 'day') {
    while (current <= maxDate) {
      const isToday = current.toDateString() === today.toDateString();
      columns.push({
        label: `${current.getDate()} ${current.toLocaleString('default', { month: 'short' })}`,
        days: 1,
        isToday,
      });
      current.setDate(current.getDate() + 1);
    }
  } else if (zoom === 'week') {
    // Start from Monday
    const start = new Date(current);
    start.setDate(start.getDate() - start.getDay() + 1);
    const end = new Date(maxDate);

    while (start <= end) {
      const weekEnd = new Date(start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const isToday = today >= start && today <= weekEnd;
      columns.push({
        label: `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })}`,
        days: 7,
        isToday,
      });
      start.setDate(start.getDate() + 7);
    }
  } else {
    // Month view
    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    while (start <= maxDate) {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const isToday = today.getFullYear() === start.getFullYear() && today.getMonth() === start.getMonth();
      columns.push({
        label: start.toLocaleString('default', { month: 'long', year: 'numeric' }),
        days: daysInMonth,
        isToday,
      });
      start.setMonth(start.getMonth() + 1);
    }
  }

  return columns;
}

function formatDay(d) { return d.getDate(); }
function formatWeek(d) { return `W${getWeekNumber(d)}`; }
function formatMonth(d) { return d.toLocaleString('default', { month: 'short' }); }

function getWeekNumber(d) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
