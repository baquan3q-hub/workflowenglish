import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, GraduationCap, Search, X } from 'lucide-react';
import { DifficultyLevel, VocabularyTemplate } from '../types';
import { TEMPLATE_TOPICS, VOCABULARY_TEMPLATES } from '../data/vocabularyTemplates';
import { toneClasses, type Tone } from './ui/palette';
import { field, ghostBtn, primaryBtn, secondaryBtn } from './ui/styles';
import { InteractiveCard } from './ui/InteractiveCard';
import { IconTile } from './ui/IconTile';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: VocabularyTemplate) => void;
}

const LEVELS: DifficultyLevel[] = [
  DifficultyLevel.A1,
  DifficultyLevel.A2,
  DifficultyLevel.B1,
  DifficultyLevel.B2,
  DifficultyLevel.C1,
  DifficultyLevel.C2,
];

/** CEFR levels from fresh mint to warm peach as they get harder (same as the Dashboard). */
const LEVEL_TONE: Record<DifficultyLevel, Tone> = {
  [DifficultyLevel.A1]: 'mint',
  [DifficultyLevel.A2]: 'aqua',
  [DifficultyLevel.B1]: 'sky',
  [DifficultyLevel.B2]: 'periwinkle',
  [DifficultyLevel.C1]: 'lavender',
  [DifficultyLevel.C2]: 'peach',
};

const TOPIC_BY_VALUE = new Map(TEMPLATE_TOPICS.map((t) => [t.value, t]));
const topicTone = (topic: string): Tone => TOPIC_BY_VALUE.get(topic)?.tone ?? 'periwinkle';
const topicLabel = (topic: string): string => TOPIC_BY_VALUE.get(topic)?.label ?? topic;

/** Lower-case and strip Vietnamese accents so "suc khoe" finds "sức khoẻ". */
const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd');

/** Every template sorted by level, with its searchable text precomputed. */
const INDEXED = [...VOCABULARY_TEMPLATES]
  .sort((a, b) => LEVELS.indexOf(a.cefrLevel) - LEVELS.indexOf(b.cefrLevel))
  .map((t) => ({ template: t, haystack: normalize([t.name, ...t.words, ...t.meanings].join(' | ')) }));

const chipBase = 'press min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors';
const chipIdle =
  'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';

