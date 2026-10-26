/**
 * The Learn-page mascot (pure): which state an event puts it in, how long that
 * lasts, which picture shows, what it says and how far it leans toward the cursor.
 * The component only draws it, so a Rive file can later replace the pictures
 * and take the same states.
 */

export type MascotState = 'idle' | 'look' | 'wave' | 'nod' | 'hop' | 'celebrate' | 'sleepy';
export type MascotEvent = 'hover-mascot' | 'hover-target' | 'goal-added' | 'goal-done' | 'all-done' | 'idle-timeout';
/** The pictures in public/mascot/<pose>.png. The friendly wave doubles as the resting pose. */
export type MascotPose = 'wave' | 'cheer' | 'sleepy' | 'thumbs';

export const MASCOT_POSES: readonly MascotPose[] = ['wave', 'cheer', 'sleepy', 'thumbs'];

export const POSE_OF: Record<MascotState, MascotPose> = {
  idle: 'wave',
  look: 'wave',
  wave: 'wave',
  nod: 'thumbs',
  hop: 'cheer',
  celebrate: 'cheer',
  sleepy: 'sleepy',
};

const EVENT_STATE: Record<MascotEvent, MascotState> = {
  'hover-mascot': 'wave',
  'hover-target': 'look',
  'goal-added': 'nod',
  'goal-done': 'hop',
  'all-done': 'celebrate',
  'idle-timeout': 'sleepy',
};

/** A reaction is not cut short by a smaller one (hovering during a celebration). */
const PRIORITY: Record<MascotState, number> = { idle: 0, sleepy: 1, look: 2, wave: 3, nod: 4, hop: 5, celebrate: 6 };

/** How long each reaction plays before going back to rest; absent = until something else happens. */
export const HOLD_MS: Partial<Record<MascotState, number>> = { wave: 1600, nod: 1400, hop: 1300, celebrate: 3600 };

/** No pointer or key activity for this long and the mascot starts to doze. */
export const IDLE_AFTER_MS = 20_000;

/**
 * The state after `event`. `playing` says whether the current reaction is still
 * within its HOLD_MS; while it is, only an equal or bigger reaction replaces it.
 */
export function reactTo(current: MascotState, event: MascotEvent, playing: boolean): MascotState {
  const next = EVENT_STATE[event];
  if (playing && PRIORITY[next] < PRIORITY[current]) return current;
  return next;
}

/** Leaving the hovered thing or a reaction ending: back to rest. */
export const settle = (): MascotState => 'idle';

export interface MessageInput {
  state: MascotState;
  /** "Chào buổi sáng, Quân". */
  greeting: string;
  done: number;
  total: number;
  /** Title of the first goal not done yet. */
  next: string | null;
}

/** What the speech bubble says. */
export function mascotMessage({ state, greeting, done, total, next }: MessageInput): string {
  const left = total - done;
  const allDone = total > 0 && left === 0;
  if (state === 'celebrate' || (allDone && state === 'hop')) return `Xong hết ${total} mục tiêu hôm nay rồi. Tuyệt vời!`;
  if (state === 'hop') return left === 1 ? 'Xong thêm một việc! Chỉ còn một mục nữa thôi.' : `Xong thêm một việc! Còn ${left} mục nữa.`;
  if (state === 'nod') return 'Mục tiêu mới đây rồi. Mình cùng làm nhé!';
  if (state === 'sleepy') return allDone ? 'Hôm nay bạn làm tốt lắm. Mình chợp mắt chút đây…' : 'Buồn ngủ quá… Mình chờ bạn quay lại nhé.';
  if (allDone) return `${greeting}! Hôm nay bạn đã xong hết mục tiêu.`;
  if (next) return `${greeting}! Bắt đầu với “${next}” nhé.`;
  return `${greeting}! Thêm một mục tiêu cho hôm nay nhé.`;
}

/** Most the mascot moves toward the cursor: a lean, not a chase. */
export const LOOK_MAX = { x: 6, y: 4, rotate: 4 } as const;

const clamp = (v: number) => (Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);

/**
 * How far to lean for a cursor at (nx, ny), each -1..1 from the mascot's centre
 * (the edges of the hero). Nothing when the learner asked for reduced motion.
 */
export function lookOffset(nx: number, ny: number, reducedMotion: boolean): { x: number; y: number; rotate: number } {
  if (reducedMotion) return { x: 0, y: 0, rotate: 0 };
  const x = clamp(nx);
  const y = clamp(ny);
  const round = (v: number) => Math.round(v * 10) / 10 + 0;
  return { x: round(x * LOOK_MAX.x), y: round(y * LOOK_MAX.y), rotate: round(x * LOOK_MAX.rotate) };
}

/** A point relative to a box, as -1..1 from its centre on each axis. */
export function normalisePoint(px: number, py: number, box: { left: number; top: number; width: number; height: number }): { nx: number; ny: number } {
  const nx = box.width > 0 ? ((px - box.left) / box.width) * 2 - 1 : 0;
  const ny = box.height > 0 ? ((py - box.top) / box.height) * 2 - 1 : 0;
  return { nx: clamp(nx), ny: clamp(ny) };
}

/** The state an event asks for, before priority decides whether it plays. */
export const eventState = (event: MascotEvent): MascotState => EVENT_STATE[event];
