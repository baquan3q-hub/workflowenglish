/**
 * A Reading passage with lettered paragraphs. Selecting words inside one
 * paragraph shows a "Tô sáng" button; tapping a highlight removes it.
 * Highlights are character ranges per paragraph, so they survive reloads.
 *
 * With `tools` (practice mode only: the real exam has no dictionary), the
 * same selection can also be looked up: a few words get their meaning, a
 * longer selection is explained as a sentence.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Eraser, Highlighter, Languages } from 'lucide-react';
import type { ReadingPassage } from '../../../data/ielts/reading/types';
import { DIFFICULTY_LABELS } from '../../../data/ielts/reading';
import { addRange, highlightSegments, passageWordCount, removeRangeAt, type HighlightRange } from '../../../services/readingLogic';
import { cleanSelection, glossaryMatch, selectionKind, sentenceAt, type SelectionKind } from '../../../services/readingTools';
import LookupPanel, { type Lookup } from './LookupPanel';
import { ghostBtn, tag } from '../../ui/styles';

export type Highlights = Record<string, HighlightRange[]>;

export const highlightKey = (passageId: string, label: string) => `${passageId}:${label}`;

interface Props {
  passage: ReadingPassage;
  highlights: Highlights;
  onHighlightsChange: (next: Highlights) => void;
  /** Word lookup and sentence explain; leave out in exam mode. */
  tools?: { userId: string };
}

interface Pending {
  key: string;
  /** The paragraph letter. */
  label: string;
  range: HighlightRange;
  top: number;
  left: number;
}

/** Characters from the start of `el` to (node, offset). */
function offsetIn(el: Element, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(node, offset);
  return r.toString().length;
}

const paraOf = (node: Node | null) => (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-para]') ?? null;

const popBtn =
  'press inline-flex min-h-touch items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-raised';
const LOOKUP_STYLE: Record<SelectionKind, { label: string; icon: typeof BookOpen; className: string }> = {
  word: { label: 'Tra từ', icon: BookOpen, className: 'border-tone-sky-border bg-tone-sky-soft text-tone-sky-fg' },
  sentence: { label: 'Giải thích câu', icon: Languages, className: 'border-tone-lavender-border bg-tone-lavender-soft text-tone-lavender-fg' },
};

