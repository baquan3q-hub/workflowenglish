import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Mic,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  afterPractice,
  bankQuestions,
  cueFrame,
  customQuestionKey,
  fadeWords,
  framesFor,
  hasIdeas,
  isDue,
  keywordCoverage,
  keywordsFor,
  newSavedAnswer,
  PART_LABELS,
  practiceOrder,
  PRACTICE_STAGES,
  soundsMemorised,
  starterFor,
  verbatimShare,
  withAnswer,
  type AnswerFrame,
  type BankQuestion,
  type PracticeRating,
  type SavedAnswer,
  type SpeakingPartKey,
} from '../services/speakingBankLogic';
import { bandForTarget, buildAnswer, deleteAnswer, loadSavedAnswers, saveAnswer, SpeakingAnswerError } from '../services/speakingBankService';
import { aiErrorMessage } from '../services/aiClient';
import { getPreferences } from '../services/preferencesService';
import { transcribeAudioWithGemini } from '../services/ieltsSpeakingService';
import { blobToBase64, cancelRecording, formatDuration, isRecordingSupported, startRecording, stopRecording } from '../services/speechService';
import { speakText } from '../services/browserSpeech';
import { IconTile } from '../components/ui/IconTile';
import { Segmented } from '../components/ui/Segmented';
import { toneClasses } from '../components/ui/palette';
import { field, ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../components/ui/styles';
import { awardXp } from '../services/reviewGameService';
import { PRACTICE_XP } from '../services/reviewGameLogic';

export interface SpeakingBankApi {
  load: typeof loadSavedAnswers;
  save: typeof saveAnswer;
  remove: typeof deleteAnswer;
  build: typeof buildAnswer;
  transcribe: (base64: string, mimeType: string) => Promise<string>;
}

const DEFAULT_API: SpeakingBankApi = {
  load: loadSavedAnswers,
  save: saveAnswer,
  remove: deleteAnswer,
  build: buildAnswer,
  transcribe: transcribeAudioWithGemini,
};

interface Props {
  userId: string;
  onBack: () => void;
  api?: SpeakingBankApi;
}

type Filter = SpeakingPartKey | 'saved';
type Target = Pick<BankQuestion, 'key' | 'part' | 'question' | 'bullets'> & Partial<BankQuestion>;

const QUESTIONS = bankQuestions();

const errorText = (err: unknown) => (err instanceof SpeakingAnswerError ? err.message : aiErrorMessage(err));

export default function IeltsSpeakingBank({ userId, onBack, api = DEFAULT_API }: Props) {
  const target = useMemo(() => getPreferences(userId).ieltsTargetBand, [userId]);
  const band = bandForTarget(target);
  const [saved, setSaved] = useState<Record<string, SavedAnswer>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('part_1');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Target | null>(null);
  const [practice, setPractice] = useState<string[] | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.load(userId).then((list) => {
      if (!live) return;
      setSaved(Object.fromEntries(list.map((s) => [s.key, s])));
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [userId, api]);

  const store = (s: SavedAnswer) => {
    setSaved((prev) => ({ ...prev, [s.key]: s }));
    void api.save(userId, s);
  };
  const drop = (key: string) => {
    setSaved((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    void api.remove(userId, key);
  };

  const now = new Date();
  const savedList = Object.values(saved).filter((s) => s.answer.trim());
  const due = practiceOrder(savedList, now).filter((s) => isDue(s, now));

  if (practice) {
    return <Practice userId={userId} keys={practice} saved={saved} store={store} api={api} onExit={() => setPractice(null)} />;
  }
  if (open) {
    return (
      <Builder
        target={open}
        saved={saved[open.key]}
        band={band}
        api={api}
        store={store}
        drop={drop}
        onBack={() => setOpen(null)}
        onPractice={(key) => setPractice([key])}
      />
    );
  }

  const term = search.trim().toLowerCase();
  const questions =
    filter === 'saved'
      ? practiceOrder(savedList, now).map(
          (s): BankQuestion =>
            QUESTIONS.find((q) => q.key === s.key) ?? { key: s.key, part: s.part, question: s.question, bullets: s.bullets, topicId: 'custom', topicVi: 'Câu hỏi của bạn', ideasVi: [], vocabulary: [] },
        )
      : QUESTIONS.filter((q) => q.part === filter);
  const shown = term ? questions.filter((q) => q.question.toLowerCase().includes(term) || q.topicVi.toLowerCase().includes(term)) : questions;
  const groups = groupByTopic(shown);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Speaking
      </button>
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Speaking · Ôn tập</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Kho câu trả lời của bạn</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Mỗi câu hỏi có bài mẫu và khung trả lời. Ghi ý của bạn vào khung (tiếng Việt cũng được), AI viết thành câu trả lời band {band} và lưu lại. Sau đó luyện nói
          bớt dần chữ cho tới khi chỉ cần nhìn câu hỏi.
        </p>
      </header>

      {due.length > 0 && (
        <button type="button" onClick={() => setPractice(due.map((s) => s.key))} className={`${panel} lift press group flex w-full items-center gap-3 p-4 text-left`}>
          <IconTile icon={History} tone="peach" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">Luyện {due.length} câu đến hạn</span>
            <span className="block text-caption text-slate-600 dark:text-slate-400">Câu nào nói tốt sẽ quay lại thưa dần: 1, 2, 4, 8, 16 ngày.</span>
          </span>
          <ArrowRight className={`h-4 w-4 ${toneClasses('peach').text}`} aria-hidden />
        </button>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented<Filter>
          label="Phần thi"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'part_1', label: 'Part 1' },
            { value: 'part_2', label: 'Part 2' },
            { value: 'part_3', label: 'Part 3' },
            { value: 'saved', label: `Đã lưu (${savedList.length})` },
          ]}
        />
        <label className="relative flex-1">
          <span className="sr-only">Tìm câu hỏi</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input className={`${field} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm câu hỏi hoặc chủ đề" />
        </label>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang tải câu trả lời đã lưu…
        </p>
      ) : groups.length === 0 ? (
        <p className={`${panel} p-4 text-sm text-slate-600 dark:text-slate-400`}>
          {filter === 'saved' ? 'Bạn chưa lưu câu trả lời nào. Chọn một câu hỏi để bắt đầu.' : 'Không có câu hỏi khớp.'}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.topic} aria-label={g.topic} className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{g.topic}</h2>
            <ul className="space-y-2">
              {g.items.map((q) => {
                const s = saved[q.key];
                return (
                  <li key={q.key}>
                    <button
                      type="button"
                      onClick={() => setOpen(q)}
                      className={`${panel} lift press flex min-h-touch w-full items-center gap-3 p-3 text-left`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900 dark:text-white">{q.question}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {filter === 'saved' && <span className={tag}>{PART_LABELS[q.part]}</span>}
                          {q.sample && <span className={tag}>Có bài mẫu</span>}
                          {s?.answer.trim() && (
                            <span className={`${tag} ${toneClasses('mint').tile}`}>
                              <Check className="h-3 w-3" aria-hidden /> {PRACTICE_STAGES[s.stage].label}
                            </span>
                          )}
                          {s && isDue(s, now) && <span className={`${tag} ${toneClasses('peach').tile}`}>Đến hạn</span>}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <CustomQuestion onOpen={setOpen} />
    </div>
  );
}

function groupByTopic<T extends { topicVi: string }>(list: T[]): { topic: string; items: T[] }[] {
  const out: { topic: string; items: T[] }[] = [];
  for (const q of list) {
    const g = out.find((x) => x.topic === q.topicVi);
    if (g) g.items.push(q);
    else out.push({ topic: q.topicVi, items: [q] });
  }
  return out;
}

function CustomQuestion({ onOpen }: { onOpen: (t: Target) => void }) {
  const [text, setText] = useState('');
  const [part, setPart] = useState<SpeakingPartKey>('part_1');
  const clean = text.trim();
  return (
    <section className={`${panel} space-y-3 p-4`} aria-labelledby="sb-custom">
      <h2 id="sb-custom" className="text-sm font-bold text-slate-900 dark:text-white">
        Câu hỏi khác
      </h2>
      <p className="text-caption text-slate-600 dark:text-slate-400">Gặp câu hỏi mới ở đề thi gần đây? Dán vào đây để chuẩn bị câu trả lời của bạn.</p>
      <Segmented<SpeakingPartKey>
        label="Phần thi của câu hỏi"
        value={part}
        onChange={setPart}
        options={[
          { value: 'part_1', label: 'Part 1' },
          { value: 'part_2', label: 'Part 2' },
          { value: 'part_3', label: 'Part 3' },
        ]}
      />
      <textarea
        className={`${field} min-h-[72px] py-2`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={part === 'part_2' ? 'Describe a… (mỗi gợi ý một dòng: You should say: …)' : 'Do you like…?'}
        maxLength={600}
      />
      <button
        type="button"
        className={secondaryBtn}
        disabled={clean.length < 8}
        onClick={() => {
          const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
          const question = lines[0];
          const bullets = part === 'part_2' ? lines.slice(1).map((l) => l.replace(/^[-•*]\s*/, '')).filter((l) => !/^you should say/i.test(l)).slice(0, 6) : [];
          onOpen({ key: customQuestionKey(question), part, question, bullets, topicVi: 'Câu hỏi của bạn' });
        }}
      >
        <Plus className="h-4 w-4" aria-hidden /> Chuẩn bị câu này
      </button>
    </section>
  );
}

// --- Builder ------------------------------------------------------------------------

interface BuilderProps {
  target: Target;
  saved?: SavedAnswer;
  band: string;
  api: SpeakingBankApi;
  store: (s: SavedAnswer) => void;
  drop: (key: string) => void;
  onBack: () => void;
  onPractice: (key: string) => void;
}

function Builder({ target, saved, band, api, store, drop, onBack, onPractice }: BuilderProps) {
  const frames = useMemo<AnswerFrame[]>(
    () => (target.part === 'part_2' ? [...(target.bullets.length ? [cueFrame(target.bullets)] : []), ...framesFor('part_2').filter((f) => f.slots.length)] : framesFor(target.part)),
    [target],
  );
  const [draft, setDraft] = useState<SavedAnswer>(() => saved ?? newSavedAnswer(target, frames[0].id, new Date()));
  const [text, setText] = useState(draft.answer || draft.built?.answer || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSample, setShowSample] = useState(!saved?.answer);
  const [showVi, setShowVi] = useState(false);
  const [turn] = useState(() => Math.floor(Math.random() * 3));
  const frame = frames.find((f) => f.id === draft.frameId) ?? frames[0];
  const ideaFor = (slot: string) => draft.ideas.find((i) => i.slot === slot)?.text ?? '';
  const setIdea = (slot: string, value: string) =>
    setDraft((d) => ({ ...d, ideas: [...d.ideas.filter((i) => i.slot !== slot), { slot, text: value }] }));
  const ready = hasIdeas(draft.ideas.filter((i) => frame.slots.some((s) => s.label === i.slot)), draft.notes);
  const dirty = text.trim() !== (saved?.answer ?? '').trim() || JSON.stringify(draft.ideas) !== JSON.stringify(saved?.ideas ?? []) || draft.notes !== (saved?.notes ?? '');

  const build = async () => {
    setBusy(true);
    setError('');
    try {
      const built = await api.build({
        part: target.part,
        question: target.question,
        bullets: target.bullets,
        frame: frame.name,
        ideas: frame.slots.map((s) => ({ slot: s.label, text: ideaFor(s.label) })),
        notes: draft.notes,
        targetBand: band,
      });
      setDraft((d) => ({ ...d, built }));
      setText(built.answer);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const now = new Date();
    const final = { ...withAnswer(draft, text, now), ideas: draft.ideas.filter((i) => i.text.trim()), frameId: frame.id, updatedAt: now.toISOString() };
    setDraft(final);
    store(final);
    return final;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Danh sách câu hỏi
      </button>

      <section className={`${panel} space-y-2 p-4`}>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
          {PART_LABELS[target.part]}
          {target.topicVi ? ` · ${target.topicVi}` : ''}
        </p>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{target.question}</h1>
        {target.bullets.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {target.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        <button type="button" className={`${ghostBtn} -ml-3`} onClick={() => speakText(target.question)}>
          <Volume2 className="h-4 w-4" aria-hidden /> Nghe câu hỏi
        </button>
      </section>

      {target.sample && (
        <section className={`rounded-2xl border p-4 ${toneClasses('butter').surface}`}>
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowSample((v) => !v)} aria-expanded={showSample}>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{target.sample.label}</span>
            {showSample ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </button>
          {showSample && (
            <div className="mt-2 space-y-2">
              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{target.sample.text}</p>
              <p className="text-caption text-slate-600 dark:text-slate-400">Đọc để lấy cách triển khai, đừng học thuộc. Câu trả lời của bạn nên dùng ý và trải nghiệm của chính bạn.</p>
            </div>
          )}
        </section>
      )}

      <section className={`${panel} space-y-3 p-4`} aria-labelledby="sb-frame">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="sb-frame" className="text-sm font-bold text-slate-900 dark:text-white">
            Khung trả lời
          </h2>
          {frames.length > 1 && (
            <Segmented<string>
              label="Chọn khung"
              value={frame.id}
              onChange={(id) => setDraft((d) => ({ ...d, frameId: id }))}
              options={frames.map((f) => ({ value: f.id, label: f.name }))}
            />
          )}
        </div>
        <p className="text-caption text-slate-600 dark:text-slate-400">{frame.descriptionVi}</p>
        {target.ideasVi && target.ideasVi.length > 0 && (
          <details className="text-caption text-slate-600 dark:text-slate-400">
            <summary className="cursor-pointer font-semibold">Gợi ý ý tưởng</summary>
            <ul className="mt-1 list-disc pl-5">
              {target.ideasVi.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </details>
        )}
        <ol className="space-y-3">
          {frame.slots.map((slot, i) => (
            <li key={slot.id} className="space-y-1">
              <label className="block text-sm font-semibold text-slate-900 dark:text-white" htmlFor={`slot-${slot.id}`}>
                {i + 1}. {slot.label}
              </label>
              <p className="text-caption text-slate-500 dark:text-slate-400">
                {slot.hintVi} <span className="italic">Mở đầu: “{starterFor(slot, turn + i)}”</span>
              </p>
              <input
                id={`slot-${slot.id}`}
                className={field}
                value={ideaFor(slot.label)}
                onChange={(e) => setIdea(slot.label, e.target.value)}
                placeholder="Ý của bạn, tiếng Việt hoặc tiếng Anh"
                maxLength={600}
              />
            </li>
          ))}
        </ol>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Ghi chú thêm</span>
          <textarea
            className={`${field} min-h-[64px] py-2`}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Tên, địa điểm, con số, cảm xúc… bất cứ chi tiết thật nào"
            maxLength={1500}
          />
        </label>
        <button type="button" className={primaryBtn} disabled={!ready || busy} onClick={build}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {draft.built ? 'AI viết lại từ ý của tôi' : 'AI giúp tôi viết câu trả lời'}
        </button>
        {!ready && <p className="text-caption text-slate-500 dark:text-slate-400">Điền ít nhất một ô để AI có ý của bạn.</p>}
        {error && (
          <p role="alert" className="text-sm text-tone-blush-fg">
            {error}
          </p>
        )}
      </section>

      <section className={`${panel} space-y-3 p-4`} aria-labelledby="sb-answer">
        <h2 id="sb-answer" className="text-sm font-bold text-slate-900 dark:text-white">
          Câu trả lời của bạn
        </h2>
        <textarea
          className={`${field} min-h-[140px] py-2 leading-relaxed`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tự viết, hoặc bấm AI giúp tôi. Bạn sửa thoải mái trước khi lưu."
          aria-label="Câu trả lời"
        />
        <p className="text-caption text-slate-500 dark:text-slate-400">{text.trim() ? text.trim().split(/\s+/).length : 0} từ</p>
        {draft.built && <BuiltDetails built={draft.built} showVi={showVi} setShowVi={setShowVi} />}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryBtn} disabled={!text.trim() || !dirty} onClick={save}>
            <Save className="h-4 w-4" aria-hidden /> Lưu vào kho
          </button>
          <button
            type="button"
            className={secondaryBtn}
            disabled={!text.trim()}
            onClick={() => {
              const s = dirty ? save() : draft;
              onPractice(s.key);
            }}
          >
            <Mic className="h-4 w-4" aria-hidden /> Luyện nói câu này
          </button>
          {saved && (
            <button
              type="button"
              className={ghostBtn}
              onClick={() => {
                if (window.confirm('Xoá câu trả lời này khỏi kho?')) {
                  drop(saved.key);
                  onBack();
                }
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Xoá
            </button>
          )}
        </div>
        {draft.versions.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300">Bản trước ({draft.versions.length})</summary>
            <ul className="mt-2 space-y-2">
              {draft.versions.map((v) => (
                <li key={v.at} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-caption text-slate-500">{new Date(v.at).toLocaleString('vi-VN')}</p>
                  <p className="mt-1 text-slate-800 dark:text-slate-200">{v.answer}</p>
                  <button type="button" className={`${ghostBtn} -ml-3 mt-1`} onClick={() => setText(v.answer)}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Dùng lại bản này
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function BuiltDetails({ built, showVi, setShowVi }: { built: NonNullable<SavedAnswer['built']>; showVi: boolean; setShowVi: (v: boolean) => void }) {
  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
      {built.moves.length > 0 && (
        <ol className="space-y-1">
          {built.moves.map((m, i) => (
            <li key={i}>
              <span className={`${tag} mr-1`}>{m.slot}</span>
              <span className="text-slate-800 dark:text-slate-200">{m.text}</span>
            </li>
          ))}
        </ol>
      )}
      <div>
        <p className="text-caption font-semibold text-slate-600 dark:text-slate-400">Từ khoá để nói</p>
        <p className="mt-1 flex flex-wrap gap-1">
          {built.keywords.map((k) => (
            <span key={k} className={`${tag} ${toneClasses('aqua').tile}`}>
              {k}
            </span>
          ))}
        </p>
      </div>
      {built.vocabulary.length > 0 && (
        <ul className="space-y-0.5">
          {built.vocabulary.map((v) => (
            <li key={v.phrase}>
              <span className="font-semibold text-slate-900 dark:text-white">{v.phrase}</span> <span className="text-slate-600 dark:text-slate-400">· {v.meaningVi}</span>
            </li>
          ))}
        </ul>
      )}
      {built.followUps.length > 0 && (
        <div>
          <p className="text-caption font-semibold text-slate-600 dark:text-slate-400">Giám khảo có thể hỏi tiếp</p>
          <ul className="mt-1 list-disc pl-5 text-slate-800 dark:text-slate-200">
            {built.followUps.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {built.tipVi && <p className="text-slate-700 dark:text-slate-300">💡 {built.tipVi}</p>}
      {built.answerVi && (
        <div>
          <button type="button" className={`${ghostBtn} -ml-3`} onClick={() => setShowVi(!showVi)} aria-expanded={showVi}>
            {showVi ? 'Ẩn bản dịch' : 'Xem bản dịch tiếng Việt'}
          </button>
          {showVi && <p className="text-slate-700 dark:text-slate-300">{built.answerVi}</p>}
        </div>
      )}
    </div>
  );
}

// --- Practice ------------------------------------------------------------------------

interface PracticeProps {
  userId: string;
  keys: string[];
  saved: Record<string, SavedAnswer>;
  store: (s: SavedAnswer) => void;
  api: SpeakingBankApi;
  onExit: () => void;
}

type Take = { transcript: string; seconds: number } | null;

function Practice({ userId, keys, saved, store, api, onExit }: PracticeProps) {
  const [index, setIndex] = useState(0);
  const current = saved[keys[index]];
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [take, setTake] = useState<Take>(null);
  const [error, setError] = useState('');
  const [peek, setPeek] = useState(false);
  const live = useRef(true);

  useEffect(
    () => () => {
      live.current = false;
      cancelRecording();
    },
    [],
  );
  useEffect(() => {
    setTake(null);
    setError('');
    setPeek(false);
  }, [index]);

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <p className={`${panel} p-4 text-sm`}>Đã luyện xong. Câu trả lời sẽ quay lại theo lịch ôn.</p>
        <button type="button" className={primaryBtn} onClick={onExit}>
          Về kho câu trả lời
        </button>
      </div>
    );
  }

  const stage = PRACTICE_STAGES[current.stage];
  const keywords = keywordsFor(current);
  const followUp = current.built?.followUps[current.practiceCount % Math.max(1, current.built.followUps.length)];
  const prompt = stage.id === 'followup' && followUp ? followUp : current.question;

  const toggleRecord = async () => {
    setError('');
    if (!recording) {
      try {
        setTake(null);
        setSeconds(0);
        await startRecording(setSeconds);
        setRecording(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không bật được micro.');
      }
      return;
    }
    setRecording(false);
    setBusy(true);
    try {
      const { blob, durationSeconds, mimeType } = await stopRecording();
      const transcript = await api.transcribe(await blobToBase64(blob), mimeType);
      if (live.current) setTake({ transcript, seconds: durationSeconds });
    } catch (err) {
      if (live.current) setError(aiErrorMessage(err));
    } finally {
      if (live.current) setBusy(false);
    }
  };

  const rate = (rating: PracticeRating) => {
    store(afterPractice(current, rating, new Date()));
    awardXp(userId, PRACTICE_XP[rating]);
    setIndex((i) => i + 1);
  };

  const coverage = take ? keywordCoverage(take.transcript, keywords) : null;
  const share = take ? verbatimShare(take.transcript, current.answer) : 0;
  const memorised = take ? soundsMemorised(current.stage, share) : false;
  const showText = stage.id === 'read' || peek;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className={`${ghostBtn} -ml-3`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kho câu trả lời
        </button>
        <span className="text-caption text-slate-500">
          {index + 1} / {keys.length}
        </span>
      </div>

      <ol className="flex gap-1" aria-label="Các bước luyện">
        {PRACTICE_STAGES.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === current.stage ? 'step' : undefined}
            className={`flex-1 rounded-lg px-1.5 py-1 text-center text-caption font-semibold ${
              i === current.stage ? toneClasses('peach').tile : i < current.stage ? toneClasses('mint').tile : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}
          >
            {s.label}
          </li>
        ))}
      </ol>

      <section className={`${panel} space-y-3 p-4`}>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">{PART_LABELS[current.part]}</p>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{prompt}</h1>
        {current.bullets.length > 0 && stage.id !== 'question' && stage.id !== 'followup' && (
          <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
            {current.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400">{stage.hintVi}</p>

        {showText ? (
          <p className="text-base leading-relaxed text-slate-900 dark:text-slate-100">{current.answer}</p>
        ) : stage.id === 'fade' ? (
          <p className="font-mono text-base leading-relaxed text-slate-900 dark:text-slate-100">{fadeWords(current.answer, current.practiceCount)}</p>
        ) : stage.id === 'keywords' ? (
          <p className="flex flex-wrap gap-1.5">
            {keywords.map((k, i) => (
              <span key={k} className={`${tag} ${toneClasses('aqua').tile} text-sm`}>
                {i + 1}. {k}
              </span>
            ))}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {stage.id === 'read' && (
            <button type="button" className={secondaryBtn} onClick={() => speakText(current.answer)}>
              <Volume2 className="h-4 w-4" aria-hidden /> Nghe mẫu
            </button>
          )}
          {stage.id !== 'read' && (
            <button type="button" className={ghostBtn} onClick={() => setPeek((v) => !v)} aria-pressed={peek}>
              {peek ? 'Ẩn câu trả lời' : 'Xem lại câu trả lời'}
            </button>
          )}
        </div>
      </section>

      <section className={`${panel} space-y-3 p-4`} aria-live="polite">
        {isRecordingSupported() ? (
          <button type="button" className={recording ? secondaryBtn : primaryBtn} onClick={toggleRecord} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : recording ? (
              <Square className="h-4 w-4" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
            {busy ? 'Đang nghe lại…' : recording ? `Dừng (${formatDuration(seconds)})` : take ? 'Nói lại' : 'Bắt đầu nói'}
          </button>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Trình duyệt này không ghi âm được. Bạn nói to rồi tự đánh giá bên dưới.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-tone-blush-fg">
            {error}
          </p>
        )}
        {take && coverage && (
          <div className="space-y-2 text-sm">
            <p className="text-slate-500 dark:text-slate-400">
              Bạn nói ({formatDuration(Math.round(take.seconds))}): <span className="text-slate-800 dark:text-slate-200">“{take.transcript}”</span>
            </p>
            {keywords.length > 0 && (
              <p>
                Ý đã nói: <strong>{coverage.hit.length}</strong> / {coverage.hit.length + coverage.missed.length}
                {coverage.missed.length > 0 && <span className="text-slate-600 dark:text-slate-400"> · còn thiếu: {coverage.missed.join(', ')}</span>}
              </p>
            )}
            {memorised && (
              <p className={`flex items-start gap-2 rounded-xl p-2 ${toneClasses('butter').surface}`}>
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                Bạn đang đọc thuộc lòng gần như từng chữ. Giám khảo trừ điểm câu trả lời học thuộc; hãy giữ ý, đổi cách nói.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2" aria-label="Tự đánh giá">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Lần này bạn nói thế nào?</p>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={secondaryBtn} onClick={() => rate('again')}>
            Chưa ổn
          </button>
          <button type="button" className={secondaryBtn} onClick={() => rate('good')}>
            Được
          </button>
          <button type="button" className={primaryBtn} onClick={() => rate('easy')}>
            Rất trôi
          </button>
        </div>
        <p className="text-caption text-slate-500 dark:text-slate-400">“Được” lên một bước, “Rất trôi” lên hai bước. “Chưa ổn” giữ bước này và gặp lại ngày mai.</p>
      </section>
    </div>
  );
}
