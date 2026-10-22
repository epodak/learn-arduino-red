export const languages = Object.freeze([
  ['en', 'English'], ['zh', '简体中文'], ['ja', '日本語'], ['ko', '한국어'],
  ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['tr', 'Türkçe'], ['id', 'Bahasa Indonesia'], ['hi', 'हिन्दी'],
]);

const messages = {
  en: {
    brand: 'FIELD LAB', eyebrow: 'ARDUINO · INTERACTIVE MANUAL', lessons: 'Learning path',
    board: 'BOARD EXPLORER', course: 'LESSON', scene: '3D WORKBENCH',
    parts: 'Components', controls: 'INPUT SIGNALS', inspect: 'SELECTED PART',
    code: 'EXAMPLE SKETCH · READ ONLY', serial: 'EVENT MONITOR',
    run: 'Run scenario', stop: 'Stop', reset: 'Reset', step: 'Step +100ms',
    copy: 'Copy trace', done: 'Mark complete', completed: 'Completed',
    knob: 'Analog input', button: 'Push button', held: 'Pressed', released: 'Released',
    signal: 'PIN STATES', metric: 'MEASUREMENTS', cameraLeft: 'Rotate left',
    cameraRight: 'Rotate right', cameraReset: 'Reset camera',
    lessonIndex: 'LESSONS', all: 'All modules', simulator: 'Scenario simulation',
    disclaimer: 'Educational scenario; example sketch is not compiled or uploaded.',
    translation: 'Translation pending — showing English content',
    consoleIdle: 'Start a scenario to generate events.',
    github: 'Open source project',
    stateIdle: 'IDLE', stateRunning: 'RUNNING',
  },
  zh: {
    brand: '实验工坊', eyebrow: 'ARDUINO · 交互式学习手册', lessons: '学习路线',
    board: '开发板实验室', course: '课程', scene: '3D 实验台',
    parts: '元件目录', controls: '输入信号', inspect: '当前元件',
    code: '示例代码 · 只读', serial: '事件监视器',
    run: '运行情景模拟', stop: '停止', reset: '复位', step: '单步 +100ms',
    copy: '复制事件轨迹', done: '标记完成', completed: '已完成',
    knob: '模拟量输入', button: '按住按钮', held: '已按下', released: '已释放',
    signal: '引脚状态', metric: '测量值', cameraLeft: '向左旋转',
    cameraRight: '向右旋转', cameraReset: '恢复视角',
    lessonIndex: '课程目录', all: '所有模块', simulator: '情景模拟',
    disclaimer: '这是教学用情景模拟：示例 Arduino 代码没有被真正编译或上传。',
    translation: '本语言尚未完成翻译，当前显示英文',
    consoleIdle: '运行情景模拟后，事件将在这里出现。',
    github: '项目源代码',
    stateIdle: '待机', stateRunning: '运行中',
  },
};

export function resolveLocale(pathname = '/') {
  const prefix = pathname.split('/').filter(Boolean)[0];
  return languages.some(([code]) => code === prefix) ? prefix : 'en';
}

export function translate(locale, key) {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

export function lessonText(lesson, field, locale) {
  return locale === 'zh' ? lesson[`${field}Zh`] || lesson[field] : lesson[field];
}

export function fallback(locale) { return locale !== 'en' && locale !== 'zh'; }
