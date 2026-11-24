import React, { useEffect, useRef, useState } from 'react';
import { prerequisite } from '../../data/grammar/catalog';
import { transfer } from '../../data/grammar/transfer';
import { Volume2 } from 'lucide-react';
import type { GrammarLesson } from '../../data/grammar/types';
import { useRecorder } from '../ielts/speaking/useRecorder';
import { analyzeTake } from '../ielts/speaking/analyzeTake';
import { transcribeAudioWithGemini } from '../../services/ieltsSpeakingService';
import { speakText } from '../../services/browserSpeech';
import { aiErrorMessage, invokeAi } from '../../services/aiClient';
import { parseGrammarGrade } from '../../supabase/functions/ai-proxy/ops/grammar';
import { cloze, normalize, production, promptFor, type Evidence, type Session } from '../../services/grammarLogic';
import WordPicker from '../ielts/WordPicker';

export const kindLabels = {
  choice: 'Chọn đáp án',
  fill: 'Điền phần còn thiếu',
  translate: 'Dịch sang tiếng Anh',
  write: 'Viết câu',
  speak: 'Nói thành câu',
};
const plain = (en: string) => en.replace(/[\[\]]/g, '');
function Examples({ lesson, user }: { lesson: GrammarLesson; user: string }) {
  const [note, setNote] = useState('');
  return (
    <section className="gr-examples">
      <h3>Quan sát hai câu</h3>
      {lesson.examples.map(({ en, vi }) => (
        <div key={en} className="gr-example">
          <p lang="en">
            {en.split(/(\[[^\]]+\])/).map((part, i) =>
              part.startsWith('[') ? (
                <button key={i} className="gr-token" onClick={() => setNote(plain(part) + ' · ' + lesson.rule)}>
                  {plain(part)}
                </button>
              ) : (
                part
              )
            )}
            <button className="gr-sound" aria-label={'Nghe ' + plain(en)} onClick={() => speakText(plain(en))}>
              <Volume2 size={17} />
            </button>
          </p>
          <small>{vi}</small>
        </div>
      ))}
      <p aria-live="polite">{note || lesson.rule}</p>
      <details className="gr-trap">
        <summary>Lỗi thường gặp</summary>
        <p lang="en">
          <del>{transfer[lesson.id].wrong}</del> → {transfer[lesson.id].right}
        </p>
        <p>{transfer[lesson.id].why}</p>
      </details>
      <WordPicker userId={user} text={lesson.examples.map((e) => plain(e.en)).join(' ')} />
    </section>
  );
}
interface Props {
  lesson: GrammarLesson;
  session: Session;
  events: Evidence[];
  user: string;
  theme: string;
  update: (s: Session) => void;
  onRecord: (e: Evidence) => void;
  onNext: () => void;
  onPause: () => void;
}
export function gradeOpen(
  lesson: GrammarLesson,
  e: Pick<Evidence, 'skill' | 'item' | 'kind' | 'answer'>,
  theme: string
) {
  return invokeAi<unknown>('gradeGrammarProduction', {
    goal: lesson.goal,
    rule: lesson.rule,
    prompt: promptFor(lesson, e),
    answer: e.answer,
    theme,
  }).then(parseGrammarGrade);
}

