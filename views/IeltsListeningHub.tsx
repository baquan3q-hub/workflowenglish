import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Clock, Hash, Headphones, Info, Keyboard } from 'lucide-react';
import type { IeltsAttempt } from '../types';
import {
  GROUP_TYPE_LABELS,
  LISTENING_FULL_TESTS,
  LISTENING_PRACTICE_TESTS,
  PART_DESCRIPTIONS_VI,
  type ListeningTest,
} from '../data/ielts/listening';
import type { ListeningMode } from '../services/listeningLogic';
import { isListeningDetails } from '../services/ieltsAttemptService';
import IeltsAttemptHistory from '../components/IeltsAttemptHistory';
import { Segmented } from '../components/ui/Segmented';
import GeneratedSections, { type GeneratedSectionsApi } from '../components/ielts/listening/GeneratedSections';
import LibrarySection from '../components/ielts/listening/LibrarySection';

interface Props {
  userId: string;
  onStart: (testId: string, sectionIds: string[], mode: ListeningMode) => void;
  onOpenDictation: () => void;
  onOpenDrill: () => void;
  onOpenAttempt: (attempt: IeltsAttempt) => void;
  onBack: () => void;
  /** Generated-part service calls; the real ones by default. */
  generatedApi?: GeneratedSectionsApi;
  /** Published library tests; the real call by default. */
  loadLibrary?: () => Promise<ListeningTest[]>;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const tag = 'inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-caption font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300';

const MODE_KEY = 'ielts-listening-mode';
const MODE_HINTS: Record<ListeningMode, string> = {
  practice: 'Được dừng, nghe lại từng đoạn, chỉnh tốc độ 0.75× và chuyển part tùy ý.',
  exam: 'Giống thi thật: có thời gian đọc câu hỏi, audio chỉ phát một lần, không dừng được.',
};

function readMode(): ListeningMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'exam' ? 'exam' : 'practice';
  } catch {
    return 'practice';
  }
}

const questionTypes = (test: ListeningTest) => [...new Set(test.sections.flatMap((s) => s.groups.map((g) => GROUP_TYPE_LABELS[g.type])))];

export default function IeltsListeningHub({ userId, onStart, onOpenDictation, onOpenDrill, onOpenAttempt, onBack, generatedApi, loadLibrary }: Props) {
  const [mode, setModeState] = useState<ListeningMode>(readMode);
  const setMode = (m: ListeningMode) => {
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
        <ArrowLeft className="h-4 w-4" /> IELTS
      </button>

      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Academic</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Listening</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Làm đề 4 part hoặc luyện từng part. Bài được chấm ngay, kèm loại lỗi và câu trong bài nghe chứa đáp án.
        </p>
      </header>

      <section aria-labelledby="listening-mode" className={`${panel} p-4 sm:p-5`}>
        <h2 id="listening-mode" className="text-sm font-semibold text-slate-900 dark:text-white">
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
        <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">{MODE_HINTS[mode]}</p>
      </section>

      <section aria-labelledby="listening-full">
        <h2 id="listening-full" className="text-title font-semibold text-slate-900 dark:text-white">
          Đề đầy đủ
        </h2>
        <ul className="mt-3 space-y-3">
          {LISTENING_FULL_TESTS.map((test) => (
            <li key={test.id} className={`${panel} p-4 sm:p-5`}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Headphones className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h3>
                  <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">{test.descriptionVi}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-caption text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> 40 câu, khoảng 30 phút
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={() => onStart(test.id, [], mode)} className={primaryBtn}>
                  Làm cả đề <ArrowRight className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-4 gap-2 sm:flex">
                  {test.sections.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onStart(test.id, [s.id], mode)}
                      className={`${secondaryBtn} px-3`}
                      title={s.title}
                    >
                      Part {s.part}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="listening-parts">
        <h2 id="listening-parts" className="text-title font-semibold text-slate-900 dark:text-white">
          Luyện theo part
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {LISTENING_PRACTICE_TESTS.map((test) => {
            const part = test.sections[0].part;
            return (
              <li key={test.id} className={`${panel} flex flex-col p-4`}>
                <p className="text-caption font-semibold text-slate-500 dark:text-slate-400">
                  Part {part} · {PART_DESCRIPTIONS_VI[part]}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h3>
                <p className="mt-0.5 flex-1 text-caption text-slate-500 dark:text-slate-400">{test.descriptionVi}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {questionTypes(test).map((t) => (
                    <span key={t} className={tag}>
                      {t}
                    </span>
                  ))}
                </div>
                <button type="button" onClick={() => onStart(test.id, [], mode)} className={`${secondaryBtn} mt-4 w-full`}>
                  Bắt đầu <ArrowRight className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <LibrarySection onStart={(testId, sectionIds) => onStart(testId, sectionIds, mode)} load={loadLibrary} />

      <GeneratedSections userId={userId} onStart={(testId) => onStart(testId, [], mode)} api={generatedApi} />

      <section aria-labelledby="listening-skills">
        <h2 id="listening-skills" className="text-title font-semibold text-slate-900 dark:text-white">
          Luyện kỹ năng
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { icon: Keyboard, title: 'Chép chính tả', text: 'Nghe từng câu trong đề, gõ lại và xem từ nào nghe sót.', onClick: onOpenDictation },
            { icon: Hash, title: 'Số, tên và ngày', text: 'Lượt 8 câu ngắn: đánh vần tên, số điện thoại, ngày tháng, giá tiền.', onClick: onOpenDrill },
          ].map(({ icon: Icon, title, text, onClick }) => (
            <li key={title}>
              <button
                type="button"
                onClick={onClick}
                className={`${panel} flex h-full w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60`}
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                  <span className="block text-caption text-slate-500 dark:text-slate-400">{text}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-start gap-2 text-caption text-slate-500 dark:text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Audio do AI đọc. Lần nghe đầu tiên của mỗi part có thể mất khoảng một phút để tạo, sau đó được lưu lại cho mọi người.
      </p>

      <IeltsAttemptHistory
        userId={userId}
        skill="listening"
        onOpenAttempt={onOpenAttempt}
        canOpen={(a) => isListeningDetails(a.details)}
      />
    </div>
  );
}
