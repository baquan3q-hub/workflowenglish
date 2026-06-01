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
    expect(hasDraft()).toBe(false);
  });

  it('should return null for loadDraft when no draft exists', () => {
    expect(loadDraft()).toBe(null);
  });

  it('should save draft and return true for hasDraft', () => {
    saveDraft(mockDraftData);
    expect(hasDraft()).toBe(true);
  });

  it('should load saved draft correctly with all fields', () => {
    saveDraft(mockDraftData);
    const loaded = loadDraft();
    
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
    saveDraft(mockDraftData);
    expect(hasDraft()).toBe(true);
    
    clearDraft();
    expect(hasDraft()).toBe(false);
    expect(loadDraft()).toBeNull();
  });

  it('should handle missing settings/records gracefully', () => {
    const minimalDraft: Omit<DraftData, 'timestamp'> = {
      ...mockDraftData,
      lessonSettings: null,
      currentRecordId: null,
    };
    
    saveDraft(minimalDraft);
    const loaded = loadDraft();
    
    expect(loaded).not.toBeNull();
    expect(loaded?.lessonSettings).toBeNull();
    expect(loaded?.currentRecordId).toBeNull();
  });
});
