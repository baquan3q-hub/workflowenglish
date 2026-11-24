import React from 'react';
import { COMPARE_ROWS } from '../../data/landingContent';

/**
 * Before and after. The new way is marked with a highlighter that sweeps
 * across each row as it scrolls up (a clip-path reveal per row).
 */
export function CompareAct() {
  return (
    <section id="lp-compare" className="lp-compare" data-sc-act="flow" aria-labelledby="lp-compare-title">
      <div className="lp-compare__inner">
        <header className="lp-compare__head">
          <p className="lp-kicker">Trước & sau · tr. 20</p>
          <h2 id="lp-compare-title" className="lp-h2">
            Hai cách học <em>một từ mới</em>.
          </h2>
        </header>
        <table className="lp-table">
          <caption className="lp-sr">So sánh cách học từ quen thuộc với cách học trong VocabMaster</caption>
          <thead>
            <tr>
              <th scope="col"><span className="lp-sr">Chủ đề</span></th>
              <th scope="col">Cách quen thuộc</th>
              <th scope="col">Với VocabMaster</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, i) => (
              <tr key={row.topic}>
                <th scope="row">{row.topic}</th>
                <td className="lp-table__old">{row.old}</td>
                <td className="lp-table__now">
                  <span
                    className="lp-mark"
                    aria-hidden="true"
                    data-sc-reveal="left"
                    data-sc-reveal-at={`${(0.18 + i * 0.045).toFixed(3)} ${(0.3 + i * 0.045).toFixed(3)}`}
                  />
                  <span className="lp-table__text">{row.now}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
