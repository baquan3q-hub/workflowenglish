import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, MessageCircleQuestion, Sparkles, Target } from 'lucide-react';
import type { Lesson } from '../../data/grammar/types';
import { getMeta, stages } from '../../data/grammar/meta';
import { type LessonStats, type Snapshot, isDone } from '../../services/grammar/progress';
import WordPicker from '../ielts/WordPicker';
import { ghostBtn, primaryBtn, secondaryBtn } from '../ui/styles';
import AiProgress from '../ui/AiProgress';
import AiTutor from './AiTutor';
import { LESSON_STEPS, LEVEL_LABEL, Listen, Marked, QuestionCountPicker, StatusPill, StepDots, card, plain, stageTone } from './shared';
import { statusOf } from './GrammarPath';

interface Props {
  lesson: Lesson;
  step: number;
  setStep: (step: number) => void;
  stats: LessonStats;
  snap: Snapshot;
  user: string;
  theme: string;
  ieltsGoal: boolean;
  busy: boolean;
  aiBusy?: boolean;
  aiLabel?: string;
  onCancelAi?: () => void;
  questionCount: number;
  onChangeCount: (n: number) => void;
  savedAiCount?: number;
  backLabel: string;
  onBack: () => void;
  onPractice: (mode: 'learn' | 'review') => void;
  onGenerateDrills?: () => void;
  onOpenLesson: (id: string) => void;
  /** Step 6: the result of the latest practice in this lesson. */
  summary: React.ReactNode;
}

