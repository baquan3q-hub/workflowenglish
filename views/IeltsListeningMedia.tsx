import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Flag,
  Globe2,
  Lightbulb,
  Loader2,
  Minus,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  applyTapMarks,
  blankHint,
  exerciseProblems,
  firstLetterHint,
  isTimed,
  maskedCheck,
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABELS,
  MEDIA_LEVELS,
  nudgeSentence,
  parseAudioUrl,
  recordSentence,
  revealNextWord,
  summarizeProgress,
  SUGGESTED_SOURCES,
  transcriptToSentences,
  emptyProgress,
  type DictationProgress,
  type MediaCategory,
  type MediaExercise,
  type MediaLevel,
  type MediaSentence,
  type MediaSource,
} from '../services/mediaDictationLogic';
import { compareDictation, type DictationResult } from '../services/listeningDrillLogic';
import {
  deleteExercise,
  listExercises,
  loadProgress,
  MAX_CLIP_SECONDS,
  saveExercise,
  saveProgress,
  transcribeVideo,
  type StoredExercise,
} from '../services/mediaDictationService';
import { formatTimestamp, parseTimestamp, parseYouTubeId, youtubeThumbnail } from '../services/youtubeLogic';
import { aiErrorMessage } from '../services/aiClient';
import MediaStage, { type MediaStageHandle } from '../components/ielts/listening/MediaStage';
import { DictationTokens, accuracyTone } from '../components/ielts/DictationTokens';
import { Segmented } from '../components/ui/Segmented';
import { toneClasses } from '../components/ui/palette';
import { field, ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../components/ui/styles';
import type { CreatePlayer } from '../components/ielts/listening/youtubeMedia';
import { awardXp } from '../services/reviewGameService';
import { scoreXp } from '../services/reviewGameLogic';

export interface ListeningMediaApi {
  list: typeof listExercises;
  save: typeof saveExercise;
  remove: typeof deleteExercise;
  loadProgress: typeof loadProgress;
  saveProgress: typeof saveProgress;
  transcribe: typeof transcribeVideo;
}

const DEFAULT_API: ListeningMediaApi = { list: listExercises, save: saveExercise, remove: deleteExercise, loadProgress, saveProgress, transcribe: transcribeVideo };

interface Props {
  userId: string;
  isAdmin?: boolean;
  onBack: () => void;
  api?: ListeningMediaApi;
  createPlayer?: CreatePlayer;
}

type Screen = { kind: 'library' } | { kind: 'studio'; exercise?: StoredExercise } | { kind: 'play'; exercise: StoredExercise };

export default function IeltsListeningMedia({ userId, isAdmin = false, onBack, api = DEFAULT_API, createPlayer }: Props) {
  const [screen, setScreen] = useState<Screen>({ kind: 'library' });
  const [exercises, setExercises] = useState<StoredExercise[] | null>(null);

  const reload = useCallback(() => {
    api.list(userId).then(setExercises);
  }, [api, userId]);
  useEffect(reload, [reload]);

  if (screen.kind === 'studio') {
    return (
      <Studio
        userId={userId}
        isAdmin={isAdmin}
        initial={screen.exercise}
        api={api}
        createPlayer={createPlayer}
        onCancel={() => setScreen({ kind: 'library' })}
        onSaved={(e) => {
          setExercises((list) => [e, ...(list ?? []).filter((x) => x.id !== e.id)]);
          setScreen({ kind: 'play', exercise: e });
        }}
      />
    );
  }
  if (screen.kind === 'play') {
    return <Player userId={userId} exercise={screen.exercise} api={api} createPlayer={createPlayer} onBack={() => setScreen({ kind: 'library' })} />;
  }
  return (
    <Library
      exercises={exercises}
      onBack={onBack}
      onAdd={() => setScreen({ kind: 'studio' })}
      onOpen={(e) => setScreen({ kind: 'play', exercise: e })}
      onEdit={(e) => setScreen({ kind: 'studio', exercise: e })}
      onDelete={(e) => {
        setExercises((list) => (list ?? []).filter((x) => x.id !== e.id));
        void api.remove(userId, e.id);
      }}
    />
  );
}

// --- Library -------------------------------------------------------------------

function Library({
  exercises,
  onBack,
  onAdd,
  onOpen,
  onEdit,
  onDelete,
}: {
  exercises: StoredExercise[] | null;
  onBack: () => void;
  onAdd: () => void;
  onOpen: (e: StoredExercise) => void;
  onEdit: (e: StoredExercise) => void;
  onDelete: (e: StoredExercise) => void;
}) {
  const [category, setCategory] = useState<MediaCategory | 'all'>('all');
  const [level, setLevel] = useState<MediaLevel | 'all'>('all');
  const shown = (exercises ?? []).filter((e) => (category === 'all' || e.category === category) && (level === 'all' || e.level === level));
  const published = shown.filter((e) => e.status === 'published');
  const own = shown.filter((e) => e.own && e.status !== 'published');

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Listening
      </button>
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Listening · Ôn tập</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Chép chính tả từ video và podcast</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Nghe từng câu của một video YouTube, podcast hay truyện audio rồi gõ lại. Bấm Ctrl để nghe lại, Enter để kiểm tra: phần đúng hiện ra, phần sai bị che bằng dấu *.
        </p>
      </header>

      <button type="button" onClick={onAdd} className={`${primaryBtn} w-full sm:w-auto`}>
        <Plus className="h-4 w-4" aria-hidden /> Thêm bài từ link YouTube hoặc audio
      </button>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Thể loại</span>
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value as MediaCategory | 'all')}>
            <option value="all">Mọi thể loại</option>
            {MEDIA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MEDIA_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <Segmented<MediaLevel | 'all'>
          label="Trình độ"
          value={level}
          onChange={setLevel}
          options={[{ value: 'all', label: 'Tất cả' }, ...MEDIA_LEVELS.map((l) => ({ value: l, label: l }))]}
        />
      </div>

      {exercises === null ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang tải bài nghe…
        </p>
      ) : (
        <>
          <ExerciseList title="Thư viện" empty="Chưa có bài nào được đăng ở mục này." items={published} onOpen={onOpen} />
          <ExerciseList title="Bài của bạn" empty="Bạn chưa thêm bài nào. Dán link một video bạn thích để bắt đầu." items={own} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
        </>
      )}

      <section className={`${panel} space-y-2 p-4`} aria-labelledby="lm-sources">
        <h2 id="lm-sources" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Globe2 className="h-4 w-4" aria-hidden /> Tìm bài ở đâu
        </h2>
        <ul className="space-y-2">
          {SUGGESTED_SOURCES.map((s) => (
            <li key={s.name} className="text-sm">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-tone-sky-fg hover:underline">
                {s.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <span className="text-slate-600 dark:text-slate-400">
                {' '}
                · {s.kindVi} · {s.levels}
              </span>
              <span className="block text-caption text-slate-500 dark:text-slate-400">{s.licenceVi}</span>
            </li>
          ))}
        </ul>
        <p className="text-caption text-slate-500 dark:text-slate-400">
          Trên YouTube: mở video, bấm “…” → “Hiện bản chép lời”, chọn hết và dán vào đây; mốc thời gian được giữ lại. Không có bản chép lời thì để AI chép giúp.
        </p>
      </section>
    </div>
  );
}

