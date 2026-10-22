import './styles.css';
import { lessons } from './content/lessons.js';
import { parts, partById } from './content/parts.js';
import { createLessonRegistry } from './content/registry.js';
import { simulatorRegistry } from './simulation/scenarios.js';
import { SimulationSession } from './simulation/session.js';
import { languages, resolveLocale, translate, lessonText, fallback } from './i18n/index.js';

const registry = createLessonRegistry(lessons, simulatorRegistry);
const locale = resolveLocale(window.location.pathname);
const t = (key) => translate(locale, key);
const storagePrefix = 'arduino-field-lab:';

function readStored(name, alternative) {
  try {
    const value = window.localStorage.getItem(storagePrefix + name);
    return value === null ? alternative : JSON.parse(value);
  } catch { return alternative; }
}
function store(name, value) {
  try { window.localStorage.setItem(storagePrefix + name, JSON.stringify(value)); } catch {}
}
function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const completed = new Set(readStored('completed', []).filter((id) => registry.has(id)));
let selectedLesson = registry.get(readStored('selectedLesson', 'board')) ?? registry.get('board');
let selectedPart = 'uno';
let session = new SimulationSession(selectedLesson);
let timer = null;

document.documentElement.lang = locale;
document.title = `${t('brand')} · ${selectedLesson.title}`;

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="topbar">
    <div class="brand-lockup" aria-label="Arduino Field Lab">
      <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <div><div class="brand-overline">OPEN LEARNING STUDIO / 001</div><strong>${htmlEscape(t('brand'))}</strong></div>
    </div>
    <p class="topbar-note">${htmlEscape(t('eyebrow'))}</p>
    <div class="toolbar">
      <label class="language-label" for="locale-select">LANG</label>
      <select aria-label="Language" id="locale-select">${languages.map(([code, label]) => `<option value="${code}" ${code === locale ? 'selected' : ''}>${htmlEscape(label)}</option>`).join('')}</select>
      <a class="project-link" aria-label="${htmlEscape(t('github'))}" href="https://github.com/epodak/learn-arduino-red" target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
    </div>
  </header>
  ${fallback(locale) ? `<div class="translation-alert" role="status">${htmlEscape(t('translation'))}</div>` : ''}
  <div class="app-grid">
    <aside class="lesson-sidebar" aria-label="${htmlEscape(t('lessons'))}">
      <div class="aside-heading"><span class="meta-label">01 — ${htmlEscape(t('lessonIndex'))}</span><span class="count-chip" id="lesson-count">${registry.count}</span></div>
      <div class="progress-card"><div class="progress-top"><span>${htmlEscape(t('lessons'))}</span><strong id="progress-count">0 / ${registry.count}</strong></div><div class="progress-track"><span id="progress-fill"></span></div></div>
      <nav id="lesson-list" aria-label="${htmlEscape(t('lessons'))}"></nav>
      <div class="sidebar-foot"><span class="tiny-dots">● ● ●</span><span>ARDUINO / FIELD STUDIES</span></div>
    </aside>
    <main class="workspace" id="main-content">
      <section class="course-bar" aria-label="${htmlEscape(t('course'))}">
        <div><span class="meta-label">02 — ${htmlEscape(t('course'))} <span id="course-position">01 / ${registry.count}</span></span><h1 id="lesson-title"></h1><p id="lesson-description"></p></div>
        <button type="button" id="complete-lesson" class="outline-button">✓ ${htmlEscape(t('done'))}</button>
      </section>
      <div class="work-columns">
        <section class="scene-section" aria-label="${htmlEscape(t('scene'))}">
          <div class="panel-heading"><span class="meta-label">03 — ${htmlEscape(t('scene'))}</span><span class="live-led" aria-hidden="true"></span><span class="meta-label">WEBGL / PROCEDURAL</span></div>
          <div class="scene-window" id="scene-container"><div class="scene-grid" aria-hidden="true"></div><div class="scene-watermark" aria-hidden="true">FIELD LAB<br/>ARDUINO</div><div class="axes-label" aria-hidden="true">X / Y / Z</div></div>
          <div class="scene-footer"><div class="legend"><span><b class="legend-light"></b> ${htmlEscape(t('simulator'))}</span><span>ATMEGA328P</span></div><div class="camera-actions"><button id="camera-left" type="button" aria-label="${htmlEscape(t('cameraLeft'))}">↶</button><button id="camera-reset" type="button" aria-label="${htmlEscape(t('cameraReset'))}">◎</button><button id="camera-right" type="button" aria-label="${htmlEscape(t('cameraRight'))}">↷</button></div></div>
          <div class="runtime-toolbar"><span class="run-state" id="run-state">● ${htmlEscape(t('stateIdle'))}</span><span class="virtual-time" id="virtual-time">T + 0000 ms</span><div class="runtime-buttons"><button class="primary-button" id="run-button" type="button">▶ ${htmlEscape(t('run'))}</button><button class="outline-button" id="step-button" type="button">+ ${htmlEscape(t('step'))}</button><button class="outline-button" id="reset-button" type="button">↺ ${htmlEscape(t('reset'))}</button></div></div>
          <p class="disclaimer">ⓘ ${htmlEscape(t('disclaimer'))}</p>
        </section>
        <aside class="detail-stack" aria-label="${htmlEscape(t('parts'))}">
          <section class="detail-card"><div class="panel-heading"><span class="meta-label">04 — ${htmlEscape(t('inspect'))}</span><span class="inspector-index" id="part-index">01</span></div><div class="part-header"><div class="part-symbol">◈</div><div><h2 id="part-title"></h2><span class="pin-id" id="part-pin"></span></div></div><p id="part-note"></p><div class="part-nav" id="part-list" role="group" aria-label="${htmlEscape(t('parts'))}"></div></section>
          <section class="detail-card input-card"><div class="panel-heading"><span class="meta-label">05 — ${htmlEscape(t('controls'))}</span><span class="meta-label">LIVE</span></div><label class="range-label" for="knob-input"><span>${htmlEscape(t('knob'))}</span><output id="knob-value">40%</output></label><input type="range" id="knob-input" min="0" max="100" value="40" step="1" aria-label="${htmlEscape(t('knob'))}"/><button id="button-input" type="button" class="input-button" aria-pressed="false">▢ ${htmlEscape(t('button'))} <span id="button-state">${htmlEscape(t('released'))}</span></button></section>
          <section class="detail-card telemetry-card"><div class="panel-heading"><span class="meta-label">06 — ${htmlEscape(t('signal'))}</span><span class="signal-count">LIVE I/O</span></div><div id="pin-list" class="signal-list"></div><div class="panel-heading inset-heading"><span class="meta-label">${htmlEscape(t('metric'))}</span></div><div id="metric-list" class="metric-list"></div></section>
        </aside>
      </div>
      <div class="lower-columns">
        <section class="code-card"><div class="panel-heading"><span class="meta-label">07 — ${htmlEscape(t('code'))}</span><span class="code-lang">ARDUINO C++</span></div><pre class="sketch-pre"><code id="sketch-code"></code></pre></section>
        <section class="serial-card"><div class="panel-heading"><span class="meta-label">08 — ${htmlEscape(t('serial'))}</span><button type="button" class="text-button" id="copy-trace">↗ ${htmlEscape(t('copy'))}</button></div><div id="serial-list" class="serial-list" role="log" aria-label="${htmlEscape(t('serial'))}" aria-live="polite"></div></section>
      </div>
    </main>
  </div>
  <footer class="page-footer"><span>FIELD LAB / ENGINEERED FOR CURIOSITY</span><span>${registry.count} LESSONS · ${languages.length} LANGUAGE ROUTES · REPLAYABLE EVENTS</span></footer>
