import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Languages,
  Lightbulb,
  Loader2,
  PenLine,
  Puzzle,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { TRANSLATION_SETS } from '../data/ielts/writingTranslations';
import {
  allSentences,
  answerProblem,
  assembledEssay,
  copiesModel,
  dueSentences,
  ERROR_LABELS,
  firstLetters,
  HINT_STEPS,
  markedParts,
  modelFor,
  nextLevel,
  scheduleSentence,
  scoreCap,
  sentenceFrame,
  sentenceKey,
  setProgress,
  trapTips,
  upgradeUnlocked,
  VERDICT_LABELS,
  verdictTone,
  pruneSentences,
  recordGrade,
  type TranslateState,
  type TranslationMode,
  type TranslationSentence,
  type TranslationSet,
} from '../services/writingTranslateLogic';
import {
  deleteGeneratedSet,
  GENERATED_SET_PREFIX,
  generateTranslationSet,
  gradeSentence,
  listGeneratedSets,
  loadTranslateState,
  logTranslationAttempt,
  saveTranslateState,
  TranslationSetError,
  type GradedSentence,
} from '../services/writingTranslateService';
import { aiErrorMessage } from '../services/aiClient';
import { getPreferences } from '../services/preferencesService';
import { IconTile } from '../components/ui/IconTile';
import { Segmented } from '../components/ui/Segmented';
import { toneClasses } from '../components/ui/palette';
import { field, ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../components/ui/styles';
import type { IeltsWritingTask } from '../types';
import { awardXp, useGameProfile } from '../services/reviewGameService';
import { XpBar, XpGain } from '../components/ielts/review/GameHud';
import { ChunkGame, HuntGame } from '../components/ielts/review/WritingGames';
import { MIN_OWN_ERRORS, type ChunkSource } from '../services/writingGamesLogic';
import { scoreXp } from '../services/reviewGameLogic';

export interface WritingTranslateApi {
  grade: typeof gradeSentence;
  log: typeof logTranslationAttempt;
  generate: typeof generateTranslationSet;
  list: typeof listGeneratedSets;
  remove: typeof deleteGeneratedSet;
}

const DEFAULT_API: WritingTranslateApi = {
  grade: gradeSentence,
  log: logTranslationAttempt,
  generate: generateTranslationSet,
  list: listGeneratedSets,
  remove: deleteGeneratedSet,
};

interface Props {
  userId: string;
  onBack: () => void;
  /** Write the whole essay of a bank prompt next. */
  onPracticeQuestion?: (questionId: string) => void;
  /** Open the band 6/7/8 sample essays. */
  onOpenSamples?: () => void;
  api?: WritingTranslateApi;
}

interface QueueItem {
  set: TranslationSet;
  sentence: TranslationSentence;
  paragraph: string;
  before?: string;
}

const queueFor = (set: TranslationSet): QueueItem[] => {
  const list = allSentences(set);
  return list.map(({ paragraph, sentence }, i) => ({ set, sentence, paragraph, before: i > 0 ? list[i - 1].sentence.vi : undefined }));
};

const TASK_OPTIONS = [
  { value: 'task_2' as const, label: 'Task 2 · Luận' },
  { value: 'task_1' as const, label: 'Task 1 · Biểu đồ' },
];

export default function IeltsWritingTranslate({ userId, onBack, onPracticeQuestion, onOpenSamples, api = DEFAULT_API }: Props) {
  const target = useMemo(() => getPreferences(userId).ieltsTargetBand, [userId]);
  const [state, setState] = useState<TranslateState>(() => loadTranslateState(userId, target));
  const [generated, setGenerated] = useState<TranslationSet[]>([]);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<TranslationMode>('translate');
  const [game, setGame] = useState<'chunks' | 'hunt' | null>(null);
  const profile = useGameProfile(userId);

  useEffect(() => {
    let live = true;
    api.list(userId).then(({ sets, complete }) => {
      if (!live) return;
      setGenerated(sets);
      // Records of sets that are gone (deleted, or never saved) would stay due forever.
      if (complete) {
        setState((s) => {
          const next = pruneSentences(s, new Set(sets.map((x) => x.id)), GENERATED_SET_PREFIX);
          if (next !== s) saveTranslateState(userId, next);
          return next;
        });
      }
    });
    return () => {
      live = false;
    };
  }, [api, userId]);

  const update = (next: TranslateState) => {
    setState(next);
    saveTranslateState(userId, next);
  };

  const sets = useMemo(() => [...generated, ...TRANSLATION_SETS], [generated]);
  const due = useMemo(() => dueSentences(state, sets, new Date()), [state, sets]);
  const canUpgrade = upgradeUnlocked(state.level);

  const open = (set: TranslationSet) => {
    const q = queueFor(set);
    // Resume at the first sentence not done yet.
    const first = q.findIndex((item) => !state.sentences[sentenceKey(set.id, item.sentence.id)]);
    setQueue(q);
    setReviewing(false);
    setIndex(first < 0 ? 0 : first);
  };

  const openReview = () => {
    setQueue(due.map(({ set, sentence }) => ({ set, sentence, paragraph: 'Ôn lại' })));
    setReviewing(true);
    setIndex(0);
  };

  if (game === 'chunks') {
    // Model sentences at the learner's band, from every set they can open.
    const pool: ChunkSource[] = sets.flatMap((set) =>
      allSentences(set).map(({ sentence }) => ({ key: sentenceKey(set.id, sentence.id), vi: sentence.vi, text: modelFor(sentence, state.level.band) })),
    );
    return <ChunkGame userId={userId} pool={pool} tried={new Set(Object.keys(state.sentences))} quiet={profile.quiet} best={profile.best.chunks} onExit={() => setGame(null)} />;
  }
  if (game === 'hunt') {
    return <HuntGame userId={userId} errors={state.errors} quiet={profile.quiet} best={profile.best.hunt} onExit={() => setGame(null)} />;
  }

  if (queue) {
    return (
      <Drill
        key={reviewing ? 'review' : queue[0]?.set.id}
        userId={userId}
        queue={queue}
        reviewing={reviewing}
        index={index}
        setIndex={setIndex}
        mode={canUpgrade ? mode : 'translate'}
        state={state}
        update={update}
        api={api}
        onExit={() => setQueue(null)}
        onPracticeQuestion={onPracticeQuestion}
        onOpenSamples={onOpenSamples}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Writing
      </button>
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Writing · Ôn tập</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Viết từng câu</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Dịch bài mẫu từ tiếng Việt sang tiếng Anh từng câu một. AI chấm ngay, chỉ ra lỗi và gợi ý câu hay hơn một bậc. Câu mẫu tự nâng độ khó khi bạn viết tốt.
        </p>
      </header>

      <XpBar userId={userId} profile={profile} compact />

      <LevelCard state={state} canUpgrade={canUpgrade} mode={mode} setMode={setMode} target={target} />

      <section aria-label="Trò chơi Writing" className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setGame('chunks')} className={`${panel} lift press flex items-center gap-3 p-4 text-left`}>
          <IconTile icon={Puzzle} tone="lavender" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">Khởi động: Xếp câu</span>
            <span className="block text-caption text-slate-600 dark:text-slate-400">Xếp lại 5 câu mẫu band {state.level.band} từ các mảnh. Nhanh, không cần AI.</span>
          </span>
        </button>
        <button type="button" onClick={() => setGame('hunt')} className={`${panel} lift press flex items-center gap-3 p-4 text-left`}>
          <IconTile icon={Search} tone="peach" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
              {state.errors.length >= MIN_OWN_ERRORS ? `Săn lỗi của tôi (${state.errors.length})` : 'Săn lỗi'}
            </span>
            <span className="block text-caption text-slate-600 dark:text-slate-400">
              {state.errors.length >= MIN_OWN_ERRORS
                ? 'Tìm và sửa những lỗi bạn từng mắc khi viết.'
                : 'Lỗi người Việt hay mắc. Viết vài câu để săn chính lỗi của bạn.'}
            </span>
          </span>
        </button>
      </section>

      {due.length > 0 && (
        <button type="button" onClick={openReview} className={`${panel} lift press group flex w-full items-center gap-3 p-4 text-left`}>
          <IconTile icon={History} tone="peach" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">Ôn lại {due.length} câu đến hạn</span>
            <span className="block text-caption text-slate-600 dark:text-slate-400">Những câu bạn viết chưa tốt quay lại sau 1, 3, 7 và 21 ngày.</span>
          </span>
          <ArrowRight className={`h-4 w-4 ${toneClasses('peach').text}`} aria-hidden />
        </button>
      )}

      <section aria-labelledby="tr-sets" className="space-y-2">
        <h2 id="tr-sets" className="text-sm font-bold text-slate-800 dark:text-white">Chọn bài</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {sets.map((set) => {
            const p = setProgress(state, set);
            const pct = Math.round((p.done / Math.max(1, p.total)) * 100);
            return (
              <li key={set.id} className={`${panel} flex flex-col gap-2 p-4`}>
                <div className="flex items-start gap-3">
                  <IconTile icon={set.source === 'generated' ? Sparkles : Languages} tone={set.task === 'task_1' ? 'sky' : 'lavender'} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{set.title}</p>
                    <p className="text-caption text-slate-600 dark:text-slate-400">
                      {p.total} câu · đã viết {p.done}
                      {p.average != null ? ` · điểm TB ${p.average}` : ''}
                    </p>
                  </div>
                  {set.source === 'generated' && (
                    <button
                      type="button"
                      aria-label="Xoá bộ câu"
                      className={`${ghostBtn} -mr-2 -mt-2`}
                      onClick={async () => {
                        if (!window.confirm('Xoá bộ câu này?')) return;
                        if (await api.remove(set.id)) {
                          setGenerated((g) => g.filter((s) => s.id !== set.id));
                          update(pruneSentences(state, new Set(generated.filter((s) => s.id !== set.id).map((s) => s.id)), GENERATED_SET_PREFIX));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                  <div className={`h-full ${toneClasses('mint').bar}`} style={{ width: `${pct}%` }} />
                </div>
                <button type="button" className={`${secondaryBtn} mt-1`} onClick={() => open(set)}>
                  {p.done === 0 ? 'Bắt đầu' : p.done >= p.total ? 'Viết lại từ đầu' : 'Viết tiếp'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <GenerateForm userId={userId} api={api} onCreated={(set) => setGenerated((g) => [set, ...g])} />
    </div>
  );
}

function LevelCard({
  state,
  canUpgrade,
  mode,
  setMode,
  target,
}: {
  state: TranslateState;
  canUpgrade: boolean;
  mode: TranslationMode;
  setMode: (m: TranslationMode) => void;
  target: number | null;
}) {
  const { level } = state;
  return (
    <section className={`rounded-2xl border p-4 ${toneClasses('mint').surface}`} aria-label="Trình độ hiện tại">
      <div className="flex flex-wrap items-center gap-3">
        <TrendingUp className={`h-5 w-5 ${toneClasses('mint').text}`} aria-hidden />
        <p className="flex-1 text-sm text-slate-800 dark:text-slate-100">
          Câu mẫu đang ở <strong>band {level.band}</strong>
          {level.estimate != null ? <> · câu bạn viết khoảng band {level.estimate.toFixed(1)}</> : null}
          {target ? <> · mục tiêu {target.toFixed(1)}</> : null}
        </p>
      </div>
      <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">
        Viết tốt 3 câu liền (từ 85 điểm, tối đa 1 gợi ý) thì câu mẫu lên một bậc; 2 câu dưới 55 điểm thì xuống một bậc.
      </p>
      {canUpgrade && (
        <div className="mt-3">
          <Segmented
            label="Cách luyện"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'translate', label: 'Dịch từ tiếng Việt' },
              { value: 'upgrade', label: 'Nâng cấp câu band 6' },
            ]}
          />
          <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">
            Từ band 7, dịch câu ít còn thử thách. Chế độ nâng cấp đưa câu band 6 để bạn viết lại lên band 8.
          </p>
        </div>
      )}
    </section>
  );
}

function GenerateForm({ userId, api, onCreated }: { userId: string; api: WritingTranslateApi; onCreated: (set: TranslationSet) => void }) {
  const [task, setTask] = useState<IeltsWritingTask>('task_2');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (prompt.trim().length < 30) {
      setError('Dán đầy đủ đề bài (ít nhất một câu hoàn chỉnh).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onCreated(await api.generate(userId, task, prompt));
      setPrompt('');
    } catch (e) {
      setError(e instanceof TranslationSetError ? e.message : aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="tr-gen" className={`${panel} space-y-3 p-4`}>
      <div className="flex items-center gap-3">
        <IconTile icon={Wand2} tone="butter" />
        <div>
          <h2 id="tr-gen" className="text-sm font-bold text-slate-900 dark:text-white">Tạo bộ câu từ đề của bạn</h2>
          <p className="text-caption text-slate-600 dark:text-slate-400">AI viết bài mẫu, tách từng câu kèm bản tiếng Việt và câu mẫu band 6 · 7 · 8.</p>
        </div>
      </div>
      <Segmented<IeltsWritingTask> label="Loại đề" value={task} onChange={setTask} options={TASK_OPTIONS} />
      <label className="block">
        <span className="sr-only">Đề bài</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={2500}
          placeholder={task === 'task_1' ? 'Dán đề Task 1, kèm các số liệu chính của biểu đồ…' : 'Dán đề Task 2, ví dụ: Some people think that…'}
          className={`${field} py-2`}
        />
      </label>
      {error && <p className="text-sm text-tone-blush-fg" role="alert">{error}</p>}
      <button type="button" className={primaryBtn} onClick={submit} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {busy ? 'Đang viết bộ câu (khoảng 1 phút)…' : 'Tạo bộ câu'}
      </button>
    </section>
  );
}

// --- The drill -------------------------------------------------------------------------

interface DrillProps {
  userId: string;
  queue: QueueItem[];
  reviewing: boolean;
  index: number;
  setIndex: (i: number) => void;
  mode: TranslationMode;
  state: TranslateState;
  update: (s: TranslateState) => void;
  api: WritingTranslateApi;
  onExit: () => void;
  onPracticeQuestion?: (questionId: string) => void;
  onOpenSamples?: () => void;
}

function Drill({ userId, queue, reviewing, index, setIndex, mode, state, update, api, onExit, onPracticeQuestion, onOpenSamples }: DrillProps) {
  const item = queue[index];
  const finished = index >= queue.length;
  const [answer, setAnswer] = useState('');
  const [hints, setHints] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [graded, setGraded] = useState<GradedSentence | null>(null);
  const [previous, setPrevious] = useState('');
  const [levelNote, setLevelNote] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  /** Sentences the feedback showed (corrected, upgraded): a retry may not just copy them. */
  const [shown, setShown] = useState<string[]>([]);
  const [xp, setXp] = useState({ paid: 0, pulse: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const profile = useGameProfile(userId);
  const band = state.level.band;

  // Fresh sentence: clear the box, keep focus in it.
  useEffect(() => {
    setAnswer(mode === 'upgrade' && item ? item.sentence.band6 : '');
    setHints(0);
    setGraded(null);
    setPrevious('');
    setShown([]);
    setXp({ paid: 0, pulse: 0 });
    setError('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [index, item, mode]);

  if (finished || !item) {
    const set = queue[0]?.set;
    return (
      <Finished
        set={reviewing ? undefined : set}
        state={state}
        reviewed={reviewing ? queue.length : 0}
        onExit={onExit}
        onPracticeQuestion={onPracticeQuestion}
        onOpenSamples={onOpenSamples}
      />
    );
  }

  const { set, sentence } = item;
  const model = mode === 'upgrade' ? sentence.band8 : modelFor(sentence, band);
  const record = state.sentences[sentenceKey(set.id, sentence.id)];

  const submit = async () => {
    const problem = answerProblem(answer, sentence.vi);
    if (problem) return setError(problem);
    // A retry comes after the feedback, which shows the model and the corrected sentence.
    const retry = !!previous;
    const shownModels = retry ? [model, ...shown] : hints >= HINT_STEPS.length ? [model] : [];
    if (copiesModel(answer, shownModels)) return setError('Đây là câu mẫu. Hãy che đi và viết lại bằng trí nhớ, hoặc thử cách diễn đạt của bạn.');
    setBusy(true);
    setError('');
    const req = { set, sentence, before: item.before, answer, band, mode, hintsUsed: hints, previous: previous || undefined };
    try {
      const g = await api.grade(req);
      setGraded(g);
      void api.log(userId, req, g);
      setShown([g.corrected, g.upgrade].filter(Boolean));
      const key = sentenceKey(set.id, sentence.id);
      // finalScore is already capped by the hints used. A retry pays nothing (the item already paid today).
      const paid = retry ? 0 : awardXp(userId, scoreXp(g.finalScore), 0, new Date(), `w:${key}`);
      setXp({ paid, pulse: Date.now() });
      // The level and the review schedule follow first tries only.
      const level = retry ? state.level : nextLevel(state.level, { score: g.finalScore, band: g.band, hintsUsed: hints });
      if (level.band > state.level.band) setLevelNote(`Bạn viết tốt 3 câu liền: câu mẫu lên band ${level.band}.`);
      else if (level.band < state.level.band) setLevelNote(`Câu mẫu tạm xuống band ${level.band} để bạn chắc tay hơn.`);
      else setLevelNote('');
      update({ ...recordGrade(state, key, { score: g.finalScore, answer: answer.trim(), errors: g.errors }, retry, new Date()), level });
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setPrevious(answer);
    setGraded(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const pct = Math.round((index / queue.length) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10 anim-fade-up">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onExit} className={`${ghostBtn} -ml-3`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Chọn bài
        </button>
        <span className="text-caption font-semibold tabular-nums text-slate-600 dark:text-slate-300">
          Câu {index + 1}/{queue.length}
        </span>
      </div>

      <header className="space-y-2">
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          {reviewing ? 'Ôn lại câu đến hạn' : set.title} · {item.paragraph}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
          <div className={`h-full transition-all ${toneClasses('lavender').bar}`} style={{ width: `${pct}%` }} />
        </div>
        <button type="button" className="inline-flex items-center gap-1 text-caption font-semibold text-tone-periwinkle-fg" onClick={() => setShowPrompt((v) => !v)} aria-expanded={showPrompt}>
          {showPrompt ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />} Đề bài
        </button>
        {showPrompt && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            <p>{set.prompt}</p>
            {set.dataNote && <p className="mt-1 text-caption text-slate-600 dark:text-slate-400">{set.dataNote}</p>}
          </div>
        )}
      </header>

      <section className={`rounded-2xl border p-4 ${toneClasses('lavender').surface}`} aria-label="Câu cần viết">
        <p className="text-caption font-semibold text-slate-600 dark:text-slate-300">{mode === 'upgrade' ? 'Ý của câu' : 'Dịch câu này sang tiếng Anh'}</p>
        <p className="mt-1 text-body font-semibold leading-relaxed text-slate-900 dark:text-white">{sentence.vi}</p>
        {mode === 'upgrade' && (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            <span className={tag}>Câu band 6</span> {sentence.band6}
          </p>
        )}
        {record && !graded && (
          <p className="mt-2 text-caption text-slate-600 dark:text-slate-300">Lần trước: {record.last} điểm · cao nhất {record.best}</p>
        )}
      </section>

      <Hints sentence={sentence} model={model} hints={hints} setHints={setHints} disabled={!!graded} />

      <div className="space-y-2">
        <label htmlFor="tr-answer" className="text-sm font-semibold text-slate-800 dark:text-white">
          {mode === 'upgrade' ? 'Viết lại hay hơn (band 8)' : `Câu của bạn (câu mẫu band ${band})`}
        </label>
        <textarea
          id="tr-answer"
          ref={inputRef}
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !graded && !busy) {
              e.preventDefault();
              void submit();
            }
          }}
          readOnly={!!graded}
          rows={3}
          maxLength={1000}
          spellCheck={false}
          autoComplete="off"
          className={`${field} py-2 text-body`}
          placeholder="Gõ câu tiếng Anh…"
        />
        {error && <p className="text-sm text-tone-blush-fg" role="alert">{error}</p>}
        {!graded && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={primaryBtn} onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
              {busy ? 'Đang chấm…' : previous ? 'Chấm lại' : 'Chấm câu'}
            </button>
            <span className="text-caption text-slate-500 dark:text-slate-400">Ctrl + Enter · điểm tối đa {scoreCap(hints)}</span>
          </div>
        )}
      </div>

      {graded && (
        <Feedback
          graded={graded}
          hints={hints}
          sentence={sentence}
          band={band}
          mode={mode}
          levelNote={levelNote}
          xp={<XpGain paid={xp.paid} retry={!!previous} quiet={profile.quiet} />}
          onRetry={retry}
          onNext={() => setIndex(index + 1)}
          last={index + 1 >= queue.length}
        />
      )}
    </div>
  );
}

function Hints({ sentence, model, hints, setHints, disabled }: { sentence: TranslationSentence; model: string; hints: number; setHints: (n: number) => void; disabled: boolean }) {
  const next = HINT_STEPS[hints];
  return (
    <section className="space-y-2" aria-label="Gợi ý">
      <div className="flex flex-wrap items-center gap-2">
        {next && !disabled && (
          <button type="button" className={secondaryBtn} onClick={() => setHints(hints + 1)}>
            <Lightbulb className={`h-4 w-4 ${toneClasses('butter').text}`} aria-hidden />
            Gợi ý {hints + 1}/{HINT_STEPS.length}: {next.label}
          </button>
        )}
        {hints > 0 && <span className="text-caption text-slate-500 dark:text-slate-400">Mỗi gợi ý hạ điểm tối đa của câu một chút.</span>}
      </div>
      {hints > 0 && (
        <ol className="space-y-2">
          {hints >= 1 && (
            <li className={`rounded-xl border p-3 text-sm ${toneClasses('butter').surface}`}>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Điểm cần chú ý</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700 dark:text-slate-200">
                {trapTips(sentence).map((t) => (
                  <li key={t.category}>
                    <strong>{ERROR_LABELS[t.category]}:</strong> {t.tip}
                  </li>
                ))}
              </ul>
            </li>
          )}
          {hints >= 2 && (
            <li className={`rounded-xl border p-3 text-sm ${toneClasses('butter').surface}`}>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Từ khoá</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {sentence.keys.map((k) => (
                  <li key={k.en} className="rounded-lg bg-white px-2 py-1 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                    <span className="font-semibold">{k.en}</span> <span className="text-slate-500 dark:text-slate-400">· {k.vi}</span>
                  </li>
                ))}
              </ul>
            </li>
          )}
          {hints >= 3 && <HintLine title="Chữ cái đầu" text={firstLetters(model)} mono />}
          {hints >= 4 && <HintLine title="Khung câu" text={sentenceFrame(model)} mono />}
          {hints >= 5 && <HintLine title="Câu mẫu" text={model} />}
        </ol>
      )}
    </section>
  );
}

const HintLine = ({ title, text, mono }: { title: string; text: string; mono?: boolean }) => (
  <li className={`rounded-xl border p-3 text-sm ${toneClasses('butter').surface}`}>
    <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
    <p className={`mt-1 text-slate-800 dark:text-slate-100 ${mono ? 'font-mono tracking-wide' : ''}`}>{text}</p>
  </li>
);

function Feedback({
  graded,
  hints,
  sentence,
  band,
  mode,
  levelNote,
  onRetry,
  onNext,
  last,
  xp,
}: {
  xp?: React.ReactNode;
  graded: GradedSentence;
  hints: number;
  sentence: TranslationSentence;
  band: number;
  mode: TranslationMode;
  levelNote: string;
  onRetry: () => void;
  onNext: () => void;
  last: boolean;
}) {
  const [allModels, setAllModels] = useState(false);
  const tone = verdictTone(graded.verdict);
  const capped = graded.score != null && graded.finalScore < graded.score;
  return (
    <section className="space-y-3 anim-fade-up" aria-live="polite" aria-label="Kết quả chấm">
      <div className={`rounded-2xl border p-4 ${toneClasses(tone).surface}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-lg px-2 py-0.5 text-sm font-bold ${toneClasses(tone).tile}`}>{VERDICT_LABELS[graded.verdict]}</span>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{graded.finalScore}/100</span>
          {graded.band != null && <span className="text-sm text-slate-700 dark:text-slate-200">· khoảng band {graded.band.toFixed(1)}</span>}
          {graded.revision === 'better' && <span className={tag}>Tốt hơn lần trước</span>}
          {graded.revision === 'worse' && <span className={tag}>Kém hơn lần trước</span>}
          {xp && <span className="ml-auto">{xp}</span>}
        </div>
        {capped && (
          <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">
            AI chấm {graded.score}, tính {graded.finalScore} vì đã dùng {hints} gợi ý.
          </p>
        )}
        {graded.explanationVi && <p className="mt-2 text-sm text-slate-800 dark:text-slate-100">{graded.explanationVi}</p>}
        <p className="mt-3 text-caption font-semibold text-slate-600 dark:text-slate-300">Sửa tối thiểu</p>
        <p className="text-body text-slate-900 dark:text-white">
          {markedParts(graded.corrected).map((p, i) =>
            p.changed ? (
              <mark key={i} className="rounded bg-tone-mint-soft px-0.5 font-semibold text-tone-mint-fg">
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
        {graded.errors.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {graded.errors.map((e, i) => (
              <li key={i} className="text-sm text-slate-800 dark:text-slate-100">
                <span className={tag}>{ERROR_LABELS[e.category]}</span>{' '}
                {e.original && <s className="text-slate-500">{e.original}</s>} → <strong>{e.corrected}</strong>
                {e.explanationVi && <span className="block text-caption text-slate-600 dark:text-slate-300">{e.explanationVi}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {graded.upgrade && (
        <div className={`rounded-2xl border p-4 ${toneClasses('sky').surface}`}>
          <p className="flex items-center gap-1.5 text-caption font-semibold text-slate-600 dark:text-slate-300">
            <TrendingUp className={`h-4 w-4 ${toneClasses('sky').text}`} aria-hidden /> Câu của bạn, nâng lên một bậc
          </p>
          <p className="mt-1 text-body text-slate-900 dark:text-white">{graded.upgrade}</p>
          {graded.upgradeNoteVi && <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">{graded.upgradeNoteVi}</p>}
        </div>
      )}

      <div className={`${panel} p-4`}>
        <p className="text-caption font-semibold text-slate-600 dark:text-slate-300">Câu mẫu band {mode === 'upgrade' ? 8 : band}</p>
        <p className="mt-1 text-body text-slate-900 dark:text-white">{mode === 'upgrade' ? sentence.band8 : modelFor(sentence, band as 6 | 7 | 8)}</p>
        <button type="button" className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-tone-periwinkle-fg" onClick={() => setAllModels((v) => !v)} aria-expanded={allModels}>
          {allModels ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />} So sánh band 6 · 7 · 8
        </button>
        {allModels && (
          <dl className="mt-2 space-y-1.5 text-sm">
            {([6, 7, 8] as const).map((b) => (
              <div key={b}>
                <dt className="text-caption font-semibold text-slate-500 dark:text-slate-400">Band {b}</dt>
                <dd className="text-slate-800 dark:text-slate-100">{modelFor(sentence, b)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {levelNote && (
        <p className={`rounded-xl border p-3 text-sm font-semibold ${toneClasses('mint').surface} text-slate-800 dark:text-slate-100`} role="status">
          {levelNote}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryBtn} onClick={onRetry}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Viết lại câu này
        </button>
        <button type="button" className={primaryBtn} onClick={onNext}>
          {last ? 'Xem cả bài' : 'Câu tiếp'} <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

function Finished({
  set,
  state,
  reviewed,
  onExit,
  onPracticeQuestion,
  onOpenSamples,
}: {
  set?: TranslationSet;
  state: TranslateState;
  reviewed: number;
  onExit: () => void;
  onPracticeQuestion?: (questionId: string) => void;
  onOpenSamples?: () => void;
}) {
  const progress = set ? setProgress(state, set) : null;
  const essay = set ? assembledEssay(state, set) : [];
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={onExit} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Chọn bài
      </button>
      <header className={`rounded-2xl border p-5 text-center ${toneClasses('mint').surface}`}>
        <Check className={`mx-auto h-8 w-8 ${toneClasses('mint').text}`} aria-hidden />
        <h1 className="mt-2 text-heading font-bold text-slate-900 dark:text-white">{set ? 'Xong cả bài!' : `Đã ôn ${reviewed} câu`}</h1>
        {progress && (
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            {progress.done}/{progress.total} câu · điểm trung bình {progress.average ?? '—'} · câu mẫu đang ở band {state.level.band}
          </p>
        )}
      </header>

      {essay.some((p) => p.text) && (
        <section className={`${panel} space-y-3 p-4`} aria-labelledby="tr-essay">
          <h2 id="tr-essay" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <BookOpen className="h-4 w-4" aria-hidden /> Bài bạn vừa viết
          </h2>
          {essay.map((p) =>
            p.text ? (
              <div key={p.label}>
                <p className="text-caption font-semibold text-slate-500 dark:text-slate-400">{p.label}</p>
                <p className="text-body leading-relaxed text-slate-900 dark:text-white">{p.text}</p>
              </div>
            ) : null,
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {set?.questionId && onPracticeQuestion && (
          <button type="button" className={primaryBtn} onClick={() => onPracticeQuestion(set.questionId!)}>
            <PenLine className="h-4 w-4" aria-hidden /> Tự viết cả bài, AI chấm band
          </button>
        )}
        {set?.sampleSetId && onOpenSamples && (
          <button type="button" className={secondaryBtn} onClick={onOpenSamples}>
            <BookOpen className="h-4 w-4" aria-hidden /> Xem bài mẫu band 6 · 7 · 8
          </button>
        )}
        <button type="button" className={secondaryBtn} onClick={onExit}>
          Chọn bài khác
        </button>
      </div>
    </div>
  );
}
