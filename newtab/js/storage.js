import { bus, Events } from './event-bus.js';

const CHUNK_PREFIX = 'tm_tasks_';
const CHUNK_SIZE = 7000; // ~7KB per chunk to stay safe under 8KB QUOTA_BYTES_PER_ITEM
const META_KEY = 'tm_meta';
const DEBOUNCE_MS = 500;

let _saveTimer = null;
let _taskCache = [];

// Compact serialization: short keys to minimize storage usage
function serialize(task) {
  const o = {
    i: task.id,
    t: task.title,
    p: task.priority,
    s: task.status,
    c: task.created,
  };
  if (task.description) o.d = task.description;
  if (task.jiraUrl) o.j = task.jiraUrl;
  if (task.dueDate) o.u = task.dueDate;
  return o;
}

function deserialize(o) {
  return {
    id: o.i,
    title: o.t,
    priority: o.p,
    status: o.s,
    created: o.c,
    description: o.d || '',
    jiraUrl: o.j || '',
    dueDate: o.u || null,
  };
}

function chunkArray(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks.length ? chunks : ['[]'];
}

export async function loadTasks() {
  try {
    const meta = await chrome.storage.sync.get(META_KEY);
    const chunkCount = meta[META_KEY]?.chunks || 0;

    if (chunkCount === 0) {
      _taskCache = [];
      bus.emit(Events.TASKS_LOADED, []);
      updateStorageUsage();
      return [];
    }

    const keys = Array.from({ length: chunkCount }, (_, i) => `${CHUNK_PREFIX}${i}`);
    const data = await chrome.storage.sync.get(keys);

    const json = keys.map(k => data[k] || '').join('');
    const raw = JSON.parse(json);
    _taskCache = raw.map(deserialize);

    bus.emit(Events.TASKS_LOADED, _taskCache);
    updateStorageUsage();
    return _taskCache;
  } catch (err) {
    console.error('Failed to load tasks:', err);
    _taskCache = [];
    bus.emit(Events.TASKS_LOADED, []);
    return [];
  }
}

export function saveTasks(tasks) {
  _taskCache = tasks;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => _persistTasks(tasks), DEBOUNCE_MS);
}

async function _persistTasks(tasks) {
  try {
    // Get current chunk count to clean up old chunks
    const meta = await chrome.storage.sync.get(META_KEY);
    const oldChunkCount = meta[META_KEY]?.chunks || 0;

    const json = JSON.stringify(tasks.map(serialize));
    const chunks = chunkArray(json, CHUNK_SIZE);

    const data = {};
    chunks.forEach((chunk, i) => {
      data[`${CHUNK_PREFIX}${i}`] = chunk;
    });
    data[META_KEY] = { chunks: chunks.length, updated: Date.now() };

    // Remove stale chunks if we now have fewer
    const keysToRemove = [];
    for (let i = chunks.length; i < oldChunkCount; i++) {
      keysToRemove.push(`${CHUNK_PREFIX}${i}`);
    }

    await chrome.storage.sync.set(data);
    if (keysToRemove.length) {
      await chrome.storage.sync.remove(keysToRemove);
    }

    updateStorageUsage();
  } catch (err) {
    console.error('Failed to save tasks:', err);
  }
}

async function updateStorageUsage() {
  try {
    const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
    const quota = chrome.storage.sync.QUOTA_BYTES || 102400;
    bus.emit(Events.STORAGE_USAGE, { bytesInUse, quota });
  } catch {
    // Ignore
  }
}

export function getCachedTasks() {
  return _taskCache;
}

// Listen for changes from other tabs/devices
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  const hasTaskChanges = Object.keys(changes).some(
    k => k.startsWith(CHUNK_PREFIX) || k === META_KEY
  );
  if (hasTaskChanges) {
    loadTasks().then(tasks => {
      bus.emit(Events.TASKS_CHANGED, tasks);
    });
  }
});
