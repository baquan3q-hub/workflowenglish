import React, { useState } from 'react';
import { BookOpen, Check, ChevronDown, Copy, Languages, Lightbulb, Volume2 } from 'lucide-react';
import { SentenceBreakdownItem } from '../../../services/scaffoldActionTypes';
import { speakText } from '../../../services/browserSpeech';

const iconBtn =
  'flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200';

/** One sentence: English, Vietnamese, then grammar, nuance and key words on demand. */
export function InteractiveSentenceCard({ sentence, index, defaultOpen }: { sentence: SentenceBreakdownItem; index: number; defaultOpen: boolean }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = Boolean(sentence.grammarAnalysis || sentence.nuanceNotes || sentence.keyWords?.length);

  const copy = () => {
    void navigator.clipboard?.writeText(sentence.original);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-2.5 px-3 pt-2.5">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-tone-sky-soft text-[11px] font-bold text-tone-sky-fg">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium leading-relaxed text-slate-900 dark:text-white">{sentence.original}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{sentence.translationVi}</p>
        </div>
        <div className="-mr-1 flex flex-shrink-0 items-center">
          <button type="button" onClick={() => speakText(sentence.original)} className={iconBtn} aria-label="Nghe câu">
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={copy} className={iconBtn} aria-label="Sao chép câu">
            {copied ? <Check className="h-3.5 w-3.5 text-tone-mint-fg" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mx-3 mb-2 mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-tone-sky-fg hover:underline"
            aria-expanded={open}
          >
            {open ? 'Ẩn phân tích' : 'Xem phân tích'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2.5 text-[12px] dark:border-slate-800">
              {sentence.grammarAnalysis && (
                <div className="flex gap-2">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-tone-sky-fg" aria-hidden />
                  <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-tone-sky-fg">Ngữ pháp: </span>
                    {sentence.grammarAnalysis}
                  </p>
                </div>
              )}
              {sentence.nuanceNotes && (
                <div className="flex gap-2">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-tone-butter-fg" aria-hidden />
                  <p className="leading-relaxed text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-tone-butter-fg">Lưu ý: </span>
                    {sentence.nuanceNotes}
                  </p>
                </div>
              )}
              {sentence.keyWords && sentence.keyWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {sentence.keyWords.map((kw, i) => (
                    <span key={i} className="rounded-md bg-tone-sky px-2 py-0.5 text-[11.5px] text-slate-700 dark:text-slate-200">
                      <strong className="font-semibold text-tone-sky-fg">{kw.word}</strong> · {kw.meaning}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function InteractiveSentenceList({ sentences }: { sentences: SentenceBreakdownItem[] }) {
  if (!sentences?.length) return null;
  return (
    <div className="my-2 w-full space-y-2">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        <Languages className="h-3.5 w-3.5 text-tone-sky-fg" aria-hidden /> Mổ xẻ {sentences.length} câu
      </p>
      {sentences.map((s, i) => (
        // Only the first sentences open by default, so long texts stay scannable.
        <InteractiveSentenceCard key={s.id || i} sentence={s} index={i} defaultOpen={i < 2} />
      ))}
    </div>
  );
}
