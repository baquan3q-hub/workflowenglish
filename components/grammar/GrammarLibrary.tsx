import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, Search, Sparkles, Volume2 } from 'lucide-react';
import {
  groupFor,
  optionsFor,
  relatedTopics,
  searchTopics,
  topicGroups,
  topics,
} from '../../data/grammar/library';
import { tenses } from '../../data/grammar/library/tenses';
import type { GrammarTopic } from '../../data/grammar/library/types';
import { speakText } from '../../services/browserSpeech';
import { aiErrorMessage, invokeAi } from '../../services/aiClient';
import './grammar-library.css';

type Level = GrammarTopic['level'];
const levels: Level[] = ['Nền tảng', 'Trung cấp', 'Nâng cao'];
const periods = ['Hiện tại', 'Quá khứ', 'Tương lai'];
const forms = ['Đơn', 'Tiếp diễn', 'Hoàn thành', 'Hoàn thành tiếp diễn'];
const quickLinks = ['passive', 'conjunctions', 'adverbs'];

interface Progress {
  completed: string[];
  recent?: string;
}
const progressKey = (user: string) => 'workflow:grammar:library:v1:' + user;
function readProgress(user: string): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey(user)) || 'null') as Progress | null;
    if (saved && Array.isArray(saved.completed)) return saved;
  } catch {
    // Learning remains available when the browser cannot read its local storage.
  }
  return { completed: [] };
}

