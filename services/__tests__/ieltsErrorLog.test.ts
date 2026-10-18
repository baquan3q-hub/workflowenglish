import { describe, it, expect } from 'vitest';
import type { IeltsAiFeedback, IeltsAttempt, IeltsSentenceCorrection } from '../../types';
import {
  collectErrors,
  errorTrend,
  isCorrectionFixed,
  lessonFor,
  OTHER_CATEGORY,
  OTHER_LABEL,
  pickableWords,
  sentenceWith,
  summarizeErrors,
} from '../ieltsErrorLogic';
import { ERROR_DRILLS, drillsFor } from '../../data/ielts/errorDrills';
import { ERROR_CATEGORIES } from '../../data/ielts/errorCategories';
import { findLesson } from '../../data/ielts/library';
import { localGrade, missingTargetWords } from '../sentenceLogic';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { SPEAKING_ERROR_CATEGORIES, WRITING_ERROR_CATEGORIES } from '../../supabase/functions/ai-proxy/ops/ielts.ts';

const fix = (original: string, category?: string, corrected = `${original} (fixed)`): IeltsSentenceCorrection => ({
  original,
  corrected,
  explanation: 'giải thích',
  ...(category ? { category } : {}),
});

let day = 1;
function attempt(skill: IeltsAttempt['skill'], corrections: IeltsSentenceCorrection[] | null, date?: string): IeltsAttempt {
  const createdAt = date ?? `2026-09-${String(day++).padStart(2, '0')}T10:00:00Z`;
  const aiFeedback = corrections ? ({ estimatedBand: 6, criterionScores: [], sentenceCorrections: corrections } as unknown as IeltsAiFeedback) : undefined;
  return {
    id: `a_${createdAt}`,
    userId: 'u',
    skill,
    taskOrPart: 'task_2',
    questionType: 'q',
    topic: 't',
    questionPrompt: 'p',
    answerText: 'x',
    aiFeedback,
    createdAt,
  };
}

describe('collectErrors', () => {
  it('labels corrections and puts unknown or missing labels under Khác', () => {
    const errors = collectErrors([
      attempt('writing', [fix('He go school', 'tense'), fix('A old', 'made_up'), fix('No label')]),
      attempt('speaking', [fix('I go there yesterday', 'tense')]),
      attempt('listening', [fix('Ignored', 'tense')]),
      attempt('writing', null),
    ]);
    expect(errors.map((e) => [e.category, e.skill])).toEqual([
      ['tense', 'speaking'],
      ['tense', 'writing'],
      [OTHER_CATEGORY, 'writing'],
      [OTHER_CATEGORY, 'writing'],
    ]);
    expect(errors[0].attemptIndex).toBe(0);
    expect(errors[1].attemptIndex).toBe(1);
  });

  it('filters by skill and skips empty corrections', () => {
    const list = [attempt('writing', [fix('  ', 'article'), fix('An pen', 'article')]), attempt('speaking', [fix('x', 'tense')])];
    expect(collectErrors(list, 'writing')).toHaveLength(1);
    expect(collectErrors(list, 'speaking')).toHaveLength(1);
  });
});

describe('summarizeErrors', () => {
  it('counts per label, newest examples first without repeats, Khác last', () => {
    const log = summarizeErrors([
      attempt('writing', [fix('Old article', 'article'), fix('Unlabelled one')]),
      attempt('speaking', [fix('He go', 'tense'), fix('Unlabelled two')]),
      attempt('writing', [fix('Same sentence', 'article'), fix('same sentence.', 'article'), fix('Third', 'article'), fix('Fourth', 'article')]),
    ]);
    expect(log.attempts).toBe(3);
    expect(log.total).toBe(8);
    expect(log.categories.map((c) => c.label)).toEqual(['Mạo từ', 'Thì động từ', OTHER_LABEL]);
    const article = log.categories[0];
    expect(article.total).toBe(5);
    expect(article.bySkill).toEqual({ writing: 5, speaking: 0 });
    expect(article.perAttempt).toBeCloseTo(1.7);
    expect(article.examples.map((e) => e.original)).toEqual(['Same sentence', 'Third', 'Fourth']);
    expect(article.trend).toBeNull();
    expect(log.categories[2].info).toBeUndefined();
  });

  it('breaks ties by the label order', () => {
    const log = summarizeErrors([attempt('writing', [fix('a', 'preposition'), fix('b', 'article')])]);
    expect(log.categories.map((c) => c.category)).toEqual(['article', 'preposition']);
  });

  it('shows a trend once there are four attempts', () => {
    // Oldest two have two tense errors each; newest two have none → going down.
    const down = summarizeErrors([
      attempt('writing', [fix('t1', 'tense'), fix('t2', 'tense')], '2026-09-01T00:00:00Z'),
      attempt('writing', [fix('t3', 'tense'), fix('t4', 'tense')], '2026-09-02T00:00:00Z'),
      attempt('writing', [fix('a', 'article'), fix('a3', 'article')], '2026-09-03T00:00:00Z'),
      attempt('speaking', [fix('a2', 'article')], '2026-09-04T00:00:00Z'),
    ]);
    const tense = down.categories.find((c) => c.category === 'tense')!;
    const article = down.categories.find((c) => c.category === 'article')!;
    expect(tense.trend).toBe('down');
    expect(article.trend).toBe('up');
    expect(article.examples[0].original).toBe('a2');
  });

  it('is empty without graded attempts', () => {
    expect(summarizeErrors([])).toEqual({ attempts: 0, total: 0, categories: [] });
    expect(summarizeErrors([attempt('writing', [])]).attempts).toBe(1);
  });
});

