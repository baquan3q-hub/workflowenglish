import React from 'react';
import type { DiagramGroup, DiagramShape } from '../../../data/ielts/reading/types';
import { splitBlanks } from './questionLogic';

type Diagram = DiagramGroup['diagram'];

/**
 * Draws a labelled diagram from its shape list. Blanks show their number
 * and, once typed, the learner's answer, so the figure reads as filled in.
 */
export default function ReadingDiagram({ diagram, answers }: { diagram: Diagram; answers: Readonly<Record<number, string>> }) {
  // useId has characters url(#…) does not accept.
  const markerId = `arrow-${React.useId().replace(/[^\w-]/g, '')}`;
  return (
    <figure className="rounded-2xl border border-tone-aqua-border bg-tone-aqua p-3">
      <figcaption className="mb-2 text-center text-caption font-semibold text-slate-700 dark:text-slate-300">{diagram.title}</figcaption>
      <svg viewBox={`0 0 ${diagram.width} ${diagram.height}`} className="mx-auto block h-auto w-full max-w-lg" role="img" aria-label={`Sơ đồ ${diagram.title}`}>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-slate-500 dark:fill-slate-400" />
          </marker>
        </defs>
        {diagram.shapes.map((s, i) => (
          <Shape key={i} shape={s} answers={answers} markerId={markerId} />
        ))}
      </svg>
    </figure>
  );
}

const stroke = 'stroke-slate-500 dark:stroke-slate-400';

function Shape({ shape: s, answers, markerId }: { shape: DiagramShape; answers: Readonly<Record<number, string>>; markerId: string }) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  switch (s.kind) {
    case 'line':
    case 'arrow':
      return (
        <line
          x1={s.x}
          y1={s.y}
          x2={s.x + s.w}
          y2={s.y + s.h}
          strokeWidth={1.5}
          className={stroke}
          markerEnd={s.kind === 'arrow' ? `url(#${markerId})` : undefined}
        />
      );
    case 'circle':
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={s.w / 2} ry={s.h / 2} strokeWidth={1.5} className={`fill-white dark:fill-slate-900 ${stroke}`} />
          {s.text && <Label text={s.text} x={cx} y={cy} answers={answers} />}
        </g>
      );
    case 'box':
      return (
        <g>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={8} strokeWidth={1.5} className={`fill-white dark:fill-slate-900 ${stroke}`} />
          {s.text && <Label text={s.text} x={cx} y={cy} answers={answers} />}
        </g>
      );
  }
}

/** Centred text, one tspan line per "\n"; blanks drawn as "(n) answer" or "(n) ……". */
function Label({ text, x, y, answers }: { text: string; x: number; y: number; answers: Readonly<Record<number, string>> }) {
  const lines = text.split('\n');
  const lineHeight = 14;
  const top = y - ((lines.length - 1) * lineHeight) / 2 + 4;
  return (
    <text x={x} y={top} fontSize={11.5} textAnchor="middle" className="fill-slate-800 dark:fill-slate-200">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {splitBlanks(line).map((p, j) =>
            'blank' in p ? (
              <tspan key={j} fontWeight={700} className="fill-tone-periwinkle-fg">
                ({p.blank}) {answers[p.blank]?.trim() || '……'}
              </tspan>
            ) : (
              <React.Fragment key={j}>{p.text}</React.Fragment>
            ),
          )}
        </tspan>
      ))}
    </text>
  );
}
