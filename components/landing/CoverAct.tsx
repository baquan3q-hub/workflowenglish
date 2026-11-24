import React from 'react';
import { ArrowRight } from 'lucide-react';
import { COVER_LINES } from '../../data/landingContent';

/**
 * The cover. Four planes, back to front: the masthead, the cat (which sits in
 * front of the masthead, the way a cover model overlaps the title), the copy,
 * and a word card stuck on top. Each plane reads --sc-p in landing.css and
 * travels at its own rate while the cover is pinned.
 */
export function CoverAct({ onStart }: { onStart: () => void }) {
  return (
    <section id="lp-top" className="lp-cover" data-sc-act="pin" data-sc-span="1.7" aria-labelledby="lp-title">
      <div className="lp-cover__stage" data-sc-stage>
        <p className="lp-cover__masthead" aria-hidden="true">
          <span>V</span><span>o</span><span>c</span><span>a</span><span>b</span>
        </p>

        <img
          className="lp-cover__cat"
          src="/mascot-lavender.png"
          alt="Mèo VocabMaster cầm sách, mỉm cười"
          width={1254}
          height={1254}
          fetchPriority="high"
        />

        <div className="lp-cover__copy">
          <p className="lp-cover__issue">Số 01 · Đông 2026 · Tạp chí học từ vựng</p>
          <h1 id="lp-title" className="lp-cover__title">
            Học từ mới.
            <em> Dùng được ngay </em>
            trong câu.
          </h1>
          <p className="lp-cover__lede">
            Mỗi từ đi qua năm bước, từ lật thẻ đến tự đặt câu, rồi quay lại đúng lúc bạn sắp quên.
            Cùng một vốn từ đó, bạn luyện thẳng bốn kỹ năng IELTS.
          </p>
          <div className="lp-cover__cta">
            <button type="button" className="lp-btn lp-btn--accent" onClick={onStart} data-sc-magnet="0.2">
              Bắt đầu học miễn phí <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a className="lp-text-link" href="#lp-lesson">Làm thử một bài học</a>
          </div>
        </div>

        <ul className="lp-cover__lines" aria-label="Trong số này">
          {COVER_LINES.map((line) => (
            <li key={line.id}>
              <a href={`#${line.id}`}>
                <span className="lp-cover__page">tr. {line.page}</span>
                <span>{line.text}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="lp-cover__sticker" aria-hidden="true">
          <span className="lp-cover__sticker-tag">Từ của số này</span>
          <strong>resilient</strong>
          <span>/rɪˈzɪl.jənt/ · kiên cường</span>
        </div>

        <div className="lp-cover__barcode" aria-hidden="true">
          <span className="lp-cover__bars" />
          <span>VOCABMASTER · 01</span>
        </div>
      </div>
    </section>
  );
}
