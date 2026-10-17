import {
  asObject,
  BadRequest,
  FLASH_MODELS,
  inlineData,
  jsonConfig,
  list,
  oneOf,
  str,
  S,
  userText,
  type Content,
  type OpSpec,
  type Part,
} from '../lib.ts';
import { IELTS_MENTOR_SYSTEM_PROMPT } from './ieltsMentorPrompt.ts';

const criterion = S.obj({ name: S.str(), nameVi: S.str(), score: S.num(), comment: S.str() });
const correction = S.obj({ original: S.str(), corrected: S.str(), explanation: S.str() });
const feedbackFields = {
  estimatedBand: S.num(),
  criterionScores: S.arr(criterion),
  strengths: S.arr(S.str()),
  weaknesses: S.arr(S.str()),
  sentenceCorrections: S.arr(correction),
  improvedVersion: S.str(),
  nextActions: S.arr(S.str()),
};
const writingSchema = S.obj(feedbackFields);
const speakingSchema = S.obj({ ...feedbackFields, pronunciationNotes: S.arr(S.str()), followUpDrill: S.str() });

function checkFeedback(data: unknown): unknown {
  const f = data as { estimatedBand?: unknown; criterionScores?: unknown } | null;
  if (!f || typeof f.estimatedBand !== 'number' || !Array.isArray(f.criterionScores)) {
    throw new Error('feedback is missing band or criteria');
  }
  return data;
}

export const gradeIeltsWriting: OpSpec = {
  hourlyLimit: 15,
  models: FLASH_MODELS,
  timeoutMs: 90_000,
  kind: 'json',
  finalize: checkFeedback,
  build(payload) {
    const p = asObject(payload);
    const question = str(p, 'question', { max: 3000 });
    const answer = str(p, 'answer', { max: 12_000 });
    const essayType = str(p, 'essayType', { max: 80, optional: true });
    const targetBand = str(p, 'targetBand', { max: 20, optional: true }) || '6.0';
    const isTask1 = oneOf(p, 'taskType', ['task_1', 'task_2'] as const, 'task_2') === 'task_1';
    const taskCriterionName = isTask1 ? 'Task Achievement' : 'Task Response';
    const taskCriterionNameVi = isTask1
      ? 'Hoàn thành nhiệm vụ (Đúng đề, đủ thông tin biểu đồ)'
      : 'Trả lời yêu cầu đề bài (Lập luận, ý kiến cá nhân)';
    const minWords = isTask1 ? 150 : 250;

    const prompt = `You are an IELTS Writing examiner assistant.
Evaluate the user's answer based on IELTS public band descriptors.
Do not claim this is an official IELTS score. Provide an estimated band only.

Input:
- Test type: Academic
- Task: ${isTask1 ? 'Task 1 (Describe graph/table/map/process)' : 'Task 2 (Essay)'}
- Essay/Chart type: ${essayType}
- Question: ${question}
- User answer: ${answer}
- Target band: ${targetBand}

Output format (JSON):
1. estimatedBand: overall estimated band (number like 5.0, 5.5, 6.0)
2. criterionScores: array of 4 objects, each with:
   - name: criterion name in English (use "${taskCriterionName}", "Coherence and Cohesion", "Lexical Resource", "Grammatical Range and Accuracy")
   - nameVi: criterion name in Vietnamese (use "${taskCriterionNameVi}", "Sự mạch lạc và gắn kết", "Nguồn từ vựng", "Phạm vi và độ chính xác ngữ pháp")
   - score: estimated score for this criterion (0.5 increments)
   - comment: brief comment mixing Vietnamese and English (feedback dễ hiểu cho người Việt)
3. strengths: array of 2-3 strengths (mix Vietnamese and English)
4. weaknesses: array of 2-3 main weaknesses (mix Vietnamese and English). If the user wrote less than ${minWords} words, mention the word count penalty.
5. sentenceCorrections: array of up to 5 sentence-level corrections, each with:
   - original: the original sentence from user's answer
   - corrected: the corrected version
   - explanation: explanation in Vietnamese why this was wrong or how to improve it
6. improvedVersion: a full rewritten version of the essay at the target band level (about ${isTask1 ? '160-180' : '260-290'} words)
7. nextActions: array of 3 specific actions the learner should practise next (mix Vietnamese and English)

Rules:
- Be strict but helpful and encouraging.
- Explain in simple language, mixing Vietnamese and English naturally.
- Prioritise the top 3 problems only.
- Do not over-correct into an unnatural essay.
- Band scores should be realistic (use 0.5 increments: 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0).
- For Task 1: Check if the user successfully selected main features, compared trends, and avoided inserting subjective opinions.
- For Task 2: Check if the user stated a clear position, supported ideas with examples, and structured paragraphs correctly.
- The improved version should sound natural, not overly academic.`;
    return { contents: userText(prompt), generationConfig: jsonConfig(writingSchema) };
  },
};

