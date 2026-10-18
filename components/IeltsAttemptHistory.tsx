import React, { useEffect, useState } from 'react';
import { IeltsAttempt, IeltsSkill } from '../types';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { History, ChevronDown, ChevronUp, Loader2, TrendingUp, TrendingDown, Award, ArrowRight } from 'lucide-react';

const PART_LABELS: Record<string, string> = {
  task_1: 'Task 1',
  task_2: 'Task 2',
  part_1: 'Part 1',
  part_2: 'Part 2',
  part_3: 'Part 3',
  part_4: 'Part 4',
  full_test: 'Cả đề',
  mock: 'Thi thử',
};

const COLLAPSED_COUNT = 5;

function bandColor(band?: number) {
  if (band == null) return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
  if (band >= 7.0) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (band >= 6.0) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
  if (band >= 5.0) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  userId: string;
  skill: IeltsSkill;
  onOpenAttempt: (attempt: IeltsAttempt) => void;
  /** Which rows reopen; by default those with saved AI feedback. */
  canOpen?: (attempt: IeltsAttempt) => boolean;
}

const hasFeedback = (a: IeltsAttempt) => !!a.aiFeedback;

/**
 * Collapsible "Lịch sử luyện tập" panel for the IELTS hubs: summary stats
 * (attempts, average / best band, recent trend) plus a list of past
 * attempts that reopen their saved AI feedback.
 */
export default function IeltsAttemptHistory({ userId, skill, onOpenAttempt, canOpen = hasFeedback }: Props) {
  const [attempts, setAttempts] = useState<IeltsAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setAttempts(null);
    setError(null);
    getIeltsAttempts(userId, skill)
      .then(rows => { if (!cancelled) setAttempts(rows); })
      .catch(err => {
        console.warn('[IELTS History] load failed:', err);
        if (!cancelled) setError('Không tải được lịch sử luyện tập.');
      });
    return () => { cancelled = true; };
  }, [userId, skill]);

  const graded = (attempts || []).filter(a => a.estimatedBand != null);
  const bands = graded.map(a => a.estimatedBand as number);
  const average = bands.length ? bands.reduce((s, b) => s + b, 0) / bands.length : null;
  const best = bands.length ? Math.max(...bands) : null;
  // Newest-first list: compare the latest attempt with the oldest loaded one.
  const trend = bands.length >= 2 ? bands[0] - bands[bands.length - 1] : null;

  const visible = showAll ? attempts || [] : (attempts || []).slice(0, COLLAPSED_COUNT);
  const accent =
    skill === 'writing'
      ? 'text-blue-600 dark:text-blue-400'
      : skill === 'speaking'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className={`w-4 h-4 ${accent}`} />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Lịch sử luyện tập</span>
          {attempts && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {attempts.length} bài
            </span>
          )}
          {average != null && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bandColor(average)}`}>
              TB {average.toFixed(1)}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {!attempts && !error && (
            <div className="flex items-center justify-center py-6 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {error && <p className="text-xs text-red-500 py-2">{error}</p>}

          {attempts && attempts.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              Bạn chưa có bài luyện tập nào. Chọn một đề bên dưới để bắt đầu nhé!
            </p>
          )}

          {attempts && attempts.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 text-center">
                  <p className="text-base font-black text-slate-800 dark:text-white">{average != null ? average.toFixed(1) : '–'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Band trung bình</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 text-center">
                  <p className="text-base font-black text-slate-800 dark:text-white flex items-center justify-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {best != null ? best.toFixed(1) : '–'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Cao nhất</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 text-center">
                  <p className={`text-base font-black flex items-center justify-center gap-1 ${
                    trend == null || trend === 0 ? 'text-slate-800 dark:text-white' : trend > 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {trend != null && trend > 0 && <TrendingUp className="w-3.5 h-3.5" />}
                    {trend != null && trend < 0 && <TrendingDown className="w-3.5 h-3.5" />}
                    {trend == null ? '–' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}`}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Xu hướng</p>
                </div>
              </div>

              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {visible.map(a => (
                  <li key={a.id}>
                    <button
                      onClick={() => canOpen(a) && onOpenAttempt(a)}
                      disabled={!canOpen(a)}
                      className="w-full flex items-center gap-3 py-2.5 text-left group disabled:cursor-default"
                    >
                      <span className={`shrink-0 w-11 text-center text-sm font-black rounded-lg py-1 ${bandColor(a.estimatedBand)}`}>
                        {a.estimatedBand != null ? a.estimatedBand.toFixed(1) : '–'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>{PART_LABELS[a.taskOrPart] || a.taskOrPart}</span>
                          {a.topic && <span>· {a.topic}</span>}
                          {(a.attemptNumber ?? 1) > 1 && <span>· Lần {a.attemptNumber}</span>}
                          <span className="ml-auto">{formatDate(a.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{a.questionPrompt}</p>
                      </div>
                      {canOpen(a) && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              {attempts.length > COLLAPSED_COUNT && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`w-full text-xs font-bold py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 ${accent}`}
                >
                  {showAll ? 'Thu gọn' : `Xem tất cả (${attempts.length})`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
