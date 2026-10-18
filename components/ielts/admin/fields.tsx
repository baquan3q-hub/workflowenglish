/**
 * Form pieces the Listening and Reading editors share. Structured text is
 * typed freely and read when the field loses focus, so the caret never jumps.
 */
import React, { useEffect, useState } from 'react';
import type { ChoiceOption } from '../../../data/ielts/listening/types';
import { optionsText, parseOptions } from '../../../services/listeningLibraryLogic';
import { hint, input, label, select, textarea } from './styles';

export function Field({ title, children, help }: { title: string; children: React.ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      {children}
      {help && <span className={`mt-1 block ${hint}`}>{help}</span>}
    </label>
  );
}

/** A text field that keeps its own text while focused and reports it on blur. */
export function BlurField({
  value,
  onCommit,
  multiline,
  rows = 3,
  className,
  ...rest
}: {
  value: string;
  onCommit: (text: string) => void;
  multiline?: boolean;
  rows?: number;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
  id?: string;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);
  const props = {
    ...rest,
    value: text,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      if (text !== value) onCommit(text);
    },
    spellCheck: false,
  };
  return multiline ? (
    <textarea {...props} rows={rows} onChange={(e) => setText(e.target.value)} className={className ?? textarea} />
  ) : (
    <input {...props} onChange={(e) => setText(e.target.value)} className={className ?? input} />
  );
}

export function LetterSelect({ options, value, onChange, labelText }: { options: string[]; value: string; onChange: (v: string) => void; labelText: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={labelText} className={`${select} !mt-0 w-24`}>
      <option value="">–</option>
      {options.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}

export function NumberBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 min-w-7 flex-shrink-0 items-center justify-center rounded-md bg-tone-periwinkle-soft px-1 text-caption font-bold tabular-nums text-tone-periwinkle-fg">
      {n}
    </span>
  );
}

/** Most words in an answer, and whether a number may be added. */
export function WordLimit<G extends { wordLimit: number; numberAllowed: boolean }>({ group, onChange }: { group: G; onChange: (g: NoInfer<G>) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className={label}>Số từ tối đa</span>
        <select value={group.wordLimit} onChange={(e) => onChange({ ...group, wordLimit: Number(e.target.value) })} className={`${select} w-28`}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} từ
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-touch items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input type="checkbox" checked={group.numberAllowed} onChange={(e) => onChange({ ...group, numberAllowed: e.target.checked })} className="h-4 w-4" />
        Thêm một số (AND/OR A NUMBER)
      </label>
    </div>
  );
}

export function OptionsField({ options, onChange, title }: { options: readonly ChoiceOption[]; onChange: (o: ChoiceOption[]) => void; title: string }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      <BlurField multiline rows={Math.max(3, options.length)} value={optionsText([...options])} onCommit={(t) => onChange(parseOptions(t))} placeholder={'A. ...\nB. ...\nC. ...'} />
      <span className={hint}>Mỗi dòng một lựa chọn; chữ cái được gán lại theo thứ tự.</span>
    </label>
  );
}
