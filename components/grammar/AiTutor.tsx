import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { Lesson } from '../../data/grammar/types';
import { askTutor } from '../../services/grammar/ai';
import { aiErrorMessage } from '../../services/aiClient';
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
  /** Called when a question is sent (asking during an exercise counts as help). */
  onAsk?: () => void;
}

const QUICK = ['Vì sao dùng cấu trúc này?', 'Cho tôi thêm một ví dụ đời thường', 'Câu này khác cấu trúc dễ nhầm thế nào?'];

export default function AiTutor({ open, onClose, lesson, theme, task, answer, onAsk }: Props) {
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    onAsk?.();
    setBusy(true);
    setError('');
    try {
      const a = await askTutor(lesson, { task, answer: answer?.trim() || undefined, question: text }, theme);
      if (!alive.current) return;
      setThread((t) => [...t, { q: text, a }]);
      setQuestion('');
    } catch (e) {
      if (alive.current) setError(aiErrorMessage(e));
    } finally {
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
            placeholder="Hỏi bằng tiếng Việt…"
            aria-label="Câu hỏi cho trợ giảng"
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className={primaryBtn + ' shrink-0 px-3'} disabled={busy || !question.trim()} aria-label="Gửi câu hỏi">
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bài <b>{lesson.title}</b>.{' '}
          {task ? 'Trợ giảng sẽ gợi mở để bạn tự tìm ra đáp án, không đưa đáp án ngay.' : 'Hỏi bất cứ điều gì về bài này.'}
        </p>
        {thread.map((t, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-tone-periwinkle-soft px-3 py-2 text-sm text-tone-periwinkle-fg">{t.q}</p>
            <p className="max-w-[92%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {t.a}
            </p>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Trợ giảng đang trả lời…</p>}
        {error && (
          <p role="status" className="text-sm text-tone-blush-fg">
            {error}
          </p>
        )}
        {!thread.length && (
          <div className="flex flex-wrap gap-2">
            {(task ? ['Gợi ý cho tôi một bước', ...QUICK.slice(0, 2)] : QUICK).map((q) => (
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
      </div>
    </Sheet>
  );
}
