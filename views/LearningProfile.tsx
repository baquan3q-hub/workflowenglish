/**
 * Hồ sơ học tập: what the learner tells the app about themself so the AI can
 * pick examples, topics and level for them. Kept in `learning_profiles`.
 */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CircleAlert, CircleCheck, Loader2, Save, ShieldCheck, UserRound } from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { toneClasses, type Tone } from '../components/ui/palette';
import { field, ghostBtn, panel, primaryBtn } from '../components/ui/styles';
import { Skeleton } from '../components/ui/States';
import {
  EMPTY_PROFILE,
  GOAL_LABELS,
  INTEREST_LABELS,
  NAME_MAX,
  NOTE_MAX,
  OCCUPATION_MAX,
  PROFILE_GOALS,
  PROFILE_INTERESTS,
  PROFILE_LEVELS,
  PROFILE_MINUTES,
  PROFILE_WEAK_AREAS,
  profileCompletion,
  WEAK_AREA_LABELS,
  type LearningProfile as Profile,
} from '../services/learningProfileLogic';
import { getLearningProfile, saveLearningProfile } from '../services/learningProfileService';

interface Props {
  userId: string;
  onBack: () => void;
  /** Service calls; injectable for previews and tests. */
  api?: { load: (userId: string) => Promise<Profile>; save: (userId: string, p: Profile) => Promise<Profile> };
}

const defaultApi = { load: getLearningProfile, save: saveLearningProfile };
const label = 'block text-caption font-semibold text-slate-700 dark:text-slate-200';
const hint = 'text-caption text-slate-600 dark:text-slate-400';

function Chip({ on, tone, onClick, children }: { on: boolean; tone: Tone; onClick: () => void; children: React.ReactNode }) {
  const t = toneClasses(tone);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`press inline-flex min-h-touch items-center rounded-xl border px-3 text-sm font-medium transition-colors ${
        on ? `${t.border} ${t.tile} font-semibold` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, hintText, children }: { title: string; hintText?: string; children: React.ReactNode }) {
  return (
    <section className={`${panel} space-y-3 p-4 sm:p-5`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
        {hintText && <p className={`mt-0.5 ${hint}`}>{hintText}</p>}
      </div>
      {children}
    </section>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function LearningProfile({ userId, onBack, api = defaultApi }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    api
      .load(userId)
      .catch(() => ({ ...EMPTY_PROFILE }))
      .then((p) => {
        if (!live) return;
        setProfile(p);
        setSaved(p);
      });
    return () => {
      live = false;
    };
  }, [api, userId]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  // From the latest state, so quick taps in a row all count.
  const set = (patch: Partial<Profile> | ((p: Profile) => Partial<Profile>)) => {
    setMessage(null);
    setProfile((prev) => (prev ? { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) } : prev));
  };
  const dirty = JSON.stringify(profile) !== JSON.stringify(saved);
  const done = profileCompletion(profile);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const stored = await api.save(userId, profile);
      setProfile(stored);
      setSaved(stored);
      setMessage({ ok: true, text: 'Đã lưu hồ sơ. Các bài AI tạo từ giờ sẽ dựa vào thông tin này.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      <header className={`group ${panel} flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
        <IconTile icon={UserRound} tone="periwinkle" size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-heading font-bold text-slate-900 dark:text-white">Hồ sơ học tập</h1>
          <p className={hint}>Cho AI biết bạn là ai để bài học, ví dụ và chủ đề sát với bạn hơn. Mọi mục đều không bắt buộc.</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-tone-periwinkle-soft" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100} aria-label="Mức hoàn thiện hồ sơ">
              <span className="block h-full rounded-full bg-tone-periwinkle-accent transition-[width] duration-500" style={{ width: `${done}%` }} />
            </span>
            <span className="text-caption font-semibold tabular-nums text-tone-periwinkle-fg">{done}%</span>
          </div>
        </div>
      </header>

      <Section title="Về bạn">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={label}>Tên gọi</span>
            <input value={profile.nickname} maxLength={NAME_MAX} onChange={(e) => set({ nickname: e.target.value })} placeholder="Ví dụ: Quân" className={`${field} mt-1.5`} />
          </label>
          <label>
            <span className={label}>Nghề nghiệp hoặc ngành học</span>
            <input value={profile.occupation} maxLength={OCCUPATION_MAX} onChange={(e) => set({ occupation: e.target.value })} placeholder="Ví dụ: kỹ sư phần mềm" className={`${field} mt-1.5`} />
          </label>
        </div>
      </Section>

      <Section title="Mục tiêu và trình độ">
        <div>
          <p className={label}>Bạn học tiếng Anh để</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PROFILE_GOALS.map((g) => (
              <Chip key={g} tone="sky" on={profile.goal === g} onClick={() => set((p) => ({ goal: p.goal === g ? null : g }))}>
                {GOAL_LABELS[g]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className={label}>Trình độ hiện tại (tự đánh giá)</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PROFILE_LEVELS.map((l) => (
              <Chip key={l} tone="mint" on={profile.level === l} onClick={() => set((p) => ({ level: p.level === l ? null : l }))}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className={label}>Thời gian học mỗi ngày</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PROFILE_MINUTES.map((m) => (
              <Chip key={m} tone="aqua" on={profile.minutesPerDay === m} onClick={() => set((p) => ({ minutesPerDay: p.minutesPerDay === m ? null : m }))}>
                {m} phút
              </Chip>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Sở thích" hintText="AI dùng để chọn chủ đề câu chuyện, ví dụ và đề luyện.">
        <div className="flex flex-wrap gap-2">
          {PROFILE_INTERESTS.map((i) => (
            <Chip key={i} tone="peach" on={profile.interests.includes(i)} onClick={() => set((p) => ({ interests: toggle(p.interests, i) }))}>
              {INTEREST_LABELS[i]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Muốn cải thiện" hintText="AI sẽ nhấn mạnh các phần này trong bài học và nhận xét.">
        <div className="flex flex-wrap gap-2">
          {PROFILE_WEAK_AREAS.map((w) => (
            <Chip key={w} tone="blush" on={profile.weakAreas.includes(w)} onClick={() => set((p) => ({ weakAreas: toggle(p.weakAreas, w) }))}>
              {WEAK_AREA_LABELS[w]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Ghi chú cho AI">
        <textarea
          value={profile.note}
          maxLength={NOTE_MAX}
          rows={3}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Ví dụ: Mình làm phần mềm, muốn ví dụ về dự án và họp nhóm."
          className={`${field} min-h-[5rem] py-2`}
        />
        <p className={`text-right ${hint}`}>
          {profile.note.length}/{NOTE_MAX}
        </p>
      </Section>

      <p className={`flex items-start gap-2 ${hint}`}>
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-tone-mint-fg" aria-hidden />
        Chỉ bạn xem được hồ sơ này. Hồ sơ được gửi kèm khi AI soạn bài cho bạn, không dùng vào việc khác.
      </p>

      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={`flex items-start gap-2 rounded-xl p-3 text-sm ${message.ok ? 'bg-tone-mint text-tone-mint-fg' : 'bg-tone-blush text-tone-blush-fg'}`}
        >
          {message.ok ? <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />}
          {message.text}
        </p>
      )}

      {/* Follows the scroll only while there is something to save. */}
      <div className={`flex justify-end ${dirty ? 'sticky bottom-20 md:bottom-4' : ''}`}>
        <button type="button" onClick={save} disabled={busy || !dirty} className={`${primaryBtn} shadow-raised`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}
        </button>
      </div>
    </div>
  );
}
