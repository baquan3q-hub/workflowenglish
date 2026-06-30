/**
 * Speech Recording Service
 * Handles microphone access, recording audio via MediaRecorder API,
 * and converting audio blobs to base64 for Gemini transcription.
 */

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationSeconds: number;
  error: string | null;
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;
let durationInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check if the browser supports audio recording
 */
export function isRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

/**
 * Get the best supported MIME type for recording
 */
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm'; // fallback
}

/**
 * Start recording audio from the microphone
 */
export async function startRecording(
  onDurationUpdate?: (seconds: number) => void,
): Promise<void> {
  if (!isRecordingSupported()) {
    throw new Error('Trình duyệt của bạn không hỗ trợ ghi âm. Vui lòng sử dụng Chrome hoặc Edge.');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });

    audioChunks = [];
    const mimeType = getSupportedMimeType();

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    recordingStartTime = Date.now();

    // Duration timer
    if (durationInterval) clearInterval(durationInterval);
    durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      onDurationUpdate?.(elapsed);
    }, 500);
  } catch (error: any) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Bạn cần cho phép truy cập microphone để ghi âm. Vui lòng kiểm tra cài đặt trình duyệt.');
    }
    throw new Error(`Không thể khởi tạo ghi âm: ${error.message}`);
  }
}

/**
 * Stop recording and return the audio blob
 */
export function stopRecording(): Promise<{ blob: Blob; durationSeconds: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('Không có phiên ghi âm nào đang hoạt động.'));
      return;
    }

    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    const durationSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mimeType = mediaRecorder.mimeType;

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mimeType });
      audioChunks = [];

      // Stop all tracks to release the microphone
      mediaRecorder?.stream?.getTracks().forEach(track => track.stop());
      mediaRecorder = null;

      resolve({ blob, durationSeconds, mimeType });
    };

    mediaRecorder.onerror = (event: any) => {
      reject(new Error(`Lỗi ghi âm: ${event.error?.message || 'Unknown error'}`));
    };

    mediaRecorder.stop();
  });
}

/**
 * Cancel recording without saving
 */
export function cancelRecording(): void {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
    mediaRecorder.stream?.getTracks().forEach(track => track.stop());
  }

  mediaRecorder = null;
  audioChunks = [];
}

/**
 * Convert a Blob to base64 string (for sending to Gemini)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert audio to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Create an audio URL for playback
 */
export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke an audio URL to free memory
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Format seconds to MM:SS display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
