/**
 * Edits one library test in steps: info, audio source, timestamps (YouTube),
 * transcript, questions, then check and publish. Nothing is stored until
 * "Lưu nháp" or "Xuất bản"; leaving with changes asks first.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  Youtube,
} from 'lucide-react';
import { PART_DESCRIPTIONS_VI } from '../../../data/ielts/listening';
import type { ListeningSection, ListeningSpeaker } from '../../../data/ielts/listening/types';
import { aiErrorMessage } from '../../../services/aiClient';
import { LISTENING_STYLES, LISTENING_VOICES, type ListeningStyle, type ListeningVoice } from '../../../services/listeningAudioService';
import {
  addSegment,
  isRecorded,
  libraryProblems,
  parseTranscript,
  questionsMissingNotes,
  removeSegment,
  renameSpeaker,
  setPracticePart,
  setSegmentLines,
  setYouTube,
  STATUS_LABELS_VI,
  STYLE_LABELS_VI,
  transcriptText,
  type LibraryItem,
  type NotesOutcome,
  type Part,
} from '../../../services/listeningLibraryLogic';
import { suggestNotes as defaultSuggest } from '../../../services/listeningLibraryService';
import { formatTimestamp, parseYouTubeId, youtubeThumbnail, youtubeWatchUrl } from '../../../services/youtubeLogic';
import { LISTENING_TEXT_MAX } from '../../../supabase/functions/ai-proxy/ops/listening.ts';
import { Segmented } from '../../ui/Segmented';
import { Tabs } from '../../ui/Tabs';
import type { CreatePlayer } from '../listening/youtubeMedia';
import QuestionEditor from './QuestionEditor';
import TimestampMarker from './TimestampMarker';
import { dangerBtn, ghostBtn, hint, iconBtn, input, label, panel, primaryBtn, secondaryBtn, select, subPanel, tag, textarea } from './styles';

type Step = 'info' | 'audio' | 'timing' | 'script' | 'questions' | 'check';

const STEPS: { id: Step; label: string }[] = [
  { id: 'info', label: 'Thông tin' },
  { id: 'audio', label: 'Audio' },
  { id: 'timing', label: 'Mốc thời gian' },
  { id: 'script', label: 'Lời thoại' },
  { id: 'questions', label: 'Câu hỏi' },
  { id: 'check', label: 'Kiểm tra' },
];

interface Props {
  item: LibraryItem;
  /** What is stored now: null for a test never saved. Defaults to `item`. */
  saved?: LibraryItem | null;
  /** Stores the test; resolves with what was stored. */
  onSave: (item: LibraryItem) => Promise<LibraryItem>;
  onClose: () => void;
  /** Opens the draft on the practice screen without saving an attempt; `saved` lets the editor come back as it was. */
  onPreview: (draft: LibraryItem, saved: LibraryItem | null) => void;
  suggest?: (section: ListeningSection) => Promise<NotesOutcome>;
  createPlayer?: CreatePlayer;
}

const VOICE_LABELS: Record<ListeningVoice, string> = {
  Kore: 'Kore (nữ)',
  Aoede: 'Aoede (nữ)',
  Leda: 'Leda (nữ)',
  Puck: 'Puck (nam)',
  Charon: 'Charon (nam)',
  Orus: 'Orus (nam)',
};

function Field({ title, children, help }: { title: string; children: React.ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      {children}
      {help && <span className={`mt-1 block ${hint}`}>{help}</span>}
    </label>
  );
}

