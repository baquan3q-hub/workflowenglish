/**
 * IELTS AI Chat Service
 * 
 * Streaming chat with the IELTS mentor, supporting multimodal input
 * (text, images, audio). The system prompt and history trimming live in the
 * ai-proxy function (op ieltsChat).
 */

import { aiErrorMessage, streamAi } from './aiClient';

// ─── Types ──────────────────────────────────────────────────────

export interface ChatAttachment {
  type: 'image' | 'audio';
  data: string;       // base64 encoded
  mimeType: string;   // e.g. 'image/png', 'audio/webm'
  fileName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────

const MAX_HISTORY_MESSAGES = 20; // The server keeps the same window
const MIN_INTERVAL_MS = 1000;    // Minimum 1s between requests

// ─── Rate Limiter ───────────────────────────────────────────────

let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Payload for the proxy ──────────────────────────────────────

const toWire = (content: string, attachments?: ChatAttachment[]) => ({
  text: content,
  attachments: attachments?.map((a) => ({ mimeType: a.mimeType, data: a.data })),
});

function buildChatPayload(messages: ChatMessage[], newMessage: string, attachments?: ChatAttachment[]) {
  return {
    history: messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, ...toWire(m.content, m.attachments) })),
    message: toWire(newMessage, attachments),
  };
}

// ─── Generate ID ────────────────────────────────────────────────

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Streaming Chat ─────────────────────────────────────────────

/**
 * Send a chat message and get streaming response.
 * Yields text chunks as they arrive. On failure, yields one short error line.
 */
export async function* streamChatResponse(
  messages: ChatMessage[],
  newMessage: string,
  attachments?: ChatAttachment[]
): AsyncGenerator<string, void, undefined> {
  await waitForRateLimit();
  try {
    yield* streamAi('ieltsChat', buildChatPayload(messages, newMessage, attachments));
  } catch (error) {
    console.error('[IELTS Chat] failed', error);
    yield `

${aiErrorMessage(error)}`;
  }
}

// ─── Non-streaming fallback (for simpler use cases) ─────────────

export async function sendChatMessage(
  messages: ChatMessage[],
  newMessage: string,
  attachments?: ChatAttachment[]
): Promise<string> {
  await waitForRateLimit();
  let text = '';
  for await (const chunk of streamAi('ieltsChat', buildChatPayload(messages, newMessage, attachments))) text += chunk;
  if (!text) throw new Error('No response from AI');
  return text;
}

// ─── Image compression utility ─────────────────────────────────

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

export function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    // If small enough, just convert to base64
    if (file.size <= MAX_IMAGE_SIZE) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove "data:image/xxx;base64," prefix
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // Compress large images using canvas
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (max 1920px on any side)
      let { width, height } = img;
      const maxDim = 1920;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
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

      // Try JPEG compression at 80% quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ─── Audio file to base64 utility ───────────────────────────────

export function audioFileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type || 'audio/webm' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
