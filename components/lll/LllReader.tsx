import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bookmark, Check, Loader2, MessageSquareText, ScanText, Sparkles } from 'lucide-react';
import AddToReviewButton from '../ielts/AddToReviewButton';
import { field, panel, primaryBtn, secondaryBtn } from '../ui/styles';
import { aiErrorMessage } from '../../services/aiClient';
import { addWordsToReview } from '../../services/masteryService';
import { explainReading, type ExplainResult } from '../../services/readingExplainService';
import { getLllCompanion, reflectLll, type Companion, type Reflection } from '../../services/lllAi';
import { LLL_KINDS, LLL_TOPICS, lllYoutubeId, type LllEntry, type LllLevel } from '../../services/lllLogic';
import { hostOf, LevelBadge, withCatalog, type EntryPatch, type LllOpen } from './shared';

type Async<T> = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'done'; value: T };

interface Props {
  open: LllOpen;
  entry?: LllEntry;
  userId: string;
  /** The learner's reading level; the companion is written for it. */
  level: LllLevel;
  loading: boolean;
  onBack: () => void;
  onSave: (patch: EntryPatch) => Promise<boolean>;
  onWordsSaved: (count: number) => void;
}

const heading = 'flex items-center gap-2 font-semibold text-slate-900 dark:text-white';
const KEEP = -1;

