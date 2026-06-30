import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Maximize2, Minimize2, Send, Paperclip,
  Mic, MicOff, Image as ImageIcon, Volume2, Loader2, ChevronDown,
  Sparkles, Trash2, Square
} from 'lucide-react';
import {
  ChatMessage, ChatAttachment,
  streamChatResponse, generateMessageId,
  compressImage, audioFileToBase64
} from '../services/ieltsChatService';
import { QUICK_ACTIONS } from '../data/ieltsChatKnowledge';

// ─── Markdown-lite renderer ────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <Tag key={`list-${elements.length}`} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 my-1.5 space-y-0.5`}>
          {listItems.map((item, i) => <li key={i} className="text-[13px] leading-relaxed">{formatInline(item)}</li>)}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (line: string): React.ReactNode => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      // Inline code: `text`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return <code key={`${i}-${j}`} className="bg-slate-100 dark:bg-slate-700 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-xs font-mono">{cp.slice(1, -1)}</code>;
        }
        return cp;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={i} className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-3 mb-1">{formatInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={i} className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-3 mb-1">{formatInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={i} className="font-bold text-base text-slate-800 dark:text-slate-100 mt-3 mb-1.5">{formatInline(line.slice(2))}</h2>);
    }
    // Unordered lists
    else if (/^[-*•] /.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(line.replace(/^[-*•] /, ''));
    }
    // Ordered lists
    else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(line.replace(/^\d+\.\s/, ''));
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={i} className="border-slate-200 dark:border-slate-600 my-2" />);
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
    }
    // Table rows (simple)
    else if (line.includes('|') && line.trim().startsWith('|')) {
      flushList();
      const cells = line.split('|').filter(c => c.trim() !== '');
      // Skip separator rows
      if (cells.every(c => /^[\s-:]+$/.test(c))) continue;
      const isHeader = i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1]?.trim() || '');
      elements.push(
        <div key={i} className={`flex gap-2 px-2 py-1 text-xs ${isHeader ? 'font-semibold bg-slate-50 dark:bg-slate-700/50 rounded' : ''}`}>
          {cells.map((cell, ci) => (
            <span key={ci} className="flex-1 truncate">{formatInline(cell.trim())}</span>
          ))}
        </div>
      );
    }
    // Normal paragraph
    else {
      flushList();
      elements.push(<p key={i} className="text-[13px] leading-relaxed my-1">{formatInline(line)}</p>);
    }
  }

  flushList();
  return elements;
}

// ─── Chat Box Component ────────────────────────────────────────

interface IeltsChatBoxProps {
  darkMode: boolean;
}

type ChatBoxState = 'collapsed' | 'expanded' | 'fullscreen';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Xin chào! 👋 Tôi là **IELTS Mentor AI** — trợ lý IELTS của bạn.

Tôi có thể giúp bạn:
- 📝 **Chấm bài Writing** (Task 1 & Task 2)
- 🎤 **Hướng dẫn Speaking** (Part 1, 2, 3)
- 📊 **Phân tích biểu đồ** (upload ảnh chart/graph)
- 📚 **Giải thích framework** (PEEL, AREA, OREO...)
- 🎯 **Lộ trình cải thiện band**
- 💡 **Mẹo học IELTS** hiệu quả

