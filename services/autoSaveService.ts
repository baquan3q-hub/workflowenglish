import { useEffect, useRef } from 'react';
import { AppPhase } from '../types';

interface AutoSaveProps {
  phase: AppPhase;
  hasLessonData: boolean;
  onAutoSave: () => Promise<void>;
  intervalMs?: number;
}

/**
 * Custom hook quản lý việc tự động lưu tiến trình học lên Supabase theo chu kỳ.
 * Tự động kích hoạt khi ở trong các phase học tập và dừng khi rời đi.
 */
export function useAutoSave({
  phase,
  hasLessonData,
  onAutoSave,
  intervalMs = 120000, // Mặc định 2 phút (120 giây)
}: AutoSaveProps) {
  const onAutoSaveRef = useRef(onAutoSave);

  // Giữ callback mới nhất để tránh stale closures
  useEffect(() => {
    onAutoSaveRef.current = onAutoSave;
  }, [onAutoSave]);

  useEffect(() => {
    // Chỉ tự động lưu khi đang ở trong các phase học tập chính
    const isLearningPhase = [
      AppPhase.FLASHCARDS,
      AppPhase.STORY,
      AppPhase.QUIZ,
      AppPhase.FILL_BLANK,
    ].includes(phase);

    if (!isLearningPhase || !hasLessonData) {
      return;
    }

    console.log(`[AutoSave] Auto-save service started (interval: ${intervalMs / 1000}s)`);

    const intervalId = setInterval(async () => {
      try {
        console.log('[AutoSave] Executing periodic cloud auto-save...');
        await onAutoSaveRef.current();
      } catch (error) {
        console.error('[AutoSave] Periodic cloud auto-save failed:', error);
      }
    }, intervalMs);

    return () => {
      console.log('[AutoSave] Auto-save service stopped');
      clearInterval(intervalId);
    };
  }, [phase, hasLessonData, intervalMs]);
}