describe('errorTrend', () => {
  it('compares the newer half with the older half per attempt', () => {
    expect(errorTrend([0, 1, 2], 3)).toBeNull();
    // 4 attempts: newer = 0,1; older = 2,3.
    expect(errorTrend([0, 3], 4)).toBe('flat');
    expect(errorTrend([0, 1], 4)).toBe('up');
    expect(errorTrend([2, 3], 4)).toBe('down');
    // One slip is not a trend.
    expect(errorTrend([0], 4)).toBeNull();
    // 5 attempts: newer 2, older 3; 1/2 − 1/3 ≈ 0.17 → flat.
    expect(errorTrend([0, 2], 5)).toBe('flat');
    expect(errorTrend([0, 1, 3, 4], 6)).toBe('flat');
  });
});

describe('lessons and drills', () => {
  it('links every label to an existing lesson', () => {
    for (const c of [...ERROR_CATEGORIES.map((x) => x.id), OTHER_CATEGORY]) expect(findLesson(lessonFor(c)), c).toBeTruthy();
    expect(lessonFor('task_response')).toBe('lib_descriptors_writing');
  });

  it('has four valid drills for every label except punctuation and task response', () => {
    const ids = new Set<string>();
    for (const c of ERROR_CATEGORIES) {
      const drills = drillsFor(c.id);
      if (c.id === 'punctuation' || c.id === 'task_response') {
        expect(drills).toHaveLength(0);
        continue;
      }
      expect(drills.length, c.id).toBeGreaterThanOrEqual(4);
      for (const d of drills) {
        expect(ids.has(d.id), d.id).toBe(false);
        ids.add(d.id);
        expect(d.promptVi.trim()).not.toBe('');
        expect(d.references.length).toBeGreaterThan(0);
        expect(d.references.length).toBeLessThanOrEqual(3);
        for (const ref of d.references) {
          expect(missingTargetWords(ref, d.targetWords), `${d.id}: ${ref}`).toEqual([]);
          expect(localGrade(d, ref)?.verdict, ref).toBe('correct');
        }
      }
    }
    expect(Object.keys(ERROR_DRILLS)).toHaveLength(8);
    expect(drillsFor(OTHER_CATEGORY)).toEqual([]);
  });
});

describe('rewrite check', () => {
  it('accepts the correction regardless of case, punctuation and bold', () => {
    expect(isCorrectionFixed('i went there yesterday', 'I **went** there yesterday.')).toBe(true);
    expect(isCorrectionFixed("I don't like it", 'I do not like it.')).toBe(true);
    expect(isCorrectionFixed('I go there yesterday', 'I went there yesterday.')).toBe(false);
    expect(isCorrectionFixed('   ', '')).toBe(false);
  });
});

describe('word picker', () => {
  it('keeps longer content words once, in order', () => {
    expect(pickableWords('Moreover, urban sprawl puts pressure on public transport. Urban areas should, however, invest.')).toEqual([
      'moreover',
      'urban',
      'sprawl',
      'pressure',
      'public',
      'transport',
      'areas',
      'invest',
    ]);
    expect(pickableWords("It's a well-known, cost-effective and people's choice")).toEqual(['well-known', 'cost-effective', 'choice']);
    expect(pickableWords('alpha bravo charlie delta', 2)).toEqual(['alpha', 'bravo']);
  });

  it('finds the sentence a word comes from', () => {
    const text = 'Cities are growing. Urban sprawl puts pressure on transport!\nIt matters.';
    expect(sentenceWith(text, 'sprawl')).toBe('Urban sprawl puts pressure on transport!');
    expect(sentenceWith(text, 'urban')).toBe('Urban sprawl puts pressure on transport!');
    expect(sentenceWith(text, 'absent')).toBeUndefined();
  });
});

describe('speaking error labels', () => {
  it('uses the writing labels minus punctuation', () => {
    expect(SPEAKING_ERROR_CATEGORIES).toEqual(WRITING_ERROR_CATEGORIES.filter((c) => c !== 'punctuation'));
  });

  it('asks the speaking grader for a label on each correction', () => {
    type Schema = { properties: Record<string, { items?: { properties: Record<string, { enum?: string[] }> } }> };
    for (const part of ['part_1', 'mock']) {
      const req = OPS.gradeIeltsSpeaking.build({ question: 'Q', transcript: 'Answer', part }) as unknown as {
        contents: { parts: { text?: string }[] }[];
        generationConfig: { responseSchema: Schema };
      };
      const item = req.generationConfig.responseSchema.properties.sentenceCorrections.items!;
      expect(item.properties.category.enum).toEqual(SPEAKING_ERROR_CATEGORIES);
      expect(req.contents[0].parts.at(-1)!.text).toContain('category: the main problem, one of article, tense');
    }
  });
});
