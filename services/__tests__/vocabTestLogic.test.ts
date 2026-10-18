import { describe, it, expect } from 'vitest';
import { MasteryLevel, type WordMasteryRecord } from '../../types';
import {
  blankWordInSentence,
  buildWordToMeaningQuestion,
  buildMeaningToWordQuestion,
  buildFillBlankQuestion,
  buildListeningQuestion,
  generateVocabTestQuestions,
  getPerformanceRating,
  summarizeVocabTest,
} from '../vocabTestLogic';

const mockWords: WordMasteryRecord[] = [
  {
    id: '1',
    user_id: 'user1',
    word: 'resilient',
    mastery_level: MasteryLevel.REVIEWING,
    easiness_factor: 2.5,
    interval_days: 10,
    repetition_count: 4,
    next_review_date: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    correct_count: 4,
    incorrect_count: 0,
    incorrect_contexts: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ipa: '/rɪˈzɪl.jənt/',
    meaning_vi: 'kiên cường, nhanh phục hồi',
    example_sentence: 'She is resilient and never gives up.',
    example_sentence_vi: 'Cô ấy kiên cường và không bao giờ bỏ cuộc.',
  },
  {
    id: '2',
    user_id: 'user1',
    word: 'persevere',
    mastery_level: MasteryLevel.MASTERED,
    easiness_factor: 2.6,
    interval_days: 25,
    repetition_count: 6,
    next_review_date: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    correct_count: 6,
    incorrect_count: 0,
    incorrect_contexts: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ipa: '/ˌpɜː.sɪˈvɪər/',
    meaning_vi: 'kiên trì, bền chí',
    example_sentence: 'We must persevere despite hardships.',
    example_sentence_vi: 'Chúng ta phải kiên trì dù có khó khăn.',
  },
  {
    id: '3',
    user_id: 'user1',
    word: 'ubiquitous',
    mastery_level: MasteryLevel.MASTERED,
    easiness_factor: 2.7,
    interval_days: 30,
    repetition_count: 7,
    next_review_date: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    correct_count: 7,
    incorrect_count: 0,
    incorrect_contexts: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ipa: '/juːˈbɪk.wɪ.təs/',
    meaning_vi: 'phổ biến, có mặt khắp nơi',
    example_sentence: 'Smartphones are ubiquitous today.',
    example_sentence_vi: 'Điện thoại thông minh ngày nay có mặt khắp nơi.',
  },
  {
    id: '4',
    user_id: 'user1',
    word: 'innovative',
    mastery_level: MasteryLevel.LEARNING,
    easiness_factor: 2.2,
    interval_days: 2,
    repetition_count: 1,
    next_review_date: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    correct_count: 1,
    incorrect_count: 0,
    incorrect_contexts: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ipa: '/ˈɪn.ə.və.tɪv/',
    meaning_vi: 'sáng tạo, đổi mới',
    example_sentence: 'This is an innovative product.',
    example_sentence_vi: 'Đây là một sản phẩm sáng tạo.',
  },
];

describe('blankWordInSentence', () => {
  it('blanks exact and inflected word forms', () => {
    expect(blankWordInSentence('She is resilient and strong.', 'resilient')).toBe('She is _____ and strong.');
    expect(blankWordInSentence('We persevered until the end.', 'persevere')).toBe('We _____ until the end.');
  });

  it('returns null if sentence is missing or word is not found', () => {
    expect(blankWordInSentence(null, 'test')).toBeNull();
    expect(blankWordInSentence('Hello world', 'galaxy')).toBeNull();
  });
});

describe('Question Builders', () => {
  it('buildWordToMeaningQuestion creates 4 options with 1 correct', () => {
    const q = buildWordToMeaningQuestion(mockWords[0], mockWords);
    expect(q).not.toBeNull();
    expect(q?.type).toBe('word_to_meaning');
    expect(q?.prompt).toBe('resilient');
    expect(q?.options).toHaveLength(4);
    expect(q?.options).toContain(q?.correctAnswer);
    expect(q?.correctAnswer).toBe('kiên cường, nhanh phục hồi');
  });

  it('buildMeaningToWordQuestion creates 4 options with 1 correct', () => {
    const q = buildMeaningToWordQuestion(mockWords[0], mockWords);
    expect(q).not.toBeNull();
    expect(q?.type).toBe('meaning_to_word');
    expect(q?.prompt).toBe('kiên cường, nhanh phục hồi');
    expect(q?.options).toHaveLength(4);
    expect(q?.options).toContain('resilient');
    expect(q?.correctAnswer).toBe('resilient');
  });

  it('buildFillBlankQuestion creates a sentence prompt with blank', () => {
    const q = buildFillBlankQuestion(mockWords[0], mockWords);
    expect(q).not.toBeNull();
    expect(q?.type).toBe('fill_blank');
    expect(q?.prompt).toContain('_____');
    expect(q?.correctAnswer).toBe('resilient');
  });

  it('buildListeningQuestion provides audio cue', () => {
    const q = buildListeningQuestion(mockWords[0], mockWords);
    expect(q.type).toBe('listening');
    expect(q.audioText).toBe('resilient');
    expect(q.options).toContain('resilient');
  });
});

describe('generateVocabTestQuestions', () => {
  it('filters by sourceLevels (REVIEWING and MASTERED only)', () => {
    const questions = generateVocabTestQuestions(mockWords, {
      sourceLevels: [MasteryLevel.REVIEWING, MasteryLevel.MASTERED],
      questionCount: 10,
      questionTypes: ['word_to_meaning', 'meaning_to_word'],
    });

    // innovative is LEARNING, so only words 0, 1, 2 should be included
    expect(questions.length).toBe(3);
    const wordsIncluded = questions.map((q) => q.targetWord);
    expect(wordsIncluded).not.toContain('innovative');
    expect(wordsIncluded).toContain('resilient');
  });

  it('honours questionCount limit', () => {
    const questions = generateVocabTestQuestions(mockWords, {
      sourceLevels: [MasteryLevel.REVIEWING, MasteryLevel.MASTERED],
      questionCount: 2,
      questionTypes: ['word_to_meaning'],
    });
    expect(questions.length).toBe(2);
  });
});

describe('getPerformanceRating', () => {
  it('gives exceptional for >= 90', () => {
    expect(getPerformanceRating(100).tier).toBe('exceptional');
    expect(getPerformanceRating(90).tier).toBe('exceptional');
  });

  it('gives great for >= 80', () => {
    expect(getPerformanceRating(85).tier).toBe('great');
  });

  it('gives good for >= 65', () => {
    expect(getPerformanceRating(70).tier).toBe('good');
  });

  it('gives needs_practice for < 65', () => {
    expect(getPerformanceRating(60).tier).toBe('needs_practice');
  });
});

describe('summarizeVocabTest', () => {
  it('accurately computes correct, wrong, and percentage', () => {
    const q1 = buildWordToMeaningQuestion(mockWords[0], mockWords)!;
    const q2 = buildWordToMeaningQuestion(mockWords[1], mockWords)!;

    const summary = summarizeVocabTest(
      [q1, q2],
      {
        [q1.id]: q1.correctAnswer, // correct
        [q2.id]: 'wrong answer', // wrong
      },
      45,
    );

    expect(summary.totalQuestions).toBe(2);
    expect(summary.correctCount).toBe(1);
    expect(summary.wrongCount).toBe(1);
    expect(summary.scorePercentage).toBe(50);
    expect(summary.durationSeconds).toBe(45);
    expect(summary.wrongItems).toHaveLength(1);
    expect(summary.wrongItems[0].targetWord).toBe('persevere');
  });
});
