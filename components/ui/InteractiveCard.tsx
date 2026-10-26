import React from 'react';
import { toneClasses, type Tone } from './palette';
import { glassPanel } from './styles';

type Props = {
  /** Pastel surface; omit for the plain white/slate panel. */
  tone?: Tone;
  /** Frosted glass surface (glassPanel) instead of the tone or plain one. */
  glass?: boolean;
  /** Render as a <div> (for a card holding its own buttons) instead of a <button>. */
  as?: 'button' | 'div' | 'li';
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'> &
  Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'type'>;

const BASE =
  'group relative border text-left transition-[transform,box-shadow] duration-200 ease-out ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-tone-periwinkle-fg focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';
const MOTION = 'hover:-translate-y-0.5 hover:shadow-raised active:translate-y-0 active:scale-[0.98]';
const PLAIN = 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

/**
 * A card that reacts to the pointer: lifts 2px with a raised shadow on hover,
 * shrinks a touch while pressed, and shows a focus ring for the keyboard.
 * Pair with IconTile inside it for the icon pop.
 */
export const InteractiveCard: React.FC<Props> = ({ tone, glass = false, as = 'button', className = '', children, disabled, type, ...rest }) => {
  // glassPanel brings its own radius; the others use the card radius.
  const surface = glass ? glassPanel : `rounded-2xl ${tone ? toneClasses(tone).surface : PLAIN}`;
  const cls = `${BASE} ${surface} ${disabled ? 'cursor-not-allowed opacity-60' : MOTION} ${className}`;
  if (as === 'button') {
    return (
      <button type={type ?? 'button'} disabled={disabled} className={cls} {...rest}>
        {children}
      </button>
    );
  }
  const Tag = as;
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
};

export default InteractiveCard;
