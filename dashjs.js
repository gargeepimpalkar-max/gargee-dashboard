'use strict';

const state = {
  darkMode: false,
  activeTab: 'notes',
  activeFilter: 'all',
  personalUnlocked: false,
  notes: [],
  tasks: [],
  events: {},
  editingNoteId: null,
  editingTaskId: null,
  editingEventIndex: null,
  selectedDate: null,
  selectedEventColor: '#4CAF50',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth()
};

const PASSCODE = 'GRATEFUL';

function save() {
  try {
    localStorage.setItem('zenith_notes',  JSON.stringify(state.notes));
    localStorage.setItem('zenith_tasks',  JSON.stringify(state.tasks));
    localStorage.setItem('zenith_events', JSON.stringify(state.events));
    localStorage.setItem('zenith_dark',   JSON.stringify(state.darkMode));
  } catch(e) {}
}

function load() {
  try {
    const n = localStorage.getItem('zenith_notes');
    const t = localStorage.getItem('zenith_tasks');
    const e = localStorage.getItem('zenith_events');
    const d = localStorage.getItem('zenith_dark');
    if (n) state.notes  = JSON.parse(n);
    if (t) state.tasks  = JSON.parse(t);
    if (e) state.events = JSON.parse(e);
    if (d) state.darkMode = JSON.parse(d);
  } catch(e) {}
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function dateKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('open'));
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  el.addEventListener('transitionend', () => el.classList.add('hidden'), { once: true });
}

function applyDark() {
  document.body.classList.toggle('dark', state.darkMode);
  document.getElementById('darkToggle').querySelector('.toggle-icon').textContent =
    state.darkMode ? '🌙' : '☀️';
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === state.activeTab) return;
      state.activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
      if (tab === 'calendar') renderCalendar();
    });
  });
}

function getNotesByFilter(filter) {
  if (filter === 'all') return state.notes;
  return state.notes.filter(n => n.category === filter);
}

function renderNotes() {
  const filter = state.activeFilter;
  const list   = document.getElementById('notesList');
  const fab    = document.getElementById('addNoteBtn');
  const pctrls = document.getElementById('personalControls');

  const isPersonal = filter === 'personal';
  fab.classList.toggle('hidden', isPersonal);
  pctrls.classList.toggle('hidden', !isPersonal);

  const notes = getNotesByFilter(filter);

  if (isPersonal && !state.personalUnlocked) {
    list.innerHTML = '';
    return;
  }

  if (notes.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No notes yet. Tap + to add one.</p></div>`;
    return;
  }

  list.innerHTML = '';
  notes.forEach(note => {
    if (!note || typeof note.text !== 'string' || typeof note.category !== 'string') return;
    list.appendChild(createNoteCard(note));
  });
}

function createNoteCard(note) {
  const div = document.createElement('div');
  div.className = 'note-card';
  div.dataset.id = note.id;

  const badgeClass = {
    personal: 'badge-personal',
    professional: 'badge-professional',
    watchlater: 'badge-watchlater'
  }[note.category] || 'badge-personal';

  const badgeLabel = {
    personal: '🔒 Personal',
    professional: 'Professional',
    watchlater: 'Watch Later'
  }[note.category] || note.category;

  div.innerHTML = `
    <div class="note-card-header">
      <span class="note-text">${escapeHtml(note.text)}</span>
      <span class="note-category-badge ${badgeClass}">${badgeLabel}</span>
    </div>
    <div class="note-actions">
      <button class="icon-btn edit-note-btn" title="Edit">✏️</button>
      <button class="icon-btn del del-note-btn" title="Delete">🗑️</button>
    </div>
    <div class="note-edit-area" id="note-edit-${note.id}">
      <textarea class="form-textarea" rows="3">${escapeHtml(note.text)}</textarea>
      <div class="form-actions">
        <button class="action-btn secondary cancel-edit-note">Cancel</button>
        <button class="action-btn primary save-edit-note">Save</button>
      </div>
    </div>
  `;

  div.querySelector('.edit-note-btn').addEventListener('click', () => {
    div.querySelector('.note-edit-area').classList.toggle('open');
  });
  div.querySelector('.cancel-edit-note').addEventListener('click', () => {
    div.querySelector('.note-edit-area').classList.remove('open');
  });
  div.querySelector('.save-edit-note').addEventListener('click', () => {
    const newText = div.querySelector('.note-edit-area textarea').value.trim();
    if (!newText) return;
    const idx = state.notes.findIndex(n => n.id === note.id);
    if (idx !== -1) { state.notes[idx].text = newText; save(); renderNotes(); }
  });
  div.querySelector('.del-note-btn').addEventListener('click', () => {
    state.notes = state.notes.filter(n => n.id !== note.id);
    save(); renderNotes();
  });

  return div;
}

function initNotes() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('noteFormContainer').classList.add('hidden');
      renderNotes();
    });
  });

  document.getElementById('addNoteBtn').addEventListener('click', () => {
    const form = document.getElementById('noteFormContainer');
    form.classList.remove('hidden');
    const cat = state.activeFilter === 'all' ? 'personal' : state.activeFilter;
    document.getElementById('noteCategorySelect').value = cat;
    document.getElementById('noteTextarea').value = '';
    document.getElementById('noteTextarea').focus();
  });

  document.getElementById('addNotePersonalBtn').addEventListener('click', () => {
    const form = document.getElementById('noteFormContainer');
    form.classList.remove('hidden');
    document.getElementById('noteCategorySelect').value = 'personal';
    document.getElementById('noteTextarea').value = '';
    document.getElementById('noteTextarea').focus();
  });

  document.getElementById('viewNotesBtn').addEventListener('click', () => {
    if (state.personalUnlocked) { renderNotes(); return; }
    document.getElementById('passcodeInput').value = '';
    document.getElementById('passcodeError').classList.add('hidden');
    openModal('passcodeModal');
  });

  document.getElementById('submitPasscode').addEventListener('click', submitPasscode);
  document.getElementById('passcodeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitPasscode();
  });

  document.getElementById('cancelNoteBtn').addEventListener('click', () => {
    document.getElementById('noteFormContainer').classList.add('hidden');
  });

  document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
  document.getElementById('noteTextarea').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) saveNote();
  });

  renderNotes();
}

function submitPasscode() {
  const val = document.getElementById('passcodeInput').value.trim().toUpperCase();
  if (val === PASSCODE) {
    state.personalUnlocked = true;
    closeModal('passcodeModal');
    renderNotes();
  } else {
    document.getElementById('passcodeError').classList.remove('hidden');
    document.getElementById('passcodeInput').value = '';
    document.getElementById('passcodeInput').focus();
  }
}

function saveNote() {
  const text = document.getElementById('noteTextarea').value.trim();
  const category = document.getElementById('noteCategorySelect').value;
  if (!text) return;
  state.notes.push({ id: genId(), text, category });
  save();
  document.getElementById('noteFormContainer').classList.add('hidden');
  renderNotes();
}

function renderTasks() {
  const list = document.getElementById('tasksList');
  if (state.tasks.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>No tasks yet. Add one above!</p></div>`;
    return;
  }
  list.innerHTML = '';
  state.tasks.forEach(task => {
    if (!task || typeof task.text !== 'string') return;
    list.appendChild(createTaskCard(task));
  });
}

