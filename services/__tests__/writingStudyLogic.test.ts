import { describe, expect, it } from 'vitest';
import { annotateParagraph, criterionLabels, essayWordCount, questionTopics } from '../writingStudyLogic';
import { BAND_SAMPLE_SETS } from '../../data/ielts/writingSamples';
import { WRITING_GUIDES, guideForQuestionType } from '../../data/ielts/writingGuides';
import { LINKING_GROUPS, TOPIC_COLLOCATIONS } from '../../data/ielts/writingLanguage';
import { writingTask2Questions } from '../../data/ieltsWritingQuestions';
import { ieltsFrameworks } from '../../data/ieltsFrameworks';
import { LIBRARY_LESSONS } from '../../data/ielts/library';
import { getWritingQuestions } from '../ieltsWritingService';

describe('annotateParagraph', () => {
  const text = 'Overall, both rose. However, cars fell sharply.';

  it('marks quotes in text order and keeps the text whole', () => {
    const pieces = annotateParagraph(text, [
      { quote: 'fell sharply', kind: 'good', note: 'b' },
      { quote: 'both rose', kind: 'weak', note: 'a' },
    ]);
    expect(pieces.map((p) => p.text).join('')).toBe(text);
    expect(pieces.filter((p) => p.note !== undefined).map((p) => [p.text, p.note])).toEqual([
      ['both rose', 1],
      ['fell sharply', 0],
    ]);
  });

  it('skips missing and overlapping quotes', () => {
    const pieces = annotateParagraph(text, [
      { quote: 'both rose', kind: 'good', note: '' },
      { quote: 'rose. However', kind: 'good', note: '' },
      { quote: 'not there', kind: 'good', note: '' },
    ]);
    expect(pieces.filter((p) => p.note !== undefined)).toHaveLength(1);
    expect(pieces.map((p) => p.text).join('')).toBe(text);
    expect(annotateParagraph(text)).toEqual([{ text }]);
  });
});

describe('band samples', () => {
  it('quote every note exactly once in its paragraph', () => {
    for (const set of BAND_SAMPLE_SETS)
      for (const essay of set.essays)
        for (const p of essay.paragraphs)
          for (const n of p.notes ?? []) {
            expect(p.text.split(n.quote).length - 1, `${set.id} band ${essay.band}: ${n.quote}`).toBe(1);
          }
  });

  it('have bands 6, 7 and 8 at a realistic length for an existing question', () => {
    for (const set of BAND_SAMPLE_SETS) {
      expect(set.essays.map((e) => e.band)).toEqual([6, 7, 8]);
      const q = writingTask2Questions.find((x) => x.id === set.questionId);
      expect(q?.taskOrPart).toBe(set.task);
      for (const e of set.essays) {
        const words = essayWordCount(e);
        if (set.task === 'task_1') expect(words, `${set.id} ${e.band}`).toBeGreaterThanOrEqual(150);
        else expect(words, `${set.id} ${e.band}`).toBeGreaterThanOrEqual(250);
        expect(e.scores.reduce((a, b) => a + b, 0) / 4).toBeCloseTo(e.band, 0);
      }
    }
    expect(criterionLabels('task_1')[0]).toBe('Task Achievement');
  });
});

describe('writing question bank', () => {
  it('has unique ids, known frameworks and a guide for every question type', () => {
    const ids = writingTask2Questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const frameworks = new Set(ieltsFrameworks.map((f) => f.id));
    for (const q of writingTask2Questions) {
      expect(frameworks.has(q.frameworkId), q.id).toBe(true);
      expect(guideForQuestionType(q.questionType)?.task, q.id).toBe(q.taskOrPart);
    }
  });

  it('has at least four questions for every Task 2 guide', () => {
    for (const g of WRITING_GUIDES.filter((x) => x.task === 'task_2')) {
      expect(getWritingQuestions({ taskOrPart: 'task_2', essayType: g.id }).length, g.id).toBeGreaterThanOrEqual(4);
    }
    const advantages = getWritingQuestions({ essayType: 'advantages_disadvantages' }).map((q) => q.questionType);
    expect(advantages).toContain('positive_negative');
  });

  it('lists topics once, in order', () => {
    const topics = questionTopics(writingTask2Questions);
    expect(new Set(topics).size).toBe(topics.length);
    expect(topics[0]).toBe(writingTask2Questions[0].topic);
  });
});

describe('guides and language bank', () => {
  it('turns every guide into a Library lesson', () => {
    for (const g of WRITING_GUIDES) expect(LIBRARY_LESSONS.some((l) => l.id === `lib_guide_${g.id}`)).toBe(true);
    expect(new Set(WRITING_GUIDES.map((g) => g.id)).size).toBe(WRITING_GUIDES.length);
  });

  it('has filled linking groups and collocation topics', () => {
    for (const g of LINKING_GROUPS) expect(g.items.length).toBeGreaterThanOrEqual(3);
    for (const t of TOPIC_COLLOCATIONS) expect(t.items.length).toBeGreaterThanOrEqual(6);
    const phrases = TOPIC_COLLOCATIONS.flatMap((t) => t.items.map((i) => i.phrase));
    expect(new Set(phrases).size).toBe(phrases.length);
  });
});
