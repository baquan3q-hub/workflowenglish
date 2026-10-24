import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Maximize2, Minimize2, Send, Paperclip,
  Mic, MicOff, Image as ImageIcon, Volume2, Loader2, ChevronDown,
  Sparkles, Trash2, Square, PanelRightClose, PanelRightOpen, FileText,
  Languages, Bookmark, HelpCircle, GripHorizontal, Copy, Check
} from 'lucide-react';
import {
  ChatMessage, ChatAttachment,
  streamChatResponse, generateMessageId,
  compressImage, audioFileToBase64
} from '../../services/ieltsChatService';
import {
  buildScaffoldActionPrompt,
  getProactiveSuggestionsForAttachment,
  getPhaseContextTip,
  extractDocumentText
} from '../../services/scaffoldChatService';
import { ScaffoldActionType } from '../../services/scaffoldActionTypes';
import { ScaffoldMarkdownRenderer } from './renderers/ScaffoldMarkdownRenderer';
import { ScaffoldToolbar } from './ScaffoldToolbar';
import { speakText } from '../../services/browserSpeech';

export type WindowDisplayMode = 'floating' | 'docked' | 'fullscreen';

interface ScaffoldWindowProps {
  darkMode: boolean;
  onClose: () => void;
  currentUser?: { id: string; email?: string } | null;
  currentPhase?: string;
  targetBand?: number;
}

const WELCOME_SCAFFOLD_MESSAGE: ChatMessage = {
  id: 'welcome_scaffold',
  role: 'assistant',
  content: `Xin chào! 👋 Tôi là **IELTS Mentor AI** — Giàn giáo học tập thông minh của bạn.

Tôi đồng hành và hỗ trợ bạn trong suốt quá trình học:
- 🔍 **Mổ xẻ chi tiết từng câu**: Đối chiếu song ngữ, phân tích ngữ pháp, chú thích sắc thái & phát âm chuẩn.
- ⭐ **Trích xuất từ vựng học thuật**: Trích từ đắt giá và hỗ trợ **lưu 1-chạm vào Flashcard (SRS)**.
- 🎯 **Tạo câu hỏi ôn tập tương tác**: Tự động sinh trắc nghiệm / điền từ trực tiếp trong chat để củng cố bài.
- 🖼️ **Phân tích Đa phương tiện & Tệp**: Bạn có thể kéo thả **ảnh biểu đồ, file audio ghi âm, hoặc tệp tài liệu (.txt, .pdf, .md)** vào đây bất kỳ lúc nào!

Hãy chọn tab chức năng ở trên hoặc nhập nội dung để bắt đầu nhé 🚀`,
  timestamp: Date.now(),
};

