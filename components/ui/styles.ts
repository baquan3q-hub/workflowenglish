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
export const tag =
  'inline-flex items-center gap-1 rounded-md bg-tone-periwinkle-soft px-1.5 py-0.5 text-caption font-medium text-tone-periwinkle-fg';
export const field =
  'min-h-touch w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors hover:border-tone-periwinkle-border focus:border-tone-periwinkle-fg focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white';
