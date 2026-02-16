import { bus, Events } from './event-bus.js';
import { loadTasks, saveTasks, getCachedTasks } from './storage.js';

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

export const PRIORITY_CLASSES = ['priority-low', 'priority-medium', 'priority-high', 'priority-critical'];
export const STATUS_CLASSES = ['status-backlog', 'status-todo', 'status-in-progress', 'status-review', 'status-done'];

let _tasks = [];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function init() {
  _tasks = await loadTasks();
  return _tasks;
}

export function getAllTasks() {
  return [..._tasks];
}

export function getTaskById(id) {
  return _tasks.find(t => t.id === id) || null;
}

export function createTask({ title, description = '', jiraUrl = '', priority = 1, status = 1, dueDate = null }) {
  const task = {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    jiraUrl: jiraUrl.trim(),
    priority: Number(priority),
    status: Number(status),
    created: Date.now(),
    dueDate: dueDate || null,
  };
  _tasks.unshift(task);
  saveTasks(_tasks);
  bus.emit(Events.TASK_CREATED, task);
  bus.emit(Events.TASKS_CHANGED, _tasks);
  return task;
}

export function updateTask(id, updates) {
  const idx = _tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;

  const task = { ..._tasks[idx], ...updates };
  // Ensure numeric types
  task.priority = Number(task.priority);
  task.status = Number(task.status);
  _tasks[idx] = task;
  saveTasks(_tasks);
  bus.emit(Events.TASK_UPDATED, task);
  bus.emit(Events.TASKS_CHANGED, _tasks);
  return task;
}

export function deleteTask(id) {
  const idx = _tasks.findIndex(t => t.id === id);
  if (idx === -1) return false;

  const [task] = _tasks.splice(idx, 1);
  saveTasks(_tasks);
  bus.emit(Events.TASK_DELETED, task);
  bus.emit(Events.TASKS_CHANGED, _tasks);
  return true;
}

export function filterTasks({ search = '', priority = -1, status = -1 } = {}) {
  let result = _tasks;

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  }

  if (priority >= 0) {
    result = result.filter(t => t.priority === priority);
  }

  if (status >= 0) {
    result = result.filter(t => t.status === status);
  }

  return result;
}

export function sortTasks(tasks, field = 'created', direction = 'desc') {
  const sorted = [...tasks];
  const dir = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let va = a[field];
    let vb = b[field];

    // Handle null due dates
    if (field === 'dueDate') {
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
    }

    if (typeof va === 'string') {
      return va.localeCompare(vb) * dir;
    }
    return ((va || 0) - (vb || 0)) * dir;
  });

  return sorted;
}

// Sync cache when storage updates from other tabs
bus.on(Events.TASKS_LOADED, (tasks) => {
  _tasks = tasks;
});
