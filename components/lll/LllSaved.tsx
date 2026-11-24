import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import { field, panel, primaryBtn } from '../ui/styles';
import { LLL_TOPICS, normalizeLllUrl, type LllEntry, type LllLanguage, type LllLink, type LllTopic } from '../../services/lllLogic';
import LllCard from './LllCard';
import type { EntryPatch, LllOpen } from './shared';

const blankLink = { url: '', title: '', topic: 'tech' as LllTopic, language: 'en' as LllLanguage, minutes: '' };

interface Props {
  saved: LllEntry[];
  loading: boolean;
  loadError: boolean;
  onSave: (item: LllLink, patch: EntryPatch) => Promise<boolean>;
  onOpen: (item: LllOpen) => void;
}

export default function LllSaved({ saved, loading, loadError, onSave, onOpen }: Props) {
  const [draft, setDraft] = useState(blankLink);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
    const ok = await onSave({
      url, title: draft.title.trim(), topic: draft.topic, language: draft.language, origin: 'user',
      minutes: draft.minutes === '' ? null : Number(draft.minutes),
    }, { saved: true });
    setSaving(false);
    if (ok) setDraft(blankLink);
    else setFormError('Chưa lưu được link. Thông tin đã nhập vẫn ở đây để bạn thử lại.');
  };

  return (
    <section role="tabpanel" aria-label="Đã lưu" className="space-y-4">
      {loading && <p role="status" className="text-sm">Đang tải mục đã lưu…</p>}
      {!loading && !loadError && !saved.length && <p className={`${panel} p-5 text-sm`}>Bạn chưa lưu bài nào. Mở một bài rồi bấm “Lưu bài”, hoặc thêm link của bạn bên dưới.</p>}
      {saved.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-3">
          {saved.map((item) => (
            <li key={item.url}>
              <LllCard item={item} status={item.finished ? 'Đã đọc xong' : item.note ? 'Có ghi chú' : undefined} onOpen={() => onOpen({ link: item })} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addLink} className={`${panel} space-y-3 p-4 sm:p-6`}>
        <h2 className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4" aria-hidden="true" /> Link của tôi</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Link HTTPS<input className={`${field} mt-1`} type="url" value={draft.url} required maxLength={2048} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
          <label className="text-sm">Tiêu đề<input className={`${field} mt-1`} value={draft.title} required maxLength={160} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Chủ đề<select className={`${field} mt-1`} value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value as LllTopic })}>
            {(Object.keys(LLL_TOPICS) as LllTopic[]).map((id) => <option key={id} value={id}>{LLL_TOPICS[id]}</option>)}
          </select></label>
          <label className="text-sm">Ngôn ngữ<select className={`${field} mt-1`} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as LllLanguage })}>
            <option value="en">Tiếng Anh</option><option value="vi">Tiếng Việt</option>
          </select></label>
          <label className="text-sm">Số phút (tùy chọn)<input className={`${field} mt-1`} type="number" min={1} max={600} value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} /></label>
        </div>
        <button type="submit" className={primaryBtn} disabled={saving || loading}>{saving ? 'Đang lưu…' : 'Lưu link'}</button>
        {formError && <p role="alert" className="text-sm text-tone-blush-fg">{formError}</p>}
      </form>
    </section>
  );
}
