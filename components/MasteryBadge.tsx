import React from 'react';
import { MasteryLevel } from '../types';

interface MasteryBadgeProps {
  level: MasteryLevel;
  size?: 'sm' | 'md';
}

const LEVEL_LABELS_VI: Record<MasteryLevel, string> = {
  [MasteryLevel.NEW]: 'Mới',
  [MasteryLevel.LEARNING]: 'Đang học',
  [MasteryLevel.REVIEWING]: 'Ôn tập',
  [MasteryLevel.MASTERED]: 'Thành thạo',
  [MasteryLevel.LAPSED]: 'Đã quên',
};

const LEVEL_COLORS: Record<MasteryLevel, string> = {
  [MasteryLevel.NEW]: 'bg-gray-400 dark:bg-gray-500',
  [MasteryLevel.LEARNING]: 'bg-yellow-500 dark:bg-yellow-500',
  [MasteryLevel.REVIEWING]: 'bg-blue-500 dark:bg-blue-500',
  [MasteryLevel.MASTERED]: 'bg-emerald-500 dark:bg-emerald-500',
  [MasteryLevel.LAPSED]: 'bg-red-500 dark:bg-red-500',
};

const SIZE_CLASSES: Record<NonNullable<MasteryBadgeProps['size']>, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
};

export const MasteryBadge: React.FC<MasteryBadgeProps> = ({ level, size = 'sm' }) => {
  const label = LEVEL_LABELS_VI[level];
  const colorClass = LEVEL_COLORS[level];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block rounded-full ${sizeClass} ${colorClass}`}
    />
  );
};

export default MasteryBadge;
