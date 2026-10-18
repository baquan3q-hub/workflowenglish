/**
 * Question groups of one part, every type the practice screen can show.
 * Structured text (options, templates, map shapes) is typed freely and read
 * when the field loses focus, so the caret never jumps while typing.
 */
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { GROUP_TYPE_LABELS } from '../../../data/ielts/listening';
import type { ChoiceOption, CompletionGroup, ListeningGroup, ListeningQuestion, ListeningSection } from '../../../data/ielts/listening/types';
import {
  addGroup,
  addQuestion,
  answersText,
  applyTemplate,
  blankContext,
  mapKeys,
  moveGroup,
  parseAnswers,
  parseShapes,
  removeGroup,
  removeQuestion,
  setMultiAnswers,
  shapesText,
  templateText,
  updateGroup,
  updateQuestion,
  type GroupType,
} from '../../../services/listeningLibraryLogic';
import ListeningMap from '../listening/ListeningMap';
import { Segmented } from '../../ui/Segmented';
import { BlurField, LetterSelect, NumberBadge, OptionsField, WordLimit } from './fields';
import { ghostBtn, hint, iconBtn, input, label, panel, secondaryBtn, select, subPanel, textarea } from './styles';

interface Props {
  section: ListeningSection;
  onChange: (section: ListeningSection) => void;
}

const TYPES = Object.keys(GROUP_TYPE_LABELS) as GroupType[];

