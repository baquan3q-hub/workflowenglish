/**
 * The Learn-page mascot: a cat in a purple hoodie that leans toward the cursor,
 * reacts once to what the learner does, then rests. Pictures come from
 * public/mascot/<pose>.png; a drawn stand-in shows for any that are missing.
 * States and timing live in services/mascotLogic.ts, so a Rive file could
 * replace the pictures without touching the rest.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  eventState,
  HOLD_MS,
  IDLE_AFTER_MS,
  lookOffset,
  MASCOT_POSES,
  mascotMessage,
  normalisePoint,
  POSE_OF,
  reactTo,
  type MascotEvent,
  type MascotPose,
  type MascotState,
} from '../../services/mascotLogic';

export interface MascotSignal {
  event: Extract<MascotEvent, 'goal-added' | 'goal-done' | 'all-done'>;
  /** Changes on every signal, so the same event twice still plays twice. */
  at: number;
}

interface Props {
  /** The hero: the mascot follows the cursor while it is inside. */
  areaRef: React.RefObject<HTMLElement | null>;
  signal: MascotSignal | null;
  /** The goal or button under the pointer: the mascot leans toward it. */
  target: HTMLElement | null;
  greeting: string;
  done: number;
  total: number;
  next: string | null;
}

const ANIM: Partial<Record<MascotState, string>> = {
  nod: 'anim-mascot-nod',
  hop: 'anim-mascot-hop',
  celebrate: 'anim-mascot-celebrate',
  wave: 'anim-mascot-wave',
  sleepy: 'anim-mascot-doze',
};

const SPARKS = [
  { left: '12%', top: '22%', sx: '-10px', sy: '-12px', size: 'h-4 w-4', delay: '0ms' },
  { left: '80%', top: '14%', sx: '10px', sy: '-14px', size: 'h-5 w-5', delay: '60ms' },
  { left: '88%', top: '52%', sx: '14px', sy: '-4px', size: 'h-3.5 w-3.5', delay: '120ms' },
  { left: '4%', top: '58%', sx: '-14px', sy: '-2px', size: 'h-3.5 w-3.5', delay: '90ms' },
  { left: '48%', top: '0%', sx: '0px', sy: '-16px', size: 'h-4 w-4', delay: '30ms' },
];

