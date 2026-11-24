import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LLL_TOPICS, pickLllToday, type LllEditorial } from '../../services/lllLogic';

/** What the real analytics screen shows, tab by tab (views/AnalyticsDashboard). */
const REPORT = [
  {
    tab: 'Tổng quan',
    art: '/analytics-overview/streak.webp',
    items: ['Lượt ôn trong 7 ngày qua', 'Chuỗi ngày đạt mục tiêu', 'Nhịp ôn tập theo 4 hoặc 12 tuần'],
  },
  {
    tab: 'Từ vựng',
    art: '/analytics-overview/memory.webp',
    items: ['Tỷ lệ nhớ trong 30 ngày', 'Lịch ôn sắp tới', 'Từ mới mỗi tuần và những từ hay quên'],
  },
  {
    tab: 'Kỹ năng',
    art: '/analytics-ielts/band.webp',
    items: ['Tiến độ từng kỹ năng IELTS', 'Điểm kiểm tra cuối bài', 'Lỗi bạn hay mắc nhất'],
  },
];

const MINUTES = [5, 10, 20] as const;

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A live sample of the Lifelong Learning library, picked by the same function the app uses. */
function LllPicker() {
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(10);
  const day = useMemo(localDay, []);
  // The catalog (about 100 links) loads on its own so it stays out of the main bundle.
  const [catalog, setCatalog] = useState<readonly LllEditorial[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('../../data/lllCatalog').then((m) => { if (!cancelled) setCatalog(m.LLL_CATALOG); }).catch(() => { if (!cancelled) setCatalog([]); });
    return () => { cancelled = true; };
  }, []);
  // The app treats minutes as a ceiling, so a longer budget can return the same
  // short links. Here each choice draws from its own time band first (up to 5,
  // 6 to 10, 11 to 20 minutes), then tops up from everything under the ceiling.
  const picks = useMemo(() => {
    if (!catalog) return [];
    const filters = { minutes, topic: 'all' } as const;
    const floor = MINUTES[MINUTES.indexOf(minutes) - 1] ?? 0;
    const band = catalog.filter((item) => item.minutes > floor);
    const first = pickLllToday(band, [], [], filters, day);
    const seen = new Set(first.map((p) => p.item.url));
    const rest = pickLllToday(catalog.filter((item) => !seen.has(item.url)), [], [], filters, day);
    return [...first, ...rest].slice(0, 3);
  }, [catalog, minutes, day]);

  return (
    <div className="lp-lll">
      <img className="lp-lll__globe" src="/lll-globe.webp" alt="" width={256} height={256} loading="lazy" decoding="async" />
      <h3 className="lp-lll__title">Học suốt đời</h3>
      <p className="lp-lll__lede">
        Ngoài giờ học từ, app gợi ý vài bài đọc và video tiếng Anh ngắn, kèm AI tóm tắt và giải thích từ khó.
        Bạn rảnh bao lâu?
      </p>
      <div className="lp-seg" role="radiogroup" aria-label="Thời gian bạn có">
        {MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={minutes === m}
            tabIndex={minutes === m ? 0 : -1}
            className="lp-seg__btn"
            onClick={() => setMinutes(m)}
            onKeyDown={(e) => {
              const i = MINUTES.indexOf(m);
              const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const next = MINUTES[(i + d + MINUTES.length) % MINUTES.length];
              setMinutes(next);
              (e.currentTarget.parentElement?.children[MINUTES.indexOf(next)] as HTMLElement | undefined)?.focus();
            }}
          >
            {m} phút
          </button>
        ))}
      </div>
      <ol className="lp-lll__list" aria-live="polite">
        {!catalog && <li className="lp-lll__empty">Đang tải gợi ý…</li>}
        {catalog && picks.length === 0 && <li className="lp-lll__empty">Chưa có bài nào vừa {minutes} phút.</li>}
        {picks.map(({ item }) => {
          const extra = 'description' in item ? (item as LllEditorial) : null;
          return (
            <li key={item.url} className="lp-lll__item">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <span className="lp-lll__meta">
                  {LLL_TOPICS[item.topic]} · {item.minutes} phút{extra ? ` · ${extra.publisher}` : ''}
                </span>
                <span className="lp-lll__name" lang={item.language}>
                  {item.title} <ArrowUpRight size={15} aria-hidden="true" />
                  <span className="lp-sr"> (mở trong thẻ mới)</span>
                </span>
                {extra && <span className="lp-lll__desc">{extra.description}</span>}
              </a>
            </li>
          );
        })}
      </ol>
      <p className="lp-lll__foot">Danh sách đổi theo ngày. Trong app, bạn hỏi AI tìm bài theo chủ đề và lưu được cả link của riêng mình.</p>
    </div>
  );
}

export function ProgressAct() {
  return (
    <section id="lp-progress" className="lp-progress" data-sc-act="flow" aria-labelledby="lp-progress-title">
      <div className="lp-progress__inner">
        <header className="lp-progress__head">
          <p className="lp-kicker">Hồ sơ · tr. 18</p>
          <h2 id="lp-progress-title" className="lp-h2">
            Thấy mình <em>tiến bộ</em>, từng tuần một.
          </h2>
        </header>

        <div className="lp-report" data-sc-reveal="up" data-sc-reveal-at="0.1 0.4">
          <p className="lp-report__lede">
            Trang thống kê trong app có ba thẻ. Không có con số nào ở đây, vì con số là của bạn: nó chỉ
            xuất hiện khi bạn bắt đầu học.
          </p>
          <ol className="lp-report__tabs">
            {REPORT.map((r) => (
              <li key={r.tab} className="lp-report__tab">
                <img src={r.art} alt="" width={96} height={96} loading="lazy" decoding="async" data-sc-parallax="-0.25" />
                <div>
                  <h3>{r.tab}</h3>
                  <ul>
                    {r.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <LllPicker />
      </div>
    </section>
  );
}
