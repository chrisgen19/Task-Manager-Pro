class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (err) {
          console.error(`EventBus error in "${event}" handler:`, err);
        }
      }
    }
  }
}

export const bus = new EventBus();

// Event name constants
export const Events = {
  TASKS_LOADED: 'tasks:loaded',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASKS_CHANGED: 'tasks:changed',

  VIEW_CHANGE: 'view:change',
  FILTER_CHANGE: 'filter:change',
  SEARCH_CHANGE: 'search:change',

  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',

  THEME_TOGGLE: 'theme:toggle',
  STORAGE_USAGE: 'storage:usage',
};
