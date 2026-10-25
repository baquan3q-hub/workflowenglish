import React, { useState, useEffect, useRef } from 'react';
import { AppPhase, DifficultyLevel, GeneratedLesson, LessonProgress, SentenceItem, StepResult, UserSettings, FlashcardData, IeltsQuestion, IeltsAiFeedback, IeltsAttempt, IeltsSkill } from './types';
import { generateLessonContent } from './services/geminiService';
import { aiErrorMessage } from './services/aiClient';
import { generateSentences } from './services/sentenceService';
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
import VocabTestView from './views/VocabTestView';
import AnalyticsDashboard from './views/AnalyticsDashboard';
import VocabLibrary from './views/VocabLibrary';
import LessonSummary from './views/LessonSummary';
import SentencePractice from './views/SentencePractice';
import { LessonStepper } from './components/LessonStepper';
import { lessonStepStates } from './services/lessonSummaryLogic';
import IeltsHome from './views/IeltsHome';
import IeltsErrorLog from './views/IeltsErrorLog';
import IeltsLibrary from './views/IeltsLibrary';
import IeltsWritingHub from './views/IeltsWritingHub';
import IeltsWritingStudy, { type WritingStudyTab } from './views/IeltsWritingStudy';
import IeltsWritingPractice from './views/IeltsWritingPractice';
import IeltsWritingFeedback from './views/IeltsWritingFeedback';
import IeltsSpeakingHub from './views/IeltsSpeakingHub';
import IeltsSpeakingStudy, { type SpeakingStudyTab } from './views/IeltsSpeakingStudy';
import IeltsSpeakingPractice, { type SpeakingSubmission } from './views/IeltsSpeakingPractice';
import IeltsSpeakingMock, { type MockSubmission } from './views/IeltsSpeakingMock';
import IeltsSpeakingFeedback from './views/IeltsSpeakingFeedback';
import IeltsListeningHub from './views/IeltsListeningHub';
import IeltsListeningPractice from './views/IeltsListeningPractice';
import IeltsListeningResult from './views/IeltsListeningResult';
import IeltsListeningDictation from './views/IeltsListeningDictation';
import IeltsListeningDrill from './views/IeltsListeningDrill';
import IeltsReadingHub from './views/IeltsReadingHub';
import IeltsReadingPractice, { clearReadingDraft } from './views/IeltsReadingPractice';
import IeltsReadingResult from './views/IeltsReadingResult';
import { getReadingTest, type ReadingAnswers } from './data/ielts/reading';
import { readingAttemptLabels, scorePassages, sessionPassages as readingSessionPassages, type ReadingMode } from './services/readingLogic';
import { appendDrillLog, groupRecords, isDrillTestId, parseDrillTestId, resolveReadingTest } from './services/readingDrill';
import type { ReadingKind } from './data/ielts/readingLessons';
import { gradeWritingTask } from './services/ieltsWritingService';
import { clearWritingDraft, examInfo, writingAttemptDetails, type WritingMode } from './services/writingPracticeLogic';
import { gradeSpeakingAnswer } from './services/ieltsSpeakingService';
import { fluencySummaryForGrader, isFluencyMetrics, type FluencyMetrics } from './services/fluencyLogic';
import { saveIeltsAttempt, saveListeningAttempt, saveReadingAttempt, resolveAttemptQuestion, isListeningDetails, isReadingDetails, getPreviousWritingAttempt } from './services/ieltsAttemptService';
import { getListeningTest, type ListeningAnswers } from './data/ielts/listening';
import { isGeneratedTestId, loadGeneratedTest } from './services/listeningGenerationService';
import { isLibraryTestId } from './services/listeningLibraryLogic';
import { isAppAdmin, loadLibraryTest, registerPreview } from './services/listeningLibraryService';
import { loadReadingLibraryTest, registerReadingPreview } from './services/readingLibraryService';
import { isReadingLibraryTestId } from './services/readingLibraryLogic';
import { isGeneratedReadingTestId } from './services/readingGenerationLogic';
import { loadGeneratedReadingTest } from './services/readingGenerationService';
import IeltsAdmin, { type AdminEditing } from './views/IeltsAdmin';
import { attemptLabels, scoreSections, sessionSections, type ListeningMode } from './services/listeningLogic';
import { Toast, type ToastAction, type ToastType } from './components/Common';
import { Loader2, LogOut, History, BookOpen, Save, Sun, Moon } from 'lucide-react';
import { AppNavDesktop, AppNavMobile, type NavRequest } from './components/AppNav';
import { isLessonPhase, showsTabBar, type AnalyticsSection } from './components/navConfig';
import { getDueWordCount } from './services/masteryService';
import { getWordsByIds } from './services/vocabLibraryService';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { saveDraft, loadDraft, clearDraft, DraftData } from './services/draftService';
import { useAutoSave } from './services/autoSaveService';
import IeltsChatBox from './components/IeltsChatBox';
import { TAB_TONE, TONE_HOVER, toneClasses } from './components/ui/palette';

/** Quiet header action: slate label, coloured icon, its tone's tint on hover. */
const headerAction = (tone: keyof typeof TAB_TONE) =>
  `press group inline-flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${TONE_HOVER[TAB_TONE[tone]]}`;
const headerIcon = (tone: keyof typeof TAB_TONE) => `icon-pop ${toneClasses(TAB_TONE[tone]).text}`;


interface AppUser {
  id: string;
  username: string;
  displayName: string;
}