const PART_DESCRIPTIONS: Record<string, string> = {
  part_1:
    'This is Speaking Part 1 (Everyday topics). The user should answer directly, giving reasons and examples briefly. The transcript represents their answer.',
  part_2:
    'This is Speaking Part 2 (Cue Card monologue). The user was given 1 minute to prepare and should speak continuously for 1 to 2 minutes. The transcript represents their complete monologue. Evaluate if they covered all bullet points in the prompt.',
  part_3:
    'This is Speaking Part 3 (Two-way discussion). The transcript contains answers to multiple discussion questions. Grade their ability to expand on abstract ideas, justify opinions, and use cohesive devices. This is graded jointly to measure overall Coherence and Cohesion.',
};

export const gradeIeltsSpeaking: OpSpec = {
  hourlyLimit: 15,
  models: FLASH_MODELS,
  timeoutMs: 90_000,
  kind: 'json',
  finalize: checkFeedback,
  build(payload) {
    const p = asObject(payload);
    const question = str(p, 'question', { max: 3000 });
    const transcript = str(p, 'transcript', { max: 12_000 });
    const part = oneOf(p, 'part', ['part_1', 'part_2', 'part_3'] as const, 'part_1');
    const targetBand = str(p, 'targetBand', { max: 20, optional: true }) || '6.0';
    const audio = p.audio ? inlineData(p.audio, 'audio', ['audio/']) : null;

    const prompt = `You are a certified, strict IELTS Speaking Examiner conducting a real face-to-face IELTS Speaking Test.
Evaluate the user's spoken answer/monologue transcript exactly according to the official IELTS Speaking Band Descriptors.
Do not claim this is an official IELTS score. Provide a realistic, strict estimated band score.

CRITICAL: Listen to the attached audio recording to evaluate the user's actual pronunciation, fluency, hesitation, and speech markers. Check the provided transcript (which the user might have edited for correctness) against their actual audio. Compare the speech in the audio with the transcript and identify the EXACT words that are mispronounced, omitted, or mumbled, and list them in the pronunciation notes. Do NOT make up pronunciation errors that do not exist in the audio.

Input Speaking Context:
- Speaking part: ${part}
- Part characteristics: ${PART_DESCRIPTIONS[part]}
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

    const parts: Part[] = audio ? [{ inlineData: audio }, { text: prompt }] : [{ text: prompt }];
    return { contents: [{ role: 'user', parts }], generationConfig: jsonConfig(speakingSchema) };
  },
};

export const transcribeAudio: OpSpec = {
  hourlyLimit: 30,
  models: FLASH_MODELS,
  timeoutMs: 60_000,
  kind: 'text',
  build(payload) {
    const p = asObject(payload);
    const audio = inlineData(p.audio, 'audio', ['audio/']);
    return {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: audio },
            {
              text: 'Please transcribe this audio recording accurately. The speaker is an English language learner (likely Vietnamese). Return ONLY the transcript text, nothing else. If the audio is unclear or empty, return "[No speech detected]".',
            },
          ],
        },
      ],
      generationConfig: {},
    };
  },
};

const MAX_HISTORY_MESSAGES = 20;
const IMAGE_PROMPT = 'Hãy phân tích hình ảnh/biểu đồ này và hướng dẫn tôi viết IELTS Writing Task 1 về nó.';
const AUDIO_PROMPT = 'Hãy nghe audio này, transcribe nội dung, và cho tôi feedback về Speaking (grammar, vocabulary, fluency).';

/** Mentor chat, streamed. Takes the recent history plus the new message. */
export const ieltsChat: OpSpec = {
  hourlyLimit: 60,
  models: FLASH_MODELS,
  timeoutMs: 60_000,
  kind: 'stream',
  build(payload) {
    const p = asObject(payload);
    const toParts = (o: Record<string, unknown>): Part[] => {
      const parts: Part[] = [];
      const text = str(o, 'text', { max: 12_000, optional: true });
      if (text) parts.push({ text });
      for (const att of list(o, 'attachments', 4, (v) => inlineData(v, 'attachment', ['image/', 'audio/']))) {
        parts.push({ inlineData: att });
      }
      return parts;
    };

    const history = list(p, 'history', 200, (v) => asObject(v, 'message')).slice(-MAX_HISTORY_MESSAGES);
    const contents: Content[] = [];
    for (const m of history) {
      const parts = toParts(m);
      if (parts.length) contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
    }

    const message = asObject(p.message, 'message');
    const newParts = toParts(message);
    const hasText = newParts.some((part) => 'text' in part);
    if (!hasText) {
      const first = newParts.find((part) => 'inlineData' in part) as { inlineData: { mimeType: string } } | undefined;
      if (!first) throw new BadRequest('message is empty');
      newParts.unshift({ text: first.inlineData.mimeType.startsWith('image/') ? IMAGE_PROMPT : AUDIO_PROMPT });
    }
    contents.push({ role: 'user', parts: newParts });

    return {
      contents,
      systemInstruction: { parts: [{ text: IELTS_MENTOR_SYSTEM_PROMPT }] },
      generationConfig: {},
    };
  },
};