function createTaskCard(task) {
  const div = document.createElement('div');
  div.className = `task-card priority-${task.priority || 'low'}`;
  div.dataset.id = task.id;

  const priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[task.priority] || '🟢 Low';

  div.innerHTML = `
    <div class="task-check ${task.done ? 'checked' : ''}" role="checkbox"></div>
    <div class="task-body">
      <div class="task-text ${task.done ? 'done' : ''}">${escapeHtml(task.text)}</div>
      <div class="task-priority-label">${priorityLabel}</div>
      <div class="task-edit-area" id="task-edit-${task.id}">
        <input class="form-input" type="text" value="${escapeHtml(task.text)}" />
        <select class="form-select edit-task-priority">
          <option value="low"    ${task.priority==='low'?'selected':''}>🟢 Low</option>
          <option value="medium" ${task.priority==='medium'?'selected':''}>🟡 Medium</option>
          <option value="high"   ${task.priority==='high'?'selected':''}>🔴 High</option>
        </select>
        <div class="form-actions">
          <button class="action-btn secondary cancel-edit-task">Cancel</button>
          <button class="action-btn primary save-edit-task">Save</button>
        </div>
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn edit-task-btn" title="Edit">✏️</button>
      <button class="icon-btn del del-task-btn" title="Delete">🗑️</button>
    </div>
  `;

  div.querySelector('.task-check').addEventListener('click', () => {
    const idx = state.tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) { state.tasks[idx].done = !state.tasks[idx].done; save(); renderTasks(); }
  });
  div.querySelector('.edit-task-btn').addEventListener('click', () => {
    div.querySelector('.task-edit-area').classList.toggle('open');
  });
  div.querySelector('.cancel-edit-task').addEventListener('click', () => {
    div.querySelector('.task-edit-area').classList.remove('open');
  });
  div.querySelector('.save-edit-task').addEventListener('click', () => {
    const newText = div.querySelector('.task-edit-area input').value.trim();
    const newPriority = div.querySelector('.edit-task-priority').value;
    if (!newText) return;
    const idx = state.tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) { state.tasks[idx].text = newText; state.tasks[idx].priority = newPriority; save(); renderTasks(); }
  });
  div.querySelector('.del-task-btn').addEventListener('click', () => {
    state.tasks = state.tasks.filter(t => t.id !== task.id);
    save(); renderTasks();
  });

  return div;
}

function initTasks() {
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
  renderTasks();
}

function addTask() {
  const text = document.getElementById('taskInput').value.trim();
  const priority = document.getElementById('taskPriority').value;
  if (!text) return;
  state.tasks.push({ id: genId(), text, priority, done: false });
  save();
  document.getElementById('taskInput').value = '';
  renderTasks();
}

