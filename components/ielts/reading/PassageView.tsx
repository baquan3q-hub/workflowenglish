/**
 * A Reading passage with lettered paragraphs. Selecting words inside one
 * paragraph shows a "Tô sáng" button; tapping a highlight removes it.
 * Highlights are character ranges per paragraph, so they survive reloads.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Highlighter } from 'lucide-react';
import type { ReadingPassage } from '../../../data/ielts/reading/types';
import { DIFFICULTY_LABELS } from '../../../data/ielts/reading';
import { addRange, highlightSegments, passageWordCount, removeRangeAt, type HighlightRange } from '../../../services/readingLogic';
import { ghostBtn, tag } from '../../ui/styles';

export type Highlights = Record<string, HighlightRange[]>;

export const highlightKey = (passageId: string, label: string) => `${passageId}:${label}`;

interface Props {
  passage: ReadingPassage;
  highlights: Highlights;
  onHighlightsChange: (next: Highlights) => void;
}

interface Pending {
  key: string;
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

export default function PassageView({ passage, highlights, onHighlightsChange }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);

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
        range: [start, end],
        top: Math.min(rect.bottom + 8, window.innerHeight - 56),
        left: Math.min(Math.max(rect.left + rect.width / 2, 72), window.innerWidth - 72),
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
            Bôi đen để tô sáng, bấm vào chỗ tô để bỏ.
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
            <p data-para={key} className="flex-1 text-[15px] leading-7 text-slate-800 dark:text-slate-200">
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
        <button
          type="button"
          // Keep the selection alive until the click lands.
          onMouseDown={(e) => e.preventDefault()}
          onClick={apply}
          style={{ top: pending.top, left: pending.left }}
          className="press fixed z-50 inline-flex min-h-touch -translate-x-1/2 items-center gap-2 rounded-xl border border-tone-butter-border bg-tone-butter-soft px-4 text-sm font-semibold text-tone-butter-fg shadow-raised"
        >
          <Highlighter className="h-4 w-4" aria-hidden /> Tô sáng
        </button>
      )}
    </article>
  );
}
