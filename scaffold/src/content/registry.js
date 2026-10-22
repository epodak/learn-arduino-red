import { lessons } from './lessons.js';
import { partById } from './parts.js';

export function createLessonRegistry(records = lessons, simulators) {
  const byId = new Map();
  for (const lesson of records) {
    if (!lesson || typeof lesson.id !== 'string' || !/^[a-z][a-z0-9-]+$/.test(lesson.id)) {
      throw new Error(`Invalid lesson id: ${lesson?.id}`);
    }
    if (byId.has(lesson.id)) throw new Error(`Duplicate lesson id: ${lesson.id}`);
    if (!lesson.title || !lesson.simulatorId || !lesson.code || !Array.isArray(lesson.partIds)) {
      throw new Error(`Incomplete lesson: ${lesson.id}`);
    }
    if (simulators && !simulators.has(lesson.simulatorId)) {
      throw new Error(`Missing simulator ${lesson.simulatorId} for ${lesson.id}`);
    }
    for (const partId of lesson.partIds) {
      if (!partById.has(partId)) throw new Error(`Unknown part ${partId} in ${lesson.id}`);
    }
    byId.set(lesson.id, Object.freeze({ ...lesson, partIds: Object.freeze([...lesson.partIds]) }));
  }
  return Object.freeze({
    all: () => [...byId.values()],
    get: (id) => byId.get(id),
    has: (id) => byId.has(id),
    count: byId.size,
  });
}
