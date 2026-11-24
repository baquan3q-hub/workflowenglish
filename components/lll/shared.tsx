import React from 'react';
import { BookOpen, Lightbulb, MessageCircle, Newspaper, Play } from 'lucide-react';
import { LLL_CATALOG } from '../../data/lllCatalog';
import type { LllEditorial, LllEntry, LllKind, LllLink, LllTopic } from '../../services/lllLogic';

export const catalogByUrl: ReadonlyMap<string, LllEditorial> = new Map(LLL_CATALOG.map((item) => [item.url, item]));

export type EntryPatch = Partial<Pick<LllEntry, 'saved' | 'finished' | 'note'>>;

/** A link opened in the reader, with whatever the list knew about it. */
export interface LllOpen {
  link: LllLink;
  /** Why it was suggested (today's pick or the AI). */
  reason?: string;
  /** The AI's one-line note on the point of view, when asked for perspectives. */
  stance?: string;
}

export const topicStyles: Record<LllTopic, string> = {
  tech: 'border-tone-periwinkle-border bg-tone-periwinkle text-tone-periwinkle-fg',
  skills: 'border-tone-mint-border bg-tone-mint text-tone-mint-fg',
  life: 'border-tone-peach-border bg-tone-peach text-tone-peach-fg',
  society: 'border-tone-blush-border bg-tone-blush text-tone-blush-fg',
  work: 'border-tone-butter-border bg-tone-butter text-tone-butter-fg',
  planet: 'border-tone-aqua-border bg-tone-aqua text-tone-aqua-fg',
  health: 'border-tone-lavender-border bg-tone-lavender text-tone-lavender-fg',
};

export const kindIcons: Record<LllKind, typeof BookOpen> = {
  article: Newspaper, perspective: MessageCircle, explainer: Lightbulb, video: Play,
};

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Publisher and description from the catalog when the link is one of ours. */
export const withCatalog = (link: LllLink): LllLink & { description?: string } => {
  const curated = catalogByUrl.get(link.url);
  return curated ? { ...link, level: link.level ?? curated.level, kind: link.kind ?? curated.kind, publisher: link.publisher ?? curated.publisher, description: curated.description } : link;
};

export function LevelBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  return (
    <span className="rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold leading-none text-slate-700 dark:border-slate-600 dark:text-slate-200" title={`Trình độ ${level}`}>
      {level}
    </span>
  );
}
