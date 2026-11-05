/**
 * The game bits shared by the review screens:
 * - XpBar: level, today's XP against the daily goal, best combo.
 * - RunHud: hearts, combo and the round's XP during a game, with "+N XP"
 *   floating up after each right answer.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Flame, Heart, Sparkles, Star, Volume2, VolumeX, Zap } from 'lucide-react';
import { comboCheer, comboMultiplier, DAILY_XP_GOAL, levelFor, levelTitle, newRun, roundBonus, scoreAnswer, START_HEARTS, todayXp, type Answer, type GameProfile, type Run } from '../../../services/reviewGameLogic';
import { awardXp, setQuiet } from '../../../services/reviewGameService';
import { toneClasses } from '../../ui/palette';

export function XpBar({ userId, profile, compact = false }: { userId: string; profile: GameProfile; compact?: boolean }) {
  const { level, into, size } = levelFor(profile.totalXp);
  const today = todayXp(profile, new Date());
  const goalDone = today >= DAILY_XP_GOAL;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border p-3 ${toneClasses('butter').surface}`}>
      <div className="flex min-w-[10rem] flex-1 items-center gap-2.5">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${toneClasses('butter').tile}`} aria-hidden>
          {level}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2 text-caption">
            <span className="font-semibold text-slate-900 dark:text-white">
              Cấp {level} · {levelTitle(level)}
            </span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              {into}/{size} XP
            </span>
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800" role="progressbar" aria-label="Tiến độ cấp" aria-valuemin={0} aria-valuemax={size} aria-valuenow={into}>
            <div className="h-full rounded-full bg-tone-butter-accent transition-all" style={{ width: `${(into / size) * 100}%` }} />
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-caption text-slate-700 dark:text-slate-200">
        <Star className={`h-4 w-4 ${goalDone ? 'fill-current text-tone-butter-fg' : 'text-tone-butter-fg'}`} aria-hidden />
        Hôm nay <b className="tabular-nums">{Math.min(today, 9999)}</b>/{DAILY_XP_GOAL} XP{goalDone ? ' · đạt mục tiêu' : ''}
      </p>
      {!compact && profile.bestCombo > 0 && (
        <p className="flex items-center gap-1 text-caption text-slate-700 dark:text-slate-200">
          <Flame className="h-4 w-4 text-tone-peach-fg" aria-hidden /> Combo kỷ lục <b className="tabular-nums">{profile.bestCombo}</b>
        </p>
      )}
      {!compact && (
        <button
          type="button"
          onClick={() => setQuiet(userId, !profile.quiet)}
          className="ml-auto flex min-h-touch items-center gap-1 rounded-lg px-2 text-caption text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-pressed={profile.quiet}
        >
          {profile.quiet ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
          {profile.quiet ? 'Bật hiệu ứng' : 'Tắt hiệu ứng'}
        </button>
      )}
    </div>
  );
}

/**
 * The XP a single graded try earned, for screens without a round (Writing,
 * Speaking, Listening): "+N XP", or why it earned none.
 */
export function XpGain({ paid, retry = false, quiet }: { paid: number; retry?: boolean; quiet: boolean }) {
  if (paid > 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-caption font-bold ${toneClasses('butter').tile} ${quiet ? '' : 'anim-goal-pop'}`}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> +{paid} XP
      </span>
    );
  }
  return <span className="text-caption text-slate-500 dark:text-slate-400">{retry ? 'Làm lại để luyện: không cộng thêm XP' : 'Câu này đã tính XP hôm nay'}</span>;
}

interface HudProps {
  run: Run;
  /** XP from the last answer; a new `pulse` key replays the float. */
  gained: number;
  pulse: number;
  quiet: boolean;
  /** Hearts are hidden in rounds that do not use them. */
  hearts?: boolean;
  /** The last right answer was an item that already paid XP today. */
  repeat?: boolean;
}

export function RunHud({ run, gained, pulse, quiet, hearts = true, repeat = false }: HudProps) {
  const cheer = comboCheer(run.combo);
  const mult = comboMultiplier(run.combo);
  return (
    <div className="flex items-center gap-3 text-sm">
      {hearts && (
        <span className="flex items-center gap-0.5" aria-label={`Còn ${run.hearts} tim`}>
          {Array.from({ length: START_HEARTS }, (_, i) => (
            <Heart key={i} className={`h-5 w-5 transition ${i < run.hearts ? 'fill-current text-tone-blush-fg' : 'text-slate-300 dark:text-slate-600'}`} aria-hidden />
          ))}
        </span>
      )}
      <span className={`flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold ${run.combo >= 3 ? toneClasses('peach').tile : 'text-slate-500'}`}>
        <Zap className="h-4 w-4" aria-hidden />
        <span className="tabular-nums">{run.combo}</span>
        {mult > 1 && <span className="text-caption">×{mult}</span>}
      </span>
      {cheer && (
        <span key={`c${run.combo}`} className={`text-caption font-bold text-tone-peach-fg ${quiet ? '' : 'anim-goal-pop'}`}>
          {cheer}
        </span>
      )}
      {repeat && <span className="text-caption text-slate-500 dark:text-slate-400">Câu này đã tính XP hôm nay</span>}
      <span className="relative ml-auto flex items-center gap-1 font-semibold text-tone-butter-fg" aria-live="polite" aria-atomic="true">
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="tabular-nums">{run.xp}</span> XP
        {gained > 0 && !quiet && (
          <span key={pulse} className="anim-xp-float pointer-events-none absolute -top-5 right-0 text-caption font-bold text-tone-mint-fg" aria-hidden>
            +{gained}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * One game round: answer() scores and saves the XP as it goes, finish() adds
 * the end-of-round bonus once, reset() starts over.
 *
 * Each answer names its item (a question, a pair, a card): an item pays XP
 * once a day, so replaying a round still trains but does not farm XP. The
 * combo and hearts work as usual either way.
 */
export function useGameRun(userId: string, hearts = START_HEARTS) {
  const [run, setRun] = useState<Run>(() => newRun(hearts));
  const [last, setLast] = useState({ gained: 0, pulse: 0, repeat: false });
  const runRef = useRef(run);
  const finished = useRef<number | null>(null);

  const answer = useCallback(
    (a: Answer, item?: string): Run => {
      const { run: scored, gained } = scoreAnswer(runRef.current, a);
      // A wrong answer pays nothing and claims nothing: the item can still pay later today.
      const paid = awardXp(userId, gained, scored.combo, new Date(), gained > 0 ? item : undefined);
      const next = { ...scored, xp: runRef.current.xp + paid };
      runRef.current = next;
      setRun(next);
      setLast((l) => ({ gained: paid, pulse: l.pulse + 1, repeat: gained > 0 && paid === 0 }));
      return next;
    },
    [userId],
  );
  /** The bonus, awarded on the first call only, and only when the round earned XP. */
  const finish = useCallback((): number => {
    if (finished.current === null) {
      finished.current = runRef.current.xp > 0 ? roundBonus(runRef.current) : 0;
      awardXp(userId, finished.current);
    }
    return finished.current;
  }, [userId]);
  const reset = useCallback(() => {
    runRef.current = newRun(hearts);
    finished.current = null;
    setRun(runRef.current);
    setLast({ gained: 0, pulse: 0, repeat: false });
  }, [hearts]);

  return { run, gained: last.gained, pulse: last.pulse, repeat: last.repeat, answer, finish, reset };
}
