import React, { useState } from 'react';
import { Volume2, Copy, Check, ChevronDown, ChevronUp, BookOpen, Sparkles } from 'lucide-react';
import { SentenceBreakdownItem } from '../../../services/scaffoldActionTypes';
import { speakText } from '../../../services/browserSpeech';

interface InteractiveSentenceCardProps {
  sentence: SentenceBreakdownItem;
  index: number;
}

export function InteractiveSentenceCard({ sentence, index }: InteractiveSentenceCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(sentence.original);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    speakText(sentence.original);
  };

  return (
    <div className="bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-100 mb-2.5">
      {/* Header with index, speak, copy, toggle */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Câu {index + 1}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleSpeak}
            className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            title="Nghe phát âm chuẩn"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            title="Sao chép câu"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* English Original */}
      <p className="font-medium text-sm leading-relaxed text-indigo-950 dark:text-indigo-100 mb-1.5 selection:bg-indigo-100">
        {sentence.original}
      </p>

      {/* Vietnamese Natural Translation */}
      <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed italic bg-slate-50 dark:bg-slate-900/40 px-2.5 py-1.5 rounded-lg border-l-2 border-indigo-400 mb-2">
        🇻🇳 {sentence.translationVi}
      </p>

      {/* Expandable Grammar & Nuance Notes */}
      {expanded && (
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-100/80 dark:border-slate-700/40 text-xs">
          {sentence.grammarAnalysis && (
            <div className="bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 rounded-lg p-2.5 border border-sky-100 dark:border-sky-800/40">
              <div className="flex items-center gap-1.5 font-semibold text-[11px] text-sky-700 dark:text-sky-300 mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Cấu trúc ngữ pháp:</span>
              </div>
              <p className="leading-relaxed whitespace-pre-line text-[11.5px]">{sentence.grammarAnalysis}</p>
            </div>
          )}

          {sentence.nuanceNotes && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-lg p-2.5 border border-amber-100 dark:border-amber-800/40">
              <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-700 dark:text-amber-300 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lưu ý & Sắc thái sử dụng:</span>
              </div>
              <p className="leading-relaxed text-[11.5px]">{sentence.nuanceNotes}</p>
            </div>
          )}

          {sentence.keyWords && sentence.keyWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sentence.keyWords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                >
                  <strong className="font-semibold">{kw.word}</strong>: {kw.meaning}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InteractiveSentenceList({ sentences }: { sentences: SentenceBreakdownItem[] }) {
  if (!sentences || sentences.length === 0) return null;
  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          Mổ xẻ chi tiết từng câu ({sentences.length} câu)
        </h4>
      </div>
      {sentences.map((sentence, index) => (
        <InteractiveSentenceCard key={sentence.id || index} sentence={sentence} index={index} />
      ))}
    </div>
  );
}
