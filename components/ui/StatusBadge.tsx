import React from 'react';
import type { MasteryLevel } from '../../types';
import { getLevelMeta } from './srsTheme';

interface StatusBadgeProps {
  level: MasteryLevel | number | null | undefined;
  /** Show "Tạm ẩn" instead of the level. */
  suspended?: boolean;
  /** `dot`: coloured dot only (label in tooltip / screen reader). `pill`: dot + label. */
  variant?: 'dot' | 'pill' | 'label';
  size?: 'sm' | 'md';
  className?: string;
}

const DOT_SIZE = { sm: 'h-2 w-2', md: 'h-3 w-3' } as const;
const PILL_SIZE = { sm: 'px-2 py-0.5 text-[11px]', md: 'px-2.5 py-1 text-xs' } as const;

/** Mastery level indicator. Replaces the old MasteryBadge and per-screen colour maps. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  level,
  suspended = false,
  variant = 'pill',
  size = 'sm',
  className = '',
}) => {
  const meta = getLevelMeta(level, suspended);

  if (variant === 'label') {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-400 ${className}`}>
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
    );
  }

  if (variant === 'dot') {
    return (
      <span
        role="img"
        aria-label={meta.label}
        title={meta.label}
        className={`inline-block flex-shrink-0 rounded-full ${DOT_SIZE[size]} ${meta.dot} ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${PILL_SIZE[size]} ${meta.soft} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export default StatusBadge;
