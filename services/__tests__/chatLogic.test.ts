import { describe, expect, it } from 'vitest';
import {
  conversationPreview,
  EMPTY_LEARNER,
  formatLearnerContext,
  groupConversations,
  hasLearnerData,
  historyForAi,
  learnerFacts,
  messagesForStorage,
  modelLabel,
  parseQuiz,
  pendingBlock,
  scaffoldQuizToQuiz,
  progressPercent,
  quizRequest,
  quizSources,
  requestedQuizSize,
  routeQuestion,
  searchConversations,
  suggestionsFor,
  titleFrom,
  upsertConversation,
  type ChatMessage,
  type LearnerData,
  type StoredConversation,
} from '../chatLogic';
import { generateBody, LIGHT_TEXT_MODELS, TEXT_MODELS, thinkingConfig } from '../../supabase/functions/ai-proxy/models.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';

const msg = (role: 'user' | 'assistant', content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: Math.random().toString(36),
  role,
  content,
  timestamp: 0,
  ...extra,
});

const learner: LearnerData = {
  ...EMPTY_LEARNER,
  name: 'Lan',
  level: 'B2',
  streak: 4,
  longestStreak: 9,
  dailyGoal: 10,
  reviewedToday: 3,
  dueCount: 12,
  words: { total: 120, mastered: 40, learning: 60, lapsed: 5 },
  weakWords: [
    { word: 'resilient', meaning: 'kiên cường', misses: 4 },
    { word: 'mitigate', misses: 3 },
  ],
  dueWords: ['abundant', 'scarce', 'thrive'],
  skills: [
    { skill: 'listening', attempts: 0, current: null },
    { skill: 'writing', attempts: 5, current: 5.5 },
    { skill: 'speaking', attempts: 2, current: 6 },
  ],
  weakest: { skill: 'writing', nameVi: 'Mạch lạc & liên kết', current: 5 },
  topErrors: [{ label: 'Mạo từ', total: 7 }],
};

describe('routeQuestion', () => {
  it('sends short questions to the quick model', () => {
    expect(routeQuestion('"Abundant" nghĩa là gì?', 0).mode).toBe('quick');
  });

  it('thinks first for essays, images and plans', () => {
    expect(routeQuestion('word '.repeat(200), 0).mode).toBe('deep');
    expect(routeQuestion('', 1).mode).toBe('deep');
    expect(routeQuestion('Chấm giúp mình đoạn này', 0).mode).toBe('deep');
    expect(routeQuestion('Lộ trình lên 6.5?', 0).mode).toBe('deep');
  });

  it('keeps quizzes on the standard model and respects a manual choice', () => {
    expect(routeQuestion('Tạo quiz 5 câu về Environment', 0).mode).toBe('standard');
    expect(routeQuestion('Chấm bài này', 1, 'quick')).toEqual({ mode: 'quick', reason: expect.any(String) });
  });

  it('uses the standard model for multi-line questions', () => {
    expect(routeQuestion('Câu 1: abc\nCâu 2: def', 0).mode).toBe('standard');
  });
});

describe('labels and progress', () => {
  it('names models for people', () => {
    expect(modelLabel('gemini-3.5-flash-lite')).toBe('Gemini 3.5 Flash-Lite');
    expect(modelLabel('gemini-3.6-flash')).toBe('Gemini 3.6 Flash');
    expect(modelLabel(null)).toBe('');
  });

  it('moves forward and never claims 100 before the end', () => {
    const a = progressPercent('thinking', 'standard', 0, 0);
    const b = progressPercent('thinking', 'standard', 10_000, 0);
    const c = progressPercent('writing', 'standard', 0, 100);
    const d = progressPercent('writing', 'standard', 0, 100_000);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThanOrEqual(45);
    expect(c).toBeGreaterThan(b);
    expect(d).toBeLessThanOrEqual(95);
    expect(progressPercent('writing', 'standard', 0, 0, { done: 5, total: 5 })).toBe(95);
  });
});

describe('learner snapshot', () => {
  it('summarises the data the mentor needs', () => {
    const text = formatLearnerContext(learner);
    expect(text).toContain('Tên: Lan');
    expect(text).toContain('resilient (kiên cường) – sai 4 lần');
    expect(text).toContain('Writing 5.5 (5 bài)');
    expect(text).toContain('Listening chưa luyện');
    expect(text).toContain('Mạch lạc & liên kết 5');
    expect(text).toContain('Mạo từ (7)');
    expect(text.length).toBeLessThan(4000);
  });

  it('knows when there is nothing to send', () => {
    expect(hasLearnerData(EMPTY_LEARNER)).toBe(false);
    expect(hasLearnerData(null)).toBe(false);
    expect(hasLearnerData(learner)).toBe(true);
  });

  it('shows at most four facts', () => {
    const facts = learnerFacts(learner);
    expect(facts.length).toBeLessThanOrEqual(4);
    expect(facts.map((f) => f.label)).toContain('Band Speaking');
  });

  it('suggests next steps from the data', () => {
    const s = suggestionsFor(learner);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(s[0]).toMatchObject({ id: 'quiz-weak', quiz: 'weak' });
    expect(s.map((x) => x.id)).toContain('due');
    expect(suggestionsFor(null).map((x) => x.id)).toEqual(['start']);
  });
});

