/**
 * Loading, empty and error states, so every screen shows the same shapes:
 * a skeleton that resembles the content (not a full-page spinner), an empty
 * block with one way forward, and an error block with a retry button.
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// --- Skeleton --------------------------------------------------------------

interface SkeletonProps {
  className?: string;
  /** Render as a circle (avatars, icons). */
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', circle = false }) => (
  <span
    aria-hidden="true"
    className={`anim-skeleton block bg-slate-200 dark:bg-slate-700 ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
  />
);

/** A few lines of text placeholder; the last line is shorter. */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
  <span className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} className={`h-3.5 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </span>
);

/** Screen-reader announcement wrapper for a skeleton region. */
export const LoadingRegion: React.FC<{ label?: string; children: React.ReactNode; className?: string }> = ({
  label = 'Đang tải…',
  children,
  className = '',
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

// --- Empty / error ---------------------------------------------------------

interface StateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  /** Emoji or icon node shown above the title. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: StateAction;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700 ${className}`}>
    {icon && <div className="text-4xl" aria-hidden="true">{icon}</div>}
    <p className="text-heading text-slate-800 dark:text-slate-100">{title}</p>
    {description && <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p>}
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="mt-1 inline-flex min-h-touch items-center justify-center rounded-lg bg-tone-sky-soft px-4 text-sm font-semibold text-tone-sky-fg shadow-sm hover:bg-tone-sky-soft"
      >
        {action.label}
      </button>
    )}
  </div>
);

interface ErrorStateProps {
  title?: string;
  /** Technical or friendly detail; keep it short. */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Không tải được dữ liệu',
  message,
  onRetry,
  retryLabel = 'Thử lại',
  className = '',
}) => (
  <div
    role="alert"
    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-tone-blush-border bg-tone-blush px-6 py-8 text-center ${className}`}
  >
    <AlertTriangle className="h-8 w-8 text-tone-blush-fg" aria-hidden="true" />
    <p className="text-heading text-tone-blush-fg">{title}</p>
    {message && <p className="max-w-sm text-sm text-tone-blush-fg">{message}</p>}
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-touch items-center justify-center gap-2 rounded-lg border border-tone-blush-border bg-white px-4 text-sm font-semibold text-tone-blush-fg hover:bg-tone-blush-soft dark:bg-slate-900"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {retryLabel}
      </button>
    )}
  </div>
);
