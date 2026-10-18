/**
 * Building blocks of the IELTS answer sheets, shared by Listening and
 * Reading: the group header, numbered blanks, choice lists, letter pickers
 * and the completion body (lines, flow-chart, table).
 *
 * Each question's control carries id="q-{number}" so a question map can
 * scroll to it.
 */
import React from 'react';
import {
  ArrowDown,
  CircleCheckBig,
  Heading,
  Info,
  Link2,
  ListChecks,
  ListOrdered,
  Map as MapIcon,
  MessageSquareText,
  PenLine,
  Scale,
  Shapes,
  Shuffle,
  SquareStack,
  Workflow,
} from 'lucide-react';
import type { ChoiceOption } from '../../../data/ielts/listening/types';
import { panel } from '../../ui/styles';
import IconTile from '../../ui/IconTile';
import { toneClasses, type Tone } from '../../ui/palette';
import { BLANK, questionRange, splitBlanks, toggleChoice } from './questionLogic';
import type { GroupKind } from './questionLogic';

export type Answers = Readonly<Record<number, string>>;
export type OnAnswer = (number: number, value: string) => void;

export const groupPanel = `${panel} p-4 sm:p-5`;
export const numberBadge =
  'inline-flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-md bg-tone-periwinkle-soft px-1 text-caption font-bold tabular-nums text-tone-periwinkle-fg';
export const inputBase =
  'rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 transition-colors hover:border-tone-periwinkle-border focus:border-tone-periwinkle-fg focus:outline-none focus:ring-2 focus:ring-tone-periwinkle-border dark:border-slate-600 dark:bg-slate-950 dark:text-white';
const optionBase =
  'press flex min-h-touch w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50';
/** A chosen answer: soft periwinkle with a strong border, never a dark fill. */
export const optionOn = 'border-tone-periwinkle-fg bg-tone-periwinkle-soft text-tone-periwinkle-fg';
export const optionOff =
  'border-slate-200 bg-white text-slate-800 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const letterChip = 'press inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border px-2 text-sm font-bold transition-colors';

