import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Headphones, Loader2, Mic, RotateCcw, Volume2 } from 'lucide-react';
import type { IeltsQuestion, IeltsSpeakingPart } from '../types';
import { transcribeAudioWithGemini } from '../services/ieltsSpeakingService';
import { cancelRecording, formatDuration } from '../services/speechService';
import { combineFluency, fluencyMetrics, type FluencyMetrics } from '../services/fluencyLogic';
import {
  buildMockScript,
  cueBullets,
  cueTitle,
  estimateMockMinutes,
  mockClip,
  mockQuestion,
  mockTranscript,
  type MockAnswer,
  type MockItem,
  type MockScript,
} from '../services/speakingPracticeLogic';
import { useClipPlayer, type ResolveClip } from '../components/ielts/listening/useClipPlayer';
import { useRecorder, type RecordedTake } from '../components/ielts/speaking/useRecorder';
import { analyzeTake, type Transcribe } from '../components/ielts/speaking/analyzeTake';
import RecordControls from '../components/ielts/speaking/RecordControls';
import CuePrep from '../components/ielts/speaking/CuePrep';
import { errorText, ghostBtn, label, muted, notice, panel, primaryBtn, secondaryBtn } from '../components/ielts/speaking/styles';

export interface MockSubmission {
  question: IeltsQuestion;
  transcript: string;
  audioBase64: string;
  audioMimeType: string;
  durationSeconds: number;
  fluency: FluencyMetrics | null;
  answers: MockAnswer[];
}

interface Props {
  onBack: () => void;
  onSubmit: (submission: MockSubmission) => void;
  isGrading: boolean;
  /** Swapped out in previews and tests. */
  resolveClip?: ResolveClip;
  transcribe?: Transcribe;
  script?: MockScript;
}

interface Result {
  item: MockItem;
  take: RecordedTake;
  status: 'working' | 'done' | 'error';
  transcript: string;
  rawTranscript: string | null;
  base64: string;
  rms: number[] | null;
  error: string | null;
}

type Stage = 'intro' | 'asking' | 'prep' | 'answer' | 'finish';

const PART_NAMES = ['', 'Part 1 · Phỏng vấn', 'Part 2 · Nói một mình', 'Part 3 · Thảo luận'];
const PART_KEYS: IeltsSpeakingPart[] = ['part_1', 'part_1', 'part_2', 'part_3'];

