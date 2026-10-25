import React, { useEffect, useMemo, useState } from 'react';
import { IeltsAttempt, IeltsQuestion } from '../types';
import { getWritingQuestionById, getWritingQuestions } from '../services/ieltsWritingService';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { QuestionCard, FilterBar, FrameworkCard } from '../components/IeltsCommon';
import IeltsAttemptHistory from '../components/IeltsAttemptHistory';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CheckCheck, ChevronDown, ChevronRight, ChevronUp, FileText, Filter, Languages, LayoutList, Lightbulb, PenLine, PenTool, TrendingUp } from 'lucide-react';
import { WRITING_GUIDES } from '../data/ielts/writingGuides';
import { questionTopics } from '../services/writingStudyLogic';
import { countWords, listWritingDrafts, progressByPrompt, summarizeWriting, type WritingDraft } from '../services/writingPracticeLogic';
import type { WritingStudyTab } from './IeltsWritingStudy';
import { IconTile } from '../components/ui/IconTile';
import { toneClasses, type Tone } from '../components/ui/palette';
import { Segmented } from '../components/ui/Segmented';
import { panel } from '../components/ui/styles';

const STUDY_LINKS: ReadonlyArray<{ tab: WritingStudyTab; title: string; subtitle: string; icon: LucideIcon; tone: Tone }> = [
  { tab: 'guides', title: 'Cách viết từng dạng', subtitle: '7 dạng Task 1, 6 dạng Task 2', icon: LayoutList, tone: 'lavender' },
  { tab: 'samples', title: 'Bài mẫu band 6 · 7 · 8', subtitle: 'Cùng một đề, có chú thích', icon: FileText, tone: 'sky' },
  { tab: 'language', title: 'Từ nối và collocation', subtitle: 'Theo chức năng và chủ đề', icon: Languages, tone: 'mint' },
];

const TASK_OPTIONS = [
  { value: 'task_1' as const, label: 'Task 1 · Biểu đồ' },
  { value: 'task_2' as const, label: 'Task 2 · Luận' },
];

interface Props {
  userId: string;
  onOpenAttempt: (attempt: IeltsAttempt) => void;
  onSelectQuestion: (q: IeltsQuestion) => void;
  onOpenStudy: (tab: WritingStudyTab) => void;
  /** Writing attempts of the learner; injectable for previews and tests. */
  loadAttempts?: (userId: string) => Promise<IeltsAttempt[]>;
}

const loadWritingAttempts = (userId: string) => getIeltsAttempts(userId, 'writing', 100);

