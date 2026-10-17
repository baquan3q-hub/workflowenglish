/**
 * Answer sheet for one question group: completion (form, notes, table,
 * sentences), short answer, multiple choice, choose-two, matching and map.
 */
import React from 'react';
import type { ChoiceOption, ListeningAnswers, ListeningGroup, ListeningQuestion } from '../../../data/ielts/listening/types';
import ListeningMap from './ListeningMap';

interface Props {
  group: ListeningGroup;
  answers: ListeningAnswers;
  onChange: (number: number, value: string) => void;
}

const panel = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5';
const numberBadge =
  'inline-flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 px-1 text-caption font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200';
const inputBase =
  'rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:focus:ring-white/10';
const optionBase =
  'flex min-h-touch w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const optionOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';
const optionOff =
  'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const letterChip = 'inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border text-sm font-bold transition-colors';

const BLANK = /\{\{(\d+)\}\}/;

/** Answer inputs never get the browser's spelling help: spelling is part of the test. */
const noAssist = { autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const;

function range(questions: readonly ListeningQuestion[]) {
  const first = questions[0]?.number;
  const last = questions[questions.length - 1]?.number;
  return first === last ? `Câu ${first}` : `Câu ${first}–${last}`;
}

function Blank({ n, value, wide, onChange }: { n: number; value: string; wide: boolean; onChange: (v: string) => void }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 align-middle">
      <span className={numberBadge}>{n}</span>
      <input
        {...noAssist}
        type="text"
        aria-label={`Câu ${n}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} h-9 ${wide ? 'w-44' : 'w-32'}`}
      />
    </span>
  );
}