export default function PassageView({ passage, highlights, onHighlightsChange, tools }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [lookup, setLookup] = useState<{ id: number; value: Lookup } | null>(null);

  // A lookup belongs to the passage it came from.
  useEffect(() => setLookup(null), [passage.id]);

  useEffect(() => {
    const onSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return setPending(null);
      const para = paraOf(sel.anchorNode);
      if (!para || para !== paraOf(sel.focusNode) || !rootRef.current?.contains(para)) return setPending(null);
      const range = sel.getRangeAt(0);
      const start = offsetIn(para, range.startContainer, range.startOffset);
      const end = offsetIn(para, range.endContainer, range.endOffset);
      if (end - start < 1) return setPending(null);
      const rect = range.getBoundingClientRect();
      setPending({
        key: para.dataset.para!,
        label: para.dataset.label!,
        range: [start, end],
        top: Math.min(rect.bottom + 8, window.innerHeight - 56),
        // Room for two buttons side by side.
        left: Math.min(Math.max(rect.left + rect.width / 2, 136), window.innerWidth - 136),
      });
    };
    const clear = () => setPending(null);
    document.addEventListener('selectionchange', onSelection);
    window.addEventListener('scroll', clear, true);
    return () => {
      document.removeEventListener('selectionchange', onSelection);
      window.removeEventListener('scroll', clear, true);
    };
  }, []);

  const apply = () => {
    if (!pending) return;
    onHighlightsChange({ ...highlights, [pending.key]: addRange(highlights[pending.key] ?? [], pending.range) });
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  const pendingText = pending ? (passage.paragraphs.find((p) => p.label === pending.label)?.text ?? '') : '';
  const pendingSel = pending ? pendingText.slice(...pending.range) : '';
  const pendingGloss = tools && pending ? glossaryMatch(passage.glossary, pendingSel) : undefined;
  // A glossary phrase is a word lookup however many words it has.
  const pendingKind = tools && pending ? (pendingGloss ? 'word' : selectionKind(pendingSel)) : null;

  const openLookup = () => {
    if (!pending || !pendingKind) return;
    const text = cleanSelection(pendingSel);
    const value: Lookup = {
      mode: pendingKind,
      text,
      sentence: sentenceAt(pendingText, ...pending.range),
      context: pendingText,
      glossary: pendingGloss,
    };
    setLookup((prev) => ({ id: (prev?.id ?? 0) + 1, value }));
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  const remove = (key: string, offset: number) => {
    // A click that ends a new selection is not a tap on the highlight.
    if (window.getSelection()?.isCollapsed === false) return;
    onHighlightsChange({ ...highlights, [key]: removeRangeAt(highlights[key] ?? [], offset) });
  };

  const own = passage.paragraphs.map((p) => highlightKey(passage.id, p.label));
  const hasMarks = own.some((k) => highlights[k]?.length);
  const clearAll = () => {
    const next = { ...highlights };
    for (const k of own) delete next[k];
    onHighlightsChange(next);
  };

  return (
    <article ref={rootRef} className="space-y-4">
      <header>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={tag}>Passage {passage.part}</span>
          <span className="inline-flex items-center rounded-md bg-tone-mint-soft px-1.5 py-0.5 text-caption font-medium text-tone-mint-fg">
            {DIFFICULTY_LABELS[passage.difficulty]}
          </span>
          <span className="text-caption text-slate-500 dark:text-slate-400">
            {passageWordCount(passage)} từ · gợi ý {passage.suggestedMinutes} phút
          </span>
        </div>
        <h2 className="mt-2 text-title font-bold text-slate-900 dark:text-white">{passage.title}</h2>
        {passage.subtitle && <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-400">{passage.subtitle}</p>}
        <div className="mt-1 flex min-h-touch items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-caption text-slate-500 dark:text-slate-400">
            <Highlighter className="h-3.5 w-3.5 flex-shrink-0 text-tone-butter-fg" aria-hidden />
            {tools ? 'Bôi đen để tô sáng, tra từ hoặc giải thích câu.' : 'Bôi đen để tô sáng, bấm vào chỗ tô để bỏ.'}
          </p>
          {hasMarks && (
            <button type="button" onClick={clearAll} className={ghostBtn}>
              <Eraser className="h-4 w-4" aria-hidden /> Xoá tô sáng
            </button>
          )}
        </div>
      </header>

      {passage.paragraphs.map((p) => {
        const key = highlightKey(passage.id, p.label);
        return (
          <section key={p.label} id={`para-${passage.id}-${p.label}`} className="flex scroll-mt-24 gap-3">
            <span
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-tone-mint-soft text-sm font-bold text-tone-mint-fg"
              aria-label={`Đoạn ${p.label}`}
            >
              {p.label}
            </span>
            <p data-para={key} data-label={p.label} className="flex-1 text-[15px] leading-7 text-slate-800 dark:text-slate-200">
              {highlightSegments(p.text, highlights[key] ?? []).map((s) =>
                s.marked ? (
                  <mark
                    key={s.start}
                    onClick={() => remove(key, s.start)}
                    title="Bấm để bỏ tô sáng"
                    className="cursor-pointer rounded-sm bg-tone-butter-soft text-inherit hover:bg-tone-butter-border"
                  >
                    {s.text}
                  </mark>
                ) : (
                  <React.Fragment key={s.start}>{s.text}</React.Fragment>
                ),
              )}
            </p>
          </section>
        );
      })}

      {pending && (
        <div
          // Keep the selection alive until the click lands.
          onMouseDown={(e) => e.preventDefault()}
          style={{ top: pending.top, left: pending.left }}
          className="fixed z-50 flex -translate-x-1/2 gap-2"
        >
          <button type="button" onClick={apply} className={`${popBtn} border-tone-butter-border bg-tone-butter-soft text-tone-butter-fg`}>
            <Highlighter className="h-4 w-4" aria-hidden /> Tô sáng
          </button>
          {pendingKind &&
            (() => {
              const { label, icon: Icon, className } = LOOKUP_STYLE[pendingKind];
              return (
                <button type="button" onClick={openLookup} className={`${popBtn} whitespace-nowrap ${className}`}>
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </button>
              );
            })()}
        </div>
      )}

      {tools && lookup && (
        <LookupPanel key={lookup.id} lookup={lookup.value} userId={tools.userId} onClose={() => setLookup(null)} />
      )}
    </article>
  );
}
