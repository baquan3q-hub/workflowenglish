import React, { useState, useEffect, useRef } from 'react';
import { IeltsAiFeedback, IeltsCriterionScore, IeltsFramework, IeltsQuestion, IeltsSentenceCorrection } from '../types';
import { Star, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, ArrowRight, Clock, BookOpen, Target, Mic, Square, Volume2, Lightbulb, TrendingUp } from 'lucide-react';

// ─── Band Score Display ──────────────────────────────────────────

export function BandScoreDisplay({ score, targetBand, label }: { score: number; targetBand?: string; label?: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 7.0) return 'from-emerald-400 to-green-500';
    if (s >= 6.0) return 'from-blue-400 to-indigo-500';
    if (s >= 5.0) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  const getScoreRing = (s: number) => {
    if (s >= 7.0) return 'ring-emerald-400/30';
    if (s >= 6.0) return 'ring-blue-400/30';
    if (s >= 5.0) return 'ring-amber-400/30';
    return 'ring-red-400/30';
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>}
      <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${getScoreColor(score)} ring-4 ${getScoreRing(score)} flex items-center justify-center shadow-lg`}>
        <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">{score.toFixed(1)}</span>
      </div>
      {targetBand && (
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Target className="w-3 h-3" />
          <span>Target: {targetBand}</span>
        </div>
      )}
    </div>
  );
}

// ─── Criterion Score Bar ──────────────────────────────────────────

export function CriterionScoreBar({ criterion }: { criterion: IeltsCriterionScore }) {
  const percentage = Math.min(100, (criterion.score / 9) * 100);
  const getBarColor = (s: number) => {
    if (s >= 7.0) return 'bg-emerald-500';
    if (s >= 6.0) return 'bg-blue-500';
    if (s >= 5.0) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{criterion.name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">({criterion.nameVi})</span>
        </div>
        <span className={`text-sm font-bold ${criterion.score >= 6 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {criterion.score.toFixed(1)}
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(criterion.score)} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{criterion.comment}</p>
    </div>
  );
}

// ─── Framework Card ──────────────────────────────────────────

export function FrameworkCard({ framework, isCompact }: { framework: IeltsFramework; isCompact?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{framework.name}</h4>
            {!isCompact && <p className="text-xs text-slate-500 dark:text-slate-400">{framework.nameVi}</p>}
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{framework.description}</p>

          <div className="space-y-2">
            {framework.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{step.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">— {step.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {framework.sample && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">📝 Ví dụ</p>
              <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{framework.sample}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Question Card ──────────────────────────────────────────

export function QuestionCard({
  question,
  onSelect,
  showSample,
}: {
  question: IeltsQuestion;
  onSelect: (q: IeltsQuestion) => void;
  showSample?: boolean;
}) {
  const getDifficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
    if (d === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  };

  const getTypeColor = (t: string) => {
    const colors: Record<string, string> = {
      opinion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
      discussion: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
      problem_solution: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
      advantages_disadvantages: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
      two_part: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
      cause_effect: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
      personal: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
    };
    return colors[t] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group">
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getDifficultyColor(question.difficulty)}`}>
          {question.difficulty}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTypeColor(question.questionType)}`}>
          {question.questionType.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {question.topic}
        </span>
        {question.popularity && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
            {question.popularity.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed mb-3 font-medium">{question.prompt}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Band {question.targetBand}</span>
        </div>
        <button
          onClick={() => onSelect(question)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm group-hover:shadow-md transition-all"
        >
          Bắt đầu <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Filter Bar ──────────────────────────────────────────

export function FilterBar({
  filters,
  onChange,
  filterOptions,
}: {
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
  filterOptions: { key: string; label: string; options: { value: string; label: string }[] }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filterOptions.map((f) => (
        <select
          key={f.key}
          value={filters[f.key] || ''}
          onChange={(e) => onChange(f.key, e.target.value)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

// ─── Writing Timer ──────────────────────────────────────────

export function WritingTimer({ startTime, limitMinutes }: { startTime: number; limitMinutes: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const totalSeconds = limitMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining < 300 && remaining > 0; // < 5 min
  const isUrgent = remaining < 60; // < 1 min

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors
      ${isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse' :
        isWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</span>
    </div>
  );
}

// ─── Audio Recorder Button ──────────────────────────────────────────

export function AudioRecorderButton({
  isRecording,
  duration,
  onStartRecording,
  onStopRecording,
}: {
  isRecording: boolean;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={isRecording ? onStopRecording : onStartRecording}
        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
          ${isRecording
            ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 scale-110'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105'
          }`}
      >
        {isRecording ? (
          <>
            <Square className="w-8 h-8 text-white" />
            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-red-400/40 animate-pulse" />
          </>
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
      )}

      <span className="text-xs text-slate-500 dark:text-slate-400">
        {isRecording ? 'Nhấn để dừng ghi âm' : 'Nhấn để bắt đầu ghi âm'}
      </span>
    </div>
  );
}

// ─── Sentence Correction Display ──────────────────────────────────────────

export function SentenceCorrectionList({ corrections }: { corrections: IeltsSentenceCorrection[] }) {
  if (!corrections.length) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Sửa lỗi câu ({corrections.length})
      </h4>
      {corrections.map((c, i) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-xs mt-0.5">✗</span>
            <p className="text-xs text-red-600 dark:text-red-400 line-through leading-relaxed">{c.original}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 text-xs mt-0.5">✓</span>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium leading-relaxed">{c.corrected}</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 italic">💡 {c.explanation}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Feedback Section (Strengths/Weaknesses) ──────────────────────────────

export function FeedbackList({
  items,
  type,
}: {
  items: string[];
  type: 'strength' | 'weakness';
}) {
  const isStrength = type === 'strength';

  return (
    <div className="space-y-2">
      <h4 className={`text-sm font-bold flex items-center gap-2 ${isStrength ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
        {isStrength ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {isStrength ? 'Điểm mạnh' : 'Cần cải thiện'}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className={`mt-0.5 flex-shrink-0 ${isStrength ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isStrength ? '✓' : '▸'}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Next Actions ──────────────────────────────────────────

export function NextActionsList({ actions }: { actions: string[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        Bước tiếp theo để nâng band
      </h4>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <div key={i} className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-800/40">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              {i + 1}
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Word Count Display ──────────────────────────────────────────

export function WordCountDisplay({ text, minimum }: { text: string; minimum: number }) {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isEnough = count >= minimum;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors
      ${isEnough ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
    >
      <BookOpen className="w-3.5 h-3.5" />
      <span>{count} / {minimum} từ</span>
      {isEnough && <CheckCircle2 className="w-3 h-3" />}
    </div>
  );
}
