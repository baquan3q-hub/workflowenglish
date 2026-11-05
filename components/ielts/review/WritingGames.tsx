/**
 * The two Writing games on the "Viết từng câu" start screen: "Xếp mảnh câu"
 * (rebuild a band-level model sentence from its chunks) and "Săn lỗi" (find
 * and fix one of your own past mistakes). XP goes through `useGameRun`, so it
 * is paid once per item per day like the other review games.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, HeartCrack, RotateCcw, Search, Sparkles, Trophy, Undo2, X, Zap } from 'lucide-react';
import { STARTER_ERRORS } from '../../../data/ielts/writingErrorHunt';
import {
  chunkRound,
  chunkSentence,
  chunksRight,
  firstWrongChunk,
  fixedSentence,
  huntRound,
  shuffleChunks,
  tapHits,
  type ChunkSource,
  type HuntItem,
} from '../../../services/writingGamesLogic';
import { ERROR_LABELS, type RecentError } from '../../../services/writingTranslateLogic';
import { outOfHearts } from '../../../services/reviewGameLogic';
import { saveBest } from '../../../services/reviewGameService';
import { RunHud, useGameRun } from './GameHud';
import { toneClasses } from '../../ui/palette';
import { ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../../ui/styles';

const newSeed = () => Math.floor(Math.random() * 1e9);

/** Focus the first button in `box` when focus fell to the page (its button left the screen). */
function keepFocus(box: HTMLElement | null, always = false) {
  const active = document.activeElement;
  if (!always && active && active !== document.body && document.contains(active)) return;
  box?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
}
const ROUND = 5;

function Progress({ at, total }: { at: number; total: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="Tiến độ vòng" aria-valuemin={0} aria-valuemax={total} aria-valuenow={at}>
      <div className={`h-full ${toneClasses('lavender').bar} transition-all`} style={{ width: `${(at / Math.max(1, total)) * 100}%` }} />
    </div>
  );
}

