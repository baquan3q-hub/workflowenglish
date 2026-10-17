import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Keyboard, Loader2, Play, RotateCcw, Square } from 'lucide-react';
import { LISTENING_TESTS, PART_DESCRIPTIONS_VI, type ListeningSection } from '../data/ielts/listening';
import { compareDictation, dictationLines, type DictationResult, type DictationToken } from '../services/listeningDrillLogic';
import { useClipPlayer, type ResolveClip } from '../components/ielts/listening/useClipPlayer';

interface Props {
  /** Part to start on; without it the learner picks one. */
  section?: ListeningSection;
  onBack: () => void;
  resolveClip?: ResolveClip;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

const TOKEN_CLASS: Record<DictationToken['status'], string> = {
  ok: 'text-slate-900 dark:text-white',
  close: 'rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  wrong: 'rounded bg-rose-100 px-0.5 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100',
  missed: 'rounded px-0.5 text-rose-700 underline decoration-dotted underline-offset-4 dark:text-rose-300',
  extra: 'text-slate-400 line-through dark:text-slate-500',
};

function Tokens({ tokens }: { tokens: DictationToken[] }) {
  return (
    <p className="text-base leading-loose">
      {tokens.map((t, i) => (
        <React.Fragment key={i}>
          <span className={TOKEN_CLASS[t.status]} title={t.typed ? `Bạn viết: ${t.typed}` : undefined}>
            {t.word}
            {t.typed && <span className="ml-1 text-caption line-through opacity-70">{t.typed}</span>}
          </span>{' '}
        </React.Fragment>
      ))}
    </p>
  );
}

function accuracyTone(a: number) {
  return a >= 90 ? 'text-emerald-600 dark:text-emerald-400' : a >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
}

function PartPicker({ onPick }: { onPick: (s: ListeningSection) => void }) {
  return (
    <ul className="space-y-3">
      {LISTENING_TESTS.map((test) => (
        <li key={test.id} className={`${panel} p-4`}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {test.sections.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  className="-mx-2 flex min-h-touch w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-900 dark:text-white">
                      Part {s.part}: {s.title}
                    </span>
                    <span className="block text-caption text-slate-500 dark:text-slate-400">
                      {PART_DESCRIPTIONS_VI[s.part]} · {dictationLines(s).length} câu
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export default function IeltsListeningDictation({ section: initial, onBack, resolveClip }: Props) {
  const [section, setSection] = useState<ListeningSection | undefined>(initial);
  const lines = useMemo(() => (section ? dictationLines(section) : []), [section]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<DictationResult | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [slow, setSlow] = useState(false);
  const [plays, setPlays] = useState(0);
  const clip = useClipPlayer(resolveClip);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const line = lines[index];
  const done = section && index >= lines.length;

  const pick = (s?: ListeningSection) => {
    clip.stop();
    setSection(s);
    setIndex(0);
    setTyped('');
    setResult(null);
    setScores({});
    setPlays(0);
  };

  const go = (i: number) => {
    clip.stop();
    setIndex(i);
    setTyped('');
    setResult(null);
    setPlays(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const play = () => {
    if (!line) return;
    if (clip.activeId !== line.id && clip.loadingId !== line.id) setPlays((n) => n + 1);
    clip.toggle(line.clip, slow ? 0.75 : 1);
  };

  const check = () => {
    if (!line || !typed.trim()) return;
    const r = compareDictation(line.text, typed);
    setResult(r);
    setScores((s) => ({ ...s, [line.id]: Math.max(s[line.id] ?? 0, r.accuracy) }));
  };

  const scored = Object.values(scores);
  const average = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
  const weak = lines.filter((l) => scores[l.id] !== undefined && scores[l.id] < 80);
  const playing = line && clip.activeId === line.id;
  const loading = line && clip.loadingId === line.id;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={section && !initial ? () => pick() : onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> {section && !initial ? 'Chọn part' : 'Quay lại'}
      </button>

      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Listening · Luyện kỹ năng</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Chép chính tả</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {section
            ? `Part ${section.part}: ${section.title}`
            : 'Nghe từng câu trong bài và gõ lại. Cách luyện tốt nhất để bắt kịp tốc độ nói, nối âm và âm cuối.'}
        </p>
      </header>

      {!section && <PartPicker onPick={pick} />}

      {line && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="block h-full rounded-full bg-slate-900 transition-all dark:bg-white" style={{ width: `${(index / lines.length) * 100}%` }} />
            </span>
            <span className="text-caption tabular-nums text-slate-500 dark:text-slate-400">
              Câu {index + 1}/{lines.length}
            </span>
          </div>

          <section className={`${panel} space-y-4 p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={play} className={primaryBtn}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {loading ? 'Đang tải' : playing ? 'Dừng' : plays ? 'Nghe lại' : 'Nghe'}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={slow}
                onClick={() => setSlow((v) => !v)}
                className={`${secondaryBtn} ${slow ? 'border-slate-900 dark:border-white' : ''}`}
              >
                Chậm 0.75×
              </button>
              <span className="ml-auto text-caption text-slate-500 dark:text-slate-400">
                {line.speaker} · {line.text.split(/\s+/).length} từ{plays > 0 && ` · đã nghe ${plays} lần`}
              </span>
            </div>
            {clip.error && (
              <p role="alert" className="text-caption text-rose-600 dark:text-rose-400">
                {clip.error}
              </p>
            )}

            <label className="block">
              <span className="sr-only">Câu bạn nghe được</span>
              <textarea
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!result) check();
                  }
                }}
                readOnly={!!result}
                rows={3}
                placeholder="Gõ lại những gì bạn nghe được…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 read-only:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:read-only:bg-slate-900"
              />
            </label>

            {result && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">Bản gốc</span>
                  <span className={`text-sm font-bold tabular-nums ${accuracyTone(result.accuracy)}`}>{result.accuracy}%</span>
                </p>
                <Tokens tokens={result.tokens} />
                <p className="text-caption text-slate-500 dark:text-slate-400">
                  Gạch chân: từ bị sót. Nền đỏ: nghe sai. Nền vàng: gần đúng, sai chính tả. Gạch ngang: từ thừa.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {result ? (
                <>
                  <button type="button" onClick={() => go(index + 1)} className={primaryBtn}>
                    {index + 1 < lines.length ? 'Câu tiếp' : 'Xem tổng kết'} <ArrowRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => go(index)} className={secondaryBtn}>
                    <RotateCcw className="h-4 w-4" /> Làm lại câu này
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={check} disabled={!typed.trim()} className={primaryBtn}>
                    <Check className="h-4 w-4" /> Kiểm tra
                  </button>
                  <button type="button" onClick={() => go(index + 1)} className={secondaryBtn}>
                    Bỏ qua
                  </button>
                </>
              )}
            </div>
          </section>
          <p className="text-caption text-slate-500 dark:text-slate-400">
            Mẹo: nghe hết cả câu rồi mới gõ, đừng dừng giữa chừng. Nhấn Enter để kiểm tra.
          </p>
        </>
      )}

      {done && (
        <section className={`${panel} space-y-4 p-4 sm:p-5`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Keyboard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Xong part này</h2>
              <p className="text-caption text-slate-500 dark:text-slate-400">
                {scored.length ? `Đã làm ${scored.length}/${lines.length} câu, đúng trung bình ${average}% số từ.` : 'Bạn đã bỏ qua tất cả các câu.'}
              </p>
            </div>
          </div>
          {weak.length > 0 && (
            <div>
              <p className="text-caption font-semibold text-slate-700 dark:text-slate-300">Nên làm lại ({weak.length} câu dưới 80%)</p>
              <ul className="mt-2 space-y-1.5">
                {weak.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => go(lines.indexOf(l))}
                      className="-mx-2 flex min-h-touch w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    >
                      <span className={`w-10 flex-shrink-0 font-bold tabular-nums ${accuracyTone(scores[l.id])}`}>{scores[l.id]}%</span>
                      <span className="line-clamp-1">{l.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => go(0)} className={primaryBtn}>
              <RotateCcw className="h-4 w-4" /> Làm lại từ đầu
            </button>
            <button type="button" onClick={initial ? onBack : () => pick()} className={secondaryBtn}>
              {initial ? 'Quay lại' : 'Chọn part khác'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
