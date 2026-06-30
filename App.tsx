import React, { useState, useEffect, useRef } from 'react';
import { AppPhase, DifficultyLevel, GeneratedLesson, UserSettings, FlashcardData, IeltsQuestion, IeltsAiFeedback } from './types';
import { generateLessonContent } from './services/geminiService';
import { supabase, getProfile, signOut, saveLearningRecord, getLearningRecordFull, LearningRecord, saveLessonAudio, withTimeout, getCachedSession, resumeAuthRefresh, pauseAuthRefresh } from './services/supabaseClient';
import {
  checkLevelSuggestion,
  acceptLevelChange,
  dismissLevelSuggestion,
  wasLevelSuggestionDismissed,
  getNextLevel,
} from './services/adaptiveDifficultyService';
import { getOrCreateUserGoals } from './services/goalService';
import LandingPage from './views/LandingPage';
import AuthPage from './views/AuthPage';
import Dashboard from './views/Dashboard';
import Flashcards from './views/Flashcards';
import StoryMode from './views/StoryMode';
import QuizMode from './views/QuizMode';
import FillBlankMode from './views/FillBlankMode';
import LearningHistory from './views/LearningHistory';
import ReviewSession from './views/ReviewSession';
import AnalyticsDashboard from './views/AnalyticsDashboard';
import IeltsWritingHub from './views/IeltsWritingHub';
import IeltsWritingPractice from './views/IeltsWritingPractice';
import IeltsWritingFeedback from './views/IeltsWritingFeedback';
import IeltsSpeakingHub from './views/IeltsSpeakingHub';
import IeltsSpeakingPractice from './views/IeltsSpeakingPractice';
import IeltsSpeakingFeedback from './views/IeltsSpeakingFeedback';
import { gradeWritingTask } from './services/ieltsWritingService';
import { gradeSpeakingAnswer } from './services/ieltsSpeakingService';
import { speakingPart1Questions } from './data/ieltsSpeakingQuestions';
import { Toast } from './components/Common';
import { Loader2, Layout, LogOut, User, History, BookOpen, Headphones, HelpCircle, PenTool, Menu, Sun, Moon, BarChart3, Mic } from 'lucide-react';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { saveDraft, loadDraft, clearDraft, hasDraft, DraftData } from './services/draftService';
import { useAutoSave } from './services/autoSaveService';
import IeltsChatBox from './components/IeltsChatBox';


interface AppUser {
  id: string;
  username: string;
  displayName: string;
}

function appUserFromAuthUser(user: any): AppUser {
  const emailName = typeof user?.email === 'string' ? user.email.split('@')[0] : '';
  const fallbackName = emailName || `user_${String(user?.id ?? '').slice(0, 8)}`;
  return {
    id: user.id,
    username: fallbackName,
    displayName: user?.user_metadata?.full_name || user?.user_metadata?.name || fallbackName || 'User',
  };
}