function RoundEnd({ lost, right, total, xp, bonus, bestCombo, record, best, lostNote, onAgain, onExit }: {
  lost: boolean;
  right: number;
  total: number;
  xp: number;
  bonus: number;
  bestCombo: number;
  record: boolean;
  best?: number;
  lostNote: string;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <section className={`${panel} space-y-3 p-5 text-center`}>
      {lost ? <HeartCrack className="mx-auto h-8 w-8 text-tone-blush-fg" aria-hidden /> : <Trophy className="mx-auto h-8 w-8 text-tone-butter-fg" aria-hidden />}
      <p className="text-heading font-bold text-slate-900 dark:text-white">{lost ? 'Hết tim!' : `${right}/${total}`}</p>
      <p className="flex flex-wrap justify-center gap-2 text-sm">
        <span className={`${tag} font-semibold`}>
          <Sparkles className="h-3 w-3" aria-hidden /> +{xp + bonus} XP
        </span>
        {bestCombo >= 3 && (
          <span className={tag}>
            <Zap className="h-3 w-3" aria-hidden /> Combo {bestCombo}
          </span>
        )}
        {record ? <span className={`${tag} text-tone-peach-fg`}>Kỷ lục mới!</span> : best !== undefined && <span className={tag}>Kỷ lục {best} XP</span>}
      </p>
      {lost && <p className="text-sm text-slate-600 dark:text-slate-300">{lostNote}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={primaryBtn} onClick={onAgain}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Vòng mới
        </button>
        <button type="button" className={secondaryBtn} onClick={onExit}>
          Về Viết từng câu
        </button>
      </div>
    </section>
  );
}

const Back = ({ onExit }: { onExit: () => void }) => (
  <button type="button" onClick={onExit} className={`${ghostBtn} -ml-3`}>
    <ArrowLeft className="h-4 w-4" aria-hidden /> Viết từng câu
  </button>
);

// --- Xếp mảnh câu ------------------------------------------------------------------

export function ChunkGame({ userId, pool, tried, quiet, best, onExit }: {
  userId: string;
  pool: readonly ChunkSource[];
  tried: ReadonlySet<string>;
  quiet: boolean;
  best?: number;
  onExit: () => void;
}) {
  const newRound = () => chunkRound(pool, tried, ROUND, newSeed());
  const [round, setRound] = useState(newRound);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  /** Where the last check went wrong, or null. */
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(false);
  const [right, setRight] = useState(0);
  const [result, setResult] = useState<{ bonus: number; record: boolean } | null>(null);
  const game = useGameRun(userId);
  const boxRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const item = round[index];
  const chunks = useMemo(() => (item ? chunkSentence(item.text) : []), [item]);
  const order = useMemo(() => (item ? shuffleChunks(chunks, newSeed()) : []), [item, chunks]);
  const over = index >= round.length || (outOfHearts(game.run) && !solved);

  useEffect(() => {
    if (!over || result || !round.length) return;
    const bonus = game.finish();
    setResult({ bonus, record: saveBest(userId, 'chunks', game.run.xp + bonus) });
  }, [over, result, round.length, game, userId]);
  // A picked chunk leaves the list, a solved sentence swaps the buttons: keep keyboard focus on the game.
  useEffect(() => {
    if (solved) nextRef.current?.focus();
    else keepFocus(boxRef.current, index > 0 && picked.length === 0);
  }, [solved, index, picked.length]);

  const restart = () => {
    setRound(newRound());
    setIndex(0);
    setPicked([]);
    setWrongAt(null);
    setMisses(0);
    setSolved(false);
    setRight(0);
    setResult(null);
    game.reset();
  };

  if (!round.length) return <p className="text-sm text-slate-600">Chưa có câu mẫu để xếp.</p>;
  if (over) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <Back onExit={onExit} />
        <RoundEnd
          lost={index < round.length}
          right={right}
          total={round.length}
          xp={game.run.xp}
          bonus={result?.bonus ?? 0}
          bestCombo={game.run.bestCombo}
          record={!!result?.record}
          best={best}
          lostNote="Sai 3 lần là hết lượt. Đọc lại câu mẫu ở phần Viết từng câu rồi chơi vòng mới nhé."
          onAgain={restart}
          onExit={onExit}
        />
      </div>
    );
  }

  const left = order.filter((i) => !picked.includes(i));
  const pick = (i: number) => {
    if (solved) return;
    setWrongAt(null);
    setPicked((p) => [...p, i]);
  };
  const unpick = (at: number) => {
    if (solved) return;
    setWrongAt(null);
    setPicked((p) => p.filter((_, k) => k !== at));
  };
  const check = () => {
    if (picked.length < chunks.length || solved) return;
    if (chunksRight(chunks, picked)) {
      game.answer({ correct: true, hintsUsed: misses }, `x:${item.key}`);
      setSolved(true);
      setRight((n) => n + 1);
    } else {
      game.answer({ correct: false });
      setMisses((n) => n + 1);
      setWrongAt(firstWrongChunk(chunks, picked));
    }
  };
  const next = () => {
    setIndex((i) => i + 1);
    setPicked([]);
    setWrongAt(null);
    setMisses(0);
    setSolved(false);
  };

  return (
    <div ref={boxRef} className="mx-auto max-w-3xl space-y-4 pb-10 anim-fade-up">
      <Back onExit={onExit} />
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Khởi động · câu {index + 1}/{round.length}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Xếp mảnh câu</h1>
      </header>
      <RunHud run={game.run} gained={game.gained} pulse={game.pulse} quiet={quiet} repeat={game.repeat} />
      <Progress at={index} total={round.length} />
      <div className={`${panel} p-4`}>
        <p className="text-caption font-semibold text-slate-600 dark:text-slate-300">Ý của câu</p>
        <p className="mt-1 text-body text-slate-900 dark:text-white">{item.vi}</p>
      </div>

      <section aria-label="Câu bạn đang xếp" className={`min-h-[4.5rem] rounded-2xl border-2 border-dashed p-3 ${solved ? toneClasses('mint').surface : 'border-slate-200 dark:border-slate-700'}`}>
        {picked.length === 0 ? (
          <p className="text-caption text-slate-500 dark:text-slate-400">Chạm các mảnh bên dưới theo đúng thứ tự. Chạm lại một mảnh ở đây để bỏ nó ra.</p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {picked.map((c, at) => {
              const bad = wrongAt !== null && at >= wrongAt;
              return (
                <li key={`${c}-${at}`}>
                  <button
                    type="button"
                    onClick={() => unpick(at)}
                    disabled={solved}
                    aria-label={`${chunks[c]}${bad && at === wrongAt ? ' (sai từ đây)' : ''}. Bỏ ra`}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                      bad ? `${toneClasses('blush').surface} ${at === wrongAt && !quiet ? 'anim-shake' : ''}` : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                    } text-slate-900 dark:text-white`}
                  >
                    {chunks[c]}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {wrongAt !== null && (
        <p className="text-sm text-tone-blush-fg" role="status">
          Chưa đúng từ mảnh thứ {wrongAt + 1}. Chạm các mảnh tô đỏ để bỏ ra rồi xếp lại.
        </p>
      )}

      {!solved && (
        <ul className="flex flex-wrap gap-2" aria-label="Các mảnh còn lại">
          {left.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => pick(c)} className={`${secondaryBtn} min-h-touch px-3 text-sm font-medium`}>
                {chunks[c]}
              </button>
            </li>
          ))}
        </ul>
      )}

      {solved ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-tone-mint-fg" role="status">
            <Check className="h-4 w-4" aria-hidden /> Đúng rồi! Để ý cách câu nối các ý.
          </p>
          <button ref={nextRef} type="button" className={primaryBtn} onClick={next}>
            {index + 1 < round.length ? 'Câu tiếp' : 'Xem kết quả'} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryBtn} onClick={check} disabled={picked.length < chunks.length}>
            <Check className="h-4 w-4" aria-hidden /> Kiểm tra
          </button>
          <button type="button" className={secondaryBtn} onClick={() => (setPicked([]), setWrongAt(null))} disabled={!picked.length}>
            <Undo2 className="h-4 w-4" aria-hidden /> Xếp lại
          </button>
        </div>
      )}
    </div>
  );
}

// --- Săn lỗi -------------------------------------------------------------------------

export function HuntGame({ userId, errors, quiet, best, onExit }: {
  userId: string;
  errors: readonly RecentError[];
  quiet: boolean;
  best?: number;
  onExit: () => void;
}) {
  const newRound = () => huntRound(errors, STARTER_ERRORS, 6, newSeed());
  const [round, setRound] = useState<HuntItem[]>(newRound);
  const [index, setIndex] = useState(0);
  /** Words tapped that are not the mistake. */
  const [missed, setMissed] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [result, setResult] = useState<{ bonus: number; record: boolean } | null>(null);
  const game = useGameRun(userId);
  const wordsRef = useRef<HTMLParagraphElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const item = round[index];
  const own = errors.length;
  const over = index >= round.length || (outOfHearts(game.run) && !chosen);

  useEffect(() => {
    if (!over || result || !round.length) return;
    const bonus = game.finish();
    setResult({ bonus, record: saveBest(userId, 'hunt', game.run.xp + bonus) });
  }, [over, result, round.length, game, userId]);
  const showFixes = found || missed.length >= 2;
  // Move keyboard focus along: words, then the fixes, then "Câu tiếp".
  useEffect(() => {
    if (chosen) nextRef.current?.focus();
    else if (showFixes) keepFocus(optionsRef.current, true);
    else keepFocus(wordsRef.current, index > 0 && missed.length === 0);
  }, [chosen, showFixes, index, missed.length]);

  const restart = () => {
    setRound(newRound());
    setIndex(0);
    setMissed([]);
    setFound(false);
    setChosen(null);
    setRight(0);
    setResult(null);
    game.reset();
  };

  if (!round.length) return <p className="text-sm text-slate-600">Chưa có lỗi để săn.</p>;
  if (over) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <Back onExit={onExit} />
        <RoundEnd
          lost={index < round.length}
          right={right}
          total={round.length}
          xp={game.run.xp}
          bonus={result?.bonus ?? 0}
          bestCombo={game.run.bestCombo}
          record={!!result?.record}
          best={best}
          lostNote="Chọn sai cách sửa 3 lần là hết lượt. Xem lại lời giải ở từng câu rồi chơi vòng mới nhé."
          onAgain={restart}
          onExit={onExit}
        />
      </div>
    );
  }

  // Two wrong taps show where the mistake is, so the learner is never stuck.
  const revealed = showFixes;
  const tap = (w: number) => {
    if (found || chosen || missed.includes(w)) return;
    if (tapHits(item, w)) setFound(true);
    else setMissed((m) => [...m, w]);
  };
  const choose = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    setFound(true);
    const ok = opt === item.corrected;
    // Missed taps count as hints: right, but no combo step and less XP.
    game.answer({ correct: ok, hintsUsed: missed.length }, `h:${item.id}`);
    if (ok) setRight((n) => n + 1);
  };
  const next = () => {
    setIndex((i) => i + 1);
    setMissed([]);
    setFound(false);
    setChosen(null);
  };
  const ok = chosen === item.corrected;
  const inSpan = (w: number) => w >= item.span[0] && w < item.span[1];

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10 anim-fade-up">
      <Back onExit={onExit} />
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          Câu {index + 1}/{round.length} · {own >= 3 ? 'lỗi từ các câu bạn đã viết' : 'lỗi người Việt hay mắc'}
        </p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Săn lỗi</h1>
      </header>
      <RunHud run={game.run} gained={game.gained} pulse={game.pulse} quiet={quiet} repeat={game.repeat} />
      <Progress at={index} total={round.length} />

      <section className={`${panel} space-y-2 p-4`} aria-label="Câu có một lỗi">
        <p className="flex items-center gap-1.5 text-caption font-semibold text-slate-600 dark:text-slate-300">
          <Search className="h-4 w-4" aria-hidden />
          {revealed ? 'Lỗi nằm ở phần tô vàng. Chọn cách sửa:' : 'Câu này có một lỗi. Chạm vào từ sai.'}
        </p>
        <p ref={wordsRef} className="flex flex-wrap gap-x-1 gap-y-1.5 text-body leading-relaxed">
          {item.words.map((w, i) => {
            const isMiss = missed.includes(i);
            const mark = revealed && inSpan(i) ? (chosen ? toneClasses(ok ? 'mint' : 'blush').tile : toneClasses('butter').tile) : '';
            return (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                disabled={revealed || isMiss}
                className={`rounded-md px-1 py-0.5 text-slate-900 transition dark:text-white ${mark} ${isMiss ? 'text-slate-400 line-through decoration-slate-300 dark:text-slate-500' : ''} ${!revealed && !isMiss ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
                aria-label={isMiss ? `${w}: không sai` : w}
              >
                {w}
              </button>
            );
          })}
        </p>
        {missed.length === 1 && !found && <p className="text-caption text-slate-500 dark:text-slate-400">Từ đó không sai. Thử từ khác nhé.</p>}
      </section>

      {revealed && (
        <div ref={optionsRef} className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Chọn cách sửa">
          {item.options.map((opt) => {
            const tone = !chosen ? '' : opt === item.corrected ? toneClasses('mint').surface : opt === chosen ? toneClasses('blush').surface : 'opacity-60';
            return (
              <button key={opt} type="button" disabled={!!chosen} onClick={() => choose(opt)} className={`${secondaryBtn} justify-start text-left text-sm ${tone}`} aria-pressed={chosen === opt}>
                {chosen && opt === item.corrected ? <Check className="h-4 w-4 flex-shrink-0" aria-hidden /> : chosen === opt ? <X className="h-4 w-4 flex-shrink-0" aria-hidden /> : null}
                {opt === item.original ? `Giữ nguyên: ${opt}` : opt}
              </button>
            );
          })}
        </div>
      )}

      {chosen && (
        <div className={`rounded-2xl border p-4 ${toneClasses(ok ? 'mint' : 'peach').surface}`} role="status">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {ok ? 'Chuẩn!' : 'Chưa đúng.'} <span className={tag}>{ERROR_LABELS[item.category] ?? item.category}</span>
          </p>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">
            <s className="text-slate-500">{item.original}</s> → <b>{item.corrected}</b>
          </p>
          {item.explanationVi && <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{item.explanationVi}</p>}
          <p className="mt-2 text-caption text-slate-600 dark:text-slate-300">Câu đúng: {fixedSentence(item)}</p>
          <button ref={nextRef} type="button" className={`${primaryBtn} mt-3`} onClick={next}>
            {index + 1 < round.length ? 'Câu tiếp' : 'Xem kết quả'} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