function Stat({ icon: Icon, tone, value, label }: { icon: React.ElementType; tone: Tone; value: React.ReactNode; label: string }) {
  return (
    <div className={`lift group rounded-xl border p-3 text-center ${toneClasses(tone).surface}`}>
      <Icon className={`icon-pop mx-auto mb-1 h-5 w-5 ${toneClasses(tone).text}`} aria-hidden />
      <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white">{value}</p>
      <p className="text-caption font-semibold text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}

export default function IeltsWritingHub({ userId, onSelectQuestion, onOpenAttempt, onOpenStudy, loadAttempts = loadWritingAttempts }: Props) {
  const [activeTab, setActiveTab] = useState<'task_1' | 'task_2'>('task_1');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFrameworks, setShowFrameworks] = useState(false);
  const [attempts, setAttempts] = useState<IeltsAttempt[]>([]);
  const [drafts] = useState<WritingDraft[]>(() => (userId ? listWritingDrafts(userId) : []));

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadAttempts(userId)
      .then((rows) => live && setAttempts(rows))
      .catch(() => live && setAttempts([]));
    return () => {
      live = false;
    };
  }, [userId, loadAttempts]);

  const questions = useMemo(
    () =>
      getWritingQuestions({
        taskOrPart: activeTab,
        essayType: filters.essayType || undefined,
        topic: filters.topic || undefined,
        difficulty: filters.difficulty || undefined,
      }),
    [activeTab, filters],
  );

  const writingFrameworks = ieltsFrameworks.filter((f) => f.skill === 'writing');
  const topics = useMemo(() => questionTopics(getWritingQuestions({ taskOrPart: activeTab })), [activeTab]);
  const progress = useMemo(() => progressByPrompt(attempts), [attempts]);
  const summary = useMemo(() => summarizeWriting(attempts), [attempts]);
  const resume = useMemo(
    () =>
      drafts
        .map((d) => ({ draft: d, question: getWritingQuestionById(d.questionId) }))
        .filter((r): r is { draft: WritingDraft; question: IeltsQuestion } => !!r.question),
    [drafts],
  );

  const filterOptions = [
    {
      key: 'essayType',
      label: activeTab === 'task_2' ? 'Tất cả dạng bài' : 'Tất cả dạng biểu đồ',
      options: WRITING_GUIDES.filter((g) => g.task === activeTab).map((g) => ({ value: g.id, label: g.title })),
    },
    { key: 'topic', label: 'Tất cả chủ đề', options: topics.map((topic) => ({ value: topic, label: topic })) },
    {
      key: 'difficulty',
      label: 'Tất cả mức độ',
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' },
      ],
    },
  ];

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-tone-lavender-border bg-tone-lavender-soft px-4 py-1.5">
          <PenTool className="h-4 w-4 text-tone-lavender-fg" />
          <span className="text-sm font-bold text-tone-lavender-fg">IELTS Writing Assistant</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">Luyện viết IELTS Writing</h1>
        <p className="mx-auto max-w-lg text-sm text-slate-600 dark:text-slate-400">
          Luyện đề IELTS Writing Task 1 Academic và Task 2 Essay, nhận feedback đánh giá chi tiết từ AI.
        </p>
      </div>

      {/* Resume a draft kept on this device */}
      {resume.length > 0 && (
        <section aria-labelledby="writing-resume" className="space-y-2">
          <h2 id="writing-resume" className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <PenLine className="h-4 w-4 text-tone-butter-fg" aria-hidden /> Bài viết dở
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {resume.map(({ draft, question }) => (
              <li key={draft.questionId}>
                <button
                  type="button"
                  onClick={() => onSelectQuestion(question)}
                  className={`lift press group flex min-h-touch w-full items-center gap-3 rounded-xl border p-3 text-left ${toneClasses('butter').surface}`}
                >
                  <IconTile icon={PenLine} tone="butter" size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{question.prompt}</span>
                    <span className="block text-caption text-slate-600 dark:text-slate-300">
                      {question.taskOrPart === 'task_1' ? 'Task 1' : 'Task 2'} · {countWords(draft.text)} từ · viết tiếp
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-tone-butter-fg transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Task tabs */}
      <Segmented
        className="mx-auto max-w-md"
        label="Loại bài viết"
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v);
          setFilters({});
        }}
        options={TASK_OPTIONS}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={BookOpen} tone="lavender" value={questions.length} label={`Đề ${activeTab === 'task_1' ? 'Task 1' : 'Task 2'}`} />
        <Stat icon={CheckCheck} tone="mint" value={summary.attempts} label="Bài đã chấm" />
        <Stat icon={TrendingUp} tone="aqua" value={summary.averageBand != null ? summary.averageBand.toFixed(1) : '—'} label="Band trung bình" />
        <Stat icon={Lightbulb} tone="butter" value={summary.bestBand != null ? summary.bestBand.toFixed(1) : '—'} label="Band cao nhất" />
      </div>

      {/* Study before writing */}
      <section aria-labelledby="writing-study-title" className="space-y-2">
        <h2 id="writing-study-title" className="text-sm font-bold text-slate-800 dark:text-white">Học trước khi viết</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {STUDY_LINKS.map(({ tab, title, subtitle, icon, tone }) => (
            <li key={tab}>
              <button
                type="button"
                onClick={() => onOpenStudy(tab)}
                className={`${panel} lift press group flex h-full min-h-touch w-full items-center gap-3 p-3 text-left`}
              >
                <IconTile icon={icon} tone={tone} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                  <span className="block text-caption text-slate-600 dark:text-slate-400">{subtitle}</span>
                </span>
                <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${toneClasses(tone).text}`} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Practice history */}
      <IeltsAttemptHistory userId={userId} skill="writing" onOpenAttempt={onOpenAttempt} />

      {/* Frameworks */}
      <div className={`overflow-hidden rounded-xl border ${toneClasses('lavender').surface}`}>
        <button
          onClick={() => setShowFrameworks(!showFrameworks)}
          aria-expanded={showFrameworks}
          className="flex min-h-touch w-full items-center justify-between px-4 py-3 transition-colors hover:bg-tone-lavender-soft"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-tone-lavender-fg" />
            <span className="text-sm font-bold text-tone-lavender-fg">Framework hướng dẫn viết</span>
          </div>
          {showFrameworks ? <ChevronUp className="h-4 w-4 text-tone-lavender-fg" /> : <ChevronDown className="h-4 w-4 text-tone-lavender-fg" />}
        </button>
        {showFrameworks && (
          <div className="space-y-2 px-4 pb-4">
            {writingFrameworks.map((fw) => (
              <FrameworkCard key={fw.id} framework={fw} />
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-tone-lavender-fg" aria-hidden />
        <FilterBar filters={filters} onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))} filterOptions={filterOptions} />
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-tone-lavender-accent" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Không tìm thấy đề bài phù hợp. Hãy thử đổi bộ lọc.</p>
          </div>
        ) : (
          questions.map((q) => <QuestionCard key={q.id} question={q} onSelect={onSelectQuestion} progress={progress.get(q.prompt)} />)
        )}
      </div>
    </div>
  );
}