function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export default function Mascot({ areaRef, signal, target, greeting, done, total, next }: Props) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<MascotState>('idle');
  /** Bumped on every reaction so its animation restarts. */
  const [play, setPlay] = useState(0);
  const stateRef = useRef<MascotState>('idle');
  const untilRef = useRef(0);
  const holdTimer = useRef<number | undefined>(undefined);
  const targetRef = useRef<HTMLElement | null>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const leanRef = useRef<HTMLDivElement>(null);

  // Pictures: idle first; the others once the page has settled. Missing ones fall back.
  const [poses, setPoses] = useState<MascotPose[]>(['idle']);
  const [missing, setMissing] = useState<ReadonlySet<MascotPose>>(new Set());

  const set = useCallback((s: MascotState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const react = useCallback(
    (event: MascotEvent) => {
      const now = Date.now();
      const current = stateRef.current;
      const nextState = reactTo(current, event, now < untilRef.current);
      // Held back by a bigger reaction, or already doing it (hovering again).
      if (nextState !== eventState(event)) return;
      if (nextState === current && (event === 'hover-mascot' || event === 'hover-target' || event === 'idle-timeout')) return;
      set(nextState);
      setPlay((p) => p + 1);
      window.clearTimeout(holdTimer.current);
      const hold = HOLD_MS[nextState];
      untilRef.current = hold ? now + hold : 0;
      if (hold) {
        holdTimer.current = window.setTimeout(() => {
          untilRef.current = 0;
          set(targetRef.current ? 'look' : 'idle');
        }, hold);
      }
    },
    [set],
  );

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  useEffect(() => {
    if (signal) react(signal.event);
  }, [signal, react]);

  // Lean: toward the hovered target, else toward the cursor inside the hero.
  const lean = useCallback(
    (px: number | null, py: number | null) => {
      const el = leanRef.current;
      const fig = figureRef.current;
      const area = areaRef.current;
      if (!el || !fig || !area) return;
      if (px === null || py === null) {
        el.style.transform = '';
        return;
      }
      const f = fig.getBoundingClientRect();
      const a = area.getBoundingClientRect();
      const cx = f.left + f.width / 2;
      const cy = f.top + f.height / 2;
      const { nx, ny } = normalisePoint(px, py, { left: cx - a.width / 2, top: cy - a.height / 2, width: a.width, height: a.height });
      const o = lookOffset(nx, ny, reduced);
      el.style.transform = `translate(${o.x}px, ${o.y}px) rotate(${o.rotate}deg)`;
    },
    [areaRef, reduced],
  );

  useEffect(() => {
    targetRef.current = target;
    if (target) {
      const r = target.getBoundingClientRect();
      lean(r.left + r.width / 2, r.top + r.height / 2);
      react('hover-target');
    } else if (stateRef.current === 'look') {
      set('idle');
    }
  }, [target, lean, react, set]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || reduced) return;
    let frame = 0;
    let last: { x: number; y: number } | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || targetRef.current) return;
      last = { x: e.clientX, y: e.clientY };
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (last && !targetRef.current) lean(last.x, last.y);
        });
      }
    };
    const leave = () => {
      last = null;
      if (!targetRef.current) lean(null, null);
    };
    area.addEventListener('pointermove', move, { passive: true });
    area.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerleave', leave);
    };
  }, [areaRef, lean, reduced]);

  // Dozes after a while with nothing happening; any activity wakes it.
  useEffect(() => {
    let timer = window.setTimeout(() => react('idle-timeout'), IDLE_AFTER_MS);
    let lastReset = Date.now();
    const wake = () => {
      if (stateRef.current === 'sleepy') set('idle');
      const now = Date.now();
      if (now - lastReset < 500) return;
      lastReset = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => react('idle-timeout'), IDLE_AFTER_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll'] as const;
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, wake));
    };
  }, [react, set]);

  useEffect(() => {
    const load = () => setPoses([...MASCOT_POSES]);
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(load);
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(load, 1200);
    return () => window.clearTimeout(id);
  }, []);

  const wanted = POSE_OF[state];
  const shown: MascotPose = missing.has(wanted) ? 'idle' : wanted;
  const drawn = missing.has(shown);
  const message = mascotMessage({ state, greeting, done, total, next });
  const sparkle = !reduced && (state === 'hop' || state === 'celebrate');

  return (
    <div className="flex items-center gap-3 sm:flex-col sm:gap-1">
      {/* Speech bubble: left of the mascot on phones, above it on wider screens. */}
      <div aria-live="polite" className="relative min-w-0 flex-1 sm:w-full sm:flex-none">
        <p
          key={message}
          className="anim-bubble-in relative rounded-3xl border border-tone-lavender-border bg-white px-4 py-3 text-sm font-medium text-[#17264B] shadow-sm dark:bg-slate-900 dark:text-white"
        >
          {message}
          <span
            aria-hidden
            className="absolute -right-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-tone-lavender-border bg-white dark:bg-slate-900 sm:-bottom-[7px] sm:left-1/2 sm:right-auto sm:top-auto sm:-translate-x-1/2 sm:translate-y-0 sm:border-b sm:border-t-0"
          />
        </p>
      </div>

      <div
        ref={figureRef}
        onPointerEnter={(e) => e.pointerType !== 'touch' && react('hover-mascot')}
        onClick={() => react('hover-mascot')}
        className="relative h-[120px] w-[120px] flex-shrink-0 select-none sm:mt-2 sm:h-[200px] sm:w-[200px]"
        role="img"
        aria-label="Mèo áo tím, bạn đồng hành học tập"
      >
        <div aria-hidden className="absolute inset-x-6 bottom-1 h-3 rounded-full bg-tone-lavender-border/60 blur-[2px] dark:bg-black/30" />
        <div ref={leanRef} className="absolute inset-0 transition-transform duration-300 ease-out" style={{ transformOrigin: '50% 90%' }}>
          <div key={play} className={`absolute inset-0 ${reduced ? '' : ANIM[state] ?? ''}`} style={{ transformOrigin: '50% 95%' }}>
            {drawn ? (
              <StandIn pose={shown} />
            ) : (
              poses.map((p) =>
                missing.has(p) ? null : (
                  <img
                    key={p}
                    src={`/mascot/${p}.png`}
                    alt=""
                    draggable={false}
                    onError={() => setMissing((m) => new Set(m).add(p))}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${p === shown ? 'opacity-100' : 'opacity-0'}`}
                  />
                ),
              )
            )}
          </div>
        </div>
        {sparkle &&
          SPARKS.map((s, i) => (
            <Sparkles
              key={`${play}-${i}`}
              aria-hidden
              className={`anim-sparkle pointer-events-none absolute ${s.size} ${i % 2 ? 'text-tone-butter-accent' : 'text-tone-lavender-accent'}`}
              style={{ left: s.left, top: s.top, animationDelay: s.delay, ['--sx' as string]: s.sx, ['--sy' as string]: s.sy } as React.CSSProperties}
            />
          ))}
      </div>
    </div>
  );
}

/** Drawn cat for poses whose picture is not in public/mascot yet. */
function StandIn({ pose }: { pose: MascotPose }) {
  const closed = pose === 'sleepy';
  const happy = pose === 'cheer' || pose === 'thumbs' || pose === 'wave';
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      {/* hoodie body */}
      <path d="M44 196c0-44 22-72 56-72s56 28 56 72z" fill="#A78BFA" />
      <path d="M62 196c2-30 16-50 38-50s36 20 38 50z" fill="#8B5CF6" opacity="0.35" />
      {/* hood behind the head */}
      <ellipse cx="100" cy="92" rx="72" ry="62" fill="#A78BFA" />
      {/* ears */}
      <path d="M48 64 56 20l34 30z" fill="#FFFFFF" />
      <path d="M152 64 144 20l-34 30z" fill="#FFFFFF" />
      <path d="M57 54 61 32l16 15z" fill="#FBCFE8" />
      <path d="M143 54 139 32l-16 15z" fill="#FBCFE8" />
      {/* head */}
      <ellipse cx="100" cy="94" rx="60" ry="50" fill="#FFFFFF" />
      {/* eyes */}
      {closed ? (
        <>
          <path d="M70 98q9 7 18 0" stroke="#17264B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M112 98q9 7 18 0" stroke="#17264B" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : happy ? (
        <>
          <path d="M70 100q9-10 18 0" stroke="#17264B" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M112 100q9-10 18 0" stroke="#17264B" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="79" cy="96" rx="10" ry="12" fill="#17264B" />
          <ellipse cx="121" cy="96" rx="10" ry="12" fill="#17264B" />
          <circle cx="83" cy="91" r="3.6" fill="#FFFFFF" />
          <circle cx="125" cy="91" r="3.6" fill="#FFFFFF" />
        </>
      )}
      {/* cheeks and mouth */}
      <ellipse cx="62" cy="112" rx="10" ry="6" fill="#F9A8D4" opacity="0.75" />
      <ellipse cx="138" cy="112" rx="10" ry="6" fill="#F9A8D4" opacity="0.75" />
      <path d="M100 108v3" stroke="#17264B" strokeWidth="3" strokeLinecap="round" />
      {pose === 'sleepy' ? (
        <ellipse cx="100" cy="119" rx="5" ry="6" fill="#17264B" />
      ) : (
        <path d="M92 113q4 5 8 0q4 5 8 0" stroke="#17264B" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {/* book */}
      <rect x="64" y="146" width="72" height="44" rx="6" fill="#FED7AA" />
      <rect x="99" y="146" width="2" height="44" fill="#FB923C" opacity="0.6" />
      <rect x="72" y="156" width="20" height="3" rx="1.5" fill="#9A3412" opacity="0.45" />
      <rect x="72" y="164" width="16" height="3" rx="1.5" fill="#9A3412" opacity="0.35" />
      <rect x="108" y="156" width="20" height="3" rx="1.5" fill="#9A3412" opacity="0.45" />
      <rect x="108" y="164" width="14" height="3" rx="1.5" fill="#9A3412" opacity="0.35" />
      {/* paws */}
      <circle cx="66" cy="166" r="10" fill="#FFFFFF" />
      {pose === 'wave' || pose === 'cheer' ? <circle cx="164" cy="120" r="11" fill="#FFFFFF" /> : <circle cx="134" cy="166" r="10" fill="#FFFFFF" />}
      {pose === 'thumbs' && <rect x="130" y="146" width="8" height="16" rx="4" fill="#FFFFFF" />}
    </svg>
  );
}
