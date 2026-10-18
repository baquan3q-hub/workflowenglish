import React from 'react';
import type { DictationToken } from '../../services/listeningDrillLogic';

const TOKEN_CLASS: Record<DictationToken['status'], string> = {
  ok: 'text-slate-900 dark:text-white',
  close: 'rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  wrong: 'rounded bg-rose-100 px-0.5 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100',
  missed: 'rounded px-0.5 text-rose-700 underline decoration-dotted underline-offset-4 dark:text-rose-300',
  extra: 'text-slate-400 line-through dark:text-slate-500',
};

/** The reference sentence with each word marked by how it was heard or said. */
export function DictationTokens({ tokens, typedLabel = 'Bạn viết' }: { tokens: DictationToken[]; typedLabel?: string }) {
  return (
    <p className="text-base leading-loose">
      {tokens.map((t, i) => (
        <React.Fragment key={i}>
          <span className={TOKEN_CLASS[t.status]} title={t.typed ? `${typedLabel}: ${t.typed}` : undefined}>
            {t.word}
            {t.typed && <span className="ml-1 text-caption line-through opacity-70">{t.typed}</span>}
          </span>{' '}
        </React.Fragment>
      ))}
    </p>
  );
}

export function accuracyTone(a: number) {
  return a >= 90 ? 'text-emerald-600 dark:text-emerald-400' : a >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
}