/** One segment's transcript, read on blur so typing stays smooth. */
function SegmentScript({
  section,
  index,
  onChange,
}: {
  section: ListeningSection;
  index: number;
  onChange: (s: ListeningSection) => void;
}) {
  const seg = section.segments[index];
  const value = transcriptText(seg.lines);
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);
  const parsed = useMemo(() => parseTranscript(text, section.speakers), [text, section.speakers]);
  const chars = parsed.lines.reduce((n, l) => n + l.text.length, 0);
  const speakers = new Set(parsed.lines.map((l) => l.speaker)).size;
  const recorded = isRecorded(section);
  const time = typeof seg.start === 'number' ? `${formatTimestamp(seg.start)}${typeof seg.end === 'number' ? `–${formatTimestamp(seg.end)}` : ''}` : '';

  return (
    <li className={`${subPanel} p-3`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Đoạn {index + 1}</span>
        {time && <span className={tag}>{time}</span>}
        <span className={`ml-auto text-caption tabular-nums ${!recorded && chars > LISTENING_TEXT_MAX ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
          {recorded ? `${chars} ký tự` : `${chars}/${LISTENING_TEXT_MAX}`}
        </span>
        <button type="button" onClick={() => onChange(removeSegment(section, seg.id))} className={iconBtn} aria-label={`Xoá đoạn ${index + 1}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (text !== value) onChange(setSegmentLines(section, seg.id, parsed.lines));
        }}
        rows={Math.max(4, Math.min(14, text.split('\n').length + 1))}
        aria-label={`Lời thoại đoạn ${index + 1}`}
        placeholder={`${section.speakers[0]?.name ?? 'Anna'}: Good morning, how can I help you?\n${section.speakers[1]?.name ?? section.speakers[0]?.name ?? 'Tom'}: Hi, I'd like to book a room.`}
        spellCheck={false}
        className={textarea}
      />
      {parsed.unknown.length > 0 && (
        <p className="mt-1 text-caption text-amber-700 dark:text-amber-400">
          Chưa khai báo người nói: {parsed.unknown.join(', ')}. Thêm ở bước Thông tin hoặc sửa tên.
        </p>
      )}
      {!recorded && speakers > 2 && <p className="mt-1 text-caption text-red-600 dark:text-red-400">Giọng AI chỉ đọc được 2 người trong một đoạn: hãy tách đoạn.</p>}
    </li>
  );
}

