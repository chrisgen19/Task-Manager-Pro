import { bus, Events } from '../event-bus.js';
import { PRIORITY_CLASSES, PRIORITIES } from '../task-model.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_CHIPS = 3;

let currentDate = new Date();

export function initCalendarView(container, tasks) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // Group tasks by day-of-month
  const tasksByDay = {};
  tasks.forEach(task => {
    if (!task.dueDate) return;
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  });

  const calendarEl = document.createElement('div');
  calendarEl.className = 'calendar-view';

  // Navigation
  const nav = document.createElement('div');
  nav.className = 'calendar-nav';
  nav.innerHTML = `
    <button class="btn btn-ghost calendar-nav-btn" id="cal-prev">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 3L5 8l5 5"/></svg>
    </button>
    <h2 class="calendar-month-title">${MONTH_NAMES[month]} ${year}</h2>
    <button class="btn btn-ghost calendar-nav-btn" id="cal-next">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3l5 5-5 5"/></svg>
    </button>
    <button class="btn btn-secondary btn-sm" id="cal-today">Today</button>
  `;
  calendarEl.appendChild(nav);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Day headers
  DAY_NAMES.forEach(name => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = name;
    grid.appendChild(header);
  });

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell calendar-cell-empty';
    grid.appendChild(empty);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    const cellDateStr = `${year}-${month}-${day}`;
    const isToday = cellDateStr === todayStr;
    cell.className = `calendar-cell ${isToday ? 'calendar-cell-today' : ''}`;
    cell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dayNum = document.createElement('div');
    dayNum.className = 'calendar-day-number';
    dayNum.textContent = day;
    cell.appendChild(dayNum);

    const dayTasks = tasksByDay[day] || [];
    const chipContainer = document.createElement('div');
    chipContainer.className = 'calendar-chips';

    dayTasks.slice(0, MAX_CHIPS).forEach(task => {
      const chip = document.createElement('div');
      chip.className = `calendar-chip ${PRIORITY_CLASSES[task.priority]}`;
      chip.textContent = task.title.length > 18 ? task.title.substring(0, 16) + '...' : task.title;
      chip.title = task.title;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        bus.emit(Events.MODAL_OPEN, { id: task.id });
      });
      chipContainer.appendChild(chip);
    });

    if (dayTasks.length > MAX_CHIPS) {
      const more = document.createElement('div');
      more.className = 'calendar-chip-more';
      more.textContent = `+${dayTasks.length - MAX_CHIPS} more`;
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        showPopover(cell, dayTasks, day);
      });
      chipContainer.appendChild(more);
    }

    cell.appendChild(chipContainer);

    // Click on day to create task
    cell.addEventListener('click', () => {
      bus.emit(Events.MODAL_OPEN, { dueDate: cell.dataset.date });
    });

    grid.appendChild(cell);
  }

  // Fill remaining cells in last row
  const totalCells = startOffset + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remaining; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell calendar-cell-empty';
    grid.appendChild(empty);
  }

  calendarEl.appendChild(grid);
  container.appendChild(calendarEl);

  // Nav handlers
  document.getElementById('cal-prev').addEventListener('click', () => {
    currentDate = new Date(year, month - 1, 1);
    bus.emit(Events.TASKS_CHANGED, null);
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    currentDate = new Date(year, month + 1, 1);
    bus.emit(Events.TASKS_CHANGED, null);
  });

  document.getElementById('cal-today').addEventListener('click', () => {
    currentDate = new Date();
    bus.emit(Events.TASKS_CHANGED, null);
  });
}

function showPopover(anchor, tasks, day) {
  // Remove any existing popover
  document.querySelectorAll('.calendar-popover').forEach(p => p.remove());

  const popover = document.createElement('div');
  popover.className = 'calendar-popover';
  popover.innerHTML = `
    <div class="popover-header">
      <strong>Tasks for day ${day}</strong>
      <button class="popover-close">&times;</button>
    </div>
    <div class="popover-list">
      ${tasks.map(t => `
        <div class="popover-item ${PRIORITY_CLASSES[t.priority]}" data-task-id="${t.id}">
          <span class="popover-dot ${PRIORITY_CLASSES[t.priority]}"></span>
          ${escapeHtml(t.title)}
        </div>
      `).join('')}
    </div>
  `;

  anchor.style.position = 'relative';
  anchor.appendChild(popover);

  popover.querySelector('.popover-close').addEventListener('click', (e) => {
    e.stopPropagation();
    popover.remove();
  });

  popover.querySelectorAll('.popover-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      bus.emit(Events.MODAL_OPEN, { id: item.dataset.taskId });
      popover.remove();
    });
  });

  // Close popover on outside click
  const closeHandler = (e) => {
    if (!popover.contains(e.target)) {
      popover.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
