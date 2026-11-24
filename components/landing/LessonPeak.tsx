import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Volume2 } from 'lucide-react';
import { LESSON_STEPS, LESSON_WORD, SM2_STOPS, type LessonStep } from '../../data/landingContent';
import { findWordForm, gradeTypedAnswer } from '../../services/reviewLogic';

type StepKey = LessonStep['key'];
interface Note {
  id: string;
  step: number;
  text: string;
}

const STEP_COUNT = LESSON_STEPS.length;

function speak(word: string) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
  return true;
}

/**
 * The issue's feature: one word through the five real lesson steps.
 *
 * While the section is pinned, scroll chooses the step (and the step tabs
 * scroll to it), so the reader can work through the lesson with the wheel
 * alone. Where the section is not pinned (phones, reduced motion) the tabs
 * switch steps directly. Everything the reader does is written into the
 * margin as a red-pen note; at the last step the word is stamped onto its
 * SM-2 review dates.
 */
export function LessonPeak({ onSave }: { onSave: () => void }) {
  const section = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Record<StepKey, boolean>>({
    card: false, story: false, quiz: false, blank: false, sentence: false,
  });
  const [notes, setNotes] = useState<Note[]>([]);

  const note = useCallback((id: string, stepIndex: number, text: string) => {
    setNotes((list) => (list.some((n) => n.id === id) ? list : [...list, { id, step: stepIndex, text }]));
  }, []);
  const finish = useCallback((key: StepKey) => setDone((d) => (d[key] ? d : { ...d, [key]: true })), []);

  // Pinned travel in px, or 0 when the section scrolls normally.
  const travel = () => {
    const el = section.current;
    const stage = el?.querySelector<HTMLElement>('.lp-lesson__stage');
    if (!el || !stage || getComputedStyle(stage).position !== 'sticky') return 0;
    const t = el.offsetHeight - window.innerHeight;
    return t > window.innerHeight * 0.5 ? t : 0;
  };

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = section.current;
      const t = travel();
      if (!el || !t) return;
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / t));
      const next = Math.min(STEP_COUNT - 1, Math.floor(p * STEP_COUNT));
      setStep((s) => (s === next ? s : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(STEP_COUNT - 1, i));
    setStep(next);
    const el = section.current;
    const t = travel();
    if (el && t) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: top + (t * (next + 0.5)) / STEP_COUNT, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + STEP_COUNT) % STEP_COUNT;
    goTo(next);
    document.getElementById(`lp-step-tab-${next}`)?.focus();
  };

  const doneCount = Object.values(done).filter(Boolean).length;
  const current = LESSON_STEPS[step];

  return (
    <section
      id="lp-lesson"
      ref={section}
      className="lp-lesson"
      data-sc-act="pin"
      data-sc-span="4.6"
      aria-labelledby="lp-lesson-title"
    >
      <div className="lp-lesson__stage" data-sc-stage>
        <header className="lp-lesson__head">
          <p className="lp-kicker lp-kicker--accent">Chuyên đề · tr. 06</p>
          <h2 id="lp-lesson-title" className="lp-h2">
            Một bài học, năm bước. <em>Bạn tự làm thử.</em>
          </h2>
          <p className="lp-lesson__intro">
            Đây là đúng thứ tự một bài học trong app. Cuộn để đi qua từng bước, hoặc bấm tên bước. Lề
            bên phải sẽ ghi lại những gì bạn làm.
          </p>
        </header>

        <div className="lp-spread">
          <div className="lp-steps" role="tablist" aria-label="Năm bước của một bài học" aria-orientation="vertical">
            {LESSON_STEPS.map((s, i) => (
              <button
                key={s.key}
                id={`lp-step-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={step === i}
                aria-controls="lp-step-panel"
                tabIndex={step === i ? 0 : -1}
                className="lp-steps__tab"
                data-done={done[s.key] || undefined}
                onClick={() => goTo(i)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <span className="lp-steps__num" aria-hidden="true">
                  {done[s.key] ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="lp-steps__name">{s.name}</span>
                <span className="lp-steps__title">{s.title}</span>
              </button>
            ))}
            <div className="lp-steps__meter" aria-hidden="true">
              <span style={{ transform: `scaleX(${(step + 1) / STEP_COUNT})` }} />
            </div>
          </div>

          <div
            id="lp-step-panel"
            className="lp-sheet"
            role="tabpanel"
            aria-labelledby={`lp-step-tab-${step}`}
          >
            <div className="lp-sheet__top">
              <span className="lp-sheet__folio">Bước {step + 1} · {current.name}</span>
              <span className="lp-sheet__hint">{current.hint}</span>
            </div>
            <div className="lp-sheet__body" key={current.key}>
              {current.key === 'card' && <CardStep onFlip={() => { finish('card'); note('flip', 0, 'Đã lật thẻ. Lần sau thử đoán nghĩa trước khi lật.'); }} onListen={() => note('listen', 0, 'Đã nghe phát âm: rɪ-ZIL-yənt.')} />}
              {current.key === 'story' && <StoryStep onGloss={() => { finish('story'); note('story', 1, 'Gặp lại từ trong ngữ cảnh. Đoán nghĩa từ câu chuyện trước khi mở chú thích.'); }} />}
              {current.key === 'quiz' && <QuizStep onAnswer={(tries) => { finish('quiz'); note('quiz', 2, tries === 1 ? 'Đúng ngay lần đầu. Từ này sẽ giãn lịch ôn nhanh.' : `Đúng ở lần thứ ${tries}. Trong app, từ này sẽ quay lại sớm hơn.`); }} />}
              {current.key === 'blank' && <BlankStep onSolved={(close) => { finish('blank'); note('blank', 3, close ? 'Gần đúng. Để ý chính tả: r-e-s-i-l-i-e-n-t.' : 'Gõ đúng chính tả, không cần gợi ý.'); }} />}
              {current.key === 'sentence' && <SentenceStep onWritten={() => { finish('sentence'); note('sentence', 4, 'Tự đặt được một câu của riêng bạn.'); }} />}
            </div>
            <div className="lp-sheet__nav">
              <button type="button" className="lp-link-btn" onClick={() => goTo(step - 1)} disabled={step === 0}>
                Bước trước
              </button>
              {step < STEP_COUNT - 1 ? (
                <button type="button" className="lp-btn lp-btn--ink lp-btn--sm" onClick={() => goTo(step + 1)}>
                  Bước tiếp <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>

          <aside className="lp-margin" aria-label="Lời phê">
            <p className="lp-margin__label">Lời phê</p>
            <ol className="lp-margin__notes" aria-live="polite">
              {notes.length === 0 && <li className="lp-margin__empty">Làm thử một bước, lời phê sẽ hiện ở đây.</li>}
              {notes.map((n) => (
                <li key={n.id} className="lp-margin__note">
                  <span className="lp-margin__step">B{n.step + 1}</span> {n.text}
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <Schedule visible={step === STEP_COUNT - 1 || doneCount === STEP_COUNT} doneCount={doneCount} onSave={onSave} />
      </div>
    </section>
  );
}

function CardStep({ onFlip, onListen }: { onFlip: () => void; onListen: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  return (
    <div className="lp-flash">
      <div className="lp-flash__card" data-flipped={flipped || undefined}>
        <div className="lp-flash__face lp-flash__front" aria-hidden={flipped}>
          <span className="lp-flash__word" lang="en">{LESSON_WORD.word}</span>
          <span className="lp-flash__ipa">{LESSON_WORD.ipa} · {LESSON_WORD.pos}</span>
        </div>
        <div className="lp-flash__face lp-flash__back" aria-hidden={!flipped}>
          <span className="lp-flash__meaning">{LESSON_WORD.meaning}</span>
          <span className="lp-flash__example" lang="en">{LESSON_WORD.example}</span>
        </div>
      </div>
      <div className="lp-flash__actions">
        <button
          type="button"
          className="lp-btn lp-btn--accent lp-btn--sm"
          aria-pressed={flipped}
          onClick={() => {
            setFlipped((f) => !f);
            if (!flipped) onFlip();
          }}
        >
          <RotateCcw size={16} aria-hidden="true" /> {flipped ? 'Lật lại' : 'Lật thẻ'}
        </button>
        <button
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={() => {
            if (speak(LESSON_WORD.word)) onListen();
            else setNoVoice(true);
          }}
        >
          <Volume2 size={16} aria-hidden="true" /> Nghe phát âm
        </button>
      </div>
      {noVoice && <p className="lp-field-msg" role="status">Trình duyệt này chưa đọc được tiếng Anh. Trong app, mỗi từ có sẵn phát âm.</p>}
    </div>
  );
}

function StoryStep({ onGloss }: { onGloss: () => void }) {
  const [open, setOpen] = useState(false);
  const [a, b, c, d] = LESSON_WORD.story;
  return (
    <div className="lp-story">
      <p className="lp-story__text" lang="en">
        {a} {b} {c}{' '}
        <button
          type="button"
          className="lp-story__word"
          aria-expanded={open}
          aria-controls="lp-gloss"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) onGloss();
          }}
        >
          {LESSON_WORD.word}
        </button>
        , {d}
      </p>
      <p id="lp-gloss" className="lp-story__gloss" hidden={!open}>
        <b lang="en">resilient</b> · {LESSON_WORD.meaning} Ở đây: cả làng gượng dậy rất nhanh sau cơn bão.
      </p>
    </div>
  );
}

function QuizStep({ onAnswer }: { onAnswer: (tries: number) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const solved = picked.some((k) => LESSON_WORD.quiz.find((q) => q.key === k)?.correct);
  const last = LESSON_WORD.quiz.find((q) => q.key === picked[picked.length - 1]);
  return (
    <div className="lp-quiz">
      <p className="lp-quiz__q">
        <span lang="en">resilient</span> nghĩa là gì?
      </p>
      <div className="lp-quiz__choices" role="group" aria-label="Chọn nghĩa đúng">
        {LESSON_WORD.quiz.map((q) => {
          const chosen = picked.includes(q.key);
          return (
            <button
              key={q.key}
              type="button"
              className="lp-choice"
              data-state={chosen ? (q.correct ? 'correct' : 'wrong') : undefined}
              disabled={solved || chosen}
              onClick={() => {
                const next = [...picked, q.key];
                setPicked(next);
                if (q.correct) onAnswer(next.length);
              }}
            >
              <span className="lp-choice__key">{q.key}</span>
              <span>{q.text}</span>
            </button>
          );
        })}
      </div>
      <p className="lp-field-msg" role="status" data-tone={last ? (last.correct ? 'ok' : 'bad') : undefined}>
        {!last ? '' : last.correct ? 'Chính xác.' : `Chưa đúng. ${last.note} Thử lại nhé.`}
      </p>
    </div>
  );
}

function BlankStep({ onSolved }: { onSolved: (close: boolean) => void }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'correct' | 'close' | 'wrong' | 'empty' | null>(null);
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setResult('empty');
      return;
    }
    const { grade } = gradeTypedAnswer(value, LESSON_WORD.word);
    setResult(grade);
    if (grade !== 'wrong') onSolved(grade === 'close');
  };
  const msg = {
    correct: 'Chính xác: resilient.',
    close: `Gần đúng. Từ đúng là "resilient".`,
    wrong: 'Chưa đúng. Gợi ý: bắt đầu bằng "res" và có 9 chữ cái.',
    empty: 'Bạn chưa gõ gì.',
  } as const;
  return (
    <form className="lp-blank" onSubmit={check} noValidate>
      <label htmlFor="lp-blank-input" className="lp-blank__sentence" lang="en">
        {LESSON_WORD.blank.before}{' '}
        <span className="lp-blank__gap" aria-hidden="true">______</span>{' '}
        {LESSON_WORD.blank.after}
        <span className="lp-sr"> Gõ từ còn thiếu.</span>
      </label>
      <div className="lp-blank__row">
        <input
          id="lp-blank-input"
          className="lp-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (result) setResult(null);
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="en"
          placeholder="r…"
          aria-invalid={result === 'wrong' || result === 'empty' ? true : undefined}
          aria-describedby="lp-blank-msg"
        />
        <button type="submit" className="lp-btn lp-btn--accent lp-btn--sm">Kiểm tra</button>
      </div>
      <p id="lp-blank-msg" className="lp-field-msg" role="status" data-tone={result ? (result === 'correct' || result === 'close' ? 'ok' : 'bad') : undefined}>
        {result ? msg[result] : ''}
      </p>
    </form>
  );
}

function SentenceStep({ onWritten }: { onWritten: () => void }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'ok' | 'missing' | 'short' | null>(null);
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (!findWordForm(value, LESSON_WORD.word)) setResult('missing');
    else if (words.length < 5) setResult('short');
    else {
      setResult('ok');
      onWritten();
    }
  };
  return (
    <form className="lp-sentence" onSubmit={check} noValidate>
      <label htmlFor="lp-sentence-input" className="lp-sentence__label">
        Viết một câu tiếng Anh có từ <b lang="en">resilient</b>, về bạn hoặc người bạn biết.
      </label>
      <textarea
        id="lp-sentence-input"
        className="lp-input lp-input--area"
        rows={3}
        lang="en"
        value={value}
        maxLength={240}
        placeholder="My grandmother is resilient because…"
        onChange={(e) => {
          setValue(e.target.value);
          if (result) setResult(null);
        }}
        aria-invalid={result === 'missing' || result === 'short' ? true : undefined}
        aria-describedby="lp-sentence-msg"
      />
      <div className="lp-blank__row">
        <button type="submit" className="lp-btn lp-btn--accent lp-btn--sm">Nộp câu</button>
      </div>
      <p id="lp-sentence-msg" className="lp-field-msg" role="status" data-tone={result ? (result === 'ok' ? 'ok' : 'bad') : undefined}>
        {result === 'ok' && 'Câu của bạn đã dùng từ resilient. Trong app, AI sẽ chấm câu này và gợi ý bản sửa tự nhiên hơn.'}
        {result === 'missing' && 'Câu chưa có từ resilient.'}
        {result === 'short' && 'Câu hơi ngắn. Thử viết ít nhất năm từ.'}
      </p>
    </form>
  );
}

function Schedule({ visible, doneCount, onSave }: { visible: boolean; doneCount: number; onSave: () => void }) {
  const dates = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' });
    const now = new Date();
    return SM2_STOPS.slice(1).map((s) => {
      const d = new Date(now);
      d.setDate(d.getDate() + s.day);
      return { label: s.label, date: fmt.format(d) };
    });
  }, []);
  return (
    <div className="lp-schedule" data-visible={visible || undefined}>
      <p className="lp-schedule__lead">
        <b>Lịch gặp lại resilient</b>, nếu lần nào bạn cũng nhớ. Bạn đã làm {doneCount}/{STEP_COUNT} bước.
      </p>
      <ol className="lp-schedule__stamps">
        {dates.map((d, i) => (
          <li key={d.label} className="lp-stamp" style={{ '--i': i } as React.CSSProperties}>
            <span>{d.date}</span>
            <small>sau {d.label}</small>
          </li>
        ))}
      </ol>
      <button type="button" className="lp-btn lp-btn--accent" onClick={onSave}>
        Lưu từ này vào sổ của bạn <ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
