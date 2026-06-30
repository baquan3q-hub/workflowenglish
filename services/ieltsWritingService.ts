import { GoogleGenAI, Type, Schema } from '@google/genai';
import { IeltsAiFeedback, IeltsQuestion } from '../types';
import { writingTask2Questions } from '../data/ieltsWritingQuestions';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ─── Gemini Response Schema for Writing Feedback ──────────────────

const writingFeedbackSchema: Schema = {
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
  },
  required: ['estimatedBand', 'criterionScores', 'strengths', 'weaknesses', 'sentenceCorrections', 'improvedVersion', 'nextActions'],
};

// ─── Grade Writing Task ──────────────────────────────────────────

export async function gradeWritingTask(
  question: string,
  answer: string,
  essayType: string,
  targetBand: string,
  taskType: 'task_1' | 'task_2' = 'task_2'
): Promise<IeltsAiFeedback> {
  const isTask1 = taskType === 'task_1';
  const taskCriterionName = isTask1 ? 'Task Achievement' : 'Task Response';
  const taskCriterionNameVi = isTask1 ? 'Hoàn thành nhiệm vụ (Đúng đề, đủ thông tin biểu đồ)' : 'Trả lời yêu cầu đề bài (Lập luận, ý kiến cá nhân)';
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

  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      console.log(`[IELTS Writing] Grading with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: writingFeedbackSchema,
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
      console.warn(`[IELTS Writing] Model "${model}" failed (${status}):`, error?.message || error);
      if (status !== 503 && status !== '503' && status !== 429 && status !== '429') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[IELTS Writing] All models failed', lastError);
  throw lastError;
}

// ─── Get Writing Questions ──────────────────────────────────────────

export function getWritingQuestions(filters?: {
  taskOrPart?: string;
  essayType?: string;
  topic?: string;
  difficulty?: string;
}): IeltsQuestion[] {
  let questions = writingTask2Questions;

  if (filters?.taskOrPart) {
    questions = questions.filter(q => q.taskOrPart === filters.taskOrPart);
  }
  if (filters?.essayType) {
    questions = questions.filter(q => q.questionType === filters.essayType);
  }
  if (filters?.topic) {
    questions = questions.filter(q => q.topic.toLowerCase() === filters.topic!.toLowerCase());
  }
  if (filters?.difficulty) {
    questions = questions.filter(q => q.difficulty === filters.difficulty);
  }

  return questions;
}

export function getWritingQuestionById(id: string): IeltsQuestion | undefined {
  return writingTask2Questions.find(q => q.id === id);
}
