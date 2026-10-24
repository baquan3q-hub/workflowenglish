/**
 * "Luyện theo dạng" in the Reading hub: pick a question type, see every
 * passage that has it, mistakes from last time first, and start one.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { getReadingTest, READING_TESTS } from '../../../data/ielts/reading';
import { findLesson } from '../../../data/ielts/library';
import { READING_KIND_LESSON, type ReadingKind } from '../../../data/ielts/readingLessons';
import { getIeltsAttempts } from '../../../services/ieltsAttemptService';
import {
  attemptRecords,
  drillCandidates,
  drillKindCounts,
  loadDrillLog,
  type DrillCandidate,
  type DrillStatus,
  type GroupRecord,
} from '../../../services/readingDrill';
import { GROUP_KINDS } from '../questions/parts';
import { toneClasses, type Tone } from '../../ui/palette';
import { ghostBtn, panel, secondaryBtn } from '../../ui/styles';

interface Props {
  userId: string;
  /** Kind to open on, e.g. from a lesson's "Luyện dạng này". */
  initialKind?: ReadingKind;
  onStart: (drillTestId: string) => void;
  onOpenLesson: (lessonId: string) => void;
}

const compactBtn = secondaryBtn.replace('px-4', 'px-3');
const SHOWN = 4;
const ATTEMPT_LIMIT = 50;

const STATUS: Record<DrillStatus, { tone: Tone; label: (c: DrillCandidate) => string }> = {
  wrong: { tone: 'blush', label: (c) => `Lần trước đúng ${c.correct}/${c.total}` },
  new: { tone: 'sky', label: () => 'Chưa làm' },
  done: { tone: 'mint', label: () => 'Đã đúng hết' },
};

export default function DrillSection({ userId, initialKind, onStart, onOpenLesson }: Props) {
  const counts = useMemo(() => drillKindCounts(READING_TESTS), []);
  const [records, setRecords] = useState<GroupRecord[]>(() => loadDrillLog(userId));
  const [picked, setPicked] = useState<ReadingKind | null>(initialKind ?? null);
  const [showAll, setShowAll] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const local = loadDrillLog(userId);
    setRecords(local);
    if (!userId) return;
    let live = true;
    getIeltsAttempts(userId, 'reading', ATTEMPT_LIMIT)
      .then((attempts) => live && setRecords([...attemptRecords(attempts, getReadingTest), ...local]))
      .catch(() => {
        /* offline or migration 012 missing: order from this device only */
      });
    return () => {
      live = false;
    };
  }, [userId]);

  useEffect(() => {
    if (initialKind) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [initialKind]);

  // Until the learner picks, open on the first kind with a mistake to fix.
  const kinds = useMemo(() => [...counts.keys()], [counts]);
  const auto = useMemo(
    () => kinds.find((k) => drillCandidates(k, READING_TESTS, records)[0]?.status === 'wrong') ?? kinds[0],
    [kinds, records],
  );
  const kind = picked ?? auto;
  const candidates = useMemo(() => (kind ? drillCandidates(kind, READING_TESTS, records) : []), [kind, records]);
  const shown = showAll ? candidates : candidates.slice(0, SHOWN);
  const lesson = kind ? findLesson(READING_KIND_LESSON[kind]) : undefined;

  if (!kind) return null;
  return (
    <section ref={rootRef} aria-labelledby="reading-drill" className={`${panel} scroll-mt-24 p-4 sm:p-5`}>
      <h2 id="reading-drill" className="text-title font-semibold text-slate-900 dark:text-white">
        Luyện theo dạng
      </h2>
      <p className="mt-1 text-caption text-slate-600 dark:text-slate-400">
        Gom mọi nhóm câu của một dạng trong kho đề. Nhóm làm sai lần trước hiện đầu tiên.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Dạng câu hỏi">
        {kinds.map((k) => {
          const info = GROUP_KINDS[k];
          const on = k === kind;
          const t = toneClasses(info.tone);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setPicked(k);
                setShowAll(false);
              }}
              className={`press group inline-flex min-h-touch items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                on ? `${t.border} ${t.tile}` : 'border-slate-200 bg-white text-slate-700 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <info.icon className={`icon-pop h-4 w-4 ${on ? '' : t.text}`} aria-hidden />
              {info.label}
              <span className="tabular-nums text-caption opacity-70">{counts.get(k)}</span>
            </button>
          );
        })}
      </div>

      {lesson && (
        <button type="button" onClick={() => onOpenLesson(lesson.id)} className={`${ghostBtn} -ml-3 mt-3`}>
          <BookOpen className="h-4 w-4 text-tone-lavender-fg" aria-hidden /> Bài chiến lược: {lesson.title}
        </button>
      )}

      <ul className="mt-2 space-y-2">
        {shown.map((c) => {
          const s = STATUS[c.status];
          return (
            <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.passageTitle}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-slate-600 dark:text-slate-400">
                  <span>
                    {getReadingTest(c.testId)?.kind === 'full' ? `${c.title} · ` : ''}Passage {c.part} · {c.questions} câu
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 font-medium ${toneClasses(s.tone).tile}`}>{s.label(c)}</span>
                </p>
              </div>
              <button type="button" onClick={() => onStart(c.id)} className={compactBtn}>
                Luyện <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {candidates.length > SHOWN && (
        <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className={`${ghostBtn} -ml-3 mt-2`}>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden />
          {showAll ? 'Thu gọn' : `Xem thêm ${candidates.length - SHOWN}`}
        </button>
      )}
    </section>
  );
}
