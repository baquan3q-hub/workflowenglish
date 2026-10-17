import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppPhase, DifficultyLevel } from '../../types';

// Mock localStorage for Node.js test environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => {
    Object.keys(store).forEach(key => {
      delete store[key];
    });
  }
};
globalThis.localStorage = mockLocalStorage as any;

// Import draftService AFTER mocking localStorage to ensure it resolves properly
import { saveDraft, loadDraft, clearDraft, hasDraft, DraftData } from '../draftService';

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('draftService', () => {
  const mockDraftData: Omit<DraftData, 'timestamp'> = {
    lessonData: {
      flashcards: [
        {
          id: '1',
          word: 'apple',
          ipa: '/ˈæp.əl/',
          partOfSpeech: 'noun',
          meaningVietnamese: 'quả táo',
          definitionEnglish: 'a round fruit with red or green skin and a whitish interior',
          exampleSentence: 'I ate an apple.',
          exampleSentenceVietnamese: 'Tôi đã ăn một quả táo.'
        }
      ],
      story: {
        title: 'An Apple a Day',
        content: 'Eating an apple keeps the doctor away.',
        translation: 'Ăn một quả táo mỗi ngày giúp tránh xa bác sĩ.'
      },
      quiz: [
        {
          id: 'q1',
          question: 'What is an apple?',
          options: ['Fruit', 'Car', 'House', 'Job'],
          correctAnswer: 'Fruit',
          explanation: 'Apple is a common fruit.',
          type: 'multiple-choice'
        }
      ]
    },
    lessonSettings: {
      level: DifficultyLevel.B1,
      topic: 'Fruits'
    },
    lessonWords: 'apple',
    phase: AppPhase.FLASHCARDS,
    currentRecordId: 'record-123',
    flashcardIndex: 0,
    lessonMasteryMap: { apple: { masteryLevel: 1 } }
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should return false for hasDraft when no draft exists', () => {
    expect(hasDraft(USER_A)).toBe(false);
  });

  it('should return null for loadDraft when no draft exists', () => {
    expect(loadDraft(USER_A)).toBe(null);
  });

  it('should save draft and return true for hasDraft', () => {
    saveDraft(USER_A, mockDraftData);
    expect(hasDraft(USER_A)).toBe(true);
  });

  it('should load saved draft correctly with all fields', () => {
    saveDraft(USER_A, mockDraftData);
    const loaded = loadDraft(USER_A);
    
    expect(loaded).not.toBeNull();
    expect(loaded?.lessonData).toEqual(mockDraftData.lessonData);
    expect(loaded?.lessonSettings).toEqual(mockDraftData.lessonSettings);
    expect(loaded?.lessonWords).toBe(mockDraftData.lessonWords);
    expect(loaded?.phase).toBe(mockDraftData.phase);
    expect(loaded?.currentRecordId).toBe(mockDraftData.currentRecordId);
    expect(loaded?.flashcardIndex).toBe(mockDraftData.flashcardIndex);
    expect(loaded?.lessonMasteryMap).toEqual(mockDraftData.lessonMasteryMap);
    expect(loaded?.timestamp).toBeDefined();
  });

  it('should clear draft correctly', () => {
    saveDraft(USER_A, mockDraftData);
    expect(hasDraft(USER_A)).toBe(true);
    
    clearDraft(USER_A);
    expect(hasDraft(USER_A)).toBe(false);
    expect(loadDraft(USER_A)).toBeNull();
  });

  it('should handle missing settings/records gracefully', () => {
    const minimalDraft: Omit<DraftData, 'timestamp'> = {
      ...mockDraftData,
      lessonSettings: null,
      currentRecordId: null,
    };
    
    saveDraft(USER_A, minimalDraft);
    const loaded = loadDraft(USER_A);
    
    expect(loaded).not.toBeNull();
    expect(loaded?.lessonSettings).toBeNull();
    expect(loaded?.currentRecordId).toBeNull();
  });

  it('should keep drafts isolated per user', () => {
    saveDraft(USER_A, mockDraftData);
    expect(hasDraft(USER_A)).toBe(true);
    expect(hasDraft(USER_B)).toBe(false);
    expect(loadDraft(USER_B)).toBeNull();

    clearDraft(USER_B);
    expect(hasDraft(USER_A)).toBe(true);
  });

  it('should strip story audio from the stored draft', () => {
    saveDraft(USER_A, {
      ...mockDraftData,
      lessonData: {
        ...mockDraftData.lessonData!,
        story: { ...mockDraftData.lessonData!.story, audioBase64: 'AAAA' },
      },
    });
    expect(loadDraft(USER_A)?.lessonData?.story.audioBase64).toBeUndefined();
  });

  it('should remove legacy global draft keys', () => {
    localStorage.setItem('vocabmaster-draft-lesson', '{}');
    localStorage.setItem('vocabmaster-draft-phase', 'FLASHCARDS');
    expect(loadDraft(USER_A)).toBeNull();
    expect(localStorage.getItem('vocabmaster-draft-lesson')).toBeNull();
  });
});
