import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { GOALS, type Goal } from '../../data/landingContent';

interface Props {
  onStart: () => void;
  onGoogle: () => void;
  googleBusy: boolean;
  googleError: string | null;
}

/** Where to begin, depending on the goal. A suggestion only: the app does not store this choice. */
const START_HINT: Record<Goal, string> = {
  'Giao tiếp hằng ngày': 'Bắt đầu từ các bài học từ vựng, và dành nhiều thời gian cho bước tự đặt câu.',
  'IELTS 6.0': 'Học từ mỗi ngày, rồi mở Phòng luyện IELTS để làm quen với từng dạng đề.',
  'IELTS 6.5': 'Học từ mỗi ngày, luyện đề theo từng Part, và đọc kỹ sổ lỗi sai sau mỗi bài.',
  'IELTS 7.0': 'Luyện đề đầy đủ, viết lại bài Writing sau khi được chấm, và thi thử Speaking.',
  'IELTS 7.5+': 'Luyện đề đầy đủ, viết lại từng bài theo nhận xét tiêu chí, và săn những lỗi còn lặp lại.',
};

export function SubscribeClose({ onStart, onGoogle, googleBusy, googleError }: Props) {
  const [goal, setGoal] = useState<Goal>('IELTS 6.5');

  return (
    <section id="lp-subscribe" className="lp-close" data-sc-act="flow" aria-labelledby="lp-close-title">
      <div className="lp-coupon">
        <span className="lp-coupon__scissors" aria-hidden="true">✂</span>
        <div className="lp-coupon__main">
          <p className="lp-kicker lp-kicker--accent">Phiếu đăng ký · tr. 22</p>
          <h2 id="lp-close-title" className="lp-coupon__title">
            Cắt phiếu này. <em>Bắt đầu với từ đầu tiên.</em>
          </h2>

          <fieldset className="lp-goals">
            <legend>Mục tiêu của bạn</legend>
            <div className="lp-goals__chips">
              {GOALS.map((g) => (
                <label key={g} className="lp-chip">
                  <input type="radio" name="lp-goal" value={g} checked={goal === g} onChange={() => setGoal(g)} />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="lp-coupon__hint" aria-live="polite">
            <b>Gợi ý:</b> {START_HINT[goal]}
          </p>

          <div className="lp-coupon__actions">
            <button type="button" className="lp-btn lp-btn--accent lp-btn--lg" onClick={onStart} data-sc-magnet="0.25">
              Bắt đầu học miễn phí <ArrowRight size={20} aria-hidden="true" />
            </button>
            <button type="button" className="lp-btn lp-btn--google" onClick={onGoogle} disabled={googleBusy} aria-busy={googleBusy}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              {googleBusy ? 'Đang kết nối Google…' : 'Tiếp tục với Google'}
            </button>
          </div>
          {googleError && (
            <p className="lp-field-msg" role="alert" data-tone="bad">
              {googleError}
            </p>
          )}
        </div>

        <div className="lp-coupon__stub" aria-hidden="true">
          <span className="lp-coupon__stub-label">Số 01</span>
          <strong>{goal}</strong>
          <span>Không cần thẻ thanh toán</span>
        </div>
      </div>

      <footer className="lp-foot">
        <p className="lp-foot__brand">
          <img src="/app-logo.png" alt="" width={24} height={24} /> VocabMaster
        </p>
        <p className="lp-foot__line">Tạp chí số 01 · Đông 2026. Học từ vựng và luyện thi IELTS Academic.</p>
        <a className="lp-text-link" href="#lp-top">Về trang bìa</a>
      </footer>
    </section>
  );
}
