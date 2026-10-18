import { describe, it, expect } from 'vitest';
import { CUE_CARDS, PART3_THEMES } from '../../data/ielts/speakingTopics';
import { cueCardPrompt } from '../speakingStudyLogic';
import { LISTENING_TEXT_MAX } from '../../supabase/functions/ai-proxy/ops/listening.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { BadRequest } from '../../supabase/functions/ai-proxy/lib.ts';
import { TRANSCRIBE_PROMPT } from '../../supabase/functions/ai-proxy/ops/ielts.ts';
import {
  answerNudge,
  buildMockScript,
  CARD_THEME,
  cueBullets,
  cueTitle,
  EXAMINER_VOICE,
  estimateMockMinutes,
  joinAnswers,
  mockClip,
  mockQuestion,
  mockTranscript,
  nextVoiceState,
  PART_GUIDES,
  practiceQuestions,
  quietSeconds,
  silenceNudge,
  VOICE_RMS,
  type VoiceState,
} from '../speakingPracticeLogic';
import type { IeltsQuestion } from '../../types';

/** Small seeded generator so every script shape gets checked repeatably. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('silence tracking', () => {
  it('counts quiet seconds since the last sound', () => {
    let s: VoiceState = { startedAt: 0, lastVoiceAt: null };
    s = nextVoiceState(s, VOICE_RMS / 2, 3000);
    expect(quietSeconds(s, 3000)).toBe(3);
    s = nextVoiceState(s, VOICE_RMS, 3500);
    expect(s.lastVoiceAt).toBe(3500);
    expect(quietSeconds(s, 7400)).toBe(3);
    expect(quietSeconds(s, 7500)).toBe(4);
  });

  it('nudges after 4 seconds, differently before and after speaking', () => {
    expect(silenceNudge(3, false)).toBeNull();
    expect(silenceNudge(4, false)).toContain('Well');
    expect(silenceNudge(6, true)).toContain('Let me think');
  });
});

describe('practice aids', () => {
  it('nudges at the right moments of each part', () => {
    expect(answerNudge('part_1', 39)).toBeNull();
    expect(answerNudge('part_1', 40)).toContain('2–3 câu');
    expect(answerNudge('part_2', 59)).toBeNull();
    expect(answerNudge('part_2', 60)).toBe('Tiếp tục: thêm cảm xúc, so sánh hiện tại.');
    expect(answerNudge('part_2', 105)).toContain('Sắp hết 2 phút');
    expect(answerNudge('part_3', 74)).toBeNull();
    expect(answerNudge('part_3', 75)).not.toBeNull();
  });

  it('keeps nudges inside each part limit', () => {
    expect(answerNudge('part_1', PART_GUIDES.part_1.maxSeconds - 1)).not.toBeNull();
    expect(PART_GUIDES.part_2.maxSeconds).toBe(120);
    expect(answerNudge('part_3', PART_GUIDES.part_3.maxSeconds - 1)).not.toBeNull();
  });

  it('reads the bullets and title of every cue card', () => {
    for (const card of CUE_CARDS) {
      const prompt = cueCardPrompt(card);
      expect(cueTitle(prompt)).toBe(card.title);
      expect(cueBullets(prompt)).toEqual(card.bullets.map((b) => b.replace(/\.$/, '')));
    }
    expect(cueBullets('Describe a park.\n• where it is\n* who you go with.\nplain line')).toEqual(['where it is', 'who you go with']);
  });

  it('splits Part 3 into its questions', () => {
    const base = { id: 'x', skill: 'speaking', questionType: 'q', topic: 't', difficulty: 'medium', frameworkId: '', targetBand: '6.5' } as const;
    const p3 = { ...base, taskOrPart: 'part_3', prompt: 'Main', subQuestions: ['A?', 'B?'] } as IeltsQuestion;
    expect(practiceQuestions(p3)).toEqual(['A?', 'B?']);
    expect(practiceQuestions({ ...p3, subQuestions: [] })).toEqual(['Main']);
    expect(practiceQuestions({ ...p3, taskOrPart: 'part_1' })).toEqual(['Main']);
  });

  it('joins answers for the grader', () => {
    expect(joinAnswers([{ question: 'Q', transcript: 'Only one.' }])).toBe('Only one.');
    expect(joinAnswers([{ question: 'A?', transcript: 'Yes.' }, { question: 'B?', transcript: 'No.' }])).toBe(
      'Question 1: A?\nAnswer: Yes.\n\nQuestion 2: B?\nAnswer: No.',
    );
  });
});

describe('mock test script', () => {
  it('links every cue card to an existing Part 3 theme', () => {
    const themeIds = new Set(PART3_THEMES.map((t) => t.id));
    for (const card of CUE_CARDS) expect(themeIds.has(CARD_THEME[card.id]), card.id).toBe(true);
  });

  it('builds a realistic 11–14 minute test for any draw', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const script = buildMockScript(seeded(seed));
      const parts = script.items.map((i) => i.part);
      expect(parts.filter((p) => p === 1)).toHaveLength(9);
      expect(parts.filter((p) => p === 2)).toHaveLength(1);
      expect(parts.filter((p) => p === 3).length).toBeGreaterThanOrEqual(3);
      // Parts in order.
      expect([...parts].sort()).toEqual(parts);

      expect(['p1_hometown', 'p1_work_study', 'p1_home']).toContain(script.packs[0].id);
      expect(new Set(script.packs.map((p) => p.id)).size).toBe(3);
      expect(script.theme.id).toBe(CARD_THEME[script.card.id]);
      expect(new Set(script.items.map((i) => i.id)).size).toBe(script.items.length);

      const minutes = estimateMockMinutes(script);
      expect(minutes).toBeGreaterThanOrEqual(11);
      expect(minutes).toBeLessThanOrEqual(14);

      for (const it of script.items) {
        expect(it.spoken.endsWith(it.part === 2 ? script.card.title : it.question)).toBe(true);
        expect(it.spoken.length).toBeLessThanOrEqual(LISTENING_TEXT_MAX);
      }
      expect(script.items[0].spoken).toMatch(/^Good morning\. In this first part/);
      expect(script.items[3].spoken).toMatch(/^Now let's move on to /);
      expect(script.items.find((i) => i.part === 3)!.spoken).toContain("We've been talking about");
    }
  });

  it('gives the examiner one voice and stable clip ids', () => {
    const clip = mockClip('p1_x_0', 'Hello.');
    expect(clip).toEqual({ id: 'mock:p1_x_0', text: 'Hello.', style: 'uk', voice: EXAMINER_VOICE });
  });

  it('writes the transcript grouped by part', () => {
    const text = mockTranscript([
      { itemId: 'a', part: 1, question: 'Where are you from?', transcript: 'Hanoi.' },
      { itemId: 'c', part: 3, question: 'Why?', transcript: 'Because.' },
      { itemId: 'b', part: 2, question: 'Describe a park.\nYou should say:\n- where', transcript: 'The park is…' },
      { itemId: 'a2', part: 1, question: 'Do you like it?', transcript: 'Yes.' },
    ]);
    expect(text).toBe(
      'Part 1\nQ: Where are you from?\nA: Hanoi.\nQ: Do you like it?\nA: Yes.\n\n' +
        'Part 2\nCue card: Describe a park.\nYou should say:\n- where\nMonologue: The park is…\n\n' +
        'Part 3\nQ: Why?\nA: Because.',
    );
    expect(mockTranscript([{ itemId: 'a', part: 1, question: 'Q', transcript: 'A' }])).toBe('Part 1\nQ: Q\nA: A');
  });

  it('saves under a mock question that names all three parts', () => {
    const script = buildMockScript(seeded(7));
    const q = mockQuestion(script);
    expect(q.questionType).toBe('mock_test');
    expect(q.skill).toBe('speaking');
    expect(q.prompt).toContain(script.card.title);
    expect(q.prompt).toContain(script.theme.topic);
    for (const p of script.packs) expect(q.prompt).toContain(p.topic);
  });
});

describe('speaking ops', () => {
  const op = OPS.gradeIeltsSpeaking;
  type Req = { contents: { parts: ({ text: string } | { inlineData: unknown })[] }[]; generationConfig: Record<string, unknown> };
  const promptOf = (req: Req) => (req.contents[0].parts.at(-1) as { text: string }).text;
  const schemaOf = (req: Req) => req.generationConfig.responseSchema as { properties: Record<string, unknown>; required?: string[] };

  it('asks for part bands and three improvements only in a mock test', () => {
    const mock = op.build({ question: 'Mock', transcript: 'Part 1\nQ: A\nA: B', part: 'mock', measured: 'Measured on the device: 120 wpm.' }) as Req;
    expect(schemaOf(mock).properties.partBands).toBeTruthy();
    expect(schemaOf(mock).properties.topImprovements).toBeTruthy();
    expect(promptOf(mock)).toContain('Part 2 monologue only');
    expect(promptOf(mock)).toContain('Measured on the device: 120 wpm.');

    const single = op.build({ question: 'Q', transcript: 'Answer', part: 'part_1' }) as Req;
    expect(schemaOf(single).properties.partBands).toBeUndefined();
    expect(promptOf(single)).not.toContain('Fluency measured from the recording');
  });

  it('allows a longer transcript for the whole mock test', () => {
    const long = 'word '.repeat(3000);
    expect(() => op.build({ question: 'Q', transcript: long, part: 'part_1' })).toThrow(BadRequest);
    expect(() => op.build({ question: 'Q', transcript: long, part: 'mock' })).not.toThrow();
    expect(() => op.build({ question: 'Q', transcript: 'x', part: 'part_1', measured: 'x'.repeat(601) })).toThrow(BadRequest);
  });

  it('rejects a mock report without all three parts', () => {
    const base = { estimatedBand: 6, criterionScores: [] };
    expect(op.finalize!(base)).toBe(base);
    const ok = { ...base, partBands: [1, 2, 3].map((part) => ({ part, band: 6, comment: '' })) };
    expect(op.finalize!(ok)).toBe(ok);
    expect(() => op.finalize!({ ...base, partBands: ok.partBands.slice(0, 2) })).toThrow();
    expect(() => op.finalize!({ criterionScores: [] })).toThrow();
  });

  it('transcribes verbatim, keeping fillers', () => {
    expect(TRANSCRIBE_PROMPT).toMatch(/um, uh/);
    expect(TRANSCRIBE_PROMPT).toContain('Do not fix grammar');
    const req = OPS.transcribeAudio.build({ audio: { mimeType: 'audio/webm', data: 'AAAA' } }) as Req;
    expect((req.contents[0].parts[1] as { text: string }).text).toBe(TRANSCRIBE_PROMPT);
  });
});