function SpeakerRow({
  speaker,
  section,
  onChange,
}: {
  speaker: ListeningSpeaker;
  section: ListeningSection;
  onChange: (s: ListeningSection) => void;
}) {
  const [name, setName] = useState(speaker.name);
  useEffect(() => setName(speaker.name), [speaker.name]);
  const patch = (p: Partial<ListeningSpeaker>) => onChange({ ...section, speakers: section.speakers.map((x) => (x.name === speaker.name ? { ...x, ...p } : x)) });
  return (
    <li className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      <Field title="Tên (một từ)">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
          onBlur={() => name && name !== speaker.name && onChange(renameSpeaker(section, speaker.name, name))}
          className={input}
          spellCheck={false}
        />
      </Field>
      <Field title="Giọng AI">
        <select value={speaker.voice} onChange={(e) => patch({ voice: e.target.value as ListeningVoice })} className={select}>
          {LISTENING_VOICES.map((v) => (
            <option key={v} value={v}>
              {VOICE_LABELS[v]}
            </option>
          ))}
        </select>
      </Field>
      <Field title="Vai (tiếng Việt)">
        <input value={speaker.roleVi ?? ''} onChange={(e) => patch({ roleVi: e.target.value })} className={input} placeholder="Nhân viên lễ tân" />
      </Field>
      <button
        type="button"
        onClick={() => onChange({ ...section, speakers: section.speakers.filter((x) => x.name !== speaker.name) })}
        disabled={section.speakers.length <= 1}
        className={`${iconBtn} justify-self-end`}
        aria-label={`Xoá người nói ${speaker.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function YouTubeSource({ section, onChange }: { section: ListeningSection; onChange: (s: ListeningSection) => void }) {
  const [link, setLink] = useState(section.youtube?.videoId ?? '');
  const id = parseYouTubeId(link);
  const current = section.youtube?.videoId;
  return (
    <div className="space-y-3">
      <Field title="Link video YouTube" help="Video phải bật &quot;Cho phép nhúng&quot;. Video ở chế độ không công khai (unlisted) vẫn dùng được.">
        <div className="mt-1.5 flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`${input} !mt-0`}
            aria-invalid={!!link && !id}
            spellCheck={false}
          />
          <button type="button" onClick={() => id && onChange(setYouTube(section, id))} disabled={!id || id === current} className={`${primaryBtn} flex-shrink-0`}>
            Dùng video
          </button>
        </div>
      </Field>
      {link && !id && <p className="text-caption text-red-600 dark:text-red-400">Không nhận ra link YouTube này.</p>}
      {current && (
        <div className="flex items-center gap-3">
          <img src={youtubeThumbnail(current)} alt="" className="h-16 w-28 flex-shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{current}</p>
            <a href={youtubeWatchUrl(current)} target="_blank" rel="noreferrer" className="text-caption font-medium text-slate-600 underline dark:text-slate-300">
              Mở trên YouTube
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListeningEditor({ item, saved: savedProp, onSave, onClose, onPreview, suggest = defaultSuggest, createPlayer }: Props) {
  const [draft, setDraft] = useState(item);
  const [saved, setSaved] = useState<LibraryItem | null>(savedProp === undefined ? item : savedProp);
  const [step, setStep] = useState<Step>('info');
  const [partIndex, setPartIndex] = useState(0);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'unpublish' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesInfo, setNotesInfo] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirty = !saved || JSON.stringify(draft) !== JSON.stringify(saved);
  const section = draft.sections[Math.min(partIndex, draft.sections.length - 1)];
  const problems = useMemo(() => libraryProblems(draft), [draft]);
  const recorded = isRecorded(section);
  const steps = STEPS.filter((s) => s.id !== 'timing' || recorded);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (step === 'timing' && !recorded) setStep('audio');
  }, [step, recorded]);

  const setSection = (s: ListeningSection) => {
    setMessage(null);
    setDraft((d) => ({ ...d, sections: d.sections.map((x, i) => (i === partIndex ? s : x)) }));
  };

  const save = async (status: LibraryItem['status'], kind: 'draft' | 'publish' | 'unpublish') => {
    const sent = draft;
    setSaving(kind);
    setMessage(null);
    try {
      const stored = await onSave({ ...sent, status });
      // Edits typed while saving stay, and show as unsaved.
      setDraft((d) => (d === sent ? stored : { ...d, status: stored.status, updatedAt: stored.updatedAt }));
      setSaved(stored);
      setMessage({
        kind: 'ok',
        text: kind === 'publish' ? 'Đã xuất bản. Học viên thấy đề trong mục "Đề luyện thêm".' : kind === 'unpublish' ? 'Đã chuyển về bản nháp.' : 'Đã lưu nháp.',
      });
    } catch (err) {
      setMessage({ kind: 'error', text: `Không lưu được: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSaving(null);
    }
  };

  const fillNotes = async () => {
    setNotesBusy(true);
    setNotesInfo('');
    try {
      const before = section;
      const index = draft.sections.indexOf(before);
      const out = await suggest(before);
      // The notes were made for the part as it was; never undo edits made meanwhile.
      if (draftRef.current.sections[index] !== before) {
        setNotesInfo('Bạn đã sửa part này trong lúc chờ AI nên ghi chú chưa được điền. Bấm lại để thử lần nữa.');
        return;
      }
      setMessage(null);
      setDraft((d) => ({ ...d, sections: d.sections.map((x, i) => (i === index ? out.section : x)) }));
      const parts = [out.filled.length ? `Đã điền ghi chú cho ${out.filled.length} câu.` : 'Không có ghi chú mới.'];
      if (out.rejected.length) parts.push(`Câu ${out.rejected.join(', ')}: AI trích câu không có trong lời thoại, bạn tự điền nhé.`);
      parts.push('Hãy đọc lại trước khi xuất bản.');
      setNotesInfo(parts.join(' '));
    } catch (err) {
      setNotesInfo(aiErrorMessage(err));
    } finally {
      setNotesBusy(false);
    }
  };

  const leave = () => (dirty ? setConfirmLeave(true) : onClose());
  const stepIndex = steps.findIndex((s) => s.id === step);
  const missingNotes = questionsMissingNotes(section);
  const sectionProblems = problems.filter((p) => p.sectionId === section.id).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={leave} className={ghostBtn}>
          <ArrowLeft className="h-4 w-4" /> Danh sách
        </button>
        <span className={tag}>{STATUS_LABELS_VI[draft.status]}</span>
        {dirty && <span className="text-caption text-amber-700 dark:text-amber-400">Chưa lưu</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => onPreview(draft, saved)} className={secondaryBtn}>
            <Eye className="h-4 w-4" /> <span className="hidden sm:inline">Xem thử</span>
          </button>
          <button
            type="button"
            onClick={() => {
              // A published test is live: never push a broken version to learners.
              if (draft.status === 'published' && problems.length > 0) {
                setStep('check');
                setMessage({ kind: 'error', text: 'Đề đang xuất bản: sửa hết các chỗ dưới đây trước khi lưu, hoặc gỡ xuống bản nháp.' });
                return;
              }
              void save(draft.status, 'draft');
            }}
            disabled={!!saving || !dirty}
            className={primaryBtn}
          >
            {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft.status === 'published' ? 'Lưu' : 'Lưu nháp'}
          </button>
        </div>
      </div>

      {confirmLeave && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">Bạn có thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmLeave(false)} className={secondaryBtn}>
              Ở lại
            </button>
            <button type="button" onClick={onClose} className={dangerBtn}>
              Bỏ thay đổi
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
            message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {message.kind === 'ok' ? <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />}
          {message.text}
        </p>
      )}

      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 200) })}
        placeholder="Tên đề, ví dụ: Đề luyện 01 – Booking and travel"
        aria-label="Tên đề"
        className="block w-full rounded-xl border border-transparent bg-transparent px-1 text-heading font-bold text-slate-900 placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600 dark:hover:border-slate-700"
      />

      {draft.kind === 'full' && (
        <Tabs<string>
          label="Part"
          value={String(partIndex)}
          onChange={(v) => setPartIndex(Number(v))}
          items={draft.sections.map((s, i) => ({
            id: String(i),
            label: `Part ${s.part}`,
            count: problems.filter((p) => p.sectionId === s.id).length || undefined,
          }))}
        />
      )}

      <nav aria-label="Các bước" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={step === s.id ? 'step' : undefined}
                className={`inline-flex min-h-touch items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${
                  step === s.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="tabular-nums opacity-60">{i + 1}</span> {s.label}
                {s.id === 'check' && problems.length > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-caption text-white">{problems.length}</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className={`${panel} p-4 sm:p-5`} aria-label={steps[stepIndex]?.label}>
        {step === 'info' && (
          <div className="space-y-4">
            <Field title="Mô tả cho học viên (tuỳ chọn)">
              <textarea
                value={draft.descriptionVi}
                onChange={(e) => setDraft({ ...draft, descriptionVi: e.target.value })}
                rows={2}
                className={textarea}
                placeholder="Đề luyện chủ đề du lịch, giọng Anh – Anh."
              />
            </Field>
            {draft.kind === 'practice' && (
              <Field title="Part">
                <Segmented<Part>
                  label="Part"
                  value={section.part}
                  onChange={(p) => setDraft(setPracticePart(draft, p))}
                  options={([1, 2, 3, 4] as Part[]).map((p) => ({ value: p, label: `Part ${p}` }))}
                  className="mt-1.5"
                />
              </Field>
            )}
            <p className={hint}>
              Part {section.part}: {PART_DESCRIPTIONS_VI[section.part]}. Câu {(section.part - 1) * 10 + 1}–{section.part * 10}.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field title="Tiêu đề part (tiếng Anh)">
                <input value={section.title} onChange={(e) => setSection({ ...section, title: e.target.value })} className={input} placeholder="Booking a city tour" />
              </Field>
              <Field title="Giọng / phong cách">
                <select value={section.style} onChange={(e) => setSection({ ...section, style: e.target.value as ListeningStyle })} className={select}>
                  {(Object.keys(LISTENING_STYLES) as ListeningStyle[]).map((s) => (
                    <option key={s} value={s}>
                      {STYLE_LABELS_VI[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field title="Bối cảnh (tiếng Việt)" help="Một câu: ai nói, nói về việc gì.">
                <input
                  value={section.contextVi}
                  onChange={(e) => setSection({ ...section, contextVi: e.target.value })}
                  className={input}
                  placeholder="Một du khách gọi điện đặt tour tham quan thành phố."
                />
              </Field>
              <Field title="Thời gian đọc câu hỏi (giây, chế độ thi)">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={section.prepSeconds}
                  onChange={(e) => setSection({ ...section, prepSeconds: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })}
                  className={input}
                />
              </Field>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Người nói</h3>
              <ul className="mt-2 space-y-3">
                {section.speakers.map((sp) => (
                  <SpeakerRow key={sp.name} speaker={sp} section={section} onChange={setSection} />
                ))}
              </ul>
              {section.speakers.length < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    const taken = section.speakers.map((s) => s.name);
                    const name = ['Sam', 'Kate', 'Ben', 'Lucy'].find((n) => !taken.includes(n)) ?? `Speaker${taken.length + 1}`;
                    setSection({ ...section, speakers: [...section.speakers, { name, voice: 'Puck', roleVi: '' }] });
                  }}
                  className={`${ghostBtn} mt-2`}
                >
                  <Plus className="h-4 w-4" /> Thêm người nói
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'audio' && (
          <div className="space-y-4">
            <Segmented<'youtube' | 'tts'>
              label="Nguồn audio"
              value={recorded ? 'youtube' : 'tts'}
              onChange={(v) => {
                if (v === 'tts') setSection(setYouTube(section, null));
                else if (section.youtube) setSection(section);
                else setSection({ ...section, youtube: { videoId: '' } });
              }}
              options={[
                { value: 'youtube', label: <span className="inline-flex items-center gap-1.5"><Youtube className="h-4 w-4" /> Video YouTube</span> },
                { value: 'tts', label: <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Giọng AI đọc</span> },
              ]}
            />
            {recorded ? (
              <>
                <YouTubeSource section={section} onChange={setSection} />
                <p className={hint}>Tiếp theo: bước Mốc thời gian để chia video thành các đoạn.</p>
              </>
            ) : (
              <div className={`${subPanel} p-4 text-sm text-slate-700 dark:text-slate-200`}>
                <p>Mỗi đoạn lời thoại được giọng AI đọc thành một file audio, lưu lại cho mọi học viên.</p>
                <ul className={`mt-2 list-disc space-y-1 pl-5 ${hint}`}>
                  <li>Mỗi đoạn tối đa {LISTENING_TEXT_MAX} ký tự (khoảng 30 giây) và tối đa 2 người nói.</li>
                  <li>Giọng được chọn theo từng người nói ở bước Thông tin.</li>
                  <li>Lần nghe đầu tiên của mỗi đoạn mất vài giây để tạo audio.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'timing' && recorded && (
          section.youtube?.videoId ? (
            <TimestampMarker section={section} onChange={setSection} create={createPlayer} />
          ) : (
            <p className={hint}>Hãy dán link YouTube ở bước Audio trước.</p>
          )
        )}

        {step === 'script' && (
          <div className="space-y-3">
            <p className={hint}>
              Mỗi dòng viết <code>Tên: lời nói</code>, tên là một trong: {section.speakers.map((s) => s.name).join(', ')}. Dòng không có tên được nối vào dòng trước.
              {recorded ? ' Lời thoại phải khớp với video, để chấm bài và hiện câu chứa đáp án.' : ''}
            </p>
            {section.segments.length === 0 ? (
              <p className={hint}>{recorded ? 'Chưa có đoạn nào: đánh mốc ở bước Mốc thời gian, hoặc thêm đoạn.' : 'Chưa có đoạn nào.'}</p>
            ) : (
              <ol className="space-y-3">
                {section.segments.map((seg, i) => (
                  <SegmentScript key={seg.id} section={section} index={i} onChange={setSection} />
                ))}
              </ol>
            )}
            <button type="button" onClick={() => setSection(addSegment(section))} className={ghostBtn}>
              <Plus className="h-4 w-4" /> Thêm đoạn
            </button>
          </div>
        )}

        {step === 'questions' && (
          <div className="space-y-4">
            <div className={`${subPanel} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">AI điền ghi chú</p>
                <p className={hint}>
                  Điền câu chứa đáp án, câu bẫy, paraphrase và giải thích cho các ô còn trống. Không sửa đáp án hay ô bạn đã viết.
                  {missingNotes.length ? ` Còn ${missingNotes.length} câu thiếu.` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={fillNotes}
                disabled={notesBusy || !section.groups.length || !section.segments.some((s) => s.lines.length)}
                className={`${secondaryBtn} flex-shrink-0`}
              >
                {notesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {notesBusy ? 'Đang điền…' : 'AI điền ghi chú'}
              </button>
            </div>
            {notesInfo && (
              <p role="status" className="text-sm text-slate-700 dark:text-slate-200">
                {notesInfo}
              </p>
            )}
            <QuestionEditor section={section} onChange={setSection} />
          </div>
        )}

        {step === 'check' && (
          <div className="space-y-4">
            {problems.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CircleCheck className="h-4 w-4 flex-shrink-0" /> Đề đã sẵn sàng. Hãy bấm Xem thử để làm thử một lượt trước khi xuất bản.
              </p>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cần sửa {problems.length} chỗ trước khi xuất bản</h3>
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {problems.map((p, i) => {
                    const target = p.sectionId ? draft.sections.findIndex((s) => s.id === p.sectionId) : -1;
                    return (
                      <li key={i} className="flex items-start gap-2 py-2 text-sm">
                        <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                          <b className="font-semibold text-slate-900 dark:text-white">{p.where}:</b> {p.message}
                        </span>
                        {target >= 0 && target !== partIndex && (
                          <button type="button" onClick={() => setPartIndex(target)} className="flex-shrink-0 text-caption font-semibold text-slate-600 underline dark:text-slate-300">
                            Mở Part {draft.sections[target].part}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => onPreview(draft, saved)} className={secondaryBtn}>
                <Eye className="h-4 w-4" /> Xem thử như học viên
              </button>
              {draft.status === 'published' ? (
                <button type="button" onClick={() => save('draft', 'unpublish')} disabled={!!saving} className={secondaryBtn}>
                  {saving === 'unpublish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Gỡ xuống bản nháp
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => save('published', 'publish')}
                disabled={!!saving || problems.length > 0 || (draft.status === 'published' && !dirty)}
                className={primaryBtn}
              >
                {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {draft.status === 'published' ? 'Cập nhật bản đã xuất bản' : 'Xuất bản'}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setStep(steps[stepIndex - 1].id)} disabled={stepIndex <= 0} className={ghostBtn}>
          Bước trước
        </button>
        {sectionProblems > 0 && step !== 'check' && <span className={hint}>Part này còn {sectionProblems} chỗ cần sửa</span>}
        <button type="button" onClick={() => setStep(steps[stepIndex + 1].id)} disabled={stepIndex >= steps.length - 1} className={secondaryBtn}>
          Bước tiếp
        </button>
      </div>
    </div>
  );
}
