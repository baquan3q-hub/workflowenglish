import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Columns2, PenLine } from 'lucide-react';
import type { IeltsQuestion, IeltsWritingTask } from '../types';
import { WRITING_GUIDES, type WritingGuide } from '../data/ielts/writingGuides';
import { BAND_SAMPLE_SETS, type BandSampleSet, type SampleBand } from '../data/ielts/writingSamples';
import { LINKING_GROUPS, TOPIC_COLLOCATIONS } from '../data/ielts/writingLanguage';
import { guideLesson } from '../data/ielts/library';
import { getWritingQuestionById, getWritingQuestions } from '../services/ieltsWritingService';
import { Segmented } from '../components/ui/Segmented';
import LessonSections from '../components/ielts/LessonSections';
import SampleEssay from '../components/ielts/writing/SampleEssay';
import WordPicker from '../components/ielts/WordPicker';
import IeltsChartRenderer from '../components/IeltsChartRenderer';
import { ghostBtn, panel, secondaryBtn } from '../components/ui/styles';

export type WritingStudyTab = 'guides' | 'samples' | 'language';

interface Props {
  initialTab?: WritingStudyTab;
  userId: string;
  onBack: () => void;
  onPractice: (q: IeltsQuestion) => void;
}

const chipBase = 'inline-flex min-h-touch flex-shrink-0 items-center rounded-xl border px-3 text-sm font-medium transition-colors';
const chipOn = 'border-slate-900 border border-tone-periwinkle-border bg-tone-periwinkle-soft text-tone-periwinkle-fg dark:border-white';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

const TASK_LABEL: Record<IeltsWritingTask, string> = { task_1: 'Task 1', task_2: 'Task 2' };
const BAND_OPTIONS = ([6, 7, 8] as const).map((b) => ({ value: b, label: `Band ${b}` }));

function RowButton({ title, subtitle, onClick }: { title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${panel} flex w-full items-center gap-3 p-4 text-left hover:border-slate-300 dark:hover:border-slate-700`}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        {subtitle && <span className="mt-0.5 block text-caption text-slate-500 dark:text-slate-400">{subtitle}</span>}
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
    </button>
  );
}

// ─── Guides ─────────────────────────────────────────────────────────

function GuideList({ onOpen }: { onOpen: (g: WritingGuide) => void }) {
  return (
    <div className="space-y-5">
      {(['task_1', 'task_2'] as const).map((task) => (
        <section key={task} className="space-y-2">
          <h2 className="text-title font-semibold text-slate-900 dark:text-white">{TASK_LABEL[task]}</h2>
          <ul className="space-y-2">
            {WRITING_GUIDES.filter((g) => g.task === task).map((g) => (
              <li key={g.id}>
                <RowButton title={g.title} subtitle={g.summary} onClick={() => onOpen(g)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function GuideView({ guide, onPractice }: { guide: WritingGuide; onPractice: (q: IeltsQuestion) => void }) {
  const lesson = useMemo(() => guideLesson(guide), [guide]);
  const questions = useMemo(() => getWritingQuestions({ taskOrPart: guide.task, essayType: guide.id }), [guide]);
  return (
    <article className="space-y-5">
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">{TASK_LABEL[guide.task]} · Hướng dẫn dạng bài</p>
        <h2 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{guide.title}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{guide.summary}</p>
      </header>
      <LessonSections sections={lesson.sections} />
      {questions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-title font-semibold text-slate-900 dark:text-white">Luyện dạng này</h2>
          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onPractice(q)}
                  className={`${panel} flex w-full items-start gap-3 p-4 text-left hover:border-slate-300 dark:hover:border-slate-700`}
                >
                  <PenLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-lavender-fg" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-caption font-medium text-slate-500 dark:text-slate-400">{q.topic}</span>
                    <span className="mt-0.5 line-clamp-3 block text-sm text-slate-800 dark:text-slate-200">{q.prompt}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// ─── Band samples ───────────────────────────────────────────────────

function SampleView({ set, userId, onPractice }: { set: BandSampleSet; userId: string; onPractice: (q: IeltsQuestion) => void }) {
  const question = getWritingQuestionById(set.questionId);
  const [band, setBand] = useState<SampleBand>(7);
  const [compareBand, setCompareBand] = useState<SampleBand>(6);
  const [compare, setCompare] = useState(false);
  const essay = (b: SampleBand) => set.essays.find((e) => e.band === b)!;

  return (
    <article className="space-y-5">
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Bài mẫu theo band</p>
        <h2 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{set.title}</h2>
      </header>
      {question && (
        <div className={`${panel} space-y-3 p-4`}>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{question.prompt}</p>
          {question.chartData && <IeltsChartRenderer data={question.chartData} />}
          <button type="button" onClick={() => onPractice(question)} className={secondaryBtn}>
            <PenLine className="h-4 w-4" /> Tự viết đề này
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented options={BAND_OPTIONS} value={band} onChange={(v) => setBand(v as SampleBand)} label="Band của bài mẫu" />
        <button type="button" onClick={() => setCompare((c) => !c)} aria-pressed={compare} className={`${chipBase} gap-2 ${compare ? chipOn : chipOff}`}>
          <Columns2 className="h-4 w-4" /> So sánh
        </button>
      </div>

      {compare ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${panel} p-4`}>
            <SampleEssay essay={essay(band)} task={set.task} />
          </section>
          <section className={`${panel} space-y-4 p-4`}>
            <Segmented options={BAND_OPTIONS} value={compareBand} onChange={(v) => setCompareBand(v as SampleBand)} label="Band để so sánh" />
            <SampleEssay essay={essay(compareBand)} task={set.task} />
          </section>
        </div>
      ) : (
        <section className={`${panel} p-4 sm:p-5`}>
          <SampleEssay essay={essay(band)} task={set.task} />
        </section>
      )}
      <section className={`${panel} p-4`}>
        <WordPicker key={band} userId={userId} text={essay(band).paragraphs.map((p) => p.text).join('\n')} />
      </section>
    </article>
  );
}

