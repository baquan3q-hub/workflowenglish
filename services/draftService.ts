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

const KEY_PREFIX = 'vocabmaster-draft:';

/**
 * Các khoá cũ (trước khi tách nháp theo user). Không thể biết nháp cũ thuộc
 * về ai nên chỉ xoá đi để tránh lộ bài học của người khác trên máy dùng chung.
 */
const LEGACY_KEYS = [
  'vocabmaster-draft-lesson',
  'vocabmaster-draft-settings',
  'vocabmaster-draft-words',
  'vocabmaster-draft-phase',
  'vocabmaster-draft-record-id',
  'vocabmaster-draft-flashcard-index',
  'vocabmaster-draft-mastery-map',
  'vocabmaster-draft-timestamp',
];

const draftKey = (userId: string) => `${KEY_PREFIX}${userId}`;

function clearLegacyDraft(): void {
  try {
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/**
 * Lưu bản nháp hiện tại của bài học vào localStorage (riêng cho từng user).
 * Audio base64 của story bị loại bỏ vì quá nặng (dễ vượt quota localStorage);
 * audio đã được lưu riêng ở bảng `lesson_audio` khi bài học được lưu lên cloud.
 */
export function saveDraft(userId: string, data: Omit<DraftData, 'timestamp'>): void {
  if (!userId) return;
  try {
    if (!data.lessonData) {
      // Nếu không có lessonData, không lưu nháp hoặc xóa nháp hiện tại
      clearDraft(userId);
      return;
    }

    const lessonData: GeneratedLesson = data.lessonData.story?.audioBase64
      ? { ...data.lessonData, story: { ...data.lessonData.story, audioBase64: undefined } }
      : data.lessonData;

    const draft: DraftData = {
      ...data,
      lessonData,
      lessonWords: data.lessonWords || '',
      currentRecordId: data.currentRecordId || null,
      flashcardIndex: data.flashcardIndex || 0,
      lessonMasteryMap: data.lessonMasteryMap || {},
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch (error) {
    console.error('[DraftService] Failed to save draft to localStorage:', error);
  }
}

/**
 * Tải bản nháp bài học của user từ localStorage nếu có
 */
export function loadDraft(userId: string): DraftData | null {
  if (!userId) return null;
  clearLegacyDraft();
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;

    const draft = JSON.parse(raw) as Partial<DraftData>;
    if (!draft.lessonData || !draft.phase) return null;

    return {
      lessonData: draft.lessonData,
      lessonSettings: draft.lessonSettings ?? null,
      lessonWords: draft.lessonWords || '',
      phase: draft.phase,
      currentRecordId: draft.currentRecordId || null,
      flashcardIndex: Number(draft.flashcardIndex) || 0,
      lessonMasteryMap: draft.lessonMasteryMap || {},
      timestamp: draft.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DraftService] Failed to load draft from localStorage:', error);
    return null;
  }
}

/**
 * Xóa bản nháp bài học của user khỏi localStorage
 */
export function clearDraft(userId: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(draftKey(userId));
  } catch (error) {
    console.error('[DraftService] Failed to clear draft from localStorage:', error);
  }
}

/**
 * Kiểm tra xem user có bản nháp bài học hợp lệ trong localStorage không
 */
export function hasDraft(userId: string): boolean {
  return loadDraft(userId) !== null;
}
