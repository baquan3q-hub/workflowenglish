import React, { useState, useMemo } from 'react';
import { IeltsQuestion } from '../types';
import { getWritingQuestions } from '../services/ieltsWritingService';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { QuestionCard, FilterBar, FrameworkCard } from '../components/IeltsCommon';
import { PenTool, BookOpen, TrendingUp, Filter, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onSelectQuestion: (q: IeltsQuestion) => void;
}

export default function IeltsWritingHub({ onSelectQuestion }: Props) {
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

  const filterOptions = activeTab === 'task_2' ? [
    {
      key: 'essayType',
      label: 'Tất cả dạng bài',
      options: [
        { value: 'opinion', label: 'Opinion (Agree/Disagree)' },
        { value: 'discussion', label: 'Discussion (Both views)' },
        { value: 'problem_solution', label: 'Problem & Solution' },
        { value: 'advantages_disadvantages', label: 'Advantages & Disadvantages' },
        { value: 'two_part', label: 'Two-part Question' },
      ],
    },
    {
      key: 'topic',
      label: 'Tất cả chủ đề',
      options: [
        { value: 'Education', label: 'Education' },
        { value: 'Technology', label: 'Technology' },
        { value: 'Environment', label: 'Environment' },
        { value: 'Health', label: 'Health' },
        { value: 'Work', label: 'Work' },
      ],
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
  ] : [
    {
      key: 'essayType',
      label: 'Tất cả dạng biểu đồ',
      options: [
        { value: 'line_graph', label: 'Line Graph (Đường)' },
        { value: 'bar_chart', label: 'Bar Chart (Cột)' },
        { value: 'pie_chart', label: 'Pie Chart (Tròn)' },
        { value: 'table', label: 'Table (Bảng số liệu)' },
        { value: 'map', label: 'Map (Bản đồ)' },
      ],
    },
    {
      key: 'topic',
      label: 'Tất cả chủ đề',
      options: [
        { value: 'Tourism', label: 'Tourism' },
        { value: 'Environment', label: 'Environment' },
        { value: 'Society', label: 'Society' },
        { value: 'Technology', label: 'Technology' },
      ],
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full">
          <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">IELTS Writing Assistant</span>
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
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-850 dark:text-slate-450 dark:hover:text-slate-300'
            }`}
        >
          Task 1 (Academic Charts)
        </button>
        <button
          onClick={() => { setActiveTab('task_2'); setFilters({}); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
            ${activeTab === 'task_2'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-850 dark:text-slate-450 dark:hover:text-slate-300'
            }`}
        >
          Task 2 (Academic Essay)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">{questions.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Đề bài {activeTab === 'task_1' ? 'Task 1' : 'Task 2'}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <Lightbulb className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">{writingFrameworks.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Frameworks</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">4</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Tiêu chí chấm</p>
        </div>
      </div>

      {/* Framework Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800/40 overflow-hidden">
        <button
          onClick={() => setShowFrameworks(!showFrameworks)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              📚 Framework hướng dẫn viết
            </span>
          </div>
          {showFrameworks ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
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
        <Filter className="w-4 h-4 text-slate-400" />
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
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
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
