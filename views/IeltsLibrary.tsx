import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Clock, Search, X } from 'lucide-react';
import {
  LIBRARY_LESSONS,
  LIBRARY_SKILL_LABELS,
  findLesson,
  searchLessons,
  type LibraryLesson,
  type LibrarySkill,
} from '../data/ielts/library';
import { EmptyState } from '../components/ui/States';
import LessonSections from '../components/ielts/LessonSections';

interface Props {
  initialLessonId?: string;
  onBack: () => void;
  backLabel?: string;
}

const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800';
const chipBase = 'inline-flex min-h-touch flex-shrink-0 items-center rounded-xl border px-3 text-sm font-medium transition-colors';
const chipOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

const TABS: ReadonlyArray<LibrarySkill | 'all'> = ['all', 'general', 'listening', 'writing', 'speaking'];

const LessonView: React.FC<{ lesson: LibraryLesson; onClose: () => void }> = ({ lesson, onClose }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [lesson.id]);

  return (
    <article className="mx-auto max-w-2xl space-y-5 anim-fade-up" aria-labelledby="lesson-title">
      <button type="button" onClick={onClose} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> Thư viện
      </button>
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          {LIBRARY_SKILL_LABELS[lesson.skill]} · {lesson.minutes} phút đọc
        </p>
        <h1 id="lesson-title" ref={headingRef} tabIndex={-1} className="mt-1 text-heading font-bold text-slate-900 outline-none dark:text-white">
          {lesson.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{lesson.summary}</p>
      </header>

      <LessonSections sections={lesson.sections} />
    </article>
  );
};

export default function IeltsLibrary({ initialLessonId, onBack, backLabel = 'IELTS' }: Props) {
  const [tab, setTab] = useState<LibrarySkill | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | undefined>(initialLessonId);

  useEffect(() => setOpenId(initialLessonId), [initialLessonId]);

  const lessons = useMemo(() => searchLessons(LIBRARY_LESSONS, tab, query), [tab, query]);
  const open = openId ? findLesson(openId) : undefined;

  if (open) return <LessonView lesson={open} onClose={() => setOpenId(undefined)} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </button>
      <header>
        <h1 className="text-heading font-bold text-slate-900 dark:text-white">Thư viện IELTS</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Bài học ngắn về cấu trúc đề, tiêu chí chấm và cách làm từng dạng.</p>
      </header>

      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài học, ví dụ: overview, bẫy, phát âm"
          aria-label="Tìm bài học"
          className="min-h-touch w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Xoá tìm kiếm"
            className="absolute right-1 top-1/2 inline-flex min-h-touch min-w-touch -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Kỹ năng" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`${chipBase} ${tab === t ? chipOn : chipOff}`}
          >
            {t === 'all' ? 'Tất cả' : LIBRARY_SKILL_LABELS[t]}
          </button>
        ))}
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Không có bài học phù hợp"
          description="Thử từ khoá khác hoặc chọn Tất cả."
        />
      ) : (
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setOpenId(l.id)}
                className={`${panel} flex w-full items-center gap-3 p-4 text-left hover:border-slate-300 dark:hover:border-slate-700`}
              >
                <span className="flex-1">
                  <span className="block text-caption font-medium text-slate-500 dark:text-slate-400">{LIBRARY_SKILL_LABELS[l.skill]}</span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-900 dark:text-white">{l.title}</span>
                  <span className="mt-0.5 block text-caption text-slate-500 dark:text-slate-400">{l.summary}</span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-1 text-caption tabular-nums text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> {l.minutes}′
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
