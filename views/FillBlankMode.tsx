import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, RotateCcw, Award, ArrowRight, PenTool, Eye, EyeOff, SkipForward } from 'lucide-react';
import { FlashcardData, type ConfidenceRating } from '../types';
import { Button, ProgressBar } from '../components/Common';
import { findWordForm, gradeTypedAnswer } from '../services/reviewLogic';
import { applyRating } from '../services/reviewService';

interface FillBlankModeProps {
    cards: FlashcardData[];
    onFinish: () => void;
    /** First pass done: score, and the words missed. The lesson moves on to its summary. */
    onComplete?: (score: number, total: number, wrongWords: string[]) => void;
    /** When set, each first-pass result is written to the learner's SRS record. */
    userId?: string;
}

interface BlankQuestion {
    id: string;
    /**
     * 'sentence': the example sentence with the word blanked out.
     * 'definition': fallback when the word can't be located in the
     * sentence — the learner recalls the word from its English definition.
     */
    kind: 'sentence' | 'definition';
    blankedSentence: string;
    /** Exact form expected in the blank (may be inflected, e.g. "decided"). */
    answer: string;
    /** Dictionary form of the vocabulary word. */
    word: string;
    partOfSpeech: string;
    hint: string;
}

/** Max wrong attempts before auto-advancing to next question */
const MAX_ATTEMPTS = 3;

