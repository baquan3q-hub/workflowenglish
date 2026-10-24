import React from 'react';
import type { MapGroup, MapShape } from '../../../data/ielts/listening/types';

/** Draws a map / plan from its shape list; lettered places are the ones to label. */
export default function ListeningMap({ map }: { map: MapGroup['map'] }) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <figcaption className="mb-2 text-center text-caption font-semibold text-slate-700 dark:text-slate-300">{map.title}</figcaption>
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="mx-auto block h-auto w-full max-w-lg"
        role="img"
        aria-label={`Bản đồ ${map.title}`}
      >
        {map.shapes.map((s, i) => (
          <Shape key={i} shape={s} />
        ))}
      </svg>
    </figure>
  );
}

const text = 'fill-slate-700 dark:fill-slate-300';

function Shape({ shape: s }: { shape: MapShape }) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  switch (s.kind) {
    case 'green':
      return (
        <g>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={14} className="fill-tone-mint-border dark:fill-tone-mint-accent" />
          {s.label && (
            <text x={s.x + 10} y={s.y + 18} fontSize={11} fontWeight={600} className="fill-tone-mint-accent dark:fill-tone-mint-accent">
              {s.label}
            </text>
          )}
        </g>
      );
    case 'water':
      return (
        <g>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={28} className="fill-tone-sky-border dark:fill-tone-sky-accent" />
          {s.label && (
            <text x={cx} y={s.y + 24} fontSize={11} fontWeight={600} textAnchor="middle" className="fill-tone-sky-accent dark:fill-tone-sky-accent">
              {s.label}
            </text>
          )}
        </g>
      );
    case 'path':
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={3} className="fill-slate-200 dark:fill-slate-700" />;
    case 'entrance':
      return (
        <g>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={4} className="fill-slate-800 dark:fill-slate-200" />
          {s.label && (
            <text x={cx} y={cy + 3.5} fontSize={9.5} fontWeight={600} textAnchor="middle" className="fill-white dark:fill-slate-900">
              {s.label}
            </text>
          )}
        </g>
      );
    case 'building':
      return (
        <g>
          <rect
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx={6}
            strokeWidth={s.key ? 1.5 : 1}
            className={
              s.key
                ? 'fill-white stroke-slate-500 dark:fill-slate-900 dark:stroke-slate-400'
                : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600'
            }
          />
          {(s.key || s.label) && (
            <text
              x={cx}
              y={cy + (s.key ? 4.5 : 3.5)}
              fontSize={s.key ? 13 : 10}
              fontWeight={s.key ? 700 : 500}
              textAnchor="middle"
              className={s.key ? 'fill-slate-900 dark:fill-white' : text}
            >
              {s.key ?? s.label}
            </text>
          )}
        </g>
      );
  }
}
