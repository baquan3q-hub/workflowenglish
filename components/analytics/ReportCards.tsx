import React from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Crosshair, Target } from 'lucide-react';
import type { ieltsReport, ReportFinding } from '../../services/analyticsReportLogic';
import { goalUnit, SKILL_NAMES, weekStart, type NextActionTarget } from '../../services/ieltsProgressLogic';
import { SKILL_TONE, toneClasses } from '../ui/palette';
import { primaryBtn, secondaryBtn } from '../ui/styles';

const findingStyle = {
  warning: { label: 'Cần chú ý', tone: 'peach', icon: CircleAlert },
  focus: { label: 'Nên làm', tone: 'periwinkle', icon: Crosshair },
  positive: { label: 'Đã hoàn thành', tone: 'mint', icon: CheckCircle2 },
} as const;

const weekDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });

function IeltsArt({ asset, className }: { asset: 'band' | keyof typeof SKILL_NAMES; className: string }) {
  return <img src={`/analytics-ielts/${asset}.webp`} alt="" width={256} height={256}
    className={`shrink-0 object-contain drop-shadow-sm ${className}`} />;
}

function ProgressIllustration() {
  return (
    <div aria-hidden="true" className="relative isolate grid h-32 place-items-center sm:h-full sm:min-h-[13rem]">
      <div className="absolute -z-10 h-[85%] w-3/4 rounded-full bg-tone-lavender-accent/25 blur-2xl" />
      <svg className="absolute -z-10 h-[90%] w-full max-w-md text-tone-lavender-fg opacity-40" viewBox="0 0 430 200" fill="none">
        <g transform="rotate(-17 215 104)" stroke="currentColor">
          <ellipse cx="215" cy="104" rx="173" ry="54" strokeWidth="1.2" />
          <ellipse cx="215" cy="104" rx="187" ry="66" strokeDasharray="2 7" />
        </g>
        <circle cx="66" cy="139" r="5" fill="currentColor" />
        <circle cx="358" cy="66" r="4" className="fill-tone-aqua-fg" />
        <path d="M343 130v16m-8-8h16M92 56v12m-6-6h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
      <img src="/analytics-pastel-3d.webp" alt="" width={640} height={640}
        className="h-32 w-36 object-contain drop-shadow-lg sm:h-52 sm:w-56" />
    </div>
  );
}

