import { describe, expect, it } from 'vitest';
import {
  groupFor,
  optionsFor,
  relatedTopics,
  searchTopics,
  topicGroups,
  topics,
} from '../../data/grammar/library';
import { tenses } from '../../data/grammar/library/tenses';

describe('Grammar topic library', () => {
  it('provides the four forms for each time period and a full lesson for all 12 entries', () => {
    expect(tenses.map((topic) => topic.id)).toEqual(
      ['present', 'past', 'future'].flatMap((period) =>
        ['simple', 'continuous', 'perfect', 'perfect-continuous'].map((form) => period + '-' + form)
      )
    );
    for (const tense of tenses) {
      expect(tense.forms.map((form) => form.label)).toEqual(['Khẳng định', 'Phủ định', 'Câu hỏi']);
      expect(tense.questions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('finds Vietnamese queries with or without diacritics, English equivalents and aliases', () => {
    expect(searchTopics('cau bi dong', '').map((topic) => topic.id)).toContain('passive');
    expect(searchTopics('present perfect', '').map((topic) => topic.id)).toContain('present-perfect');
    expect(searchTopics('trang tu', '').map((topic) => topic.id)).toContain('adverbs');
    expect(searchTopics('lien tu', '').map((topic) => topic.id)).toContain('conjunctions');
    expect(searchTopics('bi dong', 'Nâng cao').map((topic) => topic.id)).toContain('advanced-passive');
    expect(searchTopics('không-có-mục-này', '')).toEqual([]);
  });

  it('keeps each lesson and link reachable and all quizzes unambiguous in their options', () => {
    const ids = topics.map((topic) => topic.id);
    expect(ids).toHaveLength(50);
    expect(new Set(ids).size).toBe(ids.length);
    expect(topicGroups.every((group) => group.topics.length > 0)).toBe(true);
    for (const [id, related] of Object.entries(relatedTopics)) {
      expect(ids).toContain(id);
      for (const target of related) expect(ids).toContain(target);
    }
    const answerPositions: number[] = [];
    for (const topic of topics) {
      expect(groupFor(topic.id)?.topics).toContain(topic);
      expect(topic.examples.length).toBeGreaterThanOrEqual(2);
      expect(topic.forms.length).toBeGreaterThan(0);
      expect(topic.questions.length).toBeGreaterThanOrEqual(2);
      expect(topic.trap.why).toBeTruthy();
      topic.questions.forEach((question, index) => {
        const options = optionsFor(topic, index);
        expect(new Set(options).size).toBe(options.length);
        expect(options.length).toBe(3);
        expect(options).toContain(question.answer);
        expect(question.why).toBeTruthy();
        answerPositions.push(options.indexOf(question.answer));
      });
    }
    expect(new Set(answerPositions).size).toBe(3);
  });
});
