import React from 'react';
import { BookOpen, Clock3, Sparkles } from 'lucide-react';
import { secondaryBtn, panel } from '../ui/styles';
import { LLL_KINDS, LLL_TOPICS, lllYoutubeId, type LllLink } from '../../services/lllLogic';
import { hostOf, kindIcons, LevelBadge, topicStyles, withCatalog } from './shared';

interface Props {
  item: LllLink;
  reason?: string;
  stance?: string;
  /** Small status under the title, e.g. "Đã đọc". */
  status?: string;
  onOpen: () => void;
}

export default function LllCard({ item, reason, stance, status, onOpen }: Props) {
  const full = withCatalog(item);
  const video = full.kind === 'video' || !!lllYoutubeId(new URL(item.url));
  const kind = full.kind ?? (video ? 'video' : null);
  const Kind = kind ? kindIcons[kind] : BookOpen;
  return (
    <article className={`flex h-full min-w-0 flex-col overflow-hidden ${panel}`}>
      <div className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 text-xs font-semibold ${topicStyles[item.topic]}`}>
        <span className="inline-flex items-center gap-1.5"><Kind className="h-4 w-4 shrink-0" aria-hidden="true" />{kind ? LLL_KINDS[kind] : 'Liên kết'}</span>
        <span className="truncate">{LLL_TOPICS[item.topic]}</span>
      </div>
      <div className="flex flex-1 flex-col items-start gap-2 p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <LevelBadge level={full.level} />
          {item.minutes != null && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.minutes} phút</span>}
          <span className="min-w-0 truncate">{full.publisher ?? hostOf(item.url)}</span>
          {item.language === 'vi' && <span>· Tiếng Việt</span>}
        </p>
        <h3 className="break-words font-semibold leading-snug text-slate-900 dark:text-white" lang={item.language}>{item.title}</h3>
        {full.description && <p className="text-sm text-slate-600 dark:text-slate-300">{full.description}</p>}
        {stance && <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">Góc nhìn:</span> {stance}</p>}
        {reason && <p className="inline-flex items-start gap-1 text-xs font-medium text-tone-lavender-fg"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{reason}</p>}
        {status && <p className="text-xs font-medium text-tone-mint-fg">{status}</p>}
        <button type="button" className={`${secondaryBtn} mt-auto w-full sm:w-auto`} onClick={onOpen} aria-label={`Đọc cùng AI: ${item.title}`}>
          {video ? 'Xem cùng AI' : 'Đọc cùng AI'}
        </button>
      </div>
    </article>
  );
}
