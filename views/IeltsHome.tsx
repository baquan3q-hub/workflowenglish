import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Headphones, Library, Mic, PenTool, Target } from 'lucide-react';
import { AppPhase, type IeltsAttempt, type IeltsSkill } from '../types';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { bandGap, daysUntil, overallBand, skillProgress, type SkillProgress } from '../services/ieltsProgressLogic';
import { getPreferences, IELTS_TARGET_BANDS, setPreferences } from '../services/preferencesService';
import { LIBRARY_LESSONS } from '../data/ielts/library';
import { Skeleton } from '../components/ui/States';

interface Props {
  userId: string;
  onOpenPhase: (phase: AppPhase) => void;
  onOpenLibrary: (lessonId?: string) => void;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const field =
  'min-h-touch w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white';

interface SkillDef {
  skill: IeltsSkill;
  title: string;
  hint: string;
  icon: React.FC<{ className?: string }>;
  phase?: AppPhase;
}

const SKILLS: readonly SkillDef[] = [
  { skill: 'listening', title: 'Listening', hint: '4 part, 40 câu, chấm tự động', icon: Headphones },
  { skill: 'writing', title: 'Writing', hint: 'Task 1, Task 2, AI chấm 4 tiêu chí', icon: PenTool, phase: AppPhase.IELTS_WRITING_HUB },
  { skill: 'speaking', title: 'Speaking', hint: 'Part 1, 2, 3 và thi thử', icon: Mic, phase: AppPhase.IELTS_SPEAKING_HUB },
];

const fmtBand = (b: number | null) => (b == null ? '–' : b.toFixed(1));

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SkillCard: React.FC<{ def: SkillDef; progress: SkillProgress | null; loading: boolean; onOpen: () => void }> = ({
  def,
  progress,
  loading,
  onOpen,
}) => {
  const Icon = def.icon;
  const available = !!def.phase;
  return (
    <li className={`${panel} flex flex-col p-4`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-5 w-5" />
        </span>
        <div className="text-right">
          {loading ? (
            <Skeleton className="ml-auto h-6 w-10" />
          ) : (
            <p className="text-title font-bold tabular-nums text-slate-900 dark:text-white">{fmtBand(progress?.current ?? null)}</p>
          )}
          <p className="text-caption text-slate-500 dark:text-slate-400">
            {available ? `${progress?.attempts ?? 0} bài đã làm` : 'Sắp ra mắt'}
          </p>
        </div>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{def.title}</h3>
      <p className="mt-0.5 flex-1 text-caption text-slate-500 dark:text-slate-400">{def.hint}</p>
      <button type="button" onClick={onOpen} disabled={!available} className={`${secondaryBtn} mt-4 w-full`}>
        {available ? (progress?.attempts ? 'Luyện tiếp' : 'Bắt đầu') : 'Đang xây dựng'}
        {available && <ArrowRight className="h-4 w-4" />}
      </button>
    </li>
  );
};

export default function IeltsHome({ userId, onOpenPhase, onOpenLibrary }: Props) {
  const [attempts, setAttempts] = useState<IeltsAttempt[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [prefs, setPrefs] = useState(() => getPreferences(userId));

  const load = useCallback(async () => {
    if (!userId) {
      setAttempts([]);
      return;
    }
    setLoadFailed(false);
    try {
      const lists = await Promise.all((['writing', 'speaking'] as const).map((s) => getIeltsAttempts(userId, s, 10)));
      setAttempts(lists.flat());
    } catch (err) {
      console.warn('[IELTS Home] attempts failed:', err);
      setLoadFailed(true);
      setAttempts([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = useMemo(
    () => (attempts ? Object.fromEntries(SKILLS.map((d) => [d.skill, skillProgress(d.skill, attempts)])) : null) as Record<
      IeltsSkill,
      SkillProgress
    > | null,
    [attempts],
  );

  const skillBands = progress ? SKILLS.map((d) => progress[d.skill].current).filter((b): b is number => b != null) : [];
  const overall = overallBand(skillBands);
  const gap = bandGap(overall, prefs.ieltsTargetBand);
  const days = daysUntil(prefs.ieltsExamDate, new Date());

  const updateGoal = (patch: Parameters<typeof setPreferences>[1]) => setPrefs(setPreferences(userId, patch));

  return (
    <div className="mx-auto max-w-3xl space-y-6 anim-fade-up">
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Academic</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Lộ trình IELTS của bạn</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Học trong Thư viện, luyện đề, xem phản hồi rồi làm lại để lên band.</p>
      </header>

      <section aria-labelledby="ielts-goal" className={`${panel} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="ielts-goal" className="text-caption font-medium text-slate-500 dark:text-slate-400">
              Band ước tính
            </h2>
            {attempts === null ? (
              <Skeleton className="mt-2 h-9 w-16" />
            ) : (
              <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums text-slate-900 dark:text-white">{fmtBand(overall)}</p>
            )}
            <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">
              {skillBands.length === 0
                ? 'Làm một bài Writing hoặc Speaking để có band ước tính.'
                : `Ước tính từ ${skillBands.length} kỹ năng đã luyện, mỗi kỹ năng lấy 3 bài gần nhất.`}
            </p>
          </div>
          <div className="text-right">
            {gap != null && (
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {gap === 0 ? 'Đã đạt mục tiêu' : `Còn ${gap.toFixed(1)} band tới mục tiêu`}
              </p>
            )}
            {days != null && (
              <p className="text-caption text-slate-500 dark:text-slate-400">
                {days > 0 ? `${days} ngày nữa tới kỳ thi` : days === 0 ? 'Hôm nay là ngày thi' : 'Ngày thi đã qua'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-center gap-1.5 text-caption font-medium text-slate-600 dark:text-slate-300">
              <Target className="h-3.5 w-3.5" /> Band mục tiêu
            </span>
            <select
              className={`${field} mt-1`}
              value={prefs.ieltsTargetBand ?? ''}
              onChange={(e) => updateGoal({ ieltsTargetBand: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Chưa đặt</option>
              {IELTS_TARGET_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-caption font-medium text-slate-600 dark:text-slate-300">
              <CalendarDays className="h-3.5 w-3.5" /> Ngày thi
            </span>
            <input
              type="date"
              className={`${field} mt-1`}
              min={todayIso()}
              value={prefs.ieltsExamDate ?? ''}
              onChange={(e) => updateGoal({ ieltsExamDate: e.target.value || null })}
            />
          </label>
        </div>
        {loadFailed && (
          <p className="mt-3 text-caption text-amber-700 dark:text-amber-400">
            Chưa tải được lịch sử luyện tập.{' '}
            <button type="button" onClick={() => void load()} className="font-semibold underline underline-offset-2">
              Thử lại
            </button>
          </p>
        )}
      </section>

      <section aria-labelledby="ielts-skills">
        <h2 id="ielts-skills" className="text-title font-semibold text-slate-900 dark:text-white">
          Kỹ năng
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {SKILLS.map((def) => (
            <SkillCard
              key={def.skill}
              def={def}
              progress={progress?.[def.skill] ?? null}
              loading={attempts === null}
              onOpen={() => def.phase && onOpenPhase(def.phase)}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="ielts-library" className={`${panel} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5`}>
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Library className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 id="ielts-library" className="text-sm font-semibold text-slate-900 dark:text-white">
            Thư viện IELTS
          </h2>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            {LIBRARY_LESSONS.length} bài học: cấu trúc đề, tiêu chí chấm, framework và mẹo tránh bẫy.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onOpenLibrary('gen_exam_structure')} className={secondaryBtn}>
            <BookOpen className="h-4 w-4" /> Bắt đầu từ đây
          </button>
          <button type="button" onClick={() => onOpenLibrary()} className={primaryBtn}>
            Mở thư viện
          </button>
        </div>
      </section>
    </div>
  );
}
