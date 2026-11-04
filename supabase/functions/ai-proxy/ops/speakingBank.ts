/**
 * The learner's own Speaking answers: they note their ideas (in Vietnamese or
 * English keywords) in the slots of a frame, and buildSpeakingAnswer turns
 * them into an answer at their target band, with keywords to speak from,
 * phrases, and the follow-up questions an examiner might ask next.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, list, oneOf, q, str, S, userText, type OpSpec } from '../lib.ts';
import { learnerBlockFor } from './learner.ts';

export const SPEAKING_PARTS = ['part_1', 'part_2', 'part_3'] as const;
export const SPEAKING_BANDS = ['5.5', '6', '6.5', '7', '7.5', '8'] as const;

/** Words of a natural answer per part: Part 1 about 20 s, Part 2 up to 2 min, Part 3 30-60 s. */
export const ANSWER_WORDS: Record<(typeof SPEAKING_PARTS)[number], [number, number]> = {
  part_1: [35, 75],
  part_2: [170, 260],
  part_3: [70, 130],
};

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const schema = S.obj({
  answer: S.str(),
  answerVi: S.str(),
  keywords: S.arr(S.str()),
  moves: S.arr(S.obj({ slot: S.str(), text: S.str() })),
  vocabulary: S.arr(S.obj({ phrase: S.str(), meaningVi: S.str() })),
  followUps: S.arr(S.str()),
  tipVi: S.str(),
});

export interface BuiltSpeakingAnswer {
  answer: string;
  answerVi: string;
  keywords: string[];
  moves: { slot: string; text: string }[];
  vocabulary: { phrase: string; meaningVi: string }[];
  followUps: string[];
  tipVi: string;
}

export function builtAnswerProblems(data: unknown, part: (typeof SPEAKING_PARTS)[number]): string[] {
  const d = data as Partial<BuiltSpeakingAnswer> | null;
  if (!d || !nonEmpty(d.answer)) return ['answer missing'];
  const words = d.answer.split(/\s+/).filter(Boolean).length;
  const [min, max] = ANSWER_WORDS[part];
  const out: string[] = [];
  if (words < min * 0.7) out.push(`answer has ${words} words, expected ${min}-${max}`);
  if (words > max * 1.35) out.push(`answer has ${words} words, expected ${min}-${max}`);
  if (!Array.isArray(d.keywords) || d.keywords.filter(nonEmpty).length < 3) out.push('fewer than 3 keywords');
  return out;
}

export const buildSpeakingAnswer: OpSpec = {
  hourlyLimit: 25,
  models: FLASH_MODELS,
  timeoutMs: 40_000,
  kind: 'json',
  finalize(data) {
    const d = data as BuiltSpeakingAnswer;
    if (!d || !nonEmpty(d.answer)) throw new Error('answer missing');
    return {
      answer: d.answer.trim(),
      answerVi: String(d.answerVi ?? '').trim(),
      keywords: (d.keywords ?? []).filter(nonEmpty).map((k) => k.trim()).slice(0, 10),
      moves: (d.moves ?? []).filter((m) => nonEmpty(m?.text)).map((m) => ({ slot: String(m.slot ?? '').trim(), text: m.text.trim() })).slice(0, 8),
      vocabulary: (d.vocabulary ?? [])
        .filter((v) => nonEmpty(v?.phrase))
        .map((v) => ({ phrase: v.phrase.trim(), meaningVi: String(v.meaningVi ?? '').trim() }))
        .slice(0, 8),
      followUps: (d.followUps ?? []).filter(nonEmpty).map((f) => f.trim()).slice(0, 4),
      tipVi: String(d.tipVi ?? '').trim(),
    };
  },
  build(payload) {
    const p = asObject(payload);
    const part = oneOf(p, 'part', SPEAKING_PARTS, 'part_1');
    const band = oneOf(p, 'targetBand', SPEAKING_BANDS, '6.5');
    const question = str(p, 'question', { max: 600 });
    const bullets = list(p, 'bullets', 6, (v) => String(v).slice(0, 200)).filter(nonEmpty);
    const frame = str(p, 'frame', { max: 80, optional: true });
    const ideas = list(p, 'ideas', 8, (v) => {
      const o = asObject(v, 'idea');
      return { slot: str(o, 'slot', { max: 60 }), text: str(o, 'text', { max: 600, optional: true }) };
    }).filter((i) => i.text.trim());
    const notes = str(p, 'notes', { max: 1500, optional: true });
    if (!ideas.length && !notes.trim()) throw new BadRequest('ideas or notes is required');
    const [min, max] = ANSWER_WORDS[part];

    const partRules: Record<typeof part, string> = {
      part_1:
        'Speaking Part 1: a direct answer first, then a reason, then a short personal detail or example. 2-4 sentences. Natural, everyday spoken English.',
      part_2:
        'Speaking Part 2 long turn: cover every bullet of the cue card, tell it as a personal story with concrete details (when, where, who, what happened, how you felt), and end with a short reflection. It should take about 1.5-2 minutes to say.',
      part_3:
        'Speaking Part 3 discussion: give a clear opinion, explain the reason, give a concrete example, and add a contrast, a condition or a wider consequence. Use language for speculating, comparing and generalising.',
    };

    const text = `You help a Vietnamese learner prepare their OWN answer to an IELTS Speaking question, at about band ${band}.

${partRules[part]}
Question: ${q(question)}${bullets.length ? `\nCue card bullets: ${bullets.map(q).join('; ')}` : ''}${frame ? `\nAnswer frame the learner chose: ${frame}` : ''}
The learner's ideas, slot by slot (Vietnamese or English keywords):
${ideas.map((i) => `- ${i.slot}: ${q(i.text)}`).join('\n') || '(none)'}
${notes.trim() ? `Extra notes from the learner: ${q(notes)}` : ''}

Rules:
- Use the learner's ideas and facts; do not invent a different story or opinion. You may add small natural details that fit.
- ${min}-${max} words. Spoken style: contractions are fine, a natural discourse marker or two ("Well,", "To be honest,", "I'd say"), but do not repeat the same linker; vary them.
- Vocabulary and grammar at about band ${band}: natural collocations and some complex sentences, nothing that sounds memorised or overly formal.
- keywords: 4-8 short English cue words or phrases (1-4 words each), in the order they are spoken, so the learner can speak from them instead of reading.
- moves: the answer split into its frame moves, each { slot (the frame slot it fills, in Vietnamese, e.g. "Trả lời thẳng", "Lý do", "Ví dụ"), text (the English sentences for that move) }.
- answerVi: a natural Vietnamese translation of the answer.
- vocabulary: 4-6 useful phrases from the answer with Vietnamese meaning.
- followUps: 3 follow-up questions an examiner could ask next about what the learner said${part === 'part_2' ? ' (Part 3 style questions on the same theme)' : ''}.
- tipVi: one short Vietnamese tip on how to say this answer well (stress, pace, what to expand if asked).
- No markdown.`;
    return { contents: userText(text + learnerBlockFor(p)), generationConfig: jsonConfig(schema, { temperature: 0.6 }) };
  },
};
