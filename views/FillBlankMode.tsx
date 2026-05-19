import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, RotateCcw, Award, ArrowRight, PenTool, Save, Eye, EyeOff } from 'lucide-react';
import { FlashcardData } from '../types';
import { Button, ProgressBar } from '../components/Common';

interface FillBlankModeProps {
    cards: FlashcardData[];
    onFinish: () => void;
    onComplete?: (score: number, total: number) => void;
    onSave?: () => Promise<void>;
}

interface BlankQuestion {
    id: string;
    sentence: string;
    blankedSentence: string;
    answer: string;
    word: string;
    hint: string;
}

/** Max wrong attempts before auto-advancing to next question */
const MAX_ATTEMPTS = 5;

const FillBlankMode: React.FC<FillBlankModeProps> = ({ cards, onFinish, onComplete, onSave }) => {
    const questions = useMemo(() => generateQuestions(cards), [cards]);

    const [currentQuestions, setCurrentQuestions] = useState<BlankQuestion[]>(questions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'exhausted'>('idle');
    const [attempts, setAttempts] = useState(0);
    const [results, setResults] = useState<Map<string, boolean>>(new Map());
    const [isComplete, setIsComplete] = useState(false);
    const [retryMode, setRetryMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const current = currentQuestions[currentIndex];
    const progress = ((currentIndex) / currentQuestions.length) * 100;

    useEffect(() => {
        inputRef.current?.focus();
    }, [currentIndex, currentQuestions]);

    // Reset hint visibility when moving to next question
    useEffect(() => {
        setShowHint(false);
        setAttempts(0);
    }, [currentIndex]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userAnswer.trim() || status === 'correct' || status === 'exhausted') return;

        const isCorrect = userAnswer.trim().toLowerCase() === current.answer.toLowerCase();

        if (isCorrect) {
            setStatus('correct');
            if (!retryMode) {
                setResults(prev => new Map(prev).set(current.id, true));
            }
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= MAX_ATTEMPTS) {
                // Exhausted all attempts — show answer and move on
                setStatus('exhausted');
                if (!retryMode) {
                    setResults(prev => new Map(prev).set(current.id, false));
                }
            } else {
                // Wrong but can retry — shake input and clear
                setStatus('wrong');
                // Reset to idle after brief feedback so user can type again
                setTimeout(() => {
                    setStatus('idle');
                    setUserAnswer('');
                    inputRef.current?.focus();
                }, 800);
            }
        }
    };

    const handleNext = () => {
        if (currentIndex < currentQuestions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer('');
            setStatus('idle');
        } else {
            if (retryMode) {
                setIsComplete(true);
            } else {
                const correctCount = Array.from(results.values()).filter(v => v).length;
                onComplete?.(correctCount, questions.length);
                setIsComplete(true);
            }
        }
    };

    const handleRetryWrong = () => {
        const wrongIds = new Set<string>();
        results.forEach((correct, id) => {
            if (!correct) wrongIds.add(id);
        });
        const wrongQuestions = questions.filter(q => wrongIds.has(q.id));

        if (wrongQuestions.length === 0) return;

        setCurrentQuestions(wrongQuestions);
        setCurrentIndex(0);
        setUserAnswer('');
        setStatus('idle');
        setAttempts(0);
        setIsComplete(false);
        setRetryMode(true);
    };

    const handleRestartAll = () => {
        setCurrentQuestions(questions);
        setCurrentIndex(0);
        setUserAnswer('');
        setStatus('idle');
        setAttempts(0);
        setResults(new Map());
        setIsComplete(false);
        setRetryMode(false);
    };

    const correctCount = Array.from(results.values()).filter(v => v).length;
    const wrongCount = Array.from(results.values()).filter(v => !v).length;

    // ─── COMPLETION SCREEN ──────────────────────────────────────────
    if (isComplete) {
        return (
            <div className="max-w-md mx-auto text-center space-y-6 pt-8 animate-fade-in px-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {retryMode ? 'Ôn tập hoàn thành!' : 'Kiểm tra hoàn thành!'}
                </h2>

                {!retryMode && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
                        <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {correctCount}/{questions.length}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                            {Math.round((correctCount / questions.length) * 100)}% chính xác
                        </p>
                        <div className="flex justify-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" /> {correctCount} đúng
                            </span>
                            <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="w-4 h-4" /> {wrongCount} sai
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {/* Save lesson button */}
                    {onSave && !saved && !isSaving && (
                        <Button
                            onClick={async () => {
                                setIsSaving(true);
                                try {
                                    await onSave();
                                    setSaved(true);
                                } catch (err: any) {
                                    console.error('[FillBlank] Save failed:', err);
                                    const msg = err?.message || err?.toString() || 'Lỗi không xác định';
                                    alert(`❌ Không thể lưu bài học:\n\n${msg}\n\nVui lòng kiểm tra Console (F12) để xem chi tiết.`);
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            className="w-full py-4 text-base"
                        >
                            <Save className="w-5 h-5 mr-2" /> 💾 Lưu bài học
                        </Button>
                    )}

                    {/* Saving animation */}
                    {isSaving && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <div className="relative w-20 h-20">
                                <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="35" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                    <circle cx="40" cy="40" r="35" fill="none" stroke="url(#saveGradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray="160" strokeDashoffset="120" />
                                    <defs>
                                        <linearGradient id="saveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#8b5cf6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Save className="w-8 h-8 text-blue-600 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Đang lưu bài học của bạn...</p>
                            <p className="text-xs text-slate-400">Vui lòng đợi trong giây lát ✨</p>
                        </div>
                    )}

                    {/* Success celebration */}
                    {saved && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-3 anim-scale-in">
                            <div className="relative">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-9 h-9 text-emerald-500" />
                                </div>
                                <span className="absolute -top-1 -right-1 text-lg animate-bounce">✨</span>
                                <span className="absolute -bottom-1 -left-1 text-sm animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
                                <span className="absolute top-0 -left-3 text-xs animate-bounce" style={{ animationDelay: '0.4s' }}>⭐</span>
                            </div>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Đã lưu thành công!</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Bạn có thể xem lại trong Lịch sử học tập</p>
                        </div>
                    )}

                    {!retryMode && wrongCount > 0 && (
                        <Button onClick={handleRetryWrong} variant="primary" className="w-full">
                            <RotateCcw className="w-4 h-4 mr-2" /> Làm lại {wrongCount} câu sai
                        </Button>
                    )}
                    <Button onClick={handleRestartAll} variant="outline" className="w-full">
                        <RotateCcw className="w-4 h-4 mr-2" /> Làm lại tất cả
                    </Button>
                    <Button onClick={onFinish} variant="ghost" className="w-full">
                        <ArrowRight className="w-4 h-4 mr-2" /> Quay về Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    // ─── ACTIVE QUESTION SCREEN ─────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-4">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                        <PenTool className="w-4 h-4" />
                        {retryMode ? 'Ôn tập' : 'Điền từ'} {currentIndex + 1}/{currentQuestions.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <ProgressBar progress={progress} />
            </div>

            {/* Word Bank */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Word Bank</label>
                <div className="flex flex-wrap gap-2">
                    {cards.map((card) => {
                        const isCorrect = results.get(card.id) === true;
                        const isIncorrect = results.get(card.id) === false;
                        return (
                            <span
                                key={card.id}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all border ${isCorrect
                                    ? 'bg-green-50 text-green-600 border-green-100 opacity-50'
                                    : isIncorrect
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 shadow-sm'
                                    }`}
                            >
                                {card.word}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-slate-800 p-5 sm:p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-bold rounded-full">
                            Fill in the Blank
                        </span>
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-full">
                            {current.word}
                        </span>
                    </div>
                    {/* Attempts counter */}
                    {attempts > 0 && status !== 'correct' && status !== 'exhausted' && (
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            Lần thử: {attempts}/{MAX_ATTEMPTS}
                        </span>
                    )}
                </div>

                {/* Hint — hidden by default, toggle to show */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                    >
                        {showHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
                    </button>
                    {showHint && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1.5 italic pl-5">
                            💡 {current.hint}
                        </p>
                    )}
                </div>

                {/* Sentence with blank */}
                <p className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-6">
                    {renderBlankedSentence(current.blankedSentence, status, current.answer, userAnswer)}
                </p>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={status === 'correct' || status === 'exhausted'}
                            placeholder="Gõ đáp án..."
                            className={`w-full px-4 py-3 rounded-xl border-2 text-base sm:text-lg font-medium outline-none transition-all ${
                                status === 'correct'
                                    ? 'border-green-400 bg-green-50 text-green-700'
                                    : status === 'wrong'
                                        ? 'border-red-300 bg-red-50 text-red-700 animate-[shake_0.3s_ease-in-out]'
                                        : status === 'exhausted'
                                            ? 'border-orange-300 bg-orange-50 text-orange-700'
                                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 dark:text-slate-200'
                            }`}
                            autoComplete="off"
                            autoCapitalize="off"
                        />
                        {/* Remaining attempts indicator */}
                        {status === 'idle' && attempts > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                                {MAX_ATTEMPTS - attempts} lần còn lại
                            </span>
                        )}
                    </div>

                    {status === 'idle' && (
                        <Button type="submit" disabled={!userAnswer.trim()} className="w-full py-3">
                            Kiểm tra
                        </Button>
                    )}
                </form>
            </div>

            {/* Feedback */}
            <div className="min-h-[80px]">
                {status === 'correct' && (
                    <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-200 dark:bg-green-800 p-2 rounded-full">
                                <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-300" />
                            </div>
                            <div>
                                <p className="font-bold text-green-800 dark:text-green-200">Chính xác! 🎉</p>
                                {attempts > 0 && (
                                    <p className="text-xs text-green-600 dark:text-green-400">Sau {attempts + 1} lần thử</p>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleNext} className="w-full sm:w-auto">
                            {currentIndex === currentQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp →'}
                        </Button>
                    </div>
                )}

                {status === 'wrong' && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-orange-800 dark:text-orange-200">Chưa đúng — thử lại!</p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Còn {MAX_ATTEMPTS - attempts} lần thử. Hãy nhớ lại nghĩa của từ.
                            </p>
                        </div>
                    </div>
                )}

                {status === 'exhausted' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-red-800 dark:text-red-200">Hết lượt thử!</p>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    Đáp án đúng: <span className="font-bold">{current.answer}</span>
                                </p>
                                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                    Từ này sẽ xuất hiện lại để bạn luyện tập thêm.
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleNext} className="w-full sm:w-auto">
                            {currentIndex === currentQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp →'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── HELPERS ────────────────────────────────────────────────────────

function generateQuestions(cards: FlashcardData[]): BlankQuestion[] {
    return cards.map(card => {
        const sentence = card.exampleSentence;
        const word = card.word;
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
        const blankedSentence = sentence.replace(regex, '___');

        return {
            id: card.id,
            sentence,
            blankedSentence,
            answer: word,
            word,
            hint: card.meaningVietnamese,
        };
    });
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderBlankedSentence(text: string, status: string, answer: string, userAnswer: string) {
    const parts = text.split('___');
    if (parts.length < 2) return <span>{text}</span>;

    return (
        <span>
            {parts[0]}
            <span
                className={`inline-block min-w-[80px] border-b-2 px-1 mx-1 font-bold ${
                    status === 'correct'
                        ? 'border-green-500 text-green-700'
                        : status === 'exhausted'
                            ? 'border-red-400 text-red-600'
                            : status === 'wrong'
                                ? 'border-orange-400 text-orange-600'
                                : 'border-blue-400 text-blue-600'
                }`}
            >
                {status === 'correct' || status === 'exhausted' ? answer : userAnswer || '...'}
            </span>
            {parts[1]}
        </span>
    );
}

export default FillBlankMode;
