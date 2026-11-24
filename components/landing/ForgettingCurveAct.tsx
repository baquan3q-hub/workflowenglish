import React from 'react';
import { SM2_STOPS } from '../../data/landingContent';

// Day 0..38 across x = 60..760. Not to scale on purpose: a linear axis would
// squash the first three reviews into the left tenth of the chart.
const X = [60, 200, 360, 540, 760];
const TOP = 40;
const BASE = 270;

/** Retention after each review: drops, then jumps back to the top. Illustrative only. */
const retention = (() => {
  const floors = [150, 120, 95, 80];
  let d = `M ${X[0]} ${TOP}`;
  for (let i = 0; i < 4; i++) {
    const x0 = X[i];
    const x1 = X[i + 1];
    const mid = x0 + (x1 - x0) * 0.35;
    d += ` C ${mid} ${floors[i]}, ${x1 - 10} ${floors[i] + 4}, ${x1} ${floors[i]}`;
    d += ` L ${x1} ${TOP}`;
  }
  return d;
})();

/** One study session and nothing after it. */
const forgetting = `M ${X[0]} ${TOP} C 120 230, 260 258, 760 264`;

export function ForgettingCurveAct() {
  return (
    <section id="lp-science" className="lp-science" data-sc-act="flow" aria-labelledby="lp-science-title">
      <div className="lp-science__grid">
        <header className="lp-science__head">
          <p className="lp-kicker">Khoa học · tr. 04</p>
          <h2 id="lp-science-title" className="lp-h2">
            Não không giữ thứ nó chỉ gặp <em>một lần</em>.
          </h2>
        </header>

        <div className="lp-science__text lp-columns">
          <p className="lp-dropcap">
            Năm 1885, nhà tâm lý học Hermann Ebbinghaus tự học thuộc hàng loạt âm tiết vô nghĩa rồi đo
            xem mình còn nhớ bao nhiêu theo thời gian. Kết quả là một đường dốc: phần lớn bị quên trong
            vài ngày đầu, phần còn lại mờ dần chậm hơn.
          </p>
          <p>
            Tin tốt nằm ở phần sau của câu chuyện. Mỗi lần ôn lại đúng lúc sắp quên, đường đó được kéo
            lên, và lần quên kế tiếp đến chậm hơn. Ôn sớm quá là phí công, ôn muộn quá thì phải học lại
            từ đầu.
          </p>
          <p>
            VocabMaster dùng SM-2, thuật toán lặp lại ngắt quãng của SuperMemo, để chọn ngày ôn cho từng
            từ. Bạn nhớ tốt thì khoảng cách dài ra. Bạn quên thì từ quay lại sớm. App còn lệch ngày ôn đi
            một chút để các từ học cùng ngày không dồn vào cùng một buổi.
          </p>
        </div>

        <figure className="lp-curve" data-sc-reveal="left" data-sc-reveal-at="0.12 0.42">
          <svg viewBox="0 0 800 330" role="img" aria-labelledby="lp-curve-title lp-curve-desc">
            <title id="lp-curve-title">Đường cong quên và các lần ôn SM-2</title>
            <desc id="lp-curve-desc">
              Nét đứt: nếu không ôn, trí nhớ tụt dần về gần đáy. Nét liền: mỗi lần ôn sau 1, 6, 15 và 38
              ngày kéo trí nhớ lên lại, và mỗi lần sau tụt chậm hơn lần trước.
            </desc>
            {[TOP, 117, 193, BASE].map((y) => (
              <line key={y} x1="60" x2="760" y1={y} y2={y} className="lp-curve__grid" />
            ))}
            <path d={forgetting} className="lp-curve__forget" pathLength={1} />
            <path d={retention} className="lp-curve__keep" pathLength={1} />
            {X.slice(1).map((x, i) => (
              <g key={x} className="lp-curve__stop" style={{ '--i': i } as React.CSSProperties}>
                <circle cx={x} cy={TOP} r="7" />
              </g>
            ))}
            {SM2_STOPS.map((stop, i) => (
              <text key={stop.label} x={X[i]} y="310" className="lp-curve__label" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>
                {stop.label}
              </text>
            ))}
            <text x="60" y="24" className="lp-curve__axis">Còn nhớ</text>
          </svg>
          <figcaption>
            <b>Hình 1.</b> Minh họa, không phải số đo. Mốc ôn là của SM-2 khi lần nào bạn cũng nhớ, với
            hệ số mặc định 2.5. <span className="lp-key lp-key--keep">Có ôn</span>{' '}
            <span className="lp-key lp-key--forget">Không ôn</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
