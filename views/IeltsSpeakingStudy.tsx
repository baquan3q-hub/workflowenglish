import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  Play,
  Repeat,
  ScanText,
  Square,
  Volume2,
} from 'lucide-react';
import type { IeltsQuestion } from '../types';
import {
  CUE_CARDS,
  OREO_STEPS,
  PART1_PACKS,
  PART3_PHRASES,
  PART3_THEMES,
  STORY_BANKS,
  type CueCard,
  type Part1Pack,
  type Part3Theme,
  type SpeakingVocab,
  type StoryBank,
} from '../data/ielts/speakingTopics';
import { PRONUNCIATION_ITEMS, type PronunciationItem } from '../data/ielts/pronunciation';
import {
  cardsByCategory,
  categoryLabel,
  cueCardQuestion,
  findShadowSet,
  oreoText,
  part1Question,
  part3Question,
  reviewWords,
  shadowingSets,
  shadowScore,
  speakClip,
  storiesForCard,
  type ShadowScore,
  type ShadowSet,
} from '../services/speakingStudyLogic';
import { transcribeAudioWithGemini } from '../services/ieltsSpeakingService';
import { blobToBase64, formatDuration } from '../services/speechService';
import { aiErrorMessage } from '../services/aiClient';
import type { AudioSegment } from '../services/listeningAudioService';
import { useClipPlayer, type ResolveClip } from '../components/ielts/listening/useClipPlayer';
import { useRecorder } from '../components/ielts/speaking/useRecorder';
import { DictationTokens, accuracyTone } from '../components/ielts/DictationTokens';
import AddToReviewButton from '../components/ielts/AddToReviewButton';
import { Segmented } from '../components/ui/Segmented';
import { ghostBtn, panel, primaryBtn, secondaryBtn } from '../components/ui/styles';

export type SpeakingStudyTab = 'part1' | 'part2' | 'part3' | 'pronunciation' | 'shadowing';

interface Props {
  userId: string;
  initialTab?: SpeakingStudyTab;
  onBack: () => void;
  onPractice: (q: IeltsQuestion) => void;
  /** Swapped out in previews without the AI server. */
  resolveClip?: ResolveClip;
  transcribe?: (audioBase64: string, mimeType: string) => Promise<string>;
}

type Detail =
  | { kind: 'pack'; pack: Part1Pack }
  | { kind: 'card'; card: CueCard }
  | { kind: 'story'; story: StoryBank }
  | { kind: 'theme'; theme: Part3Theme }
  | { kind: 'sound'; item: PronunciationItem }
  | { kind: 'shadow'; set: ShadowSet };

type Player = ReturnType<typeof useClipPlayer>;

const TABS: { id: SpeakingStudyTab; label: string }[] = [
  { id: 'part1', label: 'Part 1' },
  { id: 'part2', label: 'Part 2' },
  { id: 'part3', label: 'Part 3' },
  { id: 'pronunciation', label: 'Phát âm' },
  { id: 'shadowing', label: 'Shadowing' },
];

const chipBase = 'inline-flex min-h-touch flex-shrink-0 items-center rounded-xl border px-3 text-sm font-medium transition-colors';
const chipOn = 'border-slate-900 border border-tone-periwinkle-border bg-tone-periwinkle-soft text-tone-periwinkle-fg dark:border-white';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const h2 = 'text-title font-semibold text-slate-900 dark:text-white';
const muted = 'text-caption text-slate-500 dark:text-slate-400';

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

