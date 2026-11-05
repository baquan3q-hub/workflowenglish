/**
 * The game layer on top of IELTS review (pure, no I/O):
 * - XP and combo: a right answer without hints is worth the most; hints lower
 *   the reward but never block it; a run of right answers multiplies it.
 * - Hearts for short timed rounds.
 * - A level from total XP, and a daily XP goal for "Mục tiêu hôm nay".
 * - "Vườn ôn tập": every card under spaced review is a plant that grows with
 *   each successful review and wilts when it is left overdue.
 *
 * Points reward recall, not speed: nothing here pays for answering fast.
 */

import { localDay } from './dailyGoalsLogic';

const DAY = 86_400_000;

// --- XP and combo ----------------------------------------------------------------

export const BASE_XP = 10;
export const HINT_COST = 3;
export const MIN_XP = 2;
/** Combo steps: ×1 for the first 2 in a row, ×2 from 3, ×3 from 6. */
export const COMBO_STEP = 3;
export const MAX_MULTIPLIER = 3;
export const START_HEARTS = 3;
export const DAILY_XP_GOAL = 50;

export const comboMultiplier = (combo: number) => Math.min(MAX_MULTIPLIER, 1 + Math.floor(Math.max(0, combo) / COMBO_STEP));

export interface Answer {
  correct: boolean;
  /** Hints, replays past the free ones, or a revealed answer. */
  hintsUsed?: number;
}

export interface Run {
  xp: number;
  /** Right answers in a row, the one just given included. */
  combo: number;
  bestCombo: number;
  hearts: number;
  right: number;
  total: number;
}

export const newRun = (hearts = START_HEARTS): Run => ({ xp: 0, combo: 0, bestCombo: 0, hearts, right: 0, total: 0 });

/** XP for one answer at the combo it reaches (0 when wrong). */
export function answerXp(answer: Answer, comboAfter: number): number {
  if (!answer.correct) return 0;
  const base = Math.max(MIN_XP, BASE_XP - HINT_COST * Math.max(0, answer.hintsUsed ?? 0));
  // A hinted answer still counts as right, but does not grow the multiplier past ×1.
  return base * (answer.hintsUsed ? 1 : comboMultiplier(comboAfter));
}

/** The run after one answer, and the XP it earned. A hinted right answer keeps the combo but does not add to it. */
export function scoreAnswer(run: Run, answer: Answer): { run: Run; gained: number } {
  const hinted = (answer.hintsUsed ?? 0) > 0;
  const combo = !answer.correct ? 0 : hinted ? run.combo : run.combo + 1;
  const gained = answerXp(answer, combo);
  return {
    gained,
    run: {
      xp: run.xp + gained,
      combo,
      bestCombo: Math.max(run.bestCombo, combo),
      hearts: answer.correct ? run.hearts : Math.max(0, run.hearts - 1),
      right: run.right + (answer.correct ? 1 : 0),
      total: run.total + 1,
    },
  };
}

/** Bonus for finishing a round: +5 per heart left, +10 for a perfect round. */
export function roundBonus(run: Run): number {
  if (!run.total) return 0;
  return run.hearts * 5 + (run.right === run.total ? 10 : 0);
}

export const outOfHearts = (run: Run) => run.hearts <= 0;

/** A short cheer for the combo just reached, or '' when there is nothing to say. */
export function comboCheer(combo: number): string {
  if (combo >= 10) return 'Không thể cản nổi!';
  if (combo >= 6) return 'Combo ×3!';
  if (combo >= 3) return 'Combo ×2!';
  return '';
}

// --- Levels ----------------------------------------------------------------------------

/** Total XP that reaches `level`: 0, 100, 300, 600, 1000… */
export const levelStartXp = (level: number) => 50 * level * (level - 1);

export interface LevelInfo {
  level: number;
  /** XP since this level started, and the size of the level. */
  into: number;
  size: number;
}

export function levelFor(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (levelStartXp(level + 1) <= xp) level++;
  const start = levelStartXp(level);
  return { level, into: xp - start, size: levelStartXp(level + 1) - start };
}

const TITLES = ['Hạt giống', 'Mầm non', 'Chồi xanh', 'Cây con', 'Cây vững', 'Cây cổ thụ', 'Khu vườn'] as const;
export const levelTitle = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.max(0, level - 1))];

// --- Profile (what is kept on the device) ---------------------------------------------

export interface GameProfile {
  totalXp: number;
  /** XP per local day, `YYYY-MM-DD`, the last 14 days. */
  days: Record<string, number>;
  bestCombo: number;
  /** Best results per game: fastest paraphrase round in ms, best T/F/NG round score… */
  best: Record<string, number>;
  /** Turns the game effects (combo pop, shake) off. */
  quiet: boolean;
  /**
   * Items that already paid XP today (item key → local day). A card, sentence
   * or answer pays once a day, so a retry or a replayed round cannot farm XP.
   * Kept on the device only.
   */
  awarded: Record<string, string>;
}

