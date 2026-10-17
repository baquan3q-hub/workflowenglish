import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import type { ListeningAnswers, ListeningTest } from '../data/ielts/listening';
import { sectionAudioSegments, sessionSections, unansweredCount, type ListeningMode } from '../services/listeningLogic';
import { prepareSegmentAudio } from '../services/listeningAudioService';
import { useSegmentAudio } from '../components/ielts/useSegmentAudio';
import SegmentPlayer from '../components/ielts/SegmentPlayer';
import QuestionGroupView from '../components/ielts/listening/QuestionGroupView';
import { ErrorState } from '../components/ui/States';

interface Props {
  userId: string;
  test: ListeningTest;
  /** Parts to take; empty means the whole test. */
  sectionIds: string[];
  mode: ListeningMode;
  onSubmit: (answers: ListeningAnswers, durationSeconds: number) => void;
  onExit: () => void;
  /** Audio source; swapped out in previews. */
  prepare?: typeof prepareSegmentAudio;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const chipBase = 'inline-flex min-h-touch flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed';
const chipOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

interface Draft {
  answers: ListeningAnswers;
  index: number;
  elapsed: number;
}

const draftKey = (userId: string, testId: string, sectionIds: string[], mode: ListeningMode) =>
  `ielts-listening-draft:${userId}:${testId}:${sectionIds.join('+') || 'all'}:${mode}`;

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    const d = raw ? (JSON.parse(raw) as Draft) : null;
    return d && typeof d.answers === 'object' ? d : null;
  } catch {
    return null;
  }
}

export function clearListeningDraft(userId: string, testId: string, sectionIds: string[], mode: ListeningMode) {
  try {
    localStorage.removeItem(draftKey(userId, testId, sectionIds, mode));
  } catch {
    /* nothing saved */
  }
}

export default function IeltsListeningPractice({ userId, test, sectionIds, mode, onSubmit, onExit, prepare }: Props) {
  const sections = useMemo(() => sessionSections(test, sectionIds), [test, sectionIds]);
  const key = draftKey(userId, test.id, sectionIds, mode);
  const [draft] = useState(() => readDraft(key));
  const [answers, setAnswers] = useState<ListeningAnswers>(draft?.answers ?? {});
  const [index, setIndex] = useState(() => Math.min(draft?.index ?? 0, sections.length - 1));
  const [partDone, setPartDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const startedAt = useRef(Date.now() - (draft?.elapsed ?? 0) * 1000);
  const topRef = useRef<HTMLDivElement>(null);

  const section = sections[index];
  const exam = mode === 'exam';
  const last = index === sections.length - 1;
  const audioSegments = useMemo(() => sectionAudioSegments(section), [section]);
  const { state, retry } = useSegmentAudio(audioSegments, prepare);
  const playerSegments = useMemo(
    () =>
      section.segments.map((s) => ({
        id: s.id,
        label: [...new Set(s.lines.map((l) => l.speaker))].join(', '),
      })),
    [section],
  );

  useEffect(() => {
    try {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      localStorage.setItem(key, JSON.stringify({ answers, index, elapsed } satisfies Draft));
    } catch {
      /* private mode: no draft */
    }
  }, [key, answers, index]);

  const setAnswer = (n: number, v: string) => setAnswers((a) => ({ ...a, [n]: v }));

  const goTo = (i: number) => {
    setIndex(i);
    setPartDone(false);
    setConfirming(false);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const missing = sections.reduce((n, s) => n + unansweredCount(s.groups, answers), 0);
  const total = sections.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.questions.length, 0), 0);

  const submit = () => {
    if (missing > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    clearListeningDraft(userId, test.id, sectionIds, mode);
    onSubmit(answers, Math.round((Date.now() - startedAt.current) / 1000));
  };

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-4 space-y-4 pb-10 anim-fade-up">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onExit} className={`${ghostBtn} -ml-3`}>
          <ArrowLeft className="h-4 w-4" /> Thoát
        </button>
        <p className="text-caption font-medium tabular-nums text-slate-500 dark:text-slate-400">
          Đã làm {total - missing}/{total} câu
        </p>
        <button type="button" onClick={submit} className={primaryBtn}>
          <Send className="h-4 w-4" /> Nộp bài
        </button>
      </div>

      {confirming && (
        <div role="alert" className={`${panel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center`}>
          <p className="flex-1 text-sm text-slate-800 dark:text-slate-200">
            Còn {missing} câu chưa trả lời. Trong bài thi thật nên đoán thay vì bỏ trống, vì sai không bị trừ điểm.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={secondaryBtn}>
              Làm tiếp
            </button>
            <button type="button" onClick={submit} className={primaryBtn}>
              Vẫn nộp
            </button>
          </div>
        </div>
      )}

      {sections.length > 1 && (
        <nav aria-label="Các part" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {sections.map((s, i) => {
            const left = unansweredCount(s.groups, answers);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                disabled={exam && i !== index}
                aria-current={i === index ? 'step' : undefined}
                className={`${chipBase} ${i === index ? chipOn : chipOff}`}
              >
                Part {s.part}
                <span className="text-caption tabular-nums opacity-70">{left === 0 ? 'xong' : `còn ${left}`}</span>
              </button>
            );
          })}
        </nav>
      )}

      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          {test.title} · {exam ? 'Thi thử' : 'Luyện tập'}
        </p>
        <h1 className="mt-1 text-title font-bold text-slate-900 dark:text-white">
          Part {section.part}: {section.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{section.contextVi}</p>
      </header>

      {state.status === 'loading' && (
        <div className={`${panel} p-4`} role="status">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang chuẩn bị audio {state.done}/{state.total}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-slate-900 transition-all dark:bg-white"
              style={{ width: `${state.total ? (state.done / state.total) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">
            Bạn có thể đọc trước câu hỏi. Lần đầu tạo audio có thể mất khoảng một phút.
          </p>
        </div>
      )}
      {state.status === 'error' && <ErrorState title="Chưa tải được audio" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <SegmentPlayer
          key={section.id}
          segments={playerSegments}
          urls={state.urls}
          mode={mode}
          prepSeconds={exam ? section.prepSeconds : 0}
          onFinished={() => setPartDone(true)}
        />
      )}

      {partDone && exam && (
        <div role="status" className={`${panel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center`}>
          <p className="flex-1 text-sm text-slate-800 dark:text-slate-200">
            Hết phần nghe Part {section.part}. Kiểm tra lại chính tả và giới hạn từ trước khi {last ? 'nộp bài' : 'sang part tiếp'}.
          </p>
          {!last && (
            <button type="button" onClick={() => goTo(index + 1)} className={primaryBtn}>
              Sang Part {sections[index + 1].part} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {section.groups.map((g) => (
          <QuestionGroupView key={g.id} group={g} answers={answers} onChange={setAnswer} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {!exam && index > 0 ? (
          <button type="button" onClick={() => goTo(index - 1)} className={secondaryBtn}>
            <ArrowLeft className="h-4 w-4" /> Part {sections[index - 1].part}
          </button>
        ) : (
          <span />
        )}
        {last ? (
          <button type="button" onClick={submit} className={primaryBtn}>
            <Send className="h-4 w-4" /> Nộp bài
          </button>
        ) : (
          <button type="button" onClick={() => goTo(index + 1)} className={exam ? secondaryBtn : primaryBtn}>
            {exam ? 'Bỏ qua, sang' : 'Sang'} Part {sections[index + 1].part} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