export default function IeltsSpeakingMock({
  onBack,
  onSubmit,
  isGrading,
  resolveClip,
  transcribe = transcribeAudioWithGemini,
  script: fixedScript,
}: Props) {
  const script = useMemo(() => fixedScript ?? buildMockScript(), [fixedScript]);
  const minutes = useMemo(() => estimateMockMinutes(script), [script]);
  const player = useClipPlayer(resolveClip);

  const [stage, setStage] = useState<Stage>('intro');
  const [pos, setPos] = useState(0);
  const [showText, setShowText] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [micError, setMicError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const posRef = useRef(pos);
  posRef.current = pos;

  const item = script.items[pos];
  const part = item?.part ?? 1;

  const analyze = (it: MockItem, take: RecordedTake) => {
    setResults((r) => ({
      ...r,
      [it.id]: { item: it, take, status: 'working', transcript: '', rawTranscript: null, base64: '', rms: null, error: null },
    }));
    queue.current = queue.current.then(async () => {
      const a = await analyzeTake(take, transcribe);
      setResults((r) => ({
        ...r,
        [it.id]: {
          item: it,
          take,
          status: a.transcript ? 'done' : 'error',
          transcript: a.transcript ?? '',
          rawTranscript: a.transcript,
          base64: a.base64,
          rms: a.rms,
          error: a.error,
        },
      }));
    });
  };

  const goTo = (next: number) => {
    if (next >= script.items.length) {
      setStage('finish');
      player.play(mockClip('closing', script.closing));
      return;
    }
    setPos(next);
    setShowText(false);
    ask(script.items[next]);
  };

  const handleTake = (take: RecordedTake) => {
    const it = script.items[posRef.current];
    analyze(it, take);
    goTo(posRef.current + 1);
  };

  const rec = useRecorder(item?.maxSeconds ?? 60, { onTake: handleTake });

  const ask = (it: MockItem) => {
    setStage('asking');
    player.play(mockClip(it.id, it.spoken), 1, () => afterQuestion(it));
  };

  const afterQuestion = (it: MockItem) => {
    if (it.part === 2) {
      setStage('prep');
      return;
    }
    setStage('answer');
    void rec.start();
  };

  const prepDone = useRef(false);
  const endPrep = () => {
    if (prepDone.current) return;
    prepDone.current = true;
    setStage('answer');
    player.play(mockClip('p2start', script.part2Start), 1, () => void rec.start());
  };

  useEffect(() => {
    if (stage === 'prep') prepDone.current = false;
  }, [stage]);

  useEffect(() => {
    if (!startedAt || stage === 'finish') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, stage]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage, pos]);

  const begin = async () => {
    setMicError(null);
    try {
      // Ask for the microphone now, while the click still counts as a gesture.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicError('Cần cho phép dùng micro để thi thử. Kiểm tra quyền micro của trình duyệt rồi thử lại.');
      return;
    }
    setStartedAt(Date.now());
    setNow(Date.now());
    ask(script.items[0]);
  };

  const answerNow = () => {
    player.stop();
    afterQuestion(item);
  };

  const exit = () => {
    player.stop();
    cancelRecording();
    onBack();
  };

  const list = script.items.map((it) => results[it.id]).filter((r): r is Result => !!r);
  const pending = list.some((r) => r.status === 'working');
  const ready = list.filter((r) => r.transcript.trim());

  const retry = (r: Result) => analyze(r.item, r.take);
  const setTyped = (id: string, text: string) => setResults((all) => ({ ...all, [id]: { ...all[id], transcript: text } }));

  const submit = () => {
    const answers: MockAnswer[] = ready.map((r) => ({ itemId: r.item.id, part: r.item.part, question: r.item.question, transcript: r.transcript.trim() }));
    const metrics = ready.map((r) =>
      fluencyMetrics({ transcript: r.rawTranscript ?? r.transcript, durationSeconds: r.take.durationSeconds, rms: r.rms }),
    );
    const p2 = ready.find((r) => r.item.part === 2) ?? ready.reduce((a, b) => (b.take.durationSeconds > a.take.durationSeconds ? b : a));
    onSubmit({
      question: mockQuestion(script),
      transcript: mockTranscript(answers),
      audioBase64: p2.base64,
      audioMimeType: p2.take.mimeType,
      durationSeconds: ready.reduce((s, r) => s + r.take.durationSeconds, 0),
      fluency: combineFluency(metrics),
      answers,
    });
  };

  const header = (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={exit} className={ghostBtn}>
        <ArrowLeft className="h-4 w-4" /> Thoát
      </button>
      {startedAt && (
        <span className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-300" aria-label="Thời gian đã thi">
          {formatDuration(Math.floor((now - startedAt) / 1000))}
        </span>
      )}
    </div>
  );

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-3xl space-y-5 pb-8">
        {header}
        <div className="space-y-2">
          <p className={label}>Thi thử Speaking</p>
          <h1 className="text-title text-slate-900 dark:text-white">Cả 3 phần như phòng thi thật</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Khoảng {Math.round(minutes)} phút. Giám khảo đọc câu hỏi, micro tự bật sau mỗi câu, AI chấm một lần khi bạn nộp bài.
          </p>
        </div>
        <ol className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
          {[
            ['Part 1', `${script.items.filter((i) => i.part === 1).length} câu hỏi ngắn về ${script.packs.map((p) => p.titleVi.toLowerCase()).join(', ')}. Mỗi câu trả lời 2–3 câu.`],
            ['Part 2', '1 phút chuẩn bị với ghi chú, rồi nói liên tục 1–2 phút về một cue card.'],
            ['Part 3', `${script.items.filter((i) => i.part === 3).length} câu thảo luận sâu hơn liên quan tới chủ đề Part 2.`],
          ].map(([name, text]) => (
            <li key={name} className="flex gap-3 p-4">
              <span className="w-14 flex-shrink-0 text-sm font-semibold text-slate-900 dark:text-white">{name}</span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
            </li>
          ))}
        </ol>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <Headphones className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-sky-fg" /> Nên đeo tai nghe để micro không thu tiếng giám khảo.
          </li>
          <li className="flex gap-2">
            <Volume2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-peach-fg" /> Không nghe rõ thì bấm Nghe lại, như khi xin giám khảo nhắc lại câu hỏi.
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" /> Trả lời xong thì bấm Dừng để sang câu tiếp. Câu nào cũng có giới hạn thời gian.
          </li>
        </ul>
        {!rec.supported && <p className={notice}>Trình duyệt này không ghi âm được. Hãy mở bằng Chrome, Edge hoặc Safari mới.</p>}
        {micError && (
          <p role="alert" className={errorText}>
            {micError}
          </p>
        )}
        <button type="button" onClick={() => void begin()} disabled={!rec.supported} className={`${primaryBtn} w-full sm:w-auto`}>
          <Mic className="h-4 w-4" /> Bắt đầu thi thử
        </button>
      </div>
    );
  }

  if (stage === 'finish') {
    return (
      <div className="mx-auto max-w-3xl space-y-5 pb-8">
        {header}
        <div className="space-y-1">
          <p className={label}>Hết giờ thi</p>
          <h1 className="text-title text-slate-900 dark:text-white">Nộp bài để AI chấm</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {pending ? 'Đang chuyển các câu trả lời thành chữ…' : `${ready.length}/${list.length} câu trả lời sẵn sàng.`}
          </p>
        </div>
        <ol className="space-y-3">
          {list.map((r, i) => (
            <li key={r.item.id} className={`${panel} space-y-2 p-4`}>
              <p className={muted}>
                {PART_NAMES[r.item.part]} · câu {i + 1} · {formatDuration(r.take.durationSeconds)}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {r.item.part === 2 ? cueTitle(r.item.question) : r.item.question}
              </p>
              {r.status === 'working' && (
                <p className={`${muted} flex items-center gap-2`}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang nghe…
                </p>
              )}
              {r.status === 'done' && <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{r.transcript}</p>}
              {r.status === 'error' && (
                <div className="space-y-2">
                  <p className={`${errorText} flex gap-2`}>
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {r.error}
                  </p>
                  <button type="button" onClick={() => retry(r)} className={secondaryBtn}>
                    <RotateCcw className="h-4 w-4" /> Thử lại
                  </button>
                  <textarea
                    value={r.transcript}
                    onChange={(e) => setTyped(r.item.id, e.target.value)}
                    rows={3}
                    placeholder="Hoặc gõ lại câu bạn đã nói (để trống thì bỏ câu này)"
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
        <button type="button" onClick={submit} disabled={pending || isGrading || ready.length === 0} className={`${primaryBtn} w-full sm:w-auto`}>
          {isGrading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Đang chấm cả bài… (~15-20s)
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Nộp bài chấm
            </>
          )}
        </button>
      </div>
    );
  }

  const asking = stage === 'asking';
  const clipBusy = player.loadingId !== null || player.activeId !== null;
  const bullets = item.part === 2 ? cueBullets(item.question) : [];
  const partItems = script.items.filter((i) => i.part === part);
  const inPart = partItems.indexOf(item) + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      {header}
      <div className="space-y-2">
        <div className="flex gap-1" aria-hidden="true">
          {[1, 2, 3].map((p) => (
            <span key={p} className={`h-1.5 flex-1 rounded-full ${p < part ? 'bg-tone-mint-accent' : p === part ? 'bg-tone-blush-accent' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
        <p className={muted}>
          {PART_NAMES[part]}
          {part !== 2 && ` · câu ${inPart}/${partItems.length}`}
        </p>
      </div>

      {stage === 'prep' ? (
        <CuePrep prompt={item.question} notes={notes} setNotes={setNotes} onDone={endPrep} />
      ) : (
        <section className={`${panel} space-y-4 p-4 sm:p-5`}>
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${clipBusy ? 'bg-tone-blush text-tone-blush-fg' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
              aria-hidden="true"
            >
              {player.loadingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {asking ? (player.loadingId ? 'Đang tải câu hỏi…' : 'Giám khảo đang hỏi…') : rec.recording ? 'Bạn đang trả lời' : 'Giám khảo'}
              </p>
              {item.part === 2 ? (
                <div className="space-y-1">
                  <p className="text-heading text-slate-900 dark:text-white">{cueTitle(item.question)}</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-200">
                    {bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : showText || player.error ? (
                <p className="text-title text-slate-900 dark:text-white">{item.question}</p>
              ) : (
                <p className={muted}>Nghe câu hỏi như trong phòng thi. Cần thì bấm hiện chữ.</p>
              )}
            </div>
          </div>

          {player.error && (
            <p role="alert" className={errorText}>
              Không phát được giọng giám khảo ({player.error}). Đọc câu hỏi trên màn hình rồi trả lời.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {item.part !== 2 && !rec.recording && (
              <button type="button" onClick={() => player.play(mockClip(`${item.id}:repeat`, item.question), 1, asking ? () => afterQuestion(item) : undefined)} disabled={clipBusy} className={secondaryBtn}>
                <Volume2 className="h-4 w-4" /> Nghe lại
              </button>
            )}
            {item.part !== 2 && (
              <button type="button" onClick={() => setShowText((v) => !v)} className={secondaryBtn} aria-pressed={showText}>
                {showText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showText ? 'Ẩn chữ' : 'Hiện chữ'}
              </button>
            )}
            {asking && (
              <button type="button" onClick={answerNow} className={secondaryBtn}>
                {item.part === 2 ? 'Bắt đầu chuẩn bị' : 'Trả lời ngay'} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {item.part === 2 && notes.some((n) => n?.trim()) && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className={label}>Ghi chú của bạn</p>
              <ol className="mt-1 grid gap-1 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200">
                {notes.map((n, i) => (n?.trim() ? <li key={i}>{`${i + 1}. ${n}`}</li> : null))}
              </ol>
            </div>
          )}

          {!asking && (
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <RecordControls rec={rec} part={PART_KEYS[part]} maxSeconds={item.maxSeconds} startLabel="Bắt đầu trả lời" disabled={clipBusy} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