export function ScaffoldWindow({
  darkMode,
  onClose,
  currentUser,
  currentPhase,
  targetBand,
}: ScaffoldWindowProps) {
  const [displayMode, setDisplayMode] = useState<WindowDisplayMode>('floating');
  const [activeMode, setActiveMode] = useState<ScaffoldActionType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_SCAFFOLD_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Floating window position state
  const [windowPos, setWindowPos] = useState({ x: 0, y: 0 });
  const [isWindowInitialized, setIsWindowInitialized] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Context tip based on active phase
  const contextTip = getPhaseContextTip(currentPhase);

  // Compute initial floating position
  useEffect(() => {
    if (typeof window !== 'undefined' && !isWindowInitialized) {
      const w = Math.min(window.innerWidth - 32, 450);
      const h = Math.min(window.innerHeight * 0.84, 680);
      const startX = Math.max(16, window.innerWidth - w - 24);
      const startY = Math.max(16, window.innerHeight - h - 30);
      setWindowPos({ x: startX, y: startY });
      setIsWindowInitialized(true);
    }
  }, [isWindowInitialized]);

  // Window drag handler for header
  const isDraggingHeaderRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (displayMode !== 'floating') return;
    if ((e.target as HTMLElement).closest('button')) return; // ignore button clicks

    isDraggingHeaderRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - windowPos.x,
      y: e.clientY - windowPos.y,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDraggingHeaderRef.current) return;
      const newX = ev.clientX - dragOffsetRef.current.x;
      const newY = ev.clientY - dragOffsetRef.current.y;

      const windowW = windowRef.current?.offsetWidth || 440;
      const windowH = windowRef.current?.offsetHeight || 640;

      const clampedX = Math.min(Math.max(10, newX), window.innerWidth - windowW - 10);
      const clampedY = Math.min(Math.max(10, newY), window.innerHeight - windowH - 10);

      setWindowPos({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      isDraggingHeaderRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // ─── Auto-scroll ─────────────────────────────────────────────
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

  const handleScroll = useCallback(() => {
    if (!chatBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  // ─── Send message ────────────────────────────────────────────
  const executeSend = useCallback(async (customText?: string, attachmentsOverride?: ChatAttachment[]) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    const attachments = attachmentsOverride || pendingAttachments;

    if (!textToSend && attachments.length === 0) return;
    if (isStreaming) return;

    const userMsg: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const aiMsgId = generateMessageId();
    const aiPlaceholder: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    if (customText === undefined) setInputText('');
    setPendingAttachments([]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const historyMessages = [...messages, userMsg].filter(
        (m) => m.id !== 'welcome_scaffold' || messages.length <= 1
      );

      let fullResponse = '';

      for await (const chunk of streamChatResponse(
        historyMessages,
        textToSend,
        attachments.length > 0 ? attachments : undefined
      )) {
        if (abortController.signal.aborted) break;

        fullResponse += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: fullResponse, isStreaming: true } : m))
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: fullResponse, isStreaming: false, timestamp: Date.now() }
            : m
        )
      );
    } catch (err) {
      console.error('[ScaffoldChat] Error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: '⚠️ Đã xảy ra sự cố kết nối. Vui lòng thử lại.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputText, pendingAttachments, isStreaming, messages]);

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // ─── Mode Change & Execution ─────────────────────────────────
  const handleSelectMode = (mode: ScaffoldActionType) => {
    setActiveMode(mode);
    if (mode === 'chat') return;

    // If user has text in input or there is a recent user message
    let target = inputText.trim();
    if (!target) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user' && m.content);
      if (lastUserMsg) target = lastUserMsg.content;
    }

    if (target || pendingAttachments.length > 0) {
      const prompt = buildScaffoldActionPrompt(mode, target || 'Tệp đính kèm');
      executeSend(prompt);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // ─── Attachments Handling ────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await compressImage(file);
      setPendingAttachments((prev) => [
        ...prev,
        { type: 'image', data: base64, mimeType, fileName: file.name },
      ]);
    } catch (err) {
      console.error('Image upload failed:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await audioFileToBase64(file);
      setPendingAttachments((prev) => [
        ...prev,
        { type: 'audio', data: base64, mimeType, fileName: file.name },
      ]);
    } catch (err) {
      console.error('Audio upload failed:', err);
    }
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { text, fileName } = await extractDocumentText(file);
      setInputText((prev) => (prev ? `${prev}\n\n[Tài liệu: ${fileName}]\n${text}` : text));
    } catch (err) {
      console.error('Document upload failed:', err);
    }
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const { base64, mimeType } = await compressImage(file);
            setPendingAttachments((prev) => [
              ...prev,
              { type: 'image', data: base64, mimeType, fileName: `clipboard_${Date.now()}.png` },
            ]);
          } catch (err) {
            console.error('Paste image failed:', err);
          }
        }
      }
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const { base64, mimeType } = await compressImage(file);
        setPendingAttachments((prev) => [
          ...prev,
          { type: 'image', data: base64, mimeType, fileName: file.name },
        ]);
      } else if (file.type.startsWith('audio/')) {
        const { base64, mimeType } = await audioFileToBase64(file);
        setPendingAttachments((prev) => [
          ...prev,
          { type: 'audio', data: base64, mimeType, fileName: file.name },
        ]);
      } else {
        const { text, fileName } = await extractDocumentText(file);
        setInputText((prev) => (prev ? `${prev}\n\n[Tệp: ${fileName}]\n${text}` : text));
      }
    }
  }, []);

  // ─── Audio Recording ─────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          setPendingAttachments((prev) => [
            ...prev,
            {
              type: 'audio',
              data: base64,
              mimeType: mediaRecorder.mimeType || 'audio/webm',
              fileName: `speaking_${Date.now()}.webm`,
            },
          ]);
        };
        reader.readAsDataURL(audioBlob);

        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Window Layout Classes ───────────────────────────────────
  let windowStyle: React.CSSProperties = {};
  let layoutClass = '';

  if (displayMode === 'fullscreen') {
    layoutClass = 'fixed inset-0 z-[9999] rounded-none';
  } else if (displayMode === 'docked') {
    layoutClass = 'fixed top-0 right-0 bottom-0 w-[480px] max-w-[100vw] z-[9999] rounded-none border-l shadow-2xl';
  } else {
    // Floating
    layoutClass = 'fixed z-[9999] w-[calc(100vw-2.5rem)] max-w-[450px] h-[min(86vh,690px)] rounded-3xl shadow-2xl';
    windowStyle = {
      left: `${windowPos.x}px`,
      top: `${windowPos.y}px`,
    };
  }

  // Placeholder text depending on active mode
  const getInputPlaceholder = () => {
    switch (activeMode) {
      case 'sentence_breakdown':
        return 'Nhập hoặc dán đoạn văn tiếng Anh để mổ xẻ từng câu...';
      case 'vocab_extract':
        return 'Nhập hoặc dán bài viết để trích xuất từ vựng học thuật & lưu SRS...';
      case 'quiz_generate':
        return 'Nhập chủ đề hoặc dán văn bản để AI tạo câu hỏi trắc nghiệm tương tác...';
      default:
        return 'Hỏi IELTS Mentor AI bất cứ điều gì... (hoặc dán Ctrl+V ảnh/tài liệu)';
    }
  };

  return (
    <div
      ref={windowRef}
      style={windowStyle}
      className={`
        ${layoutClass}
        flex flex-col
        bg-white dark:bg-slate-900
        border border-slate-200/90 dark:border-slate-800
        shadow-indigo-500/15
        overflow-hidden
        transition-all duration-150
      `}
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleDrop}
    >
      {/* ─── Glossy Header ───────────────────────────────────── */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className={`flex items-center gap-3 px-3.5 py-3 bg-gradient-to-r from-rose-500 via-violet-600 to-indigo-600 text-white flex-shrink-0 select-none shadow-md ${
          displayMode === 'floating' ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {displayMode === 'floating' && (
            <GripHorizontal className="w-4 h-4 text-white/50" />
          )}
          {/* Glossy 3D Bitmap Icon */}
          <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img
              src="/glossy-ai-bubble.png"
              alt="Glossy AI Icon"
              className="w-full h-full object-contain drop-shadow-md select-none pointer-events-none"
              draggable={false}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-700 shadow-xs" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm leading-tight truncate">IELTS Mentor AI</h3>
            {targetBand && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono font-bold">
                Band {targetBand}
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-white/80 leading-tight truncate">
            {contextTip?.badge || 'Giàn giáo học tập & Cố vấn 24/7'}
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1">
          {/* Dock / Undock toggle */}
          <button
            onClick={() => setDisplayMode(displayMode === 'docked' ? 'floating' : 'docked')}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title={displayMode === 'docked' ? 'Chuyển về cửa sổ nổi' : 'Ghim thanh bên phải màn hình'}
          >
            {displayMode === 'docked' ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setDisplayMode(displayMode === 'fullscreen' ? 'floating' : 'fullscreen')}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title={displayMode === 'fullscreen' ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {displayMode === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Clear chat */}
          <button
            onClick={() => setMessages([WELCOME_SCAFFOLD_MESSAGE])}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Xoá lịch sử trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close / Collapse to bubble */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Thu nhỏ thành bong bóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Mode Navigation Tabs ────────────────────────────── */}
      <ScaffoldToolbar
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        onQuickPrompt={(prompt) => executeSend(prompt)}
      />

      {/* ─── Mode Specific Guidance Banner ───────────────────── */}
      {activeMode !== 'chat' && (
        <div className="flex-shrink-0 px-3.5 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
          <span className="font-medium">
            {activeMode === 'sentence_breakdown' && '🔍 Dán đoạn văn để mổ xẻ ngữ pháp, sắc thái & phát âm từng câu.'}
            {activeMode === 'vocab_extract' && '⭐ Trích xuất từ vựng Band 6.5–8.0+ và lưu 1-chạm vào Flashcard SRS.'}
            {activeMode === 'quiz_generate' && '🎯 Tự động tạo 3 câu trắc nghiệm tương tác để ôn tập trực tiếp.'}
          </span>
          <button
            onClick={() => setActiveMode('chat')}
            className="text-[10px] text-indigo-500 hover:underline font-semibold ml-2"
          >
            Về Hỏi đáp
          </button>
        </div>
      )}

      {/* ─── Chat Message Stream ─────────────────────────────── */}
      <div
        ref={chatBodyRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 relative bg-slate-50/50 dark:bg-slate-900/50"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-start gap-2 max-w-[90%]">
              {/* Mini Glossy Avatar for Assistant */}
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-1 shadow-xs">
                  <img
                    src="/glossy-ai-bubble.png"
                    alt="AI"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div
                className={`
                  rounded-2xl px-3.5 py-2.5 relative group
                  ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200/80 dark:border-slate-700/80 shadow-xs'
                  }
                `}
              >
                {/* Assistant Message Top Utilities (Speak / Copy) */}
                {msg.role === 'assistant' && msg.content && !msg.isStreaming && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <button
                      onClick={() => speakText(msg.content)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Nghe đọc toàn bộ"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Sao chép nội dung"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Attachments Preview inside message */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i}>
                        {att.type === 'image' ? (
                          <img
                            src={`data:${att.mimeType};base64,${att.data}`}
                            alt={att.fileName || 'Uploaded'}
                            className="max-w-[220px] max-h-[160px] rounded-lg object-cover border border-white/20"
                          />
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-xs">
                            <Volume2 className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{att.fileName || 'Audio file'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Content */}
                {msg.role === 'assistant' ? (
                  <div>
                    <ScaffoldMarkdownRenderer content={msg.content} userId={currentUser?.id} />
                    {msg.isStreaming && (
                      <span className="inline-flex items-center gap-1 mt-1 ml-1">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Cuộn xuống
          </button>
        )}
      </div>

      {/* ─── Pending Attachments & Proactive Action Bar ───────── */}
      {pendingAttachments.length > 0 && (
        <div className="flex-shrink-0 px-3.5 py-2 border-t border-slate-100 dark:border-slate-700/50 bg-rose-50/30 dark:bg-rose-950/20">
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="relative group">
                {att.type === 'image' ? (
                  <img
                    src={`data:${att.mimeType};base64,${att.data}`}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-600 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 flex flex-col items-center justify-center">
                    <Volume2 className="w-5 h-5 text-violet-600" />
                    <span className="text-[9px] text-violet-600 font-medium">Audio</span>
                  </div>
                )}
                <button
                  onClick={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Proactive Action Suggestions for Attachment */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-rose-100 dark:border-rose-900/40">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 whitespace-nowrap">
              Gợi ý hành động:
            </span>
            {getProactiveSuggestionsForAttachment(pendingAttachments[0]).map((sug) => (
              <button
                key={sug.id}
                onClick={() => {
                  const prompt = buildScaffoldActionPrompt(sug.action, 'Tệp đính kèm');
                  executeSend(prompt);
                }}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-700 hover:bg-rose-50 font-semibold whitespace-nowrap shadow-2xs"
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recording Indicator ────────────────────────────── */}
      {isRecording && (
        <div className="flex-shrink-0 px-4 py-2 bg-rose-50 dark:bg-rose-950/30 border-t border-rose-100 dark:border-rose-900/40 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Đang thu âm Speaking</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-1">
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-rose-400 dark:bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${6 + (i % 4) * 5}px`,
                  animationDuration: '550ms',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
            {formatDuration(recordingDuration)}
          </span>
          <button
            onClick={stopRecording}
            className="p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
            title="Hoàn thành thu âm"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Modern Input Capsule ───────────────────────────── */}
      <div className="flex-shrink-0 px-3.5 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-400 transition-all">
          {/* Action buttons for media & docs */}
          <div className="flex items-center gap-0.5 pb-0.5">
            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Tải ảnh đề thi / biểu đồ Task 1"
              disabled={isStreaming}
            >
              <ImageIcon className="w-4 h-4" />
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
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              title="Tải tệp âm thanh Speaking / Listening"
              disabled={isStreaming}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />

            {/* Document upload (.txt, .md, .pdf) */}
            <button
              onClick={() => docInputRef.current?.click()}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
              title="Tải tệp tài liệu (.txt, .md, .pdf)"
              disabled={isStreaming}
            >
              <FileText className="w-4 h-4" />
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".txt,.md,.pdf,.docx,.json,.csv"
              className="hidden"
              onChange={handleDocUpload}
            />

            {/* Voice record */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-1.5 rounded-xl transition-colors ${
                isRecording
                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
              title={isRecording ? 'Dừng thu âm' : 'Ghi âm giọng nói Speaking'}
              disabled={isStreaming}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Text Input */}
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                executeSend();
              }
            }}
            placeholder={getInputPlaceholder()}
            className="flex-1 bg-transparent border-0 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none"
            rows={1}
            style={{ maxHeight: '120px' }}
          />

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              onClick={handleStopStreaming}
              className="flex-shrink-0 p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              title="Dừng phản hồi"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => executeSend()}
              disabled={!inputText.trim() && pendingAttachments.length === 0}
              className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 text-white shadow-sm hover:shadow-md hover:from-rose-600 hover:to-indigo-700 disabled:opacity-40 transition-all active:scale-95"
              title="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-center select-none">
          Nhấn Enter gửi • Shift+Enter xuống dòng • Dán trực tiếp ảnh (Ctrl+V)
        </p>
      </div>
    </div>
  );
}
