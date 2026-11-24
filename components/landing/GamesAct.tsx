import React, { useState } from 'react';
import { GAMES, HUNT } from '../../data/landingContent';

/** One round of the error-hunt game: find the wrong word, then pick its fix. */
function HuntRound() {
  const [found, setFound] = useState(false);
  const [miss, setMiss] = useState<number | null>(null);
  const [fix, setFix] = useState<string | null>(null);
  const fixed = HUNT.fixes.find((f) => f.text === fix)?.correct ?? false;

  const reset = () => {
    setFound(false);
    setMiss(null);
    setFix(null);
  };

  let status = 'Bấm vào từ bạn nghĩ là sai.';
  if (miss !== null && !found) status = `"${HUNT.words[miss]}" không sai. Thử từ khác.`;
  if (found && !fix) status = 'Tìm đúng rồi. Giờ chọn cách sửa.';
  if (fix && !fixed) status = `"${fix}" chưa đúng. Chủ ngữ "She" đi với dạng nào của have?`;
  if (fixed) status = 'Chuẩn: She has lived in Da Nang since 2019. Thì hiện tại hoàn thành, chủ ngữ số ít.';

  return (
    <div className="lp-hunt" role="group" aria-labelledby="lp-hunt-title">
      <p id="lp-hunt-title" className="lp-hunt__label">Chơi thử một câu · Săn lỗi</p>
      <p className="lp-hunt__sentence" lang="en">
        {HUNT.words.map((w, i) => {
          const isWrong = i === HUNT.wrongIndex;
          if (fixed && isWrong) {
            return (
              <span key={w} className="lp-hunt__word" data-state="fixed">
                <s aria-hidden="true">{w}</s> has{' '}
              </span>
            );
          }
          return (
            <React.Fragment key={w}>
              <button
                type="button"
                className="lp-hunt__word"
                data-state={isWrong && found ? 'found' : miss === i && !found ? 'miss' : undefined}
                aria-pressed={isWrong && found}
                disabled={found}
                onClick={() => (isWrong ? setFound(true) : setMiss(i))}
              >
                {w}
              </button>{' '}
            </React.Fragment>
          );
        })}
      </p>
      {found && !fixed && (
        <div className="lp-hunt__fixes" role="group" aria-label="Chọn cách sửa">
          {HUNT.fixes.map((f) => (
            <button
              key={f.text}
              type="button"
              lang="en"
              className="lp-choice lp-choice--sm"
              data-state={fix === f.text ? (f.correct ? 'correct' : 'wrong') : undefined}
              onClick={() => setFix(f.text)}
            >
              {f.text}
            </button>
          ))}
        </div>
      )}
      <p className="lp-field-msg" role="status" data-tone={fixed ? 'ok' : (miss !== null && !found) || (fix && !fixed) ? 'bad' : undefined}>
        {status}
      </p>
      {fixed && (
        <button type="button" className="lp-link-btn" onClick={reset}>
          Chơi lại
        </button>
      )}
    </div>
  );
}

/** The games department: four real review games, the XP rules, and one playable round. */
export function GamesAct() {
  return (
    <section id="lp-games" className="lp-games" data-sc-act="flow" aria-labelledby="lp-games-title">
      <div className="lp-games__inner">
        <header className="lp-games__head">
          <p className="lp-kicker">Giải trí · tr. 16</p>
          <h2 id="lp-games-title" className="lp-h2">
            Ôn tập mà <em>như chơi</em>.
          </h2>
          <p className="lp-games__lede">
            Đến hạn ôn, bạn không phải lật lại một danh sách. Bạn chọn một trò chơi. Mỗi trò dùng đúng những
            từ và lỗi sai đang chờ bạn.
          </p>
        </header>

        <ul className="lp-games__grid" data-sc-in data-sc-stagger="90">
          {GAMES.map((g) => (
            <li key={g.name} className="lp-game">
              <img src={g.img} alt="" width={120} height={120} loading="lazy" decoding="async" />
              <h3>{g.name}</h3>
              <p>{g.text}</p>
            </li>
          ))}
        </ul>

        <div className="lp-games__bottom">
          <HuntRound />

          <div className="lp-rules">
            <img className="lp-rules__flame" src="/streak-flame.png" alt="" width={444} height={520} loading="lazy" decoding="async" />
            <h3 className="lp-rules__title">Luật chơi, viết rõ</h3>
            <ul className="lp-rules__list">
              <li><b>XP</b> cho mỗi câu đúng, thêm <b>combo</b> khi đúng liên tiếp.</li>
              <li>Mỗi mục chỉ được cộng XP <b>một lần mỗi ngày</b>, nên không cày lại cùng một câu được.</li>
              <li>Có <b>mục tiêu XP</b> cho mỗi ngày và <b>chuỗi ngày</b> giữ lửa học.</li>
              <li>Trang chủ có danh sách <b>mục tiêu hôm nay</b>, và chú mèo nhắc bạn việc còn dở.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
