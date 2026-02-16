import { bus, Events } from '../event-bus.js';
import { STATUSES, STATUS_CLASSES, updateTask } from '../task-model.js';
import { createTaskCard } from '../components/task-card.js';

export function initKanbanView(container, tasks) {
  const board = document.createElement('div');
  board.className = 'kanban-board';

  STATUSES.forEach((statusName, statusIdx) => {
    const columnTasks = tasks.filter(t => t.status === statusIdx);

    const col = document.createElement('div');
    col.className = `kanban-column ${STATUS_CLASSES[statusIdx]}`;
    col.dataset.status = statusIdx;

    col.innerHTML = `
      <div class="kanban-column-header">
        <span class="kanban-column-dot ${STATUS_CLASSES[statusIdx]}"></span>
        <h3 class="kanban-column-title">${statusName}</h3>
        <span class="kanban-column-count">${columnTasks.length}</span>
        <button class="kanban-add-btn" data-status="${statusIdx}" title="Add task to ${statusName}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/>
          </svg>
        </button>
      </div>
      <div class="kanban-cards" data-status="${statusIdx}"></div>
    `;

    const cardsContainer = col.querySelector('.kanban-cards');

    if (columnTasks.length === 0) {
      cardsContainer.innerHTML = `<div class="kanban-empty">No tasks</div>`;
    } else {
      columnTasks.forEach(task => {
        cardsContainer.appendChild(createTaskCard(task));
      });
    }

    // Drag-and-drop on column
    setupDropZone(cardsContainer, statusIdx);

    // Add button
    col.querySelector('.kanban-add-btn').addEventListener('click', () => {
      bus.emit(Events.MODAL_OPEN, { status: statusIdx });
    });

    board.appendChild(col);
  });

  container.appendChild(board);
}

function setupDropZone(zone, statusIdx) {
  let dropIndicator = null;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');

    // Position indicator
    const cards = [...zone.querySelectorAll('.task-card:not(.dragging)')];
    const afterCard = getClosestCard(zone, e.clientY, cards);

    if (!dropIndicator) {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'drop-indicator';
    }

    if (afterCard) {
      zone.insertBefore(dropIndicator, afterCard);
    } else {
      zone.appendChild(dropIndicator);
    }
  });

  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('drag-over');
      if (dropIndicator && dropIndicator.parentNode) {
        dropIndicator.remove();
      }
    }
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (dropIndicator && dropIndicator.parentNode) {
      dropIndicator.remove();
    }

    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTask(taskId, { status: statusIdx });
    }
  });
}

function getClosestCard(zone, y, cards) {
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  for (const card of cards) {
    const box = card.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = card;
    }
  }
  return closest;
}
