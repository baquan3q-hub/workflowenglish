import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Compass,
  Headphones,
  Library,
  Mic,
  Minus,
  NotebookPen,
  PenTool,
  Target,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { AppPhase, type IeltsAttempt, type IeltsSkill } from '../types';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import {
  bandGap,
  criterionTrends,
  daysUntil,
  goalUnit,
  nextAction,
  overallBand,
  overallNote,
  PRACTISED_SKILLS,
  SKILL_NAMES,
  skillProgress,
  weakestCriterion,
  weeklyProgress,
  weekStart,
  type CriterionTrend,
  type GradedSkill,
  type NextActionTarget,
  type SkillProgress,
  type WeeklyGoal,
} from '../services/ieltsProgressLogic';
import { summarizeErrors } from '../services/ieltsErrorLogic';
import { getPreferences, IELTS_TARGET_BANDS, setPreferences } from '../services/preferencesService';
import { LIBRARY_LESSONS } from '../data/ielts/library';
import { Skeleton } from '../components/ui/States';
import { IconTile } from '../components/ui/IconTile';
import { InteractiveCard } from '../components/ui/InteractiveCard';
import { NAV_TONE, SKILL_TONE, toneClasses } from '../components/ui/palette';
import { field, panel, primaryBtn, secondaryBtn } from '../components/ui/styles';

interface Props {
  userId: string;
  onOpenPhase: (phase: AppPhase) => void;
  onOpenLibrary: (lessonId?: string) => void;
  /** Shown to admins only: opens the content editor. */
  onOpenAdmin?: () => void;
  /** Follows the next-action button: a phase, a lesson or a study tab. */
  onAction: (target: NextActionTarget) => void;
  /** Swapped out in previews and tests. */
  loadAttempts?: (userId: string) => Promise<IeltsAttempt[]>;
}

const defaultLoad = async (userId: string) =>
  (await Promise.all(PRACTISED_SKILLS.map((s) => getIeltsAttempts(userId, s, 10)))).flat();

interface SkillDef {
  skill: IeltsSkill;
  title: string;
  hint: string;
  imageSrc: string;
  glowColor: string;
  phase?: AppPhase;
}

