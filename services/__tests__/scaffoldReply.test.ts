import { describe, expect, it } from 'vitest';
import { splitReply } from '../../components/ai-scaffold/renderers/ScaffoldMarkdownRenderer';

describe('splitReply', () => {
  it('splits text and the three card kinds', () => {
    const reply = [
      'Mở đầu',
      '```json:scaffold_sentences',
      '[{"id":"s1","original":"Hi.","translationVi":"Chào."}]',
      '```',
      '```json:scaffold_vocab',
      '[{"id":"v1","word":"thrive","meaningVi":"phát triển"}]',
      '```',
      '```quiz',
      '{"title":"Q","questions":[{"q":"a?","options":["x","y"],"answer":0,"explain":""}]}',
      '```',
      'Kết',
    ].join('\n');
    expect(splitReply(reply).map((s) => s.kind)).toEqual(['text', 'sentences', 'vocab', 'quiz', 'text']);
  });

  it('keeps ordinary code as text and flags broken JSON', () => {
    expect(splitReply('```ts\nconst a = 1;\n```').map((s) => s.kind)).toEqual(['text']);
    expect(splitReply('```json:scaffold_vocab\n{oops\n```').map((s) => s.kind)).toEqual(['broken']);
  });

  it('shows progress for a block still streaming', () => {
    const parts = splitReply('Đây:\n```quiz\n{"questions":[{"q":"a"},{"q":"b"');
    expect(parts.at(-1)).toEqual({ kind: 'pending', what: 'quiz', written: 2 });
  });
});