describe('quick quizzes', () => {
  it('offers sources the learner has data for', () => {
    expect(quizSources(learner, true)).toEqual(['weak', 'due', 'topic', 'conversation']);
    expect(quizSources(null, false)).toEqual(['topic']);
  });

  it('builds a request with the learner words and the format', () => {
    const r = quizRequest('weak', 5, learner);
    expect(r.display).toBe('Tạo quiz 5 câu từ các từ tôi hay sai');
    expect(r.prompt).toContain('resilient, mitigate');
    expect(r.prompt).toContain('```quiz');
    expect(requestedQuizSize(r.prompt)).toBe(5);
    expect(quizRequest('topic', 50, null).prompt).toContain('10 câu');
  });

  const block = (json: string) => `Đây là quiz:\n\`\`\`quiz\n${json}\n\`\`\`\nChúc may mắn!`;
  const good = JSON.stringify({
    title: 'Từ hay sai',
    questions: [
      { q: 'Resilient means…', options: ['weak', 'tough', 'slow', 'old'], answer: 1, explain: 'kiên cường' },
      { q: 'Broken', options: ['a'], answer: 0, explain: '' },
      { q: 'By text', options: ['x', 'y'], answer: 'y', explain: '' },
    ],
  });

  it('parses a finished quiz and drops broken questions', () => {
    const p = parseQuiz(block(good))!;
    expect(p.pending).toBe(false);
    expect(p.before).toBe('Đây là quiz:');
    expect(p.after).toBe('Chúc may mắn!');
    expect(p.quiz?.title).toBe('Từ hay sai');
    expect(p.quiz?.questions).toHaveLength(2);
    expect(p.quiz?.questions[1].answer).toBe(1);
  });

  it('counts questions while the quiz is still streaming', () => {
    const p = parseQuiz('```quiz\n{"title":"x","questions":[{"q":"a","options":[]},{"q":"b"')!;
    expect(p.pending).toBe(true);
    expect(p.written).toBe(2);
  });

  it('ignores ordinary code and reports bad JSON', () => {
    expect(parseQuiz('```json\n{"a":1}\n```')).toBeNull();
    expect(parseQuiz('no quiz here')).toBeNull();
    expect(parseQuiz('```quiz\n{oops}\n```')!.quiz).toBeNull();
  });
});

describe('history for the AI', () => {
  it('leaves out failed replies and replaces files with a note', () => {
    const wire = historyForAi([
      msg('user', 'Chấm biểu đồ này', { attachments: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }] }),
      msg('assistant', 'AI đang bận', { error: true }),
      msg('assistant', 'Đây là nhận xét'),
      msg('assistant', '', { isStreaming: true }),
    ]);
    expect(wire).toHaveLength(2);
    expect(wire[0].text).toContain('[Đã gửi kèm 1 tệp: ảnh]');
    expect(wire[0]).not.toHaveProperty('attachments');
  });
});

describe('saved conversations', () => {
  const conv = (id: string, updatedAt: number, title = id): StoredConversation => ({ id, title, createdAt: updatedAt, updatedAt, messages: [msg('user', `hỏi về ${title}`)] });

  it('titles a chat by its first question', () => {
    expect(titleFrom([msg('user', 'Tạo quiz', { display: 'Quiz từ hay sai' })])).toBe('Quiz từ hay sai');
    expect(titleFrom([msg('user', 'x'.repeat(100))])).toHaveLength(58);
    expect(titleFrom([])).toBe('Cuộc trò chuyện mới');
  });

  it('drops file data and half-written replies before saving', () => {
    const saved = messagesForStorage([
      msg('user', 'a', { attachments: [{ type: 'image', data: 'BIG', mimeType: 'image/png', fileName: 'c.png' }] }),
      msg('assistant', '', { isStreaming: true }),
    ]);
    expect(saved).toHaveLength(1);
    expect(saved[0].attachments?.[0]).toMatchObject({ data: '', fileName: 'c.png' });
  });

  it('keeps the newest first and caps the list', () => {
    let list: StoredConversation[] = [];
    for (let i = 0; i < 5; i++) list = upsertConversation(list, conv(`c${i}`, i), 3);
    expect(list.map((c) => c.id)).toEqual(['c4', 'c3', 'c2']);
    list = upsertConversation(list, conv('c2', 10));
    expect(list[0].id).toBe('c2');
    expect(list).toHaveLength(3);
  });

  it('groups by day and searches without accents', () => {
    const now = new Date(2026, 9, 24, 12);
    const day = 86_400_000;
    const groups = groupConversations([conv('a', now.getTime()), conv('b', now.getTime() - day), conv('c', now.getTime() - 30 * day)], now);
    expect(groups.map((g) => g.label)).toEqual(['Hôm nay', 'Hôm qua', 'Cũ hơn']);
    const found = searchConversations([conv('a', 1, 'Lộ trình Writing'), conv('b', 2, 'Speaking')], 'lo trinh');
    expect(found.map((c) => c.id)).toEqual(['a']);
  });
});

