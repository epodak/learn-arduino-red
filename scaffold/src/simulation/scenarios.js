const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Stateless seeded noise: the result depends only on time, stream and seed.
// No Math.random(), wall-clock reads or hidden per-view state.
export function noiseAt(timeMs, seed, stream = 0) {
  let n = ((Math.floor(timeMs / 250) + 1) * 374761393 + seed * 668265263 + stream * 2246822519) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}

function digital(ports, metrics = {}, serial = '') {
  return { pins: ports, metrics, serial };
}

const scenarios = [
  {
    id: 'idle',
    sample: () => digital({ D13: 0 }, { level: 0 }, 'Board connected • pins available'),
  },
  {
    id: 'blink',
    sample: ({ timeMs }) => {
      const lit = Math.floor(timeMs / 500) % 2 === 0 ? 1 : 0;
      return digital({ D13: lit }, { level: lit }, `D13 = ${lit ? 'HIGH' : 'LOW'}`);
    },
  },
  {
    id: 'button',
    sample: ({ inputs }) => {
      const lit = inputs.button ? 1 : 0;
      return digital({ D2: lit, D13: lit }, { level: lit }, `Button ${lit ? 'pressed' : 'released'}`);
    },
  },
  {
    id: 'analog',
    sample: ({ inputs, timeMs, seed, lesson }) => {
      const wobble = (noiseAt(timeMs, seed, 3) - 0.5) * 8;
      const adc = clamp(Math.round(inputs.knob * 1023 + wobble), 0, 1023);
      const threshold = lesson.id === 'plant' ? 350 : lesson.id === 'force' ? 600 : 400;
      const lit = lesson.id === 'force' ? Number(adc > threshold) : lesson.id === 'knob' ? Number(adc > 511) : Number(adc < threshold);
      return digital({ A0: adc, D13: lit }, { analog: adc, level: lit }, `A0 = ${adc} / 1023`);
    },
  },
  {
    id: 'rgb',
    sample: ({ timeMs }) => {
      const phase = timeMs / 1300;
      const r = Math.round((Math.sin(phase) * 0.5 + 0.5) * 255);
      const g = Math.round((Math.sin(phase + 2.094) * 0.5 + 0.5) * 255);
      const b = Math.round((Math.sin(phase + 4.189) * 0.5 + 0.5) * 255);
      return digital({ D9: r, D10: g, D11: b }, { rgb: [r, g, b], level: 1 }, `RGB ${r}/${g}/${b}`);
    },
  },
  {
    id: 'range',
    sample: ({ inputs, timeMs, seed }) => {
      const cm = clamp(Math.round(12 + inputs.knob * 160 + (noiseAt(timeMs, seed, 8) - 0.5) * 3), 1, 300);
      const alert = Number(cm < 40);
      return digital({ D13: alert, A0: cm }, { distanceCm: cm, level: alert }, `${cm} cm • ${alert ? 'near' : 'clear'}`);
    },
  },
  {
    id: 'tone',
    sample: ({ inputs, timeMs }) => {
      const hz = Math.round(220 + inputs.knob * 660);
      const enabled = Number(Math.floor(timeMs / 300) % 2 === 0);
      return digital({ D8: enabled }, { frequencyHz: enabled ? hz : 0 }, `${enabled ? hz + ' Hz' : 'silent'}`);
    },
  },
  {
    id: 'motor',
    sample: ({ inputs }) => {
      const pwm = Math.round(inputs.knob * 255);
      const rpm = Math.round(pwm * 7.6);
      return digital({ D9: pwm }, { rpm, level: Number(pwm > 0) }, `PWM ${pwm} • ${rpm} rpm`);
    },
  },
  {
    id: 'heat',
    sample: ({ inputs, timeMs, seed }) => {
      const tempC = Math.round((18 + inputs.knob * 24 + noiseAt(timeMs, seed, 2) * 0.8) * 10) / 10;
      const alert = Number(tempC > 30);
      return digital({ A0: tempC, D13: alert }, { temperatureC: tempC, level: alert }, `${tempC.toFixed(1)} °C • ${alert ? 'alarm' : 'normal'}`);
    },
  },
  {
    id: 'servo',
    sample: ({ inputs }) => {
      const angle = Math.round(inputs.knob * 180);
      return digital({ D9: angle }, { servoAngle: angle }, `Servo = ${angle}°`);
    },
  },
  {
    id: 'stepper',
    sample: ({ timeMs, inputs }) => {
      const step = Math.floor(timeMs / Math.max(80, Math.round(400 - inputs.knob * 320)));
      const angle = (step * 7.5) % 360;
      return digital({ D4: step % 2, D5: (step + 1) % 2 }, { steps: step, stepperAngle: angle }, `Step ${step}`);
    },
  },
];

export function createSimulatorRegistry(plugins = scenarios) {
  const map = new Map();
  for (const plugin of plugins) {
    if (!plugin?.id || typeof plugin.sample !== 'function' || map.has(plugin.id)) {
      throw new Error(`Duplicate/invalid simulator: ${plugin?.id}`);
    }
    map.set(plugin.id, plugin);
  }
  return Object.freeze({ has: (id) => map.has(id), get: (id) => map.get(id), ids: () => [...map.keys()] });
}

export const simulatorRegistry = createSimulatorRegistry();