export function FindingCard<T>({ finding, onClick, variant, art }: {
  finding: ReportFinding<T>;
  onClick: (target: T) => void;
  variant: 'priority' | 'summary';
  art?: string;
}) {
  const { label, tone, icon: Icon } = findingStyle[finding.tone];
  const colors = toneClasses(tone);
  const follow = () => onClick(finding.target);
  const badge = (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.surface} ${colors.text}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />{label}
    </span>
  );
  if (variant === 'priority') {
    return (
      <article aria-label="Việc ưu tiên" className="grid overflow-hidden rounded-3xl border border-tone-lavender-border bg-gradient-to-br from-tone-lavender via-tone-periwinkle to-tone-aqua sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 px-5 pt-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-tone-lavender-fg">
              <Target className="h-4 w-4" aria-hidden="true" /> Việc ưu tiên
            </p>
            {badge}
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{finding.title}</h3>
          <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{finding.evidence}</p>
          <p className="mb-4 mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-300">{finding.advice}</p>
          <button type="button" onClick={follow}
            className="press inline-flex min-h-touch items-center gap-2 rounded-xl bg-violet-700 px-4 text-left text-sm font-semibold text-white shadow-sm hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone-lavender-fg dark:bg-violet-600 dark:hover:bg-violet-700">
            {finding.label}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
        <ProgressIllustration />
      </article>
    );
  }
  return (
    <article className="flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      {art ? (
        <img src={art} alt="" width={48} height={48} className="h-11 w-11 shrink-0 object-contain drop-shadow-sm sm:h-12 sm:w-12" />
      ) : (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${colors.surface} ${colors.text}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{finding.title}</h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{finding.evidence}</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{finding.advice}</p>
        </div>
        <button type="button" onClick={follow} className="inline-flex min-h-touch max-w-full items-center gap-1.5 text-left text-xs font-semibold text-tone-lavender-fg hover:underline">
          {finding.label}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export function ProgressTrack({ value, goal, label, color = 'bg-tone-aqua-accent' }: {
  value: number; goal: number; label: string; color?: string;
}) {
  const progress = Math.min(goal, Math.max(0, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={progress}
      className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${(progress / goal) * 100}%` }} />
    </div>
  );
}

export function IeltsProgressReport({ report, now, onOpenGoals, onAction }: {
  report: ReturnType<typeof ieltsReport>;
  now: Date;
  onOpenGoals: () => void;
  onAction: (target: NextActionTarget) => void;
}) {
  const { band, targetBand, days, measured, gap, complete, soon, focusSkill, focusDetail, finding } = report;
  const monday = weekStart(now);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const countdown = days == null ? null : days < 0 ? 'Ngày thi đã qua' : days === 0 ? 'Thi hôm nay' : `Còn ${days} ngày đến kỳ thi`;
  const status = band == null ? `${measured}/4 kỹ năng có điểm`
    : gap == null ? 'Chưa đặt mục tiêu' : gap > 0 ? `Còn ${gap.toFixed(1)} band` : 'Đạt band mục tiêu';
  const { tone, icon: FocusIcon } = findingStyle[finding.tone];
  const focus = toneClasses(tone);
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="Band tổng và mục tiêu" className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-tone-lavender-border bg-gradient-to-br from-tone-lavender to-tone-aqua p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <dl className="flex items-end gap-3 text-slate-900 dark:text-white sm:gap-4">
                <div>
                  <dt className="text-xs font-semibold text-tone-lavender-fg">Band tổng ước tính</dt>
                  <dd className="mt-1 text-4xl font-bold leading-none tracking-tight tabular-nums">{band?.toFixed(1) ?? '—'}</dd>
                </div>
                <div className="relative pl-6">
                  <ArrowRight className="absolute bottom-1 left-0 h-4 w-4 text-tone-lavender-fg" aria-hidden="true" />
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-300">Mục tiêu</dt>
                  <dd className="mt-1 text-2xl font-semibold leading-none tabular-nums">{targetBand?.toFixed(1) ?? '—'}</dd>
                </div>
              </dl>
              <p className="mt-2.5 text-xs font-semibold text-tone-lavender-fg">{status}</p>
            </div>
            <IeltsArt asset="band" className="h-16 w-16 sm:h-24 sm:w-24" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-tone-lavender-border pt-2.5">
            <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${soon ? 'text-tone-peach-fg' : 'text-slate-600 dark:text-slate-300'}`}>
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{countdown ?? 'Chưa đặt ngày thi'}
            </p>
            <button type="button" className={`${secondaryBtn} shrink-0`} onClick={onOpenGoals}>Mục tiêu IELTS</button>
          </div>
        </section>

        <article className={`flex min-w-0 flex-col justify-between gap-3 rounded-2xl border p-4 sm:p-5 ${focus.surface}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${focus.text}`}>
                <FocusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {finding.tone === 'warning' ? 'Cần chú ý' : 'Bước tiếp theo'}
              </p>
              <h4 className="mt-1.5 text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-white">{finding.title}</h4>
              {focusDetail && <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{focusDetail}</p>}
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{finding.advice}</p>
            </div>
            <IeltsArt asset={focusSkill} className="h-14 w-14 sm:h-20 sm:w-20" />
          </div>
          <button type="button" onClick={() => onAction(finding.target)} className={`${primaryBtn} self-start text-left`}>
            {finding.label}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </article>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Tiến độ tuần</h4>
        <p className="text-xs tabular-nums text-slate-600 dark:text-slate-400">{weekDate.format(monday)} – {weekDate.format(sunday)}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {report.skills.map(({ skill, current, previous, samples, weekly }) => {
          const colors = toneClasses(SKILL_TONE[skill]);
          return (
            <li key={skill} className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${colors.surface}`}>
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <h5 className={`text-sm font-semibold ${colors.text}`}>{SKILL_NAMES[skill]}</h5>
                  <p className="mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">
                    {current?.toFixed(1) ?? '—'}
                  </p>
                </div>
                <IeltsArt asset={skill} className="h-8 w-8 min-[380px]:h-10 min-[380px]:w-10 sm:h-14 sm:w-14" />
              </div>
              <p className="mb-2 mt-2 text-xs text-slate-600 dark:text-slate-300">
                {samples > 0 ? `${samples} bài${previous == null ? '' : ` · trước ${previous.toFixed(1)}`}` : 'Chưa có điểm'}
              </p>
              <ProgressTrack value={weekly.done} goal={weekly.goal} label={`Mục tiêu tuần ${SKILL_NAMES[skill]}`} color={colors.bar} />
              <p className="mt-1.5 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                {weekly.done}/{weekly.goal} {goalUnit(skill)}
                {weekly.remaining === 0 && <CheckCircle2 className={`ml-1.5 inline h-3.5 w-3.5 ${colors.text}`} aria-label="Đạt mục tiêu tuần" />}
              </p>
            </li>
          );
        })}
      </ul>
      <details className="group text-xs text-slate-600 dark:text-slate-400">
        <summary className="flex min-h-touch w-fit cursor-pointer list-none items-center gap-1.5 font-medium hover:text-tone-lavender-fg [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 group-open:rotate-180" aria-hidden="true" /> Cách tính band
        </summary>
        <p className="max-w-prose pb-1 pl-5 leading-relaxed">
          {band == null ? 'Band tổng cần điểm của cả bốn kỹ năng. ' : !complete ? 'Ước tính ban đầu vì có kỹ năng chưa đủ 3 bài. ' : ''}
          Mỗi kỹ năng lấy tối đa 3 bài có điểm gần nhất, gồm cả bài luyện theo phần và bài AI chấm.
        </p>
      </details>
    </div>
  );
}
