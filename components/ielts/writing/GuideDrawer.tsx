/**
 * The guide for the current question type, in a side panel over the editor
 * (full screen on phones). The draft underneath stays as it is.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import type { WritingGuide } from '../../../data/ielts/writingGuides';
import { guideLesson } from '../../../data/ielts/library';
import LessonSections from '../LessonSections';

interface Props {
  guide: WritingGuide;
  onClose: () => void;
}

export default function GuideDrawer({ guide, onClose }: Props) {
  const lesson = useMemo(() => guideLesson(guide), [guide]);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="guide-drawer-title">
      <button type="button" aria-label="Đóng hướng dẫn" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-slate-900/30 dark:bg-black/50" />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl dark:bg-slate-900">
        <header className="flex items-start gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Hướng dẫn dạng bài</p>
            <h2 id="guide-drawer-title" className="mt-0.5 text-title font-bold text-slate-900 dark:text-white">
              {guide.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-10">
          <LessonSections sections={lesson.sections} />
        </div>
      </aside>
    </div>
  );
}
