/**
 * Answer sheet for one Reading question group, covering all the Academic
 * types: completion (sentences, notes, table, flow-chart, summary with or
 * without a word box), short answer, multiple choice, choose-two,
 * TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN, matching headings, matching
 * information / features / sentence endings, and diagram labelling.
 */
import React, { useState } from 'react';
import { Eraser } from 'lucide-react';
import type { HeadingsGroup, ReadingAnswers, ReadingCompletionGroup, ReadingGroup, TfngGroup } from '../../../data/ielts/reading/types';
import { field, ghostBtn } from '../../ui/styles';
import { followsPassageOrder, nextBlank, readingGroupKind, TFNG_HINTS, tfngChoices, usedBy } from './questionLogic';
import {
  ChoiceQuestions,
  CompletionBody,
  GroupHeader,
  groupPanel,
  Hint,
  inputBase,
  MatchingQuestions,
  MultiChoice,
  noAssist,
  NumberBadge,
  optionOff,
  optionOn,
  OptionsBox,
  ShortAnswers,
  textBlanks,
  type Answers,
  type OnAnswer,
} from './parts';
import ReadingDiagram from './ReadingDiagram';

interface Props {
  group: ReadingGroup;
  answers: ReadingAnswers;
  onChange: OnAnswer;
}

const segment = 'press min-h-touch rounded-xl border px-2 text-caption font-bold tracking-wide transition-colors sm:text-sm';