function ExerciseList({
  title,
  empty,
  items,
  onOpen,
  onEdit,
  onDelete,
}: {
  title: string;
  empty: string;
  items: StoredExercise[];
  onOpen: (e: StoredExercise) => void;
  onEdit?: (e: StoredExercise) => void;
  onDelete?: (e: StoredExercise) => void;
}) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((e) => (
            <li key={e.id} className={`${panel} flex flex-col overflow-hidden`}>
              <button type="button" onClick={() => onOpen(e)} className="press flex flex-1 gap-3 p-3 text-left">
                {e.source.kind === 'youtube' ? (
                  <img src={youtubeThumbnail(e.source.videoId)} alt="" className="h-16 w-28 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <span className={`flex h-16 w-28 flex-shrink-0 items-center justify-center rounded-lg ${toneClasses('aqua').tile}`}>
                    <Play className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-semibold text-slate-900 dark:text-white">{e.title}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <span className={tag}>{e.level}</span>
                    <span className={tag}>{MEDIA_CATEGORY_LABELS[e.category]}</span>
                    <span className={tag}>{e.sentences.length} câu</span>
                  </span>
                </span>
              </button>
              {(onEdit || onDelete) && (
                <div className="flex justify-end gap-1 border-t border-slate-100 px-2 dark:border-slate-800">
                  {onEdit && (
                    <button type="button" className={ghostBtn} onClick={() => onEdit(e)} aria-label={`Sửa ${e.title}`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" className={ghostBtn} onClick={() => window.confirm('Xoá bài này?') && onDelete(e)} aria-label={`Xoá ${e.title}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// --- Studio --------------------------------------------------------------------

function readSource(input: string): MediaSource | null {
  const id = parseYouTubeId(input);
  if (id) return { kind: 'youtube', videoId: id };
  const url = parseAudioUrl(input);
  return url ? { kind: 'audio', url } : null;
}

interface StudioProps {
  userId: string;
  isAdmin: boolean;
  initial?: StoredExercise;
  api: ListeningMediaApi;
  createPlayer?: CreatePlayer;
  onCancel: () => void;
  onSaved: (e: StoredExercise) => void;
}

function Studio({ userId, isAdmin, initial, api, createPlayer, onCancel, onSaved }: StudioProps) {
  const [link, setLink] = useState(initial ? (initial.source.kind === 'youtube' ? `https://youtu.be/${initial.source.videoId}` : initial.source.url) : '');
  const source = useMemo(() => readSource(link), [link]);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<MediaCategory>(initial?.category ?? 'other');
  const [level, setLevel] = useState<MediaLevel>(initial?.level ?? 'B1');
  const [credit, setCredit] = useState(initial?.credit ?? '');
  const [sentences, setSentences] = useState<MediaSentence[]>(initial?.sentences ?? []);
  const [how, setHow] = useState<'paste' | 'ai'>('paste');
  const [pasted, setPasted] = useState('');
  const [from, setFrom] = useState('0:00');
  const [to, setTo] = useState('5:00');
  const [busy, setBusy] = useState<'' | 'ai' | 'save'>('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [tapping, setTapping] = useState<number[] | null>(null);
  const stage = useRef<MediaStageHandle>(null);

  const problems = exerciseProblems({ title, sentences });

  const readPasted = () => {
    const { format, sentences: s } = transcriptToSentences(pasted);
    setSentences(s);
    setNote(
      s.length === 0
        ? 'Không đọc được câu nào.'
        : format === 'plain'
          ? `Đã tách ${s.length} câu nhưng chưa có mốc thời gian. Bấm “Chấm mốc” và nghe, mỗi khi hết một câu thì bấm “Hết câu”.`
          : `Đã tách ${s.length} câu có mốc thời gian (${format.toUpperCase()}). Nghe thử vài câu và chỉnh nếu lệch.`,
    );
  };

  const runAi = async () => {
    if (source?.kind !== 'youtube') return;
    const start = parseTimestamp(from) ?? 0;
    const end = parseTimestamp(to) ?? start + 300;
    if (end <= start || end - start > MAX_CLIP_SECONDS) {
      setError(`Chọn một đoạn dài tối đa ${MAX_CLIP_SECONDS / 60} phút.`);
      return;
    }
    setBusy('ai');
    setError('');
    try {
      const s = await api.transcribe(source.videoId, start, end);
      if (s.length < 2) {
        setError('Không nghe được lời nói tiếng Anh trong đoạn này. Thử đoạn khác hoặc dán phụ đề.');
        return;
      }
      setSentences(s);
      setNote(`AI đã chép ${s.length} câu. Mốc thời gian có thể lệch khoảng 1 giây: nghe thử và chỉnh bằng nút − / +.`);
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  /** Mirrors tapping, so fast key presses never mark from a stale list. */
  const marks = useRef<number[] | null>(null);
  const startTapping = () => {
    marks.current = [];
    setTapping([]);
    void stage.current?.playFrom(0);
  };
  const tap = useCallback(() => {
    if (!marks.current) return;
    const next = [...marks.current, Math.round((stage.current?.time() ?? 0) * 100) / 100];
    setSentences((list) => applyTapMarks(list, next));
    if (next.length >= sentences.length) {
      stage.current?.pause();
      marks.current = null;
      setTapping(null);
    } else {
      marks.current = next;
      setTapping(next);
    }
  }, [sentences.length]);
  useEffect(() => {
    if (!tapping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tapping, tap]);

  const save = async (publish: boolean) => {
    if (!source || problems.length) return;
    setBusy('save');
    const exercise: MediaExercise = { id: initial?.id ?? '', title: title.trim(), source, category, level, sentences, credit: credit.trim() || undefined };
    const saved = await api.save(userId, exercise, publish);
    setBusy('');
    onSaved(saved);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={onCancel} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Thư viện
      </button>
      <h1 className="text-heading font-bold text-slate-900 dark:text-white">{initial ? 'Sửa bài nghe' : 'Thêm bài nghe'}</h1>

      <section className={`${panel} space-y-3 p-4`} aria-label="Nguồn">
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">1. Link YouTube hoặc file audio</span>
          <input className={field} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=… hoặc https://…/story.mp3" />
        </label>
        {link.trim() && !source && <p className="text-caption text-tone-blush-fg">Link chưa đúng. Dán link video YouTube hoặc link trực tiếp tới file .mp3.</p>}
        {source && <MediaStage ref={stage} key={source.kind === 'youtube' ? source.videoId : source.url} source={source} onError={setError} create={createPlayer} />}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">Tên bài</span>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="VOA: How Coffee Became Popular" />
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">Thể loại</span>
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value as MediaCategory)}>
              {MEDIA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {MEDIA_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">Trình độ</span>
            <select className={field} value={level} onChange={(e) => setLevel(e.target.value as MediaLevel)}>
              {MEDIA_LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">Nguồn / ghi công (không bắt buộc)</span>
            <input className={field} value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={200} placeholder="VOA Learning English (public domain)" />
          </label>
        </div>
      </section>

      <section className={`${panel} space-y-3 p-4`} aria-label="Lời thoại">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">2. Lời thoại</h2>
          <Segmented<'paste' | 'ai'>
            label="Cách lấy lời thoại"
            value={how}
            onChange={setHow}
            options={[
              { value: 'paste', label: 'Dán phụ đề' },
              { value: 'ai', label: 'AI chép lời' },
            ]}
          />
        </div>
        {how === 'paste' ? (
          <>
            <textarea
              className={`${field} min-h-[140px] py-2 font-mono text-caption`}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={'Dán SRT, WebVTT, bản chép lời của YouTube (0:05 …) hoặc văn bản thường'}
            />
            <button type="button" className={secondaryBtn} disabled={!pasted.trim()} onClick={readPasted}>
              Tách thành câu
            </button>
          </>
        ) : source?.kind === 'youtube' ? (
          <div className="space-y-2">
            <p className="text-caption text-slate-600 dark:text-slate-400">AI xem video và chép lời từng câu kèm mốc thời gian. Mỗi lần tối đa {MAX_CLIP_SECONDS / 60} phút.</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1">
                <span className="block text-caption font-semibold">Từ</span>
                <input className={`${field} w-24`} value={from} onChange={(e) => setFrom(e.target.value)} inputMode="decimal" />
              </label>
              <label className="space-y-1">
                <span className="block text-caption font-semibold">Đến</span>
                <input className={`${field} w-24`} value={to} onChange={(e) => setTo(e.target.value)} inputMode="decimal" />
              </label>
              <button type="button" className={primaryBtn} onClick={runAi} disabled={busy === 'ai'}>
                {busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                {busy === 'ai' ? 'AI đang nghe… (tới 2 phút)' : 'Chép lời bằng AI'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">AI chép lời chỉ dùng được với video YouTube. Với file audio, hãy dán văn bản rồi chấm mốc.</p>
        )}
        {note && <p className="text-caption text-slate-600 dark:text-slate-400">{note}</p>}
        {error && (
          <p role="alert" className="text-sm text-tone-blush-fg">
            {error}
          </p>
        )}
      </section>

      {sentences.length > 0 && (
        <section className={`${panel} space-y-3 p-4`} aria-label="Các câu">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">3. Các câu ({sentences.length})</h2>
            {source &&
              (tapping ? (
                <button type="button" className={primaryBtn} onClick={tap}>
                  <Flag className="h-4 w-4" aria-hidden /> Hết câu {tapping.length + 1} (phím M)
                </button>
              ) : (
                <button type="button" className={secondaryBtn} onClick={startTapping}>
                  <Flag className="h-4 w-4" aria-hidden /> Chấm mốc khi nghe
                </button>
              ))}
          </div>
          <ol className="space-y-2">
            {sentences.map((s, i) => (
              <li key={s.id} className={`rounded-xl border p-2 ${tapping && i === tapping.length ? 'border-tone-peach-border' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-6 text-caption tabular-nums text-slate-500">{i + 1}</span>
                  <textarea
                    className={`${field} min-h-[44px] flex-1 py-2`}
                    value={s.text}
                    rows={1}
                    onChange={(e) => setSentences((list) => list.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))}
                    aria-label={`Câu ${i + 1}`}
                  />
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => setSentences((list) => list.filter((_, k) => k !== i).map((x, k) => ({ ...x, id: `s${k + 1}` })))}
                    aria-label={`Xoá câu ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 pl-8 text-caption tabular-nums text-slate-600 dark:text-slate-400">
                  {isTimed(s) ? (
                    <>
                      <button type="button" className={ghostBtn} onClick={() => stage.current?.playRange(Math.max(0, s.start - 0.25), s.end + 0.4)} aria-label={`Nghe câu ${i + 1}`}>
                        <Play className="h-4 w-4" aria-hidden />
                      </button>
                      <Nudge label="Đầu" value={s.start} onNudge={(d) => setSentences((list) => nudgeSentence(list, i, 'start', d))} />
                      <Nudge label="Cuối" value={s.end} onNudge={(d) => setSentences((list) => nudgeSentence(list, i, 'end', d))} />
                    </>
                  ) : (
                    <span>Chưa có mốc thời gian</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="space-y-2">
        {problems.length > 0 && sentences.length > 0 && <p className="text-caption text-tone-blush-fg">{problems.join(' ')}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryBtn} disabled={!source || problems.length > 0 || busy === 'save'} onClick={() => save(false)}>
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Lưu và luyện
          </button>
          {isAdmin && (
            <button type="button" className={secondaryBtn} disabled={!source || problems.length > 0 || busy === 'save'} onClick={() => save(true)}>
              <Globe2 className="h-4 w-4" aria-hidden /> Đăng cho mọi người
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Nudge({ label, value, onNudge }: { label: string; value: number; onNudge: (delta: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-lg bg-slate-50 px-1 dark:bg-slate-800">
      {label}
      <button type="button" className="press inline-flex h-8 w-8 items-center justify-center rounded" onClick={() => onNudge(-0.25)} aria-label={`${label} sớm hơn`}>
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span className="w-12 text-center">{formatTimestamp(value)}</span>
      <button type="button" className="press inline-flex h-8 w-8 items-center justify-center rounded" onClick={() => onNudge(0.25)} aria-label={`${label} muộn hơn`}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}

// --- Player --------------------------------------------------------------------

const HINTS = ['Số từ', 'Chữ cái đầu', 'Hiện từ tiếp theo', 'Xem đáp án'] as const;

interface PlayerProps {
  userId: string;
  exercise: StoredExercise;
  api: ListeningMediaApi;
  createPlayer?: CreatePlayer;
  onBack: () => void;
}

function Player({ userId, exercise, api, createPlayer, onBack }: PlayerProps) {
  const sentences = useMemo(() => exercise.sentences.filter(isTimed), [exercise]);
  const [progress, setProgress] = useState<DictationProgress>(emptyProgress);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [hint, setHint] = useState(0);
  const [check, setCheck] = useState<ReturnType<typeof maskedCheck> | null>(null);
  const [result, setResult] = useState<DictationResult | null>(null);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const stage = useRef<MediaStageHandle>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const ctrlAlone = useRef(false);

  useEffect(() => {
    let live = true;
    api.loadProgress(userId, exercise.id).then((p) => {
      if (!live) return;
      setProgress(p);
      setIndex(Math.min(p.index, sentences.length));
    });
    return () => {
      live = false;
    };
  }, [api, userId, exercise.id, sentences.length]);

  const sentence = sentences[index];
  const done = index >= sentences.length;
  const summary = summarizeProgress(progress, sentences.length);

  const play = useCallback(() => {
    if (!sentence) return;
    void stage.current?.playRange(Math.max(0, sentence.start - 0.25), sentence.end + 0.4, slow ? 0.75 : 1);
  }, [sentence, slow]);

  const go = (i: number, autoplay = true) => {
    stage.current?.pause();
    setIndex(i);
    setTyped('');
    setHint(0);
    setCheck(null);
    setResult(null);
    const next = sentences[i];
    if (autoplay && next) setTimeout(() => void stage.current?.playRange(Math.max(0, next.start - 0.25), next.end + 0.4, slow ? 0.75 : 1), 0);
    setTimeout(() => input.current?.focus(), 0);
  };

  const finish = (revealed: boolean, text = typed) => {
    if (!sentence) return;
    const r = compareDictation(sentence.text, text);
    setResult(r);
    const p = recordSentence(progress, sentence.id, r.accuracy, revealed, index + 1, new Date());
    setProgress(p);
    void api.saveProgress(userId, exercise.id, p);
    awardXp(userId, scoreXp(r.accuracy, revealed ? 3 : 0));
  };

  const runCheck = () => {
    if (!sentence || !typed.trim() || result) return;
    const c = maskedCheck(sentence.text, typed);
    setCheck(c);
    if (c.complete) finish(false);
  };

  const nextHint = () => {
    if (!sentence) return;
    const h = Math.min(hint + 1, HINTS.length);
    setHint(h);
    if (h === 3) setTyped((t) => revealNextWord(sentence.text, t));
    if (h === 4) {
      setTyped(sentence.text);
      finish(true, typed);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Thư viện
      </button>
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          {exercise.level} · {MEDIA_CATEGORY_LABELS[exercise.category]}
          {exercise.credit ? ` · ${exercise.credit}` : ''}
        </p>
        <h1 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{exercise.title}</h1>
      </header>

      <div className="md:sticky md:top-2 md:z-10">
        <MediaStage ref={stage} source={exercise.source} onError={setError} create={createPlayer} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-tone-blush-fg">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <span className="block h-full rounded-full bg-tone-sky-accent transition-all" style={{ width: `${summary.percent}%` }} />
        </span>
        <span className="text-caption tabular-nums text-slate-500 dark:text-slate-400">
          Câu {Math.min(index + 1, sentences.length)}/{sentences.length}
        </span>
      </div>

      {sentence && (
        <section className={`${panel} space-y-3 p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={primaryBtn} onClick={play}>
              <Play className="h-4 w-4" aria-hidden /> Nghe (Ctrl)
            </button>
            <button type="button" role="switch" aria-checked={slow} onClick={() => setSlow((v) => !v)} className={`${secondaryBtn} ${slow ? toneClasses('sky').tile : ''}`}>
              Chậm 0.75×
            </button>
            <button type="button" className={ghostBtn} onClick={nextHint} disabled={!!result}>
              <Lightbulb className="h-4 w-4" aria-hidden /> {hint < HINTS.length ? `Gợi ý: ${HINTS[hint]}` : 'Hết gợi ý'}
            </button>
          </div>

          {hint >= 1 && !result && <p className="font-mono text-sm tracking-wide text-slate-600 dark:text-slate-300">{hint >= 2 ? firstLetterHint(sentence.text) : blankHint(sentence.text)}</p>}

          <label className="block">
            <span className="sr-only">Câu bạn nghe được</span>
            <textarea
              ref={input}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setCheck(null);
              }}
              onKeyDown={(e) => {
                ctrlAlone.current = e.key === 'Control';
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (result) go(index + 1);
                  else runCheck();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === 'Control' && ctrlAlone.current) play();
                ctrlAlone.current = false;
              }}
              readOnly={!!result}
              rows={3}
              placeholder="Gõ những gì bạn nghe được…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={`${field} py-2 text-base read-only:bg-slate-50 dark:read-only:bg-slate-900`}
            />
          </label>

          {check && !result && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="font-mono text-base leading-relaxed text-slate-900 dark:text-white">{check.shown}</p>
              <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">
                Đúng {check.correct}/{check.total} từ đầu. Dấu * là phần cần nghe lại.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">Câu gốc</span>
                <span className={`text-sm font-bold tabular-nums ${accuracyTone(result.accuracy)}`}>{result.accuracy}%</span>
              </p>
              <DictationTokens tokens={result.tokens} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {result ? (
              <>
                <button type="button" className={primaryBtn} onClick={() => go(index + 1)}>
                  {index + 1 < sentences.length ? 'Câu tiếp (Enter)' : 'Xem tổng kết'} <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" className={secondaryBtn} onClick={() => go(index)}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Làm lại câu này
                </button>
              </>
            ) : (
              <>
                <button type="button" className={primaryBtn} onClick={runCheck} disabled={!typed.trim()}>
                  <Check className="h-4 w-4" aria-hidden /> Kiểm tra (Enter)
                </button>
                <button type="button" className={secondaryBtn} onClick={() => go(index + 1)}>
                  Bỏ qua
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {done && (
        <section className={`${panel} space-y-3 p-4`}>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Xong bài</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Đã làm {summary.done}/{summary.total} câu, đúng trung bình {summary.average}% số từ, {summary.mastered} câu từ 90% trở lên.
          </p>
          <ul className="space-y-1">
            {sentences
              .map((s, i) => ({ s, i, score: progress.best[s.id] }))
              .filter((x) => x.score === undefined || x.score < 80)
              .slice(0, 10)
              .map(({ s, i, score }) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className="flex min-h-touch w-full items-center gap-3 rounded-xl px-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className={`w-10 flex-shrink-0 font-bold tabular-nums ${score === undefined ? 'text-slate-400' : accuracyTone(score)}`}>{score === undefined ? '–' : `${score}%`}</span>
                    <span className="line-clamp-1 text-slate-800 dark:text-slate-200">Câu {i + 1}</span>
                  </button>
                </li>
              ))}
          </ul>
          <button type="button" className={primaryBtn} onClick={() => go(0)}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Làm lại từ đầu
          </button>
        </section>
      )}

      <p className="text-caption text-slate-500 dark:text-slate-400">
        Mẹo: nghe hết câu rồi mới gõ. Nghe lại nhiều lần là bình thường; gợi ý “Xem đáp án” tính câu đó là chưa tự làm được.
      </p>
    </div>
  );
}
