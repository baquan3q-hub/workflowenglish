/**
 * "Ôn tập Reading": four short drills on the app's own passages.
 * - Câu sai đến hạn: questions missed in tests come back at 1, 3, 7 and 21
 *   days; the learner first finds the sentence that holds the answer.
 * - T / F / NG: one statement and its paragraph at a time, with the evidence
 *   marked and the usual mistake named.
 * - Paraphrase: match the question's words to the passage's words.
 * - Đọc nhanh: chunks at a set pace or self-paced with a clock, then "which
 *   paragraph says…?".
 * The schedule is kept on this device; misses are read again from the
 * learner's saved attempts, so a new device rebuilds it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Gauge, HeartCrack, Pause, Play, RotateCcw, Search, Sparkles, Square, Timer, Trophy, X, Zap } from 'lucide-react';
import { READING_TESTS, type ReadingPassage } from '../data/ielts/reading';
import { isReadingDetails, passageWordCount, readingAnswerLabel, readingQuestionContext } from '../services/readingLogic';
import { readingReviewApi, type ReadingReviewApi } from '../services/readingReviewService';
import { markSegments, reviewMarks, tfngVerdict, TFNG_VERDICT_LABELS, type ReviewMark } from '../services/readingReview';
import {
  addMisses,
  chunkDelayMs,
  chunkPassage,
  dueCards,
  evidenceSentences,
  findQuestion,
  locateQuiz,
  nextDue,
  paceVi,
  paraphrasePairs,
  paraphraseRound,
  REVIEW_DAYS,
  reviewCard,
  splitSentences,
  syncAttempts,
  TARGET_WPM,
  tfngChoices,
  tfngMistakeVi,
  tfngPool,
  tfngRound,
  wordsPerMinute,
  WPM_OPTIONS,
  type ReviewDeck,
  type TfngValue,
} from '../services/readingReviewLogic';
import { GROUP_KINDS } from '../components/ielts/questions/parts';
import { readingGroupKind } from '../components/ielts/questions/questionLogic';
import { Segmented } from '../components/ui/Segmented';
import { RunHud, useGameRun, XpBar } from '../components/ielts/review/GameHud';
import SwipeCard, { type SwipeDir } from '../components/ielts/review/SwipeCard';
import { comboCheer, outOfHearts } from '../services/reviewGameLogic';
import { saveBest, useGameProfile } from '../services/reviewGameService';
import { toneClasses } from '../components/ui/palette';
import { field, ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../components/ui/styles';

type Tab = 'review' | 'tfng' | 'paraphrase' | 'speed';

interface Props {
  userId: string;
  onBack: () => void;
  api?: ReadingReviewApi;
}

const newSeed = () => Math.floor(Math.random() * 1e9);

/** A paragraph with its marks drawn in, for the feedback after an answer. */
function MarkedText({ text, marks }: { text: string; marks: readonly ReviewMark[] }) {
  return (
    <>
      {markSegments(text, marks).map((s) =>
        s.kind ? (
          <mark
            key={s.start}
            className={s.kind === 'evidence' ? 'rounded-sm bg-tone-mint-soft px-0.5 font-medium text-slate-900 ring-1 ring-tone-mint-border dark:text-white' : 'rounded-sm bg-tone-blush-soft px-0.5 text-inherit underline decoration-tone-blush-fg decoration-wavy underline-offset-4'}
          >
            {s.text}
          </mark>
        ) : (
          <React.Fragment key={s.start}>{s.text}</React.Fragment>
        ),
      )}
    </>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold ${toneClasses(ok ? 'mint' : 'blush').surface}`}>
      {ok ? <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-mint-fg" aria-hidden /> : <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-blush-fg" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

function Progress({ at, total }: { at: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={at}>
        <div className="h-full rounded-full bg-tone-periwinkle-fg transition-all" style={{ width: `${total ? (at / total) * 100 : 0}%` }} />
      </div>
      <span className="text-caption tabular-nums text-slate-600 dark:text-slate-400">
        {at}/{total}
      </span>
    </div>
  );
}

// --- Missed questions -------------------------------------------------------------

function MissedReview({ userId, deck, onDeck, loading, quiet }: { userId: string; deck: ReviewDeck; onDeck: (d: ReviewDeck) => void; loading: boolean; quiet: boolean }) {
  const game = useGameRun(userId, 0);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<{ para: string; sentence: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ good: 0, again: 0 });
  const [bonus, setBonus] = useState(0);
  const done = !!queue && index >= queue.length;
  const { finish } = game;
  // The round is over however the last card ended (rated or skipped): pay the bonus once.
  useEffect(() => {
    if (done) setBonus(finish());
  }, [done, finish]);

  const due = useMemo(() => dueCards(deck, new Date()), [deck]);
  const start = () => {
    setQueue(due.slice(0, 10).map((c) => c.key));
    setIndex(0);
    setPicked(null);
    setRevealed(false);
    setResults({ good: 0, again: 0 });
    game.reset();
  };

  if (!queue) {
    const next = nextDue(deck, new Date());
    const total = Object.keys(deck.cards).length;
    return (
      <section className={`${panel} space-y-3 p-4 sm:p-5`}>
        <h2 className="text-title font-semibold text-slate-900 dark:text-white">Câu sai đến hạn ôn</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Câu bạn làm sai trong đề Reading sẽ quay lại sau {REVIEW_DAYS.join(', ')} ngày. Mỗi lần, hãy tìm câu trong bài chứa đáp án trước khi xem lời giải: đó chính là kỹ năng scan khi đi thi.
        </p>
        {loading ? (
          <p className="text-sm text-slate-500">Đang đọc lại các bài đã làm…</p>
        ) : due.length ? (
          <button type="button" className={primaryBtn} onClick={start}>
            <Play className="h-4 w-4" aria-hidden /> Ôn {Math.min(10, due.length)} câu{due.length > 10 ? ` (còn ${due.length - 10} câu)` : ''}
          </button>
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            {total ? `Không có câu nào đến hạn. Lần ôn tới: ${next?.toLocaleDateString('vi-VN') ?? '—'}.` : 'Chưa có câu sai nào. Làm một đề hoặc một passage, câu sai sẽ tự vào đây. Trong lúc chờ, thử T/F/NG hoặc Paraphrase.'}
          </p>
        )}
        <p className="flex flex-wrap gap-2 text-caption text-slate-600 dark:text-slate-400">
          <span className={tag}>{total} câu đang ôn</span>
          {deck.mastered > 0 && (
            <span className={tag}>
              <Trophy className="h-3 w-3" aria-hidden /> {deck.mastered} câu đã thuộc
            </span>
          )}
        </p>
      </section>
    );
  }

  if (index >= queue.length) {
    return (
      <section className={`${panel} space-y-3 p-5 text-center`}>
        <Trophy className="mx-auto h-8 w-8 text-tone-butter-fg" aria-hidden />
        <h2 className="text-title font-semibold text-slate-900 dark:text-white">Xong lượt ôn</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Đã nắm {results.good} câu, cần ôn lại {results.again} câu (sẽ quay lại ngày mai).
        </p>
        <p className={`${tag} mx-auto w-fit font-semibold`}>
          <Sparkles className="h-3 w-3" aria-hidden /> +{game.run.xp + bonus} XP
        </p>
        <button type="button" className={secondaryBtn} onClick={() => setQueue(null)}>
          Về danh sách
        </button>
      </section>
    );
  }

  const found = findQuestion(queue[index]);
  if (!found) {
    // Its test was taken out of the library during the session.
    return (
      <button type="button" className={secondaryBtn} onClick={() => setIndex(index + 1)}>
        Câu này không còn trong thư viện, bỏ qua <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    );
  }
  const { passage, group, question, test } = found;
  const hit = evidenceSentences(paragraphText(passage, question.paragraph), question.evidence);
  const correctPick = !!picked && picked.para === question.paragraph && hit.includes(picked.sentence);
  const marks = reviewMarks(passage, question);
  const options = question.options ?? (group.type === 'matching' || group.type === 'mcq_multi' ? group.options : group.type === 'headings' ? group.headings : group.type === 'completion' ? group.wordBox : undefined);
  const verdict = group.type === 'tfng' ? tfngVerdict(question.answers[0]) : null;

  const rate = (result: 'again' | 'good') => {
    onDeck(reviewCard(deck, found.key, result, new Date()));
    // Found the sentence first: full XP. Knew it only after the answer was shown: counted as a hint.
    game.answer({ correct: result === 'good', hintsUsed: result === 'good' && !correctPick ? 1 : 0 }, `m:${found.key}`);
    setResults((r) => ({ ...r, [result]: r[result] + 1 }));
    setIndex(index + 1);
    setPicked(null);
    setRevealed(false);
  };

  return (
    <section className="space-y-4">
      <RunHud run={game.run} gained={game.gained} pulse={game.pulse} quiet={quiet} hearts={false} repeat={game.repeat} />
      <Progress at={index} total={queue.length} />
      <div className={`${panel} space-y-2 p-4`}>
        <p className="flex flex-wrap items-center gap-2 text-caption text-slate-600 dark:text-slate-400">
          <span className={tag}>{GROUP_KINDS[readingGroupKind(group)].label}</span>
          <span>
            {test.title} · {passage.title}
          </span>
        </p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {question.number}. {readingQuestionContext(group, question) || group.instruction}
        </p>
        {options && options.length > 0 && (
          <ul className="space-y-0.5 text-caption text-slate-600 dark:text-slate-300">
            {options.map((o) => (
              <li key={o.key}>
                <b>{o.key}.</b> {o.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!revealed ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Search className="h-4 w-4 text-tone-sky-fg" aria-hidden /> Bấm vào câu trong bài chứa đáp án.
          </p>
          <div className={`${panel} max-h-[55vh] space-y-3 overflow-y-auto p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200`}>
            {passage.paragraphs.map((p) => (
              <p key={p.label}>
                <b className="mr-1 text-slate-500">{p.label}</b>
                {splitSentences(p.text).map((s, i) => (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => {
                      setPicked({ para: p.label, sentence: i });
                      setRevealed(true);
                    }}
                    className="rounded px-0.5 text-left hover:bg-tone-sky-soft focus-visible:bg-tone-sky-soft"
                  >
                    {s.text}
                  </button>
                ))}
              </p>
            ))}
          </div>
          <button type="button" className={ghostBtn} onClick={() => setRevealed(true)}>
            Không tìm được, xem đáp án
          </button>
        </>
      ) : (
        <div className="space-y-3">
          {picked ? (
            <Verdict ok={correctPick}>{correctPick ? 'Tìm đúng câu chứa đáp án!' : `Chưa đúng chỗ: đáp án nằm ở đoạn ${question.paragraph}.`}</Verdict>
          ) : null}
          <div className={`${panel} space-y-3 p-4`}>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              Đáp án: <b>{options?.length || (group.type === 'matching' && group.target === 'paragraph') ? readingAnswerLabel(group, question, question.answers.join(',')) : question.answers.join(' / ')}</b>
              {verdict && <span className="ml-2 text-caption text-slate-500">({TFNG_VERDICT_LABELS[verdict]})</span>}
            </p>
            <blockquote className="border-l-4 border-tone-mint-border pl-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <b className="mr-1 text-slate-500">{question.paragraph}</b>
              <MarkedText text={paragraphText(passage, question.paragraph)} marks={marks[question.paragraph] ?? []} />
            </blockquote>
            {question.paraphrase && (
              <p className="text-caption text-slate-600 dark:text-slate-300">
                Đề nói “{question.paraphrase.question}” → bài viết “{question.paraphrase.passage}”.
              </p>
            )}
            <p className="text-sm text-slate-700 dark:text-slate-300">{question.explanationVi}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={correctPick ? secondaryBtn : primaryBtn} onClick={() => rate('again')}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Ôn lại ngày mai
            </button>
            <button type="button" className={correctPick ? primaryBtn : secondaryBtn} onClick={() => rate('good')}>
              <Check className="h-4 w-4" aria-hidden /> Đã nắm
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const paragraphText = (passage: ReadingPassage, label: string) => passage.paragraphs.find((p) => p.label === label)?.text ?? '';

// --- TRUE / FALSE / NOT GIVEN ---------------------------------------------------------

function TfngDrill({ userId, deck, onMiss, quiet, best }: { userId: string; deck: ReviewDeck; onMiss: (key: string) => void; quiet: boolean; best?: number }) {
  const pool = useMemo(() => tfngPool(), []);
  // Questions under review come first. The round is fixed when it starts, so a miss does not reshuffle it.
  const newRound = () => tfngRound(pool, new Set(Object.keys(deck.cards)), 8, newSeed());
  const [round, setRound] = useState(newRound);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TfngValue[]>([]);
  const [shake, setShake] = useState(0);
  const [result, setResult] = useState<{ bonus: number; record: boolean } | null>(null);
  const game = useGameRun(userId);
  const item = round[index];
  const given = answers[index];
  const over = index >= round.length || (outOfHearts(game.run) && !given);

  const choose = (v: TfngValue) => {
    if (given || !item) return;
    setAnswers((a) => [...a, v]);
    const ok = v === item.answer;
    game.answer({ correct: ok }, `t:${item.key}`);
    if (!ok) {
      onMiss(item.key);
      setShake((n) => n + 1);
    }
  };
  const choices = item ? tfngChoices(item.variant) : [];
  // Left = FALSE/NO, right = TRUE/YES, up = NOT GIVEN.
  const byDir: Record<SwipeDir, TfngValue> = { left: choices[1], right: choices[0], up: choices[2] };
  const onSwipe = (dir: SwipeDir) => choose(byDir[dir]);

  useEffect(() => {
    if (!over || result || !round.length) return;
    const bonus = game.finish();
    setResult({ bonus, record: saveBest(userId, 'tfng', game.run.xp + bonus) });
  }, [over, result, round.length, game, userId]);

  const restart = () => {
    setRound(newRound());
    setIndex(0);
    setAnswers([]);
    setShake(0);
    setResult(null);
    game.reset();
  };

  if (!round.length) return <p className="text-sm text-slate-600">Chưa có câu TRUE/FALSE/NOT GIVEN.</p>;
  if (over) {
    const done = round.slice(0, answers.length);
    const right = answers.filter((a, i) => a === round[i].answer).length;
    const ng = done.map((r, i) => [r, answers[i]] as const).filter(([r]) => r.answer === 'NOT GIVEN');
    const ngRight = ng.filter(([r, a]) => a === r.answer).length;
    const lost = answers.length < round.length;
    return (
      <section className={`${panel} space-y-3 p-5 text-center`}>
        {lost ? <HeartCrack className="mx-auto h-8 w-8 text-tone-blush-fg" aria-hidden /> : <Trophy className="mx-auto h-8 w-8 text-tone-butter-fg" aria-hidden />}
        <p className="text-heading font-bold text-slate-900 dark:text-white">
          {lost ? 'Hết tim!' : `${right}/${round.length}`}
        </p>
        <p className="flex flex-wrap justify-center gap-2 text-sm">
          <span className={`${tag} font-semibold`}>
            <Sparkles className="h-3 w-3" aria-hidden /> +{game.run.xp + (result?.bonus ?? 0)} XP
          </span>
          {game.run.bestCombo >= 3 && (
            <span className={tag}>
              <Zap className="h-3 w-3" aria-hidden /> Combo {game.run.bestCombo}
            </span>
          )}
          {result?.record ? <span className={`${tag} text-tone-peach-fg`}>Kỷ lục mới!</span> : best !== undefined && <span className={tag}>Kỷ lục {best} XP</span>}
        </p>
        {ng.length > 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            NOT GIVEN: đúng {ngRight}/{ng.length}. {ngRight < ng.length ? 'Câu NOT GIVEN là chỗ dễ mất điểm nhất: chỉ chọn TRUE/FALSE khi bài thật sự nói tới.' : 'Tốt lắm, bạn phân biệt được FALSE và NOT GIVEN.'}
          </p>
        )}
        {lost && <p className="text-sm text-slate-600 dark:text-slate-300">Sai 3 câu là hết lượt. Đọc kỹ lời giải rồi chơi vòng mới nhé.</p>}
        {answers.length > right && <p className="text-caption text-slate-500">Câu sai đã được thêm vào mục Câu sai đến hạn.</p>}
        <button type="button" className={primaryBtn} onClick={restart}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Vòng mới
        </button>
      </section>
    );
  }

  const marks = reviewMarks({ paragraphs: [item.paragraph] }, { paragraph: item.paragraph.label, evidence: item.evidence })[item.paragraph.label] ?? [];
  const ok = given === item.answer;
  return (
    <section className="space-y-4">
      <RunHud run={game.run} gained={game.gained} pulse={game.pulse} quiet={quiet} repeat={game.repeat} />
      <Progress at={index} total={round.length} />
      <p className="text-caption text-slate-600 dark:text-slate-400">
        {item.passageTitle} · đoạn {item.paragraph.label} · {item.variant === 'ynng' ? 'ý kiến của tác giả (YES/NO)' : 'thông tin (TRUE/FALSE)'}
      </p>
      <div className={`${panel} p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200`}>{given ? <MarkedText text={item.paragraph.text} marks={marks} /> : item.paragraph.text}</div>
      <SwipeCard
        labels={{ left: byDir.left, right: byDir.right, up: byDir.up }}
        onSwipe={onSwipe}
        disabled={!!given}
        quiet={quiet}
        shakeKey={shake}
        autoFocus={index > 0}
        label={`Câu ${index + 1}: ${item.statement}`}
        resultClass={given ? toneClasses(ok ? 'mint' : 'blush').surface : toneClasses('sky').surface}
      >
        {item.statement}
        {!given && <span className="mt-2 block text-caption font-normal text-slate-500 dark:text-slate-400">Quẹt trái: {byDir.left} · phải: {byDir.right} · lên: {byDir.up} (hoặc phím mũi tên)</span>}
      </SwipeCard>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Chọn đáp án">
        {(['left', 'up', 'right'] as const).map((dir) => {
          const c = byDir[dir];
          const state = !given ? '' : c === item.answer ? toneClasses('mint').surface : c === given ? toneClasses('blush').surface : 'opacity-60';
          return (
            <button key={c} type="button" disabled={!!given} onClick={() => choose(c)} className={`${secondaryBtn} px-2 text-xs sm:text-sm ${state}`} aria-pressed={given === c}>
              {dir === 'left' ? '← ' : dir === 'up' ? '↑ ' : ''}
              {c}
              {dir === 'right' ? ' →' : ''}
            </button>
          );
        })}
      </div>
      {given && (
        <div className="space-y-2">
          <Verdict ok={ok}>{ok ? (comboCheer(game.run.combo) || 'Chính xác!') : `Đáp án: ${item.answer}. ${tfngMistakeVi(given, item.answer)}`}</Verdict>
          <p className="text-sm text-slate-700 dark:text-slate-300">{item.explanationVi}</p>
          <button type="button" className={primaryBtn} onClick={() => setIndex(index + 1)} autoFocus>
            {outOfHearts(game.run) ? 'Xem kết quả' : 'Câu tiếp'} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

// --- Paraphrase ------------------------------------------------------------------------

const fmtTime = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function ParaphraseDrill({ userId, quiet, best }: { userId: string; quiet: boolean; best?: number }) {
  const pool = useMemo(() => paraphrasePairs(), []);
  const [seed, setSeed] = useState(newSeed);
  const round = useMemo(() => paraphraseRound(pool, 5, seed), [pool, seed]);
  const [left, setLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  // The clock starts at the first pick, not when the screen opens.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ ms: number; bonus: number; record: boolean } | null>(null);
  const game = useGameRun(userId, 0);
  const done = round.pairs.length > 0 && matched.length === round.pairs.length;
  const wrongTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(wrongTimer.current), []);

  useEffect(() => {
    if (startedAt === null || done) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [startedAt, done]);

  useEffect(() => {
    if (!done || result) return;
    const ms = Date.now() - (startedAt ?? Date.now());
    const bonus = game.finish();
    // A time counts as a record only for a round without mistakes.
    setResult({ ms, bonus, record: mistakes === 0 && saveBest(userId, 'paraphrase-ms', ms, true) });
  }, [done, result, startedAt, game, mistakes, userId]);

  const pickLeft = (key: string) => {
    if (startedAt === null) {
      setStartedAt(Date.now());
      setNow(Date.now());
    }
    setLeft(key);
  };
  const pickRight = (key: string) => {
    if (!left || matched.includes(key)) return;
    if (key === left) {
      setMatched((m) => [...m, key]);
      setLeft(null);
      game.answer({ correct: true }, `p:${key}`);
    } else {
      setMistakes((n) => n + 1);
      setWrong(key);
      game.answer({ correct: false });
      clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setWrong(null), 600);
    }
  };
  const restart = () => {
    setSeed(newSeed());
    setLeft(null);
    setMatched([]);
    setWrong(null);
    setMistakes(0);
    setStartedAt(null);
    setResult(null);
    game.reset();
  };

  const cell = (active: boolean, isDone: boolean, isWrong: boolean) =>
    `w-full rounded-xl border p-3 text-left text-sm transition ${isDone ? `${toneClasses('mint').surface} opacity-70` : isWrong ? `${toneClasses('blush').surface} ${quiet ? '' : 'anim-shake'}` : active ? toneClasses('periwinkle').surface : 'border-slate-200 bg-white hover:border-tone-periwinkle-border dark:border-slate-700 dark:bg-slate-900'}`;
  const elapsed = result ? result.ms : startedAt === null ? 0 : now - startedAt;

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Đề IELTS hầu như không lặp lại chữ của bài: nó nói cùng ý bằng từ khác. Chọn một cụm của đề (trái), rồi cụm trong bài có cùng nghĩa (phải). Đồng hồ chạy từ lần chọn đầu tiên.
      </p>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          <Timer className="h-4 w-4 text-tone-sky-fg" aria-hidden /> {fmtTime(elapsed)}
        </span>
        {best !== undefined && <span className="text-caption text-slate-500">Kỷ lục {fmtTime(best)}</span>}
        <div className="flex-1">
          <RunHud run={game.run} gained={game.gained} pulse={game.pulse} quiet={quiet} hearts={false} repeat={game.repeat} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-slate-500">Đề viết</p>
          {round.pairs.map((p) => (
            <button key={p.key} type="button" disabled={matched.includes(p.key)} onClick={() => pickLeft(p.key)} className={cell(left === p.key, matched.includes(p.key), false)} aria-pressed={left === p.key}>
              {p.question}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-slate-500">Bài viết</p>
          {round.right.map((p) => (
            <button key={p.key} type="button" disabled={matched.includes(p.key) || !left} onClick={() => pickRight(p.key)} className={cell(false, matched.includes(p.key), wrong === p.key)}>
              {p.passage}
            </button>
          ))}
        </div>
      </div>
      {done ? (
        <div className="space-y-3">
          <Verdict ok={mistakes === 0}>
            {mistakes === 0 ? `Ghép đúng hết ngay lần đầu, trong ${fmtTime(result?.ms ?? elapsed)}!` : `Xong trong ${fmtTime(result?.ms ?? elapsed)}, với ${mistakes} lần ghép nhầm.`}
          </Verdict>
          <p className="flex flex-wrap gap-2 text-sm">
            <span className={`${tag} font-semibold`}>
              <Sparkles className="h-3 w-3" aria-hidden /> +{game.run.xp + (result?.bonus ?? 0)} XP
            </span>
            {result?.record && <span className={`${tag} text-tone-peach-fg`}>Kỷ lục thời gian mới!</span>}
            {mistakes > 0 && <span className="text-caption text-slate-500">Ghép đúng hết không nhầm lần nào mới được tính kỷ lục.</span>}
          </p>
          <ul className={`${panel} divide-y divide-slate-100 text-sm dark:divide-slate-800`}>
            {round.pairs.map((p) => (
              <li key={p.key} className="p-3">
                <span className="text-slate-900 dark:text-white">{p.question}</span>
                <span className="mx-2 text-slate-400">→</span>
                <span className="text-tone-mint-fg">{p.passage}</span>
                <span className="block text-caption text-slate-500">{p.passageTitle}</span>
              </li>
            ))}
          </ul>
          <button type="button" className={primaryBtn} onClick={restart}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Vòng mới
          </button>
        </div>
      ) : (
        <Progress at={matched.length} total={round.pairs.length} />
      )}
    </section>
  );
}

// --- Speed reading ------------------------------------------------------------------------

const ALL_PASSAGES = READING_TESTS.flatMap((test) => test.passages.map((passage) => ({ test, passage, words: passageWordCount(passage) })));

function SpeedReader() {
  const [choice, setChoice] = useState(0);
  const [mode, setMode] = useState<'pacer' | 'self'>('pacer');
  const [wpm, setWpm] = useState<number>(TARGET_WPM);
  const [phase, setPhase] = useState<'setup' | 'reading' | 'quiz'>('setup');
  const [paused, setPaused] = useState(false);
  const [at, setAt] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [pausedFor, setPausedFor] = useState(0);
  const pauseStart = useRef(0);
  const [seconds, setSeconds] = useState(0);
  const [quizSeed, setQuizSeed] = useState(newSeed);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  const { test, passage, words } = ALL_PASSAGES[choice];
  const chunks = useMemo(() => chunkPassage(passage.paragraphs, 3), [passage]);
  const quiz = useMemo(() => locateQuiz(passage, test.id, 3, quizSeed), [passage, test.id, quizSeed]);

  const finish = useCallback(() => {
    setSeconds(Math.max(1, Math.round((Date.now() - startedAt - pausedFor) / 1000)));
    setPhase('quiz');
  }, [startedAt, pausedFor]);

  // The pacer: one chunk after another at the chosen speed.
  useEffect(() => {
    if (phase !== 'reading' || mode !== 'pacer' || paused) return;
    if (at >= chunks.length) {
      finish();
      return;
    }
    const id = window.setTimeout(() => setAt((n) => n + 1), chunkDelayMs(chunks[at].text, wpm));
    return () => window.clearTimeout(id);
  }, [phase, mode, paused, at, chunks, wpm, finish]);

  // The self-paced clock.
  const [, tick] = useState(0);
  useEffect(() => {
    if (phase !== 'reading' || mode !== 'self') return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, mode]);

  const begin = () => {
    setAt(0);
    setPaused(false);
    setPausedFor(0);
    setStartedAt(Date.now());
    setQuizAnswers({});
    setQuizSeed(newSeed());
    setPhase('reading');
  };
  const togglePause = () => {
    if (paused) setPausedFor((p) => p + Date.now() - pauseStart.current);
    else pauseStart.current = Date.now();
    setPaused(!paused);
  };

  if (phase === 'setup') {
    return (
      <section className={`${panel} space-y-4 p-4 sm:p-5`}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bài thi có khoảng 2.700 từ trong 60 phút, cả làm câu hỏi: cần đọc khoảng {TARGET_WPM} từ/phút. Đọc theo cụm, mắt đi tới, đừng quay lại. Sau đó trả lời “ý này ở đoạn nào?”.
        </p>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Bài đọc
          <select className={`${field} mt-1`} value={choice} onChange={(e) => setChoice(Number(e.target.value))}>
            {ALL_PASSAGES.map((p, i) => (
              <option key={`${p.test.id}:${p.passage.id}`} value={i}>
                {p.passage.title} · {p.words} từ
              </option>
            ))}
          </select>
        </label>
        <Segmented<'pacer' | 'self'>
          label="Cách đọc"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'pacer', label: 'Theo nhịp (cụm 3 từ)' },
            { value: 'self', label: 'Tự đọc, bấm giờ' },
          ]}
        />
        {mode === 'pacer' && (
          <Segmented<number> label="Tốc độ (từ/phút)" value={wpm} onChange={setWpm} options={WPM_OPTIONS.map((w) => ({ value: w, label: `${w}` }))} />
        )}
        <button type="button" className={primaryBtn} onClick={begin}>
          <Play className="h-4 w-4" aria-hidden /> Bắt đầu đọc
        </button>
      </section>
    );
  }

  if (phase === 'reading') {
    if (mode === 'pacer') {
      const chunk = chunks[Math.min(at, chunks.length - 1)];
      return (
        <section className="space-y-4">
          <Progress at={at} total={chunks.length} />
          <div className={`${panel} flex min-h-[220px] flex-col items-center justify-center gap-3 p-6`} aria-live="off">
            <span className={tag}>Đoạn {chunk.paragraph}</span>
            <p className="text-center text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{chunk.text}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryBtn} onClick={togglePause}>
              {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />} {paused ? 'Đọc tiếp' : 'Tạm dừng'}
            </button>
            <button type="button" className={ghostBtn} onClick={finish}>
              <Square className="h-4 w-4" aria-hidden /> Dừng, làm câu hỏi
            </button>
          </div>
        </section>
      );
    }
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    return (
      <section className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
          <Timer className="h-4 w-4 text-tone-sky-fg" aria-hidden /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
        </p>
        <article className={`${panel} space-y-3 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200`}>
          <h3 className="font-semibold text-slate-900 dark:text-white">{passage.title}</h3>
          {passage.paragraphs.map((p) => (
            <p key={p.label}>
              <b className="mr-1 text-slate-500">{p.label}</b>
              {p.text}
            </p>
          ))}
        </article>
        <button type="button" className={`${primaryBtn} sticky bottom-4`} onClick={finish}>
          <Check className="h-4 w-4" aria-hidden /> Đọc xong
        </button>
      </section>
    );
  }

  const read = mode === 'pacer' ? Math.round((words * Math.min(at, chunks.length)) / Math.max(1, chunks.length)) : words;
  const speed = wordsPerMinute(read, seconds);
  const labels = passage.paragraphs.map((p) => p.label);
  const answered = quiz.filter((q) => quizAnswers[q.key]).length;
  const right = quiz.filter((q) => quizAnswers[q.key] === q.answer).length;
  return (
    <section className="space-y-4">
      <div className={`${panel} flex items-center gap-3 p-4`}>
        <Gauge className="h-6 w-6 text-tone-sky-fg" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {speed} từ/phút · {read} từ trong {seconds} giây
          </p>
          <p className="text-caption text-slate-600 dark:text-slate-300">{paceVi(speed)}</p>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Ý này nằm ở đoạn nào? (không xem lại bài)</h3>
      {quiz.map((q) => {
        const given = quizAnswers[q.key];
        return (
          <div key={q.key} className={`${panel} space-y-2 p-3`}>
            <p className="text-sm text-slate-800 dark:text-slate-200">{q.prompt}</p>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => {
                const state = !given ? '' : l === q.answer ? toneClasses('mint').surface : l === given ? toneClasses('blush').surface : 'opacity-50';
                return (
                  <button key={l} type="button" disabled={!!given} onClick={() => setQuizAnswers((a) => ({ ...a, [q.key]: l }))} className={`min-h-touch min-w-touch rounded-lg border text-sm font-semibold ${state || 'border-slate-200 dark:border-slate-700'}`}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {answered === quiz.length && (
        <div className="space-y-3">
          <Verdict ok={right === quiz.length}>
            Nhớ đúng vị trí {right}/{quiz.length} ý. {right < quiz.length ? 'Lần sau, đọc câu đầu mỗi đoạn kỹ hơn: nó thường nói đoạn đó bàn về gì.' : 'Bạn vừa đọc nhanh vừa nắm được bố cục.'}
          </Verdict>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={begin}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Đọc lại
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setPhase('setup')}>
              Chọn bài khác
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// --- Page ------------------------------------------------------------------------------

export default function IeltsReadingReview({ userId, onBack, api = readingReviewApi }: Props) {
  const [deck, setDeckState] = useState<ReviewDeck>(() => api.loadDeck(userId));
  const [loading, setLoading] = useState(true);
  const deckRef = useRef(deck);
  const setDeck = useCallback(
    (next: ReviewDeck) => {
      deckRef.current = next;
      setDeckState(next);
      api.saveDeck(userId, next);
    },
    [api, userId],
  );

  useEffect(() => {
    let live = true;
    api
      .loadAttempts(userId)
      .then(
        (attempts) => {
          if (!live) return;
          const next = syncAttempts(deckRef.current, attempts, isReadingDetails, new Date());
          if (next !== deckRef.current) setDeck(next);
        },
        (err) => console.warn('[ReadingReview] could not load attempts:', err),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [api, userId, setDeck]);

  const profile = useGameProfile(userId);
  const dueCount = useMemo(() => dueCards(deck, new Date()).length, [deck]);
  const [tab, setTab] = useState<Tab>(() => (dueCards(deck, new Date()).length ? 'review' : 'tfng'));
  const onMiss = useCallback((key: string) => setDeck(addMisses(deckRef.current, [key], new Date())), [setDeck]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Reading
      </button>
      <header>
        <p className="flex items-center gap-1.5 text-caption font-medium text-slate-600 dark:text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-tone-lavender-fg" aria-hidden /> Ôn tập Reading
        </p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Luyện kỹ năng, mỗi lần 5 phút</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Ôn lại câu đã sai, tập phân biệt FALSE với NOT GIVEN, nhận ra paraphrase và đọc nhanh hơn.</p>
      </header>
      <XpBar userId={userId} profile={profile} />
      <Segmented<Tab>
        label="Chọn bài ôn"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'review', label: dueCount ? `Câu sai (${dueCount})` : 'Câu sai' },
          { value: 'tfng', label: 'T/F/NG' },
          { value: 'paraphrase', label: 'Paraphrase' },
          { value: 'speed', label: 'Đọc nhanh' },
        ]}
      />
      {tab === 'review' && <MissedReview userId={userId} deck={deck} onDeck={setDeck} loading={loading} quiet={profile.quiet} />}
      {tab === 'tfng' && <TfngDrill userId={userId} deck={deck} onMiss={onMiss} quiet={profile.quiet} best={profile.best.tfng} />}
      {tab === 'paraphrase' && <ParaphraseDrill userId={userId} quiet={profile.quiet} best={profile.best['paraphrase-ms']} />}
      {tab === 'speed' && <SpeedReader />}
    </div>
  );
}