function Quiz({ topic, onComplete }: { topic: GrammarTopic; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const score = topic.questions.filter((question, index) => question.answer === answers[index]).length;
  return (
    <section className="gl-quiz gl-panel" aria-labelledby="gl-exercise">
      <h3 id="gl-exercise">Thử làm ngay</h3>
      <p>Chọn đáp án cho từng câu rồi xem giải thích.</p>
      {topic.questions.map((question, index) => {
        const correct = answers[index] === question.answer;
        const options = optionsFor(topic, index);
        return (
          <fieldset key={question.prompt} disabled={checked}>
            <legend>
              <span>{index + 1}.</span> {question.prompt}
            </legend>
            <div className="gl-options">
              {options.map((option) => (
                <label
                  key={option}
                  className={
                    checked && option === question.answer
                      ? 'gl-correct'
                      : checked && answers[index] === option
                        ? 'gl-incorrect'
                        : undefined
                  }
                >
                  <input
                    type="radio"
                    name={topic.id + '-' + index}
                    value={option}
                    checked={answers[index] === option}
                    onChange={() => setAnswers((before) => ({ ...before, [index]: option }))}
                  />
                  <span lang="en">{option}</span>
                </label>
              ))}
            </div>
            {checked && (
              <p className={correct ? 'gl-feedback gl-correct' : 'gl-feedback gl-incorrect'}>
                <strong>{correct ? 'Đúng rồi. ' : 'Đáp án là ' + question.answer + '. '}</strong>
                {question.why}
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="gl-actions">
        {checked ? (
          <>
            <strong role="status">
              Bạn làm đúng {score}/{topic.questions.length} câu.
            </strong>
            <button
              type="button"
              className="gr-secondary"
              onClick={() => {
                setAnswers({});
                setChecked(false);
              }}
            >
              Làm lại
            </button>
          </>
        ) : (
          <button
            type="button"
            className="gr-primary"
            disabled={Object.keys(answers).length !== topic.questions.length}
            onClick={() => {
              setChecked(true);
              if (score === topic.questions.length) onComplete();
            }}
          >
            Kiểm tra đáp án
          </button>
        )}
      </div>
    </section>
  );
}

function Tutor({ topic }: { topic: GrammarTopic }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function explain() {
    const request = new AbortController();
    active.current = request;
    setBusy(true);
    setError('');
    try {
      const result = await invokeAi<{ hint: string }>(
        'explainGrammar',
        {
          goal: 'Hiểu và dùng đúng ' + topic.title,
          rule: topic.uses.join(' '),
          prompt: 'Giải thích quy tắc trong một ví dụ mới Anh–Việt, dùng từ quen thuộc.',
        },
        { signal: request.signal }
      );
      if (!request.signal.aborted) {
        if (!result?.hint?.trim()) throw new Error('Empty grammar explanation');
        setHint(result.hint);
      }
    } catch (err) {
      if (!request.signal.aborted) setError(aiErrorMessage(err));
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="gl-tutor">
      <button type="button" className="gr-secondary" disabled={busy} onClick={() => void explain()}>
        <Sparkles size={16} aria-hidden="true" />
        {busy ? 'Đang giải thích…' : hint ? 'Xem thêm ví dụ từ AI' : 'Nhờ AI giải thích bằng ví dụ khác'}
      </button>
      <div aria-live="polite">
        {error && <p>{error}</p>}
        {hint && <p className="gl-hint">{hint}</p>}
      </div>
    </div>
  );
}

export default function GrammarLibrary({ user }: { user: string }) {
  const [progress, setProgress] = useState(() => readProgress(user));
  const [topic, setTopic] = useState<GrammarTopic | null>(null);
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [showTenses, setShowTenses] = useState(false);
  const tenseHeading = useRef<HTMLHeadingElement>(null);
  const [level, setLevel] = useState<Level | ''>('');
  const heading = useRef<HTMLHeadingElement>(null);
  const catalogOrigin = useRef<HTMLButtonElement | null>(null);
  const focusHeading = useRef(false);
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    const target = topic || !catalogOrigin.current?.isConnected ? heading.current : catalogOrigin.current;
    target?.focus();
    target?.scrollIntoView({ block: 'nearest' });
  }, [topic]);

  useEffect(() => {
    if (!showTenses || !tenseHeading.current) return;
    tenseHeading.current.focus({ preventScroll: true });
    tenseHeading.current.scrollIntoView({ block: 'start' });
    setShowTenses(false);
  }, [showTenses]);

  function save(next: Progress) {
    setProgress(next);
    try {
      localStorage.setItem(progressKey(user), JSON.stringify(next));
    } catch {
      /* Storage can be disabled. */
    }
  }

  function openTopic(next: GrammarTopic, origin?: HTMLButtonElement) {
    if (!topic) catalogOrigin.current = origin ?? null;
    focusHeading.current = true;
    setTopic(next);
    save({ ...progress, recent: next.id });
  }

  function renderTopicLink(entry: GrammarTopic, compact = false) {
    const complete = progress.completed.includes(entry.id);
    return (
      <button
        type="button"
        key={entry.id}
        className={compact ? 'gl-tense' : 'gl-topic'}
        onClick={(event) => openTopic(entry, event.currentTarget)}
      >
        <span>
          <strong>{entry.title}</strong>
          <small lang="en">{entry.en}</small>
        </span>
        {complete ? <Check size={16} aria-label="Đã luyện đạt" /> : <ArrowRight size={16} aria-hidden="true" />}
      </button>
    );
  }

  const recent = topics.find((entry) => entry.id === progress.recent);
  const matching = searchTopics(query, level);
  const activeGroup = topicGroups.find((entry) => entry.id === group);
  const showTenseMatrix = !query.trim() && !level && (!activeGroup || activeGroup.id === 'tenses');

  if (topic) {
    const containing = groupFor(topic.id);
    const index = containing?.topics.indexOf(topic) ?? -1;
    const next = containing?.topics[index + 1];
    const related = (relatedTopics[topic.id] ?? []).flatMap((id) => topics.filter((entry) => entry.id === id));
    return (
      <article className="gl-reader">
        <button
          type="button"
          className="gl-back gr-link"
          onClick={() => {
            focusHeading.current = true;
            setTopic(null);
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Về kho chuyên đề
        </button>
        <header className="gl-lesson-header">
          <p className="gl-kicker">
            {containing?.title} / {topic.level}
          </p>
          <h2 ref={heading} tabIndex={-1}>
            {topic.title}
          </h2>
          <p lang="en">{topic.en}</p>
          <a
            className="gl-jump"
            href="#gl-exercise"
            onClick={(event) => {
              event.preventDefault();
              const exercise = document.getElementById('gl-exercise');
              exercise?.scrollIntoView({ block: 'start' });
              exercise
                ?.closest('section')
                ?.querySelector<HTMLInputElement>('input')
                ?.focus({ preventScroll: true });
            }}
          >
            <ArrowDown size={15} aria-hidden="true" /> Đến bài tập
          </a>
        </header>
        <div className="gl-explanation">
          <section className="gl-panel">
            <h3>Công thức</h3>
            <dl className="gl-formulas">
              {topic.forms.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.pattern}</dd>
                </div>
              ))}
            </dl>
            {containing?.id === 'tenses' && (
              <p className="gl-legend">
                S là chủ ngữ, V là động từ nguyên mẫu, V2 là dạng quá khứ và V3 là quá khứ phân từ.
              </p>
            )}
          </section>
          <section className="gl-panel">
            <h3>Khi nào dùng?</h3>
            <ul>
              {topic.uses.map((use) => (
                <li key={use}>{use}</li>
              ))}
            </ul>
          </section>
        </div>
        <section className="gl-panel gl-examples">
          <h3>Ví dụ Anh–Việt</h3>
          {topic.examples.map((example) => (
            <div key={example.en} className="gl-example">
              <div>
                <p lang="en">{example.en}</p>
                <small>{example.vi}</small>
              </div>
              {typeof window.speechSynthesis !== 'undefined' && (
                <button
                  type="button"
                  className="gl-audio"
                  aria-label={'Nghe ' + example.en}
                  onClick={() => speakText(example.en)}
                >
                  <Volume2 size={18} />
                </button>
              )}
            </div>
          ))}
        </section>
        <section className="gl-panel gl-trap">
          <h3>Lỗi dễ gặp</h3>
          <p lang="en">
            <del>{topic.trap.wrong}</del>
          </p>
          <p lang="en">
            <strong>{topic.trap.right}</strong>
          </p>
          <p>{topic.trap.why}</p>
        </section>
        <Tutor key={topic.id} topic={topic} />
        <Quiz
          key={topic.id}
          topic={topic}
          onComplete={() => {
            if (!progress.completed.includes(topic.id))
              save({ ...progress, completed: [...progress.completed, topic.id] });
          }}
        />
        {related.length > 0 && (
          <section className="gl-related">
            <h3>Học cùng chuyên đề</h3>
            {related.map((entry) => renderTopicLink(entry))}
          </section>
        )}
        {next && (
          <button type="button" className="gl-topic gl-next" onClick={() => openTopic(next)}>
            <span>
              <small>Bài tiếp theo trong chuyên đề</small>
              <strong>{next.title}</strong>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </article>
    );
  }

  return (
    <section className="gl-library" aria-label="Kho chuyên đề ngữ pháp">
      <header className="gl-banner">
        <div>
          <h2 ref={heading} tabIndex={-1}>
            Học ngữ pháp theo chuyên đề
          </h2>
          <p>Chọn kiến thức bạn muốn học, xem cách dùng rồi thử làm bài.</p>
          <div className="gl-quick">
            <button
              type="button"
              className="gl-quick-tenses"
              onClick={() => {
                setGroup('');
                setQuery('');
                setLevel('');
                setShowTenses(true);
              }}
            >
              Bảng 12 thì <ArrowDown size={14} aria-hidden="true" />
            </button>
            {quickLinks.map((id, index) => (
              <button
                type="button"
                key={id}
                onClick={(event) =>
                  openTopic(
                    topics.find((entry) => entry.id === id)!,
                    event.currentTarget
                  )
                }
              >
                {['Câu bị động', 'Liên từ', 'Phó từ'][index]}
              </button>
            ))}
          </div>
        </div>
        <img className="gl-banner-icon" src="/grammar/notebook.svg" alt="" />
      </header>
      {recent && (
        <button
          type="button"
          className="gl-topic gl-continue"
          onClick={(event) => openTopic(recent, event.currentTarget)}
        >
          <span>
            <small>Đọc tiếp bài gần đây</small>
            <strong>{recent.title}</strong>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}
      <div className="gl-filters">
        <label>
          <span>Tìm kiến thức</span>
          <span className="gl-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Ví dụ: bị động, past perfect…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>
        <label>
          <span>Mức độ</span>
          <select value={level} onChange={(event) => setLevel(event.target.value as Level | '')}>
            <option value="">Mọi mức độ</option>
            {levels.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="gl-catalog">
        <nav className="gl-categories" aria-label="Nhóm chuyên đề">
          <button type="button" aria-pressed={!group} onClick={() => setGroup('')}>
            Tất cả chuyên đề
          </button>
          {topicGroups.map((entry) => (
            <button
              type="button"
              key={entry.id}
              aria-pressed={group === entry.id}
              onClick={() => setGroup(entry.id)}
            >
              <span>{entry.title}</span>
              <small>{entry.topics.length}</small>
            </button>
          ))}
        </nav>
        <div className="gl-list">
          <p className="gl-progress" role="status">
            {progress.completed.length}/{topics.length} bài đã luyện đạt
          </p>
          {showTenseMatrix && (
            <section className="gl-tense-map" aria-label="Bảng 12 thì tiếng Anh">
              <h3 ref={tenseHeading} tabIndex={-1}>
                12 thì tiếng Anh
              </h3>
              <p>Chọn một thì theo mốc thời gian để xem cách đặt câu và làm bài.</p>
              {periods.map((period, index) => (
                <div className="gl-period" key={period}>
                  <h4>{period}</h4>
                  <div className="gl-tense-row">
                    {forms.map((form, column) => (
                      <div key={form}>{renderTopicLink(tenses[index * 4 + column], true)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
          {topicGroups
            .filter(
              (entry) => (!activeGroup || entry === activeGroup) && (!showTenseMatrix || entry.id !== 'tenses')
            )
            .map((entry) => {
              const visible = entry.topics.filter((candidate) => matching.includes(candidate));
              if (!visible.length) return null;
              return (
                <section key={entry.id} className="gl-topic-group">
                  <h3>{entry.title}</h3>
                  <p>{entry.description}</p>
                  {visible.map((candidate) => renderTopicLink(candidate))}
                </section>
              );
            })}
          {!showTenseMatrix && !matching.some((entry) => !activeGroup || activeGroup.topics.includes(entry)) && (
            <p className="gl-empty">Chưa tìm thấy bài phù hợp trong nhóm này. Thử đổi từ khóa hoặc mức độ.</p>
          )}
        </div>
      </div>
    </section>
  );
}
