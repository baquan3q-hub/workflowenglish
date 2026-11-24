import React from 'react';
import { IELTS_PAGES } from '../../data/landingContent';

/**
 * The IELTS room. Vertical scroll becomes sideways travel through six
 * department pages, which reads as "options" rather than "argument". On small
 * screens the rail is a native, swipeable scroller instead (see landing.css).
 */
export function IeltsRoomAct() {
  return (
    <section id="lp-ielts" className="lp-ielts" data-sc-act="pan" data-sc-span="3" aria-labelledby="lp-ielts-title">
      <div className="lp-ielts__stage" data-sc-stage>
        <header className="lp-ielts__head">
          <p className="lp-kicker">Phòng luyện IELTS · tr. 12</p>
          <h2 id="lp-ielts-title" className="lp-h2">
            Từ vừa học, <em>đem vào phòng thi</em>.
          </h2>
          <p className="lp-ielts__lede">
            Bốn kỹ năng, một sổ lỗi sai và một trợ lý AI. Từ bạn gặp trong đề đi thẳng vào lịch ôn.
          </p>
        </header>

        <ol className="lp-rail" data-sc-pan="0" aria-label="Các phòng luyện">
          {IELTS_PAGES.map((page, i) => (
            <li key={page.skill} className="lp-dept">
              <div className="lp-dept__top">
                <span className="lp-dept__folio">tr. {12 + Math.floor(i * 0.7)}</span>
                <span className="lp-dept__skill" lang={i < 4 ? 'en' : undefined}>{page.skill}</span>
              </div>
              <img className="lp-dept__img" src={page.img} alt="" width={240} height={240} loading="lazy" decoding="async" />
              <h3 className="lp-dept__title">{page.title}</h3>
              <p className="lp-dept__lede">{page.lede}</p>
              <ul className="lp-dept__list">
                {page.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className="lp-ielts__note">
          Điểm Writing và Speaking là điểm AI ước lượng theo tiêu chí, không phải điểm IELTS chính thức.
        </p>
      </div>
    </section>
  );
}
