import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp, Brain, Check, ChevronDown, Copy, Database, FileText, Gauge, History, ImagePlus, Lightbulb, Maximize2, Mic,
  Minimize2, Music, PanelRightClose, PanelRightOpen, Plus, RefreshCw, Square, SquarePen, Volume2, Wand2, X, Zap,
} from 'lucide-react';
import { audioFileToBase64, compressImage, generateMessageId, streamChatResponse } from '../../services/ieltsChatService';
import { aiErrorMessage } from '../../services/aiClient';
import {
  formatLearnerContext, formatMs, hasLearnerData, MODE_INFO, MODE_PREF_LABEL, modelLabel, quizRequest, QUIZ_SOURCE_LABEL,
  quizSources, requestedQuizSize, routeQuestion, suggestionsFor,
  type ChatAttachment, type ChatMessage, type ChatMode, type ChatPhase, type ChatSuggestion, type LearnerData, type ModePref,
  type QuizResult, type QuizSource, type StoredConversation,
} from '../../services/chatLogic';
import { loadLearnerData } from '../../services/chatContextService';
import {
  clearConversations, deleteConversation, loadConversations, loadPrefs, renameConversation, saveConversation, savePrefs,
} from '../../services/chatHistoryService';
import { buildScaffoldActionPrompt, extractDocumentText, getPhaseContextTip, getProactiveSuggestionsForAttachment } from '../../services/scaffoldChatService';
import type { ScaffoldActionType } from '../../services/scaffoldActionTypes';
import { speakText } from '../../services/browserSpeech';
import { ScaffoldMarkdownRenderer, type LiveReply } from './renderers/ScaffoldMarkdownRenderer';
import { modeOf, ScaffoldToolbar } from './ScaffoldToolbar';
import ChatProgress from '../chat/ChatProgress';
import ChatHistoryPanel from '../chat/ChatHistoryPanel';
import ChatEmptyState, { type StarterAction } from '../chat/ChatEmptyState';

export type WindowDisplayMode = 'floating' | 'docked' | 'fullscreen';

interface ScaffoldWindowProps {
  /** Closed keeps the window mounted (hidden), so a reply keeps streaming and the chat stays. */
  open: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  currentPhase?: string;
  targetBand?: number;
  /** Lets the bubble show that a reply is still coming after the window closes. */
  onStreamingChange?: (streaming: boolean) => void;
}

interface Streaming extends LiveReply {
  msgId: string;
}

interface SendInput {
  text: string;
  display?: string;
  attachments?: ChatAttachment[];
  mode?: ChatMode;
  action?: ScaffoldActionType;
  expected?: number;
}

