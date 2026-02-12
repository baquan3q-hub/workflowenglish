import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { DifficultyLevel, GeneratedLesson } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Utils for Gemini TTS ---
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const createAudioBufferFromBase64 = async (base64: string): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  const arrayBuffer = base64ToArrayBuffer(base64);

  // Handle raw PCM (Gemini typically returns 24kHz mono 16-bit PCM in inlineData)
  // We manually parse it as in the original code
  const dataView = new DataView(arrayBuffer);
  // Check if it's empty
  if (arrayBuffer.byteLength === 0) throw new Error("Empty audio buffer");

  const float32Data = new Float32Array(arrayBuffer.byteLength / 2);
  for (let i = 0; i < float32Data.length; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    float32Data[i] = int16 / 32768.0;
  }

  const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
  audioBuffer.getChannelData(0).set(float32Data);
  return audioBuffer;
};

// --- Generate TTS AudioBuffer (single API call, no playback) ---
export const generateTTS = async (text: string): Promise<{ buffer: AudioBuffer, base64: string }> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: {
      parts: [{ text }],
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) {
    throw new Error("No audio data returned from TTS");
  }

  const buffer = await createAudioBufferFromBase64(base64);
  return { buffer, base64 };
};

// Kept for backward compatibility if needed, but we typically use generateTTS now
export const generateTTSBuffer = async (text: string): Promise<AudioBuffer> => {
  const { buffer } = await generateTTS(text);
  return buffer;
};

// --- Audio Player Controller (play/pause/seek/speed) ---
export class AudioPlayerController {
  private ctx: AudioContext;
  private buffer: AudioBuffer;
  private source: AudioBufferSourceNode | null = null;
  private _speed: number = 1.0;
  private _startedAt: number = 0;   // ctx.currentTime when playback started
  private _pausedAt: number = 0;    // offset into buffer (seconds, raw time at speed=1)
  private _isPlaying: boolean = false;

  public onEnded: (() => void) | null = null;
  public onTimeUpdate: ((currentTime: number) => void) | null = null;
  private animFrameId: number | null = null;

  constructor(buffer: AudioBuffer, speed: number = 1.0) {
    this.ctx = getAudioContext();
    this.buffer = buffer;
    this._speed = speed;
  }

  get duration(): number {
    return this.buffer.duration;
  }

