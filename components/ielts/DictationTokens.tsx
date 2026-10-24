import React from 'react';
import type { DictationToken } from '../../services/listeningDrillLogic';

const TOKEN_CLASS: Record<DictationToken['status'], string> = {
  ok: 'text-slate-900 dark:text-white',
  close: 'rounded bg-tone-butter-soft px-0.5 text-tone-butter-fg',
  wrong: 'rounded bg-tone-blush-soft px-0.5 text-tone-blush-fg',
  missed: 'rounded px-0.5 text-tone-blush-fg underline decoration-dotted underline-offset-4',
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
  return a >= 90 ? 'text-tone-mint-fg' : a >= 70 ? 'text-tone-butter-fg' : 'text-tone-blush-fg';
}