export default function LllReader({ open, entry, userId, level, loading, onBack, onSave, onWordsSaved }: Props) {
  const item = withCatalog(open.link);
  const video = lllYoutubeId(new URL(item.url));
  const [companion, setCompanion] = useState<Async<Companion>>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ error: boolean; text: string } | null>(null);
  const [passage, setPassage] = useState('');
  const [explain, setExplain] = useState<Async<ExplainResult>>({ kind: 'idle' });
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState(entry?.note ?? '');
  const [reflection, setReflection] = useState<Async<Reflection>>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setCompanion({ kind: 'loading' });
    getLllCompanion(item.url, item.title, level)
      .then((value) => { if (!cancelled) setCompanion({ kind: 'done', value }); })
      .catch((err) => { if (!cancelled) setCompanion({ kind: 'error', message: aiErrorMessage(err) }); });
    return () => { cancelled = true; };
  }, [item.url, item.title, level, attempt]);

  const help = companion.kind === 'done' && companion.value.readable ? companion.value : null;
  const questions = help?.questions ?? [];
  const asked = question === KEEP || !questions[question] ? 'What is one thing you want to remember from it?' : questions[question];

  const save = async (patch: EntryPatch, message: string) => {
    if (busy || loading) return;
    setBusy(true);
    setSaveMsg(null);
    const ok = await onSave(patch);
    setBusy(false);
    setSaveMsg({ error: !ok, text: ok ? message : 'Chưa lưu được. Bạn có thể thử lại.' });
  };
  const saveWords: typeof addWordsToReview = async (uid, words) => {
    const r = await addWordsToReview(uid, words);
    onWordsSaved(r.added);
    return r;
  };
  const runExplain = async () => {
    const text = passage.trim().slice(0, 600);
    if (!text) return;
    setExplain({ kind: 'loading' });
    try {
      setExplain({ kind: 'done', value: await explainReading('sentence', text, `${item.title}\n${text}`.slice(0, 2500)) });
    } catch (err) {
      setExplain({ kind: 'error', message: aiErrorMessage(err) });
    }
  };
  const runReflect = async () => {
    const text = answer.trim();
    if (!text) return;
    setReflection({ kind: 'loading' });
    try {
      setReflection({ kind: 'done', value: await reflectLll({ title: item.title, question: asked, answer: text.slice(0, 600), level }) });
    } catch (err) {
      setReflection({ kind: 'error', message: aiErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className={secondaryBtn}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về danh sách</button>

      <article className={`${panel} space-y-4 p-4 sm:p-6`}>
        <div>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-tone-lavender-fg">
            <LevelBadge level={item.level} />
            {item.kind ? LLL_KINDS[item.kind] : 'Liên kết'} · {LLL_TOPICS[item.topic]} · {item.publisher ?? hostOf(item.url)}
            {item.minutes != null && <> · {item.minutes} phút</>}
          </p>
          <h2 className="mt-1 break-words text-2xl font-bold leading-tight text-slate-900 dark:text-white" lang={item.language}>{item.title}</h2>
          {item.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>}
          {open.stance && <p className="mt-2 text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">Góc nhìn:</span> {open.stance}</p>}
          {open.reason && <p className="mt-2 text-xs font-medium text-tone-lavender-fg">{open.reason}</p>}
        </div>
        {playing && video && (
          <iframe className="aspect-video min-h-[200px] w-full rounded-xl bg-slate-950" title={`YouTube: ${item.title}`}
            src={`https://www.youtube-nocookie.com/embed/${video}`} allow="encrypted-media; picture-in-picture" allowFullScreen />
        )}
        <div className="flex flex-wrap gap-2">
          {video && !playing && <button type="button" className={primaryBtn} onClick={() => setPlaying(true)}>Phát video</button>}
          <a className={video ? secondaryBtn : primaryBtn} href={item.url} target="_blank" rel="noopener noreferrer">
            {video ? 'Mở trên YouTube' : 'Mở bài gốc'} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button type="button" className={secondaryBtn} disabled={busy || loading || entry?.saved} onClick={() => void save({ saved: true }, 'Đã lưu bài.')}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />{entry?.saved ? 'Đã lưu' : 'Lưu bài'}
          </button>
          <button type="button" className={secondaryBtn} disabled={busy || loading || entry?.finished} onClick={() => void save({ finished: true }, 'Đã ghi nhận bạn đọc xong.')}>
            <Check className="h-4 w-4" aria-hidden="true" />{entry?.finished ? 'Đã đọc xong' : 'Đánh dấu đã đọc'}
          </button>
        </div>
        {saveMsg && <p role={saveMsg.error ? 'alert' : 'status'} className={`text-sm ${saveMsg.error ? 'text-tone-blush-fg' : 'text-tone-mint-fg'}`}>{saveMsg.text}</p>}
      </article>

      <section className={`${panel} space-y-4 p-4 sm:p-6`} aria-labelledby="lll-before">
        <h3 id="lll-before" className={heading}><Sparkles className="h-4 w-4 text-tone-lavender-fg" aria-hidden="true" /> Trước khi đọc</h3>
        {companion.kind === 'loading' && (
          <p role="status" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> AI đang {video ? 'xem video' : 'đọc bài'} để tóm tắt và chọn từ khóa…
          </p>
        )}
        {companion.kind === 'error' && (
          <p role="alert" className="rounded-xl bg-tone-blush p-3 text-sm text-tone-blush-fg">
            {companion.message}{' '}
            <button type="button" className="font-semibold underline" onClick={() => setAttempt((n) => n + 1)}>Thử lại</button>
          </p>
        )}
        {companion.kind === 'done' && !companion.value.readable && (
          <p role="status" className="rounded-xl bg-tone-peach p-3 text-sm text-tone-peach-fg">
            AI không mở được trang này (có thể cần đăng nhập hoặc trả phí). Bạn vẫn đọc bài gốc được, và dán đoạn khó vào ô bên dưới để AI giải thích.{' '}
            <button type="button" className="font-semibold underline" onClick={() => setAttempt((n) => n + 1)}>Thử lại</button>
          </p>
        )}
        {help && (
          <>
            <div>
              <p className="mb-1 text-sm font-semibold">Ý chính</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                {help.summaryVi.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
            {help.perspectiveVi && <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">Góc nhìn của tác giả:</span> {help.perspectiveVi}</p>}
            {help.words.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Từ khóa nên biết</p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {help.words.map((w) => (
                    <li key={w.term} className="rounded-xl bg-tone-lavender/60 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-900 dark:text-white" lang="en">{w.term}</span>
                      <span className="text-slate-600 dark:text-slate-300"> · {w.meaningVi}</span>
                    </li>
                  ))}
                </ul>
                <AddToReviewButton userId={userId} save={saveWords} label={`Thêm ${help.words.length} từ vào ôn tập`}
                  words={help.words.map((w) => ({ word: w.term, meaningVi: w.meaningVi }))} />
              </div>
            )}
            <div>
              <p className="mb-1 text-sm font-semibold">Đọc để trả lời</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200" lang="en">
                {help.questions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          </>
        )}
      </section>

      <section className={`${panel} space-y-3 p-4 sm:p-6`} aria-labelledby="lll-hard">
        <h3 id="lll-hard" className={heading}><ScanText className="h-4 w-4 text-tone-aqua-fg" aria-hidden="true" /> Gặp đoạn khó?</h3>
        <label htmlFor="lll-passage" className="block text-sm text-slate-600 dark:text-slate-300">Dán một câu hoặc đoạn ngắn (tối đa 600 ký tự), AI dịch và tách cấu trúc.</label>
        <textarea id="lll-passage" lang="en" value={passage} maxLength={600} onChange={(e) => setPassage(e.target.value)} className={`${field} min-h-20 py-2`} />
        <button type="button" className={secondaryBtn} disabled={!passage.trim() || explain.kind === 'loading'} onClick={() => void runExplain()}>
          {explain.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanText className="h-4 w-4" aria-hidden="true" />} Giải thích
        </button>
        {explain.kind === 'error' && <p role="alert" className="text-sm text-tone-blush-fg">{explain.message}</p>}
        {explain.kind === 'done' && (
          <div className="space-y-2 rounded-xl bg-tone-aqua/50 p-3 text-sm" role="status">
            {explain.value.translationVi && <p><span className="font-semibold">Dịch:</span> {explain.value.translationVi}</p>}
            {explain.value.structureVi.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5">{explain.value.structureVi.map((s) => <li key={s}>{s}</li>)}</ul>
            )}
            {explain.value.vocab.length > 0 && (
              <>
                <p>{explain.value.vocab.map((v) => <span key={v.term} className="mr-3 inline-block"><strong lang="en">{v.term}</strong>: {v.meaningVi}</span>)}</p>
                <AddToReviewButton userId={userId} save={saveWords} words={explain.value.vocab.map((v) => ({ word: v.term, meaningVi: v.meaningVi }))} />
              </>
            )}
          </div>
        )}
      </section>

      <section className={`${panel} space-y-3 p-4 sm:p-6`} aria-labelledby="lll-after">
        <h3 id="lll-after" className={heading}><MessageSquareText className="h-4 w-4 text-tone-mint-fg" aria-hidden="true" /> Sau khi đọc</h3>
        <div role="radiogroup" aria-label="Chọn câu để trả lời" className="flex flex-wrap gap-2">
          {[...questions.map((q, i) => ({ i, label: q })), { i: KEEP, label: 'Giữ lại một điều' }].map(({ i, label }) => (
            <button key={i} type="button" role="radio" aria-checked={question === i || (i === KEEP && !questions.length)} onClick={() => setQuestion(i)}
              className={`press min-h-touch rounded-xl border px-3 py-1.5 text-left text-sm ${(question === i || (i === KEEP && !questions.length))
                ? 'border-tone-mint-border bg-tone-mint text-tone-mint-fg' : 'border-slate-200 dark:border-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <label htmlFor="lll-answer" className="block text-sm text-slate-600 dark:text-slate-300">
          Viết 1–3 câu tiếng Anh. <span lang="en" className="italic">{asked}</span>
        </label>
        <textarea id="lll-answer" lang="en" value={answer} maxLength={500} onChange={(e) => setAnswer(e.target.value)} className={`${field} min-h-24 py-2`}
          placeholder="I learned that…" disabled={busy || loading} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} disabled={!answer.trim() || reflection.kind === 'loading'} onClick={() => void runReflect()}>
            {reflection.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} Nhờ AI nhận xét
          </button>
          <button type="button" className={primaryBtn} disabled={busy || loading || !answer.trim() || (entry?.note ?? '') === answer.trim() && !!entry?.finished}
            onClick={() => void save({ note: answer.trim(), saved: true, finished: true }, 'Đã lưu ghi chú và đánh dấu đã đọc.')}>
            Lưu & đánh dấu đã đọc
          </button>
        </div>
        {reflection.kind === 'error' && <p role="alert" className="text-sm text-tone-blush-fg">{reflection.message}</p>}
        {reflection.kind === 'done' && (
          <div className="space-y-2 rounded-xl bg-tone-mint/60 p-3 text-sm" role="status">
            {!reflection.value.onTopic && <p className="font-semibold text-tone-peach-fg">Câu trả lời chưa đúng trọng tâm câu hỏi.</p>}
            <p>{reflection.value.feedbackVi}</p>
            {reflection.value.corrected && reflection.value.corrected !== answer.trim() && (
              <p><span className="font-semibold">Sửa lỗi:</span> <span lang="en">{reflection.value.corrected}</span></p>
            )}
            {reflection.value.natural && <p><span className="font-semibold">Tự nhiên hơn:</span> <span lang="en">{reflection.value.natural}</span></p>}
          </div>
        )}
      </section>
    </div>
  );
}
