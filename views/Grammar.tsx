import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookMarked, LayoutGrid, Route, Sun } from 'lucide-react';
import { getMeta, lessons as allLessons, loadLessons, stageLessons } from '../data/grammar/meta';
import type { HubId, Lesson, OpenItem, StageId } from '../data/grammar/types';
import {
  isDone,
  nextInPath,
  recommend,
  snapshot,
  summary as progressSummary,
  type Attempt,
} from '../services/grammar/progress';
import {
  PLACEMENT,
  advance,
  checkpointSession,
  errorSession,
  learnSession,
  placementSession,
  reviewSession,
  type Session,
} from '../services/grammar/session';
import {
  dropOldDraft,
  getAttempts,
  getDraft,
  getOldLibrary,
  getState,
  record,
  saveDraft,
  saveState,
  syncGrammar,
  type ModuleState,
} from '../services/grammar/store';
import { isOpen } from '../services/grammar/grade';
import { gradeOpen, isRight, openTask } from '../services/grammar/ai';
import { aiErrorMessage } from '../services/aiClient';
import { getMasteredWordsList } from '../services/recommendationService';
import { getLearningProfile } from '../services/learningProfileService';
import { EMPTY_PROFILE, GOAL_LABELS, INTEREST_LABELS } from '../services/learningProfileLogic';
import GrammarToday from '../components/grammar/GrammarToday';
import GrammarPath from '../components/grammar/GrammarPath';
import GrammarTopics from '../components/grammar/GrammarTopics';
import GrammarBook from '../components/grammar/GrammarBook';
import LessonView from '../components/grammar/LessonView';
import PracticeRunner from '../components/grammar/PracticeRunner';
import SessionResult from '../components/grammar/SessionResult';
import Sheet from '../components/ui/Sheet';
import { primaryBtn, secondaryBtn } from '../components/ui/styles';
import { card } from '../components/grammar/shared';

type Screen = 'tabs' | 'lesson' | 'session' | 'result';
type Tab = 'today' | 'path' | 'topics' | 'book';
interface Props {
  user: string;
  /** Lesson to open straight away, e.g. from IELTS Writing feedback. */
  initialLesson?: string;
  onExit: () => void;
  onFocus: (focused: boolean) => void;
}

const TABS: { id: Tab; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Hôm nay', Icon: Sun },
  { id: 'path', label: 'Lộ trình', Icon: Route },
  { id: 'topics', label: 'Chuyên đề', Icon: LayoutGrid },
  { id: 'book', label: 'Sổ lỗi', Icon: BookMarked },
];

