import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bookmark, BookOpen, Check, Clock3, Compass, Link2, Play } from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { Tabs } from '../components/ui/Tabs';
import { field, panel, primaryBtn, secondaryBtn } from '../components/ui/styles';
import { getLearningProfile } from '../services/learningProfileService';
import type { ProfileInterest } from '../services/learningProfileLogic';
import { getLllLibrary, saveLllEntry } from '../services/lllLibraryService';
import { LLL_TOPICS, lllYoutubeId, normalizeLllUrl, pickLllToday, type LllEntry, type LllLanguage, type LllLink, type LllTopic } from '../services/lllLogic';
import { localDateKey } from '../services/analyticsLogic';
import { LLL_CATALOG } from '../data/lllCatalog';

const catalogByUrl = new Map(LLL_CATALOG.map((item) => [item.url, item]));
const topicOptions = Object.entries(LLL_TOPICS);
const topicStyles = {
  tech: 'border-tone-periwinkle-border bg-tone-periwinkle text-tone-periwinkle-fg',
  skills: 'border-tone-mint-border bg-tone-mint text-tone-mint-fg',
  life: 'border-tone-peach-border bg-tone-peach text-tone-peach-fg',
};
const tabs = [{ id: 'today', label: 'Bản chọn hôm nay' }, { id: 'saved', label: 'Đã lưu' }] as const;
const blankLink = { url: '', title: '', topic: 'tech' as LllTopic, language: 'vi' as LllLanguage, minutes: '' };
type EntryPatch = Partial<Pick<LllEntry, 'saved' | 'finished' | 'note'>>;