const FillBlankMode: React.FC<FillBlankModeProps> = ({ cards, onFinish, onComplete, userId }) => {
    const questions = useMemo(() => generateQuestions(cards), [cards]);

    const [currentQuestions, setCurrentQuestions] = useState<BlankQuestion[]>(questions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'exhausted'>('idle');
    const [attempts, setAttempts] = useState(0);
    const [results, setResults] = useState<Map<string, boolean>>(new Map());
    const [isComplete, setIsComplete] = useState(false);
    const [retryMode, setRetryMode] = useState(false);
    const [showHint, setShowHint] = useState(false);
    // Hint was opened at any point for the current question (affects SRS rating)
    const [hintUsed, setHintUsed] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const current = currentQuestions[currentIndex];
    const progress = ((currentIndex) / currentQuestions.length) * 100;

    useEffect(() => {
        inputRef.current?.focus();
    }, [currentIndex, currentQuestions]);

    // Reset hint visibility when moving to next question
    useEffect(() => {
        setShowHint(false);
        setHintUsed(false);
        setFeedback(null);
        setAttempts(0);
    }, [currentIndex, currentQuestions]);

    /**
     * Fire-and-forget SRS write for the first pass through a question.
     * Exact on first try without hint → Good; needed help → Hard; failed → Again.
     */
    const recordResult = (rating: ConfidenceRating) => {
        if (!userId || retryMode) return;
        void applyRating({ userId, word: current.word, rating, source: 'fill_blank', creditGoal: false }).catch((err) =>
            console.error('[FillBlank] Failed to record review:', err),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userAnswer.trim() || status === 'correct' || status === 'exhausted') return;

        const { grade, reason } = gradeTypedAnswer(userAnswer, current.answer, [current.word]);

        if (grade === 'correct' || (grade === 'close' && reason === 'typo')) {
            setStatus('correct');
            setFeedback(grade === 'close' ? `Gần đúng! Chú ý chính tả: "${current.answer}"` : null);
            if (!retryMode) {
                setResults(prev => new Map(prev).set(current.id, true));
            }
            const clean = grade === 'correct' && attempts === 0 && !hintUsed;
            recordResult(clean ? 2 : 1);
            return;
        }

        if (grade === 'close' && reason === 'form') {
            // Right word, wrong form — don't burn an attempt, just nudge.
            setFeedback('Đúng từ rồi! Hãy chia lại cho hợp ngữ pháp (thì, số nhiều, -ing…).');
            setStatus('wrong');
            setTimeout(() => {
                setStatus('idle');
                inputRef.current?.focus();
            }, 1200);
            return;
        }

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setFeedback(null);

        if (newAttempts >= MAX_ATTEMPTS) {
            revealAnswer();
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
    };

    /** Give up on the current question: show the answer and count it wrong. */
    const revealAnswer = () => {
        setStatus('exhausted');
        setFeedback(null);
        if (!retryMode) {
            setResults(prev => new Map(prev).set(current.id, false));
        }
        recordResult(0);
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
                const wrongWords = questions.filter(q => results.get(q.id) === false).map(q => q.word);
                setIsComplete(true);
                onComplete?.(correctCount, questions.length, wrongWords);
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
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-tone-sky-soft rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 sm:w-12 sm:h-12 text-tone-sky-fg" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {retryMode ? 'Ôn tập hoàn thành!' : 'Kiểm tra hoàn thành!'}
                </h2>

                {!retryMode && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
                        <div className="text-4xl font-bold text-tone-periwinkle-fg">
                            {correctCount}/{questions.length}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                            {Math.round((correctCount / questions.length) * 100)}% chính xác
                        </p>
                        <div className="flex justify-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-tone-mint-fg">
                                <CheckCircle className="w-4 h-4" /> {correctCount} đúng
                            </span>
                            <span className="flex items-center gap-1 text-tone-blush-fg">
                                <XCircle className="w-4 h-4" /> {wrongCount} sai
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {!retryMode && wrongCount > 0 && (
                        <Button onClick={handleRetryWrong} variant="primary" className="w-full">
                            <RotateCcw className="w-4 h-4 mr-2" /> Làm lại {wrongCount} câu sai
                        </Button>
                    )}
                    <Button onClick={handleRestartAll} variant="outline" className="w-full">
                        <RotateCcw className="w-4 h-4 mr-2" /> Làm lại tất cả
                    </Button>
                    <Button onClick={onFinish} variant="ghost" className="w-full">
                        <ArrowRight className="w-4 h-4 mr-2" /> {onComplete ? 'Xem tổng kết' : 'Quay về trang chủ'}
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
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Ngân hàng từ</label>
                <div className="flex flex-wrap gap-2">
                    {cards.map((card) => {
                        const isCorrect = results.get(card.id) === true;
                        const isIncorrect = results.get(card.id) === false;
                        return (
                            <span
                                key={card.id}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all border ${isCorrect
                                    ? 'bg-tone-mint text-tone-mint-fg border-tone-mint-border opacity-50'
                                    : isIncorrect
                                        ? 'bg-tone-blush text-tone-blush-fg border-tone-blush-border'
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
                        <span className="px-3 py-1 bg-tone-lavender text-tone-lavender-fg text-xs font-bold rounded-full">
                            Điền vào chỗ trống
                        </span>
                        {current.partOfSpeech && (
                            <span className="px-3 py-1 bg-tone-sky text-tone-sky-fg text-xs font-bold rounded-full">
                                {current.partOfSpeech}
                            </span>
                        )}
                    </div>
                    {/* Attempts counter */}
                    {attempts > 0 && status !== 'correct' && status !== 'exhausted' && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Lần thử: {attempts}/{MAX_ATTEMPTS}
                        </span>
                    )}
                </div>

                {/* Hint — hidden by default, toggle to show */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            setShowHint(!showHint);
                            setHintUsed(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-tone-sky-fg transition-colors"
                    >
                        {showHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
                    </button>
                    {showHint && (
                        <p className="text-sm text-tone-butter-fg mt-1.5 italic pl-5">
                            {current.hint}
                        </p>
                    )}
                </div>

                {/* Sentence with blank (or definition prompt as fallback) */}
                {current.kind === 'definition' && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Từ nào khớp với định nghĩa này?
                    </p>
                )}
                <p className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-6">
                    {current.kind === 'definition' ? (
                        <>
                            <span className="italic">“{current.blankedSentence}”</span>
                            <br />
                            {renderBlankedSentence('→ ___', status, current.answer, userAnswer)}
                        </>
                    ) : (
                        renderBlankedSentence(current.blankedSentence, status, current.answer, userAnswer)
                    )}
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
                            className={`w-full px-4 py-3 rounded-xl border-2 text-base sm:text-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-tone-periwinkle-border transition-all ${
                                status === 'correct'
                                    ? 'border-tone-mint-border bg-tone-mint text-tone-mint-fg'
                                    : status === 'wrong'
                                        ? 'border-tone-blush-border bg-tone-blush text-tone-blush-fg animate-[shake_0.3s_ease-in-out]'
                                        : status === 'exhausted'
                                            ? 'border-tone-peach-border bg-tone-peach text-tone-peach-fg'
                                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:border-tone-sky-border focus:ring-2 focus:ring-tone-sky-border text-slate-700 dark:text-slate-200'
                            }`}
                            autoComplete="off"
                            autoCapitalize="off"
                        />
                        {/* Remaining attempts indicator */}
                        {status === 'idle' && attempts > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-tone-peach-fg bg-tone-peach-soft px-2 py-0.5 rounded-full">
                                {MAX_ATTEMPTS - attempts} lần còn lại
                            </span>
                        )}
                    </div>

                    {status === 'idle' && (
                        <div className="flex gap-2">
                            <Button type="submit" disabled={!userAnswer.trim()} className="flex-1 py-3">
                                Kiểm tra
                            </Button>
                            <Button type="button" variant="ghost" onClick={revealAnswer} className="py-3" title="Bỏ qua và xem đáp án">
                                <SkipForward className="w-4 h-4 mr-1" /> Xem đáp án
                            </Button>
                        </div>
                    )}
                </form>
            </div>

            {/* Feedback */}
            <div className="min-h-[80px]">
                {status === 'correct' && (
                    <div className="bg-tone-mint-soft border border-tone-mint-border p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-tone-mint-border p-2 rounded-full">
                                <CheckCircle className="w-5 h-5 text-tone-mint-fg" />
                            </div>
                            <div>
                                <p className="font-bold text-tone-mint-fg">Chính xác!</p>
                                {feedback && (
                                    <p className="text-xs text-tone-mint-fg">{feedback}</p>
                                )}
                                {attempts > 0 && (
                                    <p className="text-xs text-tone-mint-fg">Sau {attempts + 1} lần thử</p>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleNext} className="w-full sm:w-auto">
                            {currentIndex === currentQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp →'}
                        </Button>
                    </div>
                )}

                {status === 'wrong' && (
                    <div className="bg-tone-peach border border-tone-peach-border p-4 rounded-xl flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-tone-peach-fg flex-shrink-0" />
                        <div>
                            <p className="font-bold text-tone-peach-fg">
                                {feedback ? 'Sắp đúng rồi!' : 'Chưa đúng — thử lại!'}
                            </p>
                            <p className="text-sm text-tone-peach-fg">
                                {feedback ?? `Còn ${MAX_ATTEMPTS - attempts} lần thử. Hãy nhớ lại nghĩa của từ.`}
                            </p>
                        </div>
                    </div>
                )}

                {status === 'exhausted' && (
                    <div className="bg-tone-blush border border-tone-blush-border p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-tone-blush-fg flex-shrink-0" />
                            <div>
                                <p className="font-bold text-tone-blush-fg">
                                    {attempts >= MAX_ATTEMPTS ? 'Hết lượt thử!' : 'Đáp án'}
                                </p>
                                <p className="text-sm text-tone-blush-fg">
                                    Đáp án đúng: <span className="font-bold">{current.answer}</span>
                                </p>
                                <p className="text-xs text-tone-blush-fg mt-1">
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
        const sentence = card.exampleSentence || '';
        const word = card.word;
        const base = {
            id: card.id,
            word,
            partOfSpeech: card.partOfSpeech || '',
            hint: card.meaningVietnamese,
        };

        // Locate the word even when inflected ("decide" → "decided") so the
        // blank never silently disappears and leaks the answer.
        const match = findWordForm(sentence, word);
        if (match) {
            return {
                ...base,
                kind: 'sentence' as const,
                blankedSentence:
                    sentence.slice(0, match.index) + '___' + sentence.slice(match.index + match.form.length),
                answer: match.form,
            };
        }

        // Fallback: recall from the English definition, with any occurrence
        // of the word itself masked out.
        const definition = card.definitionEnglish || card.meaningVietnamese;
        return {
            ...base,
            kind: 'definition' as const,
            blankedSentence: maskWord(definition, word),
            answer: word.trim(),
        };
    });
}

function maskWord(text: string, word: string): string {
    let out = text;
    for (let i = 0; i < 5; i++) {
        const match = findWordForm(out, word);
        if (!match) break;
        out = out.slice(0, match.index) + '…' + out.slice(match.index + match.form.length);
    }
    return out;
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
                        ? 'border-tone-mint-border text-tone-mint-fg'
                        : status === 'exhausted'
                            ? 'border-tone-blush-border text-tone-blush-fg'
                            : status === 'wrong'
                                ? 'border-tone-peach-border text-tone-peach-fg'
                                : 'border-tone-sky-border text-tone-sky-fg'
                }`}
            >
                {status === 'correct' || status === 'exhausted' ? answer : userAnswer || '...'}
            </span>
            {parts[1]}
        </span>
    );
}

export default FillBlankMode;
