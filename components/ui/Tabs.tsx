import React, { useId, useRef } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  /** Small count shown after the label. */
  count?: number;
}

interface TabsProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** `underline` for page sections, `pill` for compact filters. */
  variant?: 'underline' | 'pill';
  className?: string;
}

/**
 * Accessible tab list (WAI-ARIA tabs pattern): arrow keys and Home/End move
 * between tabs. Panels are rendered by the caller; give each panel
 * `role="tabpanel"` and `aria-labelledby={tabId(baseId, id)}` if needed.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  variant = 'underline',
  className = '',
}: TabsProps<T>) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].id);
  };

  const wrap =
    variant === 'underline'
      ? 'flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-700'
      : 'flex gap-1.5 overflow-x-auto rounded-xl bg-slate-100 p-1 scrollbar-none dark:bg-slate-800';

  return (
    <div role="tablist" aria-label={label} className={`${wrap} ${className}`}>
      {items.map((item, i) => {
        const active = item.id === value;
        const tone =
          variant === 'underline'
            ? active
              ? 'border-tone-sky-border text-tone-sky-fg'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            : active
              ? 'bg-white text-slate-900 shadow-card dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200';
        return (
          <button
            key={item.id}
            ref={(el) => { refs.current[i] = el; }}
            id={`${baseId}-${item.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`inline-flex min-h-touch flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-semibold transition-colors ${
              variant === 'underline' ? '-mb-px border-b-2' : 'rounded-lg'
            } ${tone}`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-slate-200 px-1.5 text-[11px] tabular-nums text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
