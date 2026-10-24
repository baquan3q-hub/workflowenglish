import React, { useState, useEffect, useRef } from 'react';
import { IeltsAiFeedback, IeltsCriterionScore, IeltsFramework, IeltsQuestion, IeltsSentenceCorrection } from '../types';
import { Star, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, ArrowRight, Clock, BookOpen, Target, Mic, Square, Volume2, Lightbulb, TrendingUp, X, Check, ChevronRight } from 'lucide-react';
import { descriptorBand, findDescriptor, type DescriptorSkill } from '../data/ielts/bandDescriptors';

// ─── Band Score Display ──────────────────────────────────────────

export function BandScoreDisplay({ score, targetBand, label }: { score: number; targetBand?: string; label?: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 7.0) return 'bg-tone-mint-soft text-tone-mint-fg';
    if (s >= 6.0) return 'bg-tone-sky-soft text-tone-sky-fg';
    if (s >= 5.0) return 'bg-tone-butter-soft text-tone-butter-fg';
    return 'bg-tone-blush-soft text-tone-blush-fg';
  };

  const getScoreRing = (s: number) => {
    if (s >= 7.0) return 'ring-tone-mint-accent';
    if (s >= 6.0) return 'ring-tone-sky-accent';
    if (s >= 5.0) return 'ring-tone-butter-accent';
    return 'ring-tone-blush-accent';
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>}
      <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full ${getScoreColor(score)} ring-4 ${getScoreRing(score)} flex items-center justify-center shadow-sm`}>
        <span className="text-2xl sm:text-3xl font-black tabular-nums">{score.toFixed(1)}</span>
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

export function CriterionScoreBar({ criterion, skill }: { criterion: IeltsCriterionScore; skill?: DescriptorSkill }) {
  const descriptor = skill ? findDescriptor(skill, criterion.name) : undefined;
  const band = descriptorBand(criterion.score);
  const percentage = Math.min(100, (criterion.score / 9) * 100);
  const getBarColor = (s: number) => {
    if (s >= 7.0) return 'bg-tone-mint-accent';
    if (s >= 6.0) return 'bg-tone-sky-accent';
    if (s >= 5.0) return 'bg-tone-butter-accent';
    return 'bg-tone-blush-accent';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{criterion.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({criterion.nameVi})</span>
        </div>
        <span className={`text-sm font-bold ${criterion.score >= 6 ? 'text-tone-sky-fg' : 'text-tone-butter-fg'}`}>
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
      {descriptor && criterion.score < 9 && (
        <p className="flex gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <span>
            <span className="font-semibold">Để lên band {band + 1}:</span>{' '}
            {descriptor.toNext[band]}
          </span>
        </p>
      )}
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
        className="group w-full px-4 py-3 flex items-center justify-between text-left hover:bg-tone-lavender transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-tone-lavender-soft text-tone-lavender-fg flex items-center justify-center flex-shrink-0">
            <Lightbulb className="icon-pop w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{framework.name}</h4>
            {!isCompact && <p className="text-xs text-slate-500 dark:text-slate-400">{framework.nameVi}</p>}
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{framework.description}</p>

          <div className="space-y-2">
            {framework.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-tone-periwinkle-soft text-tone-periwinkle-fg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
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
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Ví dụ</p>
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
    if (d === 'easy') return 'bg-tone-mint-soft text-tone-mint-fg';
    if (d === 'medium') return 'bg-tone-butter-soft text-tone-butter-fg';
    return 'bg-tone-blush-soft text-tone-blush-fg';
  };

  const getTypeColor = (t: string) => {
    const colors: Record<string, string> = {
      opinion: 'bg-tone-sky-soft text-tone-sky-fg',
      discussion: 'bg-tone-lavender-soft text-tone-lavender-fg',
      problem_solution: 'bg-tone-peach-soft text-tone-peach-fg',
      advantages_disadvantages: 'bg-tone-aqua-soft text-tone-aqua-fg',
      two_part: 'bg-tone-blush-soft text-tone-blush-fg',
      cause_effect: 'bg-tone-periwinkle-soft text-tone-periwinkle-fg',
      personal: 'bg-tone-sky-soft text-tone-sky-fg',
    };
    return colors[t] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:border-tone-sky-border transition-all duration-200 group">
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
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tone-lavender-soft text-tone-lavender-fg">
            {question.popularity.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed mb-3 font-medium">{question.prompt}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Band {question.targetBand}</span>
        </div>
        <button
          onClick={() => onSelect(question)}
          className="press flex items-center gap-1.5 px-3 py-1.5 border border-tone-periwinkle-border bg-tone-periwinkle-soft text-tone-periwinkle-fg hover:bg-tone-periwinkle-border rounded-lg text-xs font-bold transition-all"
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
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-tone-sky-accent focus:border-transparent outline-none"
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
      ${isUrgent ? 'bg-tone-blush-soft text-tone-blush-fg animate-pulse' :
        isWarning ? 'bg-tone-butter-soft text-tone-butter-fg' :
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
            ? 'bg-tone-blush-soft text-tone-blush-fg border-2 border-tone-blush-border hover:bg-tone-blush-border scale-110'
            : 'bg-tone-peach-soft text-tone-peach-fg border-2 border-tone-peach-border hover:bg-tone-peach-border hover:scale-105'
          }`}
      >
        {isRecording ? (
          <>
            <Square className="w-8 h-8" />
            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-full bg-tone-blush-soft animate-ping" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-tone-blush-border animate-pulse" />
          </>
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-tone-blush-accent animate-pulse" />
          <span className="text-sm font-bold text-tone-blush-fg tabular-nums">
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
        <AlertTriangle className="w-4 h-4 text-tone-butter-fg" />
        Sửa lỗi câu ({corrections.length})
      </h4>
      {corrections.map((c, i) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="flex items-start gap-2">
            <X aria-hidden="true" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-tone-blush-fg" />
            <p className="text-xs text-tone-blush-fg line-through leading-relaxed">{c.original}</p>
          </div>
          <div className="flex items-start gap-2">
            <Check aria-hidden="true" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-tone-mint-fg" />
            <p className="text-xs text-tone-mint-fg font-medium leading-relaxed">{c.corrected}</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 italic">{c.explanation}</p>
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
      <h4 className={`text-sm font-bold flex items-center gap-2 ${isStrength ? 'text-tone-mint-fg' : 'text-tone-butter-fg'}`}>
        {isStrength ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {isStrength ? 'Điểm mạnh' : 'Cần cải thiện'}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className={`mt-0.5 flex-shrink-0 ${isStrength ? 'text-tone-mint-fg' : 'text-tone-butter-fg'}`}>
              {isStrength ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
        <TrendingUp className="w-4 h-4 text-tone-sky-fg" />
        Bước tiếp theo để nâng band
      </h4>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <div key={i} className="flex items-start gap-2.5 bg-tone-sky rounded-lg px-3 py-2 border border-tone-sky-border">
            <div className="w-5 h-5 rounded-full bg-tone-sky-soft text-tone-sky-fg flex items-center justify-center flex-shrink-0 text-xs font-bold">
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
      ${isEnough ? 'text-tone-mint-fg' : 'text-tone-butter-fg'}`}
    >
      <BookOpen className="w-3.5 h-3.5" />
      <span>{count} / {minimum} từ</span>
      {isEnough && <CheckCircle2 className="w-3 h-3" />}
    </div>
  );
}
