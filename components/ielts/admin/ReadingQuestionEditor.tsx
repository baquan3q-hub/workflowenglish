/**
 * Question groups of one Reading passage, every type the practice screen can
 * show. Evidence can be typed, or picked by selecting words in the passage
 * shown beside the editor (`pick`).
 */
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Highlighter, Plus, Trash2 } from 'lucide-react';
import type { ReadingGroup, ReadingPassage, ReadingQuestion, ReadingSkill } from '../../../data/ielts/reading/types';
import {
  addReadingGroup,
  addReadingQuestion,
  answersText,
  applyCompletionText,
  applyShapesText,
  blankDriven,
  completionText,
  evidenceFrom,
  headingsText,
  moveReadingGroup,
  parseAnswers,
  parseHeadings,
  READING_EDITOR_KINDS,
  readingBlankContext,
  removeReadingGroup,
  removeReadingQuestion,
  setReadingMultiAnswers,
  shapesText,
  SKILL_LABELS_VI,
  updateReadingGroup,
  updateReadingQuestion,
  type ReadingEditorKind,
} from '../../../services/readingLibraryLogic';
import { PASSAGE_QUESTIONS, passageQuestions } from '../../../services/readingLogic';
import { GROUP_KINDS } from '../questions/parts';
import { readingGroupKind } from '../questions/questionLogic';
import ReadingDiagram from '../questions/ReadingDiagram';
import { Segmented } from '../../ui/Segmented';
import IconTile from '../../ui/IconTile';
import { BlurField, LetterSelect, NumberBadge, OptionsField, WordLimit } from './fields';
import { ghostBtn, hint, iconBtn, input, label, panel, secondaryBtn, select, subPanel, textarea } from './styles';

/** Words the admin selected in one paragraph of the passage. */
export interface PassagePick {
  label: string;
  text: string;
}

interface Props {
  passage: ReadingPassage;
  onChange: (passage: ReadingPassage) => void;
  pick: PassagePick | null;
}

const SKILLS = Object.keys(SKILL_LABELS_VI) as ReadingSkill[];
const pickBtn = secondaryBtn.replace('px-4', 'px-3');