export default function LessonView(props: Props) {
  const { lesson, step, setStep, stats, snap, user, theme, busy, backLabel, onBack } = props;
  const [tutor, setTutor] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const tone = stageTone(lesson.stage);
  useEffect(() => {
    top.current?.scrollIntoView({ block: 'start' });
  }, [step]);
  return (
    <div ref={top} className="mx-auto flex w-full max-w-3xl scroll-mt-20 flex-col gap-4 pb-6 pt-1 sm:pb-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={ghostBtn + ' -ml-3'} onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
          </button>
          <button type="button" className={ghostBtn + ' -mr-3'} onClick={() => setTutor(true)}>
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" /> Hỏi AI
          </button>
        </div>
        <div className={'rounded-2xl border p-4 ' + tone.border + ' ' + tone.bg}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={'text-xs font-bold uppercase tracking-wide ' + tone.fg}>
              {stages[lesson.stage].title} · {lesson.cefr}
            </span>
            <StatusPill status={statusOf(snap, lesson.id)} />
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{lesson.title}</h1>
          <p lang="en" className="text-sm text-slate-600 dark:text-slate-300">
            {lesson.en}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-slate-800 dark:text-slate-100">
            <Target className={'mt-0.5 h-4 w-4 shrink-0 ' + tone.fg} aria-hidden="true" />
            <span>
              <b>Học xong bạn:</b> {lesson.hook}
            </span>
          </p>
        </div>
        <StepDots step={step} onPick={setStep} />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Bước {step + 1}/{LESSON_STEPS.length} · {LESSON_STEPS[step]}
        </p>
      </header>

      {step === 0 && <WhenWhy {...props} />}
      {step === 1 && <Forms lesson={lesson} />}
      {step === 2 && <Examples lesson={lesson} user={user} />}
      {step === 3 && <Contrast {...props} />}
      {step === 4 && <Practice {...props} />}
      {step === 5 && props.summary}

      {step < 4 && (
        <nav className="flex gap-2" aria-label="Chuyển bước">
          {step > 0 && (
            <button type="button" className={secondaryBtn + ' flex-1'} onClick={() => setStep(step - 1)}>
              Quay lại
            </button>
          )}
          <button type="button" className={primaryBtn + ' flex-[2]'} disabled={busy} onClick={() => setStep(step + 1)}>
            {LESSON_STEPS[step + 1]} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      <AiTutor open={tutor} onClose={() => setTutor(false)} lesson={lesson} theme={theme} />
    </div>
  );
}

function WhenWhy({ lesson, snap, onOpenLesson }: Props) {
  const missing = lesson.prereq.filter((id) => !isDone(snap, id)).map((id) => getMeta(id)!);
  return (
    <>
      {missing.length > 0 && (
        <aside className="rounded-2xl border border-tone-butter-border bg-tone-butter p-3 text-sm text-slate-800 dark:text-slate-100">
          <p className="font-semibold text-tone-butter-fg">Nên học trước</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {missing.map((m) => (
              <button key={m.id} type="button" className="press min-h-touch rounded-lg bg-white/70 px-3 font-semibold text-tone-butter-fg dark:bg-slate-900/60" onClick={() => onOpenLesson(m.id)}>
                {m.title}
              </button>
            ))}
          </div>
        </aside>
      )}
      <section className={card}>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Khi nào dùng</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {lesson.when.map((w) => (
            <li key={w} className="flex gap-2 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tone-periwinkle-fg" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Vì sao lại như vậy</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">{lesson.why}</p>
      </section>
    </>
  );
}

function Forms({ lesson }: { lesson: Lesson }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {lesson.forms.map((f) => (
        <article key={f.label} className={card}>
          <p className="text-xs font-bold uppercase tracking-wide text-tone-periwinkle-fg">{f.label}</p>
          <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[15px] text-slate-900 dark:bg-slate-950 dark:text-white">{f.pattern}</p>
          <div className="mt-1 flex items-center gap-1">
            <p lang="en" className="flex-1 text-[15px] text-slate-700 dark:text-slate-200">
              {f.example}
            </p>
            <Listen text={f.example} />
          </div>
        </article>
      ))}
    </section>
  );
}

function Examples({ lesson, user }: { lesson: Lesson; user: string }) {
  const [note, setNote] = useState('');
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">Phần tô màu là chỗ cần chú ý. Chạm vào để xem nó ứng với công thức nào, bấm loa để nghe.</p>
      {lesson.examples.map((e) => (
        <article key={e.en} className={card + ' flex items-start gap-2'}>
          <div className="flex-1">
            <p lang="en" className="text-base leading-relaxed text-slate-900 dark:text-white">
              <Marked
                text={e.en}
                onMark={(part) => {
                  const form = lesson.forms.find((f) => f.example.toLowerCase().includes(part.toLowerCase())) ?? lesson.forms[0];
                  setNote('"' + part + '" · ' + form.label + ': ' + form.pattern);
                }}
              />
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{e.vi}</p>
          </div>
          <Listen text={e.en} />
        </article>
      ))}
      {note && (
        <p aria-live="polite" className="rounded-xl bg-tone-butter p-3 font-mono text-sm text-slate-800 dark:text-slate-100">
          {note}
        </p>
      )}
      <WordPicker userId={user} text={lesson.examples.map((e) => plain(e.en)).join(' ')} />
    </section>
  );
}

function Contrast({ lesson, ieltsGoal, onOpenLesson }: Props) {
  const other = lesson.contrast?.with ? getMeta(lesson.contrast.with) : undefined;
  return (
    <>
      {lesson.contrast && (
        <section className={card}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{lesson.contrast.title}</h2>
          <p className="mt-1 text-[15px] text-slate-800 dark:text-slate-100">{lesson.contrast.rule}</p>
          <div className="mt-3 flex flex-col gap-3">
            {lesson.contrast.pairs.map((p) => (
              <div key={p.a} className="grid gap-2 sm:grid-cols-2">
                <p lang="en" className="rounded-xl bg-tone-sky p-3 text-[15px] text-slate-900 dark:text-white">
                  <span className="mb-1 block text-xs font-bold text-tone-sky-fg">A</span>
                  {p.a}
                </p>
                <p lang="en" className="rounded-xl bg-tone-lavender p-3 text-[15px] text-slate-900 dark:text-white">
                  <span className="mb-1 block text-xs font-bold text-tone-lavender-fg">B</span>
                  {p.b}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">{p.meaning}</p>
              </div>
            ))}
          </div>
          {other && (
            <button type="button" className={ghostBtn + ' mt-2 -ml-3'} onClick={() => onOpenLesson(other.id)}>
              Xem bài dễ nhầm: {other.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </section>
      )}
      <section className={card}>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Lỗi người Việt hay gặp</h2>
        <ul className="mt-2 flex flex-col gap-3">
          {lesson.traps.map((t) => (
            <li key={t.wrong} className="flex flex-col gap-1">
              <p lang="en" className="text-[15px] text-tone-blush-fg">
                <span aria-hidden="true">✗ </span>
                <del>{t.wrong}</del>
              </p>
              <p lang="en" className="text-[15px] font-semibold text-tone-mint-fg">
                <span aria-hidden="true">✓ </span>
                {t.right}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{t.why}</p>
            </li>
          ))}
        </ul>
      </section>
      {lesson.ielts && (
        <section className={'rounded-2xl border p-4 ' + (ieltsGoal ? 'border-tone-peach-border bg-tone-peach' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}>
          <h2 className="text-base font-bold text-tone-peach-fg">Dùng trong IELTS</h2>
          <p className="mt-1 text-[15px] text-slate-800 dark:text-slate-100">{lesson.ielts}</p>
        </section>
      )}
    </>
  );
}

function Practice({ lesson, stats, busy, aiBusy, aiLabel, onCancelAi, questionCount, onChangeCount, savedAiCount, onPractice, onGenerateDrills }: Props) {
  const counts = ([1, 2, 3, 4, 5] as const).map((lv) => ({ lv, n: lesson.items.filter((i) => i.level === lv && !i.review).length }));
  return (
    <section className={card + ' flex flex-col gap-4'}>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Luyện theo thang, từ dễ đến tự làm</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Làm sai hai câu liên tiếp, bài tự lùi về câu dễ hơn và hiện lại mẫu. Làm đúng liên tục thì bỏ bớt câu nhận biết. Câu sai tự vào Sổ lỗi.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {counts.map(({ lv, n }) => (
          <li key={lv} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tone-periwinkle-soft text-sm font-bold text-tone-periwinkle-fg">{lv}</span>
            <span className="flex-1 text-[15px] text-slate-800 dark:text-slate-100">{LEVEL_LABEL[lv]}</span>
            <span className="text-xs text-slate-500">{n} câu trong kho</span>
          </li>
        ))}
      </ol>
      <QuestionCountPicker count={questionCount} onChange={onChangeCount} disabled={busy || aiBusy} />
      <div className="flex flex-col gap-2">
        <button type="button" className={primaryBtn} disabled={busy || aiBusy} onClick={() => onPractice('learn')}>
          {stats.studied ? `Luyện thêm câu mới (${questionCount} câu)` : `Bắt đầu luyện tập (${questionCount} câu)`}
        </button>
        {stats.studied && (
          <button type="button" className={secondaryBtn} disabled={busy || aiBusy} onClick={() => onPractice('review')}>
            Ôn nhanh câu đã sai và câu ôn trễ ({questionCount} câu)
          </button>
        )}
        {onGenerateDrills && (
          <button type="button" className={secondaryBtn} disabled={busy || aiBusy} onClick={onGenerateDrills}>
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin text-tone-periwinkle-fg" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-tone-periwinkle-fg" aria-hidden="true" />}
            {aiBusy ? `AI đang tạo ${questionCount} câu luyện…` : `AI tạo ${questionCount} câu theo sở thích & lỗi sai`}
          </button>
        )}
      </div>
      {aiBusy && (
        <AiProgress
          tone="periwinkle"
          label={aiLabel || `AI đang tạo ${questionCount} câu luyện cá nhân hóa…`}
          stages={['Phân tích lỗi sai', 'Tránh lặp câu đã làm', 'Soạn bài mới']}
          estimatedMs={12_000}
          onCancel={onCancelAi}
        />
      )}
      {!!savedAiCount && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Đã lưu {savedAiCount} câu AI riêng cho bạn ở bài này — bộ câu mới sẽ tránh lặp lại và bám sát lỗi sai.
        </p>
      )}
    </section>
  );
}
