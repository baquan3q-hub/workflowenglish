import { IeltsAiFeedback } from '../types';
import { invokeAi } from './aiClient';

// ─── Grade Speaking Answer ──────────────────────────────────────────

/** Prompt, schema and model fallback live in the ai-proxy function (op gradeIeltsSpeaking). */
export async function gradeSpeakingAnswer(
  question: string,
  transcript: string,
  part: string,
  targetBand: string,
  audioBase64?: string,
  audioMimeType?: string,
  /** Fluency measured on the device (fluencySummaryForGrader). */
  measured?: string,
): Promise<IeltsAiFeedback> {
  const audio = audioBase64 ? { data: audioBase64, mimeType: audioMimeType || 'audio/webm' } : undefined;
  return invokeAi<IeltsAiFeedback>('gradeIeltsSpeaking', { question, transcript, part, targetBand, audio, measured });
}

// ─── Transcribe audio with Gemini ──────────────────────────────────

export async function transcribeAudioWithGemini(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  const text = await invokeAi<string>('transcribeAudio', { audio: { data: audioBase64, mimeType } });
  if (!text?.trim()) throw new Error('No transcript returned');
  return text.trim();
}
