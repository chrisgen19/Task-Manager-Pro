import { bus, Events } from '../event-bus.js';
import { createTask, updateTask, deleteTask, getTaskById } from '../task-model.js';

const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'p', 'br', 'div', 'span',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4',
  'a',
  'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'img',
]);

const ALLOWED_ATTRS = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node) {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: keep children, remove the tag itself
        while (child.firstChild) {
          node.insertBefore(child.firstChild, child);
        }
        node.removeChild(child);
        continue;
      }

      // Strip disallowed attributes
      const allowed = ALLOWED_ATTRS[tag] || [];
      const attrs = [...child.attributes];
      for (const attr of attrs) {
        if (!allowed.includes(attr.name)) {
          child.removeAttribute(attr.name);
        }
      }

      // Force links to open in new tab
      if (tag === 'a') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener');
      }

      sanitizeNode(child);
    } else {
      // Remove comments, processing instructions, etc.
      node.removeChild(child);
    }
  }
}

function stripHtmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

let editingTaskId = null;

export function initTaskModal() {
  const overlay = document.getElementById('task-modal');
  const form = document.getElementById('task-form');
  const titleEl = document.getElementById('modal-title');
  const closeBtn = overlay.querySelector('.modal-close');
  const cancelBtn = overlay.querySelector('.modal-cancel');

  const editor = document.getElementById('task-description');
  const preview = document.getElementById('desc-preview');
  const previewText = preview.querySelector('.desc-preview-text');

  // Sanitize on paste
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    if (html) {
      const clean = sanitizeHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (plain) {
      document.execCommand('insertText', false, plain);
    }
  });

  function getEditorContent() {
    return editor.innerHTML.trim() === '<br>' ? '' : editor.innerHTML.trim();
  }

  function setEditorContent(html) {
    editor.innerHTML = html || '';
  }

  function showDescPreview(html) {
    editor.hidden = true;
    preview.hidden = false;
    if (html && stripHtmlToText(html).trim()) {
      previewText.innerHTML = sanitizeHtml(html);
      preview.classList.remove('desc-preview-empty');
    } else {
      previewText.textContent = 'No description';
      preview.classList.add('desc-preview-empty');
    }
  }

  function showDescEditor() {
    preview.hidden = true;
    editor.hidden = false;
    editor.focus();
  }

  preview.addEventListener('click', showDescEditor);

  editor.addEventListener('blur', () => {
    if (editingTaskId) {
      showDescPreview(getEditorContent());
    }
  });

  function openModal(data = {}) {
    editingTaskId = data.id || null;
    titleEl.textContent = editingTaskId ? 'Edit Task' : 'New Task';

    if (editingTaskId) {
      const task = getTaskById(editingTaskId);
      if (!task) return;
      form.title.value = task.title;
      form.jiraUrl.value = task.jiraUrl || '';
      setEditorContent(task.description || '');
      form.priority.value = task.priority;
      form.status.value = task.status;
      form.dueDate.value = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

      showDescPreview(task.description || '');
      addDeleteButton();
    } else {
      form.reset();
      setEditorContent('');
      preview.hidden = true;
      editor.hidden = false;

      if (data.status !== undefined) {
        form.status.value = data.status;
      }
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
    setEditorContent('');
    preview.hidden = true;
    editor.hidden = false;
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
      description: getEditorContent(),
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

  form.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  bus.on(Events.MODAL_OPEN, openModal);
  bus.on(Events.MODAL_CLOSE, closeModal);
}
