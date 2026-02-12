import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, RotateCcw, Award, ArrowRight, PenTool } from 'lucide-react';
import { FlashcardData } from '../types';
import { Button, ProgressBar } from '../components/Common';

interface FillBlankModeProps {
    cards: FlashcardData[];
    onFinish: () => void;
    onComplete?: (score: number, total: number) => void;
}

interface BlankQuestion {
    id: string;
    sentence: string;
    blankedSentence: string;
    answer: string;
    word: string;
    hint: string;
}

const FillBlankMode: React.FC<FillBlankModeProps> = ({ cards, onFinish, onComplete }) => {
    const questions = useMemo(() => generateQuestions(cards), [cards]);

    const [currentQuestions, setCurrentQuestions] = useState<BlankQuestion[]>(questions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [results, setResults] = useState<Map<string, boolean>>(new Map());
    const [isComplete, setIsComplete] = useState(false);
    const [retryMode, setRetryMode] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const current = currentQuestions[currentIndex];
    const progress = ((currentIndex) / currentQuestions.length) * 100;

    useEffect(() => {
        inputRef.current?.focus();
    }, [currentIndex, currentQuestions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userAnswer.trim() || status !== 'idle') return;

        const isCorrect = userAnswer.trim().toLowerCase() === current.answer.toLowerCase();
        setStatus(isCorrect ? 'correct' : 'wrong');

        if (!retryMode) {
            setResults(prev => new Map(prev).set(current.id, isCorrect));
        }
    };

    const handleNext = () => {
        if (currentIndex < currentQuestions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer('');
            setStatus('idle');
        } else {
            // End of round
            if (retryMode) {
                // Check if all correct now
                const stillWrong = currentQuestions.filter((_, idx) => {
                    // In retry mode, check if the answer was wrong this round
                    return idx <= currentIndex && status === 'wrong' && idx === currentIndex;
                });
                // Simplified: just finish retry
                setIsComplete(true);
            } else {
                const correctCount = Array.from(results.values()).filter(v => v).length + (status === 'correct' ? 1 : 0);
                onComplete?.(correctCount, questions.length);
                setIsComplete(true);
            }
        }
    };

    const handleRetryWrong = () => {
        // Get wrong answers
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
        setIsComplete(false);
        setRetryMode(true);
    };

    const handleRestartAll = () => {
        setCurrentQuestions(questions);
        setCurrentIndex(0);
        setUserAnswer('');
        setStatus('idle');
        setResults(new Map());
        setIsComplete(false);
        setRetryMode(false);
    };

    const correctCount = Array.from(results.values()).filter(v => v).length;
    const wrongCount = Array.from(results.values()).filter(v => !v).length;

    if (isComplete) {
        return (
            <div className="max-w-md mx-auto text-center space-y-6 pt-8 animate-fade-in px-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {retryMode ? 'Ôn tập hoàn thành!' : 'Kiểm tra hoàn thành!'}
                </h2>

                {!retryMode && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                        <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {correctCount}/{questions.length}
                        </div>
                        <p className="text-slate-500">
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

    return (
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-4">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-2">
                        <PenTool className="w-4 h-4" />
                        {retryMode ? 'Ôn tập' : 'Điền từ'} {currentIndex + 1}/{currentQuestions.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <ProgressBar progress={progress} />
            </div>

            {/* Word Bank */}
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200">
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
                                            : 'bg-white text-slate-600 border-slate-200 shadow-sm'
                                    }`}
                            >
                                {card.word}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full">
                        Fill in the Blank
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                        {current.word}
                    </span>
                </div>

                {/* Hint */}
                <p className="text-sm text-slate-400 mb-4 italic">
                    💡 {current.hint}
                </p>

                {/* Sentence with blank */}
                <p className="text-lg sm:text-xl font-medium text-slate-800 leading-relaxed mb-6">
                    {renderBlankedSentence(current.blankedSentence, status, current.answer, userAnswer)}
                </p>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        disabled={status !== 'idle'}
                        placeholder="Gõ đáp án..."
                        className={`w-full px-4 py-3 rounded-xl border-2 text-base sm:text-lg font-medium outline-none transition-all ${status === 'correct'
                            ? 'border-green-400 bg-green-50 text-green-700'
                            : status === 'wrong'
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700'
                            }`}
                        autoComplete="off"
                        autoCapitalize="off"
                    />

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
                    <div className="bg-green-100 border border-green-200 p-4 rounded-xl flex items-center justify-between animate-fade-in flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-200 p-2 rounded-full">
                                <CheckCircle className="w-5 h-5 text-green-700" />
                            </div>
                            <p className="font-bold text-green-800">Chính xác! 🎉</p>
                        </div>
                        <Button onClick={handleNext} className="w-full sm:w-auto">
                            {currentIndex === currentQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp'}
                        </Button>
                    </div>
                )}

                {status === 'wrong' && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl space-y-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-500" />
                            <div>
                                <p className="font-bold text-red-800">Chưa đúng!</p>
                                <p className="text-sm text-red-600">
                                    Đáp án: <span className="font-bold">{current.answer}</span>
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleNext} className="w-full sm:w-auto">
                            {currentIndex === currentQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Helpers ---

function generateQuestions(cards: FlashcardData[]): BlankQuestion[] {
    return cards.map(card => {
        const sentence = card.exampleSentence;
        const word = card.word;

        // Create a regex to find the word (case-insensitive) in the sentence
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
                className={`inline-block min-w-[80px] border-b-2 px-1 mx-1 font-bold ${status === 'correct'
                    ? 'border-green-500 text-green-700'
                    : status === 'wrong'
                        ? 'border-red-400 text-red-600'
                        : 'border-blue-400 text-blue-600'
                    }`}
            >
                {status !== 'idle' ? answer : userAnswer || '...'}
            </span>
            {parts[1]}
        </span>
    );
}

export default FillBlankMode;
