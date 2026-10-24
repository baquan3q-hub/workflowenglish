/**
 * Pastel tone palette shared by every screen.
 *
 * Eight soft, positive tones. Each one has four slots:
 *   bg     — card / tile background (tint on the page surface)
 *   soft   — a step deeper, for chips, icon tiles and the primary button
 *   fg     — text and icons on bg or soft; meets WCAG AA (≥ 4.5:1) on both
 *   border — outline, and the hover fill of tone buttons
 *   accent — mid-tone fill for progress bars and dots (never under text)
 *
 * TONE_RGB below is the source of truth. index.html mirrors it as
 * `--tone-{name}-{slot}` CSS variables (`:root` for light, `.dark` for dark)
 * and registers them in tailwind.config as `tone.{name}.DEFAULT/soft/fg/border/accent`.
 * A test checks that both copies agree and that every pair passes AA.
 *
 * Class strings are written out in full (never built by concatenation) so the
 * Tailwind CDN compiler can see them.
 */

import type { IeltsSkill } from '../../types';

export type Tone = 'sky' | 'mint' | 'lavender' | 'peach' | 'butter' | 'aqua' | 'blush' | 'periwinkle';
export type Rgb = readonly [number, number, number];

export interface ToneRgb {
  bg: Rgb;
  soft: Rgb;
  fg: Rgb;
  border: Rgb;
  /** Mid-tone fill for progress bars and dots (no text on it). */
  accent: Rgb;
}

export const TONES: readonly Tone[] = ['sky', 'mint', 'lavender', 'peach', 'butter', 'aqua', 'blush', 'periwinkle'];

/**
 * Light: Tailwind 50 / 100 / 200 / 800 of the matching hue.
 * Dark: the hue's 400 mixed into slate-900 at 12% / 20% / 40%, with 200 text.
 * accent is the hue's 400 in both themes.
 */
export const TONE_RGB: Record<'light' | 'dark', Record<Tone, ToneRgb>> = {
  light: {
    sky: { bg: [240, 249, 255], soft: [224, 242, 254], border: [186, 230, 253], fg: [7, 89, 133], accent: [56, 189, 248] },
    mint: { bg: [236, 253, 245], soft: [209, 250, 229], border: [167, 243, 208], fg: [6, 95, 70], accent: [52, 211, 153] },
    lavender: { bg: [245, 243, 255], soft: [237, 233, 254], border: [221, 214, 254], fg: [91, 33, 182], accent: [167, 139, 250] },
    peach: { bg: [255, 247, 237], soft: [255, 237, 213], border: [254, 215, 170], fg: [154, 52, 18], accent: [251, 146, 60] },
    butter: { bg: [254, 252, 232], soft: [254, 249, 195], border: [254, 240, 138], fg: [133, 77, 14], accent: [250, 204, 21] },
    aqua: { bg: [240, 253, 250], soft: [204, 251, 241], border: [153, 246, 228], fg: [17, 94, 89], accent: [45, 212, 191] },
    blush: { bg: [253, 242, 248], soft: [252, 231, 243], border: [251, 207, 232], fg: [157, 23, 77], accent: [244, 114, 182] },
    periwinkle: { bg: [238, 242, 255], soft: [224, 231, 255], border: [199, 210, 254], fg: [55, 48, 163], accent: [129, 140, 248] },
  },
  dark: {
    sky: { bg: [20, 43, 67], soft: [23, 56, 83], border: [31, 89, 124], fg: [186, 230, 253], accent: [56, 189, 248] },
    mint: { bg: [19, 46, 55], soft: [22, 61, 64], border: [30, 98, 86], fg: [167, 243, 208], accent: [52, 211, 153] },
    lavender: { bg: [33, 37, 67], soft: [45, 46, 84], border: [76, 69, 125], fg: [221, 214, 254], accent: [167, 139, 250] },
    peach: { bg: [43, 38, 44], soft: [62, 48, 46], border: [109, 72, 49], fg: [254, 215, 170], accent: [251, 146, 60] },
    butter: { bg: [43, 45, 39], soft: [62, 59, 38], border: [109, 95, 34], fg: [254, 240, 138], accent: [250, 204, 21] },
    aqua: { bg: [19, 46, 60], soft: [21, 61, 72], border: [27, 99, 102], fg: [153, 246, 228], accent: [45, 212, 191] },
    blush: { bg: [42, 34, 59], soft: [61, 41, 70], border: [107, 59, 98], fg: [251, 207, 232], accent: [244, 114, 182] },
    periwinkle: { bg: [29, 37, 67], soft: [38, 46, 83], border: [61, 70, 124], fg: [199, 210, 254], accent: [129, 140, 248] },
  },
};

/** Which tone each IELTS skill wears, everywhere it appears. */
export const SKILL_TONE: Record<IeltsSkill | 'reading', Tone> = {
  listening: 'sky',
  reading: 'mint',
  writing: 'lavender',
  speaking: 'peach',
};

/** Tones for navigation destinations and feature areas. */
export const NAV_TONE = {
  home: 'periwinkle',
  ielts: 'periwinkle',
  vocabulary: 'butter',
  review: 'butter',
  progress: 'aqua',
  errorLog: 'blush',
  library: 'mint',
  admin: 'lavender',
  goal: 'aqua',
  next: 'periwinkle',
} as const satisfies Record<string, Tone>;

