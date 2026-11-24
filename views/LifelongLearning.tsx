import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { Tabs } from '../components/ui/Tabs';
import { secondaryBtn } from '../components/ui/styles';
import LllAsk from '../components/lll/LllAsk';
import LllReader from '../components/lll/LllReader';
import LllSaved from '../components/lll/LllSaved';
import LllToday, { type TodayFilters } from '../components/lll/LllToday';
import { catalogByUrl, withCatalog, type EntryPatch, type LllOpen } from '../components/lll/shared';
import { getLearningProfile } from '../services/learningProfileService';
import type { ProfileInterest, ProfileLevel } from '../services/learningProfileLogic';
import { getLllLibrary, saveLllEntry } from '../services/lllLibraryService';
import { getLllWordLog, logLllWords } from '../services/lllAi';
import { lllBaseLevel, lllTargetLevel, lllWeeklyStats, pickLllToday, type LllEntry, type LllLink } from '../services/lllLogic';
import { localDateKey } from '../services/analyticsLogic';
import { LLL_CATALOG } from '../data/lllCatalog';

type Tab = 'today' | 'ask' | 'saved';
const tabs = [{ id: 'today', label: 'Hôm nay' }, { id: 'ask', label: 'Hỏi AI' }, { id: 'saved', label: 'Đã lưu' }] as const;

export default function LifelongLearning({ userId, onBack }: { userId: string; onBack: () => void; onVocab?: () => void }) {
  const [tab, setTab] = useState<Tab>('today');
  const [filters, setFilters] = useState<TodayFilters>({ minutes: 10, difficulty: 'fit', topic: 'all' });
  const [entries, setEntries] = useState<LllEntry[]>([]);
  const [interests, setInterests] = useState<ProfileInterest[]>([]);
  const [profileLevel, setProfileLevel] = useState<ProfileLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState<LllOpen | null>(null);
  const [wordLog, setWordLog] = useState(() => getLllWordLog(userId));

  useEffect(() => {
    let cancelled = false;
    getLearningProfile(userId).then((profile) => {
      if (cancelled) return;
      setInterests(profile.interests);
      setProfileLevel(profile.level);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    getLllLibrary(userId)
      .then((items) => { if (!cancelled) setEntries(items); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, retry]);

  const base = lllBaseLevel(profileLevel);
  const target = lllTargetLevel(base, filters.difficulty);
  const day = localDateKey(new Date());
  const picks = useMemo(
    () => pickLllToday(LLL_CATALOG, entries, interests, { minutes: filters.minutes, topic: filters.topic, level: target }, day),
    [entries, interests, filters.minutes, filters.topic, target, day],
  );
  const saved = useMemo(() => entries.filter((e) => e.saved).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [entries]);
  const week = lllWeeklyStats(entries, wordLog, new Date());

  const save = async (item: LllLink, patch: EntryPatch) => {
    const { description: _description, ...link } = withCatalog(item);
    try {
      const updated = await saveLllEntry(userId, { ...link, origin: link.origin ?? (catalogByUrl.has(link.url) ? 'catalog' : 'user') }, patch);
      setEntries((list) => [updated, ...list.filter((entry) => entry.url !== updated.url)]);
      return true;
    } catch {
      return false;
    }
  };
  const open = (item: LllOpen) => { setActive(item); window.scrollTo({ top: 0 }); };
  const wordsSaved = (count: number) => {
    logLllWords(userId, count);
    setWordLog(getLllWordLog(userId));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-tone-lavender-border bg-gradient-to-br from-tone-lavender to-tone-aqua p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <img src="/lll-globe.webp" alt="" width={56} height={56} className="h-14 w-14 shrink-0" />
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tone-lavender-fg"><Compass className="h-4 w-4" aria-hidden="true" /> Life long learning</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Đọc tiếng Anh cùng AI</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Bài báo, góc nhìn và video thật, kèm AI tóm tắt, giải thích từ khó và nhận xét.</p>
          </div>
        </div>
        <button type="button" className={secondaryBtn} onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Trang Học</button>
      </header>
      {active ? (
        <LllReader key={active.link.url} open={active} userId={userId} level={base} loading={loading}
          entry={entries.find((entry) => entry.url === active.link.url)}
          onBack={() => setActive(null)} onSave={(patch) => save(active.link, patch)} onWordsSaved={wordsSaved} />
      ) : (
        <>
          <Tabs<Tab> label="Life long learning" items={tabs} value={tab} onChange={setTab} variant="pill" className="w-fit max-w-full" />
          {loadError && (
            <p role="status" className="rounded-xl bg-tone-peach p-3 text-sm text-tone-peach-fg">
              Chưa tải được thư viện cá nhân.{' '}
              <button type="button" className="font-semibold underline" onClick={() => setRetry((n) => n + 1)}>Thử lại</button>
            </p>
          )}
          {tab === 'today' && <LllToday picks={picks} filters={filters} onFilters={setFilters} target={target} week={week} onOpen={open} />}
          {tab === 'ask' && <LllAsk interests={interests} level={base} minutes={filters.minutes} known={entries.map((e) => e.url)} onOpen={open} />}
          {tab === 'saved' && <LllSaved saved={saved} loading={loading} loadError={loadError} onSave={save} onOpen={open} />}
        </>
      )}
    </div>
  );
}