const SKILLS: readonly SkillDef[] = [
  {
    skill: 'listening',
    title: 'Listening',
    hint: '4 part · 40 câu hỏi',
    imageSrc: '/listening-3d.png',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    phase: AppPhase.IELTS_LISTENING_HUB,
  },
  {
    skill: 'reading',
    title: 'Reading',
    hint: '3 bài đọc · 40 câu hỏi',
    imageSrc: '/reading-3d.png',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    phase: AppPhase.IELTS_READING_HUB,
  },
  {
    skill: 'writing',
    title: 'Writing',
    hint: 'Task 1 & 2 · Chấm 4 tiêu chí',
    imageSrc: '/writing-3d.png',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    phase: AppPhase.IELTS_WRITING_HUB,
  },
  {
    skill: 'speaking',
    title: 'Speaking',
    hint: 'Part 1, 2, 3 · Luyện phản xạ',
    imageSrc: '/speaking-3d.png',
    glowColor: 'rgba(249, 115, 22, 0.3)',
    phase: AppPhase.IELTS_SPEAKING_HUB,
  },
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
  const available = !!def.phase;
  const tone = SKILL_TONE[def.skill];
  const t = toneClasses(tone);
  return (
    <li className="flex">
      <InteractiveCard tone={tone} onClick={onOpen} disabled={!available} className="flex w-full flex-col justify-between p-4 sm:p-5">
        <div>
          <div className="flex w-full items-start justify-between gap-3">
            {/* 3D Glassy Bitmap Icon with Soft Ambient Glow */}
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center flex-shrink-0">
              {/* Soft Ambient Glow / Radial Blur behind the 3D Icon */}
              <div
                className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-125 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle, ${def.glowColor} 0%, rgba(255,255,255,0) 70%)`,
                  filter: 'blur(20px)',
                }}
                aria-hidden="true"
              />

              {/* 3D Bitmap Image */}
              <img
                src={def.imageSrc}
                alt={def.title}
                className="relative h-full w-full object-contain rounded-2xl mix-blend-multiply dark:mix-blend-normal select-none pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.08] group-hover:-translate-y-0.5 filter drop-shadow-sm group-hover:drop-shadow-md"
                draggable={false}
              />
            </div>

            {/* Band Score */}
            <div className="flex flex-col items-end text-right min-w-0 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Band</span>
              {loading ? (
                <Skeleton className="mt-1 h-7 w-10 rounded-md" />
              ) : (
                <p className={`text-[1.75rem] font-black tabular-nums leading-none mt-1 ${t.text}`}>
                  {fmtBand(progress?.current ?? null)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 min-w-0">
            <h3 className={`text-lg font-bold tracking-tight truncate ${t.text}`}>{def.title}</h3>
          </div>
        </div>

        <span
          className={`mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border bg-white/85 px-4 text-sm font-semibold transition-all duration-200 group-hover:bg-white group-hover:shadow-xs dark:bg-slate-900/60 dark:group-hover:bg-slate-900 ${t.border} ${t.text}`}
        >
          <span>{available ? (progress?.attempts ? 'Luyện tiếp' : 'Bắt đầu') : 'Đang xây dựng'}</span>
          {available && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
        </span>
      </InteractiveCard>
    </li>
  );
};

const SKILL_ICONS: Record<IeltsSkill, React.FC<{ className?: string }>> = { listening: Headphones, reading: BookOpenText, writing: PenTool, speaking: Mic };

const TREND_META = {
  up: { icon: TrendingUp, label: 'Đang tăng', cls: toneClasses('mint').text },
  down: { icon: TrendingDown, label: 'Đang giảm', cls: toneClasses('blush').text },
  flat: { icon: Minus, label: 'Giữ nguyên', cls: 'text-slate-400 dark:text-slate-500' },
} as const;

const WeeklyGoals: React.FC<{ goals: WeeklyGoal[]; from: Date }> = ({ goals, from }) => (
  <section aria-labelledby="ielts-weekly" className={`${panel} p-4 sm:p-5`}>
    <div className="flex items-baseline justify-between gap-3">
      <h2 id="ielts-weekly" className="text-sm font-semibold text-slate-900 dark:text-white">
        Mục tiêu tuần
      </h2>
      <p className="text-caption text-slate-500 dark:text-slate-400">
        Từ thứ Hai {from.getDate()}/{from.getMonth() + 1}
      </p>
    </div>
    <ul className="mt-3 grid gap-4 sm:grid-cols-3">
      {goals.map((g) => {
        const Icon = SKILL_ICONS[g.skill];
        const done = g.remaining === 0;
        const pct = Math.min(100, Math.round((g.done / g.goal) * 100));
        const unit = goalUnit(g.skill);
        const t = toneClasses(SKILL_TONE[g.skill]);
        return (
          <li key={g.skill}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                <Icon className={`h-4 w-4 ${t.text}`} />
                {SKILL_NAMES[g.skill]}
              </span>
              <span className="flex items-center gap-1.5 text-caption tabular-nums text-slate-600 dark:text-slate-300">
                {done && <CheckCircle2 className={`h-3.5 w-3.5 ${toneClasses('mint').text}`} aria-hidden />}
                {Math.min(g.done, g.goal)}/{g.goal} {unit}
              </span>
            </div>
            <div
              className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${t.tile}`}
              role="progressbar"
              aria-label={`${SKILL_NAMES[g.skill]}: ${g.done}/${g.goal} ${unit}`}
              aria-valuemin={0}
              aria-valuemax={g.goal}
              aria-valuenow={Math.min(g.done, g.goal)}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${done ? toneClasses('mint').bar : t.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

const CriterionList: React.FC<{ skill: GradedSkill; trends: CriterionTrend[] }> = ({ skill, trends }) => {
  const weakest = weakestCriterion(trends);
  return (
    <div>
      <h3 className="text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{SKILL_NAMES[skill]}</h3>
      {trends.length === 0 ? (
        <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">Chưa có bài chấm theo tiêu chí.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {trends.map((t) => {
            const meta = t.trend ? TREND_META[t.trend] : null;
            const Icon = meta?.icon;
            const isWeakest = weakest?.key === t.key && trends.some((x) => x.current > t.current);
            return (
              <li key={t.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 text-slate-700 dark:text-slate-200">
                  {t.nameVi}
                  {isWeakest && <span className="sr-only"> (thấp nhất)</span>}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  {Icon && meta && (
                    <span className={`flex items-center gap-1 text-caption ${meta.cls}`} title={meta.label}>
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">{meta.label}</span>
                      {t.delta != null && t.trend !== 'flat' && (
                        <span className="tabular-nums" aria-hidden>
                          {t.delta > 0 ? '+' : ''}
                          {t.delta.toFixed(1)}
                        </span>
                      )}
                    </span>
                  )}
                  <span
                    className={`w-8 text-right font-semibold tabular-nums ${isWeakest ? toneClasses('peach').text : 'text-slate-900 dark:text-white'}`}
                    title={isWeakest ? 'Thấp nhất' : undefined}
                  >
                    {t.current.toFixed(1)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default function IeltsHome({ userId, onOpenPhase, onOpenLibrary, onOpenAdmin, onAction, loadAttempts }: Props) {
  const [attempts, setAttempts] = useState<IeltsAttempt[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [prefs, setPrefs] = useState(() => getPreferences(userId));
  const [now] = useState(() => new Date());
  const loader = useRef(loadAttempts ?? defaultLoad);

  const load = useCallback(async () => {
    if (!userId) {
      setAttempts([]);
      return;
    }
    setLoadFailed(false);
    try {
      const list = await loader.current(userId);
      setAttempts([...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));
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

  const topError = useMemo(() => (attempts ? summarizeErrors(attempts).categories.find((c) => c.info) : undefined), [attempts]);

  const skillBands = progress ? SKILLS.map((d) => progress[d.skill].current).filter((b): b is number => b != null) : [];
  const overall = overallBand(skillBands);
  const gap = bandGap(overall, prefs.ieltsTargetBand);
  const days = daysUntil(prefs.ieltsExamDate, now);

  const weekly = useMemo(() => (attempts ? weeklyProgress(attempts, now) : null), [attempts, now]);
  const trends = useMemo(
    () => (attempts ? { writing: criterionTrends('writing', attempts), speaking: criterionTrends('speaking', attempts) } : null),
    [attempts],
  );
  const action = useMemo(
    () => (progress && attempts && weekly ? nextAction({ progress, attempts, weekly, topError, daysToExam: days }) : null),
    [progress, attempts, weekly, topError, days],
  );

  const updateGoal = (patch: Parameters<typeof setPreferences>[1]) => setPrefs(setPreferences(userId, patch));

  return (
    <div className="mx-auto max-w-3xl space-y-6 anim-fade-up">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Academic</p>
          <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Lộ trình IELTS của bạn</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Học trong Thư viện, luyện đề, xem phản hồi rồi làm lại để lên band.</p>
        </div>
        {onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`group ${secondaryBtn} flex-shrink-0 !gap-1.5 !px-3`}
          >
            <ShieldCheck className={`icon-pop h-4 w-4 ${toneClasses(NAV_TONE.admin).text}`} /> <span className="hidden sm:inline">Quản trị</span>
            <span className="sr-only sm:hidden">Quản trị</span>
          </button>
        )}
      </header>

      <section aria-labelledby="ielts-next" className={`group rounded-2xl border p-4 sm:p-5 ${toneClasses(NAV_TONE.next).surface}`}>
        <p className={`flex items-center gap-1.5 text-caption font-semibold ${toneClasses(NAV_TONE.next).text}`}>
          <Compass className="icon-pop h-3.5 w-3.5" /> Việc nên làm tiếp
        </p>
        {action ? (
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 id="ielts-next" className="text-base font-semibold text-slate-900 dark:text-white">
                {action.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{action.reason}</p>
            </div>
            <button type="button" onClick={() => onAction(action.target)} className={`${primaryBtn} w-full sm:w-auto`}>
              {action.cta} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2" aria-hidden>
            <h2 id="ielts-next" className="sr-only">
              Việc nên làm tiếp
            </h2>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
      </section>

      <section aria-labelledby="ielts-goal" className={`${panel} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="ielts-goal" className="text-caption font-medium text-slate-500 dark:text-slate-400">
              Band ước tính
            </h2>
            {attempts === null ? (
              <Skeleton className="mt-2 h-9 w-16" />
            ) : (
              <p className={`mt-1 text-[2rem] font-bold leading-none tabular-nums ${toneClasses(NAV_TONE.goal).text}`}>{fmtBand(overall)}</p>
            )}
            <p className="mt-2 text-caption text-slate-500 dark:text-slate-400">{overallNote(skillBands.length)}</p>
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
              <Target className={`h-3.5 w-3.5 ${toneClasses(NAV_TONE.goal).text}`} /> Band mục tiêu
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
              <CalendarDays className={`h-3.5 w-3.5 ${toneClasses('butter').text}`} /> Ngày thi
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
          <p className={`mt-3 text-caption ${toneClasses('butter').text}`}>
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
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {weekly && trends && (
        <>
          <WeeklyGoals goals={weekly} from={weekStart(now)} />
          {(trends.writing.length > 0 || trends.speaking.length > 0) && (
            <section aria-labelledby="ielts-criteria" className={`${panel} p-4 sm:p-5`}>
              <h2 id="ielts-criteria" className="text-sm font-semibold text-slate-900 dark:text-white">
                Theo tiêu chí chấm
              </h2>
              <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
                Trung bình 3 bài gần nhất, so với 3 bài trước đó. Điểm màu cam là tiêu chí thấp nhất.
              </p>
              <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <CriterionList skill="writing" trends={trends.writing} />
                <CriterionList skill="speaking" trends={trends.speaking} />
              </div>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="ielts-errors" className={`group ${panel} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5`}>
        <IconTile icon={NotebookPen} tone={NAV_TONE.errorLog} />
        <div className="flex-1">
          <h2 id="ielts-errors" className="text-sm font-semibold text-slate-900 dark:text-white">
            Sổ lỗi
          </h2>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            {topError
              ? `Lỗi lặp lại nhiều nhất: ${topError.label} (${topError.total} lần). Luyện cho dứt điểm.`
              : 'Lỗi trong bài Writing và Speaking được gom theo loại, kèm bài luyện sửa.'}
          </p>
        </div>
        <button type="button" onClick={() => onOpenPhase(AppPhase.IELTS_ERROR_LOG)} className={secondaryBtn}>
          Mở sổ lỗi <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section aria-labelledby="ielts-library" className={`group ${panel} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5`}>
        <IconTile icon={Library} tone={NAV_TONE.library} />
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
            <BookOpen className={`h-4 w-4 ${toneClasses(NAV_TONE.library).text}`} /> Bắt đầu từ đây
          </button>
          <button type="button" onClick={() => onOpenLibrary()} className={primaryBtn}>
            Mở thư viện
          </button>
        </div>
      </section>
    </div>
  );
}
