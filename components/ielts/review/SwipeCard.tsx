/**
 * A card answered by swiping: left, right or up (or the arrow keys). While it
 * is dragged it tilts and names the answer it is heading for. The buttons
 * under it do the same, for mouse, keyboard and screen-reader users.
 *
 * On a touch screen only left and right swipes answer: an upward drag is left
 * to the page, so scrolling never answers by mistake (the "up" answer is one
 * of the buttons).
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
  /** What a screen reader hears for the card. */
  label?: string;
  /** Takes focus when it appears, so the keyboard carries on from the card. */
  autoFocus?: boolean;
  children: React.ReactNode;
}

/** How far the card must travel before a release counts as an answer. */
const THRESHOLD = 80;

export function dirFor(dx: number, dy: number, threshold = THRESHOLD, touch = false): SwipeDir | null {
  if (touch) return Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : null;
  if (-dy > threshold && -dy > Math.abs(dx)) return 'up';
  if (Math.abs(dx) > threshold) return dx < 0 ? 'left' : 'right';
  return null;
}

/** Controls that use the arrow keys themselves: form fields, tabs, radio groups, menus, dialogs. */
const OWN_ARROWS =
  'input, textarea, select, [contenteditable="true"], [role="tab"], [role="tablist"], [role="radiogroup"], [role="listbox"], [role="menu"], [role="slider"], [role="dialog"]';

type KeyInfo = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'repeat' | 'defaultPrevented'>;

/** The answer an arrow key gives, or null when the key belongs to something else. */
export function keyDir(e: KeyInfo, target: { closest?: (sel: string) => unknown } | null, modalOpen = false): SwipeDir | null {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat || e.defaultPrevented || modalOpen) return null;
  if (target?.closest?.(OWN_ARROWS)) return null;
  return e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'up' : null;
}

export default function SwipeCard({ labels, onSwipe, disabled, quiet, resultClass = '', shakeKey = 0, label, autoFocus = false, children }: Props) {
  const start = useRef<{ x: number; y: number; id: number; touch: boolean } | null>(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0, touch: false });
  const card = useRef<HTMLDivElement>(null);
  // The latest handler, so the key listener is not re-added on every render.
  const swipe = useRef(onSwipe);
  swipe.current = onSwipe;

  // Arrow keys answer from anywhere on the page, unless another control is using them.
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const dir = keyDir(e, e.target as Element | null, !!document.querySelector('[role="dialog"][aria-modal="true"]'));
      if (!dir) return;
      e.preventDefault();
      swipe.current(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled]);

  useEffect(() => {
    if (autoFocus && !disabled) card.current?.focus({ preventScroll: true });
  }, [autoFocus, disabled, label]);

  const onDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, touch };
    // On touch the page keeps vertical scrolling, so only a mouse is captured.
    if (!touch) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    setDrag({ dx: e.clientX - s.x, dy: s.touch ? 0 : Math.min(0, e.clientY - s.y), touch: s.touch });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dir = dirFor(e.clientX - s.x, e.clientY - s.y, THRESHOLD, s.touch);
    start.current = null;
    setDrag({ dx: 0, dy: 0, touch: false });
    if (dir) onSwipe(dir);
  };
  const cancel = () => {
    start.current = null;
    setDrag({ dx: 0, dy: 0, touch: false });
  };

  const heading = dirFor(drag.dx, drag.dy, THRESHOLD / 2, drag.touch);
  const dragging = drag.dx !== 0 || drag.dy !== 0;
  return (
    <div
      key={shakeKey}
      ref={card}
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={cancel}
      className={`relative select-none rounded-2xl border p-4 text-sm font-semibold text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-white ${disabled ? '' : 'cursor-grab active:cursor-grabbing'} ${resultClass || 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'} ${shakeKey && !quiet ? 'anim-shake' : ''}`}
      style={{
        // Vertical drags scroll the page on touch screens.
        touchAction: disabled ? undefined : 'pan-y',
        transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 20}deg)` : undefined,
        transition: dragging || quiet ? 'none' : 'transform 160ms ease-out',
      }}
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