/** Answer inputs never get the browser's spelling help: spelling is part of the test. */
export const noAssist = { autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const;

type Icon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

/** Name, colour and icon of each question type, so learners spot the type at a glance. */
export const GROUP_KINDS: Record<GroupKind, { label: string; tone: Tone; icon: Icon }> = {
  completion: { label: 'Completion', tone: 'mint', icon: PenLine },
  summary_box: { label: 'Summary – hộp từ', tone: 'mint', icon: SquareStack },
  flowchart: { label: 'Flow-chart', tone: 'mint', icon: Workflow },
  short_answer: { label: 'Short answer', tone: 'aqua', icon: MessageSquareText },
  mcq: { label: 'Multiple choice', tone: 'lavender', icon: ListChecks },
  mcq_multi: { label: 'Chọn nhiều đáp án', tone: 'lavender', icon: CircleCheckBig },
  tfng: { label: 'TRUE / FALSE / NOT GIVEN', tone: 'sky', icon: Scale },
  ynng: { label: 'YES / NO / NOT GIVEN', tone: 'sky', icon: Scale },
  headings: { label: 'Matching headings', tone: 'butter', icon: Heading },
  matching_paragraph: { label: 'Matching information', tone: 'peach', icon: Link2 },
  matching_feature: { label: 'Matching features', tone: 'peach', icon: Link2 },
  matching_ending: { label: 'Sentence endings', tone: 'peach', icon: Link2 },
  diagram: { label: 'Diagram labelling', tone: 'aqua', icon: Shapes },
  map: { label: 'Map / plan', tone: 'aqua', icon: MapIcon },
};

export function GroupHeader({
  kind,
  questions,
  instruction,
  order,
  children,
}: {
  kind: GroupKind;
  questions: readonly { number: number }[];
  instruction: string;
  /** true: answers follow the passage; false: they do not; omitted: say nothing. */
  order?: boolean | null;
  children?: React.ReactNode;
}) {
  const k = GROUP_KINDS[kind];
  return (
    <header className="mb-4 flex items-start gap-3">
      <IconTile icon={k.icon} tone={k.tone} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{questionRange(questions)}</h3>
          <span className="text-caption font-medium text-slate-500 dark:text-slate-400">{k.label}</span>
        </div>
        <p className="mt-0.5 text-caption italic text-slate-600 dark:text-slate-400">{instruction}</p>
        {order != null && (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-tone-butter px-1.5 py-0.5 text-caption font-medium text-tone-butter-fg">
            {order ? <ListOrdered className="h-3.5 w-3.5" aria-hidden /> : <Shuffle className="h-3.5 w-3.5" aria-hidden />}
            {order ? 'Đáp án theo thứ tự bài đọc' : 'Không theo thứ tự bài đọc'}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}

/** A small note under a header or above a list. */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-caption text-slate-600 dark:text-slate-400">
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-tone-sky-fg" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function NumberBadge({ n }: { n: number }) {
  return <span className={numberBadge}>{n}</span>;
}

export function Blank({ n, value, wide, onChange }: { n: number; value: string; wide: boolean; onChange: (v: string) => void }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 align-middle">
      <NumberBadge n={n} />
      <input
        {...noAssist}
        id={`q-${n}`}
        type="text"
        aria-label={`Câu ${n}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} h-9 ${wide ? 'w-44' : 'w-32'}`}
      />
    </span>
  );
}

/** Draws a blank; the default is a text input, a word box swaps in its own. */
export type RenderBlank = (n: number) => React.ReactNode;

/** A template line with {{n}} blanks turned into inputs. */
export function Template({ line, renderBlank }: { line: string; renderBlank: RenderBlank }) {
  return (
    <>
      {splitBlanks(line).map((p, i) => ('blank' in p ? <React.Fragment key={i}>{renderBlank(p.blank)}</React.Fragment> : <React.Fragment key={i}>{p.text}</React.Fragment>))}
    </>
  );
}

export function textBlanks(answers: Answers, wide: boolean, onChange: OnAnswer): RenderBlank {
  return (n) => <Blank n={n} value={answers[n] ?? ''} wide={wide} onChange={(v) => onChange(n, v)} />;
}

/** The body of a completion group: title, lines (or flow-chart steps) and table. */
export function CompletionBody({
  title,
  lines,
  table,
  layout = 'lines',
  renderBlank,
}: {
  title?: string;
  lines?: readonly string[];
  table?: { header: readonly string[]; rows: readonly (readonly string[])[] };
  layout?: 'lines' | 'flowchart';
  renderBlank: RenderBlank;
}) {
  return (
    <>
      {title && <p className="mb-2 text-center text-sm font-semibold text-slate-900 dark:text-white">{title}</p>}
      {lines && layout === 'flowchart' && (
        <ol className="mx-auto flex max-w-xl flex-col items-stretch text-sm leading-9 text-slate-800 dark:text-slate-200">
          {lines.map((line, i) => (
            <li key={i} className="flex flex-col items-center">
              {i > 0 && <ArrowDown className="my-1 h-4 w-4 text-tone-mint-fg" aria-hidden />}
              <div className="w-full rounded-xl border border-tone-mint-border bg-tone-mint px-3 py-1.5 text-center">
                <Template line={line} renderBlank={renderBlank} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {lines && layout !== 'flowchart' && (
        <ul className="space-y-2.5 text-sm leading-9 text-slate-800 dark:text-slate-200">
          {lines.map((line, i) =>
            BLANK.test(line) ? (
              <li key={i}>
                <Template line={line} renderBlank={renderBlank} />
              </li>
            ) : (
              <li key={i} className="pt-1 font-semibold text-slate-900 dark:text-white">
                {line}
              </li>
            ),
          )}
        </ul>
      )}
      {table && (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[34rem] border-collapse text-sm text-slate-800 dark:text-slate-200">
            <thead>
              <tr>
                {table.header.map((h, i) => (
                  <th key={i} className="border border-slate-200 bg-tone-mint px-2 py-2 text-left font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-slate-200 px-2 py-1.5 align-middle leading-9 dark:border-slate-700">
                      <Template line={cell} renderBlank={renderBlank} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function Options({
  id,
  label,
  options,
  selected,
  onPick,
  isDisabled,
  multi,
}: {
  id?: string;
  label?: string;
  options: readonly ChoiceOption[];
  selected: readonly string[];
  onPick: (key: string) => void;
  isDisabled?: (key: string) => boolean;
  multi?: boolean;
}) {
  return (
    <div id={id} role={multi ? 'group' : 'radiogroup'} aria-label={label} className="mt-2 space-y-2">
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

/** Picks one letter (or label); tapping the chosen one again clears it. */
export function LetterPicker({ n, letters, value, onChange }: { n: number; letters: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div id={`q-${n}`} role="radiogroup" aria-label={`Câu ${n}`} className="flex flex-wrap gap-1.5">
      {letters.map((l) => {
        const on = value === l;
        return (
          <button key={l} type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? '' : l)} className={`${letterChip} ${on ? optionOn : optionOff}`}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** The lettered list a matching group picks from. */
export function OptionsBox({ title, options, tone = 'peach' }: { title?: string; options: readonly ChoiceOption[]; tone?: Tone }) {
  const t = toneClasses(tone);
  return (
    <div className={`mb-4 rounded-xl border p-3 ${t.surface}`}>
      {title && <p className="mb-1.5 text-caption font-semibold text-slate-700 dark:text-slate-300">{title}</p>}
      <ul className="grid gap-1 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.key} className="flex gap-2">
            <span className={`w-6 flex-shrink-0 font-bold ${t.text}`}>{o.key}</span>
            {o.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Question = { number: number; prompt?: string; options?: readonly ChoiceOption[] };

export function ShortAnswers({ questions, answers, onChange }: { questions: readonly Question[]; answers: Answers; onChange: OnAnswer }) {
  return (
    <ol className="space-y-4">
      {questions.map((q) => (
        <li key={q.number}>
          <label className="block">
            <span className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
              <NumberBadge n={q.number} />
              {q.prompt}
            </span>
            <input
              {...noAssist}
              id={`q-${q.number}`}
              type="text"
              value={answers[q.number] ?? ''}
              onChange={(e) => onChange(q.number, e.target.value)}
              className={`${inputBase} mt-2 min-h-touch w-full sm:w-72`}
            />
          </label>
        </li>
      ))}
    </ol>
  );
}

/** One-answer multiple choice; each question has its own options. */
export function ChoiceQuestions({ questions, answers, onChange }: { questions: readonly Question[]; answers: Answers; onChange: OnAnswer }) {
  return (
    <ol className="space-y-5">
      {questions.map((q) => (
        <li key={q.number}>
          <p className="flex items-start gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <NumberBadge n={q.number} />
            {q.prompt}
          </p>
          <Options
            id={`q-${q.number}`}
            label={`Câu ${q.number}`}
            options={q.options ?? []}
            selected={answers[q.number] ? [answers[q.number]] : []}
            onPick={(key) => onChange(q.number, key)}
          />
        </li>
      ))}
    </ol>
  );
}

/** "Choose TWO letters": the letters are stored together on the first question. */
export function MultiChoice({
  questions,
  prompt,
  options,
  answers,
  onChange,
}: {
  questions: readonly Question[];
  prompt: string;
  options: readonly ChoiceOption[];
  answers: Answers;
  onChange: OnAnswer;
}) {
  const first = questions[0].number;
  const chosen = (answers[first] ?? '').split(',').filter(Boolean);
  const max = questions.length;
  return (
    <>
      <p className="text-sm font-medium text-slate-900 dark:text-white">{prompt}</p>
      <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">
        Đã chọn {chosen.length}/{max}
      </p>
      <Options
        id={`q-${first}`}
        label={questionRange(questions)}
        options={options}
        selected={chosen}
        onPick={(key) => onChange(first, toggleChoice(answers[first], key, max))}
        isDisabled={() => chosen.length >= max}
        multi
      />
    </>
  );
}

/** A letter picker under (stacked) or beside each prompt. */
export function MatchingQuestions({
  questions,
  letters,
  answers,
  onChange,
  stacked,
}: {
  questions: readonly Question[];
  letters: readonly string[];
  answers: Answers;
  onChange: OnAnswer;
  stacked?: boolean;
}) {
  return (
    <ol className="space-y-4">
      {questions.map((q) => (
        <li key={q.number} className={`flex flex-col gap-2 ${stacked ? '' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
          <span className="flex items-start gap-2 text-sm text-slate-900 dark:text-white">
            <NumberBadge n={q.number} />
            {q.prompt}
          </span>
          <LetterPicker n={q.number} letters={letters} value={answers[q.number] ?? ''} onChange={(v) => onChange(q.number, v)} />
        </li>
      ))}
    </ol>
  );
}