export default function Grammar({ user, initialLesson, onExit, onFocus }: Props) {
  const [attempts, setAttempts] = useState(() => getAttempts(user));
  const [state, setState] = useState<ModuleState>(() => getState(user));
  const [draft, setDraft] = useState<Session | null>(() => getDraft(user));
  const [cache, setCache] = useState<Map<string, Lesson>>(() => new Map());
  const cacheRef = useRef(cache);
  const [screen, setScreen] = useState<Screen>('tabs');
  const [tab, setTab] = useState<Tab>('today');
  const [hub, setHub] = useState<HubId | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [finished, setFinished] = useState<Session | null>(null);
  const [replace, setReplace] = useState<Session | null>(null);
  const [profile, setProfile] = useState({ ...EMPTY_PROFILE });
  const [knownWords, setKnownWords] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncTick, setSyncTick] = useState(0);
  const alive = useRef(true);
  const syncing = useRef(false);
  const pullHistory = useRef(true);
  const queued = useRef(false);
  const oldQuiz = useMemo(() => getOldLibrary(user).completed, [user]);

  useEffect(() => {
    alive.current = true;
    if (dropOldDraft(user)) setMessage('Phiên luyện của phiên bản cũ đã được lưu kết quả vào tiến độ của bạn.');
    void getLearningProfile(user)
      .then((p) => alive.current && setProfile(p))
      .catch(() => {});
    void getMasteredWordsList(user)
      .then((words) => alive.current && setKnownWords(words.slice(0, 3)))
      .catch(() => {});
    const refresh = () => {
      pullHistory.current = true;
      setSyncTick((n) => n + 1);
    };
    const storage = () => {
      if (alive.current) setAttempts(getAttempts(user));
    };
    window.addEventListener('online', refresh);
    window.addEventListener('storage', storage);
    return () => {
      alive.current = false;
      window.removeEventListener('online', refresh);
      window.removeEventListener('storage', storage);
    };
  }, [user]);

  // Local first: answers are saved on the device, then pushed to `grammar_attempts` when online.
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (syncing.current) {
        queued.current = true;
        return;
      }
      syncing.current = true;
      const pull = pullHistory.current;
      pullHistory.current = false;
      try {
        await syncGrammar(user, pull);
        if (alive.current) {
          setAttempts(getAttempts(user));
          setSyncMessage('');
        }
      } catch {
        if (pull) pullHistory.current = true;
        if (alive.current) setSyncMessage('Tiến độ đã lưu trên thiết bị.');
      } finally {
        syncing.current = false;
        if (queued.current && alive.current) {
          queued.current = false;
          setSyncTick((n) => n + 1);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [user, syncTick]);

  useEffect(() => {
    onFocus(screen === 'session');
    return () => onFocus(false);
  }, [screen, onFocus]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, tab, lessonId]);

  const theme = [
    profile.goal ? GOAL_LABELS[profile.goal] : '',
    ...profile.interests.map((i) => INTEREST_LABELS[i]),
    knownWords.length ? 'Từ quen thuộc: ' + knownWords.join(', ') : '',
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 250);

  const snap = useMemo(() => snapshot(attempts, oldQuiz), [attempts, oldQuiz]);
  const current = state.current?.lesson;
  const rec = recommend(snap, current);
  const now = Date.now();
  const dueCount = [...snap.stats.values()].filter((s) => s.due <= now).length;
  const errorCount = [...snap.stats.values()].reduce((n, s) => n + s.openErrors.length, 0);
  const pending = attempts.filter((a) => a.result === 'pending');
  const firstVisit = !attempts.length && !current && !state.zeroStart && !oldQuiz.size && !draft;

  /** Loads lesson content not in the cache yet. */
  const ensure = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !cacheRef.current.has(id) && getMeta(id));
    if (!missing.length) return cacheRef.current;
    const loaded = await loadLessons(missing);
    const next = new Map(cacheRef.current);
    for (const l of loaded) next.set(l.id, l);
    cacheRef.current = next;
    if (alive.current) setCache(next);
    return next;
  }, []);
  const ensureQuiet = useCallback((ids: string[]) => void ensure(ids).catch(() => {}), [ensure]);

  const remember = (s: ModuleState) => {
    saveState(user, s);
    setState(s);
  };
  const update = (s: Session | null) => {
    saveDraft(user, s);
    setDraft(s);
  };
  const persist = (a: Attempt) => {
    record(user, a);
    setAttempts(getAttempts(user));
    setSyncTick((n) => n + 1);
  };

  async function withLoading<T>(work: () => Promise<T>) {
    setBusy(true);
    setMessage('');
    try {
      return await work();
    } catch {
      if (alive.current) setMessage('Chưa tải được bài. Kết nối mạng rồi thử lại.');
      return undefined;
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function openLesson(id: string) {
    if (!getMeta(id)) return;
    const ok = await withLoading(() => ensure([id]));
    if (!ok || !alive.current) return;
    const step = state.current?.lesson === id ? Math.min(state.current.step, 4) : 0;
    remember({ ...state, current: { lesson: id, step } });
    setLessonId(id);
    setScreen('lesson');
  }

  // Opening from IELTS Writing feedback goes straight to the lesson.
  useEffect(() => {
    if (initialLesson) void openLesson(initialLesson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLesson]);

  function setStep(step: number) {
    if (!lessonId) return;
    remember({ ...state, current: { lesson: lessonId, step } });
  }

  /** Builds a session once its lessons are loaded; asks before replacing an unfinished one. */
  async function start(ids: string[], build: (lessons: Map<string, Lesson>) => Session) {
    const map = await withLoading(() => ensure(ids));
    if (!map || !alive.current) return;
    const s = build(map);
    if (!s.tasks.length) {
      setMessage('Chưa có câu nào cho phiên này. Hãy học bài trước rồi quay lại.');
      return;
    }
    if (draft && draft.id !== s.id) {
      setReplace(s);
      return;
    }
    begin(s);
  }
  function begin(s: Session) {
    setReplace(null);
    setFinished(null);
    update(s);
    setScreen('session');
  }
  async function resume() {
    if (!draft) return;
    const map = await withLoading(() => ensure(draft.tasks.map((t) => t.lesson)));
    if (map && alive.current) setScreen('session');
  }

  const minutes = profile.minutesPerDay || 15;
  const practise = (id: string, mode: 'learn' | 'review') =>
    start([id], (m) =>
      mode === 'learn'
        ? learnSession(m.get(id)!, attempts, minutes, snap.stats.get(id))
        : reviewSession(m.get(id)!, attempts, snap.stats.get(id)!)
    );
  const practiseErrors = (focus?: string) => {
    const errors = [...snap.stats.values()].flatMap((s) => s.openErrors).filter((a) => !focus || a.lesson === focus);
    return start([...errors.map((a) => a.lesson), ...(focus ? [focus] : [])], (m) => errorSession(m, errors, attempts, focus));
  };
  const checkpoint = (stage: StageId) =>
    start(
      stageLessons(stage).map((l) => l.id),
      (m) => checkpointSession(stage, m)
    );
  const placement = () => start(Object.values(PLACEMENT).flat(), placementSession);

  function next() {
    if (!draft) return;
    // Read from storage: in the placement test the answer was recorded a moment ago in the same tick.
    const all = getAttempts(user);
    setAttempts(all);
    const s = advance(draft, all, cacheRef.current);
    if (s) {
      update(s);
      return;
    }
    const first = draft.tasks[0];
    const item = cacheRef.current.get(first.lesson)?.items.find((i) => i.id === first.itemId);
    persist({
      version: 2,
      id: crypto.randomUUID(),
      session: draft.id,
      at: new Date().toISOString(),
      mode: draft.mode,
      lesson: draft.lesson,
      itemId: '',
      kind: item?.kind ?? 'choice',
      level: item?.level ?? 1,
      answer: '',
      result: 'finished',
      assisted: false,
      typedFallback: false,
    });
    setFinished(draft);
    update(null);
    if (draft.mode === 'learn') {
      remember({ ...state, current: { lesson: draft.lesson, step: 5 } });
      setLessonId(draft.lesson);
      setScreen('lesson');
    } else setScreen('result');
  }

  async function regrade(a: Attempt) {
    setBusy(true);
    setMessage('');
    try {
      const map = await ensure([a.lesson]);
      const lesson = map.get(a.lesson)!;
      const item = lesson.items.find((i) => i.id === a.itemId);
      const task = item && isOpen(item) ? openTask(item as OpenItem) : a.prompt || 'Viết câu dùng cấu trúc của bài ' + lesson.title;
      const feedback = await gradeOpen(lesson, task, a.answer, theme);
      if (alive.current) persist({ ...a, feedback, result: isRight(feedback) ? 'correct' : 'incorrect' });
    } catch (err) {
      if (alive.current) setMessage(aiErrorMessage(err));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  function recommended() {
    if (rec.mode === 'review') return practise(rec.lesson, 'review');
    if (rec.mode === 'errors') return practiseErrors(rec.lesson);
    if (rec.mode === 'checkpoint') return checkpoint(getMeta(rec.lesson)!.stage);
    return openLesson(rec.lesson);
  }
  function zero() {
    remember({ ...state, zeroStart: true });
    void openLesson(allLessons[0].id);
  }
  const goTab = (t: Tab) => {
    setTab(t);
    setScreen('tabs');
    setMessage('');
  };

  const lesson = lessonId ? cache.get(lessonId) : undefined;
  const openStage = snap.placement?.stage ?? getMeta(current ?? '')?.stage ?? nextInPath(snap)?.stage ?? 0;
  /** Next roadmap lesson after this one that is not behind the learner yet. */
  const after = (id: string) =>
    allLessons.slice(allLessons.findIndex((l) => l.id === id) + 1).find((l) => !isDone(snap, l.id))?.id;
  const resultFor = (s: Session) => (
    <SessionResult
      session={s}
      attempts={attempts}
      lessons={cache}
      snap={snap}
      next={s.mode === 'learn' ? after(s.lesson) : s.mode === 'diagnostic' ? undefined : recommend(snap, current).lesson}
      onOpenLesson={(id) => void openLesson(id)}
      onBook={() => goTab('book')}
      onHome={() => goTab('today')}
    />
  );

  if (screen === 'session' && draft && draft.tasks.every((t) => cache.has(t.lesson)))
    return (
      <PracticeRunner
        key={draft.id + '-' + draft.index}
        session={draft}
        lessons={cache}
        attempts={attempts}
        theme={theme}
        update={update}
        onRecord={persist}
        onNext={next}
        onPause={() => (draft.mode === 'learn' && lessonId === draft.lesson ? setScreen('lesson') : goTab('today'))}
      />
    );

  return (
    <main className="mx-auto w-full max-w-xl pb-24" aria-label="Học ngữ pháp">
      {screen === 'tabs' && (
        <>
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <button type="button" className="press -ml-2 flex min-h-touch items-center gap-1 rounded-xl px-2 text-sm font-semibold text-slate-600 dark:text-slate-300" onClick={onExit}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {initialLesson ? 'Nhận xét Writing' : 'Trang học'}
            </button>
            <span className="text-xs text-slate-500" role="status">
              {syncMessage}
            </span>
          </div>
          <h1 className="px-4 text-2xl font-bold text-slate-900 dark:text-white">Ngữ pháp</h1>
          <nav
            aria-label="Mục ngữ pháp"
            className="sticky top-0 z-10 mt-2 border-b border-slate-200 bg-white/95 px-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
          >
            <ul className="grid grid-cols-4">
              {TABS.map(({ id, label, Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={tab === id ? 'page' : undefined}
                    onClick={() => goTab(id)}
                    className={
                      'press relative flex min-h-touch w-full flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold ' +
                      (tab === id ? 'text-tone-periwinkle-fg' : 'text-slate-500 dark:text-slate-400')
                    }
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                    {id === 'book' && errorCount + pending.length > 0 && (
                      <span className="absolute right-3 top-1 min-w-[1.1rem] rounded-full bg-tone-blush-accent px-1 text-[10px] leading-4 text-white">
                        {errorCount + pending.length}
                      </span>
                    )}
                    {tab === id && <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-tone-periwinkle-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      {message && (
        <p role="alert" className="mx-4 mt-3 rounded-xl border border-tone-butter-border bg-tone-butter px-3 py-2 text-sm text-tone-butter-fg">
          {message}
        </p>
      )}
      {busy && (
        <p role="status" className="sr-only">
          Đang tải…
        </p>
      )}

      <div className="px-4 pt-4">
        {screen === 'tabs' && tab === 'today' && (
          <GrammarToday
            snap={snap}
            state={state}
            draft={draft}
            rec={rec}
            current={current}
            firstVisit={firstVisit}
            stats={progressSummary(attempts, snap)}
            dueCount={dueCount}
            errorCount={errorCount}
            pendingCount={pending.length}
            goalLabel={profile.goal ? GOAL_LABELS[profile.goal] : undefined}
            busy={busy}
            onOpenLesson={(id) => void openLesson(id)}
            onPlacement={() => void placement()}
            onZero={zero}
            onRecommended={() => void recommended()}
            onResume={() => void resume()}
            onBook={() => goTab('book')}
            onHub={(h) => {
              setHub(h);
              goTab('topics');
            }}
          />
        )}
        {screen === 'tabs' && tab === 'path' && (
          <GrammarPath snap={snap} openStage={openStage} busy={busy} onOpenLesson={(id) => void openLesson(id)} onCheckpoint={(st) => void checkpoint(st)} />
        )}
        {screen === 'tabs' && tab === 'topics' && <GrammarTopics snap={snap} hub={hub} setHub={setHub} onOpenLesson={(id) => void openLesson(id)} />}
        {screen === 'tabs' && tab === 'book' && (
          <GrammarBook
            snap={snap}
            pending={pending}
            lessons={cache}
            ensure={ensureQuiet}
            busy={busy}
            onPractice={(id) => void practiseErrors(id)}
            onOpenLesson={(id) => void openLesson(id)}
            onRegrade={(a) => void regrade(a)}
          />
        )}

        {screen === 'lesson' && lesson && (
          <LessonView
            key={lesson.id}
            lesson={lesson}
            step={state.current?.lesson === lesson.id ? state.current.step : 0}
            setStep={setStep}
            stats={snap.stats.get(lesson.id)!}
            snap={snap}
            user={user}
            theme={theme}
            ieltsGoal={profile.goal === 'ielts'}
            busy={busy}
            backLabel={TABS.find((t) => t.id === tab)!.label}
            onBack={() => goTab(tab)}
            onPractice={(mode) => void practise(lesson.id, mode)}
            onOpenLesson={(id) => void openLesson(id)}
            summary={
              finished && finished.lesson === lesson.id && finished.mode === 'learn' ? (
                resultFor(finished)
              ) : (
                <section className={card}>
                  <p className="text-[15px] text-slate-700 dark:text-slate-200">Làm phần luyện tập để xem bạn đã nắm bài đến đâu.</p>
                  <button type="button" className={primaryBtn + ' mt-3 w-full'} disabled={busy} onClick={() => void practise(lesson.id, 'learn')}>
                    Bắt đầu luyện tập
                  </button>
                </section>
              )
            }
          />
        )}

        {screen === 'result' && finished && resultFor(finished)}
        {screen === 'session' && <p className="text-sm text-slate-600 dark:text-slate-300">Đang tải bài…</p>}
      </div>

      <Sheet
        open={!!replace}
        onClose={() => setReplace(null)}
        title="Đổi phiên luyện?"
        footer={
          <div className="flex flex-col gap-2">
            <button type="button" className={primaryBtn} disabled={busy} onClick={() => replace && begin(replace)}>
              Mở phiên mới
            </button>
            <button type="button" className={secondaryBtn} disabled={busy} onClick={() => setReplace(null)}>
              Giữ phiên đang dở
            </button>
          </div>
        }
      >
        <p className="text-[15px] text-slate-700 dark:text-slate-200">
          Bạn còn một phiên chưa xong{draft ? ' (' + getMeta(draft.tasks[draft.index].lesson)?.title + ', câu ' + (draft.index + 1) + '/' + draft.tasks.length + ')' : ''}. Các câu đã
          nộp vẫn được lưu; phiên mới sẽ thay chỗ làm dở.
        </p>
      </Sheet>
    </main>
  );
}
