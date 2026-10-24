import React, { useState, useMemo } from 'react';
import { IeltsAttempt, IeltsQuestion } from '../types';
import { getWritingQuestions } from '../services/ieltsWritingService';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { QuestionCard, FilterBar, FrameworkCard } from '../components/IeltsCommon';
import IeltsAttemptHistory from '../components/IeltsAttemptHistory';
import { PenTool, BookOpen, TrendingUp, Filter, Lightbulb, ChevronDown, ChevronUp, ChevronRight, LayoutList, FileText, Languages } from 'lucide-react';
import { WRITING_GUIDES } from '../data/ielts/writingGuides';
import { questionTopics } from '../services/writingStudyLogic';
import type { WritingStudyTab } from './IeltsWritingStudy';

const STUDY_LINKS: ReadonlyArray<{ tab: WritingStudyTab; title: string; subtitle: string; icon: React.ElementType }> = [
  { tab: 'guides', title: 'Cách viết từng dạng', subtitle: '7 dạng Task 1, 6 dạng Task 2', icon: LayoutList },
  { tab: 'samples', title: 'Bài mẫu band 6 · 7 · 8', subtitle: 'Cùng một đề, có chú thích', icon: FileText },
  { tab: 'language', title: 'Từ nối và collocation', subtitle: 'Theo chức năng và chủ đề', icon: Languages },
];

interface Props {
  userId: string;
  onOpenAttempt: (attempt: IeltsAttempt) => void;
  onSelectQuestion: (q: IeltsQuestion) => void;
  onOpenStudy: (tab: WritingStudyTab) => void;
}

export default function IeltsWritingHub({ userId, onSelectQuestion, onOpenAttempt, onOpenStudy }: Props) {
  const [activeTab, setActiveTab] = useState<'task_1' | 'task_2'>('task_1');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFrameworks, setShowFrameworks] = useState(false);

  const questions = useMemo(() => getWritingQuestions({
    taskOrPart: activeTab,
    essayType: filters.essayType || undefined,
    topic: filters.topic || undefined,
    difficulty: filters.difficulty || undefined,
  }), [activeTab, filters]);

  const writingFrameworks = ieltsFrameworks.filter(f => f.skill === 'writing');

  const topics = useMemo(() => questionTopics(getWritingQuestions({ taskOrPart: activeTab })), [activeTab]);

  const filterOptions = [
    {
      key: 'essayType',
      label: activeTab === 'task_2' ? 'Tất cả dạng bài' : 'Tất cả dạng biểu đồ',
      options: WRITING_GUIDES.filter((g) => g.task === activeTab).map((g) => ({ value: g.id, label: g.title })),
    },
    {
      key: 'topic',
      label: 'Tất cả chủ đề',
      options: topics.map((topic) => ({ value: topic, label: topic })),
    },
    {
      key: 'difficulty',
      label: 'Tất cả mức độ',
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' },
      ],
    },
  ];

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-tone-lavender-soft border border-tone-lavender-border rounded-full">
          <PenTool className="w-4 h-4 text-tone-lavender-fg" />
          <span className="text-sm font-bold text-tone-lavender-fg">IELTS Writing Assistant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
          Luyện viết IELTS Writing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Luyện đề IELTS Writing Task 1 Academic và Task 2 Essay, nhận feedback đánh giá chi tiết từ AI.
        </p>
      </div>

      {/* Tabs for Task 1 and Task 2 */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 max-w-md mx-auto">
        <button
          onClick={() => { setActiveTab('task_1'); setFilters({}); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
            ${activeTab === 'task_1'
              ? 'bg-white dark:bg-slate-700 text-tone-lavender-fg shadow-sm'
              : 'text-slate-500 hover:text-slate-850 dark:text-slate-450 dark:hover:text-slate-300'
            }`}
        >
          Task 1 (Academic Charts)
        </button>
        <button
          onClick={() => { setActiveTab('task_2'); setFilters({}); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
            ${activeTab === 'task_2'
              ? 'bg-white dark:bg-slate-700 text-tone-lavender-fg shadow-sm'
              : 'text-slate-500 hover:text-slate-850 dark:text-slate-450 dark:hover:text-slate-300'
            }`}
        >
          Task 2 (Academic Essay)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <BookOpen className="w-5 h-5 text-tone-lavender-fg mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">{questions.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Đề bài {activeTab === 'task_1' ? 'Task 1' : 'Task 2'}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <Lightbulb className="w-5 h-5 text-tone-lavender-fg mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">{writingFrameworks.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Frameworks</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <TrendingUp className="w-5 h-5 text-tone-mint-fg mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">4</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Tiêu chí chấm</p>
        </div>
      </div>

      {/* Study before writing */}
      <section aria-labelledby="writing-study-title" className="space-y-2">
        <h2 id="writing-study-title" className="text-sm font-bold text-slate-800 dark:text-white">Học trước khi viết</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {STUDY_LINKS.map(({ tab, title, subtitle, icon: Icon }) => (
            <li key={tab}>
              <button
                type="button"
                onClick={() => onOpenStudy(tab)}
                className="flex h-full min-h-touch w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-tone-lavender-fg" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                  <span className="block text-caption text-slate-500 dark:text-slate-400">{subtitle}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Practice history */}
      <IeltsAttemptHistory userId={userId} skill="writing" onOpenAttempt={onOpenAttempt} />

      {/* Framework Section */}
      <div className="bg-tone-lavender rounded-xl border border-tone-lavender-border overflow-hidden">
        <button
          onClick={() => setShowFrameworks(!showFrameworks)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-tone-lavender-soft transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-tone-lavender-fg" />
            <span className="text-sm font-bold text-tone-lavender-fg">
              Framework hướng dẫn viết
            </span>
          </div>
          {showFrameworks ? <ChevronUp className="w-4 h-4 text-tone-lavender-fg" /> : <ChevronDown className="w-4 h-4 text-tone-lavender-fg" />}
        </button>
        {showFrameworks && (
          <div className="px-4 pb-4 space-y-2">
            {writingFrameworks.map(fw => (
              <FrameworkCard key={fw.id} framework={fw} />
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <FilterBar
          filters={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          filterOptions={filterOptions}
        />
      </div>

      {/* Questions Grid */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-tone-lavender-accent mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Không tìm thấy đề bài phù hợp. Hãy thử đổi bộ lọc.</p>
          </div>
        ) : (
          questions.map(q => (
            <QuestionCard key={q.id} question={q} onSelect={onSelectQuestion} />
          ))
        )}
      </div>
    </div>
  );
}
