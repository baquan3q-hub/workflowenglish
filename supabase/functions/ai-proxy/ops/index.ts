import { asObject, str, userText, type OpSpec } from '../lib.ts';
import { TTS_MODELS } from '../models.ts';
import { gradeIeltsSpeaking, gradeIeltsWriting, ieltsChat, ieltsIdeas, transcribeAudio } from './ielts.ts';
import { generateLesson, generateRemedialLesson, recommendWords } from './lesson.ts';
import { listeningAudio } from './listening.ts';
import { generateListeningSection } from './listeningGenerate.ts';
import { generateSentences, gradeSentence } from './sentences.ts';

/** Story narration: 24 kHz mono 16-bit PCM, returned as base64. */
const tts: OpSpec = {
  hourlyLimit: 120,
  models: TTS_MODELS,
  timeoutMs: 90_000,
  kind: 'audio',
  build(payload) {
    const text = str(asObject(payload), 'text', { max: 6000 });
    return {
      contents: userText(text),
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
      speech: { text, speakers: [{ voice: 'Kore' }] },
    };
  },
};

/** Everything the proxy will do. Anything else is a 400. */
export const OPS: Record<string, OpSpec> = {
  generateLesson,
  generateRemedialLesson,
  recommendWords,
  generateSentences,
  gradeSentence,
  gradeIeltsWriting,
  gradeIeltsSpeaking,
  transcribeAudio,
  ieltsChat,
  ieltsIdeas,
  tts,
  listeningAudio,
  generateListeningSection,
};

export type OpName = keyof typeof OPS;
