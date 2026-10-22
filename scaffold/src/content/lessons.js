// Each record is content, not a UI branch. Arduino examples are instructional
// snippets; this release does not parse or compile them.
export const lessons = Object.freeze([
  {
    id: 'board', title: 'Meet the board', titleZh: '认识控制板', category: 'Foundations',
    description: 'Locate the controller, reset switch and I/O headers. Observe the first virtual pin.',
    descriptionZh: '认识主控芯片、复位开关和输入输出引脚。',
    simulatorId: 'idle', partIds: ['uno', 'usb', 'reset', 'led'],
    code: '// Observe the board\nvoid setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, LOW); }',
  },
  {
    id: 'blink', title: 'Blink an LED', titleZh: '让 LED 闪烁', category: 'Digital output',
    description: 'Cycle a digital output and watch the LED follow the pin state.',
    descriptionZh: '周期性切换数字输出，观察灯光如何响应。',
    simulatorId: 'blink', partIds: ['uno', 'led'],
    code: 'void setup() { pinMode(13, OUTPUT); }\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}',
  },
  {
    id: 'button', title: 'Read a button', titleZh: '读取按钮', category: 'Digital input',
    description: 'Press the on-screen button to drive a virtual digital input.',
    descriptionZh: '点击虚拟按钮，观察数字输入和输出联动。',
    simulatorId: 'button', partIds: ['uno', 'button', 'led'],
    code: 'void setup() { pinMode(2, INPUT_PULLUP); pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, digitalRead(2) == LOW); }',
  },
  {
    id: 'knob', title: 'Analog control', titleZh: '模拟量旋钮', category: 'Analog input',
    description: 'Turn a knob to adjust a virtual analog measurement.', descriptionZh: '旋动电位器，改变 A0 的模拟采样值。',
    simulatorId: 'analog', partIds: ['pot', 'led'],
    code: 'void loop() {\n  int value = analogRead(A0);\n  analogWrite(9, map(value, 0, 1023, 0, 255));\n}',
  },
  {
    id: 'rgb', title: 'Color mixing', titleZh: 'RGB 混色', category: 'PWM output',
    description: 'Vary three channels to mix a changing color.', descriptionZh: '通过三个 PWM 通道观察颜色叠加。',
    simulatorId: 'rgb', partIds: ['rgb'],
    code: 'void loop() {\n  analogWrite(9, 255);\n  analogWrite(10, 80);\n  analogWrite(11, 32);\n}',
  },
  {
    id: 'light', title: 'Light sensing', titleZh: '光线感测', category: 'Sensors',
    description: 'Convert a changing light level into a virtual ADC reading.', descriptionZh: '把光照变化转为模拟输入值。',
    simulatorId: 'analog', partIds: ['sensor', 'led'],
    code: 'void loop() {\n  int light = analogRead(A0);\n  digitalWrite(13, light < 400);\n}',
  },
  {
    id: 'sensor', title: 'Distance measurement', titleZh: '距离测量', category: 'Sensors',
    description: 'Explore how a range reading can trigger an output.', descriptionZh: '使用虚拟距离数据触发输出。',
    simulatorId: 'range', partIds: ['sensor', 'led'],
    code: 'void loop() {\n  long distanceCm = readRange(); // illustrative pseudocode\n  digitalWrite(13, distanceCm < 40);\n}',
  },
  {
    id: 'sound', title: 'Produce a tone', titleZh: '蜂鸣器发声', category: 'Sound',
    description: 'Adjust frequency and inspect the virtual buzzer output.', descriptionZh: '改变频率，观察蜂鸣器的控制信号。',
    simulatorId: 'tone', partIds: ['buzzer'],
    code: 'void loop() { tone(8, 440); delay(200); noTone(8); delay(200); }',
  },
  {
    id: 'piano', title: 'Three-note piano', titleZh: '三音阶钢琴', category: 'Sound',
    description: 'Use a control input to choose a musical note.', descriptionZh: '通过控制量在三个音符之间切换。',
    simulatorId: 'tone', partIds: ['buzzer', 'button'],
    code: 'void loop() {\n  int note = analogRead(A0) < 341 ? 262 : 392;\n  tone(8, note);\n}',
  },
  {
    id: 'motor', title: 'Motor speed', titleZh: '电机速度', category: 'Actuators',
    description: 'Use a PWM command to simulate rotational speed.', descriptionZh: '根据 PWM 占空比观察电机转速。',
    simulatorId: 'motor', partIds: ['motor'],
    code: 'void loop() { analogWrite(9, 180); }',
  },
  {
    id: 'heat', title: 'Temperature alert', titleZh: '温度报警', category: 'Sensors',
    description: 'Compare a simulated temperature with a threshold.', descriptionZh: '将虚拟温度与报警阈值比较。',
    simulatorId: 'heat', partIds: ['sensor', 'led'],
    code: 'void loop() {\n  float temperature = readTemperature(); // illustrative pseudocode\n  digitalWrite(13, temperature > 30);\n}',
  },
  {
    id: 'servo', title: 'Position a servo', titleZh: '舵机定位', category: 'Actuators',
    description: 'Map a control value to an angular position.', descriptionZh: '把控制输入映射为舵机角度。',
    simulatorId: 'servo', partIds: ['servo', 'pot'],
    code: '#include <Servo.h>\nServo arm;\nvoid setup() { arm.attach(9); }\nvoid loop() { arm.write(90); }',
  },
  {
    id: 'stepper', title: 'Step rotation', titleZh: '步进运动', category: 'Actuators',
    description: 'Observe precise, discrete steps over virtual time.', descriptionZh: '观察电机按固定步距旋转。',
    simulatorId: 'stepper', partIds: ['stepper'],
    code: '// Stepper driver example (wiring varies)\nvoid loop() { stepOnce(); delay(100); }',
  },
  {
    id: 'plant', title: 'Soil moisture', titleZh: '土壤湿度', category: 'Sensors',
    description: 'Turn a moisture proxy into a useful status signal.', descriptionZh: '根据虚拟湿度值判断土壤是否缺水。',
    simulatorId: 'analog', partIds: ['sensor', 'led'],
    code: 'void loop() {\n  int moisture = analogRead(A0);\n  digitalWrite(13, moisture < 350);\n}',
  },
  {
    id: 'force', title: 'Pressure input', titleZh: '压力传感', category: 'Sensors',
    description: 'Explore how force changes an analog input.', descriptionZh: '观察压力变化对模拟输入的影响。',
    simulatorId: 'analog', partIds: ['sensor', 'led'],
    code: 'void loop() {\n  int force = analogRead(A0);\n  digitalWrite(13, force > 600);\n}',
  },
  {
    id: 'project', title: 'Build an alert', titleZh: '综合报警项目', category: 'Projects',
    description: 'Combine a sensor decision with a visible status output.', descriptionZh: '将传感器输入与状态输出组合成一个系统。',
    simulatorId: 'range', partIds: ['sensor', 'led', 'buzzer'],
    code: 'void loop() {\n  long cm = readRange(); // illustrative pseudocode\n  digitalWrite(13, cm < 40);\n  if (cm < 40) tone(8, 880); else noTone(8);\n}',
  },
]);
