import React from 'react';
import { useDraggable } from '../../hooks/useDraggable';

interface FloatingChatBubbleProps {
  onOpen: () => void;
  contextBadge?: string | null;
  isStreaming?: boolean;
}

const SIZE = 64;
// Phones have the tab bar along the bottom (AppNavMobile, below 768px).
const bottomGap = () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 88 : 24);

/** The draggable mentor button. It snaps to the nearest side and remembers where it was left. */
export function FloatingChatBubble({ onOpen, contextBadge, isStreaming }: FloatingChatBubbleProps) {
  const { position, isDragging, handlePointerDown } = useDraggable({
    storageKey: 'workflow_ai_bubble_pos',
    snapToEdge: true,
    edgePadding: 16,
    elementWidth: SIZE,
    elementHeight: SIZE,
    defaultPosition:
      typeof window !== 'undefined' ? { x: window.innerWidth - SIZE - 16, y: window.innerHeight - SIZE - bottomGap() } : undefined,
  });
  const onLeft = position.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);

  return (
    <button
      type="button"
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        if (isDragging) {
          e.preventDefault();
          return;
        }
        onOpen();
      }}
      className={`group fixed z-[60] select-none rounded-full outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-tone-lavender-accent ${
        isDragging ? 'scale-105 cursor-grabbing opacity-90' : 'cursor-pointer hover:scale-105 active:scale-95'
      }`}
      aria-label="Mở IELTS Mentor AI (kéo để di chuyển)"
    >
      <span className="relative block" style={{ width: SIZE, height: SIZE }}>
        <img
          src="/glossy-ai-bubble.png"
          alt=""
          className="pointer-events-none h-full w-full select-none object-contain drop-shadow-[0_8px_16px_rgba(15,23,42,0.18)]"
          draggable={false}
        />
        <span
          className={`absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isStreaming ? 'anim-record-pulse bg-tone-lavender-accent' : 'bg-tone-mint-accent'}`}
          aria-hidden
        />
      </span>

      {/* Context hint for the current screen: quiet, shown next to the bubble. */}
      {contextBadge && !isDragging && (
        <span
          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-tone-lavender-border bg-white px-2.5 py-1 text-[11px] font-semibold text-tone-lavender-fg shadow-sm dark:bg-slate-900 sm:block ${
            onLeft ? 'left-full ml-2' : 'right-full mr-2'
          }`}
        >
          {isStreaming ? 'Đang trả lời…' : contextBadge}
        </span>
      )}
      {!contextBadge && (
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700 ${
            onLeft ? 'left-full ml-2' : 'right-full mr-2'
          }`}
        >
          {isStreaming ? 'Đang trả lời…' : 'Hỏi Mentor AI'}
        </span>
      )}
    </button>
  );
}