const MODE_ICON: Record<ModePref, React.ComponentType<{ className?: string }>> = { auto: Wand2, quick: Zap, standard: Gauge, deep: Brain };
const ACTION_CHIP: Record<string, string> = {
  sentence_breakdown: 'bg-tone-sky-soft text-tone-sky-fg',
  vocab_extract: 'bg-tone-butter-soft text-tone-butter-fg',
  quiz_generate: 'bg-tone-aqua-soft text-tone-aqua-fg',
};
const FLOAT_W = 440;
const newConvId = () => `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 640;
/** Rough sentence count, to size the progress bar of a breakdown. */
const sentenceCount = (t: string) => Math.max(1, Math.min(20, (t.match(/[.!?](\s|$)/g) ?? []).length || 1));

// ─── One message ────────────────────────────────────────────────

interface MessageProps {
  msg: ChatMessage;
  live: Streaming | null;
  userId: string;
  onQuizFinish: (id: string, r: QuizResult) => void;
  onReviewMistakes: (summary: string) => void;
  onAnotherQuiz: () => void;
  onRetry: (id: string) => void;
}

const MessageItem = memo(function MessageItem({ msg, live, userId, onQuizFinish, onReviewMistakes, onAnotherQuiz, onRetry }: MessageProps) {
  const [copied, setCopied] = useState(false);

  if (msg.role === 'user') {
    const action = msg.action && msg.action !== 'chat' ? modeOf(msg.action as ScaffoldActionType) : null;
    return (
      <div className="anim-chat-msg-in flex flex-col items-end gap-1">
        {action && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ACTION_CHIP[msg.action!] ?? ''}`}>
            <action.icon className="h-3 w-3" /> {action.label}
          </span>
        )}
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-tone-lavender-soft px-3.5 py-2 text-tone-lavender-fg">
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {msg.attachments.map((att, i) =>
                att.type === 'image' && att.data ? (
                  <img key={i} src={`data:${att.mimeType};base64,${att.data}`} alt={att.fileName || 'Ảnh đã gửi'} className="max-h-[140px] max-w-[180px] rounded-lg object-cover" />
                ) : (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1 text-[11.5px] dark:bg-slate-900/40">
                    {att.type === 'image' ? <ImagePlus className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span className="max-w-[140px] truncate">{att.fileName || (att.type === 'image' ? 'Ảnh' : 'Ghi âm')}</span>
                  </span>
                ),
              )}
            </div>
          )}
          {(msg.display ?? msg.content) && (
            <p className="line-clamp-[12] whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{msg.display ?? msg.content}</p>
          )}
        </div>
      </div>
    );
  }

  const meta = msg.meta;
  const copy = () =>
    void navigator.clipboard?.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  const iconBtn = 'flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200';

  return (
    <div className="anim-chat-msg-in flex gap-2.5">
      <img src="/glossy-ai-bubble.png" alt="" className="mt-0.5 h-7 w-7 flex-shrink-0 select-none object-contain" draggable={false} />
      <div className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
        {msg.error ? (
          <div className="rounded-xl border border-tone-blush-border bg-tone-blush px-3 py-2 text-[13px] text-tone-blush-fg">
            <p>{msg.content}</p>
            <button type="button" onClick={() => onRetry(msg.id)} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold hover:underline">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Thử lại
            </button>
          </div>
        ) : live && !msg.content ? (
          <ChatProgress phase={live.phase} mode={live.mode} startedAt={live.startedAt} chars={0} usesData={live.usesData} />
        ) : (
          <ScaffoldMarkdownRenderer
            content={msg.content}
            userId={userId}
            live={live}
            quizResult={msg.quizResult}
            onQuizFinish={(r) => onQuizFinish(msg.id, r)}
            onReviewMistakes={onReviewMistakes}
            onAnotherQuiz={onAnotherQuiz}
            onRetry={() => onRetry(msg.id)}
          />
        )}

        {live && msg.content && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-tone-lavender-fg">
            <span className="h-1 w-16 overflow-hidden rounded-full bg-tone-lavender-soft">
              <span className="chat-indeterminate block h-full w-1/2 rounded-full bg-tone-lavender-accent" />
            </span>
            Đang viết…
          </div>
        )}

        {!live && !msg.error && msg.content && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
            {meta && (
              <span className="inline-flex items-center gap-1" title={meta.reason ? `${MODE_INFO[meta.mode].hint} · ${meta.reason}` : MODE_INFO[meta.mode].hint}>
                {React.createElement(MODE_ICON[meta.mode], { className: 'h-3 w-3' })}
                {MODE_INFO[meta.mode].label}
                {meta.model && <> · {modelLabel(meta.model)}</>}
              </span>
            )}
            {meta?.firstTokenMs != null && <span title="Chữ đầu tiên / toàn bộ câu trả lời">· {formatMs(meta.firstTokenMs)} / {formatMs(meta.totalMs)}</span>}
            {meta?.usedData && (
              <span className="inline-flex items-center gap-0.5" title="AI đã dùng dữ liệu học của bạn">
                · <Database className="h-3 w-3" /> dữ liệu
              </span>
            )}
            {meta?.stopped && <span>· đã dừng</span>}
            <span className="ml-auto flex items-center gap-0.5">
              <button type="button" onClick={() => speakText(msg.content.replace(/```[\s\S]*?```/g, '').replace(/[*#`>|_]/g, ''))} className={iconBtn} aria-label="Nghe đọc" title="Nghe đọc">
                <Volume2 className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={copy} className={iconBtn} aria-label="Sao chép" title="Sao chép">
                {copied ? <Check className="h-3.5 w-3.5 text-tone-mint-fg" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => onRetry(msg.id)} className={iconBtn} aria-label="Trả lời lại" title="Trả lời lại">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Window ─────────────────────────────────────────────────────

export function ScaffoldWindow({ open, onClose, userId, userName, currentPhase, targetBand, onStreamingChange }: ScaffoldWindowProps) {
  const [displayMode, setDisplayMode] = useState<WindowDisplayMode>(() => (isSmallScreen() ? 'fullscreen' : 'floating'));
  const [activeMode, setActiveMode] = useState<ScaffoldActionType>('chat');
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convId, setConvId] = useState(newConvId);
  const [convCreatedAt, setConvCreatedAt] = useState(() => Date.now());
  const [conversations, setConversations] = useState<StoredConversation[]>(() => loadConversations(userId));
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [learner, setLearner] = useState<LearnerData | null>(null);
  const [learnerLoading, setLearnerLoading] = useState(false);
  const [menu, setMenu] = useState<'none' | 'attach' | 'mode'>('none');
  // The learner's pick; until then the best source for their data (missed words first).
  const [pickedSource, setQuizSource] = useState<QuizSource | null>(null);
  const [quizCount, setQuizCount] = useState(5);
  const [quizTopic, setQuizTopic] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [stuckToBottom, setStuckToBottom] = useState(true);
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, (typeof window !== 'undefined' ? window.innerWidth : 1280) - FLOAT_W - 24),
    y: 16,
  }));

  const windowRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const stuckRef = useRef(true);

  const contextTip = getPhaseContextTip(currentPhase);
  const mode = modeOf(activeMode);
  const isFull = displayMode === 'fullscreen';

  useEffect(() => onStreamingChange?.(!!streaming), [streaming, onStreamingChange]);

  // ─── Floating position: bottom-right, clamped to the screen ───

  const placedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      // Same size as the floating classes below: min(86vh, 700px) × 440px.
      const h = Math.min(window.innerHeight * 0.86, 700);
      const w = Math.min(FLOAT_W, window.innerWidth - 24);
      const first = !placedRef.current;
      placedRef.current = true;
      setPos((p) => ({
        x: Math.min(Math.max(12, first ? window.innerWidth - w - 24 : p.x), window.innerWidth - w - 12),
        y: Math.min(Math.max(12, first ? window.innerHeight - h - 24 : p.y), Math.max(12, window.innerHeight - h - 12)),
      }));
      if (isSmallScreen()) setDisplayMode('fullscreen');
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (displayMode !== 'floating' || (e.target as HTMLElement).closest('button')) return;
    const start = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const move = (ev: PointerEvent) => {
      const w = windowRef.current?.offsetWidth ?? FLOAT_W;
      const h = windowRef.current?.offsetHeight ?? 640;
      setPos({
        x: Math.min(Math.max(12, ev.clientX - start.x), window.innerWidth - w - 12),
        y: Math.min(Math.max(12, ev.clientY - start.y), window.innerHeight - h - 12),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ─── Learner data, prefs, saved chats ─────────────────────────

  useEffect(() => {
    if (!open || !prefs.useData) return;
    setLearnerLoading(true);
    loadLearnerData(userId, userName)
      .then(setLearner)
      .catch((e) => console.warn('[Mentor] learner data unavailable', e))
      .finally(() => setLearnerLoading(false));
  }, [open, prefs.useData, userId, userName]);

  useEffect(() => savePrefs(prefs), [prefs]);

  useEffect(() => {
    if (streaming || !messages.some((m) => m.role === 'user')) return;
    const t = setTimeout(() => setConversations(saveConversation(userId, convId, messages, convCreatedAt)), 300);
    return () => clearTimeout(t);
  }, [messages, streaming, userId, convId, convCreatedAt]);

  const suggestions = useMemo(() => {
    const list = suggestionsFor(prefs.useData ? learner : null);
    if (contextTip) list.unshift({ id: 'phase', icon: 'target', title: contextTip.badge, desc: 'Dành cho màn hình bạn đang học', prompt: contextTip.defaultPrompt });
    return list.slice(0, 3);
  }, [learner, prefs.useData, contextTip]);

  // ─── Scrolling ────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = false) => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (stuckRef.current) scrollToBottom();
  }, [messages, streaming?.phase, scrollToBottom]);

  const onScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const stuck = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stuckRef.current = stuck;
    setStuckToBottom(stuck);
  }, []);

  // ─── Keyboard & cleanup ───────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menu !== 'none') setMenu('none');
      else if (showHistory) setShowHistory(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, menu, showHistory, onClose]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (recordTimer.current) clearInterval(recordTimer.current);
    },
    [],
  );

  // ─── Send ─────────────────────────────────────────────────────

  const send = useCallback(
    async ({ text, display, attachments: files = [], mode: forced, action, expected }: SendInput) => {
      if (abortRef.current) return;
      const clean = text.trim();
      if (!clean && files.length === 0) return;

      const decision = routeQuestion(clean, files.length, forced ?? prefs.mode);
      const usesData = prefs.useData;
      const history = messagesRef.current;
      const startedAt = Date.now();
      const userMsg: ChatMessage = { id: generateMessageId(), role: 'user', content: clean, display, action, timestamp: startedAt, attachments: files.length ? files : undefined };
      const aiId = generateMessageId();
      const aiMsg: ChatMessage = { id: aiId, role: 'assistant', content: '', timestamp: startedAt, isStreaming: true, meta: { mode: decision.mode, reason: decision.reason, usedData: usesData } };

      stuckRef.current = true;
      setMessages([...history, userMsg, aiMsg]);
      setStreaming({ msgId: aiId, phase: usesData ? 'context' : 'sending', mode: decision.mode, startedAt, usesData, expected });

      const controller = new AbortController();
      abortRef.current = controller;
      const patch = (fn: (m: ChatMessage) => ChatMessage) => setMessages((prev) => prev.map((m) => (m.id === aiId ? fn(m) : m)));
      const setPhase = (phase: ChatPhase) => setStreaming((s) => (s && s.msgId === aiId ? { ...s, phase } : s));

      let full = '';
      let firstTokenMs: number | undefined;
      let model: string | undefined;
      let frame = 0;
      const flush = () => {
        frame = 0;
        const snapshot = full;
        patch((m) => ({ ...m, content: snapshot }));
      };

      try {
        let context = '';
        if (usesData) {
          const data = await loadLearnerData(userId, userName).catch(() => null);
          if (data) setLearner(data);
          if (hasLearnerData(data)) context = formatLearnerContext(data);
        }
        setPhase('thinking');
        const stream = streamChatResponse(history, clean, files, {
          mode: decision.mode,
          context,
          signal: controller.signal,
          onModel: (m) => {
            model = m ?? undefined;
          },
        });
        for await (const chunk of stream) {
          if (firstTokenMs === undefined) {
            firstTokenMs = Date.now() - startedAt;
            setPhase('writing');
          }
          full += chunk;
          // One render per frame, however fast chunks arrive.
          if (!frame) frame = requestAnimationFrame(flush);
        }
        if (frame) cancelAnimationFrame(frame);
        const stopped = controller.signal.aborted;
        const empty = !full && !stopped;
        patch((m) => ({
          ...m,
          content: full || (stopped ? '_(Đã dừng trước khi AI trả lời.)_' : 'AI không trả lời. Vui lòng thử lại.'),
          isStreaming: false,
          error: empty || undefined,
          meta: { ...m.meta!, model, firstTokenMs, totalMs: Date.now() - startedAt, stopped: stopped || undefined },
        }));
      } catch (err) {
        if (frame) cancelAnimationFrame(frame);
        const stopped = controller.signal.aborted;
        patch((m) =>
          stopped
            ? { ...m, content: full || '_(Đã dừng trước khi AI trả lời.)_', isStreaming: false, meta: { ...m.meta!, model, firstTokenMs, totalMs: Date.now() - startedAt, stopped: true } }
            : { ...m, content: aiErrorMessage(err), isStreaming: false, error: true },
        );
        if (!stopped) console.error('[Mentor] reply failed', err);
      } finally {
        abortRef.current = null;
        setStreaming(null);
      }
    },
    [prefs.mode, prefs.useData, userId, userName],
  );

  /** Runs a study tool on some text (or the pending files). */
  const runTool = useCallback(
    (tool: ScaffoldActionType, target: string, files: ChatAttachment[] = []) => {
      const content = target.trim() || (files.length ? 'Nội dung trong tệp đính kèm' : '');
      if (!content) return;
      const label = modeOf(tool).label;
      if (tool === 'quiz_generate') setActiveMode('chat');
      void send({
        text: buildScaffoldActionPrompt(tool, content),
        display: target.trim() || `${label} tệp đính kèm`,
        attachments: files,
        action: tool,
        mode: files.length ? 'deep' : 'standard',
        expected: tool === 'quiz_generate' ? requestedQuizSize(buildScaffoldActionPrompt(tool, content)) ?? 5 : tool === 'sentence_breakdown' ? sentenceCount(content) : undefined,
      });
    },
    [send],
  );

  const submit = useCallback(() => {
    if (streaming) return;
    const text = input;
    const files = attachments;
    if (!text.trim() && files.length === 0) return;
    setInput('');
    setAttachments([]);
    setMenu('none');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    if (activeMode === 'chat') void send({ text, attachments: files });
    else runTool(activeMode, text, files);
  }, [streaming, input, attachments, activeMode, send, runTool]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(
    (aiId: string) => {
      if (abortRef.current) return;
      const list = messagesRef.current;
      const at = list.findIndex((m) => m.id === aiId);
      const question = list.slice(0, at).reverse().find((m) => m.role === 'user');
      if (!question) return;
      const kept = list.slice(0, list.indexOf(question));
      messagesRef.current = kept;
      setMessages(kept);
      void send({
        text: question.content,
        display: question.display,
        action: question.action as ScaffoldActionType | undefined,
        attachments: question.attachments?.filter((a) => a.data),
        mode: list[at]?.meta?.mode,
        expected: requestedQuizSize(question.content) ?? undefined,
      });
    },
    [send],
  );

  const onQuizFinish = useCallback((id: string, r: QuizResult) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, quizResult: r } : m))), []);

  const onReviewMistakes = useCallback(
    (summary: string) => void send({ text: `Mình làm sai các câu sau trong quiz:\n${summary}\nGiải thích ngắn vì sao sai và cách nhớ cho từng câu.`, display: 'Giải thích các câu mình làm sai' }),
    [send],
  );

  const startQuiz = useCallback(
    (source: QuizSource, count = quizCount, topic = quizTopic) => {
      const req = quizRequest(source, count, prefs.useData ? learner : null, topic);
      // Back to the chat so the quiz has the room.
      setActiveMode('chat');
      void send({ text: req.prompt, display: req.display, mode: 'standard', action: 'quiz_generate', expected: requestedQuizSize(req.prompt) ?? count });
    },
    [quizCount, quizTopic, prefs.useData, learner, send],
  );

  const onAnotherQuiz = useCallback(() => {
    setActiveMode('quiz_generate');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const onSuggestion = useCallback(
    (s: ChatSuggestion) => {
      if (s.quiz) startQuiz(s.quiz, 5, '');
      else if (s.prompt) void send({ text: s.prompt, display: s.display });
    },
    [startQuiz, send],
  );

  const onStarter = useCallback((a: StarterAction) => void send({ text: a.prompt, display: a.label }), [send]);

  /** Tool tabs act on the last thing the learner wrote when the box is empty. */
  const lastUserText = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    return last && !last.action && !last.display ? last.content : '';
  }, [messages]);

  // ─── Conversations ────────────────────────────────────────────

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConvId(newConvId());
    setConvCreatedAt(Date.now());
    setShowHistory(false);
    setInput('');
    setAttachments([]);
    setActiveMode('chat');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const openConversation = useCallback((c: StoredConversation) => {
    abortRef.current?.abort();
    setMessages(c.messages);
    setConvId(c.id);
    setConvCreatedAt(c.createdAt);
    setShowHistory(false);
    stuckRef.current = true;
  }, []);

  const removeConversation = useCallback(
    (id: string) => {
      setConversations(deleteConversation(userId, id));
      if (id === convId) newChat();
    },
    [userId, convId, newChat],
  );

  // ─── Files & recording ────────────────────────────────────────

  const addFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          const { base64, mimeType } = await compressImage(file);
          setAttachments((prev) => [...prev, { type: 'image' as const, data: base64, mimeType, fileName: file.name }].slice(0, 4));
        } else if (file.type.startsWith('audio/')) {
          const { base64, mimeType } = await audioFileToBase64(file);
          setAttachments((prev) => [...prev, { type: 'audio' as const, data: base64, mimeType, fileName: file.name }].slice(0, 4));
        } else {
          const { text, fileName } = await extractDocumentText(file);
          setInput((prev) => `${prev ? `${prev}\n\n` : ''}[Tài liệu: ${fileName}]\n${text}`);
        }
      } catch (err) {
        console.error('[Mentor] could not read file', err);
      }
    }
  }, []);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    void addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
    setMenu('none');
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const startRecording = useCallback(async () => {
    setMenu('none');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined);
      recordChunks.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => ev.data.size > 0 && recordChunks.current.push(ev.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimer.current) clearInterval(recordTimer.current);
        recordTimer.current = null;
        setIsRecording(false);
        setRecordSeconds(0);
        const blob = new Blob(recordChunks.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        const { base64, mimeType } = await audioFileToBase64(blob);
        setAttachments((prev) => [...prev, { type: 'audio' as const, data: base64, mimeType, fileName: `ghi-am-${new Date().toLocaleTimeString('vi-VN')}.webm` }].slice(0, 4));
      };
      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error('[Mentor] microphone unavailable', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  // ─── Derived ──────────────────────────────────────────────────

  const preview = useMemo(() => routeQuestion(input, attachments.length, prefs.mode), [input, attachments.length, prefs.mode]);
  const sources = useMemo(() => quizSources(prefs.useData ? learner : null, messages.length > 0), [learner, prefs.useData, messages.length]);
  const quizSource: QuizSource = pickedSource && sources.includes(pickedSource) ? pickedSource : sources[0];
  const ModeIcon = MODE_ICON[prefs.mode];
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isRecording;

  const historyPanel = (closable: boolean) => (
    <ChatHistoryPanel
      conversations={conversations}
      activeId={convId}
      onOpen={openConversation}
      onNew={newChat}
      onRename={(id, title) => setConversations(renameConversation(userId, id, title))}
      onDelete={removeConversation}
      onClearAll={() => {
        setConversations(clearConversations(userId));
        newChat();
      }}
      onClose={closable ? () => setShowHistory(false) : undefined}
    />
  );

  const layout =
    displayMode === 'fullscreen'
      ? 'inset-0 sm:inset-4 sm:rounded-2xl sm:border lg:inset-x-[max(1rem,calc((100vw-1180px)/2))] lg:inset-y-6'
      : displayMode === 'docked'
        ? 'inset-y-0 right-0 w-[440px] max-w-full border-l'
        : 'anim-chat-slide-up h-[min(86vh,700px)] w-[440px] max-w-[calc(100vw-24px)] rounded-2xl border';
  const headerBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';
  const menuBtn = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <>
      {open && isFull && <div className="fixed inset-0 z-[69] hidden bg-slate-900/30 backdrop-blur-[2px] sm:block" onClick={() => setDisplayMode('floating')} aria-hidden />}
      <section
        ref={windowRef}
        aria-label="IELTS Mentor AI"
        style={displayMode === 'floating' ? { left: pos.x, top: pos.y } : undefined}
        className={`fixed z-[70] flex overflow-hidden border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 ${layout} ${isFull ? 'chat-wide' : ''} ${open ? '' : 'hidden'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {isFull && <aside className="hidden w-64 flex-shrink-0 border-r border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 md:block">{historyPanel(false)}</aside>}

        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header
            onPointerDown={onHeaderPointerDown}
            className={`relative flex flex-shrink-0 select-none items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800 ${displayMode === 'floating' ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <span className="relative h-9 w-9 flex-shrink-0">
              <img src="/glossy-ai-bubble.png" alt="" className="h-full w-full object-contain" draggable={false} />
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${streaming ? 'anim-record-pulse bg-tone-lavender-accent' : 'bg-tone-mint-accent'}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[14px] font-bold leading-tight text-slate-900 dark:text-white">
                IELTS Mentor AI
                {targetBand && <span className="rounded-full bg-tone-lavender-soft px-1.5 text-[10px] font-semibold text-tone-lavender-fg">Band {targetBand}</span>}
              </p>
              <p className="truncate text-[11.5px] leading-tight text-slate-500 dark:text-slate-400">
                {streaming ? (
                  <span className="text-tone-lavender-fg">Đang trả lời · {MODE_INFO[streaming.mode].label}</span>
                ) : (
                  contextTip?.badge ?? (prefs.mode === 'auto' ? 'Tự chọn mô hình theo câu hỏi' : `Chế độ ${MODE_PREF_LABEL[prefs.mode]}`)
                )}
              </p>
            </div>
            <div className="flex items-center">
              {(
                <button type="button" onClick={() => setShowHistory((v) => !v)} className={`${headerBtn} ${isFull ? 'md:hidden' : ''} ${showHistory ? 'bg-tone-lavender-soft text-tone-lavender-fg' : ''}`} aria-label="Lịch sử" title="Lịch sử trò chuyện">
                  <History className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={newChat} className={headerBtn} aria-label="Cuộc trò chuyện mới" title="Trò chuyện mới">
                <SquarePen className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setDisplayMode(displayMode === 'docked' ? 'floating' : 'docked')} className={`${headerBtn} hidden sm:flex`} aria-label={displayMode === 'docked' ? 'Bỏ ghim' : 'Ghim bên phải'} title={displayMode === 'docked' ? 'Chuyển về cửa sổ nổi' : 'Ghim bên phải màn hình'}>
                {displayMode === 'docked' ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setDisplayMode(isFull ? 'floating' : 'fullscreen')} className={`${headerBtn} hidden sm:flex`} aria-label={isFull ? 'Thu nhỏ' : 'Toàn màn hình'} title={isFull ? 'Thu nhỏ' : 'Toàn màn hình'}>
                {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={onClose} className={headerBtn} aria-label="Đóng" title="Thu về bong bóng (Esc)">
                <X className="h-4 w-4" />
              </button>
            </div>
            {streaming && (
              <span className="absolute inset-x-0 bottom-[-1px] h-0.5 overflow-hidden">
                <span className="chat-indeterminate block h-full w-1/3 bg-tone-lavender-accent" />
              </span>
            )}
          </header>

          {showHistory && (
            // In full screen the sidebar shows it from md up; this overlay covers phones and the floating window.
            <div className={`anim-chat-msg-in absolute inset-x-0 bottom-0 top-[57px] z-20 bg-white dark:bg-slate-900 ${isFull ? 'md:hidden' : ''}`}>{historyPanel(true)}</div>
          )}

          <div className={isFull ? 'mx-auto w-full max-w-3xl' : ''}>
            <ScaffoldToolbar activeMode={activeMode} onSelectMode={(m) => setActiveMode(m)} />

            {/* What the active tool does, and its quick actions */}
            {activeMode !== 'chat' && (
              <div className="anim-chat-msg-in mx-3 mb-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[12px] text-slate-600 dark:text-slate-300">{mode.hint}</p>
                {activeMode === 'quiz_generate' ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {sources.map((s) => (
                        <button key={s} type="button" onClick={() => setQuizSource(s)} className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${quizSource === s ? 'border-tone-aqua-border bg-tone-aqua-soft text-tone-aqua-fg' : 'border-slate-200 bg-white text-slate-600 hover:border-tone-aqua-border dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                          {QUIZ_SOURCE_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    {quizSource === 'topic' && (
                      <input value={quizTopic} onChange={(e) => setQuizTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !streaming && startQuiz(quizSource)} placeholder="Chủ đề (vd: Environment, Task 1 line graph)…" className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] focus:border-tone-aqua-fg focus:outline-none focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Số câu</span>
                      {[5, 10].map((n) => (
                        <button key={n} type="button" onClick={() => setQuizCount(n)} className={`h-7 rounded-lg px-2.5 text-[12px] font-semibold ${quizCount === n ? 'bg-tone-aqua-soft text-tone-aqua-fg' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-900'}`}>{n}</button>
                      ))}
                      <button type="button" disabled={!!streaming} onClick={() => startQuiz(quizSource)} className="press ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-tone-aqua-soft px-3 text-[12.5px] font-semibold text-tone-aqua-fg hover:bg-tone-aqua-border disabled:opacity-50">
                        Tạo quiz
                      </button>
                    </div>
                  </div>
                ) : (
                  lastUserText && !input.trim() && (
                    <button type="button" disabled={!!streaming} onClick={() => runTool(activeMode, lastUserText)} className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[12px] font-semibold text-tone-lavender-fg hover:underline disabled:opacity-50">
                      <span className="truncate">Áp dụng cho tin nhắn trước: {lastUserText.slice(0, 40)}{lastUserText.length > 40 ? '…' : ''}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={bodyRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className={`mx-auto space-y-4 px-4 pb-4 pt-2 ${isFull ? 'max-w-3xl' : ''}`}>
              {messages.length === 0 ? (
                <ChatEmptyState
                  name={userName}
                  data={learner}
                  loading={learnerLoading}
                  useData={prefs.useData}
                  suggestions={suggestions}
                  onSuggestion={onSuggestion}
                  onStarter={onStarter}
                  onToggleData={() => setPrefs((p) => ({ ...p, useData: !p.useData }))}
                />
              ) : (
                messages.map((m) => (
                  <MessageItem key={m.id} msg={m} live={streaming?.msgId === m.id ? streaming : null} userId={userId} onQuizFinish={onQuizFinish} onReviewMistakes={onReviewMistakes} onAnotherQuiz={onAnotherQuiz} onRetry={retry} />
                ))
              )}
            </div>
          </div>

          {!stuckToBottom && messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                stuckRef.current = true;
                setStuckToBottom(true);
                scrollToBottom(true);
              }}
              className="absolute bottom-[136px] left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              aria-label="Cuộn xuống cuối"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {dragging && (
            <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-tone-lavender-accent bg-tone-lavender/80 text-[13px] font-semibold text-tone-lavender-fg">
              Thả ảnh, âm thanh hoặc tài liệu vào đây
            </div>
          )}

          {/* Composer */}
          <div className={`relative flex-shrink-0 px-3 pb-3 pt-1 ${isFull ? 'mx-auto w-full max-w-3xl' : ''}`}>
            {menu !== 'none' && <div className="fixed inset-0 z-10" onClick={() => setMenu('none')} aria-hidden />}
            {menu === 'attach' && (
              <div className="anim-chat-msg-in absolute bottom-full left-3 z-20 mb-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <button type="button" className={menuBtn} onClick={() => imageInputRef.current?.click()}><ImagePlus className="h-4 w-4 text-tone-sky-fg" /> Ảnh đề / biểu đồ</button>
                <button type="button" className={menuBtn} onClick={() => audioInputRef.current?.click()}><Music className="h-4 w-4 text-tone-peach-fg" /> File âm thanh</button>
                <button type="button" className={menuBtn} onClick={() => docInputRef.current?.click()}><FileText className="h-4 w-4 text-tone-butter-fg" /> Tài liệu (.txt, .md, .pdf)</button>
              </div>
            )}
            {menu === 'mode' && (
              <div className="anim-chat-msg-in absolute bottom-full left-3 z-20 mb-1 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="menu">
                {(['auto', 'quick', 'standard', 'deep'] as ModePref[]).map((m) => {
                  const Icon = MODE_ICON[m];
                  return (
                    <button key={m} type="button" role="menuitemradio" aria-checked={prefs.mode === m} className={`${menuBtn} ${prefs.mode === m ? 'bg-tone-lavender' : ''}`} onClick={() => { setPrefs((p) => ({ ...p, mode: m })); setMenu('none'); }}>
                      <Icon className="h-4 w-4 flex-shrink-0 text-tone-lavender-fg" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{MODE_PREF_LABEL[m]}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{m === 'auto' ? 'Câu ngắn dùng mô hình nhẹ, bài dài dùng mô hình suy nghĩ' : MODE_INFO[m].hint}</span>
                      </span>
                      {prefs.mode === m && <Check className="h-4 w-4 text-tone-lavender-fg" />}
                    </button>
                  );
                })}
              </div>
            )}

            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={onPickFiles} />
            <input ref={docInputRef} type="file" accept=".txt,.md,.pdf,.json,.csv,.srt,.vtt" className="hidden" onChange={onPickFiles} />

            {/* Files waiting to be sent, with one-tap tools for them */}
            {attachments.length > 0 && activeMode === 'chat' && !streaming && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {getProactiveSuggestionsForAttachment(attachments[0]).map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => {
                      const files = attachments;
                      setAttachments([]);
                      runTool(sug.action, input, files);
                      setInput('');
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ACTION_CHIP[sug.action] ?? 'bg-slate-100 text-slate-700'}`}
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white transition-shadow focus-within:border-tone-lavender-accent focus-within:ring-2 focus-within:ring-tone-lavender-soft dark:border-slate-700 dark:bg-slate-900">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-2.5">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative">
                      {att.type === 'image' ? (
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.fileName || 'Ảnh'} className="h-14 w-14 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                      ) : (
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-tone-peach-soft text-tone-peach-fg">
                          <Volume2 className="h-4 w-4" />
                          <span className="mt-0.5 text-[9px] font-semibold">Audio</span>
                        </div>
                      )}
                      <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white shadow" aria-label="Bỏ tệp">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isRecording ? (
                <div className="flex items-center gap-3 px-3 py-3">
                  <span className="anim-record-pulse h-2.5 w-2.5 rounded-full bg-tone-blush-accent" />
                  <span className="text-[13px] font-semibold text-tone-blush-fg">Đang ghi âm</span>
                  <span className="flex flex-1 items-center justify-center gap-0.5">
                    {Array.from({ length: 14 }, (_, i) => (
                      <span key={i} className="anim-waveform w-0.5 rounded-full bg-tone-blush-accent" style={{ animationDelay: `${i * 70}ms` }} />
                    ))}
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-tone-blush-fg">{fmtDuration(recordSeconds)}</span>
                  <button type="button" onClick={stopRecording} className="flex h-8 items-center gap-1 rounded-lg bg-tone-blush-soft px-2.5 text-[12px] font-semibold text-tone-blush-fg hover:bg-tone-blush-border">
                    <Square className="h-3 w-3" /> Xong
                  </button>
                </div>
              ) : (
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  onPaste={onPaste}
                  placeholder={activeMode === 'chat' && messages.length ? 'Hỏi tiếp…' : mode.placeholder}
                  className="block max-h-40 w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:outline-none dark:text-white"
                  aria-label="Tin nhắn"
                />
              )}

              <div className="flex items-center gap-0.5 px-2 pb-2">
                <button type="button" onClick={() => setMenu(menu === 'attach' ? 'none' : 'attach')} disabled={!!streaming || isRecording} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Đính kèm" title="Đính kèm ảnh, âm thanh, tài liệu">
                  <Plus className="h-4 w-4" />
                </button>
                {activeMode === 'chat' && (
                  <button type="button" onClick={() => setMenu(menu === 'mode' ? 'none' : 'mode')} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title={`Mô hình: ${preview.reason}`}>
                    <ModeIcon className="h-3.5 w-3.5" />
                    {MODE_PREF_LABEL[prefs.mode]}
                    {prefs.mode === 'auto' && (input.trim() || attachments.length > 0) && <span className="text-tone-lavender-fg">→ {MODE_INFO[preview.mode].label}</span>}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, useData: !p.useData }))}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium ${prefs.useData ? 'text-tone-lavender-fg hover:bg-tone-lavender' : 'text-slate-400 line-through hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title={prefs.useData ? 'AI đang đọc dữ liệu học của bạn (bấm để tắt)' : 'AI không đọc dữ liệu học (bấm để bật)'}
                  aria-pressed={prefs.useData}
                >
                  <Database className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">Dữ liệu</span>
                </button>
                {messages.length > 0 && activeMode === 'chat' && (
                  <button
                    type="button"
                    disabled={!!streaming}
                    onClick={() => void send({ text: 'Hãy gợi ý cho tôi định hướng tư duy từng bước cho nội dung vừa rồi theo phương pháp sư phạm (chưa đưa ra ngay lời giải hoàn chỉnh).', display: 'Gợi ý từng bước' })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-tone-butter-fg hover:bg-tone-butter disabled:opacity-40"
                    title="Gợi ý từng bước, chưa đưa lời giải"
                    aria-label="Gợi ý từng bước"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </button>
                )}
                <span className="flex-1" />
                {!streaming && (
                  <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`flex h-8 w-8 items-center justify-center rounded-lg ${isRecording ? 'bg-tone-blush-soft text-tone-blush-fg' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`} aria-label={isRecording ? 'Dừng ghi âm' : 'Ghi âm'} title="Ghi âm Speaking">
                    <Mic className="h-4 w-4" />
                  </button>
                )}
                {streaming ? (
                  <button type="button" onClick={stop} className="press flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900" aria-label="Dừng trả lời" title="Dừng">
                    <Square className="h-3.5 w-3.5" fill="currentColor" />
                  </button>
                ) : (
                  <button type="button" onClick={submit} disabled={!canSend} className="press flex h-8 w-8 items-center justify-center rounded-lg bg-tone-lavender-soft text-tone-lavender-fg hover:bg-tone-lavender-border disabled:opacity-40" aria-label="Gửi" title="Gửi (Enter)">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-center text-[10.5px] text-slate-400 dark:text-slate-500">Enter gửi · Shift+Enter xuống dòng · Ctrl+V dán ảnh · AI có thể sai</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default ScaffoldWindow;