export default function GrammarSession({
  lesson,
  session: s,
  events,
  user,
  theme,
  update,
  onRecord,
  onNext,
  onPause,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const t = s.tasks[s.index];
  const open = production(t.kind);
  const gap = open ? null : cloze(lesson.items[t.item]);
  const result = events.find((e) => e.id === s.lastId);
  const practice = s.mode === 'lesson' || s.mode === 'review';
  const prompt = promptFor(lesson, t);
  const choices = gap ? [gap.correct, gap.distractor] : [];
  if ((s.id.charCodeAt(0) + t.item + s.index * 3 + lesson.id.length) % 3 !== 0) choices.reverse();
  const recorder = useRecorder(45);
  const set = (patch: Partial<Session>) => update({ ...s, ...patch });
  async function transcribe() {
    if (!recorder.take || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await analyzeTake(recorder.take, transcribeAudioWithGemini);
      if (!alive.current) return;
      if (r.transcript) set({ answer: r.transcript, spoken: true });
      else setError(r.error || 'Chưa nhận được lời nói.');
    } catch (e) {
      if (alive.current) setError(aiErrorMessage(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function askHint() {
    set({ hinted: true });
    setBusy(true);
    setError('');
    try {
      const r = await invokeAi<{ hint: string }>('explainGrammar', {
        goal: lesson.goal,
        rule: lesson.rule,
        prompt,
        answer: s.answer,
        theme,
      });
      if (alive.current) setHint(r.hint);
    } catch (e) {
      if (alive.current) setError(aiErrorMessage(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function submit() {
    if (!s.answer.trim() || busy || result) return;
    setBusy(true);
    setError('');
    const e: Evidence = {
      ...t,
      id: crypto.randomUUID(),
      session: s.id,
      at: new Date().toISOString(),
      mode: s.mode,
      version: 1,
      prompt,
      expected: gap?.correct,
      delayedReview: s.delayedReview,
      answer: s.answer.trim(),
      assisted: s.hinted || remedial,
      typedFallback: t.kind === 'speak' && !s.spoken,
      result: 'pending',
    };
    if (gap) e.result = normalize(s.answer) === normalize(gap.correct) ? 'correct' : 'incorrect';
    else {
      // Preserve the submission even if the tab closes while the proxy is grading.
      onRecord({ ...e });
      set({ lastId: e.id });
      try {
        e.feedback = await gradeOpen(lesson, e, theme);
        e.result = e.feedback.meaningKept && e.feedback.targetMet ? 'correct' : 'incorrect';
      } catch (err) {
        if (alive.current) setError(aiErrorMessage(err));
      }
    }
    if (!alive.current) return;
    onRecord(e);
    set({ lastId: e.id });
    setBusy(false);
  }
  const repeatedErrors = events
    .filter((e) => e.skill === lesson.id && ['correct', 'incorrect'].includes(e.result))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 2);
  const remedial =
    practice && repeatedErrors.length === 2 && repeatedErrors.every((e) => e.result === 'incorrect');
  return (
    <>
      <div className="gr-bar">
        <button className="gr-link" disabled={busy} onClick={onPause}>
          ← Tạm dừng
        </button>
        <span>{s.started ? 'Câu ' + (s.index + 1) + ' / ' + s.tasks.length : 'Khám phá cấu trúc'}</span>
      </div>
      <progress aria-label="Tiến độ phiên học" value={s.index} max={s.tasks.length} />
      <h1>{lesson.title}</h1>
      {!s.started ? (
        <>
          <p>{lesson.goal}</p>
          {prerequisite(lesson.id) && <small>Kiến thức học trước · {prerequisite(lesson.id)?.title}</small>}
          <Examples lesson={lesson} user={user} />
          <button className="gr-primary" onClick={() => set({ started: true })}>
            Bắt đầu luyện tập
          </button>
        </>
      ) : (
        <section className="gr-sheet">
          <p className="gr-context">{kindLabels[t.kind]}</p>
          <h2 lang={open ? 'vi' : 'en'}>{prompt}</h2>
          {t.kind === 'choice' && (
            <div className="gr-options">
              {choices.map((c) => (
                <button
                  key={c}
                  aria-pressed={s.answer === c}
                  disabled={!!result || busy}
                  onClick={() => set({ answer: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {t.kind === 'fill' && (
            <p>
              Chọn dạng phù hợp rồi tự điền <b lang="en">{choices.join(' / ')}</b>.
            </p>
          )}
          {t.kind === 'speak' && !result && (
            <div className="gr-voice">
              {recorder.supported && (
                <button
                  className="gr-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (recorder.recording) void recorder.stop();
                    else {
                      set({ spoken: false });
                      void recorder.start();
                    }
                  }}
                >
                  <img src="/grammar/mic.svg" alt="" />
                  {recorder.recording ? 'Dừng ghi · ' + recorder.seconds + ' giây' : 'Ghi âm'}
                </button>
              )}
              {recorder.take && (
                <>
                  <audio controls src={recorder.take.url} />
                  <button disabled={busy || recorder.recording} className="gr-link" onClick={transcribe}>
                    Chuyển lời nói thành chữ
                  </button>
                </>
              )}
              <p>
                {recorder.error ||
                  (s.spoken
                    ? 'Kiểm tra bản chép lời trước khi xác nhận.'
                    : 'Bạn cũng có thể nhập câu trả lời để luyện viết.')}
              </p>
            </div>
          )}
          {theme && production(t.kind) && t.kind !== 'translate' && practice && (
            <small>Gợi ý khi tự đặt câu · {theme}</small>
          )}
          {t.kind !== 'choice' && (
            <label className="gr-input">
              {t.kind === 'speak' && s.spoken ? 'Bản chép lời' : 'Câu trả lời của bạn'}
              <textarea
                lang="en"
                maxLength={1200}
                rows={open ? 3 : 1}
                disabled={!!result || busy || recorder.recording}
                value={s.answer}
                onChange={(e) => set({ answer: e.target.value })}
              />
            </label>
          )}
          {!result && practice && (
            <div className="gr-help">
              <button className="gr-link" disabled={busy} onClick={() => set({ hinted: true })}>
                Xem gợi ý
              </button>
              <button className="gr-link" disabled={busy} onClick={askHint}>
                Hỏi trợ giảng AI
              </button>
              {(s.hinted || remedial) && (
                <aside>
                  {hint || lesson.rule}
                  {remedial && (
                    <p lang="en">
                      {plain(lesson.examples[0].en)} · {plain(lesson.examples[1].en)}
                    </p>
                  )}
                </aside>
              )}
            </div>
          )}
          {error && <p role="status">{error}</p>}
          {!result ? (
            <button
              className="gr-primary"
              disabled={!s.answer.trim() || busy || recorder.recording}
              onClick={submit}
            >
              {busy ? 'Đang xử lý…' : s.spoken ? 'Xác nhận lời nói và kiểm tra' : 'Kiểm tra câu trả lời'}
            </button>
          ) : (
            <div className={'gr-feedback ' + result.result} aria-live="polite">
              <h3>
                {result.result === 'correct'
                  ? 'Bạn dùng đúng rồi'
                  : result.result === 'pending'
                    ? busy
                      ? 'Đang nhận xét…'
                      : 'Chờ nhận xét'
                    : 'Thử nhìn lại cấu trúc'}
              </h3>
              {result.feedback ? (
                <>
                  <p>{result.feedback.explanationVi}</p>
                  <small>
                    Giữ đúng ý · {result.feedback.meaningKept ? 'Đạt' : 'Cần xem lại'}　 Cấu trúc ·{' '}
                    {result.feedback.targetMet ? 'Đạt' : 'Cần xem lại'}
                  </small>
                  {result.feedback.corrected && (
                    <p lang="en">
                      <del>{result.feedback.original}</del> → {result.feedback.corrected}
                    </p>
                  )}
                  {result.feedback.retryVi && <p>{result.feedback.retryVi}</p>}
                </>
              ) : (
                <p>
                  {gap ? (
                    <>
                      <b lang="en">{prompt.replace('_____', gap.correct)}</b>
                      <br />
                      {lesson.rule}
                    </>
                  ) : (
                    'Câu trả lời đã được giữ trong Sổ lỗi để nhận xét lại. ' + lesson.rule
                  )}
                </p>
              )}
              {result.result === 'incorrect' && practice && (
                <button className="gr-secondary" onClick={() => set({ lastId: undefined, hinted: true })}>
                  Sửa câu của mình
                </button>
              )}
              <button className="gr-primary" disabled={busy} onClick={onNext}>
                {s.index + 1 === s.tasks.length ? 'Xem kết quả' : 'Câu tiếp theo'}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
