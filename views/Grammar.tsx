import React, { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { advanced, curriculum, loadLessons, prerequisite, units } from '../data/grammar/catalog';
import type { GrammarLesson } from '../data/grammar/types';
import {
  advance,
  makeSession,
  recommend,
  skillStats,
  type Evidence,
  type Mode,
  type Session,
} from '../services/grammarLogic';
import { getDraft, getEvents, record, saveDraft, syncGrammar } from '../services/grammarStore';
import { getMasteredWordsList } from '../services/recommendationService';
import { getLearningProfile } from '../services/learningProfileService';
import { EMPTY_PROFILE, GOAL_LABELS, INTEREST_LABELS } from '../services/learningProfileLogic';
import GrammarSession, { gradeOpen, kindLabels } from '../components/grammar/GrammarSession';
import { aiErrorMessage } from '../services/aiClient';
import './grammar.css';

const GrammarLibrary = lazy(() => import('../components/grammar/GrammarLibrary'));

type Page = 'library' | 'home' | 'map' | 'book' | 'session' | 'result';
interface Props {
  user: string;
  initialSkill?: string;
  onExit: () => void;
  onFocus: (focused: boolean) => void;
}
const labels: Record<Mode, string> = {
  lesson: 'Bài học',
  placement: 'Tìm điểm bắt đầu',
  checkpoint: 'Kiểm tra cụm',
  review: 'Ôn lại',
};
const skillName = (id: string) => curriculum.find((s) => s.id === id)?.title || id;
export default function Grammar({ user, initialSkill, onExit, onFocus }: Props) {
  const [page, setPage] = useState<Page>(initialSkill ? 'home' : 'library');
  const [events, setEvents] = useState(() => getEvents(user));
  const [session, setSession] = useState(() => getDraft(user));
  const [lessons, setLessons] = useState<GrammarLesson[]>([]);
  const [summary, setSummary] = useState<Session | null>(null);
  const [profile, setProfile] = useState({ ...EMPTY_PROFILE });
  const [knownWords, setKnownWords] = useState<string[]>([]);
  const [replace, setReplace] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const alive = useRef(true);
  const syncing = useRef(false);
  const pullHistory = useRef(true);
  const queued = useRef(false);
  useEffect(() => {
    alive.current = true;
    void getLearningProfile(user)
      .then((p) => {
        if (alive.current) setProfile(p);
      })
      .catch(() => {});
    void getMasteredWordsList(user)
      .then((words) => {
        if (alive.current) setKnownWords(words.slice(0, 3));
      })
      .catch(() => {});
    const refresh = () => {
      pullHistory.current = true;
      setSyncTick((n) => n + 1);
    };
    const storage = () => {
      if (alive.current) setEvents(getEvents(user));
    };
    window.addEventListener('online', refresh);
    window.addEventListener('storage', storage);
    return () => {
      alive.current = false;
      window.removeEventListener('online', refresh);
      window.removeEventListener('storage', storage);
    };
  }, [user]);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (syncing.current) {
        queued.current = true;
        return;
      }
      syncing.current = true;
      const pull = pullHistory.current;
      pullHistory.current = false;
      try {
        await syncGrammar(user, pull);
        if (alive.current) {
          setEvents(getEvents(user));
          setSyncMessage('');
        }
      } catch {
        if (pull) pullHistory.current = true;
        if (alive.current) setSyncMessage('Tiến độ đã lưu trên thiết bị.');
      } finally {
        syncing.current = false;
        if (queued.current && alive.current) {
          queued.current = false;
          setSyncTick((n) => n + 1);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [user, syncTick]);
  useEffect(() => {
    onFocus(page === 'session');
    return () => onFocus(false);
  }, [page, onFocus]);
  const theme = [
    profile.goal ? GOAL_LABELS[profile.goal] : '',
    ...profile.interests.map((i) => INTEREST_LABELS[i]),
    knownWords.length ? 'Từ quen thuộc: ' + knownWords.join(', ') : '',
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 250);
  const update = (s: Session | null) => {
    saveDraft(user, s);
    setSession(s);
  };
  const persist = (e: Evidence) => {
    record(user, e);
    setEvents(getEvents(user));
    setSyncTick((n) => n + 1);
  };
  const suggestion = recommend(events);
  const stats = useMemo(() => curriculum.map((s) => skillStats(events, s.id)), [events]);
  const mastered = stats.filter((s) => s.mastered).length;
  const graded = events.filter((e) => e.result === 'correct' || e.result === 'incorrect');
  const accuracy = (arr: Evidence[]) =>
    arr.length
      ? Math.round((100 * arr.filter((e) => e.result === 'correct').length) / arr.length) + '%'
      : 'Chưa có';
  async function open(s: Session) {
    setBusy(true);
    setMessage('');
    try {
      const pack = await loadLessons(s.tasks.map((t) => t.skill));
      if (!alive.current) return;
      setLessons(pack);
      update(s);
      setReplace(null);
      setPage('session');
    } catch {
      if (alive.current) setMessage('Chưa tải được cụm bài. Kết nối mạng rồi thử lại.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function start(mode: Mode, skill: string) {
    const next = makeSession(mode, skill, events, profile.minutesPerDay || 15);
    if (session) {
      setReplace(next);
      return;
    }
    void open(next);
  }
  function next() {
    if (!session) return;
    const s = advance(session, events);
    if (s.index < s.tasks.length) {
      update(s);
      return;
    }
    const t = session.tasks[0];
    persist({
      ...t,
      id: session.id,
      session: session.id,
      at: new Date().toISOString(),
      mode: session.mode,
      version: 1,
      result: 'finished',
      assisted: false,
      typedFallback: false,
      answer: '',
    });
    setSummary(session);
    update(null);
    setPage('result');
  }
  async function retry(e: Evidence) {
    setBusy(true);
    setMessage('');
    try {
      const [lesson] = await loadLessons([e.skill]);
      const feedback = await gradeOpen(lesson, e, theme);
      if (alive.current)
        persist({ ...e, feedback, result: feedback.meaningKept && feedback.targetMet ? 'correct' : 'incorrect' });
    } catch (err) {
      if (alive.current) setMessage(aiErrorMessage(err));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const task = session?.tasks[session.index];
  const lesson = lessons.find((l) => l.id === task?.skill);
  const pending = events.filter((e) => e.result === 'pending');
  const returned = events
    .filter((e) => e.feedback && e.result !== 'pending')
    .sort((a, b) => b.at.localeCompare(a.at));
  const firstVisit = !events.some((e) => e.result === 'finished');
  const practiceId = initialSkill || suggestion.skill.id;
  const goRecommended = () =>
    session ? void open(session) : start(initialSkill ? 'lesson' : suggestion.mode, practiceId);
  const resultEvents = events.filter((e) => e.session === summary?.id && e.result !== 'finished');
  return (
    <main className="grammar" aria-label="Học ngữ pháp">
      {page !== 'session' && (
        <div className="gr-bar">
          <button className="gr-link" onClick={onExit}>
            ← {initialSkill ? 'Nhận xét Writing' : 'Trang học'}
          </button>
          <span>{syncMessage}</span>
        </div>
      )}
      {page !== 'session' && page !== 'result' && (
        <>
          <h1>Ngữ pháp</h1>
          <nav aria-label="Mục ngữ pháp" className="gr-tabs">
            {(
              [
                ['library', 'Học ngữ pháp'],
                ['home', 'Luyện tập'],
                ['map', 'Lộ trình luyện tập'],
                ['book', 'Sổ lỗi'],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => {
                  setPage(id);
                  setReplace(null);
                  setMessage('');
                }}
              >
                {name}
              </button>
            ))}
          </nav>
        </>
      )}
      {page === 'library' && <GrammarLibrary user={user} />}
      {page === 'home' && (
        <>
          <section className="gr-hero">
            <div>
              <p className="gr-context">
                {session
                  ? 'Phiên đang học'
                  : initialSkill
                    ? 'Luyện từ bài Writing'
                    : firstVisit
                      ? 'Bắt đầu từ nền tảng'
                      : 'Bài dành cho bạn'}
              </p>
              <h2>{session ? skillName(session.tasks[session.index].skill) : skillName(practiceId)}</h2>
              <p>
                {session
                  ? 'Tiếp tục từ câu ' + (session.index + 1) + ' trong ' + session.tasks.length + ' câu.'
                  : initialSkill
                    ? 'Cấu trúc này liên quan đến lỗi trong bài viết của bạn.'
                    : suggestion.reason}
              </p>
              <button className="gr-primary" disabled={busy} onClick={goRecommended}>
                {session ? 'Học tiếp' : suggestion.mode === 'review' && !initialSkill ? 'Ôn ngay' : 'Vào bài học'}
              </button>
              {session && initialSkill && session.tasks[session.index].skill !== initialSkill && (
                <button className="gr-link" onClick={() => start('lesson', initialSkill)}>
                  Mở bài từ Writing
                </button>
              )}
            </div>
            <img width="78" height="78" src="/grammar/map.svg" alt="" />
          </section>
          <div className="gr-bar">
            <div>
              <h3>Tìm điểm bắt đầu</h3>
              <p>12 câu ngắn qua sáu cụm kiến thức.</p>
            </div>
            <button className="gr-secondary" disabled={busy} onClick={() => start('placement', curriculum[0].id)}>
              Làm chẩn đoán
            </button>
          </div>
          <h2>Tiến độ của bạn</h2>
          <dl className="gr-stats">
            <div>
              <dt>Kỹ năng đã vận dụng</dt>
              <dd>{mastered} / 24</dd>
            </div>
            <div>
              <dt>Đúng khi tự làm</dt>
              <dd>{accuracy(graded.filter((e) => !e.assisted))}</dd>
            </div>
            <div>
              <dt>Đúng khi ôn trễ</dt>
              <dd>{accuracy(graded.filter((e) => e.mode === 'review' && !e.assisted && e.delayedReview))}</dd>
            </div>
          </dl>
          {pending.length > 0 && (
            <button className="gr-link" onClick={() => setPage('book')}>
              Xem {pending.length} câu chờ nhận xét
            </button>
          )}
        </>
      )}
      {page === 'map' && (
        <>
          <h2>Lộ trình nền tảng</h2>
          {units.map((name, i) => (
            <details key={name} className="gr-unit" open={i + 1 === suggestion.skill.group || undefined}>
              <summary>
                <small>
                  Cụm {i + 1} · {i < 3 ? 'A1' : 'A1–A2'}
                </small>
                <strong>{name}</strong>
              </summary>
              {curriculum
                .filter((x) => x.group === i + 1)
                .map((x) => {
                  const s = stats[curriculum.indexOf(x)];
                  return (
                    <button key={x.id} className="gr-row" disabled={busy} onClick={() => start('lesson', x.id)}>
                      <span>
                        <b>{x.title}</b>
                        <small>{x.goal}</small>
                        {initialSkill === x.id && prerequisite(x.id) && (
                          <small>Kiến thức học trước · {prerequisite(x.id)?.title}</small>
                        )}
                      </span>
                      <em>
                        {s.mastered
                          ? 'Đã vận dụng'
                          : s.completed
                            ? 'Đã học'
                            : s.graded.length
                              ? 'Đang luyện'
                              : 'Chưa đánh giá'}
                      </em>
                    </button>
                  );
                })}
              <button
                className="gr-secondary"
                disabled={busy}
                onClick={() => start('checkpoint', curriculum[i * 4].id)}
              >
                Kiểm tra cụm {i + 1}
              </button>
            </details>
          ))}
          <h2>Các chặng tiếp theo</h2>
          <p>Bản đồ nội dung dự kiến sau A2.</p>
          {advanced.map((a) => (
            <details className="gr-unit" key={a.level}>
              <summary>
                <small>{a.level} · Dự kiến</small>
                <strong>{a.outcome}</strong>
              </summary>
              <p>
                {a.before}. {a.topics}
              </p>
            </details>
          ))}
        </>
      )}
      {page === 'book' && (
        <>
          <div className="gr-bar">
            <h2>Sổ lỗi của bạn</h2>
            <img width="36" height="36" src="/grammar/notebook.svg" alt="" />
          </div>
          {pending.map((e) => (
            <article key={e.id} className="gr-unit">
              <small>Chờ nhận xét · {skillName(e.skill)}</small>
              <p lang="en">{e.answer}</p>
              <button className="gr-secondary" disabled={busy} onClick={() => retry(e)}>
                Nhận xét lại
              </button>
            </article>
          ))}
          {curriculum
            .filter((s) => graded.some((e) => e.skill === s.id && e.result === 'incorrect'))
            .map((s) => (
              <details className="gr-unit" key={s.id}>
                <summary>
                  <strong>{s.title}</strong>
                </summary>
                {graded
                  .filter((e) => e.skill === s.id && e.result === 'incorrect')
                  .map((e) => (
                    <p key={e.id}>
                      <b>{kindLabels[e.typedFallback ? 'write' : e.kind]}</b> · <span lang="en">{e.answer}</span>
                      <br />
                      {e.prompt && (
                        <span>
                          {e.prompt}
                          <br />
                        </span>
                      )}
                      {e.expected && <b lang="en">{e.expected} · </b>}
                      {e.feedback?.explanationVi || s.goal}
                    </p>
                  ))}
                <button className="gr-secondary" disabled={busy} onClick={() => start('review', s.id)}>
                  Luyện lại bằng câu mới
                </button>
              </details>
            ))}
          {!pending.length && !graded.some((e) => e.result === 'incorrect') && (
            <p>Các câu cần sửa sẽ xuất hiện ở đây sau khi bạn luyện tập.</p>
          )}
          {returned.length > 0 && (
            <details className="gr-unit">
              <summary>Nhận xét câu tự tạo</summary>
              {returned.map((e) => (
                <p key={e.id}>
                  <b>{skillName(e.skill)}</b> · {kindLabels[e.typedFallback ? 'write' : e.kind]}
                  <br />
                  {e.answer}
                  <br />
                  {e.feedback?.explanationVi}
                </p>
              ))}
            </details>
          )}
        </>
      )}
      {page === 'session' && session && lesson && (
        <GrammarSession
          key={session.id + '-' + session.index}
          lesson={lesson}
          session={session}
          events={events}
          user={user}
          theme={theme}
          update={update}
          onRecord={persist}
          onNext={next}
          onPause={() => setPage('home')}
        />
      )}
      {page === 'result' && summary && (
        <section className="gr-sheet">
          <p className="gr-context">{labels[summary.mode]}</p>
          <h1>Kết quả phiên học</h1>
          <p>
            {resultEvents.filter((e) => e.result === 'correct' && !e.assisted).length} lượt đúng độc lập ·{' '}
            {resultEvents.filter((e) => e.result === 'pending').length} câu chờ nhận xét
          </p>
          {summary.mode === 'placement' && (
            <>
              <h3>Bắt đầu với {suggestion.skill.title}</h3>
              <p>{suggestion.reason} Các kỹ năng chưa gặp trong bài vẫn ở trạng thái chưa đánh giá.</p>
              <details className="gr-unit">
                <summary>Xem kết quả theo kỹ năng</summary>
                {curriculum.map((skill) => {
                  const attempt = resultEvents.find((e) => e.skill === skill.id);
                  return (
                    <p key={skill.id}>
                      <b>{skill.title}</b> ·{' '}
                      {attempt
                        ? attempt.result === 'correct'
                          ? 'Đúng câu chẩn đoán'
                          : 'Nên ôn lại'
                        : 'Chưa đánh giá'}
                    </p>
                  );
                })}
              </details>
            </>
          )}
          {summary.mode === 'checkpoint' &&
            resultEvents.map((e) => (
              <p key={e.id}>
                {skillName(e.skill)} ·{' '}
                {e.result === 'pending' ? 'Chờ nhận xét' : e.result === 'correct' ? 'Đạt' : 'Cần ôn'}
              </p>
            ))}
          <button className="gr-primary" onClick={() => setPage('home')}>
            Về luyện tập
          </button>
          <button className="gr-link" onClick={() => setPage('book')}>
            Xem sổ lỗi
          </button>
        </section>
      )}
      {replace && (
        <section role="alert" className="gr-sheet">
          <h3>Đổi phiên học?</h3>
          <p>Đáp án đã nộp vẫn được lưu. Phiên mới sẽ thay bản nháp đang học.</p>
          <button disabled={busy} className="gr-secondary" onClick={() => setReplace(null)}>
            Giữ phiên hiện tại
          </button>
          <button disabled={busy} className="gr-primary" onClick={() => open(replace)}>
            Mở phiên mới
          </button>
        </section>
      )}
      <p role="status">{busy ? 'Đang tải…' : message}</p>
    </main>
  );
}
