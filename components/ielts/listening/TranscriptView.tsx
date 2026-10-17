/**
 * Script of one part for the review: answer evidence in green with the
 * question number, distractors in amber, and a play button per segment.
 */
import React, { useMemo } from 'react';
import { Loader2, Play, Square } from 'lucide-react';
import type { ListeningSection } from '../../../data/ielts/listening/types';
import { transcriptMarks, type TranscriptPiece } from '../../../services/listeningDrillLogic';

interface Props {
  section: ListeningSection;
  activeId: string | null;
  loadingId: string | null;
  onToggleSegment: (segmentId: string) => void;
}

const iconBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const evidenceMark = 'rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100';
const distractorMark = 'rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100';

function Piece({ p }: { p: TranscriptPiece }) {
  if (!p.mark) return <>{p.text}</>;
  const evidence = p.mark.kind === 'evidence';
  return (
    <mark className={evidence ? evidenceMark : distractorMark} title={evidence ? 'Câu chứa đáp án' : 'Bẫy'}>
      {p.text}
      {evidence && <sup className="ml-0.5 text-[0.65rem] font-bold tabular-nums">{p.mark.numbers.join(',')}</sup>}
    </mark>
  );
}

export default function TranscriptView({ section, activeId, loadingId, onToggleSegment }: Props) {
  const segments = useMemo(() => transcriptMarks(section), [section]);
  const roles = useMemo(() => new Map(section.speakers.map((s) => [s.name, s.roleVi])), [section]);

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap gap-3 text-caption text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={`${evidenceMark} inline-block h-3 w-5`} /> Câu chứa đáp án
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`${distractorMark} inline-block h-3 w-5`} /> Bẫy
        </span>
      </p>
      {segments.map((seg, i) => {
        const playing = activeId === seg.id;
        const loading = loadingId === seg.id;
        const first = seg.numbers[0];
        const last = seg.numbers[seg.numbers.length - 1];
        return (
          <section key={seg.id} className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-caption font-semibold text-slate-500 dark:text-slate-400">
                Đoạn {i + 1}
                {first !== undefined && ` · Câu ${first}${last !== first ? `–${last}` : ''}`}
              </h4>
              <button
                type="button"
                onClick={() => onToggleSegment(seg.id)}
                className={iconBtn}
                aria-label={playing || loading ? `Dừng đoạn ${i + 1}` : `Nghe đoạn ${i + 1}`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span className="text-caption">{playing || loading ? 'Dừng' : 'Nghe'}</span>
              </button>
            </div>
            <div className="mt-1 space-y-2">
              {seg.lines.map((l, k) => (
                <p key={k} className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {section.speakers.length > 1 && (
                    <span className="mr-1.5 font-semibold text-slate-900 dark:text-white" title={roles.get(l.speaker)}>
                      {l.speaker}:
                    </span>
                  )}
                  {l.pieces.map((p, x) => (
                    <Piece key={x} p={p} />
                  ))}
                </p>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