/** Back button of the IELTS Library, by the screen it was opened from. */
const LIBRARY_BACK_LABELS: Partial<Record<AppPhase, string>> = {
  [AppPhase.IELTS_ERROR_LOG]: 'Sổ lỗi',
  [AppPhase.IELTS_READING_HUB]: 'Reading',
  [AppPhase.IELTS_READING_RESULT]: 'Kết quả',
};

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
  const [sentencesGenerating, setSentencesGenerating] = useState(false);
  // Luyện lại câu sai from the dashboard, outside any lesson.
  const [sentenceDrill, setSentenceDrill] = useState<SentenceItem[]>([]);
  const [lessonWords, setLessonWords] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<AppPhase | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  // Top-center notification (e.g. daily goal reached celebration).
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    action?: ToastAction;
    durationMs?: number;
  } | null>(null);
  /** Part opened in Chép chính tả; null lets the learner pick. */
  const [ieltsDictation, setIeltsDictation] = useState<{ testId: string; sectionId: string } | null>(null);
  const showToast = (
    message: string,
    type: ToastType = 'success',
    options: { action?: ToastAction; durationMs?: number } = {},
  ) => setToast({ message, type, ...options });

  // App navigation: which part of the analytics screen to open ("Sổ từ" lives
  // there until it gets its own screen), the due-word badge, and the lesson
  // step to resume from the dashboard.
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>('overview');
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [lastLessonPhase, setLastLessonPhase] = useState<AppPhase>(AppPhase.FLASHCARDS);
  // Lesson to preselect when Sổ từ is opened from the dashboard's recent lessons.
  const [libraryLessonId, setLibraryLessonId] = useState<string | null>(null);

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
  const [ieltsWritingMode, setIeltsWritingMode] = useState<WritingMode>('practice');
  /** How the essay on the feedback screen was written, when it was an exam. */
  const [ieltsWritingExam, setIeltsWritingExam] = useState<{ autoSubmitted: boolean } | null>(null);
  const [ieltsFeedbackData, setIeltsFeedbackData] = useState<IeltsAiFeedback | null>(null);
  const [ieltsUserAnswer, setIeltsUserAnswer] = useState<string>('');
  /** The attempt before the one on screen (same prompt), for the band change and the diff. */
  const [ieltsWritingPrevious, setIeltsWritingPrevious] = useState<{ answer: string; feedback: IeltsAiFeedback } | null>(null);
  const [isIeltsGrading, setIsIeltsGrading] = useState(false);
  /** Fluency measured on the device for the Speaking answer on screen. */
  const [ieltsSpeakingFluency, setIeltsSpeakingFluency] = useState<FluencyMetrics | null>(null);
  /** Bumped to start a fresh mock test script. */
  const [ieltsMockRun, setIeltsMockRun] = useState(0);
  /** Lesson to open in Thư viện IELTS; undefined shows the list. */
  const [ieltsLibraryLessonId, setIeltsLibraryLessonId] = useState<string | undefined>(undefined);
  const [ieltsLibraryReturn, setIeltsLibraryReturn] = useState<AppPhase>(AppPhase.IELTS_HOME);
  /** Question type "Luyện theo dạng" opens on when the Reading hub is reached from a lesson or a result. */
  const [ieltsReadingDrillKind, setIeltsReadingDrillKind] = useState<ReadingKind | undefined>(undefined);
  const [ieltsWritingStudyTab, setIeltsWritingStudyTab] = useState<WritingStudyTab>('guides');
  const [ieltsSpeakingStudyTab, setIeltsSpeakingStudyTab] = useState<SpeakingStudyTab>('part1');
  /** Listening session: which test and parts, and the answers once submitted. `run` restarts the sheet on retry. */
  const [ieltsListening, setIeltsListening] = useState<{
    testId: string;
    sectionIds: string[];
    mode: ListeningMode;
    answers: ListeningAnswers;
    run: number;
    /** An admin trying out a draft: nothing is saved and leaving goes back to the editor. */
    preview?: boolean;
  } | null>(null);
  /** Reading session, like Listening's; `seconds` is time per passage once submitted. */
  const [ieltsReading, setIeltsReading] = useState<{
    testId: string;
    passageIds: string[];
    mode: ReadingMode;
    answers: ReadingAnswers;
    seconds: Record<string, number>;
    run: number;
    /** An admin trying out a draft: nothing is saved and leaving goes back to the editor. */
    preview?: boolean;
  } | null>(null);
  const [ieltsAdmin, setIeltsAdmin] = useState(false);
  const [ieltsAdminEditing, setIeltsAdminEditing] = useState<AdminEditing | null>(null);
  // Where the admin page was opened from, for its back button.
  const [ieltsAdminFrom, setIeltsAdminFrom] = useState<AppPhase>(AppPhase.IELTS_HOME);

  // The drill kind is for the one hub visit it was set for; the hub is also
  // reached from IELTS Home and suggestions, which should open it plainly.
  useEffect(() => {
    if (phase !== AppPhase.IELTS_READING_HUB) setIeltsReadingDrillKind(undefined);
  }, [phase]);

  // Synchronous mirror of currentRecordId so queued saves always update the
  // row created by an earlier save instead of inserting a duplicate.
  const currentRecordIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentRecordIdRef.current = currentRecordId;
  }, [currentRecordId]);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const savedAudioRef = useRef<{ recordId: string; audio: string } | null>(null);

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

  // Whether a lesson has been active in this session. Until then a missing
  // lessonData just means "app just loaded", and the stored draft must be
  // kept so the recovery modal can offer it.
  const hadLessonRef = useRef(false);

  // Local draft auto-save (localStorage) with 3s debounce
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;

    if (!lessonData) {
      // Chỉ xoá nháp khi đã thoát khỏi các phase học tập
      const isOutOfLesson = ![
        AppPhase.FLASHCARDS,
        AppPhase.STORY,
        AppPhase.QUIZ,
        AppPhase.FILL_BLANK,
        AppPhase.SENTENCE_PRACTICE,
      ].includes(phase);

      if (isOutOfLesson && hadLessonRef.current) {
        clearDraft(userId);
      }
      return;
    }
    hadLessonRef.current = true;

    const timer = setTimeout(() => {
      saveDraft(userId, {
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
    currentUser?.id,
    lessonData,
    lessonSettings,
    lessonWords,
    phase,
    currentRecordId,
    flashcardIndex,
    lessonMasteryMap,
  ]);

  // Admins get a link to the content editor; everyone else never sees it.
  // Asked again on the screens that show the link, so a grant made in the
  // SQL Editor shows up without signing out.
  const adminLinkScreen =
    phase === AppPhase.IELTS_HOME || phase === AppPhase.IELTS_LISTENING_HUB ? phase : null;
  useEffect(() => {
    if (!currentUser) {
      setIeltsAdmin(false);
      return;
    }
    let live = true;
    void isAppAdmin(currentUser.id).then(ok => live && setIeltsAdmin(ok));
    return () => {
      live = false;
    };
  }, [currentUser?.id, adminLinkScreen]);

  // Check for draft on login / user session loaded
  useEffect(() => {
    if (!currentUser) return;
    const draft = loadDraft(currentUser.id);
    if (draft && draft.lessonData) {
      setRecoveredDraft(draft);
      setShowRecoveryModal(true);
    }
  }, [currentUser?.id]);

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
    if (currentUser) clearDraft(currentUser.id);
    setShowRecoveryModal(false);
    setRecoveredDraft(null);
  };


  // Remember the last lesson step so the dashboard can offer "Tiếp tục".
  useEffect(() => {
    if (isLessonPhase(phase)) setLastLessonPhase(phase);
    if (phase !== AppPhase.VOCAB_LIBRARY) setLibraryLessonId(null);
  }, [phase]);

  // Due-word badge on the "Ôn tập" tab. Refreshed whenever the learner moves
  // to another screen (ratings during a lesson or review change the count);
  // skipped inside the review session itself. A failed count hides the badge.
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) {
      setDueCount(null);
      return;
    }
    if (phase === AppPhase.REVIEW_SESSION) return;
    let cancelled = false;
    getDueWordCount(userId)
      .then((n) => { if (!cancelled) setDueCount(n); })
      .catch(() => { if (!cancelled) setDueCount(null); });
    return () => { cancelled = true; };
  }, [currentUser?.id, phase]);

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

        hadLessonRef.current = false;
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
      // Luyện câu is the last step, so its sentences are made while the
      // learner works through the cards; the next save stores them.
      void loadSentences(data.flashcards, settings, false);
    } catch (err) {
      console.error(err);
      showToast(aiErrorMessage(err), 'error', {
        action: { label: 'Thử lại', onClick: () => void handleGenerate(text, settings) },
        durationMs: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Make the Luyện câu sentences and attach them to the lesson, unless the
   * learner has moved to another lesson meanwhile.
   */
  const loadSentences = async (cards: FlashcardData[], settings: UserSettings, persist: boolean) => {
    setSentencesGenerating(true);
    try {
      const items = await generateSentences(cards, settings.level, settings.topic || 'General');
      const current = lessonDataRef.current;
      if (!current || current.flashcards !== cards) return;
      const next = { ...current, sentencePractice: items };
      lessonDataRef.current = next;
      setLessonData(next);
      if (persist) void persistLesson({ data: next }).catch((err) => console.error('Failed to save sentences:', err));
    } catch (err) {
      console.error('[Sentence] generation failed:', err);
      if (persist) showToast(`Chưa tạo được câu luyện. ${aiErrorMessage(err)}`, 'error');
    } finally {
      setSentencesGenerating(false);
    }
  };

  /**
   * Single entry point for persisting the active lesson to `learning_history`.
   *
   * - Saves are serialised through a queue so concurrent callers (periodic
   *   auto-save, audio generation, manual save) can't race and insert the
   *   same lesson twice before the first insert returns its id.
   * - `quizScore` is only sent when the quiz was just completed; otherwise
   *   the stored score is left untouched (see `saveLearningRecord`).
   * - Story audio is stripped from `lesson_data` and stored separately in
   *   `lesson_audio`, uploaded only when it changed since the last save.
   */
  const persistLesson = (opts: { data?: GeneratedLesson; quizScore?: number; quizTotal?: number } = {}) => {
    const run = async () => {
      if (!currentUser) throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập.');
      if (!lessonSettings) throw new Error('Thiếu cấu hình bài học (level/topic).');
      const dataToSave = opts.data || lessonData;
      if (!dataToSave) throw new Error('Không có dữ liệu bài học để lưu.');

      const audioToSave = dataToSave.story?.audioBase64;
      const strippedData: GeneratedLesson = audioToSave
        ? { ...dataToSave, story: { ...dataToSave.story, audioBase64: undefined } }
        : dataToSave;

      const savedRecord = await saveLearningRecord({
        id: currentRecordIdRef.current || undefined,
        user_id: currentUser.id,
        topic: lessonSettings.topic || 'General',
        level: lessonSettings.level,
        words: lessonWords,
        quiz_score: opts.quizScore,
        quiz_total: opts.quizTotal ?? dataToSave.quiz.length,
        lesson_data: strippedData,
      });

      if (savedRecord?.id) {
        currentRecordIdRef.current = savedRecord.id;
        setCurrentRecordId(savedRecord.id);

        const alreadyUploaded =
          savedAudioRef.current?.recordId === savedRecord.id &&
          savedAudioRef.current.audio === audioToSave;
        if (audioToSave && !alreadyUploaded) {
          void saveLessonAudio(savedRecord.id, audioToSave).then(success => {
            if (success) savedAudioRef.current = { recordId: savedRecord.id, audio: audioToSave };
            else console.warn('Could not save audio to lesson_audio table.');
          });
        }
      }
      return savedRecord;
    };

    const result = saveQueueRef.current.then(run, run);
    saveQueueRef.current = result.catch(() => undefined);
    return result;
  };

  const saveCurrentLesson = async (overrideData?: GeneratedLesson) => {
    await persistLesson({ data: overrideData });
  };

  /** Lesson data with `patch` merged into its progress; also set as the current lesson. */
  const withProgress = (patch: LessonProgress): GeneratedLesson | null => {
    if (!lessonData) return null;
    const next = { ...lessonData, progress: { ...lessonData.progress, ...patch } };
    setLessonData(next);
    return next;
  };

  const handleQuizComplete = async (score: number, total: number, wrong: string[]) => {
    if (!currentUser || !lessonSettings || !lessonData) return;
    const data = withProgress({ quiz: { score, total, wrong } }) ?? undefined;
    try {
      await persistLesson({ data, quizScore: score, quizTotal: total });
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

  /** First pass of Điền từ done: record it, save, and move on to Luyện câu. */
  const handleFillBlankComplete = (score: number, total: number, wrong: string[]) => {
    const data = withProgress({ fillBlank: { score, total, wrong } });
    if (!data) return;
    setPhase(AppPhase.SENTENCE_PRACTICE);
    void persistLesson({ data }).catch((err) => console.error('Failed to save fill-blank result:', err));
  };

  /** Luyện câu done (or skipped): the lesson is finished; save and show the summary. */
  const handleSentencesComplete = (result: StepResult) => {
    const patch: LessonProgress = { completedAt: new Date().toISOString() };
    if (result.total > 0) patch.sentences = result;
    const data = withProgress(patch);
    if (!data) return;
    setPhase(AppPhase.LESSON_SUMMARY);
    void persistLesson({ data }).catch((err) => {
      console.error('Failed to save finished lesson:', err);
      showToast(err?.message || 'Chưa lưu được bài học. Vui lòng kiểm tra kết nối.', 'error');
    });
  };

  /** Leave the finished lesson (it was saved on the way to the summary). */
  const closeLesson = () => {
    setLessonData(null);
    setCurrentRecordId(null);
    currentRecordIdRef.current = null;
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
    // The summary is after the save; leaving it just closes the lesson.
    if (phase === AppPhase.LESSON_SUMMARY) closeLesson();
    else if (lessonData && phase !== AppPhase.DASHBOARD && targetPhase === AppPhase.DASHBOARD) {
      setPendingNavTarget(targetPhase);
      setShowSaveModal(true);
      return;
    }
    setMobileMenuOpen(false);
    setPhase(targetPhase);
  };

  /**
   * Tab-bar / header navigation. Leaving a lesson step asks whether to save
   * first (same modal as before); from any other screen it just goes.
   */
  const navigateTo = ({ phase: target, analyticsSection: section }: NavRequest) => {
    if (section) setAnalyticsSection(section);
    if (phase === AppPhase.LESSON_SUMMARY) closeLesson();
    if (lessonData && isLessonPhase(phase) && target !== phase) {
      setPendingNavTarget(target);
      setShowSaveModal(true);
      return;
    }
    setMobileMenuOpen(false);
    setPhase(target);
  };

  /** "Ôn ngay" in Sổ từ: a review session made of the picked words, due or not. */
  const reviewSelectedWords = async (ids: string[]) => {
    if (!currentUser || ids.length === 0) return;
    try {
      const records = await getWordsByIds(currentUser.id, ids);
      if (records.length === 0) return;
      setReviewDueWords(records);
      setReviewCurrentIndex(0);
      setReviewRatings([]);
      setReviewGoalCelebrated(false);
      setPhase(AppPhase.REVIEW_SESSION);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không tải được các từ đã chọn', 'error');
    }
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

  const recordIeltsAttempt = (input: {
    skill: IeltsSkill;
    question: IeltsQuestion;
    taskOrPart?: string;
    answerText: string;
    durationSeconds?: number;
    feedback: IeltsAiFeedback;
    details?: Record<string, unknown>;
  }) => {
    if (!currentUser) return;
    void saveIeltsAttempt({ userId: currentUser.id, ...input }).then(saved => {
      if (!saved) showToast('Chưa lưu được bài vào lịch sử luyện tập.', 'info');
    });
  };

  const startIeltsWriting = (q: IeltsQuestion, mode: WritingMode = 'practice') => {
    setIeltsWritingMode(mode);
    setIeltsWritingExam(null);
    setSelectedIeltsQuestion(q);
    setIeltsWritingDraft('');
    setIeltsFeedbackData(null);
    setIeltsUserAnswer('');
    setIeltsWritingPrevious(null);
    setPhase(AppPhase.IELTS_WRITING_PRACTICE);
  };

  /** Latest saved Writing attempt on a prompt (before `before` if given), as feedback-screen input. */
  const findPreviousWriting = async (prompt: string, before?: string) => {
    if (!currentUser) return null;
    const attempt = await getPreviousWritingAttempt(currentUser.id, prompt, before);
    return attempt?.aiFeedback ? { answer: attempt.answerText, feedback: attempt.aiFeedback } : null;
  };

  const openIeltsLibrary = (lessonId?: string, from: AppPhase = AppPhase.IELTS_HOME) => {
    setIeltsLibraryLessonId(lessonId);
    setIeltsLibraryReturn(from);
    setPhase(AppPhase.IELTS_LIBRARY);
  };

  const openIeltsAdmin = () => {
    setIeltsAdminFrom(phase);
    setPhase(AppPhase.IELTS_ADMIN);
  };

  const startIeltsListening = (testId: string, sectionIds: string[], mode: ListeningMode, preview = false) => {
    setIeltsListening(prev => ({ testId, sectionIds, mode, answers: {}, run: (prev?.run ?? 0) + 1, preview }));
    setPhase(AppPhase.IELTS_LISTENING_PRACTICE);
  };

  const submitIeltsListening = (answers: ListeningAnswers, durationSeconds: number) => {
    const session = ieltsListening;
    const test = session && getListeningTest(session.testId);
    if (!session || !test) return;
    setIeltsListening({ ...session, answers });
    setPhase(AppPhase.IELTS_LISTENING_RESULT);
    if (!currentUser || session.preview) return;
    const sections = sessionSections(test, session.sectionIds);
    const score = scoreSections(sections, answers);
    const labels = attemptLabels(test, sections);
    void saveListeningAttempt({
      userId: currentUser.id,
      ...labels,
      band: score.band,
      durationSeconds,
      byPart: Object.fromEntries(score.byPart.map(p => [`Part ${p.part}`, p.score])),
      details: { testId: test.id, sectionIds: session.sectionIds, mode: session.mode, answers, score: score.score, total: score.total },
    }).then(saved => {
      if (!saved) showToast('Chưa lưu được bài vào lịch sử luyện tập.', 'info');
    });
  };

  const openIeltsReadingHub = (drillKind?: ReadingKind) => {
    setIeltsReadingDrillKind(drillKind);
    setPhase(AppPhase.IELTS_READING_HUB);
  };

  const startIeltsReading = (testId: string, passageIds: string[], mode: ReadingMode, preview = false) => {
    setIeltsReading(prev => ({ testId, passageIds, mode, answers: {}, seconds: {}, run: (prev?.run ?? 0) + 1, preview }));
    setPhase(AppPhase.IELTS_READING_PRACTICE);
  };

  const submitIeltsReading = (answers: ReadingAnswers, seconds: Record<string, number>) => {
    const session = ieltsReading;
    const test = session && resolveReadingTest(session.testId, getReadingTest);
    if (!session || !test) return;
    setIeltsReading({ ...session, answers, seconds });
    setPhase(AppPhase.IELTS_READING_RESULT);
    const passages = readingSessionPassages(test, session.passageIds);
    // Drills only order the next drills; they are not attempts.
    const drill = parseDrillTestId(test.id);
    if (drill) {
      appendDrillLog(currentUser?.id ?? '', groupRecords(drill.testId, passages, answers, new Date().toISOString()));
      return;
    }
    if (!currentUser || session.preview) return;
    const score = scorePassages(passages, answers);
    void saveReadingAttempt({
      userId: currentUser.id,
      ...readingAttemptLabels(test, passages),
      band: score.band,
      durationSeconds: Object.values(seconds).reduce((n, s) => n + s, 0),
      byPart: Object.fromEntries(score.byPassage.map(p => [`Passage ${p.part}`, p.score])),
      details: { testId: test.id, passageIds: session.passageIds, mode: session.mode, answers, score: score.score, total: score.total, seconds },
    }).then(saved => {
      if (!saved) showToast('Chưa lưu được bài vào lịch sử luyện tập.', 'info');
    });
  };

  const openIeltsAttempt = (attempt: IeltsAttempt) => {
    if (attempt.skill === 'reading') {
      const d = attempt.details;
      if (!isReadingDetails(d)) return;
      const open = () => {
        setIeltsReading({ testId: d.testId, passageIds: d.passageIds, mode: d.mode, answers: d.answers, seconds: d.seconds, run: 0 });
        setPhase(AppPhase.IELTS_READING_RESULT);
      };
      if (resolveReadingTest(d.testId, getReadingTest)) open();
      else if (isReadingLibraryTestId(d.testId)) {
        // A test from the admin library: load it from reading_library first.
        void loadReadingLibraryTest(d.testId).then(test => {
          if (test) open();
          else showToast('Không mở được bài này: đề đã bị gỡ khỏi thư viện.', 'info');
        });
      } else if (isGeneratedReadingTestId(d.testId)) {
        // A passage the AI wrote for this learner: load it from reading_generated first.
        void loadGeneratedReadingTest(d.testId).then(test => {
          if (test) open();
          else showToast('Không mở được bài này: đề AI tạo đã bị xoá.', 'info');
        });
      }
      return;
    }
    if (attempt.skill === 'listening') {
      const d = attempt.details;
      if (!isListeningDetails(d)) return;
      const open = () => {
        setIeltsListening({ testId: d.testId, sectionIds: d.sectionIds, mode: d.mode, answers: d.answers, run: 0 });
        setPhase(AppPhase.IELTS_LISTENING_RESULT);
      };
      if (getListeningTest(d.testId)) open();
      else if (isGeneratedTestId(d.testId)) {
        // An AI-generated part: load it from listening_sections first.
        void loadGeneratedTest(d.testId).then(test => {
          if (test) open();
          else showToast('Không mở được bài này: đề AI tạo đã bị xoá hoặc chưa được lưu.', 'info');
        });
      } else if (isLibraryTestId(d.testId)) {
        void loadLibraryTest(d.testId).then(test => {
          if (test) open();
          else showToast('Không mở được bài này: đề đã bị gỡ khỏi thư viện.', 'info');
        });
      }
      return;
    }
    if (!attempt.aiFeedback) return;
    setSelectedIeltsQuestion(resolveAttemptQuestion(attempt));
    setIeltsFeedbackData(attempt.aiFeedback);
    setIeltsUserAnswer(attempt.answerText);
    if (attempt.skill === 'writing') {
      setIeltsWritingDraft('');
      setIeltsWritingPrevious(null);
      setIeltsWritingExam(examInfo(attempt.details));
      setPhase(AppPhase.IELTS_WRITING_FEEDBACK);
      if (attempt.createdAt && (attempt.attemptNumber ?? 1) > 1) {
        void findPreviousWriting(attempt.questionPrompt, attempt.createdAt).then(setIeltsWritingPrevious);
      }
    } else {
      const fluency = attempt.details?.fluency;
      setIeltsSpeakingFluency(isFluencyMetrics(fluency) ? fluency : null);
      setPhase(AppPhase.IELTS_SPEAKING_FEEDBACK);
    }
  };

  const startIeltsSpeaking = (q: IeltsQuestion) => {
    setSelectedIeltsQuestion(q);
    setIeltsFeedbackData(null);
    setIeltsUserAnswer('');
    setIeltsSpeakingFluency(null);
    setPhase(AppPhase.IELTS_SPEAKING_PRACTICE);
  };

  const startIeltsMock = () => {
    setSelectedIeltsQuestion(null);
    setIeltsFeedbackData(null);
    setIeltsUserAnswer('');
    setIeltsSpeakingFluency(null);
    setIeltsMockRun(n => n + 1);
    setPhase(AppPhase.IELTS_SPEAKING_MOCK);
  };

  /** Grades one Speaking submission (a single part or the whole mock) and saves it. */
  const gradeIeltsSpeaking = async (
    question: IeltsQuestion,
    part: string,
    sub: SpeakingSubmission | MockSubmission,
  ) => {
    setIsIeltsGrading(true);
    try {
      const feedback = await gradeSpeakingAnswer(
        question.prompt,
        sub.transcript,
        part,
        question.targetBand,
        sub.audioBase64,
        sub.audioMimeType,
        sub.fluency ? fluencySummaryForGrader(sub.fluency) : undefined,
      );
      setSelectedIeltsQuestion(question);
      setIeltsUserAnswer(sub.transcript);
      setIeltsSpeakingFluency(sub.fluency);
      setIeltsFeedbackData(feedback);
      setPhase(AppPhase.IELTS_SPEAKING_FEEDBACK);
      recordIeltsAttempt({
        skill: 'speaking',
        question,
        taskOrPart: part,
        answerText: sub.transcript,
        durationSeconds: sub.durationSeconds,
        feedback,
        details: sub.fluency ? { fluency: sub.fluency } : undefined,
      });
    } catch (err) {
      console.error('Speaking grading failed:', err);
      showToast(`Chưa chấm được bài. ${aiErrorMessage(err)}`, 'error');
    } finally {
      setIsIeltsGrading(false);
    }
  };

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
            activeLesson={lessonData ? { topic: lessonSettings?.topic || 'đang học' } : null}
            onContinueLesson={() => setPhase(lastLessonPhase)}
            onOpenLesson={(id) => {
              setLibraryLessonId(id);
              setPhase(AppPhase.VOCAB_LIBRARY);
            }}
            onPracticeSentences={(items) => {
              setSentenceDrill(items);
              setPhase(AppPhase.SENTENCE_DRILL);
            }}
            onStartVocabTest={() => setPhase(AppPhase.VOCAB_TEST)}
          />
        );

      case AppPhase.VOCAB_LIBRARY:
        return currentUser ? (
          <VocabLibrary
            key={libraryLessonId ?? 'all'}
            initialLessonId={libraryLessonId}
            userId={currentUser.id}
            onShowToast={showToast}
            onStartLesson={() => setPhase(AppPhase.DASHBOARD)}
            onReviewWords={reviewSelectedWords}
            onStartVocabTest={() => setPhase(AppPhase.VOCAB_TEST)}
          />
        ) : null;

      case AppPhase.HISTORY:
        return currentUser ? (
          <LearningHistory
            userId={currentUser.id}
            onStartLesson={() => setPhase(AppPhase.DASHBOARD)}
            onOpenLesson={handleOpenLesson}
            onReviewWords={reviewSelectedWords}
            isLoadingLesson={isLoading}
          />
        ) : null;

      case AppPhase.ANALYTICS:
        return currentUser ? (
          <AnalyticsDashboard
            userId={currentUser.id}
            focusSection={analyticsSection}
            onOpenLibrary={() => setPhase(AppPhase.VOCAB_LIBRARY)}
            onBack={() => setPhase(AppPhase.DASHBOARD)}
            onStartLesson={() => setPhase(AppPhase.DASHBOARD)}
            onStartReview={() => setPhase(AppPhase.REVIEW_SESSION)}
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
            onShowToast={showToast}
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
            onStartVocabTest={() => setPhase(AppPhase.VOCAB_TEST)}
          />
        ) : null;

      case AppPhase.VOCAB_TEST:
        return currentUser ? (
          <VocabTestView
            userId={currentUser.id}
            onBack={() => setPhase(AppPhase.DASHBOARD)}
            onShowToast={showToast}
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
            cards={lessonData.flashcards}
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
            userId={currentUser?.id}
            onComplete={handleFillBlankComplete}
            onFinish={() => setPhase(AppPhase.SENTENCE_PRACTICE)}
          />
        ) : null;

      case AppPhase.SENTENCE_PRACTICE:
        return lessonData && currentUser ? (
          <SentencePractice
            key={lessonData.sentencePractice?.[0]?.id ?? 'none'}
            items={lessonData.sentencePractice}
            level={lessonSettings?.level ?? DifficultyLevel.B1}
            userId={currentUser.id}
            lessonRecordId={currentRecordId}
            generating={sentencesGenerating}
            onGenerate={lessonSettings ? () => void loadSentences(lessonData.flashcards, lessonSettings, true) : undefined}
            onComplete={handleSentencesComplete}
            completeLabel="Xem tổng kết"
          />
        ) : null;

      case AppPhase.SENTENCE_DRILL:
        return currentUser ? (
          <SentencePractice
            items={sentenceDrill}
            level={lessonSettings?.level ?? DifficultyLevel.B1}
            userId={currentUser.id}
            lessonRecordId={null}
            onComplete={() => setPhase(AppPhase.DASHBOARD)}
            completeLabel="Về trang chủ"
            title="Luyện lại câu sai"
            subtitle="Các câu bạn viết sai trong 30 ngày qua."
          />
        ) : null;

      case AppPhase.LESSON_SUMMARY:
        return lessonData && currentUser ? (
          <LessonSummary
            lesson={lessonData}
            userId={currentUser.id}
            topic={lessonSettings?.topic}
            onHome={() => {
              closeLesson();
              setPhase(AppPhase.DASHBOARD);
            }}
            onReviewWords={(ids) => {
              closeLesson();
              void reviewSelectedWords(ids);
            }}
          />
        ) : null;

      // ─── IELTS Home & Library ──────────────────────────────
      case AppPhase.IELTS_HOME:
        return (
          <IeltsHome
            userId={currentUser?.id ?? ''}
            onOpenPhase={setPhase}
            onOpenLibrary={(id) => openIeltsLibrary(id)}
            onOpenAdmin={ieltsAdmin ? openIeltsAdmin : undefined}
            onAction={(target) => {
              if (target.kind === 'phase') setPhase(target.phase);
              else if (target.kind === 'lesson') openIeltsLibrary(target.lessonId);
              else if (target.kind === 'writingStudy') {
                setIeltsWritingStudyTab(target.tab);
                setPhase(AppPhase.IELTS_WRITING_STUDY);
              } else {
                setIeltsSpeakingStudyTab(target.tab);
                setPhase(AppPhase.IELTS_SPEAKING_STUDY);
              }
            }}
          />
        );

      case AppPhase.IELTS_LIBRARY:
        return (
          <IeltsLibrary
            initialLessonId={ieltsLibraryLessonId}
            onBack={() => setPhase(ieltsLibraryReturn)}
            backLabel={LIBRARY_BACK_LABELS[ieltsLibraryReturn] ?? 'IELTS'}
            userId={currentUser?.id}
            onPractice={openIeltsReadingHub}
          />
        );

      case AppPhase.IELTS_ERROR_LOG:
        return (
          <IeltsErrorLog
            userId={currentUser?.id ?? ''}
            onBack={() => setPhase(AppPhase.IELTS_HOME)}
            onOpenLibrary={(id) => openIeltsLibrary(id, AppPhase.IELTS_ERROR_LOG)}
          />
        );

      // ─── IELTS Reading ────────────────────────────────
      case AppPhase.IELTS_READING_HUB:
        return (
          <IeltsReadingHub
            userId={currentUser?.id ?? ''}
            onStart={startIeltsReading}
            onOpenAttempt={openIeltsAttempt}
            onOpenLesson={(id) => openIeltsLibrary(id, AppPhase.IELTS_READING_HUB)}
            drillKind={ieltsReadingDrillKind}
            onBack={() => setPhase(AppPhase.IELTS_HOME)}
          />
        );

      case AppPhase.IELTS_READING_PRACTICE: {
        const test = ieltsReading && resolveReadingTest(ieltsReading.testId, getReadingTest);
        if (!ieltsReading || !test) return null;
        return (
          <IeltsReadingPractice
            key={`${test.id}:${ieltsReading.passageIds.join('+')}:${ieltsReading.mode}:${ieltsReading.run}`}
            userId={currentUser?.id ?? ''}
            test={test}
            passageIds={ieltsReading.passageIds}
            mode={ieltsReading.mode}
            onSubmit={submitIeltsReading}
            onExit={() => (ieltsReading.preview ? setPhase(AppPhase.IELTS_ADMIN) : openIeltsReadingHub())}
          />
        );
      }

      case AppPhase.IELTS_READING_RESULT: {
        const test = ieltsReading && resolveReadingTest(ieltsReading.testId, getReadingTest);
        if (!ieltsReading || !test) return null;
        return (
          <IeltsReadingResult
            test={test}
            passageIds={ieltsReading.passageIds}
            mode={ieltsReading.mode}
            answers={ieltsReading.answers}
            seconds={ieltsReading.seconds}
            onRetry={() => startIeltsReading(test.id, ieltsReading.passageIds, ieltsReading.mode, ieltsReading.preview)}
            onBack={() => (ieltsReading.preview ? setPhase(AppPhase.IELTS_ADMIN) : openIeltsReadingHub())}
            drill={isDrillTestId(test.id)}
            onOpenLesson={(id) => openIeltsLibrary(id, AppPhase.IELTS_READING_RESULT)}
            onDrill={openIeltsReadingHub}
          />
        );
      }

      // ─── IELTS Listening ──────────────────────────────
      case AppPhase.IELTS_LISTENING_HUB:
        return (
          <IeltsListeningHub
            userId={currentUser?.id ?? ''}
            onStart={startIeltsListening}
            onOpenDictation={() => {
              setIeltsDictation(null);
              setPhase(AppPhase.IELTS_LISTENING_DICTATION);
            }}
            onOpenDrill={() => setPhase(AppPhase.IELTS_LISTENING_DRILL)}
            onOpenAttempt={openIeltsAttempt}
            onBack={() => setPhase(AppPhase.IELTS_HOME)}
            onOpenAdmin={ieltsAdmin ? openIeltsAdmin : undefined}
          />
        );

      case AppPhase.IELTS_LISTENING_PRACTICE: {
        const test = ieltsListening && getListeningTest(ieltsListening.testId);
        if (!ieltsListening || !test) return null;
        return (
          <IeltsListeningPractice
            key={`${test.id}:${ieltsListening.sectionIds.join('+')}:${ieltsListening.mode}:${ieltsListening.run}`}
            userId={currentUser?.id ?? ''}
            test={test}
            sectionIds={ieltsListening.sectionIds}
            mode={ieltsListening.mode}
            onSubmit={submitIeltsListening}
            onExit={() => setPhase(ieltsListening.preview ? AppPhase.IELTS_ADMIN : AppPhase.IELTS_LISTENING_HUB)}
          />
        );
      }

      case AppPhase.IELTS_LISTENING_RESULT: {
        const test = ieltsListening && getListeningTest(ieltsListening.testId);
        if (!ieltsListening || !test) return null;
        return (
          <IeltsListeningResult
            test={test}
            sectionIds={ieltsListening.sectionIds}
            mode={ieltsListening.mode}
            answers={ieltsListening.answers}
            onRetry={() => startIeltsListening(test.id, ieltsListening.sectionIds, ieltsListening.mode, ieltsListening.preview)}
            onBack={() => setPhase(ieltsListening.preview ? AppPhase.IELTS_ADMIN : AppPhase.IELTS_LISTENING_HUB)}
            onDictation={(sectionId) => {
              setIeltsDictation({ testId: test.id, sectionId });
              setPhase(AppPhase.IELTS_LISTENING_DICTATION);
            }}
          />
        );
      }

      case AppPhase.IELTS_LISTENING_DICTATION: {
        const section = ieltsDictation
          ? getListeningTest(ieltsDictation.testId)?.sections.find((s) => s.id === ieltsDictation.sectionId)
          : undefined;
        return (
          <IeltsListeningDictation
            key={section?.id ?? 'pick'}
            section={section}
            onBack={() => setPhase(ieltsDictation && ieltsListening ? AppPhase.IELTS_LISTENING_RESULT : AppPhase.IELTS_LISTENING_HUB)}
          />
        );
      }

      case AppPhase.IELTS_ADMIN:
        return (
          <IeltsAdmin
            userId={currentUser?.id ?? ''}
            onBack={() => {
              setIeltsAdminEditing(null);
              setPhase(ieltsAdminFrom);
            }}
            editing={ieltsAdminEditing}
            onEditingChange={setIeltsAdminEditing}
            onPreview={(editing) => {
              setIeltsAdminEditing(editing);
              if (editing.skill === 'reading') {
                const test = registerReadingPreview(editing.item);
                // A preview left halfway must not bring back answers and highlights from an older version.
                clearReadingDraft(currentUser?.id ?? '', test.id, [], 'practice');
                startIeltsReading(test.id, [], 'practice', true);
                return;
              }
              const test = registerPreview(editing.item);
              startIeltsListening(test.id, [], 'practice', true);
            }}
          />
        );

      case AppPhase.IELTS_LISTENING_DRILL:
        return <IeltsListeningDrill onBack={() => setPhase(AppPhase.IELTS_LISTENING_HUB)} />;

      // ─── IELTS Writing ──────────────────────────────
      case AppPhase.IELTS_WRITING_HUB:
        return (
          <IeltsWritingHub
            userId={currentUser?.id ?? ''}
            onOpenAttempt={openIeltsAttempt}
            onSelectQuestion={startIeltsWriting}
            onOpenStudy={(tab) => {
              setIeltsWritingStudyTab(tab);
              setPhase(AppPhase.IELTS_WRITING_STUDY);
            }}
          />
        );

      case AppPhase.IELTS_WRITING_STUDY:
        return (
          <IeltsWritingStudy
            key={ieltsWritingStudyTab}
            initialTab={ieltsWritingStudyTab}
            userId={currentUser?.id ?? ''}
            onBack={() => setPhase(AppPhase.IELTS_WRITING_HUB)}
            onPractice={(q) => startIeltsWriting(q)}
          />
        );

      case AppPhase.IELTS_WRITING_PRACTICE:
        return selectedIeltsQuestion ? (
          <IeltsWritingPractice
            userId={currentUser?.id ?? ''}
            question={selectedIeltsQuestion}
            mode={ieltsWritingMode}
            onSubmit={async (answer, durationSeconds, meta) => {
              setIsIeltsGrading(true);
              setIeltsUserAnswer(answer);
              // Looked up before this attempt is saved, so it is the one before it.
              const previous = ieltsWritingPrevious
                ? Promise.resolve(ieltsWritingPrevious)
                : findPreviousWriting(selectedIeltsQuestion.prompt);
              try {
                const feedback = await gradeWritingTask(
                  selectedIeltsQuestion.prompt,
                  answer,
                  selectedIeltsQuestion.questionType,
                  selectedIeltsQuestion.targetBand,
                  selectedIeltsQuestion.taskOrPart as 'task_1' | 'task_2'
                );
                setIeltsWritingPrevious(await previous);
                setIeltsFeedbackData(feedback);
                setIeltsWritingExam(meta.mode === 'exam' ? { autoSubmitted: meta.autoSubmitted } : null);
                setPhase(AppPhase.IELTS_WRITING_FEEDBACK);
                // Graded: the draft on this device is done with (a rewrite starts from the answer).
                clearWritingDraft(currentUser?.id ?? '', selectedIeltsQuestion.id);
                recordIeltsAttempt({
                  skill: 'writing',
                  question: selectedIeltsQuestion,
                  answerText: answer,
                  durationSeconds,
                  feedback,
                  details: writingAttemptDetails(selectedIeltsQuestion, meta),
                });
              } catch (err) {
                console.error('Writing grading failed:', err);
                showToast(`Chưa chấm được bài. ${aiErrorMessage(err)}`, 'error');
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
            userId={currentUser?.id ?? ''}
            question={selectedIeltsQuestion}
            userAnswer={ieltsUserAnswer}
            feedback={ieltsFeedbackData}
            previous={ieltsWritingPrevious}
            exam={ieltsWritingExam}
            onRewrite={() => {
              setIeltsWritingPrevious({ answer: ieltsUserAnswer, feedback: ieltsFeedbackData });
              setIeltsWritingDraft(ieltsUserAnswer);
              setIeltsFeedbackData(null);
              setPhase(AppPhase.IELTS_WRITING_PRACTICE);
            }}
            onBackToHub={() => {
              setSelectedIeltsQuestion(null);
              setIeltsFeedbackData(null);
              setIeltsWritingDraft('');
              setIeltsUserAnswer('');
              setIeltsWritingPrevious(null);
              setPhase(AppPhase.IELTS_WRITING_HUB);
            }}
          />
        ) : null;

      // ─── IELTS Speaking ──────────────────────────────
      case AppPhase.IELTS_SPEAKING_HUB:
        return (
          <IeltsSpeakingHub
            userId={currentUser?.id ?? ''}
            onOpenAttempt={openIeltsAttempt}
            onSelectQuestion={startIeltsSpeaking}
            onStartMockTest={startIeltsMock}
            onOpenStudy={(tab) => {
              setIeltsSpeakingStudyTab(tab);
              setPhase(AppPhase.IELTS_SPEAKING_STUDY);
            }}
          />
        );

      case AppPhase.IELTS_SPEAKING_STUDY:
        return (
          <IeltsSpeakingStudy
            key={ieltsSpeakingStudyTab}
            userId={currentUser?.id ?? ''}
            initialTab={ieltsSpeakingStudyTab}
            onBack={() => setPhase(AppPhase.IELTS_SPEAKING_HUB)}
            onPractice={startIeltsSpeaking}
          />
        );

      case AppPhase.IELTS_SPEAKING_PRACTICE:
        return selectedIeltsQuestion ? (
          <IeltsSpeakingPractice
            key={selectedIeltsQuestion.id}
            question={selectedIeltsQuestion}
            onSubmit={(sub) => void gradeIeltsSpeaking(selectedIeltsQuestion, selectedIeltsQuestion.taskOrPart, sub)}
            onBack={() => setPhase(AppPhase.IELTS_SPEAKING_HUB)}
            isGrading={isIeltsGrading}
          />
        ) : null;

      case AppPhase.IELTS_SPEAKING_MOCK:
        return (
          <IeltsSpeakingMock
            key={ieltsMockRun}
            onSubmit={(sub) => void gradeIeltsSpeaking(sub.question, 'mock', sub)}
            onBack={() => setPhase(AppPhase.IELTS_SPEAKING_HUB)}
            isGrading={isIeltsGrading}
          />
        );

      case AppPhase.IELTS_SPEAKING_FEEDBACK:
        return selectedIeltsQuestion && ieltsFeedbackData ? (
          <IeltsSpeakingFeedback
            userId={currentUser?.id ?? ''}
            question={selectedIeltsQuestion}
            userTranscript={ieltsUserAnswer}
            feedback={ieltsFeedbackData}
            fluency={ieltsSpeakingFluency}
            onRetry={() => {
              if (selectedIeltsQuestion.questionType === 'mock_test') startIeltsMock();
              else startIeltsSpeaking(selectedIeltsQuestion);
            }}
            onBackToHub={() => {
              setSelectedIeltsQuestion(null);
              setIeltsFeedbackData(null);
              setIeltsUserAnswer('');
              setIeltsSpeakingFluency(null);
              setPhase(AppPhase.IELTS_SPEAKING_HUB);
            }}
          />
        ) : null;

      default:
        return <div>Không tìm thấy màn hình này.</div>;
    }
  };

  const showHeader = phase !== AppPhase.LANDING && phase !== AppPhase.AUTH;
  const showLessonBar =
    showHeader && !!lessonData && (isLessonPhase(phase) || phase === AppPhase.LESSON_SUMMARY);
  const showAppTabBar = showHeader && !!currentUser && showsTabBar(phase);
  const today = new Date().toDateString();
  const flashcardsRated = Object.values(lessonMasteryMap).some(
    (r: any) => !!r?.last_reviewed_at && new Date(r.last_reviewed_at).toDateString() === today,
  );
  const lessonStepList = lessonStepStates(phase, flashcardsRated, lessonData?.progress);

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
          <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
            {/* Logo */}
            <button
              type="button"
              className="flex min-h-touch items-center gap-2 flex-shrink-0 rounded-lg"
              onClick={() => navigateWithConfirm(AppPhase.DASHBOARD)}
              aria-label="VocabMaster, về trang chủ"
            >
              <img src="/avatarandlogo.png" className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shadow-sm border border-slate-100 dark:border-slate-700" alt="" />
              <span className="font-bold text-sm sm:text-base tracking-tight hidden sm:inline">VocabMaster</span>
            </button>

            {/* Right side */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <AppNavDesktop
                  phase={phase}
                  analyticsSection={analyticsSection}
                  dueCount={dueCount}
                  onNavigate={navigateTo}
                  compact={isLessonPhase(phase)}
                />
                <div className="hidden md:block mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

                {/* Proactive Save Button during learning session */}
                {lessonData && isLessonPhase(phase) && (
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
                    className={`${headerAction('save')} px-2 disabled:opacity-50 xl:px-3`}
                    title="Lưu tiến trình bài học"
                    aria-label={isSaving ? 'Đang lưu bài học' : 'Lưu bài học'}
                  >
                    {isSaving ? (
                      <Loader2 className={`w-4 h-4 animate-spin ${toneClasses(TAB_TONE.save).text}`} />
                    ) : (
                      <Save className={`w-4 h-4 ${headerIcon('save')}`} />
                    )}
                    <span className="hidden xl:inline" aria-hidden="true">{isSaving ? 'Đang lưu…' : 'Lưu'}</span>
                  </button>
                )}

                <ConnectionIndicator />

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={headerAction('theme')}
                  title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                  aria-label={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                >
                  {darkMode ? <Sun className={`w-5 h-5 ${headerIcon('theme')}`} /> : <Moon className={`w-5 h-5 ${headerIcon('theme')}`} />}
                </button>
                <button
                  onClick={() => navigateTo({ phase: AppPhase.HISTORY })}
                  aria-current={phase === AppPhase.HISTORY ? 'page' : undefined}
                  className={
                    phase === AppPhase.HISTORY
                      ? `press group inline-flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-colors ${toneClasses(TAB_TONE.history).tile}`
                      : `${headerAction('history')} px-2`
                  }
                  title="Lịch sử học tập"
                >
                  <History className={`w-4 h-4 ${headerIcon('history')}`} />
                  <span className="sr-only xl:not-sr-only">Lịch sử</span>
                </button>

                <div className="hidden xl:flex items-center gap-1.5 bg-tone-periwinkle px-2.5 py-1 rounded-full border border-tone-periwinkle-border">
                  <img src="/avatarandlogo.png" className="w-5 h-5 rounded-full object-cover border border-blue-100 dark:border-slate-700 shadow-sm" alt="" />
                  <span className="text-xs font-semibold text-tone-periwinkle-fg max-w-[100px] truncate">{currentUser.displayName}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className={headerAction('logout')}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className={`w-4 h-4 ${headerIcon('logout')}`} />
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {showLessonBar && (
        <LessonStepper
          steps={lessonStepList}
          onSelect={setPhase}
          onExit={() => navigateWithConfirm(AppPhase.DASHBOARD)}
        />
      )}

      {showHeader ? (
        <main
          className={`max-w-6xl mx-auto px-4 py-6 sm:py-8 md:py-12 ${
            showAppTabBar ? 'pb-24 md:pb-12' : ''
          }`}
        >
          {error && (
            <div className="bg-tone-blush border border-tone-blush-border text-tone-blush-fg pl-4 pr-12 py-3 rounded-xl relative mb-6 text-sm" role="alert">
              <strong className="font-bold">Lỗi: </strong>
              <span>{error}</span>
              <button
                type="button"
                className="absolute top-0 right-0 inline-flex min-h-touch min-w-touch items-center justify-center text-lg"
                onClick={() => setError(null)}
                aria-label="Đóng thông báo lỗi"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}
          {renderContent()}
        </main>
      ) : (
        renderContent()
      )}

      {/* Desktop footer — the mobile tab bar takes the bottom edge below 768px */}
      {showHeader && (
        <footer className="hidden md:block py-6 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
          <p>© {new Date().getFullYear()} VocabMaster · Nội dung tạo bởi Gemini</p>
        </footer>
      )}

      {/* Mobile app tab bar */}
      {showAppTabBar && (
        <AppNavMobile
          phase={phase}
          analyticsSection={analyticsSection}
          dueCount={dueCount}
          onNavigate={navigateTo}
        />
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
                <div className="text-xs text-slate-500 dark:text-slate-400">Chủ đề:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{recoveredDraft.lessonSettings?.topic || 'General'}</div>
                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">
                    Cấp độ: {recoveredDraft.lessonSettings?.level || 'B1'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
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
          <div role="dialog" aria-modal="true" aria-labelledby="save-lesson-title" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 border border-slate-100 dark:border-slate-700">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 id="save-lesson-title" className="text-lg font-bold text-slate-900 dark:text-white">Lưu bài học này?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Bạn có muốn lưu bài học hiện tại vào lịch sử không?
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                disabled={isSaving}
                onClick={handleModalYes}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full py-3 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Không lưu
              </button>
              <button
                disabled={isSaving}
                onClick={handleModalContinue}
                className="w-full min-h-touch py-2.5 text-blue-700 dark:text-blue-300 font-semibold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        action={toast?.action}
        durationMs={toast?.durationMs}
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
        <IeltsChatBox key={currentUser.id} darkMode={darkMode} currentUser={currentUser} currentPhase={phase} />
      )}
    </div>
  );
}

export default App;
