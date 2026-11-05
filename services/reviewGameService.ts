/**
 * Where the review game keeps its XP: one profile per learner, on this device
 * and in `review_game_profiles` (migration 018) so it follows the learner to
 * other devices. Until the migration is run it stays on the device.
 * Screens subscribe so the XP bar moves as soon as a game awards points.
 * The garden is read from the decks the review screens already keep.
 */
import { useEffect, useState } from 'react';
import { claimXp, addXp, emptyProfile, mergeProfiles, plantFor, recordBest, sameSynced, sanitizeProfile, type GameProfile, type Plant } from './reviewGameLogic';
import { supabase } from './supabaseClient';

const KEY = 'ielts-review-game:v1:';
const TABLE = 'review_game_profiles';
const listeners = new Set<() => void>();

export function loadProfile(userId: string, now = new Date()): GameProfile {
  try {
    return userId ? sanitizeProfile(JSON.parse(localStorage.getItem(KEY + userId) ?? 'null'), now) : emptyProfile();
  } catch {
    return emptyProfile();
  }
}

function writeLocal(userId: string, profile: GameProfile): void {
  try {
    localStorage.setItem(KEY + userId, JSON.stringify(profile));
  } catch {
    // Storage full or blocked: the XP lasts for this visit.
  }
  listeners.forEach((l) => l());
}

export function saveProfile(userId: string, profile: GameProfile): void {
  if (!userId) return;
  writeLocal(userId, profile);
  scheduleUpload(userId);
}

// --- Cloud copy -----------------------------------------------------------------

/** Migration 018 not run yet (same test as isMissingTable in listeningLibraryLogic, copied to keep this module light). */
const isMissingTable = (message: string) => /relation \S+ does not exist|could not find the table \S+ in the schema cache/i.test(message);

/** False once the table turned out to be missing: XP stays on this device. */
let available = true;
const PUSH_DELAY = 2000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleUpload(userId: string): void {
  if (!available || typeof setTimeout === 'undefined') return;
  clearTimeout(timers.get(userId));
  timers.set(
    userId,
    setTimeout(() => {
      timers.delete(userId);
      void upload(userId, loadProfile(userId));
    }, PUSH_DELAY),
  );
}

function noteError(message: string): void {
  if (isMissingTable(message)) available = false;
  else console.warn('[ReviewGame] could not sync XP:', message);
}

async function upload(userId: string, p: GameProfile): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    total_xp: p.totalXp,
    best_combo: p.bestCombo,
    days: p.days,
    best: p.best,
    quiet: p.quiet,
    updated_at: new Date().toISOString(),
  });
  if (error) noteError(error.message);
}

const synced = new Set<string>();

/**
 * Once per learner and visit: merges the cloud copy with this device's and
 * keeps the result in both places. Safe to call more than once.
 */
export async function syncProfile(userId: string): Promise<void> {
  if (!userId || !available || synced.has(userId)) return;
  synced.add(userId);
  const { data, error } = await supabase.from(TABLE).select('total_xp, best_combo, days, best, quiet').eq('user_id', userId).maybeSingle();
  if (error) {
    synced.delete(userId);
    return noteError(error.message);
  }
  const local = loadProfile(userId);
  const row = data as { total_xp?: unknown; best_combo?: unknown; days?: unknown; best?: unknown } | null;
  const remote = sanitizeProfile(row ? { totalXp: row.total_xp, bestCombo: row.best_combo, days: row.days, best: row.best } : null);
  const merged = mergeProfiles(local, remote);
  if (!sameSynced(merged, local)) writeLocal(userId, merged);
  if (!row || !sameSynced(merged, remote)) await upload(userId, merged);
}

// --- Awarding XP ------------------------------------------------------------------

/**
 * Adds XP (and a combo reached) to the learner's profile. With `item`, the
 * XP is paid only the first time that item is scored today. Returns what was paid.
 */
export function awardXp(userId: string, xp: number, combo = 0, now = new Date(), item?: string): number {
  if (!userId) return 0;
  const before = loadProfile(userId, now);
  if (item) {
    const { profile, paid } = claimXp(before, item, xp, now, combo);
    if (profile !== before) saveProfile(userId, profile);
    return paid;
  }
  const after = addXp(before, xp, now, combo);
  if (after !== before) saveProfile(userId, after);
  return after.totalXp - before.totalXp;
}

/** Keeps a best result; true when it is a new record. */
export function saveBest(userId: string, game: string, value: number, lower?: boolean): boolean {
  const { profile, record } = recordBest(loadProfile(userId), game, value, lower);
  if (record) saveProfile(userId, profile);
  return record;
}

export function setQuiet(userId: string, quiet: boolean): void {
  saveProfile(userId, { ...loadProfile(userId), quiet });
}

/** The learner's profile, kept current, and synced with the cloud once per visit. */
export function useGameProfile(userId: string): GameProfile {
  const [profile, setProfile] = useState(() => loadProfile(userId));
  useEffect(() => {
    const update = () => setProfile(loadProfile(userId));
    update();
    listeners.add(update);
    void syncProfile(userId);
    // XP awarded in another tab, or storage cleared.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === KEY + userId) update();
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
  const writing = readJson(GARDEN_KEYS.writing + userId);
  for (const [key, raw] of Object.entries(obj(writing.sentences))) {
    const s = obj(raw);
    // box -1 with no review date: done (well the first time, or past the last review). Those are counted below.
    if (typeof s.box !== 'number' || s.box < 0) continue;
    plants.push(plantFor(`w:${key}`, 'writing', s.box, WRITING_STEPS, str(s.due) ?? now.toISOString(), now));
  }
  // Sentences that passed their last review flower, as Reading's finished cards do.
  for (let i = 0; i < Math.min(num(writing.mastered), 30); i++) plants.push(plantFor(`w:done:${i}`, 'writing', 3, WRITING_STEPS, null, now));
  for (const [key, raw] of Object.entries(readJson(GARDEN_KEYS.speaking + userId))) {
    const a = obj(raw);
    if (typeof a.answer !== 'string' || !a.answer.trim()) continue;
    // Never practised yet: due now, as in the bank.
    plants.push(plantFor(`s:${key}`, 'speaking', num(a.stage), SPEAKING_STEPS, str(a.dueAt) ?? str(a.updatedAt) ?? now.toISOString(), now));
  }
  return plants;
}
