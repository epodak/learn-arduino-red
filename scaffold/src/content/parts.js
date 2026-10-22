export const parts = Object.freeze([
  { id: 'uno', name: 'Control board', nameZh: '主控板', pin: 'ATmega328P', note: 'The controller reads inputs and drives outputs.' },
  { id: 'usb', name: 'USB connection', nameZh: 'USB 接口', pin: 'USB', note: 'A connection for programming and power.' },
  { id: 'reset', name: 'Reset button', nameZh: '复位按钮', pin: 'RESET', note: 'Restarts the controller program.' },
  { id: 'led', name: 'Indicator LED', nameZh: '指示灯', pin: 'D13', note: 'A visible digital output on the board.' },
  { id: 'button', name: 'Push button', nameZh: '按钮', pin: 'D2', note: 'A digital input with pressed and released states.' },
  { id: 'pot', name: 'Potentiometer', nameZh: '电位器', pin: 'A0', note: 'Produces an analog reading as its position changes.' },
  { id: 'rgb', name: 'RGB LED', nameZh: 'RGB 彩灯', pin: 'D9/D10/D11', note: 'Three channels mix into a single color.' },
  { id: 'sensor', name: 'Sensor input', nameZh: '传感器', pin: 'A0', note: 'A measured quantity represented as a virtual signal.' },
  { id: 'buzzer', name: 'Piezo buzzer', nameZh: '蜂鸣器', pin: 'D8', note: 'A tone output whose frequency may change.' },
  { id: 'motor', name: 'Motor driver', nameZh: '电机驱动', pin: 'D9', note: 'A speed command represented by a PWM duty cycle.' },
  { id: 'servo', name: 'Servo actuator', nameZh: '舵机', pin: 'D9', note: 'Maps a command to an angular position.' },
  { id: 'stepper', name: 'Stepper motor', nameZh: '步进电机', pin: 'D4–D7', note: 'Turns in discrete controlled steps.' },
]);

export const partById = new Map(parts.map((part) => [part.id, part]));
