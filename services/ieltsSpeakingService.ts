import { GoogleGenAI, Type, Schema } from '@google/genai';
import { IeltsAiFeedback, IeltsQuestion } from '../types';
import { speakingPart1Questions } from '../data/ieltsSpeakingQuestions';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ─── Gemini Response Schema for Speaking Feedback ──────────────────

const speakingFeedbackSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    estimatedBand: { type: Type.NUMBER },
    criterionScores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          nameVi: { type: Type.STRING },
          score: { type: Type.NUMBER },
          comment: { type: Type.STRING },
        },
        required: ['name', 'nameVi', 'score', 'comment'],
      },
    },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    sentenceCorrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          corrected: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['original', 'corrected', 'explanation'],
      },
    },
    improvedVersion: { type: Type.STRING },
    nextActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    pronunciationNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
    followUpDrill: { type: Type.STRING },
  },
  required: ['estimatedBand', 'criterionScores', 'strengths', 'weaknesses', 'sentenceCorrections', 'improvedVersion', 'nextActions', 'pronunciationNotes', 'followUpDrill'],
};

// ─── Grade Speaking Answer ──────────────────────────────────────────

export async function gradeSpeakingAnswer(
  question: string,
  transcript: string,
  part: string,
  targetBand: string,
  audioBase64?: string,
  audioMimeType?: string,
): Promise<IeltsAiFeedback> {
  const isPart2 = part === 'part_2';
  const isPart3 = part === 'part_3';

  let partPromptDescription = '';
  if (isPart2) {
    partPromptDescription = `This is Speaking Part 2 (Cue Card monologue). The user was given 1 minute to prepare and should speak continuously for 1 to 2 minutes. The transcript represents their complete monologue. Evaluate if they covered all bullet points in the prompt.`;
  } else if (isPart3) {
    partPromptDescription = `This is Speaking Part 3 (Two-way discussion). The transcript contains answers to multiple discussion questions. Grade their ability to expand on abstract ideas, justify opinions, and use cohesive devices. This is graded jointly to measure overall Coherence and Cohesion.`;
  } else {
    partPromptDescription = `This is Speaking Part 1 (Everyday topics). The user should answer directly, giving reasons and examples briefly. The transcript represents their answer.`;
  }

  const prompt = `You are a certified, strict IELTS Speaking Examiner conducting a real face-to-face IELTS Speaking Test.
Evaluate the user's spoken answer/monologue transcript exactly according to the official IELTS Speaking Band Descriptors.
Do not claim this is an official IELTS score. Provide a realistic, strict estimated band score.

CRITICAL: Listen to the attached audio recording to evaluate the user's actual pronunciation, fluency, hesitation, and speech markers. Check the provided transcript (which the user might have edited for correctness) against their actual audio. Compare the speech in the audio with the transcript and identify the EXACT words that are mispronounced, omitted, or mumbled, and list them in the pronunciation notes. Do NOT make up pronunciation errors that do not exist in the audio.

Input Speaking Context:
- Speaking part: ${part}
- Part characteristics: ${partPromptDescription}
- Question/Topic details: ${question}
- User's transcript: ${transcript}
- Target band: ${targetBand}

Instructions for grading criteria:
1. Fluency and Coherence (FC):
   - Analyze the speech flow. Look for fillers (um, ah, like, you know, well), pauses, or unnatural hesitations.
   - Evaluate self-correction or repetition of ideas.
   - Check if they speak at length (especially for Part 2 and 3) and if their ideas are linked logically using appropriate cohesive devices and discourse markers.
2. Pronunciation (PR):
   - Listen to the user's actual speech in the audio. Identify real pronunciation errors:
     - Deletion of ending sounds /s/, /z/, /t/, /d/, /ed/, /ks/, /tʃ/, /dʒ/.
     - Confusing consonant sounds (e.g., confusing /ʃ/ and /s/, or /θ/ and /t/).
     - Shifting stress to the wrong syllable or speaking with a completely flat intonation without sentence stress or word-linking.
3. Lexical Resource (LR):
   - Vocabulary range, idiomatic expressions, collocations, and paraphrase flexibility.
4. Grammatical Range and Accuracy (GR):
   - Complexity of sentence structures, subordinate clauses, and frequency of grammatical errors.

Output format (JSON):
1. estimatedBand: overall estimated band (number like 5.0, 5.5, 6.0, 6.5, 7.0 - strict grading)
2. criterionScores: array of 4 objects, each with:
   - name: criterion name ("Fluency and Coherence", "Lexical Resource", "Grammatical Range and Accuracy", "Pronunciation")
   - nameVi: Vietnamese name ("Sự trôi chảy và mạch lạc", "Nguồn từ vựng", "Phạm vi và độ chính xác ngữ pháp", "Phát âm")
   - score: estimated score (0.5 increments)
   - comment: strict, specific feedback in Vietnamese, detailing exact issues. For FC, describe their flow, hesitancies, and filler usage. For PR, describe their rhythm, intonation, and likely consonant problems.
3. strengths: array of 2-3 strengths (mix Vietnamese and English)
4. weaknesses: array of 2-3 weaknesses (mix Vietnamese and English), specifically addressing fluency interruptions or pronunciation gaps.
5. sentenceCorrections: up to 5 corrections of grammatical/vocabulary errors from the transcript:
   - original: what the user said
   - corrected: better version
   - explanation: explanation in Vietnamese
6. improvedVersion: a natural, corrected version of the full answer or monologue at the target band
7. nextActions: 3 specific practice suggestions (mix Vietnamese and English)
8. pronunciationNotes: array of 3-5 highly specific pronunciation tips, each formatted as:
   "• [Từ]: Hay phát âm sai thành [phiên âm sai] (thiếu âm đuôi [âm]). Hãy phát âm đúng là [IPA / hướng dẫn cụ thể]."
9. followUpDrill: a short follow-up speaking exercise (1-2 sentences) for the user to practise repeating or improving their response.`;

  const contents: any[] = [];
  if (audioBase64) {
    contents.push({
      inlineData: {
        mimeType: audioMimeType || 'audio/webm',
        data: audioBase64,
      },
    });
  }
  contents.push(prompt);

  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      console.log(`[IELTS Speaking] Grading with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: speakingFeedbackSchema,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const text = response.text;
      if (!text) throw new Error('No response from AI');

      const data = JSON.parse(text) as IeltsAiFeedback;
      return data;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.message?.match(/(\d{3})/)?.[1];
      console.warn(`[IELTS Speaking] Model "${model}" failed (${status}):`, error?.message || error);
      if (status !== 503 && status !== '503' && status !== 429 && status !== '429') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[IELTS Speaking] All models failed', lastError);
  throw lastError;
}

// ─── Transcribe audio with Gemini ──────────────────────────────────

export async function transcribeAudioWithGemini(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      console.log(`[IELTS STT] Transcribing with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Please transcribe this audio recording accurately. The speaker is an English language learner (likely Vietnamese). Return ONLY the transcript text, nothing else. If the audio is unclear or empty, return "[No speech detected]".',
              },
            ],
          },
        ],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error('No transcript returned');
      return text;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.message?.match(/(\d{3})/)?.[1];
      console.warn(`[IELTS STT] Model "${model}" failed (${status}):`, error?.message || error);
      if (status !== 503 && status !== '503' && status !== 429 && status !== '429') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[IELTS STT] All models failed', lastError);
  throw lastError;
}
