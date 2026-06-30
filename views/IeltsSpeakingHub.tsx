import React, { useState, useMemo } from 'react';
import { IeltsQuestion } from '../types';
import { getSpeakingQuestions, getRandomSpeakingQuestion } from '../data/ieltsSpeakingQuestions';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { QuestionCard, FilterBar, FrameworkCard } from '../components/IeltsCommon';
import { Mic, BookOpen, TrendingUp, Filter, Lightbulb, ChevronDown, ChevronUp, Shuffle, Star } from 'lucide-react';

interface Props {
  onSelectQuestion: (q: IeltsQuestion) => void;
  onStartMockTest: () => void;
}

export default function IeltsSpeakingHub({ onSelectQuestion, onStartMockTest }: Props) {
  const [activeTab, setActiveTab] = useState<'part_1' | 'part_2' | 'part_3'>('part_1');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFrameworks, setShowFrameworks] = useState(false);

  const questions = useMemo(() => getSpeakingQuestions({
    part: activeTab,
    topic: filters.topic || undefined,
    difficulty: filters.difficulty || undefined,
  }), [activeTab, filters]);

  const speakingFrameworks = ieltsFrameworks.filter(f => f.skill === 'speaking');

  const filterOptions = [
    {
      key: 'topic',
      label: 'Tất cả chủ đề',
      options: [
        { value: 'Study', label: 'Study' },
        { value: 'Technology', label: 'Technology' },
        { value: 'Hometown', label: 'Hometown' },
        { value: 'Food', label: 'Food' },
        { value: 'Hobbies', label: 'Hobbies' },
        { value: 'Travel', label: 'Travel & Hobbies' },
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

  const handleRandom = () => {
    const matching = getSpeakingQuestions({ part: activeTab });
    if (matching.length > 0) {
      const idx = Math.floor(Math.random() * matching.length);
      onSelectQuestion(matching[idx]);
    }
  };

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30 rounded-full">
          <Mic className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-bold text-rose-700 dark:text-rose-300">IELTS Speaking Assistant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
          Luyện nói IELTS Speaking
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Luyện từng part riêng lẻ hoặc thi thử liên tiếp cả 3 phần thi với bảng nháp và đếm giờ như thi thật.
        </p>
      </div>

      {/* Mock Test Banner */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-current" /> Mock Test
          </div>
          <h3 className="text-lg sm:text-xl font-black">Luyện thi thử IELTS Full 3 Parts</h3>
          <p className="text-xs text-white/80 max-w-md">
            Trải nghiệm trọn vẹn phòng thi IELTS: Trả lời Part 1 quen thuộc, chuẩn bị 1 phút nói 2 phút cho Part 2 và thảo luận sâu ở Part 3.
          </p>
        </div>
        <button
          onClick={onStartMockTest}
          className="px-6 py-3 bg-white text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-black shadow-lg transform active:scale-95 transition-all w-full sm:w-auto"
        >
          Bắt đầu Thi thử
        </button>
      </div>

      {/* Part tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 max-w-lg mx-auto">
        {(['part_1', 'part_2', 'part_3'] as const).map(part => {
          const labels = {
            part_1: 'Part 1 (Phỏng vấn)',
            part_2: 'Part 2 (Cue Card)',
            part_3: 'Part 3 (Thảo luận)'
          };
          return (
            <button
              key={part}
              onClick={() => { setActiveTab(part); setFilters({}); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
                ${activeTab === part
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-450 shadow-sm'
                  : 'text-slate-500 hover:text-slate-850 dark:text-slate-450 dark:hover:text-slate-300'
                }`}
            >
              {labels[part]}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <BookOpen className="w-5 h-5 text-rose-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">{questions.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Đề bài {activeTab.replace('_', ' ')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
          <Lightbulb className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-800 dark:text-white">{speakingFrameworks.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Frameworks</p>
        </div>
        <button
          onClick={handleRandom}
          className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center justify-center gap-0.5"
        >
          <Shuffle className="w-5 h-5 text-emerald-500 mx-auto" />
          <p className="text-[10px] text-slate-550 dark:text-slate-400 font-bold mt-1">Câu ngẫu nhiên</p>
        </button>
      </div>

      {/* Framework Section */}
      <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 rounded-xl border border-rose-200 dark:border-rose-800/40 overflow-hidden">
        <button
          onClick={() => setShowFrameworks(!showFrameworks)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
              🎯 Framework hướng dẫn nói
            </span>
          </div>
          {showFrameworks ? <ChevronUp className="w-4 h-4 text-rose-400" /> : <ChevronDown className="w-4 h-4 text-rose-400" />}
        </button>
        {showFrameworks && (
          <div className="px-4 pb-4 space-y-2">
            {speakingFrameworks.map(fw => (
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

      {/* Questions */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <Mic className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Không tìm thấy câu hỏi phù hợp. Hãy thử đổi bộ lọc.</p>
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
