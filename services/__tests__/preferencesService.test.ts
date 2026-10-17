import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

const store: Record<string, string> = {};
let blocked = false;
globalThis.localStorage = {
  getItem: (key: string) => {
    if (blocked) throw new Error('SecurityError');
    return store[key] ?? null;
  },
  setItem: (key: string, value: string) => {
    if (blocked) throw new Error('SecurityError');
    store[key] = value;
  },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
} as any;

import {
  DEFAULT_PREFERENCES,
  REVIEW_MODES,
  REVIEW_SESSION_SIZES,
  getPreferences,
  sanitizePreferences,
  setPreferences,
} from '../preferencesService';

beforeEach(() => {
  blocked = false;
  localStorage.clear();
});

describe('preferencesService', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getPreferences('u1')).toEqual(DEFAULT_PREFERENCES);
  });

  it('defaults the review session to 20 words', () => {
    expect(DEFAULT_PREFERENCES.reviewSessionSize).toBe(20);
  });

  it('round-trips a saved value', () => {
    setPreferences('u1', { reviewSessionSize: 50, reviewMode: 'typing' });
    expect(getPreferences('u1')).toEqual({
      ...DEFAULT_PREFERENCES,
      reviewSessionSize: 50,
      reviewMode: 'typing',
    });
  });

  it('merges patches instead of replacing', () => {
    setPreferences('u1', { reviewSessionSize: 10 });
    setPreferences('u1', { requireTypingBeforeFlip: true });
    expect(getPreferences('u1')).toMatchObject({ reviewSessionSize: 10, requireTypingBeforeFlip: true });
  });

  it('keeps users apart', () => {
    setPreferences('u1', { reviewSessionSize: 50 });
    expect(getPreferences('u2').reviewSessionSize).toBe(20);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('vocabmaster-prefs:u1', '{not json');
    expect(getPreferences('u1')).toEqual(DEFAULT_PREFERENCES);
  });

  it('survives blocked storage on read and write', () => {
    blocked = true;
    expect(getPreferences('u1')).toEqual(DEFAULT_PREFERENCES);
    expect(setPreferences('u1', { reviewSessionSize: 30 }).reviewSessionSize).toBe(30);
  });

  it('ignores an empty user id', () => {
    expect(setPreferences('', { reviewSessionSize: 50 }).reviewSessionSize).toBe(50);
    expect(Object.keys(store)).toHaveLength(0);
  });

  it('sanitize always yields a valid preference object', () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        const p = sanitizePreferences(raw);
        expect(REVIEW_SESSION_SIZES).toContain(p.reviewSessionSize);
        expect(REVIEW_MODES).toContain(p.reviewMode);
        expect(typeof p.requireTypingBeforeFlip).toBe('boolean');
        expect(Object.keys(p).sort()).toEqual(Object.keys(DEFAULT_PREFERENCES).sort());
      }),
    );
  });
});
