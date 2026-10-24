import React, { memo } from 'react';
import { InteractiveSentenceList } from './InteractiveSentenceCard';
import { InteractiveVocabGrid } from './InteractiveVocabCard';
import { ChatMarkdown } from '../../chat/ChatMarkdown';
import { ChatProgress } from '../../chat/ChatProgress';
import { QuizCard } from '../../chat/QuizCard';
import { scaffoldQuizToQuiz, toQuiz, type ChatMode, type ChatPhase, type QuizResult } from '../../../services/chatLogic';
import type { ScaffoldVocabItem, SentenceBreakdownItem } from '../../../services/scaffoldActionTypes';

export interface LiveReply {
  phase: ChatPhase;
  mode: ChatMode;
  startedAt: number;
  usesData: boolean;
  /** Items the request asked for, when known (quiz size). */
  expected?: number;
}

interface Props {
  content: string;
  userId?: string | null;
  /** Set while this reply is still streaming. */
  live?: LiveReply | null;
  quizResult?: QuizResult;
  onQuizFinish?: (r: QuizResult) => void;
  onReviewMistakes?: (summary: string) => void;
  onAnotherQuiz?: () => void;
  onRetry?: () => void;
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'sentences'; items: SentenceBreakdownItem[] }
  | { kind: 'vocab'; items: ScaffoldVocabItem[] }
  | { kind: 'quiz'; quiz: NonNullable<ReturnType<typeof toQuiz>> }
  | { kind: 'broken'; what: string }
  | { kind: 'pending'; what: 'sentences' | 'vocab' | 'quiz'; written: number };

const STRUCTURED = /^(?:json:)?(scaffold_sentences|scaffold_vocab|scaffold_quiz|quiz)$/;
const COUNT_KEY = { sentences: /"original"\s*:/g, vocab: /"word"\s*:/g, quiz: /"q(?:uestion)?"\s*:/g };
const LABEL = { sentences: 'câu', vocab: 'từ', quiz: 'câu hỏi' } as const;

/** Splits a reply into text and interactive blocks. Exported for tests. */
export function splitReply(content: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  while (at < content.length) {
    const open = content.indexOf('```', at);
    if (open === -1) {
      out.push({ kind: 'text', text: content.slice(at) });
      break;
    }
    const lineEnd = content.indexOf('\n', open);
    const tag = content.slice(open + 3, lineEnd === -1 ? content.length : lineEnd).trim().toLowerCase();
    const bodyStart = lineEnd === -1 ? content.length : lineEnd + 1;
    const close = content.indexOf('```', bodyStart);
    const m = STRUCTURED.exec(tag);
    const isJsonQuiz = tag === 'json' && (close === -1 ? content.slice(bodyStart) : content.slice(bodyStart, close)).includes('"questions"');
    if (!m && !isJsonQuiz) {
      // Ordinary code block: leave it to the Markdown renderer.
      const end = close === -1 ? content.length : close + 3;
      out.push({ kind: 'text', text: content.slice(at, end) });
      at = end;
      continue;
    }
    if (open > at) out.push({ kind: 'text', text: content.slice(at, open) });
    const what = m?.[1] === 'scaffold_sentences' ? 'sentences' : m?.[1] === 'scaffold_vocab' ? 'vocab' : 'quiz';
    if (close === -1) {
      out.push({ kind: 'pending', what, written: (content.slice(bodyStart).match(COUNT_KEY[what]) ?? []).length });
      break;
    }
    const body = content.slice(bodyStart, close).trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }
    if (what === 'sentences' && Array.isArray(parsed)) out.push({ kind: 'sentences', items: parsed as SentenceBreakdownItem[] });
    else if (what === 'vocab' && Array.isArray(parsed)) out.push({ kind: 'vocab', items: parsed as ScaffoldVocabItem[] });
    else if (what === 'quiz') {
      const quiz = m?.[1] === 'scaffold_quiz' ? scaffoldQuizToQuiz(parsed) : toQuiz(parsed);
      out.push(quiz ? { kind: 'quiz', quiz } : { kind: 'broken', what: 'quiz' });
    } else out.push({ kind: 'broken', what });
    at = close + 3;
  }
  return out.filter((s) => s.kind !== 'text' || s.text.trim());
}

/** A mentor reply: Markdown plus sentence, vocabulary and quiz cards, with progress while they are written. */
export const ScaffoldMarkdownRenderer = memo(function ScaffoldMarkdownRenderer({
  content,
  userId,
  live,
  quizResult,
  onQuizFinish,
  onReviewMistakes,
  onAnotherQuiz,
  onRetry,
}: Props) {
  const segments = splitReply(content);
  let quizSeen = false;
  return (
    <div className="w-full space-y-2">
      {segments.map((s, i) => {
        switch (s.kind) {
          case 'text':
            return <ChatMarkdown key={i} text={s.text} />;
          case 'sentences':
            return <InteractiveSentenceList key={i} sentences={s.items} />;
          case 'vocab':
            return <InteractiveVocabGrid key={i} vocabulary={s.items} userId={userId} />;
          case 'quiz': {
            const first = !quizSeen;
            quizSeen = true;
            return (
              <QuizCard
                key={i}
                quiz={s.quiz}
                result={first ? quizResult : undefined}
                onFinish={(r) => first && onQuizFinish?.(r)}
                onReviewMistakes={onReviewMistakes}
                onAnother={onAnotherQuiz}
              />
            );
          }
          case 'pending':
            return live ? (
              <ChatProgress
                key={i}
                phase="writing"
                mode={live.mode}
                startedAt={live.startedAt}
                chars={content.length}
                usesData={live.usesData}
                building={{ done: s.written, total: live.expected ?? Math.max(s.written + 1, s.what === 'quiz' ? 5 : 6), unit: LABEL[s.what] }}
              />
            ) : (
              <p key={i} className="text-[12.5px] text-slate-500 dark:text-slate-400">Câu trả lời bị dừng giữa chừng.</p>
            );
          case 'broken':
            return (
              <div key={i} className="rounded-xl border border-tone-butter-border bg-tone-butter px-3 py-2 text-[12.5px] text-tone-butter-fg">
                AI trả dữ liệu sai định dạng.{' '}
                {onRetry && (
                  <button type="button" onClick={onRetry} className="font-semibold underline">
                    Tạo lại
                  </button>
                )}
              </div>
            );
        }
      })}
    </div>
  );
});

export default ScaffoldMarkdownRenderer;
