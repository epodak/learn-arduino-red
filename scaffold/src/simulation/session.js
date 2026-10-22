import { simulatorRegistry } from './scenarios.js';

export function initialState() {
  return {
    running: false,
    timeMs: 0,
    inputs: { button: false, knob: 0.4 },
    pins: {}, metrics: {}, serial: [], lastSeq: -1,
  };
}

export function reduceEvent(state, event) {
  if (event.seq !== state.lastSeq + 1) throw new Error('Non-consecutive event sequence');
  const base = { ...state, lastSeq: event.seq, timeMs: event.atMs };
  switch (event.type) {
    case 'lifecycle': return { ...base, running: event.value };
    case 'input': return { ...base, inputs: { ...state.inputs, [event.target]: event.value } };
    case 'pin': return { ...base, pins: { ...state.pins, [event.target]: event.value } };
    case 'metric': return { ...base, metrics: { ...state.metrics, [event.target]: event.value } };
    case 'serial': return { ...base, serial: [...state.serial, { atMs: event.atMs, text: event.value }].slice(-80) };
    case 'tick': return base;
    default: throw new Error(`Unknown event type ${event.type}`);
  }
}

export function replay(events) {
  return events.reduce(reduceEvent, initialState());
}

function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export class SimulationSession {
  constructor(lesson, { seed = 17, registry = simulatorRegistry } = {}) {
    const plugin = registry.get(lesson.simulatorId);
    if (!plugin) throw new Error(`No simulator for ${lesson.id}: ${lesson.simulatorId}`);
    this.lesson = lesson;
    this.plugin = plugin;
    this.seed = seed;
    this.events = [];
    this.state = initialState();
    this.lastSerialAt = -Infinity;
  }

  emit(type, target, value, atMs = this.state.timeMs) {
    const event = Object.freeze({ seq: this.events.length, atMs, type, target, value });
    this.events.push(event);
    this.state = reduceEvent(this.state, event);
    return event;
  }

  start() {
    if (this.state.running) return;
    this.emit('lifecycle', 'running', true);
    this.advance(0);
  }

  stop() {
    if (this.state.running) this.emit('lifecycle', 'running', false);
  }

  input(target, value) {
    if (target !== 'button' && target !== 'knob') throw new Error(`Unsupported input: ${target}`);
    const sanitized = target === 'button' ? Boolean(value) : Math.min(1, Math.max(0, Number(value)));
    if (target === 'knob' && !Number.isFinite(sanitized)) throw new Error('Invalid input value');
    this.emit('input', target, sanitized);
    if (this.state.running) this.advance(0);
  }

  advance(deltaMs = 100) {
    if (!this.state.running) return [];
    if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 60000) throw new Error('Invalid virtual time delta');
    const before = this.events.length;
    const atMs = this.state.timeMs + deltaMs;
    this.emit('tick', 'clock', atMs, atMs);
    const sample = this.plugin.sample({
      lesson: this.lesson,
      timeMs: atMs,
      inputs: { ...this.state.inputs },
      previous: this.state,
      seed: this.seed,
    });
    for (const [pin, value] of Object.entries(sample.pins ?? {})) {
      if (!equal(this.state.pins[pin], value)) this.emit('pin', pin, value);
    }
    for (const [metric, value] of Object.entries(sample.metrics ?? {})) {
      if (!equal(this.state.metrics[metric], value)) this.emit('metric', metric, value);
    }
    if (sample.serial && atMs - this.lastSerialAt >= 800) {
      this.emit('serial', 'monitor', sample.serial);
      this.lastSerialAt = atMs;
    }
    return this.events.slice(before);
  }

  reset() {
    this.events = [];
    this.state = initialState();
    this.lastSerialAt = -Infinity;
  }

  snapshot() {
    return structuredClone(this.state);
  }

  exportTrace() {
    return JSON.stringify({ lessonId: this.lesson.id, seed: this.seed, events: this.events }, null, 2);
  }
}