function Tfng({ group, answers, onChange }: { group: TfngGroup; answers: Answers; onChange: OnAnswer }) {
  const choices = tfngChoices(group.variant);
  return (
    <ol className="space-y-5">
      {group.questions.map((q) => (
        <li key={q.number}>
          <p className="flex items-start gap-2 text-sm text-slate-900 dark:text-white">
            <NumberBadge n={q.number} />
            {q.prompt}
          </p>
          <div id={`q-${q.number}`} role="radiogroup" aria-label={`Câu ${q.number}`} className="mt-2 grid grid-cols-3 gap-1.5">
            {choices.map((c) => {
              const on = answers[q.number] === c;
              return (
                <button key={c} type="button" role="radio" aria-checked={on} onClick={() => onChange(q.number, on ? '' : c)} className={`${segment} ${on ? optionOn : optionOff}`}>
                  {c}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

const headingKey = (s: string) => s.trim().toLowerCase();

function Headings({ group, answers, onChange }: { group: HeadingsGroup; answers: Answers; onChange: OnAnswer }) {
  const used = usedBy(group.questions, answers, headingKey);
  const paragraphOf = new Map(group.questions.map((q) => [q.number, q.paragraph]));
  const choosable = group.headings.filter((h) => h.key !== group.example?.heading);
  const takenBy = (key: string, except?: number) =>
    (used.get(key) ?? []).filter((n) => n !== except).map((n) => paragraphOf.get(n));

  return (
    <>
      <div className="mb-4 rounded-xl border border-tone-butter-border bg-tone-butter p-3">
        <p className="mb-1.5 text-caption font-semibold text-slate-700 dark:text-slate-300">List of Headings</p>
        <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
          {group.headings.map((h) => {
            const isExample = h.key === group.example?.heading;
            const taken = takenBy(h.key);
            return (
              <li key={h.key} className={`flex gap-2 ${isExample || taken.length ? 'opacity-60' : ''}`}>
                <span className="w-8 flex-shrink-0 font-bold text-tone-butter-fg">{h.key}</span>
                <span className="flex-1">{h.text}</span>
                {isExample && <span className="flex-shrink-0 text-caption font-medium text-slate-500 dark:text-slate-400">Ví dụ</span>}
                {taken.length > 0 && <span className="flex-shrink-0 text-caption font-medium text-tone-butter-fg">Đoạn {taken.join(', ')}</span>}
              </li>
            );
          })}
        </ul>
      </div>
      {group.example && (
        <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold">Ví dụ:</span> Đoạn {group.example.paragraph} — {group.example.heading}
        </p>
      )}
      <ol className="space-y-3">
        {group.questions.map((q) => (
          <li key={q.number} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor={`q-${q.number}`} className="flex flex-shrink-0 items-center gap-2 text-sm font-medium text-slate-900 dark:text-white sm:w-28">
              <NumberBadge n={q.number} />
              Đoạn {q.paragraph}
            </label>
            <select id={`q-${q.number}`} value={headingKey(answers[q.number] ?? '')} onChange={(e) => onChange(q.number, e.target.value)} className={field}>
              <option value="">— Chọn heading —</option>
              {choosable.map((h) => {
                const taken = takenBy(h.key, q.number);
                return (
                  <option key={h.key} value={h.key}>
                    {h.key}. {h.text}
                    {taken.length ? ` (đã chọn cho đoạn ${taken.join(', ')})` : ''}
                  </option>
                );
              })}
            </select>
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Summary with a box of words: tap a blank, then a word. The next empty
 * blank becomes active, so a learner can fill the summary in one pass.
 */
function WordBoxSummary({ group, answers, onChange }: { group: ReadingCompletionGroup; answers: Answers; onChange: OnAnswer }) {
  const words = group.wordBox ?? [];
  const numbers = group.questions.map((q) => q.number);
  const [active, setActive] = useState<number | null>(() => nextBlank(numbers, answers, numbers[numbers.length - 1]) ?? numbers[0] ?? null);
  const used = usedBy(group.questions, answers, (s) => s.trim().toUpperCase());
  const wordOf = (key: string) => words.find((w) => w.key === key);

  const pick = (key: string) => {
    if (active === null) return;
    onChange(active, key);
    setActive(nextBlank(numbers, { ...answers, [active]: key }, active));
  };

  const renderBlank = (n: number) => {
    const value = (answers[n] ?? '').trim().toUpperCase();
    const on = active === n;
    const word = value ? wordOf(value) : undefined;
    return (
      <button
        id={`q-${n}`}
        type="button"
        aria-pressed={on}
        aria-label={`Câu ${n}: ${word ? `${word.key} ${word.text}` : 'trống'}`}
        onClick={() => setActive(n)}
        className={`press mx-0.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-1.5 align-middle text-sm transition-colors ${
          on ? 'border-tone-periwinkle-fg bg-tone-periwinkle-soft ring-2 ring-tone-periwinkle-border' : value ? 'border-tone-mint-border bg-tone-mint' : 'border-dashed border-slate-300 bg-white hover:border-tone-periwinkle-border dark:border-slate-600 dark:bg-slate-950'
        }`}
      >
        <span className="text-caption font-bold tabular-nums text-tone-periwinkle-fg">{n}</span>
        <span className={`min-w-12 text-left ${word ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
          {word ? `${word.key} ${word.text}` : '……'}
        </span>
      </button>
    );
  };

  const activeValue = active !== null ? (answers[active] ?? '').trim() : '';
  return (
    <>
      <CompletionBody title={group.title} lines={group.lines} table={group.table} renderBlank={renderBlank} />
      <div className="mt-4 rounded-xl border border-tone-mint-border bg-tone-mint p-3">
        <div className="mb-2 flex min-h-touch items-center justify-between gap-2">
          <p className="text-caption font-medium text-slate-700 dark:text-slate-300" aria-live="polite">
            {active !== null ? `Chọn từ cho câu ${active}` : 'Bấm vào một chỗ trống để chọn hoặc đổi từ'}
          </p>
          {active !== null && activeValue && (
            <button type="button" onClick={() => onChange(active, '')} className={ghostBtn}>
              <Eraser className="h-4 w-4" aria-hidden />
              Xoá câu {active}
            </button>
          )}
        </div>
        <ul className="flex flex-wrap gap-2">
          {words.map((w) => {
            const takenBy = used.get(w.key) ?? [];
            const isActiveValue = active !== null && activeValue.toUpperCase() === w.key;
            return (
              <li key={w.key}>
                <button
                  type="button"
                  disabled={active === null}
                  onClick={() => pick(w.key)}
                  className={`press inline-flex min-h-touch items-center gap-2 rounded-xl border px-3 text-sm transition-colors disabled:cursor-default ${isActiveValue ? optionOn : optionOff}`}
                >
                  <span className="font-bold text-tone-mint-fg">{w.key}</span>
                  <span>{w.text}</span>
                  {takenBy.length > 0 && !isActiveValue && <span className="text-caption text-slate-500 dark:text-slate-400">câu {takenBy.join(', ')}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function Body({ group, answers, onChange }: Props) {
  switch (group.type) {
    case 'completion':
      return group.wordBox?.length ? (
        <WordBoxSummary group={group} answers={answers} onChange={onChange} />
      ) : (
        <CompletionBody
          title={group.title}
          lines={group.lines}
          table={group.table}
          layout={group.layout}
          renderBlank={textBlanks(answers, group.wordLimit > 1, onChange)}
        />
      );
    case 'short_answer':
      return <ShortAnswers questions={group.questions} answers={answers} onChange={onChange} />;
    case 'mcq':
      return <ChoiceQuestions questions={group.questions} answers={answers} onChange={onChange} />;
    case 'mcq_multi':
      return <MultiChoice questions={group.questions} prompt={group.prompt} options={group.options} answers={answers} onChange={onChange} />;
    case 'tfng':
      return <Tfng group={group} answers={answers} onChange={onChange} />;
    case 'headings':
      return <Headings group={group} answers={answers} onChange={onChange} />;
    case 'matching':
      return (
        <>
          {group.target !== 'paragraph' && <OptionsBox title={group.optionsTitle} options={group.options} />}
          <MatchingQuestions questions={group.questions} letters={group.options.map((o) => o.key)} answers={answers} onChange={onChange} stacked />
        </>
      );
    case 'diagram':
      return (
        <>
          <ReadingDiagram diagram={group.diagram} answers={answers} />
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.questions.map((q) => (
              <li key={q.number} className="flex items-center gap-2">
                <NumberBadge n={q.number} />
                <input
                  {...noAssist}
                  id={`q-${q.number}`}
                  type="text"
                  aria-label={`Câu ${q.number}`}
                  value={answers[q.number] ?? ''}
                  onChange={(e) => onChange(q.number, e.target.value)}
                  className={`${inputBase} min-h-touch w-full`}
                />
              </li>
            ))}
          </ol>
        </>
      );
  }
}

export default function ReadingGroupView(props: Props) {
  const { group } = props;
  const letters = group.type === 'matching' && group.target === 'paragraph' ? group.options.map((o) => o.key) : [];
  return (
    <section className={groupPanel}>
      <GroupHeader kind={readingGroupKind(group)} questions={group.questions} instruction={group.instruction} order={followsPassageOrder(group)}>
        {group.type === 'tfng' && <Hint>{TFNG_HINTS[group.variant]}</Hint>}
        {letters.length > 0 && (
          <Hint>
            Tìm đoạn ({letters[0]}–{letters[letters.length - 1]}) chứa thông tin.
          </Hint>
        )}
        {group.type === 'matching' && group.reuse && <Hint>Có thể dùng một chữ cái nhiều lần.</Hint>}
      </GroupHeader>
      <Body {...props} />
    </section>
  );
}
