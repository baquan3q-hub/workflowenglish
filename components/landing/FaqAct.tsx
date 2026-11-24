import React from 'react';
import { Plus } from 'lucide-react';
import { FAQS } from '../../data/landingContent';

/** Questions and answers. Deliberately still: nothing here moves except what the reader opens. */
export function FaqAct() {
  return (
    <section id="lp-faq" className="lp-faq" data-sc-act="flow" aria-labelledby="lp-faq-title">
      <div className="lp-faq__inner">
        <header className="lp-faq__head">
          <p className="lp-kicker">Hỏi đáp · tr. 21</p>
          <h2 id="lp-faq-title" className="lp-h2">
            Những điều bạn <em>có thể đang thắc mắc</em>.
          </h2>
        </header>
        <div className="lp-faq__list">
          {FAQS.map((f, i) => (
            <details key={f.q} className="lp-qa" open={i === 0}>
              <summary>
                <span className="lp-qa__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="lp-qa__q">{f.q}</span>
                <Plus className="lp-qa__icon" size={20} aria-hidden="true" />
              </summary>
              <p className="lp-qa__a">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
