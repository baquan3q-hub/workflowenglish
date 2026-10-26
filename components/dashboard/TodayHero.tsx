/**
 * Top of the Learn hero: "Mục tiêu hôm nay" on the left, the mascot on the right.
 * Keeps the learner's own goals (saved as they change, undone if saving fails)
 * and tells the mascot when a goal is added or finished.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import TodayGoals from './TodayGoals';
import Mascot, { type MascotSignal } from './Mascot';
import {
  cleanGoalTitle,
  goalSummary,
  localDay,
  nextPosition,
  todayGoals,
  type AutoGoalInput,
  type CustomGoal,
  type GoalKind,
  type GoalTone,
} from '../../services/dailyGoalsLogic';
import { addGoal, dailyGoalsAvailable, listGoals, removeGoal, setGoalDone } from '../../services/dailyGoalsService';

interface Props {
  userId: string;
  auto: AutoGoalInput;
  /** True once the data behind the automatic goals has loaded. */
  autoReady: boolean;
  greeting: string;
  onOpen: (kind: Exclude<GoalKind, 'custom'>) => void;
  dailyGoal?: { value: number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; disabled: boolean } | null;
  /** Injectable for previews. */
  api?: { list: typeof listGoals; add: typeof addGoal; setDone: typeof setGoalDone; remove: typeof removeGoal; available: () => boolean };
}

const defaultApi = { list: listGoals, add: addGoal, setDone: setGoalDone, remove: removeGoal, available: dailyGoalsAvailable };
const LOCAL_NOTE = 'Chưa chạy migration 016: mục tiêu tự đặt đang lưu tạm trên trình duyệt này.';
const pending = (id: string) => id.startsWith('tmp-');
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function TodayHero({ userId, auto, autoReady, greeting, onOpen, dailyGoal, api = defaultApi }: Props) {
  const day = useMemo(() => localDay(new Date()), []);
  const [custom, setCustom] = useState<CustomGoal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [signal, setSignal] = useState<MascotSignal | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<CustomGoal[] | null>(null);
  customRef.current = custom;

  useEffect(() => {
    let live = true;
    setCustom(null);
    api
      .list(userId, day)
      .catch(() => [] as CustomGoal[])
      .then((goals) => {
        if (!live) return;
        setCustom(goals);
        setLocalOnly(!api.available());
      });
    return () => {
      live = false;
    };
  }, [api, userId, day]);

  const goals = useMemo(() => (custom ? todayGoals(auto, custom) : null), [auto, custom]);
  const summary = useMemo(() => goalSummary(goals ?? []), [goals]);

  // A goal turning done (ticked, or the app's data catching up): pop its check, cheer.
  const doneKey = goals ? goals.filter((g) => g.done).map((g) => g.id).join('|') : '';
  const prevDone = useRef<Set<string> | null>(null);
  const ready = autoReady && custom !== null;
  useEffect(() => {
    if (!ready || !goals) return;
    const now = new Set(doneKey ? doneKey.split('|') : []);
    const before = prevDone.current;
    prevDone.current = now;
    if (!before) return;
    const fresh = [...now].filter((id) => !before.has(id));
    if (fresh.length === 0) return;
    setPopped(fresh[0]);
    setSignal({ event: summary.allDone ? 'all-done' : 'goal-done', at: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, doneKey]);

  const add = async (title: string, tone: GoalTone): Promise<boolean> => {
    const list = customRef.current;
    const clean = cleanGoalTitle(title);
    if (!list || !clean) return false;
    setError(null);
    const tempId = `tmp-${Date.now().toString(36)}`;
    setCustom([...list, { id: tempId, title: clean, tone, done: false, position: nextPosition(list) }]);
    setSignal({ event: 'goal-added', at: Date.now() });
    try {
      const saved = await api.add(userId, day, { title: clean, tone }, list);
      setCustom((c) => (c ?? []).map((g) => (g.id === tempId ? saved : g)));
      setLocalOnly(!api.available());
      return true;
    } catch (err) {
      setCustom((c) => (c ?? []).filter((g) => g.id !== tempId));
      setError(message(err));
      return false;
    }
  };

  const toggle = async (id: string, done: boolean) => {
    if (pending(id)) return;
    setError(null);
    setCustom((c) => (c ?? []).map((g) => (g.id === id ? { ...g, done } : g)));
    try {
      await api.setDone(userId, day, id, done);
    } catch (err) {
      setCustom((c) => (c ?? []).map((g) => (g.id === id ? { ...g, done: !done } : g)));
      setError(message(err));
    }
  };

  const remove = async (id: string) => {
    const list = customRef.current;
    const goal = list?.find((g) => g.id === id);
    if (!goal || pending(id)) return;
    setError(null);
    setCustom((c) => (c ?? []).filter((g) => g.id !== id));
    try {
      await api.remove(userId, day, id);
    } catch (err) {
      setCustom((c) => [...(c ?? []), goal].sort((a, b) => a.position - b.position));
      setError(message(err));
    }
  };

  return (
    <div ref={areaRef} className="relative overflow-hidden p-5 sm:p-6">
      {/* One faint lavender blob behind the mascot (plain fill, no blur). */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-tone-lavender opacity-80 sm:-right-10 sm:top-1/2 sm:h-72 sm:w-72 sm:-translate-y-1/2" />
      <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
        <div className="sm:order-last">
          <Mascot areaRef={areaRef} signal={signal} target={target} greeting={greeting} done={summary.done} total={summary.total} next={summary.next?.title ?? null} />
        </div>
        <TodayGoals
          goals={goals}
          summary={summary}
          onOpen={onOpen}
          onToggle={toggle}
          onAdd={add}
          onRemove={remove}
          onHoverTarget={setTarget}
          poppedId={popped}
          error={error}
          note={localOnly ? LOCAL_NOTE : null}
          dailyGoal={dailyGoal}
        />
      </div>
    </div>
  );
}