/** Fields every question has: where its answer is, the quotes and the explanation. */
function QuestionNotes({ q, section, onPatch }: { q: ListeningQuestion; section: ListeningSection; onPatch: (p: Partial<ListeningQuestion>) => void }) {
  const missing = !q.evidence.trim() || !q.explanationVi.trim();
  return (
    <details className="group mt-2" open={false}>
      <summary className="flex min-h-touch cursor-pointer list-none items-center gap-1.5 text-caption font-semibold text-slate-600 dark:text-slate-300">
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        Đoạn, trích dẫn và giải thích
        {missing && <span className="rounded bg-amber-100 px-1.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">còn thiếu</span>}
      </summary>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Đoạn chứa đáp án</span>
          <select value={q.segmentId} onChange={(e) => onPatch({ segmentId: e.target.value })} className={select}>
            {!section.segments.some((s) => s.id === q.segmentId) && <option value={q.segmentId}>Chưa chọn</option>}
            {section.segments.map((s, i) => (
              <option key={s.id} value={s.id}>
                Đoạn {i + 1}
                {s.lines[0] ? ` · ${s.lines[0].text.slice(0, 40)}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Câu bẫy (trích nguyên văn, nếu có)</span>
          <BlurField value={q.distractor ?? ''} onCommit={(t) => onPatch({ distractor: t.trim() || undefined })} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Câu chứa đáp án (trích nguyên văn từ lời thoại)</span>
          <BlurField multiline rows={2} value={q.evidence} onCommit={(t) => onPatch({ evidence: t.trim() })} />
        </label>
        <label className="block">
          <span className={label}>Diễn đạt trong đề</span>
          <BlurField
            value={q.paraphrase?.question ?? ''}
            placeholder="cheap"
            onCommit={(t) => onPatch({ paraphrase: t.trim() || q.paraphrase?.audio ? { question: t.trim(), audio: q.paraphrase?.audio ?? '' } : undefined })}
          />
        </label>
        <label className="block">
          <span className={label}>Diễn đạt trong audio</span>
          <BlurField
            value={q.paraphrase?.audio ?? ''}
            placeholder="doesn't cost much"
            onCommit={(t) => onPatch({ paraphrase: t.trim() || q.paraphrase?.question ? { question: q.paraphrase?.question ?? '', audio: t.trim() } : undefined })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Giải thích (tiếng Việt)</span>
          <BlurField multiline rows={2} value={q.explanationVi} onCommit={(t) => onPatch({ explanationVi: t.trim() })} />
        </label>
      </div>
    </details>
  );
}

function CompletionEditor({ group, onChange, section }: { group: CompletionGroup; onChange: (g: ListeningGroup) => void; section: ListeningSection }) {
  const tpl = templateText(group);
  const [mode, setMode] = useState(tpl.mode);
  const fallbackSeg = section.segments.at(-1)?.id ?? '';
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>Tiêu đề phiếu / bảng</span>
        <BlurField value={group.title ?? ''} onCommit={(t) => onChange({ ...group, title: t })} placeholder="Hotel booking form" />
      </label>
      <WordLimit group={group} onChange={onChange} />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={label}>Nội dung, mỗi ô trống viết ___</span>
          <Segmented<'lines' | 'table'>
            label="Kiểu trình bày"
            value={mode}
            onChange={(m) => {
              setMode(m);
              onChange(applyTemplate(group, m, tpl.text, fallbackSeg));
            }}
            options={[
              { value: 'lines', label: 'Dòng' },
              { value: 'table', label: 'Bảng' },
            ]}
          />
        </div>
        <BlurField
          multiline
          rows={Math.max(4, tpl.text.split('\n').length + 1)}
          value={tpl.text}
          onCommit={(t) => onChange(applyTemplate(group, mode, t, fallbackSeg))}
          className={`${textarea} font-mono`}
          placeholder={mode === 'table' ? 'Day | Activity | Cost\nMonday | ___ | £5' : 'Name: Sarah ___\nPhone: ___'}
          aria-label="Nội dung có ô trống"
        />
        <p className={`mt-1 ${hint}`}>
          {mode === 'table' ? 'Dòng đầu là tiêu đề cột, các ô cách nhau bằng dấu |. ' : ''}Mỗi ___ là một câu hỏi, đánh số theo thứ tự ({group.questions.length} câu).
        </p>
      </div>
    </div>
  );
}

function GroupEditor({ group, section, index, onSection }: { group: ListeningGroup; section: ListeningSection; index: number; onSection: (s: ListeningSection) => void }) {
  const set = (g: ListeningGroup) => onSection(updateGroup(section, g));
  const patchQ = (n: number, p: Partial<ListeningQuestion>) => set(updateQuestion(group, n, p));
  const qs = group.questions;
  const lastSeg = section.segments.at(-1)?.id ?? '';
  const range = qs.length > 1 ? `Câu ${qs[0].number}–${qs.at(-1)!.number}` : `Câu ${qs[0]?.number ?? ''}`;
  const groupKeys = 'options' in group ? group.options.map((o) => o.key) : group.type === 'map' ? mapKeys(group.map.shapes) : [];

  const answerRow = (q: ListeningQuestion) => {
    if (group.type === 'completion' || group.type === 'short_answer') {
      return (
        <label className="block min-w-0 flex-1">
          <span className={label}>Đáp án chấp nhận (cách nhau bằng " / ")</span>
          <BlurField value={answersText(q.answers)} onCommit={(t) => patchQ(q.number, { answers: parseAnswers(t) })} placeholder="15 / fifteen" />
        </label>
      );
    }
    const keys = group.type === 'mcq' ? (q.options ?? []).map((o) => o.key) : groupKeys;
    return (
      <div className="flex items-center gap-2">
        <span className={label}>Đáp án</span>
        <LetterSelect options={keys} value={q.answers[0] ?? ''} onChange={(v) => patchQ(q.number, { answers: v ? [v] : [] })} labelText={`Đáp án câu ${q.number}`} />
      </div>
    );
  };

  return (
    <li className={`${panel} p-4`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
            Nhóm {index + 1} · {range}
          </p>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{GROUP_TYPE_LABELS[group.type]}</h3>
        </div>
        <button type="button" onClick={() => onSection(moveGroup(section, group.id, -1))} disabled={index === 0} className={iconBtn} aria-label="Đưa nhóm lên">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onSection(moveGroup(section, group.id, 1))} disabled={index === section.groups.length - 1} className={iconBtn} aria-label="Đưa nhóm xuống">
          <ArrowDown className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onSection(removeGroup(section, group.id))} className={iconBtn} aria-label={`Xoá nhóm ${index + 1}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className={label}>Hướng dẫn (tiếng Anh, như trong đề)</span>
          <BlurField multiline rows={2} value={group.instruction} onCommit={(t) => set({ ...group, instruction: t.trim() })} />
        </label>

        {group.type === 'completion' && <CompletionEditor group={group} onChange={set} section={section} />}
        {group.type === 'short_answer' && <WordLimit group={group} onChange={set} />}
        {group.type === 'mcq_multi' && (
          <>
            <label className="block">
              <span className={label}>Câu hỏi chung</span>
              <BlurField value={group.prompt} onCommit={(t) => set({ ...group, prompt: t.trim() })} placeholder="Which TWO facilities does the speaker recommend?" />
            </label>
            <OptionsField title="Các lựa chọn" options={group.options} onChange={(options) => set({ ...group, options })} />
            <fieldset>
              <legend className={label}>Chọn {qs.length} đáp án đúng</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {group.options.map((o) => {
                  const on = qs[0]?.answers.includes(o.key) ?? false;
                  return (
                    <label key={o.key} className={`flex min-h-touch items-center gap-2 rounded-xl border px-3 text-sm ${on ? 'border-slate-900 dark:border-white' : 'border-slate-200 dark:border-slate-700'}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const cur = qs[0]?.answers ?? [];
                          set(setMultiAnswers(group, e.target.checked ? [...cur, o.key] : cur.filter((k) => k !== o.key)));
                        }}
                        className="h-4 w-4"
                      />
                      {o.key}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}
        {group.type === 'matching' && (
          <>
            <label className="block">
              <span className={label}>Tiêu đề hộp lựa chọn</span>
              <BlurField value={group.optionsTitle ?? ''} onCommit={(t) => set({ ...group, optionsTitle: t })} placeholder="Opinions" />
            </label>
            <OptionsField title="Các lựa chọn trong hộp" options={group.options} onChange={(options) => set({ ...group, options })} />
          </>
        )}
        {group.type === 'map' && (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <span className={label}>Tên bản đồ</span>
                <BlurField value={group.map.title} onCommit={(t) => set({ ...group, map: { ...group.map, title: t } })} placeholder="Riverside Park" />
              </label>
              <label className="block">
                <span className={label}>Các hình (loại x y rộng cao, rồi tên hoặc [chữ cái])</span>
                <MapShapesField group={group} onChange={set} />
              </label>
            </div>
            {group.map.shapes.length > 0 && <ListeningMap map={group.map} />}
          </div>
        )}

        <ol className="space-y-3">
          {qs.map((q, qi) => (
            <li key={q.number} className={`${subPanel} p-3`}>
              <div className="flex items-start gap-2">
                <NumberBadge n={q.number} />
                <div className="min-w-0 flex-1 space-y-2">
                  {group.type === 'completion' && (
                    <p className="font-mono text-caption text-slate-600 dark:text-slate-300">{blankContext(group, q.number) || '—'}</p>
                  )}
                  {(group.type === 'short_answer' || group.type === 'mcq' || group.type === 'matching' || group.type === 'map') && (
                    <BlurField
                      value={q.prompt ?? ''}
                      onCommit={(t) => patchQ(q.number, { prompt: t.trim() })}
                      placeholder={group.type === 'map' ? 'Café' : 'Question'}
                      aria-label={`Nội dung câu ${q.number}`}
                      className={`${input} !mt-0`}
                    />
                  )}
                  {group.type === 'mcq' && (
                    <OptionsField title="Lựa chọn" options={q.options ?? []} onChange={(options) => patchQ(q.number, { options })} />
                  )}
                  {group.type === 'mcq_multi' ? (
                    <p className={hint}>Chữ cái thứ {qi + 1} cần chọn; đáp án dùng chung ở trên.</p>
                  ) : (
                    <div className="flex flex-wrap items-end gap-3">{answerRow(q)}</div>
                  )}
                  <QuestionNotes q={q} section={section} onPatch={(p) => patchQ(q.number, p)} />
                </div>
                {group.type !== 'completion' && qs.length > 1 && (
                  <button type="button" onClick={() => set(removeQuestion(group, q.number))} className={iconBtn} aria-label={`Xoá câu ${q.number}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {group.type !== 'completion' && (
          <button type="button" onClick={() => set(addQuestion(group, lastSeg))} className={ghostBtn}>
            <Plus className="h-4 w-4" /> {group.type === 'mcq_multi' ? 'Thêm một chữ cái cần chọn' : 'Thêm câu'}
          </button>
        )}
      </div>
    </li>
  );
}

function MapShapesField({ group, onChange }: { group: Extract<ListeningGroup, { type: 'map' }>; onChange: (g: ListeningGroup) => void }) {
  const [bad, setBad] = useState<number[]>([]);
  return (
    <>
      <BlurField
        multiline
        rows={Math.max(5, group.map.shapes.length + 1)}
        value={shapesText(group.map.shapes)}
        onCommit={(t) => {
          const parsed = parseShapes(t);
          setBad(parsed.bad);
          onChange({ ...group, map: { ...group.map, shapes: parsed.shapes } });
        }}
        className={`${textarea} font-mono`}
        placeholder={'path 0 140 400 20\nbuilding 20 20 120 80 Café\nbuilding 260 20 120 80 [A]\ngreen 20 190 160 90 Garden'}
      />
      <span className={hint}>
        Loại: building, path, green, water, entrance. Khung {group.map.width}×{group.map.height}.
      </span>
      {bad.length > 0 && <span className="block text-caption text-red-600 dark:text-red-400">Không đọc được dòng {bad.join(', ')}.</span>}
    </>
  );
}

export default function QuestionEditor({ section, onChange }: Props) {
  const [type, setType] = useState<GroupType>(section.part === 1 ? 'completion' : section.part === 3 ? 'mcq' : 'completion');
  const count = section.groups.reduce((n, g) => n + g.questions.length, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className={`text-sm ${count === 10 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
          {count}/10 câu{count !== 10 ? ' — mỗi part cần đúng 10 câu' : ''}
        </p>
        <div className="flex gap-2">
          <select value={type} onChange={(e) => setType(e.target.value as GroupType)} aria-label="Dạng câu hỏi" className={`${select} !mt-0 sm:w-56`}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {GROUP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onChange(addGroup(section, type))} className={`${secondaryBtn} flex-shrink-0`}>
            <Plus className="h-4 w-4" /> Thêm nhóm
          </button>
        </div>
      </div>
      {section.segments.length === 0 && <p className={hint}>Mẹo: tạo các đoạn và lời thoại trước, để chọn đoạn chứa đáp án cho từng câu.</p>}
      {section.groups.length > 0 && (
        <ol className="space-y-4">
          {section.groups.map((g, i) => (
            <GroupEditor key={g.id} group={g} section={section} index={i} onSection={onChange} />
          ))}
        </ol>
      )}
    </div>
  );
}
