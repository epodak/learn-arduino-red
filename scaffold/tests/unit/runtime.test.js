import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../../src/content/lessons.js';
import { partById } from '../../src/content/parts.js';
import { createLessonRegistry } from '../../src/content/registry.js';
import { createSimulatorRegistry, simulatorRegistry, noiseAt } from '../../src/simulation/scenarios.js';
import { SimulationSession, initialState, replay } from '../../src/simulation/session.js';
import { resolveLocale, translate, languages, fallback } from '../../src/i18n/index.js';

const registry = createLessonRegistry(lessons, simulatorRegistry);

test('all 16 course contracts resolve parts and simulators', () => {
  assert.equal(registry.count, 16);
  assert.equal(new Set(registry.all().map((lesson) => lesson.id)).size, 16);
  for (const lesson of registry.all()) {
    assert.ok(simulatorRegistry.has(lesson.simulatorId), lesson.id);
    assert.ok(lesson.code);
    for (const partId of lesson.partIds) assert.ok(partById.has(partId), partId);
  }
});

test('ordinary lesson expansion is data-only; a 17th lesson needs no global switch', () => {
  const extra = { id: 'hello-led', title: 'Another LED', simulatorId: 'blink', code: 'void loop() {}', partIds: ['led'] };
  const expanded = createLessonRegistry([...lessons, extra], simulatorRegistry);
  assert.equal(expanded.count, 17);
  assert.equal(expanded.get('hello-led').simulatorId, 'blink');
  assert.equal(registry.count, 16);
});

test('invalid part, simulator and duplicate IDs fail immediately', () => {
  assert.throws(() => createLessonRegistry([...lessons, lessons[0]], simulatorRegistry), /Duplicate lesson/);
  assert.throws(() => createLessonRegistry([{ ...lessons[0], partIds: ['phantom'] }], simulatorRegistry), /Unknown part/);
  assert.throws(() => createLessonRegistry([{ ...lessons[0], simulatorId: 'unknown' }], simulatorRegistry), /Missing simulator/);
  assert.throws(() => createSimulatorRegistry([{ id: 'a', sample: () => ({}) }, { id: 'a', sample: () => ({}) }]), /Duplicate/);
});

function playLesson(id, seed = 4) {
  const session = new SimulationSession(registry.get(id), { seed });
  session.start();
  session.advance(100);
  session.advance(500);
  session.input('knob', 0.75);
  session.advance(600);
  session.stop();
  return session;
}

test('all lesson scenarios generate replayable event streams', () => {
  for (const lesson of registry.all()) {
    const session = playLesson(lesson.id);
    assert.ok(session.events.length > 4, lesson.id);
    assert.deepEqual(replay(session.events), session.snapshot(), lesson.id);
    assert.equal(session.state.running, false);
    assert.equal(session.state.timeMs, 1200);
  }
});

test('same input and seed produce the same event stream', () => {
  for (const lesson of registry.all()) {
    assert.deepEqual(playLesson(lesson.id, 12).events, playLesson(lesson.id, 12).events, lesson.id);
  }
});

test('changing a seeded sensor sample changes only reproducible measurements', () => {
  const a = playLesson('heat', 3);
  const b = playLesson('heat', 9);
  assert.notDeepEqual(a.state.metrics, b.state.metrics);
  assert.equal(noiseAt(2000, 3), noiseAt(2000, 3));
  assert.notEqual(noiseAt(2000, 3), noiseAt(2000, 4));
});

test('button and LED are projections of the same input stream', () => {
  const session = new SimulationSession(registry.get('button'));
  session.start();
  session.input('button', true);
  assert.equal(session.state.pins.D2, 1);
  assert.equal(session.state.pins.D13, 1);
  session.input('button', false);
  assert.equal(session.state.pins.D2, 0);
  assert.equal(session.state.pins.D13, 0);
});

test('reset restores pristine state; unsupported input and negative time are rejected', () => {
  const session = playLesson('blink');
  session.reset();
  assert.deepEqual(session.snapshot(), initialState());
  assert.deepEqual(session.events, []);
  assert.throws(() => session.input('secret', 'oops'), /Unsupported input/);
  session.start();
  assert.throws(() => session.advance(-100), /Invalid virtual time/);
});

test('i18n uses explicit locale routes and never treats English copy as message IDs', () => {
  assert.equal(languages.length, 12);
  assert.equal(resolveLocale('/zh/'), 'zh');
  assert.equal(resolveLocale('/ja/'), 'ja');
  assert.equal(resolveLocale('/not-a-locale'), 'en');
  assert.equal(translate('zh', 'run'), '运行情景模拟');
  assert.equal(translate('ja', 'run'), 'Run scenario');
  assert.equal(fallback('ja'), true);
  assert.equal(fallback('en'), false);
});