`;

function byId(id) { return document.getElementById(id); }
const sceneContainer = byId('scene-container');
let stage = null;
// Delay loading the 3D renderer until the content, controls and navigation exist.
// This keeps the curriculum usable if WebGL is disabled or expensive to initialize.
import('./scene/board.js').then(({ createBoardStage }) => {
  stage = createBoardStage(sceneContainer, { onSelect: (id) => selectPart(id) });
  stage.selectPart(selectedPart);
  stage.setState(session.snapshot());
}).catch((error) => {
  const notice = document.createElement('p');
  notice.className = 'scene-error';
  notice.textContent = `3D unavailable: ${error.message}`;
  sceneContainer.append(notice);
});

function clearTimer() { if (timer !== null) { clearInterval(timer); timer = null; } }

function renderLessons() {
  byId('lesson-list').innerHTML = registry.all().map((lesson, index) => `
    <button class="lesson-item ${lesson.id === selectedLesson.id ? 'is-active' : ''}" data-lesson="${lesson.id}"
      type="button" aria-current="${lesson.id === selectedLesson.id ? 'step' : 'false'}">
      <span class="lesson-num">${String(index + 1).padStart(2, '0')}</span><span class="lesson-name">${htmlEscape(lessonText(lesson, 'title', locale))}<small>${htmlEscape(lesson.category)}</small></span>
      <span class="lesson-status" aria-label="${completed.has(lesson.id) ? htmlEscape(t('completed')) : ''}">${completed.has(lesson.id) ? '✓' : '↗'}</span>
    </button>`).join('');
  byId('progress-count').textContent = `${completed.size} / ${registry.count}`;
  byId('progress-fill').style.width = `${completed.size / registry.count * 100}%`;
  byId('complete-lesson').textContent = completed.has(selectedLesson.id) ? `✓ ${t('completed')}` : `✓ ${t('done')}`;
}

function renderLesson() {
  const index = registry.all().findIndex((item) => item.id === selectedLesson.id);
  byId('course-position').textContent = `${String(index + 1).padStart(2, '0')} / ${registry.count}`;
  byId('lesson-title').textContent = lessonText(selectedLesson, 'title', locale);
  byId('lesson-description').textContent = lessonText(selectedLesson, 'description', locale);
  byId('sketch-code').textContent = selectedLesson.code;
  document.title = `${lessonText(selectedLesson, 'title', locale)} · ${t('brand')}`;
  renderLessons();
  renderPartButtons();
  renderPart();
}

function renderPartButtons() {
  byId('part-list').innerHTML = selectedLesson.partIds.map((id) => {
    const part = partById.get(id);
    return `<button type="button" class="part-button ${id === selectedPart ? 'selected' : ''}" data-part="${id}" aria-pressed="${id === selectedPart}">${htmlEscape(locale === 'zh' ? part.nameZh : part.name)}</button>`;
  }).join('');
}

function renderPart() {
  const part = partById.get(selectedPart) ?? parts[0];
  byId('part-title').textContent = locale === 'zh' ? part.nameZh : part.name;
  byId('part-pin').textContent = part.pin;
  byId('part-note').textContent = part.note;
  const index = selectedLesson.partIds.indexOf(part.id);
  byId('part-index').textContent = String(index + 1).padStart(2, '0');
  for (const button of document.querySelectorAll('[data-part]')) {
    const active = button.dataset.part === selectedPart;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function selectPart(id) {
  if (!partById.has(id)) return;
  selectedPart = id;
  stage?.selectPart(id);
  renderPart();
}

function renderRuntime() {
  const state = session.snapshot();
  stage?.setState(state);
  byId('run-state').textContent = `● ${t(state.running ? 'stateRunning' : 'stateIdle')}`;
  byId('run-state').classList.toggle('active', state.running);
  byId('virtual-time').textContent = `T + ${String(state.timeMs).padStart(5, '0')} ms`;
  byId('run-button').textContent = state.running ? `■ ${t('stop')}` : `▶ ${t('run')}`;
  byId('knob-input').value = String(Math.round(state.inputs.knob * 100));
  byId('knob-value').textContent = `${Math.round(state.inputs.knob * 100)}%`;
  byId('button-input').setAttribute('aria-pressed', String(state.inputs.button));
  byId('button-state').textContent = t(state.inputs.button ? 'held' : 'released');
  byId('pin-list').innerHTML = Object.entries(state.pins).length
    ? Object.entries(state.pins).map(([pin, value]) => `<div class="signal-row"><strong>${htmlEscape(pin)}</strong><div class="signal-bar"><span style="width:${Math.max(4, Math.min(100, Number(value) > 1 ? Number(value) / 1023 * 100 : Number(value) * 100))}%"></span></div><span>${htmlEscape(value)}</span></div>`).join('')
    : '<div class="empty-state">—</div>';
  byId('metric-list').innerHTML = Object.entries(state.metrics).length
    ? Object.entries(state.metrics).map(([key, value]) => `<div class="metric-row"><span>${htmlEscape(key)}</span><strong>${htmlEscape(Array.isArray(value) ? value.join(' / ') : value)}</strong></div>`).join('')
    : '<div class="empty-state">—</div>';
  byId('serial-list').innerHTML = state.serial.length
    ? state.serial.slice(-20).map((line) => `<div class="serial-line"><span>+${String(line.atMs).padStart(5, '0')}</span><span>${htmlEscape(line.text)}</span></div>`).join('')
    : `<p class="serial-empty">${htmlEscape(t('consoleIdle'))}</p>`;
}

function switchLesson(id) {
  if (!registry.has(id)) return;
  clearTimer();
  selectedLesson = registry.get(id);
  selectedPart = selectedLesson.partIds[0] ?? 'uno';
  session = new SimulationSession(selectedLesson);
  store('selectedLesson', id);
  renderLesson();
  stage?.selectPart(selectedPart);
  renderRuntime();
}

byId('lesson-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-lesson]');
  if (button) switchLesson(button.dataset.lesson);
});
byId('part-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-part]');
  if (button) selectPart(button.dataset.part);
});
byId('complete-lesson').addEventListener('click', () => {
  if (completed.has(selectedLesson.id)) completed.delete(selectedLesson.id);
  else completed.add(selectedLesson.id);
  store('completed', [...completed]);
  renderLessons();
});
byId('locale-select').addEventListener('change', (event) => {
  const code = event.target.value;
  window.location.assign(code === 'en' ? '/' : `/${code}/`);
});

byId('run-button').addEventListener('click', () => {
  if (session.state.running) { clearTimer(); session.stop(); }
  else {
    session.start();
    timer = setInterval(() => { session.advance(100); renderRuntime(); }, 100);
  }
  renderRuntime();
});
byId('step-button').addEventListener('click', () => {
  if (!session.state.running) session.start();
  clearTimer();
  session.advance(100);
  session.stop();
  renderRuntime();
});
byId('reset-button').addEventListener('click', () => {
  clearTimer();
  session.reset();
  renderRuntime();
});
byId('knob-input').addEventListener('input', (event) => {
  session.input('knob', Number(event.target.value) / 100);
  renderRuntime();
});
byId('button-input').addEventListener('click', () => {
  session.input('button', !session.state.inputs.button);
  renderRuntime();
});
byId('camera-left').addEventListener('click', () => stage?.turnLeft());
byId('camera-right').addEventListener('click', () => stage?.turnRight());
byId('camera-reset').addEventListener('click', () => stage?.resetCamera());
byId('copy-trace').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(session.exportTrace()); }
  catch { /* Clipboard permission may be denied; no false success indicator. */ }
});
window.addEventListener('pagehide', () => { clearTimer(); stage?.dispose(); }, { once: true });

switchLesson(selectedLesson.id);
window.__fieldLab = Object.freeze({
  getLesson: () => selectedLesson.id,
  getState: () => session.snapshot(),
  getEvents: () => [...session.events],
  availableLessons: () => registry.all().map((lesson) => lesson.id),
});
