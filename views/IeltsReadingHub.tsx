import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Clock, FileText, Info } from 'lucide-react';
import type { IeltsAttempt } from '../types';
import { DIFFICULTY_LABELS, READING_EXAM_MINUTES, READING_FULL_TESTS, READING_PRACTICE_TESTS, type ReadingTest } from '../data/ielts/reading';
import { passageQuestions, passageWordCount, type ReadingMode } from '../services/readingLogic';
import { isReadingDetails } from '../services/ieltsAttemptService';
import { GROUP_KINDS } from '../components/ielts/questions/parts';
import { readingGroupKind } from '../components/ielts/questions/questionLogic';
import IeltsAttemptHistory from '../components/IeltsAttemptHistory';
import { Segmented } from '../components/ui/Segmented';
import { IconTile } from '../components/ui/IconTile';
import { ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../components/ui/styles';

interface Props {
  userId: string;
  onStart: (testId: string, passageIds: string[], mode: ReadingMode) => void;
  onOpenAttempt: (attempt: IeltsAttempt) => void;
  onBack: () => void;
}

const compactBtn = secondaryBtn.replace('px-4', 'px-3');

const MODE_KEY = 'ielts-reading-mode';
const MODE_HINTS: Record<ReadingMode, string> = {
  practice: 'Đồng hồ theo từng passage so với thời gian gợi ý, được kiểm tra từng nhóm câu ngay khi làm xong.',
  exam: 'Giống thi thật: một đồng hồ đếm ngược cho cả bài, hết giờ tự nộp, chỉ xem đáp án sau khi nộp.',
};

function readMode(): ReadingMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'exam' ? 'exam' : 'practice';
  } catch {
    return 'practice';
  }
}

const questionKinds = (test: ReadingTest) => [...new Set(test.passages.flatMap((p) => p.groups.map((g) => GROUP_KINDS[readingGroupKind(g)].label)))];

export default function IeltsReadingHub({ userId, onStart, onOpenAttempt, onBack }: Props) {
  const [mode, setModeState] = useState<ReadingMode>(readMode);
  const setMode = (m: ReadingMode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* private mode: keep it for this visit only */
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> IELTS
      </button>

      <header>
        <p className="text-caption font-medium text-slate-600 dark:text-slate-400">IELTS Academic</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Reading</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Làm đề 3 passage hoặc luyện từng passage. Bài được chấm ngay, kèm câu trong bài chứa đáp án và cách đề diễn đạt lại.
        </p>
      </header>

      <section aria-labelledby="reading-mode" className={`${panel} p-4 sm:p-5`}>
        <h2 id="reading-mode" className="text-sm font-semibold text-slate-900 dark:text-white">
          Chế độ làm bài
        </h2>
        <Segmented
          className="mt-3"
          label="Chế độ làm bài"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'practice', label: 'Luyện tập' },
            { value: 'exam', label: 'Thi thử' },
          ]}
        />
        <p className="mt-2 text-caption text-slate-600 dark:text-slate-400">{MODE_HINTS[mode]}</p>
      </section>

      <section aria-labelledby="reading-full">
        <h2 id="reading-full" className="text-title font-semibold text-slate-900 dark:text-white">
          Đề đầy đủ
        </h2>
        <ul className="mt-3 space-y-3">
          {READING_FULL_TESTS.map((test) => (
            <li key={test.id} className={`${panel} group p-4 sm:p-5`}>
              <div className="flex items-start gap-3">
                <IconTile icon={BookOpenText} tone="mint" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h3>
                  <p className="mt-0.5 text-caption text-slate-600 dark:text-slate-400">{test.descriptionVi}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-caption text-slate-600 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-tone-sky-fg" aria-hidden /> 40 câu, {READING_EXAM_MINUTES} phút
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={() => onStart(test.id, [], mode)} className={primaryBtn}>
                  Làm cả đề <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  {test.passages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onStart(test.id, [p.id], mode)}
                      className={compactBtn}
                      title={`${p.title} · ${DIFFICULTY_LABELS[p.difficulty]}`}
                    >
                      Passage {p.part}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="reading-passages">
        <h2 id="reading-passages" className="text-title font-semibold text-slate-900 dark:text-white">
          Luyện từng passage
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {READING_PRACTICE_TESTS.map((test) => {
            const p = test.passages[0];
            return (
              <li key={test.id} className={`${panel} group flex flex-col p-4`}>
                <div className="flex items-start gap-3">
                  <IconTile icon={FileText} tone="mint" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-semibold text-slate-600 dark:text-slate-400">
                      Passage {p.part} · {DIFFICULTY_LABELS[p.difficulty]} · {passageQuestions(p).length} câu
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h3>
                  </div>
                </div>
                <p className="mt-2 flex-1 text-caption text-slate-600 dark:text-slate-400">{test.descriptionVi}</p>
                <p className="mt-1.5 text-caption text-slate-600 dark:text-slate-400">
                  {passageWordCount(p)} từ · gợi ý {p.suggestedMinutes} phút
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {questionKinds(test).map((t) => (
                    <span key={t} className={tag}>
                      {t}
                    </span>
                  ))}
                </div>
                <button type="button" onClick={() => onStart(test.id, [], mode)} className={`${secondaryBtn} mt-4 w-full`}>
                  Bắt đầu <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="flex items-start gap-2 text-caption text-slate-600 dark:text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-tone-sky-fg" aria-hidden />
        Bài làm dở được lưu trên máy này, kể cả phần tô sáng, nên có thể quay lại làm tiếp.
      </p>

      <IeltsAttemptHistory userId={userId} skill="reading" onOpenAttempt={onOpenAttempt} canOpen={(a) => isReadingDetails(a.details)} />
    </div>
  );
}
