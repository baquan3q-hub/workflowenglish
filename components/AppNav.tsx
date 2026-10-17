/**
 * App-level navigation: Học · Ôn tập · Sổ từ · Thống kê · IELTS.
 *
 * `AppNavDesktop` sits in the header from 768px; `AppNavMobile` is a fixed
 * tab bar below 768px. Both only report where the learner wants to go:
 * App decides how (e.g. asking to save a lesson in progress first).
 */

import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, BookMarked, GraduationCap, Home, Mic, PenTool, RotateCcw } from 'lucide-react';
import { activeNavTab, dueBadgeText, type AnalyticsSection, type NavTabId } from './navConfig';
import { AppPhase } from '../types';

export interface NavRequest {
  phase: AppPhase;
  analyticsSection?: AnalyticsSection;
}

interface AppNavProps {
  phase: AppPhase;
  analyticsSection: AnalyticsSection;
  dueCount: number | null;
  onNavigate: (request: NavRequest) => void;
}

interface TabDef {
  id: NavTabId;
  label: string;
  icon: React.FC<{ className?: string }>;
  request?: NavRequest;
}

const TABS: readonly TabDef[] = [
  { id: 'learn', label: 'Học', icon: Home, request: { phase: AppPhase.DASHBOARD } },
  { id: 'review', label: 'Ôn tập', icon: RotateCcw, request: { phase: AppPhase.REVIEW_SESSION } },
  { id: 'vocab', label: 'Sổ từ', icon: BookMarked, request: { phase: AppPhase.ANALYTICS, analyticsSection: 'vocab' } },
  { id: 'stats', label: 'Thống kê', icon: BarChart3, request: { phase: AppPhase.ANALYTICS, analyticsSection: 'overview' } },
  { id: 'ielts', label: 'IELTS', icon: GraduationCap },
];

const IELTS_ITEMS: readonly { label: string; hint: string; icon: React.FC<{ className?: string }>; phase: AppPhase }[] = [
  { label: 'IELTS Writing', hint: 'Luyện viết Task 1, Task 2', icon: PenTool, phase: AppPhase.IELTS_WRITING_HUB },
  { label: 'IELTS Speaking', hint: 'Luyện nói Part 1, 2, 3', icon: Mic, phase: AppPhase.IELTS_SPEAKING_HUB },
];

/** Small popover listing the two IELTS hubs. Closes on outside click and Esc. */
const IeltsMenu: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (phase: AppPhase) => void;
  placement: 'above' | 'below';
}> = ({ open, onClose, onPick, placement }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      const trigger = (e.target as HTMLElement).closest('[data-ielts-trigger]');
      if (!ref.current?.contains(e.target as Node) && !trigger) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Chọn kỹ năng IELTS"
      className={`absolute right-0 z-[60] w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-raised dark:border-slate-700 dark:bg-slate-800 ${
        placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
    >
      {IELTS_ITEMS.map(({ label, hint, icon: Icon, phase }) => (
        <button
          key={phase}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onPick(phase);
          }}
          className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Icon className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
            <span className="block text-xs text-slate-600 dark:text-slate-400">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

const DueBadge: React.FC<{ count: number | null; className?: string }> = ({ count, className = '' }) => {
  const text = dueBadgeText(count);
  if (!text) return null;
  return (
    <span
      aria-hidden="true"
      className={`min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white tabular-nums ${className}`}
    >
      {text}
    </span>
  );
};

function tabAriaLabel(tab: TabDef, dueCount: number | null): string {
  const due = dueBadgeText(dueCount);
  return tab.id === 'review' && due ? `${tab.label}, ${due} từ đến hạn` : tab.label;
}

/** Header navigation (≥ 768px). `compact` shows icons only, used while a lesson's step bar takes the space. */
export const AppNavDesktop: React.FC<AppNavProps & { compact?: boolean }> = ({
  phase,
  analyticsSection,
  dueCount,
  onNavigate,
  compact = false,
}) => {
  const [ieltsOpen, setIeltsOpen] = useState(false);
  const active = activeNavTab(phase, analyticsSection);

  return (
    <nav aria-label="Điều hướng chính" className="hidden items-center gap-0.5 md:flex">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        // Labels show from 1024px; between 768 and 1024 (and in compact mode)
        // the tab is icon-only but keeps its label for screen readers.
        const labelClass = compact ? 'sr-only' : 'sr-only lg:not-sr-only';
        const base = `relative inline-flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
          compact ? 'px-2' : 'px-2 lg:px-3'
        } ${
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
        }`;

        if (tab.id === 'ielts') {
          return (
            <div key={tab.id} className="relative">
              <button
                type="button"
                data-ielts-trigger
                aria-haspopup="menu"
                aria-expanded={ieltsOpen}
                aria-current={isActive ? 'page' : undefined}
                title={tab.label}
                onClick={() => setIeltsOpen((v) => !v)}
                className={base}
              >
                <Icon className="h-4 w-4" />
                <span className={labelClass}>{tab.label}</span>
              </button>
              <IeltsMenu
                open={ieltsOpen}
                onClose={() => setIeltsOpen(false)}
                onPick={(p) => onNavigate({ phase: p })}
                placement="below"
              />
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.id === 'review' ? tabAriaLabel(tab, dueCount) : undefined}
            title={tab.label}
            onClick={() => tab.request && onNavigate(tab.request)}
            className={base}
          >
            <Icon className="h-4 w-4" />
            <span className={labelClass}>{tab.label}</span>
            {tab.id === 'review' && (
              <DueBadge
                count={dueCount}
                className={compact ? 'absolute -right-0.5 -top-0.5' : 'absolute -right-0.5 -top-0.5 lg:static'}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

/** Fixed bottom tab bar (< 768px). */
export const AppNavMobile: React.FC<AppNavProps> = ({ phase, analyticsSection, dueCount, onNavigate }) => {
  const [ieltsOpen, setIeltsOpen] = useState(false);
  const active = activeNavTab(phase, analyticsSection);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:hidden"
    >
      <div className="relative mx-auto flex max-w-lg items-stretch justify-around px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          const isIelts = tab.id === 'ielts';
          return (
            <button
              key={tab.id}
              type="button"
              data-ielts-trigger={isIelts ? '' : undefined}
              aria-haspopup={isIelts ? 'menu' : undefined}
              aria-expanded={isIelts ? ieltsOpen : undefined}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tabAriaLabel(tab, dueCount)}
              onClick={() => (isIelts ? setIeltsOpen((v) => !v) : tab.request && onNavigate(tab.request))}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="relative">
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-blue-100 dark:bg-blue-500/20' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {tab.id === 'review' && <DueBadge count={dueCount} className="absolute -right-1 -top-1" />}
              </span>
              {tab.label}
            </button>
          );
        })}
        <IeltsMenu
          open={ieltsOpen}
          onClose={() => setIeltsOpen(false)}
          onPick={(p) => onNavigate({ phase: p })}
          placement="above"
        />
      </div>
    </nav>
  );
};
