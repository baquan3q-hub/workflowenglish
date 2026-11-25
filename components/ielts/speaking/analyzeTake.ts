import { blobToBase64 } from '../../../services/speechService';
import { audioLevels } from '../../../services/fluencyAudio';
import { aiErrorMessage, isAbortError } from '../../../services/aiClient';
import type { RecordedTake } from './useRecorder';

export type Transcribe = (audioBase64: string, mimeType: string, signal?: AbortSignal) => Promise<string>;

export interface AnalyzedTake {
  base64: string;
  /** Null when transcription failed; `error` then says why. */
  transcript: string | null;
  error: string | null;
  rms: number[] | null;
  aborted?: boolean;
}

/** Transcribes a take and reads its audio levels side by side. */
export async function analyzeTake(take: RecordedTake, transcribe: Transcribe, signal?: AbortSignal): Promise<AnalyzedTake> {
  if (signal?.aborted) {
    return { base64: '', transcript: null, error: null, rms: null, aborted: true };
  }
  const [base64, rms] = await Promise.all([blobToBase64(take.blob), audioLevels(take.blob)]);
  if (signal?.aborted) {
    return { base64, transcript: null, error: null, rms, aborted: true };
  }
  try {
    const transcript = (await transcribe(base64, take.mimeType, signal)).trim();
    if (!transcript || /^\[no speech detected\]$/i.test(transcript)) {
      return { base64, transcript: null, error: 'Không nghe thấy giọng nói. Kiểm tra micro rồi ghi âm lại.', rms };
    }
    return { base64, transcript, error: null, rms };
  } catch (err) {
    if (isAbortError(err) || signal?.aborted) {
      return { base64, transcript: null, error: null, rms, aborted: true };
    }
    return { base64, transcript: null, error: `Chưa chuyển được giọng nói thành chữ. ${aiErrorMessage(err)}`, rms };
  }
}
