import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { TOC } from '../../data/landingContent';

interface Props {
  onLogin: () => void;
  onStart: () => void;
}

/** The issue strip: wordmark, issue line, the table of contents drawer and the two account actions. */
export function IssueNav({ onLogin, onStart }: Props) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = panel.current;
    const focusables = () =>
      Array.from(root?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener.current?.focus();
    };
  }, [open]);

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // Wait for the body to scroll again before jumping.
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  };

  return (
    <>
      <header className="lp-strip">
        <a href="#lp-top" className="lp-wordmark" aria-label="VocabMaster, về đầu trang">
          <img src="/app-logo.png" alt="" width={28} height={28} />
          <span>VocabMaster</span>
        </a>
        <p className="lp-strip__issue">Số 01 · Đông 2026</p>
        <div className="lp-strip__actions">
          <button
            ref={opener}
            type="button"
            className="lp-strip__toc"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span className="lp-strip__toc-bars" aria-hidden="true" />
            Mục lục
          </button>
          <button type="button" className="lp-link-btn lp-hide-sm" onClick={onLogin}>
            Đăng nhập
          </button>
          <button type="button" className="lp-btn lp-btn--ink lp-btn--sm" onClick={onStart}>
            Học miễn phí
          </button>
        </div>
      </header>

      {open && (
        <div className="lp-toc" role="presentation" onClick={() => setOpen(false)}>
          <div
            ref={panel}
            className="lp-toc__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-toc-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lp-toc__head">
              <p className="lp-kicker">Số 01 · Đông 2026</p>
              <button type="button" className="lp-icon-btn" onClick={() => setOpen(false)} aria-label="Đóng mục lục">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <h2 id="lp-toc-title" className="lp-toc__title">Trong số này</h2>
            <ol className="lp-toc__list">
              {TOC.map((entry) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`} onClick={jump(entry.id)}>
                    <span className="lp-toc__page">{entry.page}</span>
                    <span className="lp-toc__text">
                      <small>{entry.section}</small>
                      {entry.title}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="lp-btn lp-btn--accent lp-toc__cta"
              onClick={() => {
                setOpen(false);
                onStart();
              }}
            >
              Bắt đầu học miễn phí <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
