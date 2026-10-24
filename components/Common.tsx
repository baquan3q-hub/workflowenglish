import React from 'react';
import { Loader2, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading, 
  disabled, 
  ...props 
}) => {
  const baseStyle = "inline-flex min-h-touch items-center justify-center rounded-lg px-4 py-2 font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-tone-sky-soft text-tone-sky-fg hover:bg-tone-sky-soft focus-visible:ring-tone-sky-accent shadow-sm",
    secondary: "bg-tone-mint-soft text-tone-mint-fg hover:bg-tone-mint focus-visible:ring-tone-mint-accent shadow-sm",
    outline: "border-2 border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select: React.FC<SelectProps> = ({ label, children, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      <div className="relative">
        <select 
          className={`w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-tone-sky-border focus:outline-none focus:ring-1 focus:ring-tone-sky-accent ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode, color?: 'blue' | 'green' | 'yellow' }> = ({ children, color = 'blue' }) => {
  const colors = {
    blue: "bg-tone-sky-soft text-tone-sky-fg",
    green: "bg-tone-mint-soft text-tone-mint-fg",
    yellow: "bg-tone-butter-soft text-tone-butter-fg",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- ProgressBar ---
export const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-200">
      <div 
        className="h-2.5 rounded-full bg-tone-sky-accent transition-all duration-500 ease-out" 
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      ></div>
    </div>
  );
};

// --- Toast ---
/**
 * Top-center notification. Auto-dismisses after `durationMs` (default 3s,
 * 5s when it carries an action) and cleans up its timer if the component
 * unmounts or `visible` flips early.
 *
 * `action` adds one button, e.g. "Hoàn tác" after a reversible change.
 * Clicking it runs the action and closes the toast.
 *
 * Positioning: fixed, top-center, z-index 100 — above the sticky header
 * (z-50) and the bottom navigation (z-50). Uses the `anim-toast-in`
 * keyframe defined in index.html.
 */
export type ToastType = 'success' | 'info' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  /** Auto-dismiss duration in ms. Defaults to 3000, or 5000 with an action. */
  durationMs?: number;
  action?: ToastAction;
}

const TOAST_PALETTE: Record<ToastType, string> = {
  success: 'bg-tone-mint-soft text-tone-mint-fg',
  info: 'bg-tone-sky-soft text-tone-sky-fg',
  error: 'bg-tone-blush-soft text-tone-blush-fg',
};

const TOAST_ICON: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircle,
  info: Info,
  error: AlertTriangle,
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  visible,
  onClose,
  durationMs,
  action,
}) => {
  const duration = durationMs ?? (action ? 5000 : 3000);
  React.useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [visible, duration, onClose, message]);

  if (!visible) return null;

  const Icon = TOAST_ICON[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`anim-toast-in fixed top-4 left-1/2 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl py-2 pl-4 pr-2 shadow-lg ring-1 ring-black/5 dark:ring-white/10 ${TOAST_PALETTE[type]}`}
      style={{ zIndex: 100, transform: 'translateX(-50%)' }}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="py-1 text-sm font-medium">{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className="min-h-touch flex-shrink-0 rounded-lg px-3 text-sm font-bold underline-offset-2 hover:bg-black/5 hover:underline dark:hover:bg-white/10"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="inline-flex min-h-touch min-w-touch flex-shrink-0 items-center justify-center rounded-lg opacity-80 transition-colors hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