/** Where the answer is, the quotes and the explanation of one question. */
function QuestionNotes({
  q,
  group,
  passage,
  pick,
  onPatch,
}: {
  q: ReadingQuestion;
  group: ReadingGroup;
  passage: ReadingPassage;
  pick: PassagePick | null;
  onPatch: (p: Partial<ReadingQuestion>) => void;
}) {
  const missing = !q.evidence.trim() || !q.explanationVi.trim();
  const picked = pick ? evidenceFrom(passage, pick.label, pick.text) : null;
  const toParagraph = group.type === 'matching' && group.target === 'paragraph';
  // Headings ask the paragraph in the question row; its evidence must sit there.
  const lockedParagraph = group.type === 'headings';
  const usePick = () => {
    if (!picked) return;
    onPatch(toParagraph ? { ...picked, answers: [picked.paragraph] } : picked);
  };
  const setParagraph = (paragraph: string) => onPatch(toParagraph ? { paragraph, answers: [paragraph] } : { paragraph });
  const blocked = !picked || (lockedParagraph && picked.paragraph !== q.paragraph);

  return (
    <details className="group mt-2">
      <summary className="flex min-h-touch cursor-pointer list-none items-center gap-1.5 text-caption font-semibold text-slate-600 dark:text-slate-300">
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        Đoạn, evidence và giải thích
        {missing && <span className="rounded bg-tone-butter px-1.5 text-tone-butter-fg">còn thiếu</span>}
      </summary>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {!lockedParagraph && (
          <label className="block">
            <span className={label}>Đoạn chứa đáp án</span>
            <select value={q.paragraph} onChange={(e) => setParagraph(e.target.value)} className={select}>
              {!passage.paragraphs.some((p) => p.label === q.paragraph) && <option value={q.paragraph}>Chưa chọn</option>}
              {passage.paragraphs.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} · {p.text.slice(0, 40)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className={label}>Kỹ năng</span>
          <select value={q.skill} onChange={(e) => onPatch({ skill: e.target.value as ReadingSkill })} className={select}>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {SKILL_LABELS_VI[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className={label}>Evidence (trích nguyên văn từ đoạn {q.paragraph})</span>
            <button
              type="button"
              // Keep the selection in the passage while clicking.
              onMouseDown={(e) => e.preventDefault()}
              onClick={usePick}
              disabled={blocked}
              title={lockedParagraph && picked && picked.paragraph !== q.paragraph ? `Hãy bôi đen trong đoạn ${q.paragraph}` : undefined}
              className={pickBtn}
            >
              <Highlighter className="h-4 w-4 text-tone-mint-fg" /> Dùng chỗ bôi đen
            </button>
          </div>
          <BlurField multiline rows={2} value={q.evidence} onCommit={(t) => onPatch({ evidence: t.replace(/\s+/g, ' ').trim() })} aria-label={`Evidence câu ${q.number}`} />
        </div>
        <label className="block sm:col-span-2">
          <span className={label}>Câu bẫy (trích nguyên văn, nếu có)</span>
          <BlurField value={q.distractor ?? ''} onCommit={(t) => onPatch({ distractor: t.trim() || undefined })} />
        </label>
        <label className="block">
          <span className={label}>Diễn đạt trong đề</span>
          <BlurField
            value={q.paraphrase?.question ?? ''}
            placeholder="rose sharply"
            onCommit={(t) => onPatch({ paraphrase: t.trim() || q.paraphrase?.passage ? { question: t.trim(), passage: q.paraphrase?.passage ?? '' } : undefined })}
          />
        </label>
        <label className="block">
          <span className={label}>Diễn đạt trong bài đọc</span>
          <BlurField
            value={q.paraphrase?.passage ?? ''}
            placeholder="increased dramatically"
            onCommit={(t) => onPatch({ paraphrase: t.trim() || q.paraphrase?.question ? { question: q.paraphrase?.question ?? '', passage: t.trim() } : undefined })}
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

function CompletionFields({ group, set, paragraph }: { group: Extract<ReadingGroup, { type: 'completion' }>; set: (g: ReadingGroup) => void; paragraph: string }) {
  const tpl = completionText(group);
  const [mode, setMode] = useState(tpl.mode);
  const boxed = !!group.wordBox;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>Tiêu đề (tuỳ chọn)</span>
        <BlurField value={group.title ?? ''} onCommit={(t) => set({ ...group, title: t.trim() })} placeholder="The history of glass" />
      </label>
      {boxed ? (
        <OptionsField title="Hộp từ (A, B, C…)" options={group.wordBox ?? []} onChange={(wordBox) => set({ ...group, wordBox })} />
      ) : (
        <WordLimit group={group} onChange={set} />
      )}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={label}>Nội dung, mỗi ô trống viết ___</span>
          {!boxed && (
            <Segmented<'lines' | 'flowchart' | 'table'>
              label="Kiểu trình bày"
              value={mode === 'table' ? 'table' : group.layout === 'flowchart' ? 'flowchart' : 'lines'}
              onChange={(m) => {
                const next = m === 'table' ? 'table' : 'lines';
                setMode(next);
                set({ ...applyCompletionText(group, next, tpl.text, paragraph), layout: m === 'flowchart' ? 'flowchart' : 'lines' });
              }}
              options={[
                { value: 'lines', label: 'Dòng' },
                { value: 'flowchart', label: 'Flow-chart' },
                { value: 'table', label: 'Bảng' },
              ]}
            />
          )}
        </div>
        <BlurField
          multiline
          rows={Math.max(4, tpl.text.split('\n').length + 1)}
          value={tpl.text}
          onCommit={(t) => set(applyCompletionText(group, mode, t, paragraph))}
          className={`${textarea} font-mono`}
          placeholder={mode === 'table' ? 'Period | Material | Use\n1600s | ___ | windows' : 'Early glass was made from ___ and sand.'}
          aria-label="Nội dung có ô trống"
        />
        <p className={`mt-1 ${hint}`}>
          {mode === 'table' ? 'Dòng đầu là tiêu đề cột, các ô cách nhau bằng dấu |. ' : group.layout === 'flowchart' ? 'Mỗi dòng là một bước. ' : ''}
          Mỗi ___ là một câu hỏi ({group.questions.length} câu).
        </p>
      </div>
    </div>
  );
}

function DiagramFields({ group, set, paragraph }: { group: Extract<ReadingGroup, { type: 'diagram' }>; set: (g: ReadingGroup) => void; paragraph: string }) {
  const [bad, setBad] = useState<number[]>([]);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block">
          <span className={label}>Tên sơ đồ</span>
          <BlurField value={group.diagram.title} onCommit={(t) => set({ ...group, diagram: { ...group.diagram, title: t.trim() } })} placeholder="A water filter" />
        </label>
        <WordLimit group={group} onChange={set} />
        <label className="block">
          <span className={label}>Các hình (loại x y rộng cao, rồi chữ)</span>
          <BlurField
            multiline
            rows={Math.max(5, group.diagram.shapes.length + 1)}
            value={shapesText(group.diagram.shapes)}
            onCommit={(t) => {
              const out = applyShapesText(group, t, paragraph);
              setBad(out.bad);
              set(out.group);
            }}
            className={`${textarea} font-mono`}
            placeholder={'box 20 20 140 60 Tank | ___\narrow 160 50 80 0\ncircle 260 20 60 60 ___'}
          />
          <span className={hint}>
            Loại: box, circle, line, arrow. Khung {group.diagram.width}×{group.diagram.height}. Dấu | xuống dòng; mỗi ___ là một câu.
          </span>
          {bad.length > 0 && <span className="block text-caption text-red-600 dark:text-red-400">Không đọc được dòng {bad.join(', ')}.</span>}
        </label>
      </div>
      {group.diagram.shapes.length > 0 && <ReadingDiagram diagram={group.diagram} answers={{}} />}
    </div>
  );
}

function HeadingsFields({ group, set, passage }: { group: Extract<ReadingGroup, { type: 'headings' }>; set: (g: ReadingGroup) => void; passage: ReadingPassage }) {
  const ex = group.example;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>Danh sách heading, mỗi dòng một heading</span>
        <BlurField
          multiline
          rows={Math.max(5, group.headings.length)}
          value={headingsText(group.headings)}
          onCommit={(t) => set({ ...group, headings: parseHeadings(t) })}
          placeholder={'i. The cost of early experiments\nii. A surprising discovery'}
        />
        <span className={hint}>Số La Mã i, ii, iii… được gán lại theo thứ tự. Cần nhiều heading hơn số đoạn được hỏi.</span>
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className={label}>Đoạn làm ví dụ</span>
          <select
            value={ex?.paragraph ?? ''}
            onChange={(e) => {
              const { example: _e, ...rest } = group;
              set(e.target.value ? { ...rest, example: { paragraph: e.target.value, heading: ex?.heading ?? '' } } : rest);
            }}
            className={`${select} w-32`}
          >
            <option value="">Không có</option>
            {passage.paragraphs.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {ex && (
          <div>
            <span className={label}>Heading của ví dụ</span>
            <div className="mt-1.5">
              <LetterSelect
                options={group.headings.map((h) => h.key)}
                value={ex.heading}
                onChange={(heading) => set({ ...group, example: { ...ex, heading } })}
                labelText="Heading của đoạn ví dụ"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupEditor({
  group,
  passage,
  index,
  pick,
  onPassage,
}: {
  group: ReadingGroup;
  passage: ReadingPassage;
  index: number;
  pick: PassagePick | null;
  onPassage: (p: ReadingPassage) => void;
}) {
  const set = (g: ReadingGroup) => onPassage(updateReadingGroup(passage, g));
  const patchQ = (n: number, p: Partial<ReadingQuestion>) => set(updateReadingQuestion(group, n, p));
  const qs = group.questions;
  const kind = GROUP_KINDS[readingGroupKind(group)];
  const range = qs.length > 1 ? `Câu ${qs[0].number}–${qs.at(-1)!.number}` : qs.length ? `Câu ${qs[0].number}` : 'Chưa có câu';
  const lastParagraph = passage.paragraphs.at(-1)?.label ?? 'A';
  const paragraphs = passage.paragraphs.map((p) => p.label);
  const boxed = group.type === 'completion' && !!group.wordBox;
  const textAnswers = (group.type === 'completion' && !boxed) || group.type === 'short_answer' || group.type === 'diagram';

  const answerRow = (q: ReadingQuestion) => {
    if (textAnswers) {
      return (
        <label className="block min-w-0 flex-1">
          <span className={label}>Đáp án chấp nhận (cách nhau bằng " / ")</span>
          <BlurField value={answersText(q.answers)} onCommit={(t) => patchQ(q.number, { answers: parseAnswers(t) })} placeholder="sand / the sand" />
        </label>
      );
    }
    if (group.type === 'tfng') {
      const values = group.variant === 'ynng' ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN'];
      return (
        <Segmented<string>
          label={`Đáp án câu ${q.number}`}
          value={q.answers[0] ?? ''}
          onChange={(v) => patchQ(q.number, { answers: [v] })}
          options={values.map((v) => ({ value: v, label: v }))}
        />
      );
    }
    if (group.type === 'headings') {
      return (
        <>
          <div className="flex items-center gap-2">
            <span className={label}>Đoạn</span>
            <LetterSelect options={paragraphs} value={q.paragraph} onChange={(v) => patchQ(q.number, { paragraph: v })} labelText={`Đoạn của câu ${q.number}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={label}>Heading đúng</span>
            <LetterSelect
              options={group.headings.map((h) => h.key)}
              value={q.answers[0] ?? ''}
              onChange={(v) => patchQ(q.number, { answers: v ? [v] : [] })}
              labelText={`Đáp án câu ${q.number}`}
            />
          </div>
        </>
      );
    }
    if (group.type === 'matching' && group.target === 'paragraph') {
      return (
        <div className="flex items-center gap-2">
          <span className={label}>Đoạn đúng</span>
          <LetterSelect options={paragraphs} value={q.answers[0] ?? ''} onChange={(v) => patchQ(q.number, v ? { answers: [v], paragraph: v } : { answers: [] })} labelText={`Đáp án câu ${q.number}`} />
        </div>
      );
    }
    const keys =
      group.type === 'mcq' ? (q.options ?? []).map((o) => o.key) : group.type === 'matching' ? group.options.map((o) => o.key) : boxed ? (group.wordBox ?? []).map((o) => o.key) : [];
    return (
      <div className="flex items-center gap-2">
        <span className={label}>Đáp án</span>
        <LetterSelect options={keys} value={q.answers[0] ?? ''} onChange={(v) => patchQ(q.number, { answers: v ? [v] : [] })} labelText={`Đáp án câu ${q.number}`} />
      </div>
    );
  };

  const prompted = group.type === 'tfng' || group.type === 'mcq' || group.type === 'matching' || group.type === 'short_answer';
  const promptHint =
    group.type === 'tfng'
      ? 'Nhận định'
      : group.type === 'matching' && group.target === 'ending'
        ? 'Đầu câu'
        : group.type === 'matching'
          ? 'Thông tin cần tìm'
          : 'Câu hỏi';

  return (
    <li className={`${panel} p-4`}>
      <div className="flex items-start gap-3">
        <IconTile icon={kind.icon} tone={kind.tone} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
            Nhóm {index + 1} · {range}
          </p>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{kind.label}</h3>
        </div>
        <button type="button" onClick={() => onPassage(moveReadingGroup(passage, group.id, -1))} disabled={index === 0} className={iconBtn} aria-label="Đưa nhóm lên">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPassage(moveReadingGroup(passage, group.id, 1))}
          disabled={index === passage.groups.length - 1}
          className={iconBtn}
          aria-label="Đưa nhóm xuống"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onPassage(removeReadingGroup(passage, group.id))} className={iconBtn} aria-label={`Xoá nhóm ${index + 1}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className={label}>Hướng dẫn (tiếng Anh, như trong đề)</span>
          <BlurField multiline rows={2} value={group.instruction} onCommit={(t) => set({ ...group, instruction: t.trim() })} />
        </label>

        {group.type === 'completion' && <CompletionFields group={group} set={set} paragraph={lastParagraph} />}
        {group.type === 'diagram' && <DiagramFields group={group} set={set} paragraph={lastParagraph} />}
        {group.type === 'short_answer' && <WordLimit group={group} onChange={set} />}
        {group.type === 'headings' && <HeadingsFields group={group} set={set} passage={passage} />}
        {group.type === 'mcq_multi' && (
          <>
            <label className="block">
              <span className={label}>Câu hỏi chung</span>
              <BlurField value={group.prompt} onCommit={(t) => set({ ...group, prompt: t.trim() })} placeholder="Which TWO claims does the writer make about glass?" />
            </label>
            <OptionsField title="Các lựa chọn" options={group.options} onChange={(options) => set({ ...group, options })} />
            <fieldset>
              <legend className={label}>Chọn {qs.length} đáp án đúng</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {group.options.map((o) => {
                  const on = qs[0]?.answers.includes(o.key) ?? false;
                  return (
                    <label
                      key={o.key}
                      className={`flex min-h-touch items-center gap-2 rounded-xl border px-3 text-sm ${on ? 'border-tone-periwinkle-fg bg-tone-periwinkle-soft' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const cur = qs[0]?.answers ?? [];
                          set(setReadingMultiAnswers(group, e.target.checked ? [...cur, o.key] : cur.filter((k) => k !== o.key)));
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
            {group.target !== 'paragraph' && (
              <>
                <label className="block">
                  <span className={label}>Tiêu đề hộp lựa chọn</span>
                  <BlurField value={group.optionsTitle ?? ''} onCommit={(t) => set({ ...group, optionsTitle: t.trim() || undefined })} placeholder="List of Researchers" />
                </label>
                <OptionsField title={group.target === 'ending' ? 'Các đoạn kết' : 'Các lựa chọn'} options={group.options} onChange={(options) => set({ ...group, options })} />
              </>
            )}
            <label className="flex min-h-touch items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={!!group.reuse} onChange={(e) => set({ ...group, reuse: e.target.checked || undefined })} className="h-4 w-4" />
              Được dùng một chữ cái nhiều lần
            </label>
          </>
        )}

        <ol className="space-y-3">
          {qs.map((q, qi) => (
            <li key={q.number} className={`${subPanel} p-3`}>
              <div className="flex items-start gap-2">
                <NumberBadge n={q.number} />
                <div className="min-w-0 flex-1 space-y-2">
                  {blankDriven(group) && <p className="font-mono text-caption text-slate-600 dark:text-slate-300">{readingBlankContext(group, q.number) || '—'}</p>}
                  {prompted && (
                    <BlurField
                      value={q.prompt ?? ''}
                      onCommit={(t) => patchQ(q.number, { prompt: t.trim() })}
                      placeholder={promptHint}
                      aria-label={`Nội dung câu ${q.number}`}
                      className={`${input} !mt-0`}
                    />
                  )}
                  {group.type === 'mcq' && <OptionsField title="Lựa chọn" options={q.options ?? []} onChange={(options) => patchQ(q.number, { options })} />}
                  {group.type === 'mcq_multi' ? (
                    <p className={hint}>Chữ cái thứ {qi + 1} cần chọn; đáp án dùng chung ở trên.</p>
                  ) : (
                    <div className="flex flex-wrap items-end gap-3">{answerRow(q)}</div>
                  )}
                  <QuestionNotes q={q} group={group} passage={passage} pick={pick} onPatch={(p) => patchQ(q.number, p)} />
                </div>
                {!blankDriven(group) && qs.length > 1 && (
                  <button type="button" onClick={() => set(removeReadingQuestion(group, q.number))} className={iconBtn} aria-label={`Xoá câu ${q.number}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!blankDriven(group) && (
          <button type="button" onClick={() => set(addReadingQuestion(group))} className={ghostBtn}>
            <Plus className="h-4 w-4" /> {group.type === 'mcq_multi' ? 'Thêm một chữ cái cần chọn' : 'Thêm câu'}
          </button>
        )}
      </div>
    </li>
  );
}

export default function ReadingQuestionEditor({ passage, onChange, pick }: Props) {
  const [kind, setKind] = useState<ReadingEditorKind>('tfng');
  const count = passageQuestions(passage).length;
  const ok = count >= PASSAGE_QUESTIONS.min && count <= PASSAGE_QUESTIONS.max;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className={`text-sm ${ok ? 'text-tone-mint-fg' : 'text-slate-600 dark:text-slate-300'}`}>
          {count} câu{ok ? '' : ` · mỗi passage cần ${PASSAGE_QUESTIONS.min}–${PASSAGE_QUESTIONS.max} câu`}
        </p>
        <div className="flex gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as ReadingEditorKind)} aria-label="Dạng câu hỏi" className={`${select} !mt-0 sm:w-60`}>
            {READING_EDITOR_KINDS.map((k) => (
              <option key={k} value={k}>
                {GROUP_KINDS[k].label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onChange(addReadingGroup(passage, kind))} className={`${secondaryBtn} flex-shrink-0`}>
            <Plus className="h-4 w-4" /> Thêm nhóm
          </button>
        </div>
      </div>
      {passage.paragraphs.length === 0 && <p className={hint}>Mẹo: dán bài đọc trước, để chọn đoạn và bôi đen evidence cho từng câu.</p>}
      {passage.groups.length > 0 && (
        <ol className="space-y-4">
          {passage.groups.map((g, i) => (
            <GroupEditor key={g.id} group={g} passage={passage} index={i} pick={pick} onPassage={onChange} />
          ))}
        </ol>
      )}
    </div>
  );
}