describe('ieltsChat op', () => {
  it('uses the light model for quick questions', () => {
    expect(OPS.ieltsChat.modelsFor!({ mode: 'quick' })).toBe(LIGHT_TEXT_MODELS);
    expect(OPS.ieltsChat.modelsFor!({ mode: 'deep' })).toBe(TEXT_MODELS);
    expect(OPS.ieltsChat.modelsFor!({})).toBe(TEXT_MODELS);
  });

  it('lets deep questions think and caps quick answers', () => {
    const deep = OPS.ieltsChat.build({ history: [], message: { text: 'hi' }, mode: 'deep' });
    expect(deep.thinking).toBe('low');
    expect(generateBody('gemini-3.6-flash', deep).generationConfig).toMatchObject({ thinkingConfig: { thinkingLevel: 'low' } });
    expect(generateBody('gemini-2.5-flash', deep).generationConfig).toMatchObject({ thinkingConfig: { thinkingBudget: 1024 } });
    expect(generateBody('gemini-3.6-flash', deep)).not.toHaveProperty('thinking');
    const quick = OPS.ieltsChat.build({ history: [], message: { text: 'hi' }, mode: 'quick' });
    expect(quick.generationConfig.maxOutputTokens).toBe(1024);
    expect(thinkingConfig('gemini-3.6-flash')).toEqual({ thinkingLevel: 'minimal' });
  });

  it('adds the learner data as marked reference data, plus quiz rules', () => {
    const req = OPS.ieltsChat.build({ history: [], message: { text: 'hi' }, context: 'Từ hay sai: resilient' });
    const system = req.systemInstruction!.parts[0].text;
    expect(system).toContain('<learner_data>\nTừ hay sai: resilient\n</learner_data>');
    expect(system).toContain('```quiz');
    const plain = OPS.ieltsChat.build({ history: [], message: { text: 'hi' } });
    expect(plain.systemInstruction!.parts[0].text).not.toContain('<learner_data>');
    expect(() => OPS.ieltsChat.build({ history: [], message: { text: 'hi' }, context: 'x'.repeat(5000) })).toThrow();
  });

  it('starts with the learner and merges turns in a row', () => {
    const req = OPS.ieltsChat.build({
      history: [
        { role: 'assistant', text: 'Xin chào' },
        { role: 'user', text: 'a' },
        { role: 'user', text: 'b' },
      ],
      message: { text: 'c' },
    });
    expect(req.contents).toHaveLength(1);
    expect(req.contents[0].role).toBe('user');
    expect(req.contents[0].parts).toHaveLength(3);
  });
});

describe('structured replies', () => {
  it('reads older scaffold quiz blocks', () => {
    const quiz = scaffoldQuizToQuiz([
      {
        question: 'Pick one',
        scaffoldHint: 'Think about tone',
        options: [
          { id: 'a', text: 'x', isCorrect: false },
          { id: 'b', text: 'y', isCorrect: true },
        ],
        explanation: 'because',
      },
      { question: 'No answer', options: [{ text: 'x' }, { text: 'y' }] },
    ]);
    expect(quiz?.questions).toHaveLength(1);
    expect(quiz?.questions[0]).toMatchObject({ answer: 1, hint: 'Think about tone', explain: 'because' });
  });

  it('spots a card block that is still being written', () => {
    expect(pendingBlock('Intro\n```json:scaffold_sentences\n[{"original":"a"},{"original":"b"')).toEqual({ kind: 'sentences', written: 2 });
    expect(pendingBlock('```json:scaffold_vocab\n[{"word":"x"}]\n```')).toBeNull();
    expect(pendingBlock('plain text')).toBeNull();
  });

  it('does not take scaffold blocks for a quiz', () => {
    expect(parseQuiz('```json:scaffold_vocab\n[{"word":"x"}]\n```')).toBeNull();
  });
});

describe('history preview', () => {
  const conv = (content: string): StoredConversation => ({
    id: 'c',
    title: 't',
    createdAt: 0,
    updatedAt: 0,
    messages: [{ id: 'a', role: 'assistant', content, timestamp: 0 }],
  });
  it('summarises card replies instead of showing JSON', () => {
    expect(conversationPreview(conv('```json:scaffold_vocab\n[{"word":"a"},{"word":"b"}]\n```'))).toBe('⭐ 2 từ vựng');
    expect(conversationPreview(conv('Xem nè:\n```json:scaffold_sentences\n[{"original":"a"}]\n```'))).toBe('🔍 Mổ xẻ 1 câu');
    expect(conversationPreview(conv('**Hello** there'))).toBe('Hello there');
  });
});
