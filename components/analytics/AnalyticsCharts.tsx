import React, { useRef, useState } from 'react';
import type { DayCount } from '../../services/analyticsLogic';

/**
 * Charts for the analytics screen with compact axes and inline labels.
 */

const WEEKDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function weekdayLabel(key: string): string {
  return WEEKDAYS_VI[parseKey(key).getDay()];
}

// --- Heatmap ---------------------------------------------------------------

function heatClass(count: number, max: number): string {
  if (count <= 0) return 'bg-slate-100 dark:bg-slate-800';
  const r = count / Math.max(max, 1);
  if (r <= 0.25) return 'bg-teal-100 dark:bg-teal-950';
  if (r <= 0.5) return 'bg-teal-200 dark:bg-teal-800';
  if (r <= 0.75) return 'bg-teal-400 dark:bg-teal-600';
  return 'bg-teal-700 dark:bg-teal-400';
}

/**
 * Week-column heatmap (Mon at the top). `days` is dense and ends today;
 * the first column is padded so weeks line up, and days after today stay blank.
 */
export const ActivityHeatmap: React.FC<{ days: ReadonlyArray<DayCount> }> = ({ days }) => {
  const [selectedDate, setSelectedDate] = useState<string>();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  if (days.length === 0) return null;
  const selected = days.find((day) => day.date === selectedDate) ?? days[days.length - 1];
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  const lead = (parseKey(days[0].date).getDay() + 6) % 7; // Mon=0
  const cells: Array<DayCount | null> = [...Array(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = cells.length / 7;

  const onNavigate = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case 'ArrowUp': next = index - 1; break;
      case 'ArrowDown': next = index + 1; break;
      case 'ArrowLeft': next = index - 7; break;
      case 'ArrowRight': next = index + 7; break;
      case 'Home': next = 0; break;
      case 'End': next = days.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const date = days[Math.max(0, Math.min(days.length - 1, next))].date;
    setSelectedDate(date);
    buttons.current[date]?.focus();
  };

  return (
    <div className="space-y-2.5">
      <div
        role="group"
        aria-label={`Hoạt động ôn tập trong ${days.length} ngày`}
        className="grid w-full grid-flow-col grid-rows-7 gap-1"
        style={{ gridTemplateColumns: `1.25rem repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {['T2', '', 'T4', '', 'T6', '', 'CN'].map((d, i) => (
          <span key={`label-${i}`} aria-hidden="true" className="flex items-center text-[10px] leading-none text-slate-500 dark:text-slate-400">
            {d}
          </span>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <span key={`pad-${i}`} aria-hidden="true" className="h-5 w-full sm:h-6" />;
          const active = cell.date === selected.date;
          const label = `${shortDate(cell.date)} · ${cell.count} lượt ôn`;
          return (
            <button key={cell.date} type="button" aria-label={label} title={label} aria-pressed={active}
              ref={(element) => { buttons.current[cell.date] = element; }}
              tabIndex={active ? 0 : -1} onClick={() => setSelectedDate(cell.date)}
              onKeyDown={(event) => onNavigate(event, i - lead)}
              className={`relative h-5 w-full rounded-[4px] sm:h-6 ${heatClass(cell.count, max)} ${active ? 'ring-2 ring-inset ring-tone-aqua-fg' : 'hover:ring-1 hover:ring-inset hover:ring-tone-aqua-fg'}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="rounded-lg bg-tone-aqua px-2.5 py-1 text-xs font-medium tabular-nums text-tone-aqua-fg">
          {weekdayLabel(selected.date)}, {shortDate(selected.date)} · {selected.count} lượt ôn
        </p>
        <HeatmapLegend />
      </div>
    </div>
  );
};

export const HeatmapLegend: React.FC = () => (
  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400" aria-hidden="true">
    <span className="mr-1">Ít</span>
    {[0, 0.2, 0.45, 0.7, 1].map((r) => (
      <span key={r} className={`h-2.5 w-2.5 rounded-[3px] ${heatClass(r, 1)}`} />
    ))}
    <span className="ml-1">Nhiều</span>
  </div>
);

// --- Column chart ----------------------------------------------------------

interface ColumnChartProps {
  data: ReadonlyArray<DayCount>;
  /** Label under a column; return '' to leave it blank. */
  labelFor: (d: DayCount, index: number) => string;
  /** Index drawn in the accent colour (e.g. today); the rest are lighter. */
  highlight?: number;
  /** Accessible summary of the chart. */
  label: string;
  /** Tooltip / screen-reader unit, e.g. "từ". */
  unit: string;
}

export const ColumnChart: React.FC<ColumnChartProps> = ({ data, labelFor, highlight, label, unit }) => {
  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  const dense = data.length > 14;
  return (
    <figure aria-label={label}>
      <div className={`flex h-32 items-end ${dense ? 'gap-0.5' : 'gap-2'}`}>
        {data.map((d, i) => {
          const pct = max > 0 ? (d.count / max) * 100 : 0;
          const tone =
            d.count === 0
              ? 'bg-slate-100 dark:bg-slate-800'
              : i === highlight || highlight === undefined
                ? 'bg-blue-500 dark:bg-blue-400'
                : 'bg-blue-200 dark:bg-blue-900';
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              {!dense && (
                <span className="text-[11px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
                  {d.count > 0 ? d.count : ''}
                </span>
              )}
              <div
                title={`${shortDate(d.date)}: ${d.count} ${unit}`}
                className={`w-full rounded-t ${tone}`}
                style={{ height: d.count > 0 ? `${Math.max(pct * 0.8, 6)}%` : '3px' }}
              />
            </div>
          );
        })}
      </div>
      <div className={`mt-1.5 flex ${dense ? 'gap-0.5' : 'gap-2'}`} aria-hidden="true">
        {data.map((d, i) => (
          <span
            key={d.date}
            className={`flex-1 whitespace-nowrap text-center text-[11px] ${
              i === highlight ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {labelFor(d, i)}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${shortDate(d.date)}: ${d.count} ${unit}`).join(', ')}
      </figcaption>
    </figure>
  );
};

// --- Score line ------------------------------------------------------------

const VB_W = 320;
const VB_H = 120;
const PAD = 8;

/** Percent scores (0–100) over time; the dashed line is the average. */
export const ScoreLine: React.FC<{ points: ReadonlyArray<{ label: string; value: number }> }> = ({ points }) => {
  if (points.length === 0) return null;
  const xs = (i: number) => (points.length === 1 ? VB_W / 2 : PAD + (i / (points.length - 1)) * (VB_W - 2 * PAD));
  const ys = (v: number) => PAD + (1 - Math.max(0, Math.min(100, v)) / 100) * (VB_H - 2 * PAD);
  const avg = points.reduce((a, p) => a + p.value, 0) / points.length;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(p.value)}`).join(' ');

  return (
    <figure aria-label="Điểm các bài kiểm tra gần đây">
      {/* The SVG stretches to the width; dots are HTML so they stay round. */}
      <div className="relative h-32 w-full text-blue-500 dark:text-blue-400" aria-hidden="true">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {[0, 50, 100].map((t) => (
            <line key={t} x1={PAD} x2={VB_W - PAD} y1={ys(t)} y2={ys(t)} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={PAD} x2={VB_W - PAD} y1={ys(avg)} y2={ys(avg)} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map((p, i) => (
          <span
            key={i}
            title={`${p.label}: ${p.value}%`}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-white dark:ring-slate-900"
            style={{ left: `${(xs(i) / VB_W) * 100}%`, top: `${(ys(p.value) / VB_H) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400" aria-hidden="true">
        <span>{points[0].label}</span>
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </div>
      <figcaption className="sr-only">{points.map((p) => `${p.label}: ${p.value}%`).join(', ')}</figcaption>
    </figure>
  );
};

// --- Stacked bar -----------------------------------------------------------

export interface Segment {
  key: string | number;
  label: string;
  value: number;
  /** Tailwind bg class. */
  color: string;
}

/** One horizontal bar split into segments, with a legend beneath. */
export const StackedBar: React.FC<{ segments: ReadonlyArray<Segment>; label: string }> = ({ segments, label }) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div>
      <div role="img" aria-label={label} className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {total > 0 &&
          segments.map((s) =>
            s.value > 0 ? (
              <div key={s.key} className={`${s.color} h-full`} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
            ) : null,
          )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.color}`} />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
