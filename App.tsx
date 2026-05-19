import React, { useState, useEffect } from 'react';
import { AppPhase, DifficultyLevel, GeneratedLesson, UserSettings } from './types';
import { generateLessonContent } from './services/geminiService';
import { supabase, getProfile, signOut, saveLearningRecord, getLearningRecordFull, LearningRecord } from './services/supabaseClient';
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
import { Toast } from './components/Common';
import { Loader2, Layout, LogOut, User, History, BookOpen, Headphones, HelpCircle, PenTool, Menu, Sun, Moon, BarChart3 } from 'lucide-react';

interface AppUser {
  id: string;
  username: string;
  displayName: string;
}

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
    let initialCheckDone = false;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
      } finally {
        initialCheckDone = true;
        setIsCheckingSession(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
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
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Bạn có chắc muốn đăng xuất?');
    if (!confirmed) return;
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleGenerate = async (text: string, settings: UserSettings) => {
    setIsLoading(true);
    setError(null);
    setLessonSettings(settings);
    setLessonWords(text);
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
    if (!currentUser || !lessonSettings) return;
    const dataToSave = overrideData || lessonData;
    if (!dataToSave) return;

    try {
      console.log("Auto-saving lesson...");
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
        lesson_data: dataToSave,
      });
      if (savedRecord && savedRecord.id) {
        setCurrentRecordId(savedRecord.id);
        console.log("Lesson saved with ID:", savedRecord.id);
      }
    } catch (err) {
      console.error('Failed to save learning record:', err);
    }
  };



  const handleQuizComplete = async (score: number, total: number) => {
    if (!currentUser || !lessonSettings || !lessonData) return;
    try {
      const savedRecord = await saveLearningRecord({
        id: currentRecordId || undefined,
        user_id: currentUser.id,
        topic: lessonSettings.topic || 'General',
        level: lessonSettings.level,
        words: lessonWords,
        quiz_score: score,
        quiz_total: total,
        lesson_data: lessonData,
      });
      if (savedRecord && savedRecord.id) {
        setCurrentRecordId(savedRecord.id);
      }
    } catch (err) {
      console.error('Failed to save learning record:', err);
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
      saveCurrentLesson(updatedLesson);
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
    await saveCurrentLesson();
    setShowSaveModal(false);
    setLessonData(null);
    setCurrentRecordId(null);
    setMobileMenuOpen(false);
    if (pendingNavTarget) setPhase(pendingNavTarget);
    setPendingNavTarget(null);
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
            onStartTargetedLesson={async (lesson) => {
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
              setLessonWords(lesson.flashcards.map((c) => c.word).join(', '));
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
          />
        ) : null;

      case AppPhase.REVIEW_SESSION:
        return currentUser ? (
          <ReviewSession
            userId={currentUser.id}
            onComplete={() => setPhase(AppPhase.DASHBOARD)}
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
                const savedRecord = await saveLearningRecord({
                  id: currentRecordId || undefined,
                  user_id: currentUser.id,
                  topic: lessonSettings.topic || 'General',
                  level: lessonSettings.level,
                  words: lessonWords,
                  quiz_score: 0,
                  quiz_total: lessonData.quiz.length,
                  lesson_data: lessonData,
                });
                console.log('[Save] Saved successfully:', savedRecord?.id);
                if (savedRecord && savedRecord.id) {
                  setCurrentRecordId(savedRecord.id);
                }
              } catch (err: any) {
                console.error('[Save] Failed:', err);
                throw new Error(err?.message || 'Không thể lưu bài học. Vui lòng kiểm tra kết nối.');
              }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-200 selection:text-blue-900 transition-colors duration-300">
      {showHeader && (
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigateWithConfirm(AppPhase.DASHBOARD)}>
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Layout className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight hidden sm:inline">VocabMaster</span>
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
                          px-3 py-1 rounded-full text-xs font-bold transition-all
                          ${isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' : ''}
                          ${isPassed ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                          ${!isActive && !isPassed ? 'text-slate-400 hover:bg-slate-100' : ''}
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {step.label}
                      </button>
                      {idx < lessonSteps.length - 1 && (
                        <div className={`w-4 h-0.5 mx-0.5 rounded transition-colors ${isPassed ? 'bg-green-300' : 'bg-slate-200'}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile step indicator - removed, using bottom nav instead */}

            {/* Right side */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
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
                    group relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm
                    ${phase === AppPhase.HISTORY
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-1 font-bold dark:ring-offset-slate-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-md'
                    }
                  `}
                  title="Xem lịch sử học tập"
                >
                  <History className={`w-4 h-4 transition-transform ${phase !== AppPhase.HISTORY ? 'group-hover:scale-110' : ''}`} />
                  <span className="font-semibold text-sm">Lịch sử</span>
                  {/* Notification dot (optional - could check if history has items, but simple for now) */}
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
                    group relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm
                    ${phase === AppPhase.ANALYTICS
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 ring-2 ring-emerald-500 ring-offset-1 font-bold dark:ring-offset-slate-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-900 hover:shadow-md'
                    }
                  `}
                  title="Xem thống kê học tập"
                >
                  <BarChart3 className={`w-4 h-4 transition-transform ${phase !== AppPhase.ANALYTICS ? 'group-hover:scale-110' : ''}`} />
                  <span className="font-semibold text-sm">Thống kê</span>
                </button>

                <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{currentUser.displayName}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
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

      {/* Save Lesson Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-fade-in">
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
                onClick={handleModalYes}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all"
              >
                Lưu bài học
              </button>
              <button
                onClick={handleModalNo}
                className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
              >
                Không lưu
              </button>
              <button
                onClick={handleModalContinue}
                className="w-full py-2.5 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all text-sm"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-fade-in">
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
    </div>
  );
}

export default App;