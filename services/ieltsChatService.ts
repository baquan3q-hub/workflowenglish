/**
 * IELTS AI Chat Service
 *
 * Streaming chat with the IELTS mentor, supporting multimodal input
 * (text, images, audio). The system prompt, model choice and history
 * trimming live in the ai-proxy function (op ieltsChat); this side picks the
 * mode per question and attaches the learner snapshot.
 */

import { streamAi } from './aiClient';
import { historyForAi, type ChatAttachment, type ChatMessage, type ChatMode } from './chatLogic';

export type { ChatAttachment, ChatMessage, ChatMode } from './chatLogic';

// ─── Constants ──────────────────────────────────────────────────

const MIN_INTERVAL_MS = 800; // Minimum gap between requests

// ─── Rate Limiter ───────────────────────────────────────────────

let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Generate ID ────────────────────────────────────────────────

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Streaming Chat ─────────────────────────────────────────────

export interface ChatStreamOptions {
  mode: ChatMode;
  /** Learner snapshot (formatLearnerContext); empty to send none. */
  context?: string;
  signal?: AbortSignal;
  /** The model that answered, once the proxy has picked it. */
  onModel?: (model: string | null) => void;
}

/**
 * Sends a message and yields the reply as it arrives.
 * `history` is the conversation before this message. Throws AiError on failure.
 */
export async function* streamChatResponse(
  history: ReadonlyArray<ChatMessage>,
  newMessage: string,
  attachments: ChatAttachment[] | undefined,
  opts: ChatStreamOptions,
): AsyncGenerator<string, void, undefined> {
  await waitForRateLimit();
  const payload = {
    history: historyForAi(history),
    message: {
      text: newMessage,
      attachments: attachments?.filter((a) => a.data).map((a) => ({ mimeType: a.mimeType, data: a.data })),
    },
    mode: opts.mode,
    context: opts.context || undefined,
  };
  yield* streamAi('ieltsChat', payload, {
    signal: opts.signal,
    onResponse: (res) => opts.onModel?.(res.headers.get('x-ai-model')),
  });
}

// ─── Image compression utility ─────────────────────────────────

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024; // larger images are resized first
const MAX_IMAGE_DIM = 1600;

function readAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.size <= MAX_IMAGE_SIZE) {
    return readAsBase64(file).then((base64) => ({ base64, mimeType: file.type || 'image/jpeg' }));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const ratio = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.82).split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// ─── Audio file to base64 utility ───────────────────────────────

export async function audioFileToBase64(file: Blob & { type: string }): Promise<{ base64: string; mimeType: string }> {
  return { base64: await readAsBase64(file), mimeType: file.type || 'audio/webm' };
}
