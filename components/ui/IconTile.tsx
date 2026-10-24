import React from 'react';
import { toneClasses, type Tone } from './palette';

type IconComponent = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

interface Props {
  icon?: IconComponent;
  imageSrc?: string;
  imageAlt?: string;
  tone: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4', img: 'h-6 w-6' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5', img: 'h-8 w-8' },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 'h-6 w-6', img: 'h-10 w-10' },
} as const;

/**
 * A tone-coloured square holding one Lucide icon or bitmap image. Put it inside an element
 * with the `group` class and the icon pops (grows and tilts) when that
 * element is hovered or keyboard-focused.
 */
export const IconTile: React.FC<Props> = ({ icon: Icon, imageSrc, imageAlt = '', tone, size = 'md', className = '' }) => {
  const s = SIZES[size];
  return (
    <span className={`flex flex-shrink-0 items-center justify-center ${s.box} ${toneClasses(tone).tile} ${className}`} aria-hidden="true">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          className={`icon-pop ${s.img} object-contain select-none`}
          draggable={false}
        />
      ) : Icon ? (
        <Icon className={`icon-pop ${s.icon}`} aria-hidden />
      ) : null}
    </span>
  );
};

export default IconTile;
