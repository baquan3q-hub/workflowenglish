/**
 * Class strings shared by every screen: buttons, panels, tags and form fields.
 *
 * Colours come from the pastel tone tokens (components/ui/palette.ts), which
 * already switch for dark mode. The primary button is a soft periwinkle with
 * dark periwinkle text rather than a near-black fill. `.press` (index.html)
 * adds the pressed-state shrink.
 */

export const primaryBtn =
  'press inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-tone-periwinkle-border bg-tone-periwinkle-soft px-5 text-sm font-semibold text-tone-periwinkle-fg hover:bg-tone-periwinkle-border disabled:pointer-events-none disabled:opacity-50';
export const secondaryBtn =
  'press inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-tone-periwinkle-border dark:hover:bg-tone-periwinkle';
export const ghostBtn =
  'press inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg disabled:pointer-events-none disabled:opacity-50 dark:text-slate-200';
export const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

/*
 * iOS-style frosted glass. Only the outermost card blurs (`.glass` in index.html
 * gives an opaque fallback where backdrop-filter is missing); put plain
 * translucent fills inside it, never a second blur.
 */
export const glassPanel =
  'glass rounded-[28px] border border-white/70 bg-white/65 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_12px_36px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_36px_rgba(0,0,0,0.35)]';
/** A small rounded label inside or beside glass; tint it with a tone's bg/fg. */
export const glassPill = 'inline-flex items-center gap-1.5 rounded-full border border-white/70 px-3 py-0.5 text-xs font-semibold dark:border-white/10';
/** Wraps a select or date input inside a glass card (no blur of its own). */
export const glassField =
  'flex items-center rounded-2xl border border-white/80 bg-white/55 px-3.5 py-2.5 transition-colors hover:bg-white/75 focus-within:border-tone-periwinkle-border focus-within:ring-2 focus-within:ring-tone-periwinkle-border dark:border-white/10 dark:bg-slate-800/60 dark:hover:bg-slate-800/80';
/** A secondary button that sits on glass. */
export const glassButton =
  'press inline-flex min-h-touch items-center justify-center gap-2 rounded-full border border-white/80 bg-white/60 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800/90';
export const tag =
  'inline-flex items-center gap-1 rounded-md bg-tone-periwinkle-soft px-1.5 py-0.5 text-caption font-medium text-tone-periwinkle-fg';
export const field =
  'min-h-touch w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors hover:border-tone-periwinkle-border focus:border-tone-periwinkle-fg focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white';
