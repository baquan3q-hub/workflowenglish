/**
 * A card answered by swiping: left, right or up (or the arrow keys). While it
 * is dragged it tilts and names the answer it is heading for. The buttons
 * under it do the same, for mouse, keyboard and screen-reader users.
 */
import React, { useEffect, useRef, useState } from 'react';

export type SwipeDir = 'left' | 'right' | 'up';

interface Props {
  labels: Record<SwipeDir, string>;
  onSwipe: (dir: SwipeDir) => void;
  disabled: boolean;
  /** Effects off: no tilt animation after release, no shake. */
  quiet: boolean;
  /** A class for the card once answered (the right/wrong tint). */
  resultClass?: string;
  /** Changes on a wrong answer, to replay the shake. */
  shakeKey?: number;
  children: React.ReactNode;
}

/** How far the card must travel before a release counts as an answer. */
const THRESHOLD = 80;

export function dirFor(dx: number, dy: number, threshold = THRESHOLD): SwipeDir | null {
  if (-dy > threshold && -dy > Math.abs(dx)) return 'up';
  if (Math.abs(dx) > threshold) return dx < 0 ? 'left' : 'right';
  return null;
}

export default function SwipeCard({ labels, onSwipe, disabled, quiet, resultClass = '', shakeKey = 0, children }: Props) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });

  // Arrow keys answer from anywhere on the page, unless the learner is typing.
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const dir: SwipeDir | null = e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'up' : null;
      if (!dir) return;
      e.preventDefault();
      onSwipe(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, onSwipe]);

  const onDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    setDrag({ dx: e.clientX - start.current.x, dy: Math.min(0, e.clientY - start.current.y) });
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const dir = dirFor(e.clientX - start.current.x, e.clientY - start.current.y);
    start.current = null;
    setDrag({ dx: 0, dy: 0 });
    if (dir) onSwipe(dir);
  };

  const heading = dirFor(drag.dx, drag.dy, THRESHOLD / 2);
  const dragging = drag.dx !== 0 || drag.dy !== 0;
  return (
    <div
      key={shakeKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        start.current = null;
        setDrag({ dx: 0, dy: 0 });
      }}
      className={`relative select-none rounded-2xl border p-4 text-sm font-semibold text-slate-900 shadow-sm dark:text-white ${disabled ? '' : 'cursor-grab touch-none active:cursor-grabbing'} ${resultClass || 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'} ${shakeKey && !quiet ? 'anim-shake' : ''}`}
      style={{ transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 20}deg)` : undefined, transition: dragging || quiet ? 'none' : 'transform 160ms ease-out' }}
    >
      {children}
      {heading && (
        <span className="pointer-events-none absolute inset-x-0 -top-3 mx-auto w-fit rounded-full bg-slate-900 px-2.5 py-0.5 text-caption font-bold text-white dark:bg-white dark:text-slate-900" aria-hidden>
          {labels[heading]}
        </span>
      )}
    </div>
  );
}
