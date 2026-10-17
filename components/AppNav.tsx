/**
 * App-level navigation: Học · Ôn tập · Sổ từ · Thống kê · IELTS.
 *
 * `AppNavDesktop` sits in the header from 768px; `AppNavMobile` is a fixed
 * tab bar below 768px. Both only report where the learner wants to go:
 * App decides how (e.g. asking to save a lesson in progress first).
 */

import React from 'react';
import { BarChart3, BookMarked, GraduationCap, Home, RotateCcw } from 'lucide-react';
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
  { id: 'vocab', label: 'Sổ từ', icon: BookMarked, request: { phase: AppPhase.VOCAB_LIBRARY } },
  { id: 'stats', label: 'Thống kê', icon: BarChart3, request: { phase: AppPhase.ANALYTICS, analyticsSection: 'overview' } },
  { id: 'ielts', label: 'IELTS', icon: GraduationCap, request: { phase: AppPhase.IELTS_HOME } },
];

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
  const active = activeNavTab(phase);

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
  const active = activeNavTab(phase);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:hidden"
    >
      <div className="relative mx-auto flex max-w-lg items-stretch justify-around px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-label={tabAriaLabel(tab, dueCount)}
              onClick={() => tab.request && onNavigate(tab.request)}
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
      </div>
    </nav>
  );
};
