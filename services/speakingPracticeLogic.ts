import type { IeltsQuestion, IeltsSpeakingPart } from '../types';
import type { AudioSegment, ListeningVoice } from './listeningAudioService';
import {
  CUE_CARDS,
  PART1_PACKS,
  PART3_THEMES,
  type CueCard,
  type Part1Pack,
  type Part3Theme,
} from '../data/ielts/speakingTopics';
import { cueCardPrompt } from './speakingStudyLogic';

// ─── Live prompts while recording ────────────────────────────────────

/** Microphone RMS above which the learner is taken to be speaking. */
export const VOICE_RMS = 0.02;
export const SILENCE_NUDGE_SECONDS = 4;

export interface VoiceState {
  startedAt: number;
  lastVoiceAt: number | null;
}

export function nextVoiceState(prev: VoiceState, rms: number, now: number): VoiceState {
  return rms >= VOICE_RMS ? { ...prev, lastVoiceAt: now } : prev;
}

/** Whole seconds since the learner last made a sound (or since recording began). */
export function quietSeconds(state: VoiceState, now: number): number {
  return Math.max(0, Math.floor((now - (state.lastVoiceAt ?? state.startedAt)) / 1000));
}

/** Gentle push after a long silence, or null. */
export function silenceNudge(quiet: number, hasSpoken: boolean): string | null {
  if (quiet < SILENCE_NUDGE_SECONDS) return null;
  return hasSpoken
    ? 'Đừng dừng lâu. Dùng cụm câu giờ: "Let me think…", "What I mean is…", rồi nói tiếp.'
    : 'Bắt đầu bằng một câu mở: "Well, that\'s an interesting question…", rồi trả lời thẳng.';
}

export interface PartGuide {
  /** Recording stops by itself here. */
  maxSeconds: number;
  targetVi: string;
  tipVi: string;
}

export const PART_GUIDES: Record<IeltsSpeakingPart, PartGuide> = {
  part_1: {
    maxSeconds: 60,
    targetVi: '2–3 câu, khoảng 15–30 giây',
    tipVi: 'Trả lời thẳng, thêm một lý do, thêm một chi tiết hoặc ví dụ. Không cần mở bài.',
  },
  part_2: {
    maxSeconds: 120,
    targetVi: 'Nói liên tục 1,5–2 phút',
    tipVi: 'Đi lần lượt theo 4 gạch đầu dòng. Hết ý thì kể thêm cảm xúc hoặc so sánh với hiện tại. Giám khảo dừng bạn ở 2 phút.',
  },
  part_3: {
    maxSeconds: 90,
    targetVi: '3–5 câu, khoảng 30–60 giây',
    tipVi: 'Theo O.R.E.O.: nêu quan điểm, lý do, ví dụ, rồi kết lại. Nói về xã hội nói chung, không chỉ bản thân.',
  },
};

/** What to show at this point of an answer, or null. */
export function answerNudge(part: IeltsSpeakingPart, seconds: number): string | null {
  if (part === 'part_1') return seconds >= 40 ? 'Đủ ý rồi. Part 1 chỉ cần 2–3 câu, kết câu và dừng.' : null;
  if (part === 'part_2') {
    if (seconds >= 105) return 'Sắp hết 2 phút. Nói một câu kết.';
    if (seconds >= 60) return 'Tiếp tục: thêm cảm xúc, so sánh hiện tại.';
    return null;
  }
  return seconds >= 75 ? 'Kết ý bằng một câu tóm lại.' : null;
}

/** The "You should say" bullets of a cue card prompt, without the dash. */
export function cueBullets(prompt: string): string[] {
  return prompt
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-•*]\s*/.test(l))
    .map((l) => l.replace(/^[-•*]\s*/, '').replace(/\.$/, ''))
    .filter(Boolean);
}

/** The card's first line: "Describe…". */
export function cueTitle(prompt: string): string {
  return prompt.split('\n')[0].trim();
}

/** The questions answered one by one in a practice session. */
export function practiceQuestions(q: IeltsQuestion): string[] {
  if (q.taskOrPart === 'part_3' && q.subQuestions?.length) return q.subQuestions;
  return [q.prompt];
}

/** Answers of a multi-question session, as the grader reads them. */
export function joinAnswers(answers: { question: string; transcript: string }[]): string {
  if (answers.length === 1) return answers[0].transcript;
  return answers.map((a, i) => `Question ${i + 1}: ${a.question}\nAnswer: ${a.transcript}`).join('\n\n');
}

// ─── Mock test ───────────────────────────────────────────────────────

export const EXAMINER_VOICE: ListeningVoice = 'Kore';

export type MockPart = 1 | 2 | 3;

export interface MockItem {
  id: string;
  part: MockPart;
  /** The question as shown on screen. */
  question: string;
  /** What the examiner says, including the lead-in. */
  spoken: string;
  maxSeconds: number;
  /** Seconds a typical answer takes, for the time estimate. */
  expectSeconds: number;
}

export interface MockScript {
  packs: Part1Pack[];
  card: CueCard;
  theme: Part3Theme;
  items: MockItem[];
  /** Spoken after the minute of preparation. */
  part2Start: string;
  closing: string;
}

