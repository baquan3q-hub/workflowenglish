import React from 'react';
import { Sparkles } from 'lucide-react';
import { useDraggable } from '../../hooks/useDraggable';

interface FloatingChatBubbleProps {
  onOpen: () => void;
  contextBadge?: string | null;
  isStreaming?: boolean;
}

export function FloatingChatBubble({ onOpen, contextBadge, isStreaming }: FloatingChatBubbleProps) {
  const { position, isDragging, hasMoved, handlePointerDown } = useDraggable({
    storageKey: 'workflow_ai_bubble_pos',
    snapToEdge: true,
    edgePadding: 16,
    elementWidth: 68,
    elementHeight: 68,
  });

  const handleClick = (e: React.MouseEvent) => {
    // If user dragged, don't trigger click
    if (hasMoved || isDragging) {
      e.preventDefault();
      return;
    }
    onOpen();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={`group select-none cursor-grab active:cursor-grabbing transition-transform duration-200 ${
        isDragging ? 'scale-105 opacity-90' : 'hover:scale-110 active:scale-95'
      }`}
      title="Bấm để mở Trợ lý AI (Kéo thả để di chuyển vị trí)"
    >
      <div className="relative flex items-center justify-center">
        {/* Soft Ambient Glow Aura behind the 3D Glossy Bubble */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500/30 via-pink-500/25 to-indigo-500/20 blur-xl transform scale-110 pointer-events-none transition-all duration-300 ${
            isStreaming ? 'animate-ping opacity-60' : 'opacity-40 group-hover:opacity-80'
          }`}
        />

        {/* 3D Glossy AI Chat Bubble Bitmap Image */}
        <div className="relative w-[66px] h-[66px] sm:w-[72px] sm:h-[72px] flex items-center justify-center">
          <img
            src="/glossy-ai-bubble.png"
            alt="Glossy AI Chat Bubble"
            className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(244,63,94,0.35)] group-hover:drop-shadow-[0_14px_28px_rgba(244,63,94,0.5)] transition-all duration-300 select-none pointer-events-none filter"
            draggable={false}
          />

          {/* Active / Online Status Dot */}
          <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
          </span>

          {/* Spinning Sparkle when Streaming AI response */}
          {isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Sparkles className="w-6 h-6 text-amber-300 animate-spin drop-shadow" />
            </div>
          )}
        </div>

        {/* Dynamic Context Badge if Present */}
        {contextBadge && !isDragging && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg shadow-rose-500/25 animate-bounce pointer-events-none border border-white/30 backdrop-blur-xs">
            {contextBadge}
          </div>
        )}

        {/* Floating Tooltip on Hover */}
        <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900/95 dark:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none backdrop-blur-md border border-slate-700/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>IELTS AI Copilot</span>
          </div>
          <div className="text-[10px] text-slate-300 font-normal">Kéo để di chuyển • Bấm để mở</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2.5 h-2.5 bg-slate-900/95 dark:bg-slate-800 rotate-45 border-r border-t border-slate-700/80" />
        </div>
      </div>
    </div>
  );
}