export const emptyProfile = (): GameProfile => ({ totalXp: 0, days: {}, bestCombo: 0, best: {}, quiet: false, awarded: {} });

/** The learner's own calendar day, as "Mục tiêu hôm nay" counts it. */
export const dayKey = localDay;
const KEEP_DAYS = 14;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Best results where smaller is better (times). */
export const LOWER_IS_BETTER = new Set(['paraphrase-ms']);
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function sanitizeProfile(raw: unknown, now = new Date()): GameProfile {
  const o = record(raw);
  const days: Record<string, number> = {};
  for (const [k, v] of Object.entries(record(o.days))) if (DAY_RE.test(k) && count(v)) days[k] = count(v);
  const best: Record<string, number> = {};
  for (const [k, v] of Object.entries(record(o.best))) if (count(v)) best[k] = count(v);
  // Only today's claims matter; older ones are dropped.
  const today = dayKey(now);
  const awarded: Record<string, string> = {};
  for (const [k, v] of Object.entries(record(o.awarded))) if (v === today && k.length <= 200) awarded[k] = v;
  return { totalXp: count(o.totalXp), days, bestCombo: count(o.bestCombo), best, quiet: o.quiet === true, awarded };
}

/** Adds XP to today, and drops days older than two weeks. */
export function addXp(profile: GameProfile, xp: number, now: Date, combo = 0): GameProfile {
  const gained = count(xp);
  if (!gained && combo <= profile.bestCombo) return profile;
  const today = dayKey(now);
  const oldest = dayKey(new Date(now.getTime() - (KEEP_DAYS - 1) * DAY));
  const days: Record<string, number> = {};
  for (const [k, v] of Object.entries(profile.days)) if (k >= oldest) days[k] = v;
  if (gained) days[today] = (days[today] ?? 0) + gained;
  return { ...profile, totalXp: profile.totalXp + gained, days, bestCombo: Math.max(profile.bestCombo, count(combo)) };
}

/** Whether `item` has already paid XP today. */
export const claimedToday = (profile: GameProfile, item: string, now: Date) => profile.awarded[item] === dayKey(now);

/**
 * XP for an item that pays once a day: the full amount the first time today,
 * 0 after that. Returns the profile with the claim noted, and what was paid.
 */
export function claimXp(profile: GameProfile, item: string, xp: number, now: Date, combo = 0): { profile: GameProfile; paid: number } {
  if (claimedToday(profile, item, now)) return { profile: addXp(profile, 0, now, combo), paid: 0 };
  const today = dayKey(now);
  const awarded: Record<string, string> = {};
  for (const [k, v] of Object.entries(profile.awarded)) if (v === today) awarded[k] = v;
  awarded[item] = today;
  const paid = count(xp);
  return { profile: { ...addXp(profile, paid, now, combo), awarded }, paid };
}

export const todayXp = (profile: GameProfile, now: Date) => profile.days[dayKey(now)] ?? 0;

/** XP for the last 7 days, oldest first, for the small week chart. */
export function weekXp(profile: GameProfile, now: Date): { day: string; xp: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (6 - i) * DAY));
    return { day, xp: profile.days[day] ?? 0 };
  });
}

/**
 * Keeps a best result. `lower` means smaller is better (a time).
 * Returns the profile and whether this was a new record.
 */
export function recordBest(profile: GameProfile, game: string, value: number, lower = LOWER_IS_BETTER.has(game)): { profile: GameProfile; record: boolean } {
  const v = count(value);
  if (!v) return { profile, record: false };
  const old = profile.best[game];
  const isRecord = old === undefined || (lower ? v < old : v > old);
  return isRecord ? { profile: { ...profile, best: { ...profile.best, [game]: v } }, record: isRecord } : { profile, record: isRecord };
}

/**
 * Two copies of one learner's profile (this device and the cloud) as one:
 * the larger total, each day's larger count, each game's better record. The
 * same input twice gives the same result, so syncing again changes nothing.
 * `quiet` and today's claims come from `local`, this device's choice.
 */
export function mergeProfiles(local: GameProfile, remote: GameProfile): GameProfile {
  const days: Record<string, number> = { ...remote.days };
  for (const [k, v] of Object.entries(local.days)) days[k] = Math.max(days[k] ?? 0, v);
  const best: Record<string, number> = { ...remote.best };
  for (const [k, v] of Object.entries(local.best)) {
    const old = best[k];
    best[k] = old === undefined ? v : LOWER_IS_BETTER.has(k) ? Math.min(old, v) : Math.max(old, v);
  }
  return {
    totalXp: Math.max(local.totalXp, remote.totalXp),
    days,
    bestCombo: Math.max(local.bestCombo, remote.bestCombo),
    best,
    quiet: local.quiet,
    awarded: local.awarded,
  };
}

