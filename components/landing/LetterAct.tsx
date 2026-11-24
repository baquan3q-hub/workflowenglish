import React from 'react';
import { HABITS } from '../../data/landingContent';

/**
 * The editor's letter. While the page holds, three study habits arrive one by
 * one; a red pen strikes each through and writes the better habit beside it.
 * The strike length is read from --sc-p in CSS (see .lp-habit__strike).
 */
export function LetterAct() {
  return (
    <section id="lp-letter" className="lp-letter" data-sc-act="pin" data-sc-span="2.2" aria-labelledby="lp-letter-title">
      <div className="lp-letter__stage" data-sc-stage>
        <aside className="lp-letter__side">
          <p className="lp-kicker">Thư tòa soạn · tr. 02</p>
          <p className="lp-letter__sign">
            Ban biên tập
            <br />
            VocabMaster
          </p>
        </aside>

        <div className="lp-letter__body">
          <h2 id="lp-letter-title" className="lp-letter__title">
            Bạn đã chép kín một cuốn sổ từ vựng. Mở ra, phần lớn chỉ còn là chữ.
          </h2>
          <p className="lp-letter__lede" data-sc-cue="0.04">
            Không phải vì bạn lười. Cách học quen thuộc nhất lại là cách não bỏ đi nhanh nhất. Chúng tôi
            làm VocabMaster để sửa đúng ba thói quen này:
          </p>
          <ol className="lp-habits">
            {HABITS.map((habit, i) => (
              <li
                key={habit.wrong}
                className={`lp-habit lp-habit--${i + 1}`}
                data-sc-cue={String(0.16 + i * 0.2)}
              >
                <span className="lp-habit__wrong">
                  <span className="lp-sr">Thói quen cũ: </span>
                  {habit.wrong}
                  <span className="lp-habit__strike" aria-hidden="true" />
                </span>
                <span className="lp-habit__right">
                  <span className="lp-sr">Nên làm: </span>
                  {habit.right}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
