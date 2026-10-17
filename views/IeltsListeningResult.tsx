import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Keyboard, Loader2, Quote, RotateCcw, Square, TriangleAlert, Volume2, X } from 'lucide-react';
import type { ListeningAnswers, ListeningGroup, ListeningTest } from '../data/ielts/listening';
import {
  ANSWER_STATUS_LABELS,
  answerLabel,
  errorBreakdown,
  questionContext,
  scoreSections,
  sectionAudioSegments,
  sessionSections,
  type AnswerStatus,
  type ListeningMode,
  type QuestionResult,
} from '../services/listeningLogic';
import { Segmented } from '../components/ui/Segmented';
import TranscriptView from '../components/ielts/listening/TranscriptView';
import { useClipPlayer, type ResolveClip } from '../components/ielts/listening/useClipPlayer';
import type { AudioSegment } from '../services/listeningAudioService';

interface Props {
  test: ListeningTest;
  sectionIds: string[];
  mode: ListeningMode;
  answers: ListeningAnswers;
  onRetry: () => void;
  onBack: () => void;
  /** Opens dictation on one part. */
  onDictation?: (sectionId: string) => void;
  /** Audio source; swapped out in previews. */
  resolveClip?: ResolveClip;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

const STATUS_TONE: Record<AnswerStatus, string> = {
  correct: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  spelling: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  plural: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  over_limit: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  wrong: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  blank: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

/** What a near miss means for the learner, shown under the answer. */
const STATUS_TIPS: Partial<Record<AnswerStatus, string>> = {
  spelling: 'Gần đúng nhưng sai chính tả. Trong bài thi thật câu này bị tính sai.',
  plural: 'Thiếu hoặc thừa -s. Hãy nghe kỹ âm cuối và xem từ trước ô trống có phải số nhiều không.',
  over_limit: 'Đáp án vượt giới hạn từ của đề nên bị tính sai dù có chứa từ đúng.',
};

const ERROR_ORDER: AnswerStatus[] = ['wrong', 'spelling', 'plural', 'over_limit', 'blank'];

type Filter = 'wrong' | 'all';

function bandNote(estimated: boolean, total: number) {
  return estimated
    ? `Band ước lượng: quy từ ${total} câu sang thang 40 câu. Làm cả đề để có band chính xác hơn.`
    : 'Quy đổi theo bảng điểm Listening 40 câu.';
}

const replayBtn =
  'inline-flex min-h-touch items-center gap-1.5 rounded-xl px-3 text-caption font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

interface ReplayProps {
  playing: boolean;
  loading: boolean;
  onReplay: () => void;
}

function ResultCard({ r, group, replay }: { r: QuestionResult; group: ListeningGroup; replay: ReplayProps }) {
  const ok = r.status === 'correct';
  const context = questionContext(group, r.question);
  const tip = STATUS_TIPS[r.status];
  const p = r.question.paraphrase;
  return (
    <li className={`${panel} p-4`}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 min-w-7 flex-shrink-0 items-center justify-center rounded-lg px-1 text-caption font-bold tabular-nums ${STATUS_TONE[r.status]}`}
        >
          {r.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-semibold ${STATUS_TONE[r.status]}`}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {ANSWER_STATUS_LABELS[r.status]}
            </span>
            <span className="text-caption text-slate-500 dark:text-slate-400">Part {r.part}</span>
            <button type="button" onClick={replay.onReplay} className={`${replayBtn} ml-auto -my-2 -mr-2`}>
              {replay.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : replay.playing ? (
                <Square className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {replay.playing || replay.loading ? 'Dừng' : 'Nghe lại đoạn này'}
            </button>
          </div>
          {context && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{context}</p>}

          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-caption text-slate-500 dark:text-slate-400">Bạn trả lời</dt>
              <dd className={`font-medium ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                {r.given ? answerLabel(group, r.question, r.given) : <span className="italic text-slate-400">Bỏ trống</span>}
              </dd>
            </div>
            {!ok && (
              <div>
                <dt className="text-caption text-slate-500 dark:text-slate-400">Đáp án</dt>
                <dd className="font-medium text-emerald-700 dark:text-emerald-300">{answerLabel(group, r.question, r.expected)}</dd>
              </div>
            )}
          </dl>
          {tip && <p className="mt-2 text-caption text-amber-700 dark:text-amber-300">{tip}</p>}

          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{r.question.explanationVi}</p>

          <blockquote className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
            <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span>{r.question.evidence}</span>
          </blockquote>
          {r.question.distractor && (
            <p className="mt-2 flex gap-2 text-sm text-slate-700 dark:text-slate-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>
                <span className="font-semibold">Bẫy: </span>
                {r.question.distractor}
              </span>
            </p>
          )}
          {p && (
            <p className="mt-2 text-caption text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Đề ↔ Audio: </span>
              <span className="italic">{p.question}</span> ↔ <span className="italic">{p.audio}</span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function IeltsListeningResult({ test, sectionIds, mode, answers, onRetry, onBack, onDictation, resolveClip }: Props) {
  const sections = useMemo(() => sessionSections(test, sectionIds), [test, sectionIds]);
  const score = useMemo(() => scoreSections(sections, answers), [sections, answers]);
  const groups = useMemo(() => new Map(sections.flatMap((s) => s.groups.map((g) => [g.id, g] as const))), [sections]);
  const errors = errorBreakdown(score.results);
  const wrongCount = score.total - score.score;
  const [filter, setFilter] = useState<Filter>(wrongCount > 0 ? 'wrong' : 'all');
  const shown = filter === 'wrong' ? score.results.filter((r) => r.status !== 'correct') : score.results;
  const clips = useMemo(() => new Map<string, AudioSegment>(sections.flatMap((s) => sectionAudioSegments(s).map((a) => [a.id, a] as const))), [sections]);
  const clip = useClipPlayer(resolveClip);
  const toggleClip = (segmentId: string) => {
    const a = clips.get(segmentId);
    if (a) clip.toggle(a);
  };
  const [showScript, setShowScript] = useState(false);
  const [scriptId, setScriptId] = useState(sections[0].id);
  const scriptSection = sections.find((s) => s.id === scriptId) ?? sections[0];
  const title = sections.length === 1 && test.sections.length > 1 ? `${test.title} · Part ${sections[0].part}` : test.title;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> Listening
      </button>

      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          Kết quả · {mode === 'exam' ? 'Thi thử' : 'Luyện tập'}
        </p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{title}</h1>
      </header>

      <section className={`${panel} p-4 sm:p-5`} aria-label="Điểm">
        <div className="flex items-end gap-6">
          <div>
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">{score.estimated ? 'Band ước lượng' : 'Band'}</p>
            <p className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{score.band.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Số câu đúng</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {score.score}
              <span className="text-base font-semibold text-slate-400">/{score.total}</span>
            </p>
          </div>
        </div>
        <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">{bandNote(score.estimated, score.total)}</p>

        {score.byPart.length > 1 && (
          <ul className="mt-4 space-y-2">
            {score.byPart.map((p) => (
              <li key={p.sectionId} className="flex items-center gap-3 text-sm">
                <span className="w-14 flex-shrink-0 font-medium text-slate-700 dark:text-slate-300">Part {p.part}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span
                    className="block h-full rounded-full bg-emerald-500"
                    style={{ width: `${p.total ? (p.score / p.total) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-12 text-right tabular-nums text-slate-600 dark:text-slate-400">
                  {p.score}/{p.total}
                </span>
              </li>
            ))}
          </ul>
        )}

        {wrongCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {ERROR_ORDER.filter((s) => errors[s]).map((s) => (
              <span key={s} className={`inline-flex items-center rounded-md px-2 py-1 text-caption font-medium ${STATUS_TONE[s]}`}>
                {ANSWER_STATUS_LABELS[s]}: {errors[s]}
              </span>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="listening-review">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="listening-review" className="text-title font-semibold text-slate-900 dark:text-white">
            Xem lại từng câu
          </h2>
          <Segmented
            label="Lọc câu"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { value: 'wrong', label: `Câu sai (${wrongCount})` },
              { value: 'all', label: 'Tất cả' },
            ]}
          />
        </div>
        {clip.error && (
          <p role="alert" className="mt-2 text-caption text-rose-600 dark:text-rose-400">
            {clip.error}
          </p>
        )}
        {shown.length === 0 ? (
          <p className={`${panel} mt-3 p-4 text-sm text-slate-600 dark:text-slate-400`}>Bạn đúng hết. Thử chế độ Thi thử hoặc một đề khác.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {shown.map((r) => {
              const g = groups.get(r.groupId);
              const id = r.question.segmentId;
              return g ? (
                <ResultCard
                  key={r.number}
                  r={r}
                  group={g}
                  replay={{ playing: clip.activeId === id, loading: clip.loadingId === id, onReplay: () => toggleClip(id) }}
                />
              ) : null;
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="listening-script" className={`${panel} p-4 sm:p-5`}>
        <button
          type="button"
          onClick={() => setShowScript((v) => !v)}
          aria-expanded={showScript}
          className="-m-2 flex min-h-touch w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <span>
            <span id="listening-script" className="block text-sm font-semibold text-slate-900 dark:text-white">
              Transcript
            </span>
            <span className="block text-caption text-slate-500 dark:text-slate-400">Đọc lại bài nghe, xem câu chứa đáp án và câu bẫy.</span>
          </span>
          <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform ${showScript ? 'rotate-180' : ''}`} />
        </button>
        {showScript && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {sections.length > 1 ? (
                <Segmented
                  label="Part"
                  value={scriptId}
                  onChange={(v) => setScriptId(String(v))}
                  options={sections.map((s) => ({ value: s.id, label: `Part ${s.part}` }))}
                />
              ) : (
                <span />
              )}
              {onDictation && (
                <button type="button" onClick={() => onDictation(scriptSection.id)} className={secondaryBtn}>
                  <Keyboard className="h-4 w-4" /> Chép chính tả part này
                </button>
              )}
            </div>
            <TranscriptView section={scriptSection} activeId={clip.activeId} loadingId={clip.loadingId} onToggleSegment={toggleClip} />
          </div>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onRetry} className={primaryBtn}>
          <RotateCcw className="h-4 w-4" /> Làm lại
        </button>
        <button type="button" onClick={onBack} className={secondaryBtn}>
          Về Listening
        </button>
      </div>
    </div>
  );
}