Bạn có thể gửi **text, ảnh, hoặc ghi âm** cho tôi! Hãy bắt đầu nhé 🚀`,
  timestamp: Date.now(),
};

export default function IeltsChatBox({ darkMode }: IeltsChatBoxProps) {
  const [state, setState] = useState<ChatBoxState>('collapsed');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Auto-scroll to bottom ──────────────────────────────────

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Track scroll position to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!chatBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  // ─── Focus input when expanded ──────────────────────────────

  useEffect(() => {
    if (state !== 'collapsed' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [state]);

  // ─── Send message ───────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (isStreaming) return;

    // Create user message
    const userMsg: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    // Create placeholder for AI response
    const aiMsgId = generateMessageId();
    const aiPlaceholder: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, aiPlaceholder]);
    setInputText('');
    setPendingAttachments([]);
    setIsStreaming(true);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Get all non-placeholder messages for context
      const historyMessages = [...messages, userMsg].filter(m => m.id !== 'welcome' || messages.length <= 1);

      let fullResponse = '';

      for await (const chunk of streamChatResponse(
        historyMessages,
        text,
        pendingAttachments.length > 0 ? pendingAttachments : undefined
      )) {
        if (abortController.signal.aborted) break;

        fullResponse += chunk;
        setMessages(prev =>
          prev.map(m =>
            m.id === aiMsgId
              ? { ...m, content: fullResponse, isStreaming: true }
              : m
          )
        );
      }

      // Mark as done streaming
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: fullResponse, isStreaming: false, timestamp: Date.now() }
            : m
        )
      );
    } catch (err) {
      console.error('[ChatBox] Error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: '⚠️ Đã xảy ra lỗi. Vui lòng thử lại.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputText, pendingAttachments, isStreaming, messages]);

  // ─── Stop streaming ─────────────────────────────────────────

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // ─── Quick action ───────────────────────────────────────────

  const handleQuickAction = useCallback((prompt: string) => {
    setInputText(prompt);
    // Auto-send after a tick
    setTimeout(() => {
      const fakeEvent = { key: 'Enter', shiftKey: false, preventDefault: () => {} };
      // We just set the text, the user can press send or we auto-send
    }, 50);
  }, []);

  // ─── Key handler ────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ─── Image upload ───────────────────────────────────────────

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64, mimeType } = await compressImage(file);
      setPendingAttachments(prev => [...prev, {
        type: 'image',
        data: base64,
        mimeType,
        fileName: file.name,
      }]);
    } catch (err) {
      console.error('Image upload failed:', err);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ─── Audio upload ───────────────────────────────────────────

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64, mimeType } = await audioFileToBase64(file);
      setPendingAttachments(prev => [...prev, {
        type: 'audio',
        data: base64,
        mimeType,
        fileName: file.name,
      }]);
    } catch (err) {
      console.error('Audio upload failed:', err);
    }

    if (audioInputRef.current) audioInputRef.current.value = '';
  }, []);

  // ─── Voice recording ───────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });

        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          setPendingAttachments(prev => [...prev, {
            type: 'audio',
            data: base64,
            mimeType: mediaRecorder.mimeType || 'audio/webm',
            fileName: `recording_${Date.now()}.webm`,
          }]);
        };
        reader.readAsDataURL(audioBlob);

        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ─── Remove pending attachment ──────────────────────────────

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ─── Clear chat ─────────────────────────────────────────────

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  // ─── Format recording duration ──────────────────────────────

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Drag & drop for images ─────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const { base64, mimeType } = await compressImage(file);
          setPendingAttachments(prev => [...prev, {
            type: 'image',
            data: base64,
            mimeType,
            fileName: file.name,
          }]);
        } catch (err) {
          console.error('Drop image failed:', err);
        }
      } else if (file.type.startsWith('audio/')) {
        try {
          const { base64, mimeType } = await audioFileToBase64(file);
          setPendingAttachments(prev => [...prev, {
            type: 'audio',
            data: base64,
            mimeType,
            fileName: file.name,
          }]);
        } catch (err) {
          console.error('Drop audio failed:', err);
        }
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // ─── Collapsed: Floating Action Button ──────────────────────

  if (state === 'collapsed') {
    return (
      <button
        id="ielts-chat-fab"
        onClick={() => setState('expanded')}
        className="fixed bottom-5 right-5 z-[9999] group"
        title="Hỏi AI về IELTS"
      >
        <div className="relative">
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 opacity-30 anim-chat-fab-pulse" />

          {/* Main button */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/40">
            <Sparkles className="w-6 h-6" />
          </div>

          {/* Label tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            IELTS Mentor AI ✨
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45" />
          </div>
        </div>
      </button>
    );
  }

  // ─── Expanded / Fullscreen chat window ──────────────────────

  const isFullscreen = state === 'fullscreen';

  return (
    <div
      className={`
        fixed z-[9999] flex flex-col
        ${isFullscreen
          ? 'inset-0'
          : 'bottom-5 right-5 w-[calc(100vw-2.5rem)] max-w-[420px] h-[min(85vh,640px)] rounded-2xl shadow-2xl shadow-indigo-500/10'
        }
        bg-white dark:bg-slate-800
        border border-slate-200/80 dark:border-slate-700/80
        ${!isFullscreen ? 'anim-chat-slide-up' : ''}
        overflow-hidden
      `}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white flex-shrink-0">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-tight">IELTS Mentor AI</h3>
          <p className="text-[11px] text-white/70 leading-tight">Trợ lý IELTS thông minh</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Xoá cuộc trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setState(isFullscreen ? 'expanded' : 'fullscreen')}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title={isFullscreen ? 'Thu nhỏ' : 'Mở rộng'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setState('collapsed')}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Đóng chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Quick Actions ──────────────────────────────────── */}
      {messages.length <= 2 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-600 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all whitespace-nowrap"
              >
                <span>{action.icon}</span>
                <span>{action.labelVi}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Chat Body ──────────────────────────────────────── */}
      <div
        ref={chatBodyRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative"
        onScroll={handleScroll}
      >
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`
                max-w-[85%] rounded-2xl px-3.5 py-2.5 anim-chat-msg-in
                ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-md'
                  : 'bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-bl-md border border-slate-100 dark:border-slate-600/50'
                }
              `}
            >
              {/* Attachment previews */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachments.map((att, i) => (
                    <div key={i}>
                      {att.type === 'image' ? (
                        <img
                          src={`data:${att.mimeType};base64,${att.data}`}
                          alt={att.fileName || 'Uploaded image'}
                          className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-white/20"
                        />
                      ) : (
                        <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-600/30 rounded-lg px-3 py-2 text-xs">
                          <Volume2 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{att.fileName || 'Audio file'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message content */}
              {msg.role === 'assistant' ? (
                <div className="text-[13px] leading-relaxed">
                  {renderMarkdown(msg.content)}
                  {msg.isStreaming && (
                    <span className="inline-flex items-center gap-1 ml-1">
                      <span className="anim-typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full" style={{ animationDelay: '0ms' }} />
                      <span className="anim-typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full" style={{ animationDelay: '150ms' }} />
                      <span className="anim-typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-md text-xs font-medium text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Cuộn xuống
          </button>
        )}
      </div>

      {/* ─── Pending Attachments Preview ────────────────────── */}
      {pendingAttachments.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="relative group">
                {att.type === 'image' ? (
                  <img
                    src={`data:${att.mimeType};base64,${att.data}`}
                    alt={att.fileName || 'Preview'}
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 flex flex-col items-center justify-center">
                    <Volume2 className="w-5 h-5 text-violet-500" />
                    <span className="text-[9px] text-violet-500 mt-0.5 font-medium">Audio</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recording Indicator ────────────────────────────── */}
      {isRecording && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800/30 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full anim-record-pulse" />
            <span className="text-xs font-bold text-red-600 dark:text-red-400">Đang ghi âm</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-1">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 dark:bg-red-500 rounded-full anim-waveform"
                style={{
                  animationDelay: `${i * 80}ms`,
                  height: `${8 + Math.random() * 16}px`,
                }}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-red-500 dark:text-red-400 min-w-[36px] text-right">
            {formatDuration(recordingDuration)}
          </span>
          <button
            onClick={stopRecording}
            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="Dừng ghi âm"
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ─── Input Area ─────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-end gap-2">
          {/* Attachment buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              title="Upload ảnh biểu đồ/chart"
              disabled={isStreaming}
            >
              <ImageIcon className="w-4.5 h-4.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Audio upload */}
            <button
              onClick={() => audioInputRef.current?.click()}
              className="p-2 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              title="Upload file audio"
              disabled={isStreaming}
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />

            {/* Voice record */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100'
                  : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
              }`}
              title={isRecording ? 'Dừng ghi âm' : 'Ghi âm giọng nói'}
              disabled={isStreaming}
            >
              {isRecording ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // Auto resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi bất cứ gì về IELTS..."
            className="flex-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            rows={1}
            style={{ maxHeight: '120px' }}
            disabled={isStreaming && !inputText}
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              onClick={handleStopStreaming}
              className="flex-shrink-0 p-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              title="Dừng phản hồi"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputText.trim() && pendingAttachments.length === 0}
              className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm hover:shadow-md hover:shadow-indigo-500/20 disabled:opacity-40 disabled:shadow-none transition-all"
              title="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Help text */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
          Nhấn Enter gửi • Shift+Enter xuống dòng • Kéo thả ảnh/audio vào chat
        </p>
      </div>
    </div>
  );
}
