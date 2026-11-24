import { checkpoints, checkpointSkills, transfer } from '../data/grammar/transfer';
import { curriculum } from '../data/grammar/catalog';
import type { GrammarLesson } from '../data/grammar/types';
import type { GrammarGrade } from '../supabase/functions/ai-proxy/ops/grammar';

export type Mode = 'lesson' | 'placement' | 'checkpoint' | 'review';
export type TaskKind = 'choice' | 'fill' | 'translate' | 'write' | 'speak';
export interface Task {
  skill: string;
  item: number;
  kind: TaskKind;
}
export interface Evidence extends Task {
  id: string;
  session: string;
  at: string;
  mode: Mode;
  version: 1;
  prompt?: string;
  expected?: string;
  answer: string;
  result: 'correct' | 'incorrect' | 'pending' | 'finished';
  assisted: boolean;
  typedFallback: boolean;
  delayedReview?: boolean;
  feedback?: GrammarGrade;
}
export interface Session {
  id: string;
  mode: Mode;
  tasks: Task[];
  index: number;
  started: boolean;
  answer: string;
  hinted: boolean;
  spoken: boolean;
  lastId?: string;
  delayedReview?: boolean;
}
export const production = (kind: TaskKind) => ['translate', 'write', 'speak'].includes(kind);
export function cloze(line: string) {
  const match = /\[([^/\]]+)\/([^\]]+)\]/.exec(line);
  if (!match) throw new Error('Invalid grammar item: ' + line);
  return { prompt: line.replace(match[0], '_____'), correct: match[1], distractor: match[2] };
}
export const normalize = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
export function promptFor(lesson: GrammarLesson, task: Task) {
  if (task.item === 15) return transfer[lesson.id].review;
  if (task.item === 16) return checkpoints[checkpointSkills.indexOf(lesson.id)];
  if (task.kind === 'translate') return lesson.translation;
  if (task.kind === 'write') return lesson.write;
  if (task.kind === 'speak') return lesson.speak;
  return cloze(lesson.items[task.item]).prompt;
}
const chronological = (a: Evidence, b: Evidence) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id);
export function skillStats(events: Evidence[], skill: string) {
  const history = events.filter((e) => e.skill === skill).sort(chronological);
  const graded = history.filter((e) => e.result === 'correct' || e.result === 'incorrect');
  // Revisions of the same prompt can help practice, but are not independent evidence.
  const seen = new Set<string>();
  const latest = new Map<number, Evidence>();
  for (const event of graded) {
    const key = event.session + '/' + event.item;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.set(event.item, event);
  }
  const fresh = [...latest.values()].sort(chronological);
  const five = fresh.slice(-5);
  const independent = five.filter((e) => e.result === 'correct' && !e.assisted);
  const mastered =
    five.length === 5 &&
    independent.length >= 4 &&
    new Set(independent.map((e) => e.session)).size >= 2 &&
    independent.some((e) => production(e.kind));
  const completed = history.some((e) => e.result === 'finished' && e.mode === 'lesson');
  const reviews = graded.filter((e) => e.mode === 'review');
  const lastError = graded.map((e) => e.result).lastIndexOf('incorrect');
  const successfulReviews = new Set(
    graded
      .slice(lastError + 1)
      .filter((e) => e.mode === 'review' && e.delayedReview && e.result === 'correct' && !e.assisted)
      .map((e) => e.session)
  ).size;
  const last = graded.at(-1);
  const due =
    last && (completed || last.result === 'incorrect')
      ? Date.parse(last.at) + [1, 3, 7, 21][Math.min(3, successfulReviews)] * 86400000
      : Infinity;
  const weak = graded.slice(-2).length === 2 && graded.slice(-2).every((e) => e.result === 'incorrect');
  const strong =
    graded.slice(-3).length === 3 && graded.slice(-3).every((e) => e.result === 'correct' && !e.assisted);
  return { mastered: mastered && !weak, completed, due, weak, strong, graded, reviews };
}
export function placementStart(events: Evidence[]) {
  const completed = events
    .filter((e) => e.mode === 'placement' && e.result === 'finished')
    .sort(chronological)
    .at(-1);
  if (!completed) return 0;
  const tested = events.filter((e) => e.session === completed.session && e.result !== 'finished');
  for (let group = 1; group <= 6; group++) {
    const unit = curriculum.filter((s) => s.group === group);
    if (!unit.filter((s) => tested.some((e) => e.skill === s.id && e.result === 'correct')).length)
      return (group - 1) * 4;
    const wrong = unit.find((s) => tested.some((e) => e.skill === s.id && e.result === 'incorrect'));
    if (wrong) return curriculum.indexOf(wrong);
  }
  return 23;
}
export function recommend(events: Evidence[], now = Date.now()) {
  const stats = curriculum.map((skill) => skillStats(events, skill.id));
  const due = stats
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.due <= now)
    .sort((a, b) => a.due - b.due)[0];
  if (due)
    return {
      skill: curriculum[due.i],
      mode: 'review' as Mode,
      reason: 'Đã đến lúc thử lại cấu trúc này trong ngữ cảnh mới.',
    };
  const start = placementStart(events);
  const next = stats.findIndex((s, i) => i >= start && !s.completed);
  if (next < 0)
    return {
      skill: curriculum[23],
      mode: 'checkpoint' as Mode,
      reason: 'Bạn đã đi hết các bài được đề xuất. Hãy kiểm tra lại cụm cuối.',
    };
  return {
    skill: curriculum[next],
    mode: 'lesson' as Mode,
    reason:
      start && next === start
        ? 'Bài được chọn từ kết quả tìm điểm bắt đầu của bạn.'
        : 'Bài tiếp theo trong lộ trình nền tảng của bạn.',
  };
}
export function makeSession(mode: Mode, skill: string, events: Evidence[], minutes: number): Session {
  const selected = curriculum.find((s) => s.id === skill)!;
  const task = (id: string, item: number, kind: TaskKind = 'choice'): Task => ({ skill: id, item, kind });
  let tasks: Task[];
  if (mode === 'placement') {
    tasks = curriculum.filter((_, i) => i % 4 === 0 || i % 4 === 2).map((s) => task(s.id, 8));
  } else if (mode === 'checkpoint') {
    tasks = curriculum.filter((s) => s.group === selected.group).map((s) => task(s.id, 9, 'fill'));
    tasks.push(task(checkpointSkills[selected.group - 1], 16, 'write'));
  } else {
    const stats = skillStats(events, skill);
    const uses = (n: number) => stats.graded.filter((e) => e.item === n).length;
    if (mode === 'review') {
      const items = [10, 11].sort((a, b) => uses(a) - uses(b));
      tasks = items.map((n) => task(skill, n, 'fill'));
      tasks.push(task(skill, 15, 'write'));
    } else {
      const items = Array.from({ length: 8 }, (_, i) => i).sort((a, b) => uses(a) - uses(b));
      tasks = items
        .slice(0, minutes <= 10 ? 4 : minutes <= 20 ? 6 : 8)
        .map((n, i) => task(skill, n, stats.strong || i >= 3 ? 'fill' : 'choice'));
      tasks.push(task(skill, 12, 'translate'), task(skill, 13, 'write'), task(skill, 14, 'speak'));
    }
  }
  return {
    id: crypto.randomUUID(),
    mode,
    tasks,
    delayedReview: mode === 'review' && skillStats(events, skill).due <= Date.now(),
    index: 0,
    started: mode !== 'lesson',
    answer: '',
    hinted: false,
    spoken: false,
  };
}
export function advance(session: Session, events: Evidence[]): Session {
  const index = session.index + 1;
  const tasks = [...session.tasks];
  const next = tasks[index];
  if (next && session.mode === 'lesson' && !production(next.kind)) {
    const stats = skillStats(events, next.skill);
    if (stats.weak || stats.strong) tasks[index] = { ...next, kind: stats.weak ? 'choice' : 'fill' };
  }
  return { ...session, tasks, index, lastId: undefined, answer: '', hinted: false, spoken: false };
}
