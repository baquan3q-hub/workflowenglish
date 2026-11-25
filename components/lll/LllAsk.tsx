import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, Search, Sparkles } from 'lucide-react';
import { field, panel, primaryBtn, secondaryBtn } from '../ui/styles';
import { aiErrorMessage, isAbortError } from '../../services/aiClient';
import { discoverLll, discoverToLink, type DiscoverResult } from '../../services/lllAi';
import { searchLllCatalog, type LllLevel } from '../../services/lllLogic';
import type { ProfileInterest } from '../../services/learningProfileLogic';
import { LLL_CATALOG } from '../../data/lllCatalog';
import AiProgress from '../ui/AiProgress';
import LllCard from './LllCard';
import type { LllOpen } from './shared';

const SUGGESTIONS: Record<ProfileInterest, string> = {
  technology: 'AI trong giáo dục',
  business: 'góc nhìn khác về làm việc từ xa',
  travel: 'du lịch một mình',
  food: 'ăn uống lành mạnh',
  health: 'giấc ngủ và trí nhớ',
  sports: 'thể thao và sức khỏe tinh thần',
  music: 'âm nhạc tác động đến não',
  film: 'phim ảnh thay đổi cách ta nghĩ',
  science: 'khám phá không gian',
  environment: 'rác thải nhựa',
  education: 'cách học ngoại ngữ hiệu quả',
  games: 'trò chơi điện tử có tốt không',
};
const DEFAULTS = ['AI trong giáo dục', 'góc nhìn khác về làm việc từ xa', 'giấc ngủ và trí nhớ', 'biến đổi khí hậu'];

type AiState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'done'; result: DiscoverResult };

interface Props {
  interests: ProfileInterest[];
  level: LllLevel;
  minutes: number;
  /** URLs the learner already has, so the AI suggests something new. */
  known: string[];
  onOpen: (item: LllOpen) => void;
}

/** Google's required search-suggestion chip, isolated from the app (no scripts). */
function SearchSuggestions({ html }: { html: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Gợi ý tìm kiếm của Google</p>
      <iframe title="Gợi ý tìm kiếm của Google" srcDoc={`<base target="_blank">${html}`} sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="h-16 w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700" />
    </div>
  );
}

export default function LllAsk({ interests, level, minutes, known, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState('');
  const [perspectives, setPerspectives] = useState(false);
  const [ai, setAi] = useState<AiState>({ kind: 'idle' });
  const suggestions = useMemo(() => {
    const own = interests.map((i) => SUGGESTIONS[i]);
    return [...new Set([...own, ...DEFAULTS])].slice(0, 5);
  }, [interests]);
  const fromCatalog = useMemo(() => (asked ? searchLllCatalog(LLL_CATALOG, asked, 6) : []), [asked]);

  const discoverAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => discoverAbortRef.current?.abort(), []);

  const fromCatalogFor = (text: string) => searchLllCatalog(LLL_CATALOG, text, 6);
  const askAi = async (text: string, wantPerspectives = perspectives) => {
    discoverAbortRef.current?.abort();
    const controller = new AbortController();
    discoverAbortRef.current = controller;
    setAi({ kind: 'loading' });
    try {
      const exclude = [...new Set([...known, ...fromCatalogFor(text).map((i) => i.url)])];
      const result = await discoverLll(
        { query: text, level, minutes: Math.max(minutes, 10), perspectives: wantPerspectives, exclude },
        undefined,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setAi({ kind: 'done', result });
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setAi({ kind: 'idle' });
        return;
      }
      setAi({ kind: 'error', message: aiErrorMessage(err) });
    } finally {
      if (discoverAbortRef.current === controller) discoverAbortRef.current = null;
    }
  };

  const submit = (text: string) => {
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    setQuery(clean);
    setAsked(clean);
    setAi({ kind: 'idle' });
    // Few matches in the library, or the learner wants several views: go to the web.
    if (perspectives || fromCatalogFor(clean).length < 3) void askAi(clean);
  };

  return (
    <section className="space-y-4" role="tabpanel" aria-label="Hỏi AI">
      <form className={`${panel} space-y-3 p-4`} onSubmit={(e) => { e.preventDefault(); submit(query); }}>
        <label htmlFor="lll-ask" className="block font-semibold text-slate-900 dark:text-white">Bạn muốn đọc về gì?</label>
        <div className="flex gap-2">
          <input id="lll-ask" className={field} value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ tiếng Việt hay tiếng Anh, vd: AI trong giáo dục" enterKeyHint="search" />
          <button type="submit" className={`${primaryBtn} shrink-0 px-4`} disabled={!query.trim() || ai.kind === 'loading'} aria-label="Tìm bài">
            <Search className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Tìm</span>
          </button>
        </div>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-current text-tone-lavender-fg" checked={perspectives} onChange={(e) => setPerspectives(e.target.checked)} />
          Muốn nhiều góc nhìn (AI tìm các bài có quan điểm khác nhau)
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Gợi ý">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => submit(s)}
              className="press min-h-touch rounded-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700 hover:border-tone-lavender-border hover:bg-tone-lavender hover:text-tone-lavender-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {s}
            </button>
          ))}
        </div>
      </form>

      {asked && fromCatalog.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Trong kho bài đã chọn lọc</h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {fromCatalog.map((item) => <li key={item.url}><LllCard item={item} onOpen={() => onOpen({ link: item })} /></li>)}
          </ul>
        </div>
      )}

      {asked && ai.kind === 'idle' && (
        <button type="button" className={secondaryBtn} onClick={() => void askAi(asked)}>
          <Globe2 className="h-4 w-4" aria-hidden="true" /> Tìm thêm bài mới trên web với AI
        </button>
      )}
      {ai.kind === 'loading' && (
        <AiProgress
          tone="mint"
          label="AI đang tìm bài đọc tiếng Anh phù hợp…"
          detail="Đang rà nguồn mở, mở thử link thật và chọn bài khớp trình độ."
          stages={['Tìm nguồn mở', 'Mở thử từng bài', 'Chọn lọc bài hay']}
          estimatedMs={14_000}
          onCancel={() => discoverAbortRef.current?.abort()}
        />
      )}
      {ai.kind === 'error' && (
        <p role="alert" className="rounded-xl bg-tone-blush p-3 text-sm text-tone-blush-fg">
          {ai.message}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void askAi(asked)}>Thử lại</button>
        </p>
      )}
      {ai.kind === 'done' && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-tone-lavender-fg" aria-hidden="true" /> AI tìm trên web
          </h2>
          {ai.result.items.length ? (
            <ul className="grid gap-3 md:grid-cols-3">
              {ai.result.items.map((item) => {
                const link = discoverToLink(item);
                return (
                  <li key={item.url}>
                    <LllCard item={link} reason={item.reasonVi} stance={item.stanceVi || undefined}
                      onOpen={() => onOpen({ link, reason: item.reasonVi, stance: item.stanceVi || undefined })} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={`${panel} p-4 text-sm`}>AI chưa tìm được bài nào mở được và đáng tin. Thử diễn đạt chủ đề khác đi, hoặc cụ thể hơn.</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">Mỗi link đã được mở thử. Bài trên web có thể thay đổi; mức độ và số phút là ước tính.</p>
          {ai.result.searchEntryPoint && <SearchSuggestions html={ai.result.searchEntryPoint} />}
        </div>
      )}
    </section>
  );
}
