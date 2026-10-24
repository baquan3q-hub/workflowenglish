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
import { TAB_TONE, TONE_HOVER, toneClasses, type Tone } from './ui/palette';

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
  tone: Tone;
  request?: NavRequest;
}

const TABS: readonly TabDef[] = [
  { id: 'learn', label: 'Học', icon: Home, tone: TAB_TONE.learn, request: { phase: AppPhase.DASHBOARD } },
  { id: 'review', label: 'Ôn tập', icon: RotateCcw, tone: TAB_TONE.review, request: { phase: AppPhase.REVIEW_SESSION } },
  { id: 'vocab', label: 'Sổ từ', icon: BookMarked, tone: TAB_TONE.vocab, request: { phase: AppPhase.VOCAB_LIBRARY } },
  { id: 'stats', label: 'Thống kê', icon: BarChart3, tone: TAB_TONE.stats, request: { phase: AppPhase.ANALYTICS, analyticsSection: 'overview' } },
  { id: 'ielts', label: 'IELTS', icon: GraduationCap, tone: TAB_TONE.ielts, request: { phase: AppPhase.IELTS_HOME } },
];

const DueBadge: React.FC<{ count: number | null; className?: string }> = ({ count, className = '' }) => {
  const text = dueBadgeText(count);
  if (!text) return null;
  return (
    <span
      aria-hidden="true"
      className={`min-w-[18px] rounded-full border border-tone-blush-border bg-tone-blush-soft px-1 text-center text-[10px] font-bold leading-4 text-tone-blush-fg tabular-nums ${className}`}
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
        const t = toneClasses(tab.tone);
        // Labels show from 1024px; between 768 and 1024 (and in compact mode)
        // the tab is icon-only but keeps its label for screen readers.
        const labelClass = compact ? 'sr-only' : 'sr-only lg:not-sr-only';
        const base = `press group relative inline-flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
          compact ? 'px-2' : 'px-2 lg:px-3'
        } ${
          isActive ? t.tile : `text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${TONE_HOVER[tab.tone]}`
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
            <Icon className={`icon-pop h-4 w-4 ${t.text}`} />
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
          const t = toneClasses(tab.tone);
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-label={tabAriaLabel(tab, dueCount)}
              onClick={() => tab.request && onNavigate(tab.request)}
              className={`press group flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 text-[11px] font-semibold transition-colors ${
                isActive ? t.text : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="relative">
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? t.tile : TONE_HOVER[tab.tone]
                  }`}
                >
                  <Icon className={`icon-pop h-5 w-5 ${t.text}`} />
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