let isExplicitLogout = false;

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [phase, setPhase] = useState<AppPhase>(AppPhase.LANDING);
  const [lessonData, setLessonData] = useState<GeneratedLesson | null>(null);
  const [lessonSettings, setLessonSettings] = useState<UserSettings | null>(null);
  const [lessonWords, setLessonWords] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<AppPhase | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  // Top-center notification (e.g. daily goal reached celebration).
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' = 'success') =>
    setToast({ message, type });

  // Adaptive difficulty: level upgrade/downgrade suggestion modal state.
  // Shown after quiz completion when checkLevelSuggestion returns a direction
  // and the user hasn't previously dismissed that same (level, direction).
  const [levelSuggestion, setLevelSuggestion] = useState<{
    direction: 'upgrade' | 'downgrade';
    currentLevel: DifficultyLevel;
    nextLevel: DifficultyLevel;
  } | null>(null);

  // Lifted flashcard state to prevent unmount loss and lag N+1 queries
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [lessonMasteryMap, setLessonMasteryMap] = useState<Record<string, any>>({});

  // Lifted ReviewSession state to prevent unmount loss
  const [reviewDueWords, setReviewDueWords] = useState<any[] | null>(null);
  const [reviewCurrentIndex, setReviewCurrentIndex] = useState<number>(0);
  const [reviewRatings, setReviewRatings] = useState<any[]>([]);
  const [reviewGoalCelebrated, setReviewGoalCelebrated] = useState<boolean>(false);
  const [reviewNextReviewIso, setReviewNextReviewIso] = useState<string | null>(null);

  // Saving state for loading feedback in modal
  const [isSaving, setIsSaving] = useState(false);
  const [pullToRefresh, setPullToRefresh] = useState({ distance: 0, refreshing: false });

  // ─── IELTS Module State ──────────────────────────────
  const [selectedIeltsQuestion, setSelectedIeltsQuestion] = useState<IeltsQuestion | null>(null);
  const [ieltsWritingDraft, setIeltsWritingDraft] = useState<string>('');
  const [ieltsFeedbackData, setIeltsFeedbackData] = useState<IeltsAiFeedback | null>(null);
  const [ieltsUserAnswer, setIeltsUserAnswer] = useState<string>('');
  const [isIeltsGrading, setIsIeltsGrading] = useState(false);
  const [ieltsSpeakingAudioBase64, setIeltsSpeakingAudioBase64] = useState<string>('');
  const [ieltsSpeakingAudioMime, setIeltsSpeakingAudioMime] = useState<string>('audio/webm');
  const [isSpeakingMockTest, setIsSpeakingMockTest] = useState(false);

  // Ref to track lessonData for beforeunload warning (avoids stale closure)
  const lessonDataRef = useRef(lessonData);

  useEffect(() => {
    lessonDataRef.current = lessonData;
  }, [lessonData]);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<DraftData | null>(null);

  // Periodic background cloud save (every 2 minutes)
  useAutoSave({
    phase,
    hasLessonData: !!lessonData,
    onAutoSave: async () => {
      try {
        await saveCurrentLesson();
        showToast('Đã tự động lưu tiến trình học ✓', 'success');
      } catch (err) {
        console.warn('[AutoSave] Periodic cloud auto-save failed:', err);
      }
    },
    intervalMs: 120000,
  });

  // Local draft auto-save (localStorage) with 3s debounce
  useEffect(() => {
    if (!lessonData) {
      // Chỉ xoá nháp khi đã thoát khỏi các phase học tập
      const isOutOfLesson = ![
        AppPhase.FLASHCARDS,
        AppPhase.STORY,
        AppPhase.QUIZ,
        AppPhase.FILL_BLANK,
      ].includes(phase);

      if (isOutOfLesson) {
        clearDraft();
      }
      return;
    }

    const timer = setTimeout(() => {
      saveDraft({
        lessonData,
        lessonSettings,
        lessonWords,
        phase,
        currentRecordId,
        flashcardIndex,
        lessonMasteryMap,
      });
      console.log('[Draft] Auto-saved draft to localStorage');
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    lessonData,
    lessonSettings,
    lessonWords,
    phase,
    currentRecordId,
    flashcardIndex,
    lessonMasteryMap,
  ]);

  // Check for draft on login / user session loaded
  useEffect(() => {
    if (currentUser && hasDraft()) {
      const draft = loadDraft();
      if (draft && draft.lessonData) {
        setRecoveredDraft(draft);
        setShowRecoveryModal(true);
      }
    }
  }, [currentUser]);

  const handleRestoreDraft = () => {
    if (recoveredDraft) {
      setLessonData(recoveredDraft.lessonData);
      setLessonSettings(recoveredDraft.lessonSettings);
      setLessonWords(recoveredDraft.lessonWords);
      setPhase(recoveredDraft.phase);
      setCurrentRecordId(recoveredDraft.currentRecordId);
      setFlashcardIndex(recoveredDraft.flashcardIndex);
      setLessonMasteryMap(recoveredDraft.lessonMasteryMap);
      showToast('Đã khôi phục bài học từ bản nháp thành công!', 'success');
    }
    setShowRecoveryModal(false);
    setRecoveredDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowRecoveryModal(false);
    setRecoveredDraft(null);
  };


  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vocabMaster_theme') === 'dark' ||
        (!('vocabMaster_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vocabMaster_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vocabMaster_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    let startY = 0;
    let tracking = false;
    let latestDistance = 0;
    const threshold = 90;

    const isEditableTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return !!element?.closest('input, textarea, select, [contenteditable="true"]');
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (window.innerWidth > 768 || window.scrollY > 0 || isEditableTarget(event.target)) {
        tracking = false;
        return;
      }
      tracking = true;
      latestDistance = 0;
      startY = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!tracking || pullToRefresh.refreshing) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startY;
      if (delta <= 0 || window.scrollY > 0) {
        latestDistance = 0;
        setPullToRefresh((state: { distance: number; refreshing: boolean }) => ({ ...state, distance: 0 }));
        return;
      }

      latestDistance = Math.min(130, delta * 0.55);
      setPullToRefresh((state: { distance: number; refreshing: boolean }) => ({ ...state, distance: latestDistance }));
      if (delta > 12) event.preventDefault();
    };

    const handleTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (latestDistance >= threshold) {
        setPullToRefresh({ distance: threshold, refreshing: true });
        window.location.reload();
      } else {
        latestDistance = 0;
        setPullToRefresh((state: { distance: number; refreshing: boolean }) => ({ ...state, distance: 0 }));
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [pullToRefresh.refreshing]);

  useEffect(() => {
    let initialCheckDone = false;

    const checkSession = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession());
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          setCurrentUser({
            id: session.user.id,
            username: profile.username,
            displayName: profile.display_name,
          });
          setPhase(AppPhase.DASHBOARD);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        const cachedSession = getCachedSession();
        if (cachedSession?.user?.id && cachedSession?.access_token) {
          setCurrentUser(appUserFromAuthUser(cachedSession.user));
          setPhase(AppPhase.DASHBOARD);
        }
      } finally {
        initialCheckDone = true;
        setIsCheckingSession(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Only allow sign-out when it was explicitly triggered by the user.
        // All other SIGNED_OUT events (transient network errors, tab-switch
        // token refresh failures, etc.) are ignored to prevent session loss.
        if (!isExplicitLogout) {
          console.warn('[Auth] Ignoring transient SIGNED_OUT event (not explicit logout).');
          return;
        }

        // Reset the flag and proceed with actual logout
        isExplicitLogout = false;

        setCurrentUser(null);
        setLessonData(null);
        setPhase(AppPhase.LANDING);
      } else if (event === 'SIGNED_IN' && session?.user && initialCheckDone) {
        // Only handle SIGNED_IN after initial check is done to avoid
        // race conditions with checkSession running in parallel.
        try {
          const profile = await getProfile(session.user.id);
          setCurrentUser({
            id: session.user.id,
            username: profile.username,
            displayName: profile.display_name,
          });
          setPhase(AppPhase.DASHBOARD);
        } catch (err) {
          console.error('Failed to get profile after OAuth:', err);
          setCurrentUser(appUserFromAuthUser(session.user));
          setPhase(AppPhase.DASHBOARD);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Visibility change: stop auto-refresh when tab hidden, resume when visible.
  // This prevents the SDK from attempting token refreshes in a throttled
  // background tab (which would fail and burn tokens), and ensures a
  // reliable, immediate refresh when the user returns.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resumeAuthRefresh();
      } else {
        pauseAuthRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Warn user before closing/refreshing the page if they have unsaved lesson data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lessonDataRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom messages but still show a generic prompt
        e.returnValue = 'Bạn có bài học chưa lưu. Bạn có chắc muốn rời trang?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleLogin = async () => {
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession());
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setCurrentUser({
          id: session.user.id,
          username: profile.username,
          displayName: profile.display_name,
        });
        setPhase(AppPhase.DASHBOARD);
      }
    } catch (err) {
      console.error('Failed to get profile after login:', err);
      const cachedSession = getCachedSession();
      if (cachedSession?.user?.id) {
        setCurrentUser(appUserFromAuthUser(cachedSession.user));
        setPhase(AppPhase.DASHBOARD);
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Bạn có chắc muốn đăng xuất?');
    if (!confirmed) return;
    isExplicitLogout = true;
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
      isExplicitLogout = false;
    }
  };

  const handleGenerate = async (text: string, settings: UserSettings) => {
    setIsLoading(true);
    setError(null);
    setLessonSettings(settings);
    setLessonWords(text);
    setFlashcardIndex(0);
    setLessonMasteryMap({});
    try {
      const data = await generateLessonContent(text, settings.level, settings.topic);
      setLessonData(data);
      setCurrentRecordId(null);
      setPhase(AppPhase.FLASHCARDS);
    } catch (err) {
      console.error(err);
      setError("Failed to generate lesson. Please try again or check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentLesson = async (overrideData?: GeneratedLesson) => {
    if (!currentUser) throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập.');
    if (!lessonSettings) throw new Error('Thiếu cấu hình bài học (level/topic).');
    const dataToSave = overrideData || lessonData;
    if (!dataToSave) throw new Error('Không có dữ liệu bài học để lưu.');

    try {
      console.log("Auto-saving lesson...");
      // Clean payload: strip the massive base64 audio
      let strippedData = dataToSave;
      let audioToSave = dataToSave.story?.audioBase64;
      if (audioToSave && strippedData.story) {
        strippedData = {
          ...dataToSave,
          story: {
            ...dataToSave.story,
            audioBase64: undefined
          }
        };
      }

      const savedRecord = await saveLearningRecord({
        id: currentRecordId || undefined,
        user_id: currentUser.id,
        topic: lessonSettings.topic || 'General',
        level: lessonSettings.level,
        words: lessonWords,
        quiz_score: 0, // Preserve score? Ideally yes, but we track score in history. 
        // For now, 0 or existing score if we fetched it? 
        // We'll trust the latest "save" updates content. 
        // Quiz completion handles score specifically.
        quiz_total: dataToSave.quiz.length,
        lesson_data: strippedData,
      });
      if (savedRecord && savedRecord.id) {
        setCurrentRecordId(savedRecord.id);
        console.log("Lesson saved with ID:", savedRecord.id);

        if (audioToSave) {
          saveLessonAudio(savedRecord.id, audioToSave).then(success => {
            if (success) console.log("Audio saved to lesson_audio table.");
            else console.warn("Could not save audio to lesson_audio table.");
          });
        }
      }
    } catch (err) {
      console.error('Failed to save learning record:', err);
      throw err; // propagate to handleModalYes
    }
  };



  const handleQuizComplete = async (score: number, total: number) => {
    if (!currentUser || !lessonSettings || !lessonData) return;
    try {
      let strippedData = lessonData;
      let audioToSave = lessonData.story?.audioBase64;
      if (audioToSave && strippedData.story) {
        strippedData = {
          ...lessonData,
          story: {
            ...lessonData.story,
            audioBase64: undefined
          }
        };
      }

      const savedRecord = await saveLearningRecord({
        id: currentRecordId || undefined,
        user_id: currentUser.id,
        topic: lessonSettings.topic || 'General',
        level: lessonSettings.level,
        words: lessonWords,
        quiz_score: score,
        quiz_total: total,
        lesson_data: strippedData,
      });
      if (savedRecord && savedRecord.id) {
        setCurrentRecordId(savedRecord.id);
        if (audioToSave) {
          saveLessonAudio(savedRecord.id, audioToSave);
        }
      }
    } catch (err) {
      console.error('Failed to save quiz complete record:', err);
    }

    // Adaptive difficulty: after the record is saved, check whether recent
    // performance qualifies for a level suggestion. checkLevelSuggestion
    // already handles the C2-upgrade / A1-downgrade boundaries by returning
    // null when getNextLevel has no valid neighbour.
    try {
      const direction = await checkLevelSuggestion(currentUser.id);
      if (!direction) return;

      const goals = await getOrCreateUserGoals(currentUser.id);
      const currentLevel = goals.preferred_level as DifficultyLevel;
      const nextLevel = getNextLevel(
        currentLevel,
        direction === 'upgrade' ? 'up' : 'down',
      );
      if (!nextLevel) return;

      // Skip if the user previously dismissed this same suggestion to avoid
      // pestering them on every quiz.
      if (wasLevelSuggestionDismissed(currentUser.id, direction, currentLevel)) {
        return;
      }

      setLevelSuggestion({ direction, currentLevel, nextLevel });
    } catch (err) {
      console.error('Failed to check level suggestion:', err);
    }
  };

  const handleAcceptLevelSuggestion = async () => {
    if (!currentUser || !levelSuggestion) return;
    const { nextLevel, direction } = levelSuggestion;
    try {
      await acceptLevelChange(currentUser.id, nextLevel);
      showToast(
        direction === 'upgrade'
          ? `Đã nâng lên cấp độ ${nextLevel}. Chúc bạn học tốt!`
          : `Đã chuyển về cấp độ ${nextLevel}. Cùng củng cố nền tảng nhé!`,
        'success',
      );
    } catch (err) {
      console.error('Failed to accept level change:', err);
      showToast('Không thể cập nhật cấp độ. Vui lòng thử lại.', 'info');
    } finally {
      setLevelSuggestion(null);
    }
  };

  const handleDeclineLevelSuggestion = () => {
    if (!currentUser || !levelSuggestion) return;
    const { direction, currentLevel } = levelSuggestion;
    dismissLevelSuggestion(currentUser.id, direction, currentLevel);
    setLevelSuggestion(null);
  };

  const handleOpenLesson = async (record: LearningRecord) => {
    setCurrentRecordId(record.id);
    setIsLoading(true);
    setError(null);
    setFlashcardIndex(0);
    setLessonMasteryMap({});
    try {
      // Lazy-load the full record (with lesson_data) only when clicked
      const fullRecord = await getLearningRecordFull(record.id);
      if (fullRecord?.lesson_data) {
        setLessonData(fullRecord.lesson_data as GeneratedLesson);
        setLessonSettings({ level: record.level as any, topic: record.topic });
        setLessonWords(record.words);
        setPhase(AppPhase.FLASHCARDS);
      } else {
        // No saved lesson data — regenerate from saved words
        await handleGenerate(record.words, { level: record.level as any, topic: record.topic });
      }
    } catch (err) {
      console.error('Failed to load lesson:', err);
      setError('Không thể tải bài học. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioGenerated = (base64: string) => {
    if (lessonData) {
      // Create updated object
      const updatedLesson = {
        ...lessonData,
        story: {
          ...lessonData.story,
          audioBase64: base64
        }
      };

      // Update state
      setLessonData(updatedLesson);

      // Auto-save immediately to persist the expensive audio
      // note: we can't use 'lessonData' state here because it might be stale in closure?
      // actually saveCurrentLesson uses state, so better pass updatedLesson explicitly
      // But saveCurrentLesson reads state?
      // Let's modify saveCurrentLesson to accept override
      // passing updatedLesson to the next function...

      // Auto-save immediately to persist the expensive audio
      void saveCurrentLesson(updatedLesson).catch((err) => {
        console.warn('Could not auto-save generated audio:', err);
      });
    }
  };



  const navigateWithConfirm = (targetPhase: AppPhase) => {
    if (lessonData && phase !== AppPhase.DASHBOARD && targetPhase === AppPhase.DASHBOARD) {
      setPendingNavTarget(targetPhase);
      setShowSaveModal(true);
      return;
    }
    setMobileMenuOpen(false);
    setPhase(targetPhase);
  };

  const handleModalNo = () => {
    setShowSaveModal(false);
    setLessonData(null);
    setMobileMenuOpen(false);
    if (pendingNavTarget) setPhase(pendingNavTarget);
    setPendingNavTarget(null);
  };

  const handleModalYes = async () => {
    setIsSaving(true);
    try {
      await saveCurrentLesson();
      showToast('Đã lưu bài học thành công!', 'success');
      setShowSaveModal(false);
      setLessonData(null);
      setCurrentRecordId(null);
      setMobileMenuOpen(false);
      if (pendingNavTarget) setPhase(pendingNavTarget);
      setPendingNavTarget(null);
    } catch (err: any) {
      console.error('Failed to save lesson:', err);
      showToast(err?.message || 'Không thể lưu bài học. Vui lòng kiểm tra kết nối.', 'info');
      // Dismiss modal anyway to prevent softlock
      setShowSaveModal(false);
      setLessonData(null);
      setCurrentRecordId(null);
      setMobileMenuOpen(false);
      if (pendingNavTarget) setPhase(pendingNavTarget);
      setPendingNavTarget(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalContinue = () => {
    setShowSaveModal(false);
    setPendingNavTarget(null);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const renderContent = () => {
    switch (phase) {
      case AppPhase.LANDING:
        return <LandingPage onGetStarted={() => setPhase(AppPhase.AUTH)} />;

      case AppPhase.AUTH:
        return <AuthPage onLogin={handleLogin} onBack={() => setPhase(AppPhase.LANDING)} />;

      case AppPhase.DASHBOARD:
        return (
          <Dashboard
            onGenerate={handleGenerate}
            isLoading={isLoading}
            userId={currentUser?.id ?? ''}
            onStartReview={() => setPhase(AppPhase.REVIEW_SESSION)}
          />
        );

      case AppPhase.HISTORY:
        return currentUser ? (
          <LearningHistory
            userId={currentUser.id}
            onStartLesson={() => setPhase(AppPhase.DASHBOARD)}
            onOpenLesson={handleOpenLesson}
            isLoadingLesson={isLoading}
          />
        ) : null;

      case AppPhase.ANALYTICS:
        return currentUser ? (
          <AnalyticsDashboard
            userId={currentUser.id}
            onBack={() => setPhase(AppPhase.DASHBOARD)}
            onStartLesson={() => setPhase(AppPhase.DASHBOARD)}
            onStartTargetedLesson={async (lesson: GeneratedLesson) => {
              // Resolve the user's current preferred level so the targeted
              // practice lesson runs at the right difficulty. Fall back to
              // the active lesson's level (if any), then B1.
              let level: DifficultyLevel = (lessonSettings?.level ?? DifficultyLevel.B1) as DifficultyLevel;
              try {
                const goals = await getOrCreateUserGoals(currentUser.id);
                if (goals?.preferred_level) {
                  level = goals.preferred_level as DifficultyLevel;
                }
              } catch (err) {
                console.error('Failed to fetch preferred level for targeted lesson:', err);
              }
              setLessonData(lesson);
              setLessonSettings({ level, topic: 'Targeted Practice' });
              setLessonWords(lesson.flashcards.map((c: FlashcardData) => c.word).join(', '));
              setCurrentRecordId(null);
              setPhase(AppPhase.FLASHCARDS);
            }}
          />
        ) : null;

      case AppPhase.FLASHCARDS:
        return lessonData && currentUser ? (
          <Flashcards
            cards={lessonData.flashcards}
            userId={currentUser.id}
            onNextPhase={() => setPhase(AppPhase.STORY)}
            initialIndex={flashcardIndex}
            onIndexChange={setFlashcardIndex}
            masteryMap={lessonMasteryMap}
            onMasteryMapChange={setLessonMasteryMap}
          />
        ) : null;

      case AppPhase.REVIEW_SESSION:
        return currentUser ? (
          <ReviewSession
            userId={currentUser.id}
            onComplete={() => {
              setReviewDueWords(null);
              setReviewCurrentIndex(0);
              setReviewRatings([]);
              setReviewGoalCelebrated(false);
              setPhase(AppPhase.DASHBOARD);
            }}
            onBack={() => setPhase(AppPhase.DASHBOARD)}
            onShowToast={showToast}
            dueWords={reviewDueWords}
            setDueWords={setReviewDueWords}
            currentIndex={reviewCurrentIndex}
            setCurrentIndex={setReviewCurrentIndex}
            ratings={reviewRatings}
            setRatings={setReviewRatings}
            goalCelebrated={reviewGoalCelebrated}
            setGoalCelebrated={setReviewGoalCelebrated}
            nextReviewIso={reviewNextReviewIso}
            setNextReviewIso={setReviewNextReviewIso}
          />
        ) : null;

      case AppPhase.STORY:
        return lessonData ? (
          <StoryMode
            story={lessonData.story}
            vocabList={lessonData.flashcards}
            onNextPhase={() => setPhase(AppPhase.QUIZ)}
            onAudioGenerated={handleAudioGenerated}
          />
        ) : null;

      case AppPhase.QUIZ:
        return lessonData ? (
          <QuizMode
            questions={lessonData.quiz}
            onRestart={() => navigateWithConfirm(AppPhase.DASHBOARD)}
            onComplete={handleQuizComplete}
            onNextPhase={() => setPhase(AppPhase.FILL_BLANK)}
            userId={currentUser?.id}
          />
        ) : null;

      case AppPhase.FILL_BLANK:
        return lessonData ? (
          <FillBlankMode
            cards={lessonData.flashcards}
            onFinish={() => navigateWithConfirm(AppPhase.DASHBOARD)}
            onSave={async () => {
              console.log('[Save] Starting save lesson...', {
                hasUser: !!currentUser,
                hasSettings: !!lessonSettings,
                hasLesson: !!lessonData,
                userId: currentUser?.id,
                topic: lessonSettings?.topic,
                level: lessonSettings?.level,
                words: lessonWords?.substring(0, 50),
                quizCount: lessonData?.quiz?.length,
              });

              if (!currentUser) {
                throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
              }
              if (!lessonSettings) {
                throw new Error('Thiếu thông tin bài học (level/topic).');
              }
              if (!lessonData) {
                throw new Error('Không có dữ liệu bài học để lưu.');
              }
              if (!lessonWords || !lessonWords.trim()) {
                throw new Error('Danh sách từ vựng trống.');
              }

              try {
                let strippedData = lessonData;
                let audioToSave = lessonData.story?.audioBase64;
                if (audioToSave && strippedData.story) {
                  strippedData = {
                    ...lessonData,
                    story: {
                      ...lessonData.story,
                      audioBase64: undefined
                    }
                  };
                }

                const savedRecord = await saveLearningRecord({
                  id: currentRecordId || undefined,
                  user_id: currentUser.id,
                  topic: lessonSettings.topic || 'General',
                  level: lessonSettings.level,
                  words: lessonWords,
                  quiz_score: 0,
                  quiz_total: lessonData.quiz.length,
                  lesson_data: strippedData,
                });
                console.log('[Save] Saved successfully:', savedRecord?.id);
                if (savedRecord && savedRecord.id) {
                  setCurrentRecordId(savedRecord.id);
                  if (audioToSave) {
                    saveLessonAudio(savedRecord.id, audioToSave).then(success => {
                      if (success) console.log("Audio saved successfully from FillBlank Save.");
                    });
                  }
                }
              } catch (err: any) {
                console.error('[Save] Failed:', err);
                throw new Error(err?.message || 'Không thể lưu bài học. Vui lòng kiểm tra kết nối.');
              }
            }}
          />
        ) : null;

      // ─── IELTS Writing ──────────────────────────────
      case AppPhase.IELTS_WRITING_HUB:
        return (
          <IeltsWritingHub
            onSelectQuestion={(q) => {
              setSelectedIeltsQuestion(q);
              setIeltsWritingDraft('');
              setIeltsFeedbackData(null);
              setIeltsUserAnswer('');
              setPhase(AppPhase.IELTS_WRITING_PRACTICE);
            }}
          />
        );

      case AppPhase.IELTS_WRITING_PRACTICE:
        return selectedIeltsQuestion ? (
          <IeltsWritingPractice
            question={selectedIeltsQuestion}
            onSubmit={async (answer, durationSeconds) => {
              setIsIeltsGrading(true);
              setIeltsUserAnswer(answer);
              try {
                const feedback = await gradeWritingTask(
                  selectedIeltsQuestion.prompt,
                  answer,
                  selectedIeltsQuestion.questionType,
                  selectedIeltsQuestion.targetBand,
                  selectedIeltsQuestion.taskOrPart as 'task_1' | 'task_2'
                );
                setIeltsFeedbackData(feedback);
                setPhase(AppPhase.IELTS_WRITING_FEEDBACK);
              } catch (err) {
                console.error('Writing grading failed:', err);
                showToast('Không thể chấm bài. Vui lòng thử lại.', 'info');
              } finally {
                setIsIeltsGrading(false);
              }
            }}
            onBack={() => setPhase(AppPhase.IELTS_WRITING_HUB)}
            isGrading={isIeltsGrading}
            initialDraft={ieltsWritingDraft}
          />
        ) : null;

      case AppPhase.IELTS_WRITING_FEEDBACK:
        return selectedIeltsQuestion && ieltsFeedbackData ? (
          <IeltsWritingFeedback
            question={selectedIeltsQuestion}
            userAnswer={ieltsUserAnswer}
            feedback={ieltsFeedbackData}
            onRewrite={() => {
              setIeltsWritingDraft(ieltsUserAnswer);
              setIeltsFeedbackData(null);
              setPhase(AppPhase.IELTS_WRITING_PRACTICE);
            }}
            onBackToHub={() => {
              setSelectedIeltsQuestion(null);
              setIeltsFeedbackData(null);
              setIeltsWritingDraft('');
              setIeltsUserAnswer('');
              setPhase(AppPhase.IELTS_WRITING_HUB);
            }}
          />
        ) : null;

      // ─── IELTS Speaking ──────────────────────────────
      case AppPhase.IELTS_SPEAKING_HUB:
        return (
          <IeltsSpeakingHub
            onSelectQuestion={(q) => {
              setSelectedIeltsQuestion(q);
              setIeltsFeedbackData(null);
              setIeltsUserAnswer('');
              setIsSpeakingMockTest(false);
              setPhase(AppPhase.IELTS_SPEAKING_PRACTICE);
            }}
            onStartMockTest={() => {
              setIsSpeakingMockTest(true);
              const p1Questions = speakingPart1Questions.filter(q => q.taskOrPart === 'part_1');
              const randomQ = p1Questions[Math.floor(Math.random() * p1Questions.length)] || speakingPart1Questions[0];
              setSelectedIeltsQuestion(randomQ);
              setIeltsFeedbackData(null);
              setIeltsUserAnswer('');
              setPhase(AppPhase.IELTS_SPEAKING_PRACTICE);
            }}
          />
        );

      case AppPhase.IELTS_SPEAKING_PRACTICE:
        return selectedIeltsQuestion ? (
          <IeltsSpeakingPractice
            question={selectedIeltsQuestion}
            isMockTest={isSpeakingMockTest}
            onSubmit={async (transcript, audioBase64, audioMimeType, durationSeconds) => {
              setIsIeltsGrading(true);
              setIeltsUserAnswer(transcript);
              setIeltsSpeakingAudioBase64(audioBase64);
              setIeltsSpeakingAudioMime(audioMimeType);
              try {
                const feedback = await gradeSpeakingAnswer(
                  selectedIeltsQuestion.prompt,
                  transcript,
                  isSpeakingMockTest ? 'part_3' : selectedIeltsQuestion.taskOrPart,
                  selectedIeltsQuestion.targetBand,
                  audioBase64,
                  audioMimeType
                );
                setIeltsFeedbackData(feedback);
                setPhase(AppPhase.IELTS_SPEAKING_FEEDBACK);
              } catch (err) {
                console.error('Speaking grading failed:', err);
                showToast('Không thể chấm bài. Vui lòng thử lại.', 'info');
              } finally {
                setIsIeltsGrading(false);
              }
            }}
            onBack={() => {
              setIsSpeakingMockTest(false);
              setPhase(AppPhase.IELTS_SPEAKING_HUB);
            }}
            isGrading={isIeltsGrading}
          />
        ) : null;

      case AppPhase.IELTS_SPEAKING_FEEDBACK:
        return selectedIeltsQuestion && ieltsFeedbackData ? (
          <IeltsSpeakingFeedback
            question={selectedIeltsQuestion}
            userTranscript={ieltsUserAnswer}
            feedback={ieltsFeedbackData}
            onRetry={() => {
              setIeltsFeedbackData(null);
              setIeltsUserAnswer('');
              setPhase(AppPhase.IELTS_SPEAKING_PRACTICE);
            }}
            onBackToHub={() => {
              setSelectedIeltsQuestion(null);
              setIeltsFeedbackData(null);
              setIeltsUserAnswer('');
              setIsSpeakingMockTest(false);
              setPhase(AppPhase.IELTS_SPEAKING_HUB);
            }}
          />
        ) : null;

      default:
        return <div>Unknown Phase</div>;
    }
  };

  const lessonSteps = [
    { id: AppPhase.DASHBOARD, label: "Input" },
    { id: AppPhase.FLASHCARDS, label: "Learn" },
    { id: AppPhase.STORY, label: "Story" },
    { id: AppPhase.QUIZ, label: "Quiz" },
    { id: AppPhase.FILL_BLANK, label: "Review" },
  ];

  const currentStepIdx = lessonSteps.findIndex(s => s.id === phase);
  const showHeader = phase !== AppPhase.LANDING && phase !== AppPhase.AUTH;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-200 selection:text-blue-900">
      {(pullToRefresh.distance > 0 || pullToRefresh.refreshing) && (
        <div
          className="fixed left-1/2 top-3 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200 md:hidden"
          style={{
            transform: `translate(-50%, ${Math.max(0, pullToRefresh.distance - 44)}px)`,
            opacity: Math.min(1, pullToRefresh.distance / 70),
          }}
        >
          <Loader2 className={`h-4 w-4 text-blue-600 ${pullToRefresh.refreshing ? 'animate-spin' : ''}`} />
          {pullToRefresh.refreshing
            ? 'Đang tải lại...'
            : pullToRefresh.distance >= 90
              ? 'Thả để tải lại'
              : 'Kéo xuống để tải lại'}
        </div>
      )}
      {showHeader && (
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigateWithConfirm(AppPhase.DASHBOARD)}>
              <img src="/avatarandlogo.png" className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shadow-sm border border-slate-100 dark:border-slate-700" alt="Logo" />
              <span className="font-bold text-sm sm:text-base tracking-tight hidden sm:inline">VocabMaster</span>
            </div>

            {/* Desktop Stepper */}
            {lessonData && currentStepIdx >= 0 && (
              <div className="hidden lg:flex gap-1 items-center">
                {lessonSteps.map((step, idx) => {
                  const isActive = step.id === phase;
                  const isPassed = currentStepIdx > idx;
                  const isDisabled = !lessonData && step.id !== AppPhase.DASHBOARD;

                  return (
                    <div key={step.id} className="flex items-center">
                      <button
                        onClick={() => !isDisabled && (step.id === AppPhase.DASHBOARD ? navigateWithConfirm(step.id) : setPhase(step.id))}
                        disabled={isDisabled}
                        className={`
                          px-3 py-1 rounded-full text-xs font-bold
                          ${isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' : ''}
                          ${isPassed ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                          ${!isActive && !isPassed ? 'text-slate-400 hover:bg-slate-100' : ''}
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {step.label}
                      </button>
                      {idx < lessonSteps.length - 1 && (
                        <div className={`w-4 h-0.5 mx-0.5 rounded ${isPassed ? 'bg-green-300' : 'bg-slate-200'}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile step indicator - removed, using bottom nav instead */}

            {/* Right side */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Proactive Save Button during learning session */}
                {lessonData && (phase === AppPhase.FLASHCARDS || phase === AppPhase.STORY || phase === AppPhase.QUIZ || phase === AppPhase.FILL_BLANK) && (
                  <button
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        await saveCurrentLesson();
                        showToast('Đã lưu tiến trình bài học!', 'success');
                      } catch (err: any) {
                        console.error('Proactive save failed:', err);
                        showToast(err?.message || 'Không thể lưu bài học.', 'info');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-md text-xs font-bold shadow-sm"
                    title="Lưu tiến trình học chủ động"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden md:inline">{isSaving ? 'Đang lưu...' : 'Lưu bài học'}</span>
                  </button>
                )}

                <ConnectionIndicator />

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => {
                    if (lessonData && phase !== AppPhase.DASHBOARD && phase !== AppPhase.HISTORY) {
                      setPendingNavTarget(AppPhase.HISTORY);
                      setShowSaveModal(true);
                    } else {
                      setPhase(AppPhase.HISTORY);
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`
                    group relative flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1 rounded-md border shadow-sm
                    ${phase === AppPhase.HISTORY
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500 font-bold dark:ring-offset-slate-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900'
                    }
                  `}
                  title="Xem lịch sử học tập"
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs hidden md:inline">Lịch sử</span>
                </button>

                <button
                  onClick={() => {
                    if (lessonData && phase !== AppPhase.DASHBOARD && phase !== AppPhase.ANALYTICS) {
                      setPendingNavTarget(AppPhase.ANALYTICS);
                      setShowSaveModal(true);
                    } else {
                      setPhase(AppPhase.ANALYTICS);
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`
                    group relative flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1 rounded-md border shadow-sm
                    ${phase === AppPhase.ANALYTICS
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500 font-bold dark:ring-offset-slate-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-900'
                    }
                  `}
                  title="Xem thống kê học tập"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs hidden md:inline">Thống kê</span>
                </button>

                {/* IELTS Writing Nav Button */}
                <button
                  onClick={() => {
                    if (lessonData && phase !== AppPhase.DASHBOARD && phase !== AppPhase.IELTS_WRITING_HUB) {
                      setPendingNavTarget(AppPhase.IELTS_WRITING_HUB);
                      setShowSaveModal(true);
                    } else {
                      setPhase(AppPhase.IELTS_WRITING_HUB);
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`
                    group relative flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1 rounded-md border shadow-sm
                    ${[AppPhase.IELTS_WRITING_HUB, AppPhase.IELTS_WRITING_PRACTICE, AppPhase.IELTS_WRITING_FEEDBACK].includes(phase)
                      ? 'bg-blue-100 text-blue-700 border-blue-200 ring-1 ring-blue-500 font-bold dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:ring-offset-slate-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900'
                    }
                  `}
                  title="IELTS Writing"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs hidden md:inline">Writing</span>
                </button>

                {/* IELTS Speaking Nav Button */}
                <button
                  onClick={() => {
                    if (lessonData && phase !== AppPhase.DASHBOARD && phase !== AppPhase.IELTS_SPEAKING_HUB) {
                      setPendingNavTarget(AppPhase.IELTS_SPEAKING_HUB);
                      setShowSaveModal(true);
                    } else {
                      setPhase(AppPhase.IELTS_SPEAKING_HUB);
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`
                    group relative flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1 rounded-md border shadow-sm
                    ${[AppPhase.IELTS_SPEAKING_HUB, AppPhase.IELTS_SPEAKING_PRACTICE, AppPhase.IELTS_SPEAKING_FEEDBACK].includes(phase)
                      ? 'bg-rose-100 text-rose-700 border-rose-200 ring-1 ring-rose-500 font-bold dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700 dark:ring-offset-slate-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900'
                    }
                  `}
                  title="IELTS Speaking"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs hidden md:inline">Speaking</span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  <img src="/avatarandlogo.png" className="w-5 h-5 rounded-full object-cover border border-blue-100 dark:border-slate-700 shadow-sm" alt="Avatar" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[100px] truncate">{currentUser.displayName}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {showHeader ? (
        <main className={`max-w-6xl mx-auto px-4 py-6 sm:py-8 md:py-12 ${lessonData && currentStepIdx >= 0 ? 'pb-24 lg:pb-12' : ''}`}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-sm" role="alert">
              <strong className="font-bold">Error: </strong>
              <span>{error}</span>
              <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                <span className="block h-6 w-6">×</span>
              </button>
            </div>
          )}
          {renderContent()}
        </main>
      ) : (
        renderContent()
      )}

      {/* Desktop footer — hidden on mobile */}
      {showHeader && (
        <footer className="hidden sm:block py-6 text-center text-slate-400 text-xs sm:text-sm">
          <p>© 2024 VocabMaster. Powered by Gemini API.</p>
        </footer>
      )}

      {/* Mobile bottom nav — only when lesson is active */}
      {showHeader && lessonData && currentStepIdx >= 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] z-50 lg:hidden">
          <div className="flex items-stretch justify-around px-1 py-2">
            {lessonSteps.map((step, idx) => {
              const isActive = step.id === phase;
              const isPassed = currentStepIdx > idx;
              const icons = [
                <BookOpen className="w-5 h-5" />,
                <BookOpen className="w-5 h-5" />,
                <Headphones className="w-5 h-5" />,
                <HelpCircle className="w-5 h-5" />,
                <PenTool className="w-5 h-5" />,
              ];

              return (
                <button
                  key={step.id}
                  onClick={() => step.id === AppPhase.DASHBOARD ? navigateWithConfirm(step.id) : setPhase(step.id)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 transition-all ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : isPassed
                      ? 'text-green-600'
                      : 'text-slate-400'
                    }`}
                >
                  {icons[idx]}
                  <span className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-blue-600' : isPassed ? 'text-green-600' : 'text-slate-400'
                    }`}>
                    {step.label}
                  </span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Draft Recovery Modal */}
      {showRecoveryModal && recoveredDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 border border-slate-100 dark:border-slate-700">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Khôi phục bài học?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Hệ thống phát hiện bạn có một bài học chưa hoàn thành trước đó:
              </p>
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-left border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-400 dark:text-slate-500">Chủ đề:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{recoveredDraft.lessonSettings?.topic || 'General'}</div>
                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">
                    Cấp độ: {recoveredDraft.lessonSettings?.level || 'B1'}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {recoveredDraft.timestamp ? new Date(recoveredDraft.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleRestoreDraft}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all flex items-center justify-center gap-2"
              >
                Tiếp tục học
              </button>
              <button
                onClick={handleDiscardDraft}
                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Học bài mới (Xoá nháp)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Lesson Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Lưu bài học này?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Bạn có muốn lưu bài học hiện tại vào lịch sử không?
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                disabled={isSaving}
                onClick={handleModalYes}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu bài học'
                )}
              </button>
              <button
                disabled={isSaving}
                onClick={handleModalNo}
                className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Không lưu
              </button>
              <button
                disabled={isSaving}
                onClick={handleModalContinue}
                className="w-full py-2.5 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Học tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal completion / global notifications */}
      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'success'}
        onClose={() => setToast(null)}
      />

      {/* Adaptive difficulty: level upgrade/downgrade suggestion modal.
          Shown after a quiz when checkLevelSuggestion returns a direction
          and the user hasn't dismissed this same suggestion before. */}
      {levelSuggestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
            <div className="text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl ${
                  levelSuggestion.direction === 'upgrade'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                    : 'bg-amber-100 dark:bg-amber-900/40'
                }`}
                aria-hidden="true"
              >
                {levelSuggestion.direction === 'upgrade' ? '🎉' : '💪'}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {levelSuggestion.direction === 'upgrade'
                  ? `Bạn đang tiến bộ rất tốt! Nâng lên ${levelSuggestion.nextLevel}?`
                  : `Hãy củng cố nền tảng! Chuyển về ${levelSuggestion.nextLevel}?`}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {levelSuggestion.direction === 'upgrade'
                  ? `Kết quả gần đây cho thấy bạn đã sẵn sàng cho cấp độ cao hơn so với ${levelSuggestion.currentLevel}.`
                  : `Quay lại ${levelSuggestion.nextLevel} một thời gian sẽ giúp bạn vững vàng hơn ở ${levelSuggestion.currentLevel}.`}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleAcceptLevelSuggestion}
                className={`w-full py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all ${
                  levelSuggestion.direction === 'upgrade'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-emerald-200'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200'
                }`}
              >
                Chấp nhận
              </button>
              <button
                onClick={handleDeclineLevelSuggestion}
                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Giữ nguyên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IELTS AI ChatBox — floating widget, always visible when logged in */}
      {currentUser && showHeader && (
        <IeltsChatBox darkMode={darkMode} />
      )}
    </div>
  );
}

export default App;