  /** Actual playback duration accounting for speed */
  get playbackDuration(): number {
    return this.buffer.duration / this._speed;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** Current playback time in seconds (raw buffer time at speed=1) */
  get currentTime(): number {
    if (this._isPlaying) {
      return this._pausedAt + (this.ctx.currentTime - this._startedAt) * this._speed;
    }
    return this._pausedAt;
  }

  /** Current playback time as fraction 0..1 */
  get progress(): number {
    return Math.min(1, this.currentTime / this.buffer.duration);
  }

  play(offset?: number) {
    this.stopSource();

    const startOffset = offset !== undefined ? offset : this._pausedAt;
    if (startOffset >= this.buffer.duration) {
      this._pausedAt = 0;
      this._isPlaying = false;
      this.onEnded?.();
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this._speed;
    source.connect(this.ctx.destination);

    source.onended = () => {
      // Only fire if we didn't manually stop
      if (this._isPlaying && this.source === source) {
        this._isPlaying = false;
        this._pausedAt = 0;
        this.source = null;
        this.stopAnimLoop();
        this.onEnded?.();
      }
    };

    this.source = source;
    this._startedAt = this.ctx.currentTime;
    this._pausedAt = startOffset;
    this._isPlaying = true;

    source.start(0, startOffset);
    this.startAnimLoop();
  }

  pause() {
    if (!this._isPlaying) return;
    const elapsed = (this.ctx.currentTime - this._startedAt) * this._speed;
    this._pausedAt = this._pausedAt + elapsed;
    this.stopSource();
    this._isPlaying = false;
    this.stopAnimLoop();
  }

  togglePlayPause() {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number) {
    const clampedTime = Math.max(0, Math.min(time, this.buffer.duration));
    if (this._isPlaying) {
      this.play(clampedTime);
    } else {
      this._pausedAt = clampedTime;
    }
  }

  seekByFraction(fraction: number) {
    this.seek(fraction * this.buffer.duration);
  }

  setSpeed(speed: number) {
    this._speed = speed;
    if (this._isPlaying && this.source) {
      // Save current position, restart with new speed
      const currentPos = this.currentTime;
      this.play(currentPos);
    }
  }

  skipForward(seconds: number) {
    this.seek(this.currentTime + seconds);
  }

  skipBackward(seconds: number) {
    this.seek(this.currentTime - seconds);
  }

  /** Export the audio buffer as a downloadable WAV Blob */
  getWavBlob(): Blob {
    const numChannels = this.buffer.numberOfChannels;
    const sampleRate = this.buffer.sampleRate;
    const length = this.buffer.length;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channels and write 16-bit PCM
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(this.buffer.getChannelData(ch));
    }
    let offset = headerSize;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  destroy() {
    this.stopSource();
    this._isPlaying = false;
    this._pausedAt = 0;
    this.stopAnimLoop();
    this.onEnded = null;
    this.onTimeUpdate = null;
  }

  private stopSource() {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (_) {
        // ignore
      }
      this.source = null;
    }
  }

  private startAnimLoop() {
    this.stopAnimLoop();
    const tick = () => {
      if (!this._isPlaying) return;
      this.onTimeUpdate?.(this.currentTime);
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopAnimLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

// --- Legacy simple playTTS (kept for backward compat) ---
let currentSource: AudioBufferSourceNode | null = null;

export const stopAudio = () => {
  if (currentSource) {
    try { currentSource.stop(); } catch (_) { }
    currentSource = null;
  }
};

interface TTSResult {
  duration: number;
  completionPromise: Promise<void>;
}

export const playTTS = async (text: string, speed: number = 1.0): Promise<TTSResult> => {
  stopAudio();
  try {
    const audioBuffer = await generateTTSBuffer(text);
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(ctx.destination);
    currentSource = source;
    source.start();

    const completionPromise = new Promise<void>((resolve) => {
      source.onended = () => {
        currentSource = null;
        resolve();
      };
    });

    return {
      duration: audioBuffer.duration / speed,
      completionPromise,
    };
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

// --- Lesson Generation ---

const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          word: { type: Type.STRING },
          ipa: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          meaningVietnamese: { type: Type.STRING },
          definitionEnglish: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          exampleSentenceVietnamese: { type: Type.STRING },
        },
        required: ["id", "word", "ipa", "partOfSpeech", "meaningVietnamese", "definitionEnglish", "exampleSentence", "exampleSentenceVietnamese"],
      },
    },
    story: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        translation: { type: Type.STRING },
      },
      required: ["title", "content", "translation"],
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["multiple-choice", "fill-blank"] },
        },
        required: ["id", "question", "options", "correctAnswer", "explanation", "type"],
      },
    },
  },
  required: ["flashcards", "story", "quiz"],
};

export const generateLessonContent = async (
  inputWords: string,
  level: DifficultyLevel,
  topic: string
): Promise<GeneratedLesson> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    You are an expert English teacher (EdTech specialist).
    Create a comprehensive English lesson based on the following vocabulary list, targeting CEFR Level ${level} and the topic "${topic}".
    
    The output must strictly be a JSON object containing:
    1. 'flashcards': Detailed info for each word provided.
    2. 'story': A cohesive, engaging short story (approx 150-200 words) using the vocabulary naturally.
    3. 'quiz': 5-8 questions.
    
    CRITICAL INSTRUCTION FOR QUIZ:
    - The 'question' must be the English vocabulary word (e.g., "What does 'Serendipity' mean?").
    - The 'options' must be Vietnamese definitions/meanings.
    - One option must be correct, others distractors.
    
    Input Vocabulary:
    "${inputWords}"

    Requirements:
    - Vietnamese translations must be natural and accurate.
    - Example sentences must match the ${level} complexity.
    - Quiz should follow 'Mastery Learning' principles.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as GeneratedLesson;
    return data;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};