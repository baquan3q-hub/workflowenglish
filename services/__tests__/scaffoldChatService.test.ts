import { describe, it, expect } from 'vitest';
import {
  buildScaffoldActionPrompt,
  getProactiveSuggestionsForAttachment,
  getPhaseContextTip,
  extractDocumentText,
} from '../scaffoldChatService';
import { requestedQuizSize } from '../chatLogic';

describe('scaffoldChatService', () => {
  it('builds sentence_breakdown prompt containing required JSON block indicator', () => {
    const prompt = buildScaffoldActionPrompt('sentence_breakdown', 'Technology plays a vital role in education.');
    expect(prompt).toContain('```json:scaffold_sentences');
    expect(prompt).toContain('Technology plays a vital role in education.');
    expect(prompt).toContain('grammarAnalysis');
    expect(prompt).toContain('translationVi');
  });

  it('builds vocab_extract prompt containing required JSON block indicator', () => {
    const prompt = buildScaffoldActionPrompt('vocab_extract', 'Global warming is an unprecedented phenomenon.');
    expect(prompt).toContain('```json:scaffold_vocab');
    expect(prompt).toContain('Global warming is an unprecedented phenomenon.');
    expect(prompt).toContain('collocations');
    expect(prompt).toContain('ipa');
  });

  it('builds quiz_generate prompt in the shared quiz format, with hints', () => {
    const prompt = buildScaffoldActionPrompt('quiz_generate', 'Artificial intelligence transforms medicine.');
    expect(prompt).toContain('```quiz');
    expect(prompt).toContain('"hint"');
    expect(prompt).toContain('Artificial intelligence transforms medicine.');
    expect(requestedQuizSize(prompt)).toBe(5);
  });

  it('returns proactive suggestions for images', () => {
    const suggestions = getProactiveSuggestionsForAttachment({
      type: 'image',
      data: 'base64...',
      mimeType: 'image/png',
    });
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.some((s) => s.action === 'sentence_breakdown')).toBe(true);
    expect(suggestions.some((s) => s.action === 'vocab_extract')).toBe(true);
    expect(suggestions.some((s) => s.action === 'quiz_generate')).toBe(true);
  });

  it('detects phase context tips for writing, reading, and vocab', () => {
    const writingTip = getPhaseContextTip('IELTS_WRITING_PRACTICE');
    expect(writingTip).not.toBeNull();
    expect(writingTip?.badge).toContain('Writing');

    const readingTip = getPhaseContextTip('IELTS_READING_PRACTICE');
    expect(readingTip).not.toBeNull();
    expect(readingTip?.badge).toContain('Reading');

    const vocabTip = getPhaseContextTip('FLASHCARDS');
    expect(vocabTip).not.toBeNull();
    expect(vocabTip?.badge).toContain('SRS');
  });

  it('extracts plain text files correctly', async () => {
    const file = new File(['Hello IELTS Mentor, this is test content.'], 'sample.txt', { type: 'text/plain' });
    const result = await extractDocumentText(file);
    expect(result.text).toBe('Hello IELTS Mentor, this is test content.');
    expect(result.fileName).toBe('sample.txt');
  });
});
