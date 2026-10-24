import React, { useState, useMemo } from 'react';
import { X, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { DifficultyLevel, VocabularyTemplate } from '../types';
import { VOCABULARY_TEMPLATES } from '../data/vocabularyTemplates';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: VocabularyTemplate) => void;
}

const LEVEL_FILTERS: Array<{ value: DifficultyLevel | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: DifficultyLevel.A1, label: 'A1' },
  { value: DifficultyLevel.A2, label: 'A2' },
  { value: DifficultyLevel.B1, label: 'B1' },
  { value: DifficultyLevel.B2, label: 'B2' },
  { value: DifficultyLevel.C1, label: 'C1' },
];

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-tone-mint-soft text-tone-mint-fg',
  A2: 'bg-tone-mint-soft text-tone-mint-fg',
  B1: 'bg-tone-sky-soft text-tone-sky-fg',
  B2: 'bg-tone-periwinkle-soft text-tone-periwinkle-fg',
  C1: 'bg-tone-lavender-soft text-tone-lavender-fg',
  C2: 'bg-tone-blush-soft text-tone-blush-fg',
};

const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel | 'ALL'>('ALL');

  const filteredTemplates = useMemo(() => {
    if (selectedLevel === 'ALL') return VOCABULARY_TEMPLATES;
    return VOCABULARY_TEMPLATES.filter((t) => t.cefrLevel === selectedLevel);
  }, [selectedLevel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tone-sky-soft rounded-xl">
              <BookOpen className="w-5 h-5 text-tone-sky-fg" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thư viện từ vựng</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chọn chủ đề và bắt đầu học ngay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Filter */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            {LEVEL_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedLevel(filter.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedLevel === filter.value
                    ? 'bg-tone-sky-soft text-tone-sky-fg shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-tone-sky-border hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    {template.name}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${LEVEL_COLORS[template.cefrLevel] || 'bg-slate-100 text-slate-600'}`}>
                    {template.cefrLevel}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                    {template.topic}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {template.words.length} từ
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {template.samplePreview.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium"
                    >
                      {word}
                    </span>
                  ))}
                  {template.words.length > template.samplePreview.length && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
                      +{template.words.length - template.samplePreview.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onSelectTemplate(template)}
                  className="w-full py-2.5 bg-tone-sky-soft hover:bg-tone-sky-soft text-tone-sky-fg font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Học ngay
                </button>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Không có template cho cấp độ này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateLibraryModal;