/** Whether two profiles hold the same synced data (claims and `quiet` aside). */
export function sameSynced(a: GameProfile, b: GameProfile): boolean {
  const eq = (x: Record<string, number>, y: Record<string, number>) => {
    const kx = Object.keys(x);
    return kx.length === Object.keys(y).length && kx.every((k) => x[k] === y[k]);
  };
  return a.totalXp === b.totalXp && a.bestCombo === b.bestCombo && eq(a.days, b.days) && eq(a.best, b.best);
}

// --- Garden ---------------------------------------------------------------------------

export type GardenSkill = 'reading' | 'writing' | 'speaking';

/** 0 seed, 1 sprout, 2 young plant, 3 tree. Past the last review it flowers. */
export type PlantStage = 0 | 1 | 2 | 3;
export type PlantState = 'growing' | 'thirsty' | 'wilted' | 'bloom';

export interface Plant {
  id: string;
  skill: GardenSkill;
  stage: PlantStage;
  state: PlantState;
  /** ISO time it next needs a review; null for a flower. */
  dueAt: string | null;
}

/** Overdue this many days or more and the plant wilts (it still revives with one review). */
export const WILT_DAYS = 3;

export function plantState(dueAt: string | null, now: Date): PlantState {
  if (!dueAt) return 'bloom';
  const due = Date.parse(dueAt);
  if (Number.isNaN(due) || due > now.getTime()) return 'growing';
  return now.getTime() - due >= WILT_DAYS * DAY ? 'wilted' : 'thirsty';
}

export const clampStage = (n: number): PlantStage => Math.min(3, Math.max(0, Math.floor(Number(n) || 0))) as PlantStage;

/** The plant for a card in steps of `steps` (Reading and Writing use 4: 1, 3, 7, 21 days). */
export function plantFor(id: string, skill: GardenSkill, step: number, steps: number, dueAt: string | null, now: Date): Plant {
  const stage = clampStage(steps <= 1 ? 3 : Math.round((Math.max(0, step) / (steps - 1)) * 3));
  return { id, skill, stage, state: plantState(dueAt, now), dueAt };
}

export interface GardenSummary {
  total: number;
  thirsty: number;
  wilted: number;
  bloom: number;
  bySkill: Record<GardenSkill, { total: number; due: number }>;
}

export function gardenSummary(plants: readonly Plant[]): GardenSummary {
  const bySkill: GardenSummary['bySkill'] = { reading: { total: 0, due: 0 }, writing: { total: 0, due: 0 }, speaking: { total: 0, due: 0 } };
  let thirsty = 0;
  let wilted = 0;
  let bloom = 0;
  for (const p of plants) {
    bySkill[p.skill].total++;
    if (p.state === 'thirsty' || p.state === 'wilted') bySkill[p.skill].due++;
    if (p.state === 'thirsty') thirsty++;
    else if (p.state === 'wilted') wilted++;
    else if (p.state === 'bloom') bloom++;
  }
  return { total: plants.length, thirsty, wilted, bloom, bySkill };
}

/** Plants to draw: the ones needing water first (wilted, then thirsty), then growing, then flowers; at most `max`. */
export function gardenBeds(plants: readonly Plant[], max = 24): Plant[] {
  const order: Record<PlantState, number> = { wilted: 0, thirsty: 1, growing: 2, bloom: 3 };
  return [...plants].sort((a, b) => order[a.state] - order[b.state] || b.stage - a.stage || a.id.localeCompare(b.id)).slice(0, max);
}

/** The garden's one line for the learner. */
export function gardenLine(s: GardenSummary): string {
  if (!s.total) return 'Vườn còn trống. Làm sai một câu, cây đầu tiên sẽ mọc ở đây: ôn đúng hạn để nó lớn.';
  const due = s.thirsty + s.wilted;
  if (s.wilted) return `${s.wilted} cây đang héo vì quá hạn. Ôn một lần là cây tươi lại.`;
  if (due) return `${due} cây đang khát nước: ôn ngay hôm nay để cây lớn thêm.`;
  return 'Vườn đang xanh tốt. Không có cây nào cần tưới hôm nay.';
}

// --- XP from the other review screens ----------------------------------------------------

/**
 * XP for a graded try scored 0–100 (a translated sentence, a dictated line):
 * 10 from 85, 7 from 70, else 2 for the effort; hints cost as above.
 */
export function scoreXp(score: number, hintsUsed = 0): number {
  const base = score >= 85 ? BASE_XP : score >= 70 ? 7 : MIN_XP;
  return Math.max(MIN_XP, base - HINT_COST * Math.max(0, hintsUsed));
}

/** XP for rating a Speaking practice try. */
export const PRACTICE_XP = { again: MIN_XP, good: 8, easy: BASE_XP } as const;