/** Round play button for one TTS clip. */
function PlayButton({ clip, player, rate = 1, label }: { clip: AudioSegment; player: Player; rate?: number; label: string }) {
  const loading = player.loadingId === clip.id;
  const playing = player.activeId === clip.id;
  return (
    <button
      type="button"
      onClick={() => player.toggle(clip, rate)}
      aria-label={playing ? `Dừng: ${label}` : `Nghe: ${label}`}
      className="press inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:border-slate-700 dark:text-slate-200"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}

function PlayerError({ player }: { player: Player }) {
  if (!player.error) return null;
  return (
    <p role="alert" className="text-caption text-tone-blush-fg">
      {player.error}
    </p>
  );
}

function VocabList({ items, player, userId }: { items: readonly SpeakingVocab[]; player: Player; userId: string }) {
  const words = useMemo(() => reviewWords(items), [items]);
  return (
    <section className="space-y-3">
      <h2 className={h2}>Từ vựng</h2>
      <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
        {items.map((v) => (
          <li key={v.phrase} className="flex items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">{v.phrase}</span>
              <span className="text-slate-500 dark:text-slate-400"> · {v.meaningVi}</span>
              {v.example && <span className="mt-0.5 block text-caption italic text-slate-600 dark:text-slate-400">{v.example}</span>}
            </span>
            <PlayButton clip={speakClip(`v:${v.phrase}`, v.example ?? v.phrase)} player={player} label={v.phrase} />
          </li>
        ))}
      </ul>
      <AddToReviewButton userId={userId} words={words} label={`Thêm ${items.length} từ vào ôn tập`} />
    </section>
  );
}

function PracticeRow({ prompt, onClick }: { prompt: string; onClick: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-200">{prompt}</span>
      <button type="button" onClick={onClick} className={`${ghostBtn} flex-shrink-0`} aria-label={`Luyện nói: ${prompt}`}>
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline">Luyện</span>
      </button>
    </li>
  );
}

// ─── Part 1 ─────────────────────────────────────────────────────────

function PackView({ pack, player, userId, onPractice, onShadow }: { pack: Part1Pack; player: Player; userId: string; onPractice: (q: IeltsQuestion) => void; onShadow: () => void }) {
  const [band, setBand] = useState<6 | 7>(7);
  const text = band === 7 ? pack.sample.band7 : pack.sample.band6;
  return (
    <article className="space-y-6">
      <header>
        <p className={muted}>Part 1 · {pack.topic}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{pack.titleVi}</h1>
      </header>

      <section className="space-y-3">
        <h2 className={h2}>Câu hỏi hay gặp</h2>
        <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
          {pack.questions.map((q, i) => (
            <PracticeRow key={q} prompt={q} onClick={() => onPractice(part1Question(pack, i))} />
          ))}
        </ul>
        <p className={muted}>Part 1 cần 2–3 câu cho mỗi câu hỏi: trả lời thẳng, thêm lý do, thêm một chi tiết.</p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Nói gì</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {pack.ideasVi.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>Câu trả lời mẫu</h2>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{pack.sample.question}</p>
        <Segmented
          options={[
            { value: 6, label: 'Band 6' },
            { value: 7, label: 'Band 7' },
          ]}
          value={band}
          onChange={(v) => setBand(v as 6 | 7)}
          label="Band của câu trả lời mẫu"
        />
        <div className={`${panel} flex gap-3 p-4`}>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{text}</p>
          <PlayButton clip={speakClip(`p1:${pack.id}:${band}`, text)} player={player} label={`câu trả lời band ${band}`} />
        </div>
        <PlayerError player={player} />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Vì sao bản band 7 tốt hơn</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {pack.sample.whyVi.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onShadow} className={secondaryBtn}>
          <Repeat className="h-4 w-4" /> Shadowing bản band 7
        </button>
      </section>

      <VocabList items={pack.vocabulary} player={player} userId={userId} />
    </article>
  );
}

// ─── Part 2 ─────────────────────────────────────────────────────────

function CueCardBox({ card }: { card: CueCard }) {
  return (
    <div className={`${panel} space-y-2 p-4`}>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{card.title}</p>
      <p className={muted}>You should say:</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
        {card.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function CardView({
  card,
  player,
  userId,
  onPractice,
  onShadow,
  onStory,
}: {
  card: CueCard;
  player: Player;
  userId: string;
  onPractice: (q: IeltsQuestion) => void;
  onShadow: () => void;
  onStory: (s: StoryBank) => void;
}) {
  const stories = storiesForCard(card.id);
  return (
    <article className="space-y-6">
      <header>
        <p className={muted}>Part 2 · {categoryLabel(card.category)}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Cue card</h1>
      </header>
      <CueCardBox card={card} />
      <button type="button" onClick={() => onPractice(cueCardQuestion(card))} className={primaryBtn}>
        <Mic className="h-4 w-4" /> Luyện nói đề này
      </button>

      <section className="space-y-3">
        <h2 className={h2}>Ghi chú trong 1 phút chuẩn bị</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Mỗi gạch đầu dòng một ô, chỉ ghi từ khoá. Không viết câu hoàn chỉnh.</p>
        <ol className="grid gap-2 sm:grid-cols-2">
          {card.bullets.map((b, i) => (
            <li key={b} className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-600">
              <p className="text-caption font-medium text-slate-500 dark:text-slate-400">
                {i + 1}. {b}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{card.notes[i]}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>Bài nói mẫu band 7</h2>
        <div className={`${panel} space-y-3 p-4`}>
          <div className="flex items-center gap-3">
            <PlayButton clip={speakClip(`p2:${card.id}`, card.sample)} player={player} label="bài nói mẫu" />
            <span className={muted}>{card.sample.split(/\s+/).length} từ, khoảng 1–1,5 phút. Khi thi, cứ nói tiếp đến khi giám khảo dừng bạn (tối đa 2 phút).</span>
          </div>
          {card.sample.split('\n\n').map((p) => (
            <p key={p.slice(0, 24)} className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {p}
            </p>
          ))}
        </div>
        <PlayerError player={player} />
        <button type="button" onClick={onShadow} className={secondaryBtn}>
          <Repeat className="h-4 w-4" /> Shadowing bài này
        </button>
      </section>

      {stories.length > 0 && (
        <section className="space-y-2">
          <h2 className={h2}>Dùng lại câu chuyện</h2>
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id}>
                <RowButton title={s.titleVi} subtitle={`Dùng cho ${s.covers.length} đề`} onClick={() => onStory(s)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <VocabList items={card.vocabulary} player={player} userId={userId} />
    </article>
  );
}

function StoryView({ story, onCard }: { story: StoryBank; onCard: (c: CueCard) => void }) {
  return (
    <article className="space-y-6">
      <header>
        <p className={muted}>Part 2 · Một câu chuyện cho nhiều đề</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{story.titleVi}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{story.summaryVi}</p>
      </header>
      <section className="space-y-2">
        <h2 className={h2}>Chi tiết cần nhớ</h2>
        <ul className="flex flex-wrap gap-2">
          {story.details.map((d) => (
            <li key={d} className="rounded-full border border-slate-200 px-3 py-1 text-caption font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
              {d}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className={h2}>Đề có thể dùng câu chuyện này</h2>
        <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
          {story.covers.map((c) => {
            const card = c.cardId ? CUE_CARDS.find((x) => x.id === c.cardId) : undefined;
            const body = (
              <>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">{c.title}</span>
                <span className="mt-0.5 block text-caption text-slate-600 dark:text-slate-400">{c.angleVi}</span>
              </>
            );
            return (
              <li key={c.title}>
                {card ? (
                  <button type="button" onClick={() => onCard(card)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <span className="min-w-0 flex-1">{body}</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  </button>
                ) : (
                  <div className="px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}

function Part2List({ onCard, onStory }: { onCard: (c: CueCard) => void; onStory: (s: StoryBank) => void }) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className={h2}>Một câu chuyện cho nhiều đề</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Chuẩn bị sẵn vài câu chuyện thật của bạn, mỗi câu có đủ người, nơi chốn, cảm xúc. Khi gặp đề lạ, chọn câu chuyện gần nhất rồi đổi góc kể.
        </p>
        <ul className="space-y-2">
          {STORY_BANKS.map((s) => (
            <li key={s.id}>
              <RowButton title={s.titleVi} subtitle={`Dùng cho ${s.covers.length} đề`} onClick={() => onStory(s)} />
            </li>
          ))}
        </ul>
      </section>
      {cardsByCategory().map((g) => (
        <section key={g.category} className="space-y-2">
          <h2 className={h2}>{categoryLabel(g.category)}</h2>
          <ul className="space-y-2">
            {g.cards.map((c) => (
              <li key={c.id}>
                <RowButton title={c.title} onClick={() => onCard(c)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ─── Part 3 ─────────────────────────────────────────────────────────

function ThemeView({ theme, player, userId, onPractice, onShadow }: { theme: Part3Theme; player: Player; userId: string; onPractice: (q: IeltsQuestion) => void; onShadow: () => void }) {
  return (
    <article className="space-y-6">
      <header>
        <p className={muted}>Part 3 · {theme.topic}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{theme.titleVi}</h1>
      </header>
      <section className="space-y-3">
        <h2 className={h2}>Câu hỏi thảo luận</h2>
        <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
          {theme.questions.map((q, i) => (
            <PracticeRow key={q} prompt={q} onClick={() => onPractice(part3Question(theme, i))} />
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className={h2}>Mẫu trả lời theo O.R.E.O.</h2>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{theme.oreo.question}</p>
        <div className={`${panel} space-y-3 p-4`}>
          <div className="flex items-center gap-3">
            <PlayButton clip={speakClip(`p3:${theme.id}`, oreoText(theme.oreo))} player={player} label="câu trả lời mẫu" />
            <span className={muted}>Nghe cả câu trả lời</span>
          </div>
          <ol className="space-y-3">
            {OREO_STEPS.map((step) => (
              <li key={step.key} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-caption font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {step.label[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-caption font-semibold text-slate-500 dark:text-slate-400">{step.label}</span>
                  <span className="block text-sm leading-relaxed text-slate-800 dark:text-slate-200">{theme.oreo[step.key]}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <PlayerError player={player} />
        <button type="button" onClick={onShadow} className={secondaryBtn}>
          <Repeat className="h-4 w-4" /> Shadowing câu trả lời này
        </button>
      </section>
      <VocabList items={theme.vocabulary} player={player} userId={userId} />
    </article>
  );
}

function Part3List({ onTheme }: { onTheme: (t: Part3Theme) => void }) {
  return (
    <div className="space-y-6">
      <section className={`${panel} space-y-3 p-4`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Mở rộng ý theo O.R.E.O.</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {OREO_STEPS.map((s) => (
            <li key={s.key} className="text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">{s.label}</span>
              <span className="block text-caption text-slate-600 dark:text-slate-400">{s.hintVi}</span>
            </li>
          ))}
        </ol>
        <p className={muted}>Part 3 chấm khả năng thảo luận: một câu trả lời tốt dài khoảng 4–6 câu, có lý do và ví dụ.</p>
      </section>
      <ul className="space-y-2">
        {PART3_THEMES.map((t) => (
          <li key={t.id}>
            <RowButton title={t.titleVi} subtitle={`${t.topic} · ${t.questions.length} câu hỏi`} onClick={() => onTheme(t)} />
          </li>
        ))}
      </ul>
      <section className="space-y-3">
        <h2 className={h2}>Cụm từ cho phần thảo luận</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PART3_PHRASES.map((g) => (
            <div key={g.id} className={`${panel} space-y-1.5 p-4`}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{g.titleVi}</h3>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {g.items.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Pronunciation ──────────────────────────────────────────────────

function SoundView({ item, player }: { item: PronunciationItem; player: Player }) {
  const [slow, setSlow] = useState(false);
  const rate = slow ? 0.75 : 1;
  return (
    <article className="space-y-6">
      <header>
        <p className={muted}>Phát âm · {item.sound}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{item.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.problemVi}</p>
      </header>
      <section className="space-y-2">
        <h2 className={h2}>Cách sửa</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {item.tipsVi.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={h2}>Nghe và nói theo</h2>
          <button type="button" role="switch" aria-checked={slow} onClick={() => setSlow((v) => !v)} className={`${chipBase} ${slow ? chipOn : chipOff}`}>
            Chậm 0.75×
          </button>
        </div>
        <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
          {item.examples.map((ex, i) => (
            <li key={ex.text} className="flex items-center gap-3 px-4 py-3">
              <PlayButton clip={speakClip(`pr:${item.id}:${i}`, ex.text)} player={player} rate={rate} label={ex.text} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-900 dark:text-white">{ex.text}</span>
                {ex.noteVi && <span className="mt-0.5 block text-caption text-slate-600 dark:text-slate-400">{ex.noteVi}</span>}
              </span>
            </li>
          ))}
        </ul>
        <PlayerError player={player} />
      </section>
      {item.minimalPairs && (
        <section className="space-y-2">
          <h2 className={h2}>Cặp từ dễ nhầm</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Nghe hai từ liền nhau, rồi tự nói và ghi âm để so sánh.</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {item.minimalPairs.map(([a, b]) => (
              <li key={a + b} className={`${panel} flex items-center gap-3 p-3`}>
                <PlayButton clip={speakClip(`mp:${a}:${b}`, `${a}. ${b}.`)} player={player} rate={rate} label={`${a}, ${b}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {a} <span className="text-slate-400">·</span> {b}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// ─── Shadowing ──────────────────────────────────────────────────────

function ShadowList({ onOpen }: { onOpen: (s: ShadowSet) => void }) {
  const sets = useMemo(() => shadowingSets(), []);
  const groups: { kind: ShadowSet['kind']; title: string }[] = [
    { kind: 'part1', title: 'Part 1' },
    { kind: 'part2', title: 'Part 2' },
    { kind: 'part3', title: 'Part 3' },
  ];
  return (
    <div className="space-y-6">
      <section className={`${panel} space-y-2 p-4`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Shadowing là gì</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <li>Nghe một câu mẫu, chú ý trọng âm, nối âm và chỗ ngắt.</li>
          <li>Ghi âm bạn nói lại câu đó, cố bắt chước cả nhịp điệu.</li>
          <li>Nghe nối tiếp bản gốc rồi bản của bạn để thấy chỗ khác.</li>
          <li>Tuỳ chọn: để AI nghe bản ghi và chỉ ra từ chưa rõ.</li>
        </ol>
        <p className={muted}>Mỗi ngày 10 phút với một bài, làm lại đến khi nói trôi chảy, hiệu quả hơn đọc nhiều bài.</p>
      </section>
      {groups.map((g) => (
        <section key={g.kind} className="space-y-2">
          <h2 className={h2}>{g.title}</h2>
          <ul className="space-y-2">
            {sets
              .filter((s) => s.kind === g.kind)
              .map((s) => (
                <li key={s.id}>
                  <RowButton title={s.title} subtitle={`${s.subtitle} · ${s.sentences.length} câu`} onClick={() => onOpen(s)} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'done'; transcript: string; score: ShadowScore } | { kind: 'error'; message: string };

function ShadowView({ set, player, transcribe }: { set: ShadowSet; player: Player; transcribe: (b64: string, mime: string) => Promise<string> }) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [minePlaying, setMinePlaying] = useState(false);
  const [check, setCheck] = useState<Check>({ kind: 'idle' });
  const [scores, setScores] = useState<Record<string, number>>({});
  const recorder = useRecorder(45);
  const mine = useRef<HTMLAudioElement | null>(null);
  const sentence = set.sentences[index];
  const rate = slow ? 0.75 : 1;

  const stopMine = () => {
    mine.current?.pause();
    mine.current = null;
    setMinePlaying(false);
  };

  useEffect(() => () => mine.current?.pause(), []);

  const go = (i: number) => {
    player.stop();
    stopMine();
    recorder.clear();
    setCheck({ kind: 'idle' });
    setIndex(i);
  };

  const playMine = () => {
    if (!recorder.take) return;
    player.stop();
    stopMine();
    const a = new Audio(recorder.take.url);
    a.onended = () => mine.current === a && setMinePlaying(false);
    mine.current = a;
    setMinePlaying(true);
    void a.play().catch(() => setMinePlaying(false));
  };

  const playBoth = () => {
    stopMine();
    void player.play(sentence.clip, rate, playMine);
  };

  const toggleRecord = async () => {
    player.stop();
    stopMine();
    if (recorder.recording) {
      await recorder.stop();
    } else {
      setCheck({ kind: 'idle' });
      await recorder.start();
    }
  };

  const runCheck = async () => {
    const take = recorder.take;
    if (!take) return;
    setCheck({ kind: 'checking' });
    try {
      const transcript = await transcribe(await blobToBase64(take.blob), take.mimeType);
      const score = shadowScore(sentence.text, transcript);
      setCheck({ kind: 'done', transcript, score });
      setScores((s) => ({ ...s, [sentence.id]: Math.max(s[sentence.id] ?? 0, score.result.accuracy) }));
    } catch (err) {
      setCheck({ kind: 'error', message: aiErrorMessage(err) });
    }
  };

  const checked = Object.values(scores);
  const average = checked.length ? Math.round(checked.reduce((a, b) => a + b, 0) / checked.length) : null;
  const origLoading = player.loadingId === sentence.clip.id;
  const origPlaying = player.activeId === sentence.clip.id;

  return (
    <article className="space-y-5">
      <header>
        <p className={muted}>Shadowing · {set.subtitle}</p>
        <h1 className="mt-1 text-title font-bold text-slate-900 dark:text-white">{set.title}</h1>
      </header>

      <div className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <span className="block h-full rounded-full bg-tone-peach-accent transition-all" style={{ width: `${((index + 1) / set.sentences.length) * 100}%` }} />
        </span>
        <span className={`${muted} tabular-nums`}>
          Câu {index + 1}/{set.sentences.length}
          {average !== null && ` · TB ${average}%`}
        </span>
      </div>

      <section className={`${panel} space-y-4 p-4 sm:p-5`}>
        <div className="flex items-start gap-3">
          <p className={`min-w-0 flex-1 text-lg leading-relaxed ${hideText ? 'select-none text-transparent [text-shadow:0_0_8px_rgba(100,116,139,0.6)]' : 'text-slate-900 dark:text-white'}`} aria-hidden={hideText}>
            {sentence.text}
          </p>
          <button type="button" onClick={() => setHideText((v) => !v)} aria-pressed={hideText} className={`${ghostBtn} flex-shrink-0`} aria-label={hideText ? 'Hiện chữ' : 'Ẩn chữ'}>
            {hideText ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => player.toggle(sentence.clip, rate)} className={primaryBtn}>
            {origLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : origPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {origLoading ? 'Đang tải' : origPlaying ? 'Dừng' : '1. Nghe mẫu'}
          </button>
          <button type="button" role="switch" aria-checked={slow} onClick={() => setSlow((v) => !v)} className={`${chipBase} ${slow ? chipOn : chipOff}`}>
            Chậm 0.75×
          </button>
        </div>

        {recorder.supported ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleRecord}
              className={recorder.recording ? `${primaryBtn.replace('border-tone-periwinkle-border bg-tone-periwinkle-soft', 'border-tone-blush-border bg-tone-blush-soft').replace('text-tone-periwinkle-fg hover:bg-tone-periwinkle-border', 'text-tone-blush-fg hover:bg-tone-blush-border')}` : secondaryBtn}
            >
              {recorder.recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {recorder.recording ? `Dừng ${formatDuration(recorder.seconds)}` : recorder.take ? 'Ghi âm lại' : '2. Ghi âm'}
            </button>
            {recorder.take && !recorder.recording && (
              <>
                <button type="button" onClick={minePlaying ? stopMine : playMine} className={secondaryBtn}>
                  {minePlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />} Bản của tôi
                </button>
                <button type="button" onClick={playBoth} className={secondaryBtn}>
                  <Repeat className="h-4 w-4" /> 3. Nghe nối tiếp
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Trình duyệt này không ghi âm được. Hãy dùng Chrome hoặc Edge để shadowing.</p>
        )}
        {(recorder.error || player.error) && (
          <p role="alert" className="text-caption text-tone-blush-fg">
            {recorder.error || player.error}
          </p>
        )}

        {recorder.take && !recorder.recording && (
          <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            {check.kind === 'done' ? (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">{check.score.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${accuracyTone(check.score.result.accuracy)}`}>{check.score.result.accuracy}%</span>
                </p>
                <DictationTokens tokens={check.score.result.tokens} typedLabel="AI nghe thành" />
                <p className={muted}>AI nghe được: “{check.transcript}”</p>
                <p className={muted}>Gạch chân: từ AI không nghe thấy. Nền đỏ hoặc vàng: từ nghe chưa rõ. Thường là do mất âm cuối hoặc sai trọng âm.</p>
              </div>
            ) : (
              <button type="button" onClick={runCheck} disabled={check.kind === 'checking'} className={secondaryBtn}>
                {check.kind === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                {check.kind === 'checking' ? 'AI đang nghe…' : 'Kiểm tra từng từ (AI)'}
              </button>
            )}
            {check.kind === 'error' && (
              <p role="alert" className="text-caption text-tone-blush-fg">
                {check.message}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={secondaryBtn}>
          <ArrowLeft className="h-4 w-4" /> Câu trước
        </button>
        <button type="button" onClick={() => go(index + 1)} disabled={index + 1 >= set.sentences.length} className={`${primaryBtn} flex-1 sm:flex-none`}>
          Câu tiếp <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────

export default function IeltsSpeakingStudy({ userId, initialTab = 'part1', onBack, onPractice, resolveClip, transcribe = transcribeAudioWithGemini }: Props) {
  const [tab, setTab] = useState<SpeakingStudyTab>(initialTab);
  const [stack, setStack] = useState<Detail[]>([]);
  const player = useClipPlayer(resolveClip);
  const detail = stack[stack.length - 1];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [detail]);

  const open = (d: Detail) => {
    player.stop();
    setStack((s) => [...s, d]);
  };
  const back = () => {
    player.stop();
    if (stack.length) setStack((s) => s.slice(0, -1));
    else onBack();
  };
  const shadow = (id: string) => {
    const set = findShadowSet(id);
    if (set) open({ kind: 'shadow', set });
  };

  const backLabel = !detail ? 'Speaking' : stack.length > 1 ? 'Quay lại' : 'Học Speaking';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={back} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </button>

      {detail?.kind === 'pack' ? (
        <PackView pack={detail.pack} player={player} userId={userId} onPractice={onPractice} onShadow={() => shadow(detail.pack.id)} />
      ) : detail?.kind === 'card' ? (
        <CardView
          card={detail.card}
          player={player}
          userId={userId}
          onPractice={onPractice}
          onShadow={() => shadow(detail.card.id)}
          onStory={(story) => open({ kind: 'story', story })}
        />
      ) : detail?.kind === 'story' ? (
        <StoryView story={detail.story} onCard={(card) => open({ kind: 'card', card })} />
      ) : detail?.kind === 'theme' ? (
        <ThemeView theme={detail.theme} player={player} userId={userId} onPractice={onPractice} onShadow={() => shadow(detail.theme.id)} />
      ) : detail?.kind === 'sound' ? (
        <SoundView item={detail.item} player={player} />
      ) : detail?.kind === 'shadow' ? (
        <ShadowView key={detail.set.id} set={detail.set} player={player} transcribe={transcribe} />
      ) : (
        <>
          <header>
            <p className={muted}>IELTS Speaking</p>
            <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Học Speaking</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Ý tưởng và từ vựng theo chủ đề, bài mẫu band 6–7 có giải thích, phát âm cho người Việt và luyện shadowing.
            </p>
          </header>
          <div role="tablist" aria-label="Nội dung" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} onClick={() => setTab(t.id)} className={`${chipBase} ${t.id === tab ? chipOn : chipOff}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'part1' && (
            <ul className="space-y-2">
              {PART1_PACKS.map((p) => (
                <li key={p.id}>
                  <RowButton title={p.titleVi} subtitle={`${p.topic} · ${p.questions.length} câu hỏi · mẫu band 6 và 7`} onClick={() => open({ kind: 'pack', pack: p })} />
                </li>
              ))}
            </ul>
          )}
          {tab === 'part2' && <Part2List onCard={(card) => open({ kind: 'card', card })} onStory={(story) => open({ kind: 'story', story })} />}
          {tab === 'part3' && <Part3List onTheme={(theme) => open({ kind: 'theme', theme })} />}
          {tab === 'pronunciation' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">Những lỗi phát âm người Việt hay gặp nhất, kèm ví dụ nghe được và cặp từ dễ nhầm.</p>
              <ul className="space-y-2">
                {PRONUNCIATION_ITEMS.map((item) => (
                  <li key={item.id}>
                    <RowButton title={item.title} subtitle={item.sound} onClick={() => open({ kind: 'sound', item })} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'shadowing' && <ShadowList onOpen={(set) => open({ kind: 'shadow', set })} />}
        </>
      )}
    </div>
  );
}
