/**
 * IELTS AI Chat Service
 * 
 * Handles streaming chat with Gemini API, supporting multimodal input
 * (text, images, audio). Maintains conversation history for context.
 */

import { GoogleGenAI } from '@google/genai';
import { IELTS_MENTOR_SYSTEM_PROMPT } from '../data/ieltsChatKnowledge';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const MAX_HISTORY_MESSAGES = 20; // Keep last 20 messages for context
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

// ─── Build Gemini contents from chat history ────────────────────

function buildGeminiContents(
  messages: ChatMessage[],
  newMessage: string,
  attachments?: ChatAttachment[]
) {
  // Keep only the last N messages for context window
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }> = [];

  // Add conversation history
  for (const msg of recentMessages) {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (msg.content) {
      parts.push({ text: msg.content });
    }

    // Add attachments from history
    if (msg.attachments) {
      for (const att of msg.attachments) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data,
          },
        });
      }
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  // Add the new user message
  const newParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (newMessage) {
    newParts.push({ text: newMessage });
  }

  // Add new attachments
  if (attachments) {
    for (const att of attachments) {
      newParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data,
        },
      });

      // Add contextual instruction for the attachment
      if (att.type === 'image') {
        if (!newMessage) {
          newParts.unshift({ text: 'Hãy phân tích hình ảnh/biểu đồ này và hướng dẫn tôi viết IELTS Writing Task 1 về nó.' });
        }
      } else if (att.type === 'audio') {
        if (!newMessage) {
          newParts.unshift({ text: 'Hãy nghe audio này, transcribe nội dung, và cho tôi feedback về Speaking (grammar, vocabulary, fluency).' });
        }
      }
    }
  }

  if (newParts.length > 0) {
    contents.push({ role: 'user', parts: newParts });
  }

  return contents;
}

// ─── Generate ID ────────────────────────────────────────────────

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Streaming Chat ─────────────────────────────────────────────

/**
 * Send a chat message and get streaming response.
 * Yields text chunks as they arrive from Gemini.
 */
export async function* streamChatResponse(
  messages: ChatMessage[],
  newMessage: string,
  attachments?: ChatAttachment[]
): AsyncGenerator<string, void, undefined> {
  await waitForRateLimit();

  const contents = buildGeminiContents(messages, newMessage, attachments);
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      console.log(`[IELTS Chat] Streaming with model: ${model}`);

      const response = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: IELTS_MENTOR_SYSTEM_PROMPT,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }

      return; // Success — exit generator
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.message?.match(/(\d{3})/)?.[1];
      console.warn(`[IELTS Chat] Model "${model}" failed (${status}):`, error?.message || error);

      // Only retry on 503 (overloaded) or 429 (rate limit)
      if (status !== 503 && status !== '503' && status !== 429 && status !== '429') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // All models failed — yield error message
  console.error('[IELTS Chat] All models failed', lastError);
  yield '\n\n⚠️ Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau vài giây.';
}

// ─── Non-streaming fallback (for simpler use cases) ─────────────

export async function sendChatMessage(
  messages: ChatMessage[],
  newMessage: string,
  attachments?: ChatAttachment[]
): Promise<string> {
  await waitForRateLimit();

  const contents = buildGeminiContents(messages, newMessage, attachments);
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      console.log(`[IELTS Chat] Sending with model: ${model}`);

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: IELTS_MENTOR_SYSTEM_PROMPT,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const text = response.text;
      if (!text) throw new Error('No response from AI');
      return text;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.message?.match(/(\d{3})/)?.[1];
      console.warn(`[IELTS Chat] Model "${model}" failed (${status}):`, error?.message || error);

      if (status !== 503 && status !== '503' && status !== 429 && status !== '429') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[IELTS Chat] All models failed', lastError);
  throw lastError;
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
