import { AppPhase, GeneratedLesson, UserSettings } from '../types';

export interface DraftData {
  lessonData: GeneratedLesson | null;
  lessonSettings: UserSettings | null;
  lessonWords: string;
  phase: AppPhase;
  currentRecordId: string | null;
  flashcardIndex: number;
  lessonMasteryMap: Record<string, any>;
  timestamp: string;
}

const KEYS = {
  LESSON: 'vocabmaster-draft-lesson',
  SETTINGS: 'vocabmaster-draft-settings',
  WORDS: 'vocabmaster-draft-words',
  PHASE: 'vocabmaster-draft-phase',
  RECORD_ID: 'vocabmaster-draft-record-id',
  FLASHCARD_INDEX: 'vocabmaster-draft-flashcard-index',
  MASTERY_MAP: 'vocabmaster-draft-mastery-map',
  TIMESTAMP: 'vocabmaster-draft-timestamp',
};

/**
 * Lưu bản nháp hiện tại của bài học vào localStorage
 */
export function saveDraft(data: Omit<DraftData, 'timestamp'>): void {
  try {
    if (!data.lessonData) {
      // Nếu không có lessonData, không lưu nháp hoặc xóa nháp hiện tại
      clearDraft();
      return;
    }

    localStorage.setItem(KEYS.LESSON, JSON.stringify(data.lessonData));
    if (data.lessonSettings) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.lessonSettings));
    } else {
      localStorage.removeItem(KEYS.SETTINGS);
    }
    localStorage.setItem(KEYS.WORDS, data.lessonWords || '');
    localStorage.setItem(KEYS.PHASE, data.phase);
    localStorage.setItem(KEYS.RECORD_ID, data.currentRecordId || '');
    localStorage.setItem(KEYS.FLASHCARD_INDEX, String(data.flashcardIndex || 0));
    localStorage.setItem(KEYS.MASTERY_MAP, JSON.stringify(data.lessonMasteryMap || {}));
    localStorage.setItem(KEYS.TIMESTAMP, new Date().toISOString());
  } catch (error) {
    console.error('[DraftService] Failed to save draft to localStorage:', error);
  }
}

/**
 * Tải bản nháp bài học từ localStorage nếu có
 */
export function loadDraft(): DraftData | null {
  try {
    const lessonStr = localStorage.getItem(KEYS.LESSON);
    const phaseStr = localStorage.getItem(KEYS.PHASE);
    const timestampStr = localStorage.getItem(KEYS.TIMESTAMP);

    if (!lessonStr || !phaseStr) {
      return null;
    }

    const lessonData = JSON.parse(lessonStr) as GeneratedLesson;
    const phase = phaseStr as AppPhase;
    const timestamp = timestampStr || new Date().toISOString();

    const settingsStr = localStorage.getItem(KEYS.SETTINGS);
    const lessonSettings = settingsStr ? (JSON.parse(settingsStr) as UserSettings) : null;
    const lessonWords = localStorage.getItem(KEYS.WORDS) || '';
    const currentRecordId = localStorage.getItem(KEYS.RECORD_ID) || null;
    
    const indexStr = localStorage.getItem(KEYS.FLASHCARD_INDEX);
    const flashcardIndex = indexStr ? Number(indexStr) : 0;

    const masteryStr = localStorage.getItem(KEYS.MASTERY_MAP);
    const lessonMasteryMap = masteryStr ? JSON.parse(masteryStr) : {};

    return {
      lessonData,
      lessonSettings,
      lessonWords,
      phase,
      currentRecordId: currentRecordId === '' ? null : currentRecordId,
      flashcardIndex,
      lessonMasteryMap,
      timestamp,
    };
  } catch (error) {
    console.error('[DraftService] Failed to load draft from localStorage:', error);
    return null;
  }
}

/**
 * Xóa toàn bộ bản nháp bài học khỏi localStorage
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(KEYS.LESSON);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.WORDS);
    localStorage.removeItem(KEYS.PHASE);
    localStorage.removeItem(KEYS.RECORD_ID);
    localStorage.removeItem(KEYS.FLASHCARD_INDEX);
    localStorage.removeItem(KEYS.MASTERY_MAP);
    localStorage.removeItem(KEYS.TIMESTAMP);
  } catch (error) {
    console.error('[DraftService] Failed to clear draft from localStorage:', error);
  }
}

/**
 * Kiểm tra xem có bản nháp bài học hợp lệ trong localStorage không
 */
export function hasDraft(): boolean {
  try {
    return localStorage.getItem(KEYS.LESSON) !== null && localStorage.getItem(KEYS.PHASE) !== null;
  } catch (error) {
    return false;
  }
}
