import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send, Volume2 } from 'lucide-react';
import type { Lesson } from '../../data/grammar/types';
import type { GrammarGrade } from '../../supabase/functions/ai-proxy/ops/grammar';
import { askTutor, formatFeedbackSummary } from '../../services/grammar/ai';
import { aiErrorMessage, isAbortError } from '../../services/aiClient';
import AiProgress from '../ui/AiProgress';
import { speakText } from '../../services/browserSpeech';
import { Sheet } from '../ui/Sheet';
import { field, primaryBtn } from '../ui/styles';

interface Props {
  open: boolean;
  onClose: () => void;
  lesson: Lesson;
  theme: string;
  /** The exercise on screen, if any: the tutor then hints instead of giving the answer. */
  task?: string;
  answer?: string;
  /** Feedback already given for this answer, so follow-up questions know why it was marked wrong. */
  feedback?: GrammarGrade;
  /** Called when a question is sent (asking during an exercise counts as help). */
  onAsk?: () => void;
}

const QUICK = ['Vì sao dùng cấu trúc này?', 'Cho tôi thêm một ví dụ đời thường', 'Câu này khác cấu trúc dễ nhầm thế nào?'];

/** Renders simple **bold** and `code` spans without HTML injection. */
function TutorText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={i} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[13px] dark:bg-white/10">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/** Extracts English example sentences wrapped in quotes or backticks for TTS playback. */
function englishExamples(text: string): string {
  const hits: string[] = [];
  for (const m of text.matchAll(/["“`]([A-Za-z][^"”`\n]{3,140})["”`]/g)) {
    const s = m[1].trim();
    if (/[A-Za-z]{2,}/.test(s)) hits.push(s);
  }
  return hits.slice(0, 3).join('. ');
}

export default function AiTutor({ open, onClose, lesson, theme, task, answer, feedback, onAsk }: Props) {
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedQuestion, setFailedQuestion] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, thread.length, busy, error]);
  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    onAsk?.();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError('');
    setFailedQuestion('');
    try {
      const a = await askTutor(
        lesson,
        {
          task,
          answer: answer?.trim() || undefined,
          question: text,
          feedback: formatFeedbackSummary(feedback),
          history: thread,
        },
        theme,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      setThread((t) => [...t, { q: text, a }]);
      setQuestion('');
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) return;
      if (alive.current) {
        setError(aiErrorMessage(e));
        setFailedQuestion(text);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Trợ giảng AI"
      footer={
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <input
            className={field}
            value={question}
            maxLength={500}
            enterKeyHint="send"
            placeholder="Hỏi bằng tiếng Việt…"
            aria-label="Câu hỏi cho trợ giảng"
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className={primaryBtn + ' shrink-0 px-3'} disabled={busy || !question.trim()} aria-label="Gửi câu hỏi">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Bài <b>{lesson.title}</b>.{' '}
            {feedback
              ? 'Trợ giảng đã nắm nhận xét câu vừa làm — bạn có thể hỏi tiếp để hiểu rõ hơn.'
              : task
                ? 'Trợ giảng sẽ gợi mở để bạn tự tìm ra đáp án, không đưa đáp án ngay.'
                : 'Hỏi bất cứ điều gì về bài này.'}
          </p>
          {thread.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setThread([]);
                setError('');
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" /> Hỏi lại từ đầu
            </button>
          )}
        </div>
        {thread.map((t, i) => {
          const sampleEn = englishExamples(t.a);
          return (
            <div key={i} className="flex flex-col gap-2">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-tone-periwinkle-soft px-3 py-2 text-sm text-tone-periwinkle-fg">
                {t.q}
              </p>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                <p className="whitespace-pre-line">
                  <TutorText text={t.a} />
                </p>
                {sampleEn && (
                  <button
                    type="button"
                    onClick={() => speakText(sampleEn)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-tone-sky-fg hover:bg-tone-sky dark:bg-slate-900/60"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Nghe ví dụ
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-tone-periwinkle-fg" aria-hidden="true" />
            Trợ giảng đang trả lời…
          </p>
        )}
        {error && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tone-blush-border bg-tone-blush px-3 py-2 text-sm text-tone-blush-fg">
            <span>{error}</span>
            {failedQuestion && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void ask(failedQuestion)}
                className="press min-h-touch rounded-lg bg-white px-3 text-xs font-semibold text-tone-blush-fg hover:bg-tone-blush-soft dark:bg-slate-900"
              >
                Thử lại
              </button>
            )}
          </div>
        )}
        {!thread.length && (
          <div className="flex flex-wrap gap-2">
            {(feedback
              ? ['Vì sao câu của tôi sai ở chỗ này?', 'Cho tôi thêm ví dụ đúng giống vậy', 'Mẹo nhớ để không lặp lại lỗi này?']
              : task
                ? ['Gợi ý cho tôi một bước', ...QUICK.slice(0, 2)]
                : QUICK
            ).map((q) => (
              <button
                key={q}
                type="button"
                disabled={busy}
                onClick={() => ask(q)}
                className="press min-h-touch rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 hover:border-tone-periwinkle-border dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}
