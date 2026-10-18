import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ClipDockState } from './useClipPlayer';

interface Props {
  dock: ClipDockState;
  /** Shown under the video, e.g. "tap the video to start". */
  message?: string | null;
  onClose: () => void;
}

/**
 * The small floating video a YouTube clip plays in on pages without a main
 * player (review). It stays mounted so the player is reused, and is shown
 * only while a clip plays: YouTube's terms ask for a visible player, 200 px
 * tall or more. It is portalled to <body>: the page's entry animation leaves a
 * transform on its container, which would pin a fixed child to the page.
 */
export default function YouTubeDock({ dock, message, onClose }: Props) {
  return createPortal(
    <div
      aria-hidden={!dock.open}
      className={`fixed inset-x-4 bottom-20 z-40 transition-opacity md:inset-x-auto md:bottom-24 md:right-5 md:w-[356px] ${
        dock.open ? 'opacity-100' : 'pointer-events-none invisible opacity-0'
      }`}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 py-1 pl-3 pr-1">
          <p className="flex-1 text-caption font-semibold text-slate-600 dark:text-slate-300">Đang nghe từ YouTube</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dừng và đóng video"
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video min-h-[200px] w-full bg-black [&_iframe]:h-full [&_iframe]:w-full">
          <div ref={dock.hostRef} className="h-full w-full" />
        </div>
        {message && dock.open && (
          <p role="status" className="px-3 py-2 text-caption text-amber-700 dark:text-amber-400">
            {message}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
