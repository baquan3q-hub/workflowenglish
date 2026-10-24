/**
 * "Lập dàn ý" for Task 2: asks the ieltsIdeas op for ideas on each side,
 * useful phrases and a paragraph plan. It never writes the essay.
 */
import React, { useState } from 'react';
import { Lightbulb, Loader2, RotateCcw } from 'lucide-react';
import type { IeltsQuestion, IeltsWritingIdeas } from '../../../types';
import { getWritingIdeas } from '../../../services/ieltsWritingService';
import { aiErrorMessage } from '../../../services/aiClient';
import { secondaryBtn } from '../../ui/styles';

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; ideas: IeltsWritingIdeas };


export default function IdeasPanel({ question }: { question: IeltsQuestion }) {
  const [state, setState] = useState<State>({ status: 'idle' });

  const load = async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'done', ideas: await getWritingIdeas(question.prompt, question.questionType) });
    } catch (err) {
      setState({ status: 'error', message: aiErrorMessage(err) });
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="ideas-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="ideas-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            Lập dàn ý
          </h3>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            Gợi ý ý tưởng cho hai phía, ví dụ và từ vựng. Bạn tự viết thành câu.
          </p>
        </div>
        {state.status !== 'done' && (
          <button type="button" onClick={load} disabled={state.status === 'loading'} className={secondaryBtn}>
            {state.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            {state.status === 'loading' ? 'Đang gợi ý…' : 'Gợi ý ý tưởng'}
          </button>
        )}
      </div>

      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-tone-blush p-3 text-sm text-tone-blush-fg">
          Chưa lấy được gợi ý. {state.message}
        </p>
      )}

      {state.status === 'done' && <IdeasView ideas={state.ideas} onReload={load} />}
    </section>
  );
}

function IdeasView({ ideas, onReload }: { ideas: IeltsWritingIdeas; onReload: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {ideas.sides.map((side, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{side.label}</p>
            <ul className="space-y-2">
              {side.ideas.map((idea, j) => (
                <li key={j} className="text-sm leading-relaxed">
                  <span className="font-medium text-slate-900 dark:text-white">{idea.point}</span>
                  {idea.example && <span className="block text-caption text-slate-600 dark:text-slate-400">Ví dụ: {idea.example}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {ideas.vocabulary.length > 0 && (
        <div className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Từ vựng nên dùng</p>
          <ul className="flex flex-wrap gap-2">
            {ideas.vocabulary.map((v, i) => (
              <li key={i} className="rounded-lg border border-slate-200 px-2.5 py-1 text-caption dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-white">{v.phrase}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {v.meaningVi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ideas.outline.length > 0 && (
        <div className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dàn ý 4 đoạn</p>
          <ol className="space-y-1.5">
            {ideas.outline.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="w-24 flex-shrink-0 font-semibold text-slate-900 dark:text-white">{o.paragraph}</span>
                <span>{o.plan}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={onReload}
        className="press inline-flex min-h-touch items-center gap-1.5 rounded-xl px-2 text-caption font-semibold text-slate-600 hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:text-slate-400"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Gợi ý khác
      </button>
    </div>
  );
}