function LllCard({ item, reason, onOpen }: { item: LllLink; reason?: string; onOpen: () => void }) {
  const curated = catalogByUrl.get(item.url);
  const video = lllYoutubeId(new URL(item.url));
  const Format = video ? Play : BookOpen;
  return (
    <article className={`flex h-full min-w-0 flex-col overflow-hidden ${panel}`}>
      <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 text-xs font-semibold ${topicStyles[item.topic]}`}>
        {LLL_TOPICS[item.topic]} <Format aria-hidden="true" className="h-5 w-5 shrink-0" />
      </div>
      <div className="flex flex-1 flex-col items-start gap-2 p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          {item.language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}
          {item.minutes != null && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.minutes} phút</span>}
          <span className="break-all">{curated?.publisher ?? new URL(item.url).hostname}</span>
        </p>
        <h3 className="break-words font-semibold text-slate-900 dark:text-white">{item.title}</h3>
        {curated && <p className="text-sm text-slate-600 dark:text-slate-300">{curated.description}</p>}
        {reason && <p className="text-xs font-medium text-tone-lavender-fg">{reason}</p>}
        <button type="button" className={`${secondaryBtn} mt-auto`} onClick={onOpen} aria-label={`Mở nội dung: ${item.title}`}>
          Mở nội dung <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function LllDetail({ item, entry, loading, onBack, onVocab, onSave }: {
  item: LllLink; entry?: LllEntry; loading: boolean; onBack: () => void; onVocab: () => void; onSave: (patch: EntryPatch) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const curated = catalogByUrl.get(item.url);
  const video = lllYoutubeId(new URL(item.url));
  const note = draft ?? entry?.note ?? '';
  const save = async (patch: EntryPatch, message: string) => {
    if (busy || loading) return;
    setBusy(true);
    setFeedback(null);
    const ok = await onSave(patch);
    setBusy(false);
    setFeedback({ error: !ok, text: ok ? message : 'Chưa lưu được. Bạn có thể thử lại.' });
    if (ok && 'note' in patch) setDraft(null);
  };
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className={secondaryBtn}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về danh sách</button>
      <article className={`${panel} space-y-4 p-4 sm:p-6`}>
        <div>
          <p className="text-xs font-semibold text-tone-lavender-fg">{LLL_TOPICS[item.topic]} · {curated?.publisher ?? new URL(item.url).hostname}</p>
          <h2 className="mt-1 break-words text-2xl font-bold text-slate-900 dark:text-white">{item.title}</h2>
          {curated && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{curated.description}</p>}
        </div>
        {playing && video && (
          <iframe className="aspect-video min-h-[200px] w-full rounded-xl bg-slate-950" title={`YouTube: ${item.title}`}
            src={`https://www.youtube-nocookie.com/embed/${video}`} allow="encrypted-media; picture-in-picture" allowFullScreen />
        )}
        <div className="flex flex-wrap gap-2">
          {video && !playing && <button type="button" className={primaryBtn} onClick={() => setPlaying(true)}>Phát video</button>}
          <a className={video ? secondaryBtn : primaryBtn} href={item.url} target="_blank" rel="noopener noreferrer">
            Mở nguồn gốc <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button type="button" className={secondaryBtn} disabled={busy || loading || entry?.saved} onClick={() => void save({ saved: true }, 'Đã lưu nguồn.')}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />{entry?.saved ? 'Đã lưu' : 'Lưu nguồn'}
          </button>
          <button type="button" className={secondaryBtn} disabled={busy || loading || entry?.finished} onClick={() => void save({ finished: true }, 'Đã ghi nhận hoàn thành.')}>
            <Check className="h-4 w-4" aria-hidden="true" />{entry?.finished ? 'Đã đọc/xem' : 'Đánh dấu đã đọc/xem'}
          </button>
        </div>
      </article>
      <form className={`${panel} space-y-3 p-4 sm:p-6`} onSubmit={(event) => { event.preventDefault(); void save({ note: note.trim(), saved: true }, 'Đã lưu ghi chú.'); }}>
        <label htmlFor="lll-note" className="block font-semibold text-slate-900 dark:text-white">Giữ lại một điều</label>
        <textarea id="lll-note" value={note} onChange={(event) => setDraft(event.target.value)} maxLength={500} disabled={busy || loading}
          className={`${field} min-h-24 py-2`} placeholder="Bạn muốn nhớ điều gì từ nội dung này?" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || loading || (entry?.note ?? '') === note.trim()} className={primaryBtn}>Lưu ghi chú</button>
          {item.language === 'en' && <button type="button" onClick={onVocab} className={secondaryBtn}>Mở Sổ từ</button>}
        </div>
        {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-sm ${feedback.error ? 'text-tone-blush-fg' : 'text-tone-mint-fg'}`}>{feedback.text}</p>}
      </form>
    </div>
  );
}

export default function LifelongLearning({ userId, onBack, onVocab }: { userId: string; onBack: () => void; onVocab: () => void }) {
  const [tab, setTab] = useState<'today' | 'saved'>('today');
  const [filters, setFilters] = useState<{ minutes: 5 | 10 | 20; language: LllLanguage | 'all'; topic: LllTopic | 'all' }>({ minutes: 10, language: 'all', topic: 'all' });
  const [entries, setEntries] = useState<LllEntry[]>([]);
  const [interests, setInterests] = useState<ProfileInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState<LllLink | null>(null);
  const [draft, setDraft] = useState(blankLink);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getLearningProfile(userId).then((profile) => { if (!cancelled) setInterests(profile.interests); });
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

  const save = async (item: LllLink, patch: EntryPatch) => {
    try {
      const updated = await saveLllEntry(userId, item, patch);
      setEntries((list) => [updated, ...list.filter((entry) => entry.url !== updated.url)]);
      return true;
    } catch {
      return false;
    }
  };
  const addLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;
    const url = normalizeLllUrl(draft.url);
    if (!url || !draft.title.trim()) {
      setFormError('Nhập một link HTTPS hợp lệ và tiêu đề.');
      return;
    }
    setSaving(true);
    setFormError('');
    const ok = await save({ ...draft, url, title: draft.title.trim(), minutes: draft.minutes === '' ? null : Number(draft.minutes) }, { saved: true });
    setSaving(false);
    if (ok) setDraft(blankLink);
    else setFormError('Chưa lưu được link. Thông tin đã nhập vẫn ở đây để bạn thử lại.');
  };

  const picks = pickLllToday(LLL_CATALOG, entries, interests, filters, localDateKey(new Date()));
  const saved = entries.filter((entry) => entry.saved).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const open = (item: LllLink) => { setActive(item); window.scrollTo({ top: 0 }); };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-tone-lavender-border bg-gradient-to-br from-tone-lavender to-tone-aqua p-5 sm:p-7">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tone-lavender-fg"><Compass className="h-4 w-4" aria-hidden="true" /> Life long learning</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">LLL · Khám phá mỗi ngày</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Vài phút cho điều bạn tò mò.</p>
        </div>
        <button type="button" className={secondaryBtn} onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Trang Học</button>
      </header>
      {active ? (
        <LllDetail key={active.url} item={active} loading={loading} entry={entries.find((entry) => entry.url === active.url)}
          onBack={() => setActive(null)} onVocab={onVocab} onSave={(patch) => save(active, patch)} />
      ) : (
        <>
          <Tabs<'today' | 'saved'> label="Thư viện LLL" items={tabs} value={tab} onChange={setTab} variant="pill" className="w-fit max-w-full" />
          {loadError && <p role="status" className="rounded-xl bg-tone-peach p-3 text-sm text-tone-peach-fg">
            Chưa tải được thư viện cá nhân.{' '}
            <button type="button" className="font-semibold underline" onClick={() => setRetry((n) => n + 1)}>Thử lại</button>
          </p>}
          {tab === 'today' ? (
            <section className="space-y-4" role="tabpanel" aria-label="Bản chọn hôm nay">
              <div className={`${panel} grid gap-3 p-4 sm:grid-cols-3`}>
                <div>
                  <p className="mb-1 text-sm font-medium">Bạn có bao lâu?</p>
                  <Segmented label="Thời gian rảnh" value={filters.minutes} onChange={(minutes) => setFilters({ ...filters, minutes })}
                    options={[{ value: 5, label: '5 phút' }, { value: 10, label: '10 phút' }, { value: 20, label: '20 phút' }]} />
                </div>
                <label className="block text-sm font-medium">Ngôn ngữ
                  <select className={`${field} mt-1`} value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value as typeof filters.language })}>
                    <option value="all">Cả hai</option><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">Chủ đề
                  <select className={`${field} mt-1`} value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value as typeof filters.topic })}>
                    <option value="all">Tất cả chủ đề</option>
                    {topicOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </label>
              </div>
              {picks.length ? (
                <ul className="grid gap-3 md:grid-cols-3">{picks.map(({ item, reason }) => <li key={item.url}><LllCard item={item} reason={reason} onOpen={() => open(item)} /></li>)}</ul>
              ) : <p className={`${panel} p-5 text-sm`}>Chưa có mục phù hợp. Hãy thử đổi thời lượng, ngôn ngữ hoặc chủ đề.</p>}
            </section>
          ) : (
            <section role="tabpanel" aria-label="Đã lưu" className="space-y-4">
              <form onSubmit={addLink} className={`${panel} space-y-3 p-4 sm:p-6`}>
                <h2 className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4" aria-hidden="true" /> Link của tôi</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">Link HTTPS<input className={`${field} mt-1`} type="url" value={draft.url} required maxLength={2048} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
                  <label className="text-sm">Tiêu đề<input className={`${field} mt-1`} value={draft.title} required maxLength={160} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-sm">Chủ đề<select className={`${field} mt-1`} value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value as LllTopic })}>
                    {topicOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select></label>
                  <label className="text-sm">Ngôn ngữ<select className={`${field} mt-1`} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as LllLanguage })}>
                    <option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option>
                  </select></label>
                  <label className="text-sm">Số phút (tùy chọn)<input className={`${field} mt-1`} type="number" min={1} max={600} value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} /></label>
                </div>
                <button type="submit" className={primaryBtn} disabled={saving || loading}>{saving ? 'Đang lưu…' : 'Lưu link'}</button>
                {formError && <p role="alert" className="text-sm text-tone-blush-fg">{formError}</p>}
              </form>
              {loading && <p role="status" className="text-sm">Đang tải mục đã lưu…</p>}
              {!loading && !loadError && !saved.length && <p className={`${panel} p-5 text-sm`}>Bạn chưa lưu nội dung nào.</p>}
              <ul className="grid gap-3 md:grid-cols-3">
                {saved.map((item) => <li key={item.url}>
                  <LllCard item={item} reason={item.finished ? 'Đã đọc/xem' : item.note ? 'Có ghi chú' : undefined} onOpen={() => open(item)} />
                </li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
