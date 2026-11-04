/**
 * Where the review game keeps its XP: on this device, one profile per learner.
 * Screens subscribe so the XP bar moves as soon as a game awards points.
 * The garden is read from the decks the review screens already keep.
 */
import { useEffect, useState } from 'react';
import { addXp, emptyProfile, plantFor, recordBest, sanitizeProfile, type GameProfile, type Plant } from './reviewGameLogic';

const KEY = 'ielts-review-game:v1:';
const listeners = new Set<() => void>();

export function loadProfile(userId: string): GameProfile {
  try {
    return userId ? sanitizeProfile(JSON.parse(localStorage.getItem(KEY + userId) ?? 'null')) : emptyProfile();
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(userId: string, profile: GameProfile): void {
  if (!userId) return;
  try {
    localStorage.setItem(KEY + userId, JSON.stringify(profile));
  } catch {
    // Storage full or blocked: the XP lasts for this visit.
  }
  listeners.forEach((l) => l());
}

/** Adds XP (and a combo reached) to the learner's profile. */
export function awardXp(userId: string, xp: number, combo = 0, now = new Date()): void {
  const before = loadProfile(userId);
  const after = addXp(before, xp, now, combo);
  if (after !== before) saveProfile(userId, after);
}

/** Keeps a best result; true when it is a new record. */
export function saveBest(userId: string, game: string, value: number, lower = false): boolean {
  const { profile, record } = recordBest(loadProfile(userId), game, value, lower);
  if (record) saveProfile(userId, profile);
  return record;
}

export function setQuiet(userId: string, quiet: boolean): void {
  saveProfile(userId, { ...loadProfile(userId), quiet });
}

/** The learner's profile, kept current. */
export function useGameProfile(userId: string): GameProfile {
  const [profile, setProfile] = useState(() => loadProfile(userId));
  useEffect(() => {
    const update = () => setProfile(loadProfile(userId));
    update();
    listeners.add(update);
    // XP awarded in another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY + userId) update();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(update);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);
  return profile;
}

/**
 * Every card under review as a plant: Reading misses, Writing sentences and
 * Speaking answers. Read straight from the device copies those screens keep,
 * without loading their modules (passages, prompts), so the IELTS home stays light.
 */
export const GARDEN_KEYS = { reading: 'ielts-reading-review:v1:', writing: 'ielts-translate:v1:', speaking: 'ielts-speaking-bank:v1:' } as const;
/** REVIEW_DAYS in Reading and Writing (1, 3, 7, 21) and PRACTICE_STAGES in Speaking; a test checks they still match. */
export const READING_STEPS = 4;
export const WRITING_STEPS = 4;
export const SPEAKING_STEPS = 5;

const readJson = (key: string): Record<string, unknown> => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null');
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function loadGarden(userId: string, now = new Date()): Plant[] {
  if (!userId) return [];
  const plants: Plant[] = [];
  const deck = readJson(GARDEN_KEYS.reading + userId);
  for (const [key, c] of Object.entries(obj(deck.cards))) plants.push(plantFor(`r:${key}`, 'reading', num(obj(c).box), READING_STEPS, str(obj(c).dueAt) ?? now.toISOString(), now));
  // Finished cards leave the deck; they stay in the garden as flowers.
  for (let i = 0; i < Math.min(num(deck.mastered), 30); i++) plants.push(plantFor(`r:done:${i}`, 'reading', 3, READING_STEPS, null, now));
  for (const [key, raw] of Object.entries(obj(readJson(GARDEN_KEYS.writing + userId).sentences))) {
    const s = obj(raw);
    // box -1: written well the first time, so never planted.
    if (typeof s.box !== 'number' || s.box < 0) continue;
    const due = str(s.due);
    plants.push(plantFor(`w:${key}`, 'writing', due ? s.box : 3, WRITING_STEPS, due, now));
  }
  for (const [key, raw] of Object.entries(readJson(GARDEN_KEYS.speaking + userId))) {
    const a = obj(raw);
    if (typeof a.answer !== 'string' || !a.answer.trim()) continue;
    // Never practised yet: due now, as in the bank.
    plants.push(plantFor(`s:${key}`, 'speaking', num(a.stage), SPEAKING_STEPS, str(a.dueAt) ?? str(a.updatedAt) ?? now.toISOString(), now));
  }
  return plants;
}