function renderCalendar() {
  const y = state.calYear, m = state.calMonth;
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  document.getElementById('calMonthLabel').textContent = `${monthNames[m]} ${y}`;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(y, m, d);
    const events = state.events[key] || [];
    const isToday = today.getFullYear()===y && today.getMonth()===m && today.getDate()===d;

    const cell = document.createElement('div');
    cell.className = `cal-day${isToday ? ' today' : ''}`;

    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = d;
    cell.appendChild(numEl);

    const eventsEl = document.createElement('div');
    eventsEl.className = 'day-events';

    events.slice(0, 2).forEach(ev => {
      if (!ev || typeof ev.text !== 'string') return;
      const chip = document.createElement('div');
      chip.className = 'day-event-chip';
      chip.style.background = ev.color || '#4CAF50';
      chip.textContent = ev.text;
      eventsEl.appendChild(chip);
    });

    if (events.length > 2) {
      const more = document.createElement('div');
      more.className = 'day-more';
      more.textContent = `+${events.length - 2} more`;
      eventsEl.appendChild(more);
    }

    cell.appendChild(eventsEl);
    cell.addEventListener('click', () => openEventModal(key, d));
    grid.appendChild(cell);
  }
}

function openEventModal(key, d) {
  state.selectedDate = key;
  state.editingEventIndex = null;
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  document.getElementById('eventModalTitle').textContent = `${monthNames[state.calMonth]} ${d}, ${state.calYear}`;
  document.getElementById('eventText').value = '';
  state.selectedEventColor = '#4CAF50';
  updateColorPicker();
  renderEventList();
  openModal('eventModal');
}

function renderEventList() {
  const list = document.getElementById('eventList');
  const events = state.events[state.selectedDate] || [];
  list.innerHTML = '';

  if (events.length === 0) {
    list.innerHTML = `<div class="event-no-events">No events for this day.</div>`;
    return;
  }

  events.forEach((ev, idx) => {
    if (!ev || typeof ev.text !== 'string') return;
    const item = document.createElement('div');
    item.className = 'event-item';
    item.innerHTML = `
      <span class="event-color-dot" style="background:${ev.color || '#4CAF50'}"></span>
      <span class="event-item-text">${escapeHtml(ev.text)}</span>
      <button class="icon-btn del del-event-btn" title="Delete event">🗑️</button>
    `;
    item.querySelector('.event-item-text').addEventListener('click', () => loadEventForEdit(idx));
    item.querySelector('.event-color-dot').addEventListener('click', () => loadEventForEdit(idx));
    item.querySelector('.del-event-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteEvent(idx);
    });
    list.appendChild(item);
  });
}

function loadEventForEdit(idx) {
  const events = state.events[state.selectedDate] || [];
  const ev = events[idx];
  if (!ev) return;
  state.editingEventIndex = idx;
  document.getElementById('eventText').value = ev.text;
  state.selectedEventColor = ev.color || '#4CAF50';
  updateColorPicker();
  document.getElementById('eventText').focus();
}

function deleteEvent(idx) {
  if (!state.events[state.selectedDate]) return;
  state.events[state.selectedDate].splice(idx, 1);
  if (state.events[state.selectedDate].length === 0) delete state.events[state.selectedDate];
  state.editingEventIndex = null;
  document.getElementById('eventText').value = '';
  save(); renderEventList(); renderCalendar();
}

function saveEvent() {
  const text = document.getElementById('eventText').value.trim();
  if (!text) return;
  if (!state.events[state.selectedDate]) state.events[state.selectedDate] = [];
  if (state.editingEventIndex !== null && state.editingEventIndex >= 0) {
    state.events[state.selectedDate][state.editingEventIndex] = { text, color: state.selectedEventColor };
    state.editingEventIndex = null;
  } else {
    state.events[state.selectedDate].push({ text, color: state.selectedEventColor });
  }
  document.getElementById('eventText').value = '';
  state.selectedEventColor = '#4CAF50';
  updateColorPicker();
  save(); renderEventList(); renderCalendar();
}

function updateColorPicker() {
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.classList.toggle('selected', dot.dataset.color === state.selectedEventColor);
  });
}

function initCalendar() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderCalendar();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    renderCalendar();
  });
  document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
  document.getElementById('cancelEventBtn').addEventListener('click', () => {
    state.editingEventIndex = null;
    document.getElementById('eventText').value = '';
    state.selectedEventColor = '#4CAF50';
    updateColorPicker();
  });
  document.getElementById('eventText').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEvent();
  });
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      state.selectedEventColor = dot.dataset.color;
      updateColorPicker();
    });
  });
}

function initModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function initDark() {
  applyDark();
  document.getElementById('darkToggle').addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    applyDark();
    save();
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  initDark();
  initTabs();
  initNotes();
  initTasks();
  initCalendar();
  initModals();
  renderCalendar();
});