import { bus, Events } from '../event-bus.js';
import { createTask, updateTask, deleteTask, getTaskById, PRIORITIES, STATUSES } from '../task-model.js';

let editingTaskId = null;

export function initTaskModal() {
  const overlay = document.getElementById('task-modal');
  const form = document.getElementById('task-form');
  const titleEl = document.getElementById('modal-title');
  const closeBtn = overlay.querySelector('.modal-close');
  const cancelBtn = overlay.querySelector('.modal-cancel');

  function openModal(data = {}) {
    editingTaskId = data.id || null;
    titleEl.textContent = editingTaskId ? 'Edit Task' : 'New Task';

    if (editingTaskId) {
      const task = getTaskById(editingTaskId);
      if (!task) return;
      form.title.value = task.title;
      form.jiraUrl.value = task.jiraUrl || '';
      form.description.value = task.description || '';
      form.priority.value = task.priority;
      form.status.value = task.status;
      form.dueDate.value = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

      // Show delete button for editing
      addDeleteButton();
    } else {
      form.reset();
      // Pre-fill status if provided (e.g., from kanban column)
      if (data.status !== undefined) {
        form.status.value = data.status;
      }
      // Pre-fill due date if provided (e.g., from calendar click)
      if (data.dueDate) {
        form.dueDate.value = data.dueDate;
      }
      removeDeleteButton();
    }

    overlay.hidden = false;
    form.title.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    editingTaskId = null;
    form.reset();
    removeDeleteButton();
  }

  function addDeleteButton() {
    if (form.querySelector('.btn-delete')) return;
    const footer = form.querySelector('.modal-footer');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger btn-delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      if (editingTaskId && confirm('Delete this task?')) {
        deleteTask(editingTaskId);
        closeModal();
      }
    });
    footer.insertBefore(btn, footer.firstChild);
  }

  function removeDeleteButton() {
    const btn = form.querySelector('.btn-delete');
    if (btn) btn.remove();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;

    const data = {
      title,
      jiraUrl: form.jiraUrl.value.trim(),
      description: form.description.value.trim(),
      priority: parseInt(form.priority.value),
      status: parseInt(form.status.value),
      dueDate: form.dueDate.value ? new Date(form.dueDate.value).getTime() : null,
    };

    if (editingTaskId) {
      updateTask(editingTaskId, data);
    } else {
      createTask(data);
    }

    closeModal();
  });

  // Ctrl+Enter to save
  form.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  bus.on(Events.MODAL_OPEN, openModal);
  bus.on(Events.MODAL_CLOSE, closeModal);
}
