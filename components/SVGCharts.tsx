import React from 'react';

// =====================================================================
// HeatmapGrid
// =====================================================================
// Renders a 30-cell activity heatmap (6 columns x 5 rows by default).
// Color intensity is based on the count value for each day.
// Each cell shows its date on hover via the native title attribute.
// ---------------------------------------------------------------------

export interface HeatmapDataPoint {
  date: string; // ISO date string (YYYY-MM-DD) or any human readable date
  count: number;
}

interface HeatmapGridProps {
  data: HeatmapDataPoint[];
  /** Number of columns in the grid. Defaults to 6 (6x5 = 30 cells). */
  columns?: 6 | 7;
}

/**
 * Pick a Tailwind class based on activity intensity.
 * Buckets: 0, 1-5, 6-10, 11+
 */
function getHeatmapCellClass(count: number): string {
  if (count <= 0) {
    return 'bg-slate-100 dark:bg-slate-700';
  }
  if (count <= 5) {
    return 'bg-blue-200 dark:bg-blue-900';
  }
  if (count <= 10) {
    return 'bg-blue-400 dark:bg-blue-700';
  }
  return 'bg-blue-600 dark:bg-blue-500';
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ data, columns = 6 }) => {
  // Always render exactly 30 cells. Pad with zero-count placeholders if needed,
  // and truncate if the caller passes more than 30 entries.
  const cells: HeatmapDataPoint[] = [];
  for (let i = 0; i < 30; i++) {
    const point = data[i];
    cells.push(
      point ?? { date: '', count: 0 }
    );
  }

  const gridColsClass = columns === 7 ? 'grid-cols-7' : 'grid-cols-6';

  return (
    <div
      role="img"
      aria-label="Activity heatmap for the last 30 days"
      className={`grid ${gridColsClass} gap-1`}
    >
      {cells.map((cell, index) => (
        <div
          key={`${cell.date}-${index}`}
          title={cell.date ? `${cell.date}: ${cell.count}` : `${cell.count}`}
          className={`aspect-square w-full rounded-sm ${getHeatmapCellClass(cell.count)}`}
        />
      ))}
    </div>
  );
};

// =====================================================================
// BarChart
// =====================================================================
// Horizontal bar chart. Bars are sized proportionally to the maximum
// value in the data set. Each row shows a label, the colored bar, and
// the numeric value. Color is supplied per-data-point (Tailwind class).
// ---------------------------------------------------------------------

export interface BarChartDataPoint {
  label: string;
  value: number;
  /** Tailwind background color class for the bar (e.g. "bg-blue-500"). */
  color: string;
}

interface BarChartProps {
  data: BarChartDataPoint[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const maxValue = data.reduce((acc, d) => (d.value > acc ? d.value : acc), 0);
  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <div className="flex flex-col gap-2">
      {data.map((point, index) => {
        const widthPercent = (point.value / safeMax) * 100;
        return (
          <div key={`${point.label}-${index}`} className="flex items-center gap-3 text-sm">
            <div className="w-24 shrink-0 truncate text-slate-700 dark:text-slate-200">
              {point.label}
            </div>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${point.color}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <div className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {point.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================================
// LineChart
// =====================================================================
// SVG polyline with circular dots at each data point. The Y axis
// represents 0-100 (percentage). X axis labels are shown at the start,
// middle, and end of the series. Uses currentColor for theme-friendly
// stroke rendering — wrap in a parent with text-* classes to recolor.
// ---------------------------------------------------------------------

export interface LineChartDataPoint {
  label: string;
  value: number; // expected 0-100
}

interface LineChartProps {
  data: LineChartDataPoint[];
}

const LINE_CHART_VIEW_WIDTH = 300;
const LINE_CHART_VIEW_HEIGHT = 120;
const LINE_CHART_PADDING_X = 12;
const LINE_CHART_PADDING_Y = 10;

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Chưa có dữ liệu
      </div>
    );
  }

  const innerWidth = LINE_CHART_VIEW_WIDTH - LINE_CHART_PADDING_X * 2;
  const innerHeight = LINE_CHART_VIEW_HEIGHT - LINE_CHART_PADDING_Y * 2;

  const points = data.map((point, index) => {
    const x =
      data.length === 1
        ? LINE_CHART_PADDING_X + innerWidth / 2
        : LINE_CHART_PADDING_X + (index / (data.length - 1)) * innerWidth;
    const clamped = Math.max(0, Math.min(100, point.value));
    const y = LINE_CHART_PADDING_Y + (1 - clamped / 100) * innerHeight;
    return { x, y, ...point };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Pick start / middle / end labels for the X axis.
  const xLabelIndices: number[] =
    data.length === 1
      ? [0]
      : data.length === 2
        ? [0, data.length - 1]
        : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div className="w-full text-blue-600 dark:text-blue-400">
      <svg
        viewBox={`0 0 ${LINE_CHART_VIEW_WIDTH} ${LINE_CHART_VIEW_HEIGHT}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
      >
        {/* Y-axis gridlines at 0%, 50%, 100% */}
        {[0, 50, 100].map((tick) => {
          const y = LINE_CHART_PADDING_Y + (1 - tick / 100) * innerHeight;
          return (
            <line
              key={tick}
              x1={LINE_CHART_PADDING_X}
              x2={LINE_CHART_VIEW_WIDTH - LINE_CHART_PADDING_X}
              y1={y}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={1}
            />
          );
        })}

        {/* The line itself */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots at each data point */}
        {points.map((p, index) => (
          <circle
            key={`dot-${index}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="currentColor"
          >
            <title>{`${p.label}: ${p.value}%`}</title>
          </circle>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        {xLabelIndices.map((i) => (
          <span key={`xlabel-${i}`}>{data[i]?.label ?? ''}</span>
        ))}
      </div>
    </div>
  );
};

// =====================================================================
// CircularProgress
// =====================================================================
// SVG ring that fills proportionally to value/max. The percentage is
// rendered in the center. Uses currentColor for the progress arc so
// callers can recolor via text-* classes; the track is slate.
// ---------------------------------------------------------------------

interface CircularProgressProps {
  value: number;
  max: number;
  /** Outer size in pixels. Defaults to 80. */
  size?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 80,
}) => {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const percent = Math.round(ratio * 100);

  const strokeWidth = Math.max(4, Math.round(size * 0.1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      className="relative inline-flex items-center justify-center text-blue-600 dark:text-blue-400"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Progress ${percent}%`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
        />
      </svg>
      <span
        className="absolute font-semibold tabular-nums text-slate-700 dark:text-slate-100"
        style={{ fontSize: Math.max(11, Math.round(size * 0.22)) }}
      >
        {percent}%
      </span>
    </div>
  );
};