// ─── Language bank ──────────────────────────────────────────────────

function LanguageBank() {
  const [part, setPart] = useState<'linking' | 'collocations'>('linking');
  const [topic, setTopic] = useState(TOPIC_COLLOCATIONS[0].id);
  const current = TOPIC_COLLOCATIONS.find((t) => t.id === topic)!;

  return (
    <div className="space-y-4">
      <Segmented
        options={[
          { value: 'linking', label: 'Từ nối' },
          { value: 'collocations', label: 'Collocation theo chủ đề' },
        ]}
        value={part}
        onChange={(v) => setPart(v as 'linking' | 'collocations')}
        label="Ngân hàng ngôn ngữ"
      />
      {part === 'linking' ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {LINKING_GROUPS.map((g) => (
            <li key={g.id} className={`${panel} space-y-2 p-4`}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{g.title}</h3>
              <p className="text-caption text-slate-500 dark:text-slate-400">{g.noteVi}</p>
              <ul className="space-y-2">
                {g.items.map((it) => (
                  <li key={it.phrase} className="text-sm">
                    <span className="font-semibold text-slate-900 dark:text-white">{it.phrase}</span>
                    <span className="block text-caption italic text-slate-600 dark:text-slate-400">{it.example}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div role="tablist" aria-label="Chủ đề" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {TOPIC_COLLOCATIONS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === topic} onClick={() => setTopic(t.id)} className={`${chipBase} ${t.id === topic ? chipOn : chipOff}`}>
                {t.titleVi}
              </button>
            ))}
          </div>
          <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
            {current.items.map((c) => (
              <li key={c.phrase} className="p-4 text-sm">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">{c.phrase}</span>
                  <span className="text-slate-500 dark:text-slate-400"> · {c.meaningVi}</span>
                </p>
                <p className="mt-0.5 text-caption italic text-slate-600 dark:text-slate-400">{c.example}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────

export default function IeltsWritingStudy({ initialTab = 'guides', userId, onBack, onPractice }: Props) {
  const [tab, setTab] = useState<WritingStudyTab>(initialTab);
  const [guide, setGuide] = useState<WritingGuide | null>(null);
  const [sample, setSample] = useState<BandSampleSet | null>(null);
  const detail = guide ?? sample;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [guide, sample]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10 anim-fade-up">
      <button
        type="button"
        onClick={() => {
          if (detail) {
            setGuide(null);
            setSample(null);
          } else onBack();
        }}
        className={`${ghostBtn} -ml-3`}
      >
        <ArrowLeft className="h-4 w-4" /> {detail ? 'Học Writing' : 'Writing'}
      </button>

      {guide ? (
        <GuideView guide={guide} onPractice={onPractice} />
      ) : sample ? (
        <SampleView set={sample} userId={userId} onPractice={onPractice} />
      ) : (
        <>
          <header>
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Writing</p>
            <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Học Writing</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Cách viết từng dạng, bài mẫu band 6–7–8 có chú thích, từ nối và collocation theo chủ đề.</p>
          </header>
          <Segmented
            options={[
              { value: 'guides', label: 'Dạng bài' },
              { value: 'samples', label: 'Bài mẫu' },
              { value: 'language', label: 'Ngôn ngữ' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as WritingStudyTab)}
            label="Nội dung"
          />
          {tab === 'guides' && <GuideList onOpen={setGuide} />}
          {tab === 'samples' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Cùng một đề, ba bài ở band 6, 7 và 8. Đọc chú thích để thấy chính xác điều gì làm bài lên band.
              </p>
              <ul className="space-y-2">
                {BAND_SAMPLE_SETS.map((s) => (
                  <li key={s.id}>
                    <RowButton title={s.title} subtitle="Band 6 · 7 · 8, có chú thích từng câu" onClick={() => setSample(s)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'language' && <LanguageBank />}
        </>
      )}
    </div>
  );
}