/** Part 1 starts with one of these, as in the real test. */
const OPENING_PACKS = ['p1_hometown', 'p1_work_study', 'p1_home'];

const SPOKEN_TOPIC: Record<string, string> = {
  p1_hometown: 'your hometown',
  p1_work_study: 'what you do',
  p1_home: 'your home',
  p1_free_time: 'your free time',
  p1_food: 'food',
  p1_technology: 'technology',
  p1_weather: 'the weather',
  p1_travel: 'travel',
};

/** The Part 3 discussion that follows each cue card. */
export const CARD_THEME: Record<string, string> = {
  cc_person_influence: 'p3_education',
  cc_person_admire: 'p3_work',
  cc_place_relax: 'p3_environment',
  cc_place_visited: 'p3_cities',
  cc_object_useful: 'p3_technology',
  cc_object_gift: 'p3_culture',
  cc_event_celebration: 'p3_culture',
  cc_event_learned: 'p3_education',
  cc_experience_challenge: 'p3_work',
  cc_experience_happy: 'p3_cities',
};

const P1_PER_TOPIC = 3;

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

function sample<T>(list: readonly T[], n: number, rand: () => number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

/**
 * A full test: Part 1 on three topics (the first about home, work or
 * hometown), one cue card, and four Part 3 questions on a related theme.
 */
export function buildMockScript(rand: () => number = Math.random): MockScript {
  const opening = pick(PART1_PACKS.filter((p) => OPENING_PACKS.includes(p.id)), rand);
  const others = sample(PART1_PACKS.filter((p) => !OPENING_PACKS.includes(p.id)), 2, rand);
  const packs = [opening, ...others];
  const card = pick(CUE_CARDS, rand);
  const theme = PART3_THEMES.find((t) => t.id === CARD_THEME[card.id]) ?? pick(PART3_THEMES, rand);

  const items: MockItem[] = [];
  packs.forEach((pack, pi) => {
    pack.questions.slice(0, P1_PER_TOPIC).forEach((question, qi) => {
      let lead = '';
      if (qi === 0) {
        const topic = SPOKEN_TOPIC[pack.id] ?? pack.topic.toLowerCase();
        lead =
          pi === 0
            ? `Good morning. In this first part, I'd like to ask you some questions about yourself. Let's talk about ${topic}. `
            : `Now let's move on to ${topic}. `;
      }
      items.push({ id: `p1_${pack.id}_${qi}`, part: 1, question, spoken: lead + question, maxSeconds: 45, expectSeconds: 30 });
    });
  });

  items.push({
    id: `p2_${card.id}`,
    part: 2,
    question: cueCardPrompt(card),
    spoken: `Thank you. Now, in this second part, I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic. ${card.title}`,
    maxSeconds: 120,
    expectSeconds: 60 + 115 + 25,
  });

  theme.questions.forEach((question, qi) => {
    const lead =
      qi === 0
        ? `Thank you. We've been talking about ${card.title.replace(/^Describe\s+/i, '').replace(/\.$/, '')}. Now I'd like to discuss with you some more general questions related to this. `
        : '';
    items.push({ id: `p3_${theme.id}_${qi}`, part: 3, question, spoken: lead + question, maxSeconds: 90, expectSeconds: 55 });
  });

  return {
    packs,
    card,
    theme,
    items,
    part2Start: 'All right? Remember, you have one to two minutes for this. Please start speaking now.',
    closing: 'Thank you. That is the end of the speaking test.',
  };
}

/** Rough length of the test with typical answers and the examiner's turns. */
export function estimateMockMinutes(script: MockScript): number {
  const answers = script.items.reduce((s, it) => s + it.expectSeconds, 0);
  const examiner = script.items.reduce((s, it) => s + it.spoken.split(/\s+/).length / 2.5, 0);
  return Math.round(((answers + examiner) / 60) * 10) / 10;
}

export function mockClip(id: string, text: string): AudioSegment {
  return { id: `mock:${id}`, text, style: 'uk', voice: EXAMINER_VOICE };
}

export interface MockAnswer {
  itemId: string;
  part: MockPart;
  question: string;
  transcript: string;
}

/** Every answer grouped by part, as the grader reads it. */
export function mockTranscript(answers: MockAnswer[]): string {
  return ([1, 2, 3] as MockPart[])
    .map((part) => {
      const inPart = answers.filter((a) => a.part === part);
      if (!inPart.length) return '';
      const body = inPart
        .map((a) => (part === 2 ? `Cue card: ${a.question}\nMonologue: ${a.transcript}` : `Q: ${a.question}\nA: ${a.transcript}`))
        .join('\n');
      return `Part ${part}\n${body}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

/** The question record a mock test is saved and shown under. */
export function mockQuestion(script: MockScript): IeltsQuestion {
  return {
    id: `mock_${script.card.id}`,
    skill: 'speaking',
    taskOrPart: 'part_2',
    questionType: 'mock_test',
    topic: [...script.packs.map((p) => p.topic), script.theme.topic].join(', '),
    difficulty: 'medium',
    prompt: `Thi thử Speaking: Part 1 (${script.packs.map((p) => p.topic).join(', ')}), Part 2 (${script.card.title}), Part 3 (${script.theme.topic})`,
    frameworkId: 'fw_prep_story',
    targetBand: '6.5',
  };
}
