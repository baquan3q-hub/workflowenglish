import React, { useState, useEffect } from 'react';
import { History, BookOpen, Calendar, ArrowRight, Loader2, Play, Trash2 } from 'lucide-react';
import { getLearningHistory, deleteLearningRecord, LearningRecord } from '../services/supabaseClient';
import { Button } from '../components/Common';

interface LearningHistoryProps {
    userId: string;
    onStartLesson: () => void;
    onOpenLesson?: (record: LearningRecord) => void;
    isLoadingLesson?: boolean;
}

const LearningHistory: React.FC<LearningHistoryProps> = ({ userId, onStartLesson, onOpenLesson, isLoadingLesson }) => {
    const [records, setRecords] = useState<LearningRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getLearningHistory(userId);
                setRecords(data);
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [userId]);

    const handleDelete = async (e: React.MouseEvent, recordId: string) => {
        e.stopPropagation();
        const confirmed = window.confirm('Bạn có chắc muốn xóa bài học này?');
        if (!confirmed) return;
        try {
            await deleteLearningRecord(recordId);
            setRecords(prev => prev.filter(r => r.id !== recordId));
        } catch (err) {
            console.error('Failed to delete record:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };



    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                            <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        Lịch sử học
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
                        {records.length > 0
                            ? `${records.length} bài học đã hoàn thành`
                            : 'Bạn chưa có bài học nào'}
                    </p>
                </div>
                <Button onClick={onStartLesson} className="shadow-lg w-full sm:w-auto">
                    <BookOpen className="w-4 h-4 mr-2" /> Bài học mới
                </Button>
            </div>

            {/* Loading overlay when opening a lesson */}
            {isLoadingLesson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                        <p className="text-slate-700 dark:text-slate-200 font-semibold">Đang tải bài học...</p>
                    </div>
                </div>
            )}

            {records.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                        <BookOpen className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Chưa có lịch sử</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm sm:text-base">Bắt đầu bài học đầu tiên để xem kết quả ở đây!</p>
                    <Button onClick={onStartLesson}>
                        Bắt đầu ngay <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {records.map((record) => {
                        return (
                            <div
                                key={record.id}
                                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 cursor-pointer"
                                onClick={() => onOpenLesson?.(record)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-800">
                                                {record.level}
                                            </span>
                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-800 truncate max-w-[150px]">
                                                {record.topic}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 truncate">
                                            <span className="font-medium">Từ vựng:</span>{' '}
                                            <span className="text-slate-500 dark:text-slate-400">{record.words}</span>
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(record.completed_at)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">


                                        {/* Open/Regenerate button */}
                                        <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center bg-blue-50 text-blue-600">
                                            <Play className="w-4 h-4" />
                                        </div>

                                        {/* Delete */}
                                        <button
                                            onClick={(e) => handleDelete(e, record.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                                            title="Xóa bài học"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LearningHistory;
