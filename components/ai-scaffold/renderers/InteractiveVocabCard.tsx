import React, { useState } from 'react';
import { Volume2, Bookmark, Check, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { ScaffoldVocabItem } from '../../../services/scaffoldActionTypes';
import { speakText } from '../../../services/browserSpeech';
import { upsertWordMastery } from '../../../services/masteryService';

interface InteractiveVocabCardProps {
  vocab: ScaffoldVocabItem;
  userId?: string | null;
  onSaved?: (word: string) => void;
}

export function InteractiveVocabCard({ vocab, userId, onSaved }: InteractiveVocabCardProps) {
  const [isSaved, setIsSaved] = useState(vocab.savedToSrs || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSpeak = () => {
    speakText(vocab.word);
  };

  const handleSaveToSrs = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    try {
      if (userId) {
        await upsertWordMastery({
          user_id: userId,
          word: vocab.word,
        });
      }
      setIsSaved(true);
      onSaved?.(vocab.word);
    } catch (err) {
      console.error('[VocabCard] Failed to save word:', err);
      // Still set saved locally so user gets optimistic feedback
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-3 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* Header with Word, IPA, POS, and Badges */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-slate-900 dark:text-white selection:bg-indigo-100">
              {vocab.word}
            </span>
            {vocab.ipa && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                /{vocab.ipa.replace(/^\/|\/$/g, '')}/
              </span>
            )}
            <button
              onClick={handleSpeak}
              className="p-1 rounded-full text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
              title="Phát âm"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {vocab.level && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50">
                {vocab.level}
              </span>
            )}
            {vocab.partOfSpeech && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {vocab.partOfSpeech}
              </span>
            )}
          </div>
        </div>

        {/* Meaning in Vietnamese */}
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
          🇻🇳 {vocab.meaningVi}
        </p>

        {/* Example sentence */}
        {vocab.exampleSentence && (
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-2 text-[11.5px] border-l-2 border-indigo-400 mb-2 space-y-0.5">
            <p className="text-slate-700 dark:text-slate-300 italic">{vocab.exampleSentence}</p>
            {vocab.exampleTranslationVi && (
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">{vocab.exampleTranslationVi}</p>
            )}
          </div>
        )}

        {/* Collocations */}
        {vocab.collocations && vocab.collocations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {vocab.collocations.map((c, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
              >
                + {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save to SRS Button */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/40 flex justify-end">
        <button
          onClick={handleSaveToSrs}
          disabled={isSaved || isSaving}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${
              isSaved
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 cursor-default'
                : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm hover:shadow hover:from-indigo-600 hover:to-violet-700 active:scale-95'
            }
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Đã lưu vào SRS</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>Lưu vào bộ từ (SRS)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function InteractiveVocabGrid({
  vocabulary,
  userId,
}: {
  vocabulary: ScaffoldVocabItem[];
  userId?: string | null;
}) {
  if (!vocabulary || vocabulary.length === 0) return null;
  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Từ vựng trọng tâm ({vocabulary.length} từ)
          </h4>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">1-click lưu vào SRS</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {vocabulary.map((item, idx) => (
          <InteractiveVocabCard key={item.id || idx} vocab={item} userId={userId} />
        ))}
      </div>
    </div>
  );
}