const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({ isOpen, onClose, onSelectTemplate }) => {
  const [level, setLevel] = useState<DifficultyLevel | 'ALL'>('ALL');
  const [topic, setTopic] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<VocabularyTemplate | null>(null);

  // Open on the list each time.
  useEffect(() => {
    if (isOpen) setPreview(null);
  }, [isOpen]);

  // Escape steps back from the preview, then closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (preview) setPreview(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, preview, onClose]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return INDEXED.filter(
      ({ template: t, haystack }) =>
        (level === 'ALL' || t.cefrLevel === level) &&
        (topic === 'ALL' || t.topic === topic) &&
        (!q || haystack.includes(q)),
    ).map(({ template }) => template);
  }, [level, topic, query]);

  if (!isOpen) return null;

  const hasFilters = level !== 'ALL' || topic !== 'ALL' || query.trim() !== '';
  const clearFilters = () => {
    setLevel('ALL');
    setTopic('ALL');
    setQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-library-title"
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            {preview ? (
              <button type="button" onClick={() => setPreview(null)} className={ghostBtn} aria-label="Quay lại danh sách">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <IconTile icon={BookOpen} tone="mint" />
            )}
            <div className="min-w-0">
              <h2 id="template-library-title" className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {preview ? preview.name : 'Thư viện từ vựng'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {preview
                  ? `${topicLabel(preview.topic)} · ${preview.cefrLevel} · ${preview.words.length} từ`
                  : 'Chọn một bộ từ để học ngay'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={ghostBtn} aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {preview ? (
          <TemplatePreview template={preview} onBack={() => setPreview(null)} onUse={() => onSelectTemplate(preview)} />
        ) : (
          <>
            {/* Search and filters */}
            <div className="space-y-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên bộ, từ hoặc nghĩa"
                  aria-label="Tìm bộ từ"
                  className={`${field} pl-9`}
                />
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Cấp độ">
                <button
                  type="button"
                  onClick={() => setLevel('ALL')}
                  aria-pressed={level === 'ALL'}
                  className={`${chipBase} ${level === 'ALL' ? `${toneClasses('periwinkle').tile} border-tone-periwinkle-border` : chipIdle}`}
                >
                  Mọi cấp độ
                </button>
                {LEVELS.map((l) => {
                  const tc = toneClasses(LEVEL_TONE[l]);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      aria-pressed={level === l}
                      className={`${chipBase} ${level === l ? `${tc.tile} ${tc.border}` : chipIdle}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Chủ đề">
                <button
                  type="button"
                  onClick={() => setTopic('ALL')}
                  aria-pressed={topic === 'ALL'}
                  className={`${chipBase} ${topic === 'ALL' ? `${toneClasses('periwinkle').tile} border-tone-periwinkle-border` : chipIdle}`}
                >
                  Mọi chủ đề
                </button>
                {TEMPLATE_TOPICS.map((t) => {
                  const tc = toneClasses(t.tone);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTopic(t.value)}
                      aria-pressed={topic === t.value}
                      className={`${chipBase} ${topic === t.value ? `${tc.tile} ${tc.border}` : chipIdle}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
                <span>
                  {filtered.length} / {VOCABULARY_TEMPLATES.length} bộ từ
                </span>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className="font-semibold text-tone-periwinkle-fg hover:underline">
                    Xoá bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filtered.map((t) => {
                    const tone = topicTone(t.topic);
                    const tc = toneClasses(tone);
                    const levelTc = toneClasses(LEVEL_TONE[t.cefrLevel]);
                    return (
                      <InteractiveCard key={t.id} tone={tone} onClick={() => setPreview(t)} className="flex flex-col p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white">{t.name}</h3>
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${levelTc.tile}`}>{t.cefrLevel}</span>
                        </div>
                        <p className={`mb-3 text-xs font-medium ${tc.text}`}>
                          {topicLabel(t.topic)} · {t.words.length} từ
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.samplePreview.map((w) => (
                            <span
                              key={w}
                              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              {w}
                            </span>
                          ))}
                          {t.words.length > t.samplePreview.length && (
                            <span className="self-center text-xs text-slate-500 dark:text-slate-400">
                              +{t.words.length - t.samplePreview.length}
                            </span>
                          )}
                        </div>
                      </InteractiveCard>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p className="mb-4">Không tìm thấy bộ từ phù hợp.</p>
                  <button type="button" onClick={clearFilters} className={secondaryBtn}>
                    Xoá bộ lọc
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** All words and meanings of one set, with the button that starts it. */
const TemplatePreview: React.FC<{ template: VocabularyTemplate; onBack: () => void; onUse: () => void }> = ({
  template,
  onBack,
  onUse,
}) => {
  const tc = toneClasses(topicTone(template.topic));
  return (
    <>
      <div className="flex-1 overflow-y-auto p-5">
        <ol className={`divide-y divide-slate-200 overflow-hidden rounded-2xl border dark:divide-slate-800 ${tc.border}`}>
          {template.words.map((w, i) => (
            <li key={w} className="flex items-baseline gap-3 bg-white px-4 py-2.5 dark:bg-slate-900">
              <span className={`w-6 flex-shrink-0 text-right text-xs font-semibold ${tc.text}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-white">{w}</span>
              <span className="min-w-0 flex-1 text-right text-sm text-slate-600 dark:text-slate-300">{template.meanings[i]}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
        <button type="button" onClick={onBack} className={secondaryBtn}>
          Chọn bộ khác
        </button>
        <button type="button" onClick={onUse} className={primaryBtn}>
          <Check className="h-4 w-4" />
          Dùng bộ này
        </button>
      </div>
    </>
  );
};

export default TemplateLibraryModal;
