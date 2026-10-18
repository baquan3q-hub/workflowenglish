import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Gauge } from 'lucide-react';
import {
  FLUENCY_REFERENCE,
  hasEnoughSpeech,
  metricValue,
  rateFluency,
  referenceRanges,
  type FluencyLevel,
  type FluencyMetricKey,
  type FluencyMetrics,
} from '../../../services/fluencyLogic';
import { muted, panel } from './styles';

const KEYS: FluencyMetricKey[] = ['wpm', 'fillers', 'pauses', 'repeats'];

const LEVEL_TONE: Record<FluencyLevel, string> = {
  strong: 'text-emerald-700 dark:text-emerald-300',
  ok: 'text-sky-700 dark:text-sky-300',
  weak: 'text-amber-700 dark:text-amber-300',
  low: 'text-rose-700 dark:text-rose-300',
};

function format(key: FluencyMetricKey, value: number): string {
  return key === 'wpm' ? String(value) : value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

/** Three numbers in a row, shown right after a take. */
export function FluencyChips({ metrics }: { metrics: FluencyMetrics }) {
  const items = [
    `${metrics.wpm} từ/phút`,
    `${metrics.fillers.total} từ đệm`,
    metrics.pauses ? `${metrics.pauses.count} lần ngừng dài` : null,
  ].filter(Boolean);
  return (
    <p className={`${muted} flex flex-wrap items-center gap-x-2`}>
      <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
      {items.join(' · ')}
    </p>
  );
}

/** Measured fluency next to the Fluency band, with band references. */
export default function FluencyPanel({ metrics, title = 'Chỉ số trôi chảy' }: { metrics: FluencyMetrics; title?: string }) {
  const [showRef, setShowRef] = useState(false);
  const enough = hasEnoughSpeech(metrics);

  return (
    <section className={`${panel} space-y-4 p-4 sm:p-5`} aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-heading text-slate-900 dark:text-white">
            <Gauge className="h-4 w-4 text-slate-500" aria-hidden="true" />
            {title}
          </h3>
          <p className={muted}>
            Đo trên máy từ bản ghi: {metrics.words} từ trong {Math.round(metrics.seconds)} giây nói.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {KEYS.map((key) => {
          const value = metricValue(metrics, key);
          const ref = FLUENCY_REFERENCE[key];
          if (value === null) {
            return (
              <div key={key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className={muted}>{ref.labelVi}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Không đo được trên trình duyệt này.</p>
              </div>
            );
          }
          const rating = rateFluency(key, value);
          return (
            <div key={key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className={muted}>{ref.labelVi}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-title tabular-nums text-slate-900 dark:text-white">{format(key, value)}</span>
                <span className={muted}>{ref.unitVi}</span>
                <span className={`text-caption font-semibold ${LEVEL_TONE[rating.level]}`}>{rating.band}</span>
              </p>
              <p className="mt-1 text-caption leading-relaxed text-slate-600 dark:text-slate-300">{rating.tipVi}</p>
            </div>
          );
        })}
      </div>

      {metrics.fillers.top.length > 0 && (
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Từ đệm hay dùng: {metrics.fillers.top.map((f) => `"${f.word}" ×${f.count}`).join(', ')}
        </p>
      )}

      {!enough && <p className={muted}>Bài nói ngắn nên các chỉ số chỉ mang tính tham khảo.</p>}

      <div>
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          aria-expanded={showRef}
          className="inline-flex min-h-touch items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Ngưỡng tham chiếu theo band
          {showRef ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showRef && (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {KEYS.map((key) => (
              <div key={key}>
                <p className="text-caption font-semibold text-slate-700 dark:text-slate-200">
                  {FLUENCY_REFERENCE[key].labelVi} ({FLUENCY_REFERENCE[key].unitVi})
                </p>
                <ul className={`${muted} mt-1 space-y-0.5`}>
                  {referenceRanges(key).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className={`${muted} sm:col-span-2`}>
              Ngưỡng do ứng dụng đặt để tham khảo, không phải tiêu chí chính thức. Giám khảo chấm độ trôi chảy tổng thể, gồm cả cách nối ý.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