/** One tone per main navigation tab (and header action), all different so each place is easy to spot. */
export const TAB_TONE = {
  learn: 'periwinkle',
  review: 'butter',
  vocab: 'mint',
  stats: 'aqua',
  ielts: 'lavender',
  history: 'sky',
  theme: 'peach',
  save: 'mint',
  logout: 'blush',
} as const satisfies Record<string, Tone>;

/** Hover fill per tone for quiet (unselected) controls: the bg tint, so only the hovered one lights up. */
export const TONE_HOVER: Record<Tone, string> = {
  sky: 'hover:bg-tone-sky',
  mint: 'hover:bg-tone-mint',
  lavender: 'hover:bg-tone-lavender',
  peach: 'hover:bg-tone-peach',
  butter: 'hover:bg-tone-butter',
  aqua: 'hover:bg-tone-aqua',
  blush: 'hover:bg-tone-blush',
  periwinkle: 'hover:bg-tone-periwinkle',
};

/** Answer states: gentle colours instead of harsh red/green. */
export const STATUS_TONE = {
  correct: 'mint',
  wrong: 'blush',
  nearMiss: 'butter',
  blank: 'sky',
} as const satisfies Record<string, Tone>;

export interface ToneClassSet {
  /** Card surface: tint background + matching border. */
  surface: string;
  /** Icon tile / chip: deeper tint + coloured icon or text. */
  tile: string;
  /** Text or icon colour alone. */
  text: string;
  /** Border colour alone. */
  border: string;
  /** Background tint alone. */
  bg: string;
  /** Progress-bar / dot fill (accent slot). */
  bar: string;
  /** Tone button: soft fill, coloured text, deeper on hover. */
  button: string;
}

const TONE_CLASSES: Record<Tone, ToneClassSet> = {
  sky: {
    surface: 'bg-tone-sky border-tone-sky-border',
    tile: 'bg-tone-sky-soft text-tone-sky-fg',
    text: 'text-tone-sky-fg',
    border: 'border-tone-sky-border',
    bg: 'bg-tone-sky',
    bar: 'bg-tone-sky-accent',
    button: 'bg-tone-sky-soft text-tone-sky-fg hover:bg-tone-sky-border',
  },
  mint: {
    surface: 'bg-tone-mint border-tone-mint-border',
    tile: 'bg-tone-mint-soft text-tone-mint-fg',
    text: 'text-tone-mint-fg',
    border: 'border-tone-mint-border',
    bg: 'bg-tone-mint',
    bar: 'bg-tone-mint-accent',
    button: 'bg-tone-mint-soft text-tone-mint-fg hover:bg-tone-mint-border',
  },
  lavender: {
    surface: 'bg-tone-lavender border-tone-lavender-border',
    tile: 'bg-tone-lavender-soft text-tone-lavender-fg',
    text: 'text-tone-lavender-fg',
    border: 'border-tone-lavender-border',
    bg: 'bg-tone-lavender',
    bar: 'bg-tone-lavender-accent',
    button: 'bg-tone-lavender-soft text-tone-lavender-fg hover:bg-tone-lavender-border',
  },
  peach: {
    surface: 'bg-tone-peach border-tone-peach-border',
    tile: 'bg-tone-peach-soft text-tone-peach-fg',
    text: 'text-tone-peach-fg',
    border: 'border-tone-peach-border',
    bg: 'bg-tone-peach',
    bar: 'bg-tone-peach-accent',
    button: 'bg-tone-peach-soft text-tone-peach-fg hover:bg-tone-peach-border',
  },
  butter: {
    surface: 'bg-tone-butter border-tone-butter-border',
    tile: 'bg-tone-butter-soft text-tone-butter-fg',
    text: 'text-tone-butter-fg',
    border: 'border-tone-butter-border',
    bg: 'bg-tone-butter',
    bar: 'bg-tone-butter-accent',
    button: 'bg-tone-butter-soft text-tone-butter-fg hover:bg-tone-butter-border',
  },
  aqua: {
    surface: 'bg-tone-aqua border-tone-aqua-border',
    tile: 'bg-tone-aqua-soft text-tone-aqua-fg',
    text: 'text-tone-aqua-fg',
    border: 'border-tone-aqua-border',
    bg: 'bg-tone-aqua',
    bar: 'bg-tone-aqua-accent',
    button: 'bg-tone-aqua-soft text-tone-aqua-fg hover:bg-tone-aqua-border',
  },
  blush: {
    surface: 'bg-tone-blush border-tone-blush-border',
    tile: 'bg-tone-blush-soft text-tone-blush-fg',
    text: 'text-tone-blush-fg',
    border: 'border-tone-blush-border',
    bg: 'bg-tone-blush',
    bar: 'bg-tone-blush-accent',
    button: 'bg-tone-blush-soft text-tone-blush-fg hover:bg-tone-blush-border',
  },
  periwinkle: {
    surface: 'bg-tone-periwinkle border-tone-periwinkle-border',
    tile: 'bg-tone-periwinkle-soft text-tone-periwinkle-fg',
    text: 'text-tone-periwinkle-fg',
    border: 'border-tone-periwinkle-border',
    bg: 'bg-tone-periwinkle',
    bar: 'bg-tone-periwinkle-accent',
    button: 'bg-tone-periwinkle-soft text-tone-periwinkle-fg hover:bg-tone-periwinkle-border',
  },
};

/** Tailwind class strings for one tone; no `dark:` variants needed. */
export function toneClasses(tone: Tone): ToneClassSet {
  return TONE_CLASSES[tone] ?? TONE_CLASSES.periwinkle;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of an sRGB colour. */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
