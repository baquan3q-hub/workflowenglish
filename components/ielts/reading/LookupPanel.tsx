/**
 * The card at the bottom of the screen that answers a lookup: a word's
 * meaning (from the passage glossary first, otherwise the AI) or a sentence
 * explained by the AI. Escape or the close button dismisses it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Languages, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import type { GlossaryEntry } from '../../../data/ielts/reading/types';
import { explainReading, type ExplainResult } from '../../../services/readingExplainService';
import { aiErrorMessage } from '../../../services/aiClient';
import type { SelectionKind } from '../../../services/readingTools';
import AddToReviewButton from '../AddToReviewButton';
import IconTile from '../../ui/IconTile';
import { ghostBtn, panel, secondaryBtn } from '../../ui/styles';

export interface Lookup {
  mode: SelectionKind;
  /** The selected words, cleaned. */
  text: string;
  /** The sentence they are in, used as the review example. */
  sentence: string;
  /** The whole paragraph, sent to the AI as context. */
  context: string;
  glossary?: GlossaryEntry;
}

interface Props {
  lookup: Lookup;
  userId: string;
  onClose: () => void;
  /** Swapped out in previews. */
  explain?: typeof explainReading;
}

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; result: ExplainResult } | { kind: 'error'; message: string };

const smallBtn = secondaryBtn.replace('px-4', 'px-3');

function List({ title, items }: { title: string; items: React.ReactNode[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>
      <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-200">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-tone-lavender-fg" aria-hidden />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LookupPanel({ lookup, userId, onClose, explain = explainReading }: Props) {
  const word = lookup.mode === 'word';
  const [state, setState] = useState<State>({ kind: 'idle' });

  const ask = useCallback(() => {
    let live = true;
    setState({ kind: 'loading' });
    explain(lookup.mode, lookup.text, lookup.context).then(
      (result) => live && setState({ kind: 'done', result }),
      (err) => live && setState({ kind: 'error', message: aiErrorMessage(err) }),
    );
    return () => {
      live = false;
    };
  }, [explain, lookup]);

  // The glossary answers a word at once; everything else goes to the AI.
  useEffect(() => {
    setState({ kind: 'idle' });
    if (word && lookup.glossary) return;
    return ask();
  }, [ask, word, lookup.glossary]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const result = state.kind === 'done' ? state.result : null;
  const headword = result?.headword || lookup.glossary?.term || lookup.text;
  const meaning = lookup.glossary?.meaningVi || result?.meaningVi || '';

  return (
    <div
      role="dialog"
      aria-label={word ? 'Nghĩa của từ' : 'Giải thích câu'}
      className={`${panel} fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[65vh] max-w-md overflow-y-auto p-4 shadow-raised`}
    >
      <div className="flex items-start gap-3">
        <IconTile icon={word ? BookOpen : Languages} tone={word ? 'sky' : 'lavender'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-slate-500 dark:text-slate-400">{word ? 'Tra từ' : 'Giải thích câu'}</p>
          <p className={`font-semibold text-slate-900 dark:text-white ${word ? 'text-lg' : 'line-clamp-3 text-sm'}`}>
            {word ? headword : lookup.text}
          </p>
        </div>
        <button type="button" onClick={onClose} className={ghostBtn} aria-label="Đóng">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 space-y-3" aria-live="polite">
        {word && meaning && (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {result?.partOfSpeech && (
                <span className="rounded-md bg-tone-sky-soft px-1.5 py-0.5 text-caption font-medium text-tone-sky-fg">{result.partOfSpeech}</span>
              )}
              <span
                className={`rounded-md px-1.5 py-0.5 text-caption font-medium ${
                  lookup.glossary ? 'bg-tone-mint-soft text-tone-mint-fg' : 'bg-tone-lavender-soft text-tone-lavender-fg'
                }`}
              >
                {lookup.glossary ? 'Từ điển của bài' : 'AI'}
              </span>
            </div>
            <p className="mt-1.5 text-base text-slate-800 dark:text-slate-100">{meaning}</p>
          </div>
        )}

        {!word && result?.translationVi && <p className="text-base text-slate-800 dark:text-slate-100">{result.translationVi}</p>}

        {state.kind === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-tone-lavender-fg" aria-hidden /> Đang hỏi AI…
          </p>
        )}

        {state.kind === 'error' && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-tone-blush-fg">{state.message}</p>
            <button type="button" onClick={ask} className={smallBtn}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Thử lại
            </button>
          </div>
        )}

        {result && (
          <>
            {!word && <List title="Cấu trúc" items={result.structureVi} />}
            <List
              title={word ? 'Từ liên quan' : 'Từ vựng'}
              items={result.vocab.map((v) => (
                <>
                  <span className="font-semibold">{v.term}</span>: {v.meaningVi}
                </>
              ))}
            />
            <List title="Paraphrase" items={result.paraphrases} />
          </>
        )}

        {word && lookup.glossary && state.kind === 'idle' && (
          <button type="button" onClick={ask} className={smallBtn}>
            <Sparkles className="h-4 w-4 text-tone-lavender-fg" aria-hidden /> Hỏi AI thêm
          </button>
        )}

        {word && meaning && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            {lookup.sentence && <p className="mb-2 text-caption italic text-slate-500 dark:text-slate-400">{lookup.sentence}</p>}
            <AddToReviewButton userId={userId} words={[{ word: headword, meaningVi: meaning, example: lookup.sentence }]} />
          </div>
        )}
      </div>
    </div>
  );
}
