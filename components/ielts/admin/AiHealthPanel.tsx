import React, { useState } from 'react';
import { CircleAlert, CircleCheck, Loader2, Stethoscope, TriangleAlert } from 'lucide-react';
import { aiErrorMessage } from '../../../services/aiClient';
import { checkAiHealth, healthItems, reasonVi, type AiHealthReport, type HealthLevel } from '../../../services/aiHealthService';
import { hint, panel, primaryBtn } from './styles';

interface Props {
  /** The health call; the real one by default. */
  check?: () => Promise<AiHealthReport>;
}

const LEVEL_ICON: Record<HealthLevel, React.ReactNode> = {
  ok: <CircleCheck className="h-4 w-4 text-tone-mint-fg" aria-label="Ổn" />,
  warn: <TriangleAlert className="h-4 w-4 text-tone-butter-fg" aria-label="Cảnh báo" />,
  error: <CircleAlert className="h-4 w-4 text-tone-blush-fg" aria-label="Lỗi" />,
};

const time = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

/** Runs the aiHealth op and shows what works, what does not and how to fix it. */
export default function AiHealthPanel({ check = () => checkAiHealth() }: Props) {
  const [report, setReport] = useState<AiHealthReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setReport(await check());
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const items = report ? healthItems(report) : [];

  return (
    <section aria-labelledby="ai-health" className={`${panel} p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="ai-health" className="text-title font-semibold text-slate-900 dark:text-white">
            Kiểm tra AI
          </h2>
          <p className={`mt-1 ${hint}`}>
            Thử khoá Gemini, từng model chấm bài / sinh đề / giọng đọc, bảng giới hạn lượt và kho audio. Mất khoảng 10–40 giây.
          </p>
        </div>
        <button type="button" onClick={run} disabled={busy} className={`${primaryBtn} flex-shrink-0`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
          {busy ? 'Đang kiểm tra…' : report ? 'Kiểm tra lại' : 'Kiểm tra ngay'}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl bg-tone-blush p-3 text-sm text-tone-blush-fg">
          <p className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </p>
          <p className="mt-2 text-caption">
            Nếu báo không kết nối được máy chủ AI: hàm ai-proxy chưa được deploy bản mới. Chạy <code>supabase functions deploy ai-proxy</code> rồi thử lại.
          </p>
        </div>
      )}

      {report && (
        <div className="mt-4 space-y-4" aria-live="polite">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.title} className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="mt-0.5 flex-shrink-0">{LEVEL_ICON[item.level]}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  {item.fix && <p className="mt-0.5 break-words text-caption text-slate-600 dark:text-slate-300">{item.fix}</p>}
                </div>
              </li>
            ))}
          </ul>

          {report.models.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-caption">
                <caption className={`mb-1.5 text-left ${hint}`}>Từng model, theo thứ tự dùng thử (kiểm lúc {time(report.checkedAt)})</caption>
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Model</th>
                    <th className="py-1 pr-3 font-medium">Loại</th>
                    <th className="py-1 pr-3 font-medium">Kết quả</th>
                    <th className="py-1 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.models.map((m) => (
                    <tr key={`${m.group}:${m.model}`} className="text-slate-700 dark:text-slate-200">
                      <td className="py-1.5 pr-3 font-mono">{m.model}</td>
                      <td className="py-1.5 pr-3">{m.group === 'text' ? 'Văn bản' : 'Giọng đọc'}</td>
                      <td className="py-1.5 pr-3">
                        <span className="inline-flex items-center gap-1">
                          {m.ok ? LEVEL_ICON.ok : LEVEL_ICON.error}
                          {m.ok ? 'Dùng được' : `${reasonVi(m.reason)}${typeof m.status === 'number' ? ` (${m.status})` : ''}`}
                        </span>
                      </td>
                      <td className="py-1.5 tabular-nums">{(m.ms / 1000).toFixed(1)} giây</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