/** A template line with {{n}} blanks turned into inputs. */
function Template({ line, answers, wide, onChange }: { line: string; answers: ListeningAnswers; wide: boolean; onChange: Props['onChange'] }) {
  const parts = line.split(BLANK);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Blank key={i} n={Number(part)} value={answers[Number(part)] ?? ''} wide={wide} onChange={(v) => onChange(Number(part), v)} />
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function Options({
  options,
  selected,
  onPick,
  isDisabled,
  multi,
}: {
  options: readonly ChoiceOption[];
  selected: readonly string[];
  onPick: (key: string) => void;
  isDisabled?: (key: string) => boolean;
  multi?: boolean;
}) {
  return (
    <div role={multi ? 'group' : 'radiogroup'} className="mt-2 space-y-2">
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            disabled={!on && isDisabled?.(o.key)}
            onClick={() => onPick(o.key)}
            className={`${optionBase} ${on ? optionOn : optionOff}`}
          >
            <span className="w-4 flex-shrink-0 font-bold">{o.key}</span>
            <span>{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function LetterPicker({ n, letters, value, onChange }: { n: number; letters: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={`Câu ${n}`} className="flex flex-wrap gap-1.5">
      {letters.map((l) => {
        const on = value === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? '' : l)}
            className={`${letterChip} ${on ? optionOn : optionOff}`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export default function QuestionGroupView({ group, answers, onChange }: Props) {
  const header = (
    <header className="mb-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{range(group.questions)}</h3>
      <p className="mt-0.5 text-caption italic text-slate-600 dark:text-slate-400">{group.instruction}</p>
    </header>
  );

  switch (group.type) {
    case 'completion': {
      const wide = group.wordLimit > 1;
      return (
        <section className={panel}>
          {header}
          {group.title && <p className="mb-2 text-center text-sm font-semibold text-slate-900 dark:text-white">{group.title}</p>}
          {group.lines && (
            <ul className="space-y-2.5 text-sm leading-9 text-slate-800 dark:text-slate-200">
              {group.lines.map((line, i) =>
                BLANK.test(line) ? (
                  <li key={i}>
                    <Template line={line} answers={answers} wide={wide} onChange={onChange} />
                  </li>
                ) : (
                  <li key={i} className="pt-1 font-semibold text-slate-900 dark:text-white">
                    {line}
                  </li>
                ),
              )}
            </ul>
          )}
          {group.table && (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[34rem] border-collapse text-sm text-slate-800 dark:text-slate-200">
                <thead>
                  <tr>
                    {group.table.header.map((h, i) => (
                      <th key={i} className="border border-slate-200 bg-slate-50 px-2 py-2 text-left font-semibold dark:border-slate-700 dark:bg-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.table.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="border border-slate-200 px-2 py-1.5 align-middle leading-9 dark:border-slate-700">
                          <Template line={cell} answers={answers} wide={wide} onChange={onChange} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }

    case 'short_answer':
      return (
        <section className={panel}>
          {header}
          <ol className="space-y-4">
            {group.questions.map((q) => (
              <li key={q.number}>
                <label className="block">
                  <span className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
                    <span className={numberBadge}>{q.number}</span>
                    {q.prompt}
                  </span>
                  <input
                    {...noAssist}
                    type="text"
                    value={answers[q.number] ?? ''}
                    onChange={(e) => onChange(q.number, e.target.value)}
                    className={`${inputBase} mt-2 min-h-touch w-full sm:w-72`}
                  />
                </label>
              </li>
            ))}
          </ol>
        </section>
      );

    case 'mcq':
      return (
        <section className={panel}>
          {header}
          <ol className="space-y-5">
            {group.questions.map((q) => (
              <li key={q.number}>
                <p className="flex items-start gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <span className={numberBadge}>{q.number}</span>
                  {q.prompt}
                </p>
                <Options
                  options={q.options ?? []}
                  selected={answers[q.number] ? [answers[q.number]] : []}
                  onPick={(key) => onChange(q.number, key)}
                />
              </li>
            ))}
          </ol>
        </section>
      );

    case 'mcq_multi': {
      const first = group.questions[0].number;
      const chosen = (answers[first] ?? '').split(',').filter(Boolean);
      const max = group.questions.length;
      const toggle = (key: string) => {
        const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
        onChange(first, next.sort().join(','));
      };
      return (
        <section className={panel}>
          {header}
          <p className="text-sm font-medium text-slate-900 dark:text-white">{group.prompt}</p>
          <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">
            Đã chọn {chosen.length}/{max}
          </p>
          <Options options={group.options} selected={chosen} onPick={toggle} isDisabled={() => chosen.length >= max} multi />
        </section>
      );
    }

    case 'matching': {
      const letters = group.options.map((o) => o.key);
      return (
        <section className={panel}>
          {header}
          <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            {group.optionsTitle && <p className="mb-1.5 text-caption font-semibold text-slate-700 dark:text-slate-300">{group.optionsTitle}</p>}
            <ul className="grid gap-1 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2">
              {group.options.map((o) => (
                <li key={o.key} className="flex gap-2">
                  <span className="w-4 font-bold">{o.key}</span>
                  {o.text}
                </li>
              ))}
            </ul>
          </div>
          <ol className="space-y-3">
            {group.questions.map((q) => (
              <li key={q.number} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                  <span className={numberBadge}>{q.number}</span>
                  {q.prompt}
                </span>
                <LetterPicker n={q.number} letters={letters} value={answers[q.number] ?? ''} onChange={(v) => onChange(q.number, v)} />
              </li>
            ))}
          </ol>
        </section>
      );
    }

    case 'map': {
      const letters = group.map.shapes.flatMap((s) => (s.key ? [s.key] : [])).sort();
      return (
        <section className={panel}>
          {header}
          <ListeningMap map={group.map} />
          <ol className="mt-4 space-y-3">
            {group.questions.map((q) => (
              <li key={q.number} className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                  <span className={numberBadge}>{q.number}</span>
                  {q.prompt}
                </span>
                <LetterPicker n={q.number} letters={letters} value={answers[q.number] ?? ''} onChange={(v) => onChange(q.number, v)} />
              </li>
            ))}
          </ol>
        </section>
      );
    }
  }
}

