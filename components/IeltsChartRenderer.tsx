import React from 'react';

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'table' | 'process' | 'map';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
  extraInfo?: any;
}

interface Props {
  data: ChartData;
}

export default function IeltsChartRenderer({ data }: Props) {
  const { type, title, labels, datasets, extraInfo } = data;

  switch (type) {
    case 'line':
      return renderLineChart(title, labels, datasets);
    case 'bar':
      return renderBarChart(title, labels, datasets);
    case 'pie':
      return renderPieChart(title, labels, datasets);
    case 'table':
      return renderTable(title, labels, datasets);
    case 'process':
      return renderProcess(title, extraInfo);
    case 'map':
      return renderMap(title, extraInfo);
    default:
      return (
        <div className="p-4 border border-dashed rounded-xl text-center text-slate-400">
          Biểu đồ không xác định
        </div>
      );
  }
}

// ─── Line Chart Renderer ──────────────────────────────────────────

function renderLineChart(title: string, labels: string[], datasets: any[]) {
  const width = 500;
  const height = 300;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Find max value in datasets to scale Y axis
  const allValues = datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues, 10);
  const yMax = Math.ceil(maxValue / 10) * 10;

  // X coordinate calculation
  const getX = (index: number) => {
    if (labels.length <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (labels.length - 1)) * chartWidth;
  };

  // Y coordinate calculation
  const getY = (val: number) => {
    return paddingY + chartHeight - (val / yMax) * chartHeight;
  };

  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      <h4 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200">{title}</h4>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingY + chartHeight * r;
            const val = Math.round(yMax * (1 - r));
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  className="fill-slate-400 text-[10px] text-right font-semibold"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {labels.map((l, i) => {
            const x = getX(i);
            return (
              <text
                key={i}
                x={x}
                y={height - paddingY + 18}
                className="fill-slate-400 text-[10px] text-center font-semibold"
                textAnchor="middle"
              >
                {l}
              </text>
            );
          })}

          {/* Draw lines */}
          {datasets.map((d, datasetIdx) => {
            const color = d.color || colors[datasetIdx % colors.length];
            const points = d.data
              .map((val: number, valIdx: number) => `${getX(valIdx)},${getY(val)}`)
              .join(' ');

            return (
              <g key={datasetIdx}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dots */}
                {d.data.map((val: number, valIdx: number) => (
                  <circle
                    key={valIdx}
                    cx={getX(valIdx)}
                    cy={getY(val)}
                    r="4"
                    fill={color}
                    className="stroke-white dark:stroke-slate-800"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 pt-1">
        {datasets.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 dark:text-slate-350">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color || colors[i % colors.length] }}
            />
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart Renderer ──────────────────────────────────────────

function renderBarChart(title: string, labels: string[], datasets: any[]) {
  const width = 500;
  const height = 300;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const allValues = datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues, 10);
  const yMax = Math.ceil(maxValue / 10) * 10;

  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];

  const numGroups = labels.length;
  const numBarsPerGroup = datasets.length;
  const groupWidth = chartWidth / numGroups;
  const barWidth = Math.max(3, (groupWidth * 0.6) / numBarsPerGroup);

  const getY = (val: number) => {
    return paddingY + chartHeight - (val / yMax) * chartHeight;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      <h4 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200">{title}</h4>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingY + chartHeight * r;
            const val = Math.round(yMax * (1 - r));
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  className="fill-slate-400 text-[10px] text-right font-semibold"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X labels */}
          {labels.map((l, i) => {
            const x = paddingX + i * groupWidth + groupWidth / 2;
            return (
              <text
                key={i}
                x={x}
                y={height - paddingY + 18}
                className="fill-slate-400 text-[10px] text-center font-semibold"
                textAnchor="middle"
              >
                {l}
              </text>
            );
          })}

          {/* Draw bars */}
          {labels.map((_, groupIdx) => {
            const groupX = paddingX + groupIdx * groupWidth;
            const startX = groupX + (groupWidth - barWidth * numBarsPerGroup) / 2;

            return datasets.map((d, barIdx) => {
              const val = d.data[groupIdx];
              const x = startX + barIdx * barWidth;
              const y = getY(val);
              const barHeight = paddingY + chartHeight - y;
              const color = d.color || colors[barIdx % colors.length];

              return (
                <rect
                  key={`${groupIdx}-${barIdx}`}
                  x={x}
                  y={y}
                  width={barWidth - 2}
                  height={Math.max(1, barHeight)}
                  fill={color}
                  rx="1.5"
                />
              );
            });
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 pt-1">
        {datasets.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 dark:text-slate-350">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color || colors[i % colors.length] }}
            />
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pie Chart Renderer ──────────────────────────────────────────

function renderPieChart(title: string, labels: string[], datasets: any[]) {
  const dataset = datasets[0]; // Pie chart displays the first dataset
  if (!dataset) return null;

  const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  let accumulatedAngle = 0;
  const radius = 80;
  const cx = 100;
  const cy = 100;

  const slices = dataset.data.map((val: number, i: number) => {
    const angle = (val / total) * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle += angle;

    // Convert polar coordinates to Cartesian coordinates
    const getCoordinatesForPercent = (percent: number) => {
      const x = cx + Math.cos(2 * Math.PI * percent) * radius;
      const y = cy + Math.sin(2 * Math.PI * percent) * radius;
      return [x, y];
    };

    const startPercent = startAngle / 360;
    const endPercent = endAngle / 360;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      'Z',
    ].join(' ');

    return {
      pathData,
      color: colors[i % colors.length],
      label: labels[i],
      val,
      percentage: ((val / total) * 100).toFixed(1),
    };
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      <h4 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200">{title}</h4>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <svg viewBox="0 0 200 200" className="w-40 h-40">
          {slices.map((slice: any, i: number) => (
            <path key={i} d={slice.pathData} fill={slice.color} className="stroke-white dark:stroke-slate-800" strokeWidth="1.5" />
          ))}
        </svg>

        {/* Legend with percentages */}
        <div className="space-y-1.5 self-start sm:self-center">
          {slices.map((slice: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span>
                {slice.label}: <strong className="font-bold text-slate-800 dark:text-white">{slice.percentage}%</strong> ({slice.val})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Table Renderer ──────────────────────────────────────────

function renderTable(title: string, labels: string[], datasets: any[]) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3 overflow-hidden">
      <h4 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="p-2 text-slate-500 font-bold dark:text-slate-400">Category</th>
              {labels.map((l, i) => (
                <th key={i} className="p-2 text-slate-500 font-bold dark:text-slate-400 text-center">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
            {datasets.map((d, i) => (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                <td className="p-2 font-bold text-slate-700 dark:text-slate-350">{d.label}</td>
                {d.data.map((val: number, idx: number) => (
                  <td key={idx} className="p-2 text-center text-slate-800 dark:text-slate-200 font-medium tabular-nums">{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Process Diagram Renderer ──────────────────────────────────────────

function renderProcess(title: string, extraInfo: any) {
  const steps = extraInfo?.steps || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      <h4 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200">{title}</h4>
      <div className="flex flex-col md:flex-row items-center justify-center gap-3 py-4 flex-wrap">
        {steps.map((step: any, i: number) => (
          <React.Fragment key={i}>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-2 border-indigo-200 dark:border-indigo-900 rounded-xl p-3 text-center w-full max-w-[150px] shadow-sm relative group hover:border-indigo-400 transition-colors">
              <span className="absolute top-1.5 left-2 text-[9px] font-black text-indigo-400 dark:text-indigo-600">STEP {i + 1}</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">{step.title}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">{step.description}</p>
            </div>
            {i < steps.length - 1 && (
              <span className="text-indigo-400 dark:text-indigo-600 font-bold rotate-90 md:rotate-0">➔</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Map Comparison Renderer ──────────────────────────────────────────

function renderMap(title: string, extraInfo: any) {
  const beforeElements = extraInfo?.before || [];
  const afterElements = extraInfo?.after || [];

  const renderMapGrid = (elements: any[], subtitle: string) => {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2 flex-1 w-full bg-slate-50 dark:bg-slate-900/30">
        <p className="text-xs font-bold text-center text-slate-500 dark:text-slate-400 uppercase tracking-wider">{subtitle}</p>
        <div className="grid grid-cols-3 gap-2 aspect-square max-w-[200px] mx-auto border border-slate-100 dark:border-slate-800 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-inner">
          {Array.from({ length: 9 }).map((_, i) => {
            const el = elements.find((item: any) => item.pos === i);
            return (
              <div
                key={i}
                className={`rounded flex items-center justify-center text-[9px] font-black p-1 text-center leading-tight transition-all
                  ${el
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-100 dark:border-slate-850'
                  }`}
              >
                {el?.name || ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      <h4 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200">{title}</h4>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {renderMapGrid(beforeElements, extraInfo?.beforeLabel || 'Trước đây')}
        <div className="text-indigo-400 dark:text-indigo-600 font-bold rotate-90 sm:rotate-0">➔</div>
        {renderMapGrid(afterElements, extraInfo?.afterLabel || 'Hiện tại')}
      </div>
    </div>
  );
}
