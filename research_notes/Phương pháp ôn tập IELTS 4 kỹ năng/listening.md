# Listening: Dictation Practice (dailydictation-style) and Legal, Embeddable Content with Timed Transcripts

Research date: 2026-11-04. dailydictation.com was opened live in a browser: its exercise page, the Settings dialog, and one deliberately wrong answer submitted with Check.

## 1. How does dailydictation.com work?

### Takeaway
DailyDictation splits each lesson into short audio clips, about one sentence per part. On each part the learner types what they heard and presses Check. Every correctly typed word prefix is revealed. The first wrong word is revealed with the error highlighted, and every remaining word stays masked as asterisks, one per character. Replay is a modifier key, and the learner can set auto-replay and the gap between replays. The catalogue is large (about 2,000 lessons across 13 categories, CEFR-tagged). Progress is saved only when logged in, and the site adds a leaderboard and comment threads.

### Cited Findings
**Catalogue** — [dailydictation.com/exercises](https://dailydictation.com/exercises)

| Category | CEFR | Lessons |
|---|---|---|
| Short Stories | A1–C1 | 289 |
| Conversations | A1–B1 | 100 |
| Stories for Kids (video) | A2–B2 | 13 |
| TOEIC Listening | A2–C1 | 600 |
| IELTS Listening (British/Australian accents) | B1–C1 | 360 |
| Random Videos from YouTube | B1–C2 | 181 |
| News (video) | B1–C1 | 219 |
| TED (video) | C1–C2 | 95 |
| TOEFL Listening | B1–C2 | 54 |
| Medical English (OET) | B1–C2 | 80 |
| IPA | A1 | 42 |
| Numbers ("spoken quickly by an American") | A1 | 9 |
| Spelling Names (alphabet) | A1 | 6 |

- **Structure.** Short Stories is grouped into 15 sections of 20 lessons each. Every lesson has a title, a vocab level (e.g. "Vocab level: A1"), and a part count of about 17–25 parts. For example, "First snowfall" has 21 parts. — [dailydictation.com/exercises/short-stories](https://dailydictation.com/exercises/short-stories)
- **Exercise page, observed live.** [Example lesson](https://dailydictation.com/exercises/short-stories/1-first-snowfall.1/listen-and-type)
  - Two tabs: **Dictation** and **Full transcript**.
  - A part counter ("1 / 21") with ← → arrows.
  - An HTML audio element. The first clip is 0:02 long, i.e. one short sentence.
  - A speed menu ("1x").
  - A textarea labelled "Type what you hear…" with autocorrect, autocapitalize, spellcheck and Grammarly all disabled, plus a microphone button.
  - Buttons: **Check**, **Skip**, **Replay**, **Next**.
  - A tip: "If possible, read out loud the sentence after completing it!" (built-in shadowing nudge).
  - A "Full Audio & Plain Transcript" section at the bottom.
  - A banner: "You're not logged in yet, your progress will not be saved!"
- **Settings dialog, observed live.**
  - **Replay Key:** Ctrl (default), Shift, Alt, Command, Ctrl+Shift, Ctrl+Alt, Ctrl+Space, or Ctrl+b.
  - **Play/Pause Key:** ` (backtick).
  - **Auto Replay:** No, or 1–10 times.
  - **Seconds between replays:** 0.5–3.0.
  - **Word suggestions (for smartphones):** Disabled/Enabled.
  - **Shortcut Key Tips:** Show/Hide.
- **Check feedback, observed live.** I typed "today is novmber" for the sentence "Today is November 26th."
  - Result: ⚠ "Incorrect", then "Today is **November** *****".
  - The correct words were shown as typed. The misspelled word was revealed in green with the missing letter underlined. The remaining word "26th." was masked as `*****` (one asterisk per character).
  - The learner's input was auto-capitalized to "Today is novmber" with a coloured underline under the error.
  - Two checkboxes appear: "Show answer immediately" (on by default) and "Show full answer".
  - Skip stays available.
  - This is a "progressive reveal up to the first error" hint ladder. Repeated Checks reveal one more word each time.
- **Community features (from the site navigation).** "Top users" leaderboard, "Latest comments" (/discussions), "English expressions", "English pronunciation", "Download audio files", iOS/Android apps, and a sister site, germanlistening.com. — [dailydictation.com](https://dailydictation.com/exercises/short-stories/1-first-snowfall.1/listen-and-type)

### Inferences
- The core loop is **listen → type → Check → partial reveal → retype → next**. Replay is bound to a modifier key alone (Ctrl), so the learner never leaves the textarea. This is the single most important UX detail to copy.
- Masking by character count (`*****`) acts as a free "length" hint without giving the word away.
- The Video categories (Random Videos, News, TED, Kids) embed YouTube or other video. Licensing for TOEIC/IELTS-test recordings is not disclosed and is likely grey-area, so don't copy that sourcing model.

### Gaps
- Scoring numbers (points per sentence, leaderboard formula) and the comment UI were not visible without logging in. I did not create an account.
- Whether Skip counts against the score is unknown.
- I did not verify the exact behaviour of a second Check, e.g. whether it reveals only the next word or the full sentence.

## 2. Other tools (Language Reactor, LingQ, YouGlish, TED tools, Listen and Write, Elllo): which features matter most?

### Takeaway
Across these tools, the most valued listening features are **auto-pause per subtitle line**, **one-key replay of the current line**, **prev/next line**, **blurred subtitles revealed on demand**, and **slow-down/auto-replay of hard segments**. Language Reactor has these as single-letter shortcuts but no typed-dictation mode. Elllo has short, levelled, teacher-made audio with transcripts but restrictive reuse terms.

### Cited Findings
- **Language Reactor.**
  - Advertises "Auto-pause after each subtitle until you continue".
  - Shortcuts: **A** previous subtitle, **S** replay subtitle, **D** next subtitle, **Q** toggle auto-pause, **W** play/pause, **E** show the next blurred subtitle, **R** save subtitle, **Ctrl/⌘+C** copy sentence.
  - Works on Netflix and YouTube. — [languagereactor.com/help/basic](https://www.languagereactor.com/help/basic); [languagereactor.com](https://www.languagereactor.com/)
  - In listening mode, a subtitle track can be blurred or hidden and revealed by hovering or with E. PhrasePump is a listening drill that picks sentences to reinforce saved words. — [intersub.cc review](https://intersub.cc/en/blog/language-reactor-alternatives); [tubevocab review](https://www.tubevocab.com/blog/en/language-reactor-review)
  - A third-party userscript adds "Smart Pause", which pauses at the end of a full sentence rather than at every subtitle line. Raw caption lines often split sentences badly. — [github.com/hungdev/language-reactor-enhanced](https://github.com/hungdev/language-reactor-enhanced)
  - No search result documented a type-what-you-hear mode in Language Reactor.
- **Elllo** (Todd Beuckens, Japan).
  - Lesson types: Views, Mixers (several speakers answer the same question), One-Minute English, Grammar, News Center. Most lessons have transcripts, vocabulary and quizzes.
  - Teachers may download audio for classroom or LMS use. Non-downloadable audio can be requested (up to 10 MP3s free, then about $2 per file).
  - Content is © elllo productions, not openly licensed. — [elllo.org/about](https://www.elllo.org/about/); [OnTESOL guide](https://ontesol.com/blog/how-to-teach-english/teaching-listening/how-to-create-listening-lessons-using-elllo-mixers/)
- **Research prototype features.** A "partial and synchronized caption" system detects fast or hard segments, slows them while keeping the overall rate natural, and auto-replays them a configurable number of times. Intermediate L2 learners rated smart repetition and slowdown positively and improved significantly. — [Mirzaei & Meshgi, ResearchGate](https://www.researchgate.net/publication/356999268_Facilitating_L2_listening_through_automatic_detection_of_speech_and_lexical_difficulties)

### Inferences
- The app should combine Language Reactor's per-line navigation (A/S/D-style keys, auto-pause) with DailyDictation's typed check-and-reveal. No mainstream tool found does both on arbitrary user-embedded YouTube.
- Segment by **sentence** (merge or split caption lines on punctuation), not by raw caption line.

### Gaps
- **listen-and-write.com:** the fetch failed (ECONNREFUSED), so its modes and shortcuts are unverified.
- **LingQ, YouGlish, TED-transcript tools:** not researched within the tool budget, so no citable feature claims. From general knowledge (unverified), YouGlish searches YouTube for clips containing a given word or phrase, and LingQ imports YouTube/podcast transcripts for reading-while-listening.
- **dictationdaily.github.io** ("Dictation Daily") is a different product with similar naming. Its guide mentions Enter/Tab/Esc shortcuts and half-speed playback. It was not analysed further. — [dictationdaily.github.io](https://dictationdaily.github.io/)

## 3. Research: dictation, decoding, shadowing, replay counts, slow playback

### Takeaway
Listening methodologists (Field 2008, *Listening in the Language Classroom*; Vandergrift & Goh 2012) recommend bottom-up work on the speech stream, and dictation is one of the standard activities for it. Field's "diagnostic approach" says to find which decoding process failed (connected speech, word boundaries) and drill it with short targeted exercises. Slowing speech helps a little, but slowed audio should always be followed by normal-speed audio. About 4–5 repetitions is where gains plateau, at least for shadowing.

### Cited Findings
- **Dictation and Field's framework.** Field (2008a) and Vandergrift & Goh (2012) recommend bottom-up activities such as dictation, pointing out blended speech, and noticing affixes. Dictation specifically targets "perception processing" and "parsing" (Anderson 2005). A study used 100-word dictation pre/post-tests to measure gains in decoding. — [NUS CELC blog](https://blog.nus.edu.sg/celcblog/2013/06/26/empirical-and-attitudinal-effects-of-bottom-up-listening-activities-in-the-l2-classroom/)
- **Paused transcription.** Field proposed a diagnostic approach where the teacher identifies which bottom-up process is failing and designs short activities for it. His **paused transcription** method (stop the audio, learner writes the last few words) was used as a listening test. Strong bottom-up skills distinguish stronger from weaker listeners (Tsui & Fullilove 1998). — [CATESOL Journal (eScholarship)](https://escholarship.org/content/qt91c921b9/qt91c921b9.pdf?t=sl5cbt)
- **Connected-speech instruction.** Instruction built on Field's diagnostic approach improved learners' decoding. The same authors argue plain dictation is not the purest bottom-up treatment and prefer Wilson's (2003) "discovery listening". — [ResearchGate: Discovery Listening](https://www.researchgate.net/publication/31494758_Discovery_Listening-Improving_Perceptual_Processing)
- **Micro-dictations.** Very short chunks help learners notice connected speech and practise turning sounds into words, then sentences. — [Cambridge ELT blog 2023](https://www.cambridge.org/elt/blog/2023/06/11/using-micro-dictations-to-help-students-notice-connected-speech/)
- **Dictation as a measure.** Dictation tests can validly and reliably measure overall listening proficiency (Cai 2012). Blanking several successive words taps connected speech better. — [Miyagi Gakuin 2016 PDF](https://www.mgu.ac.jp/miyagaku_cms/wp-content/uploads/2021/12/06-2.pdf)
- **Slowed speech.**
  - Slowed speech should always be followed by the same utterance at normal rate, to avoid dependence on slow speech. Dauer's slow versions were 30–50% slower. — [Dauer, ERIC ED413774](https://files.eric.ed.gov/fulltext/ED413774.pdf)
  - Slightly slower speech (about 98 wpm) helped comprehension, but much slower speech (58 wpm) made no significant difference. Learners given a choice of speech rate gained more, and those who sometimes chose slower speed did better. — [Search summary of rate studies (Academia.edu)](https://www.academia.edu/2072759/The_effect_of_rate_of_speech_and_distributed_practice_on_the_development_of_listening_comprehension)
  - Caution: slower rates don't necessarily help. — [UMD/DTIC 2010 review](https://apps.dtic.mil/sti/tr/pdf/ADA550176.pdf)
- **Exact repetition.** Exact repetition and reduced rate were studied as input enhancement (84 upper-intermediate learners of Spanish). — [Jensen & Vinther 2003, ResearchGate](https://www.researchgate.net/publication/229759454_Exact_Repetition_as_Input_Enhancement_in_Second_Language_Acquisition)
- **Replay count.** Across six repetition trials, 4–5 repetitions brought reproduction rate near ceiling (shadowing vs repeating). — [ResearchGate 2024](https://www.researchgate.net/publication/384498011_Repetition_Fosters_the_Effect_of_Shadowing_on_L2_Listening_Skills_Seeking_an_Enhanced_Procedure)

### Inferences
- **Replays.** Allow unlimited replays, but nudge after about 5 (e.g. offer "slow 0.75×" or "reveal next word"). Log the replay count per sentence as a difficulty signal.
- **Slow mode.** Offer 0.75× and 0.5× (YouTube supports 0.25×–2× via setPlaybackRate). After a correct answer under slow mode, auto-play the sentence once at 1× (Dauer).
- **Error diagnosis.** Classify errors (missing function words, word-boundary errors, contractions, numbers) to feed Field-style targeted practice. For example, "you most often miss *of/to/the* in connected speech."
- **Shadowing step.** Add an optional "say it" step after each solved sentence, matching DailyDictation's "read out loud" tip.

### Gaps
- No study found that directly tests optimal replay count for sentence dictation; the 4–5 figure comes from shadowing.
- No primary Field (2003/2008) text was fetched; claims come via citing papers.

## 4. Legal embeddable sources: which allow embedding, which provide transcripts?

### Takeaway
**Most usable:**
- **VOA Learning English** is public domain, allows commercial use with credit, and ships MP3, text and video. Exclude AP/Reuters/AFP items.
- **LibriVox** is public domain, any use.
- **YouTube via the official IFrame player:** embedding is allowed, but you may not download, store, or strip audio, and may not overlay the player.

**Restrictive:**
- **TED:** CC BY-NC-ND, no commercial or ad-supported use, no clipping.
- **BBC Learning English:** no reuse licence found.
- **Elllo:** © copyright, free use limited to classroom/LMS.

### Cited Findings
- **VOA Learning English.**
  - Texts, MP3s, photos and videos are public domain and may be reprinted for educational and commercial purposes, with credit to learningenglish.voanews.com. Exception: AP, Reuters and AFP stories, photos and video are copyrighted. — [VOA "Request Our Content"](https://learningenglish.voanews.com/p/6861.html)
  - Terms of Use: material produced exclusively by VOA is public domain, and credit should go to VOA. Some content is third-party licensed for VOA use only. — [VOA Terms](https://learningenglish.voanews.com/p/6021.html)
  - High-resolution files are available via USAGM Direct.
- **LibriVox.**
  - All recordings are public domain in the USA, and you "may use it for whatever purpose you wish", including commercial use. — [About LibriVox](https://librivox.org/pages/about-librivox/); [LibriVox Public Domain](https://librivox.org/pages/public-domain/)
  - Not necessarily public domain outside the US. Catalog text is public domain too. Recordings are re-hosted on Archive.org. — [LibriVox wiki](https://wiki.librivox.org/index.php/Copyright_and_Public_Domain)
- **TED.**
  - CC BY-NC-ND 4.0. Embedding via TED's official player and showing transcripts alongside videos are fine for non-commercial use.
  - Not allowed: any commercial or revenue context (including ad-supported), and editing, clipping, or other derivatives.
  - Must credit TED with a visible link to TED.com. Commercial use requires TED licensing. — [TED Talks Usage Policy](https://www.ted.com/about/our-organization/our-policies-terms/ted-talks-usage-policy)
- **YouTube API policies.**
  - Must not "separate, isolate, or modify the audio or video components" (III.I.7). — [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
  - Must not download, cache or store audiovisual content without approval (III.E.1).
  - Must not "modify, build upon, or block any portion or functionality of a YouTube player" (III.I.6).
- **YouTube Required Minimum Functionality.**
  - Player viewport at least 200×200 px; 480×270 recommended for 16:9.
  - No overlays, frames or elements in front of any part of the player, including its controls.
  - Autoplay only when more than half the player is visible, and only one autoplaying player per page.
  - Must send an HTTP Referer. — [YouTube RMF](https://developers.google.com/youtube/terms/required-minimum-functionality)
- **Elllo.** Teachers are free to download available audio for classroom or class-LMS use. The site is © elllo productions, and no embed/public reuse licence was found. — [elllo.org/about](https://www.elllo.org/about/)
- **BBC Learning English.** Transcripts and worksheets for 6 Minute English are published free on its site and in the podcast. No search found BBC terms permitting third-party reuse or embedding. Third-party apps that republish BBC LE transcripts show no evidence of permission. — [Apple Podcasts: 6 Minute English](https://podcasts.apple.com/us/podcast/6-minute-english/id262026947); [sozai.app](https://sozai.app/transcripts/channel/bbc-learning-english/)

### Inferences
- **Default seed library:** VOA Learning English (MP3 plus text, with commercial reuse allowed) and LibriVox (public domain audio; pair with Project Gutenberg text and forced alignment). Both can be self-hosted, so you can segment them with precise timestamps.
- **YouTube (any channel, including BBC LE, TED and IELTS channels):**
  - Embed with the IFrame Player API only, using `seekTo`, `pauseVideo`, `playVideo`, `setPlaybackRate` and `getCurrentTime` to pause per sentence.
  - Keep the video visible (≥200×200) with nothing overlaid. Put the input box and hints *beside or below* the player.
  - Never extract the audio track, so no "audio-only" mode built from YouTube.
  - Store only the user's transcript/timestamps plus the video ID.
  - TED via YouTube or TED's embed is only safe if the app is non-commercial and ad-free.
- **Films and series:** no legal embed path was found beyond official trailers or clips on YouTube.
- **Podcasts via RSS:** playing the publisher's enclosure URL in an `<audio>` element (streaming, not re-hosting) is the common practice, but the legal basis depends on each feed's terms. This is unverified (see Gaps).
- **IELTS (Cambridge book audio):** copyrighted. Users may load their own purchased files locally, but the app should not host or distribute them.

### Gaps
- BBC's general terms (bbc.co.uk/usingthebbc/terms) were not fetched, so BBC LE reuse status remains unknown. Treat as "embed official YouTube only."
- No authoritative source was found on the legality of streaming podcast RSS enclosures inside a third-party app.

## 5. Getting timed transcripts for sentence segmentation

### Takeaway
There is no official way to fetch captions for third-party YouTube videos: `captions.download` needs the owner's OAuth, and the unofficial timedtext endpoint conflicts with the policies.

Practical options:
- **(a)** The user pastes SRT/WebVTT or the "Show transcript" text.
- **(b)** Gemini transcribes a YouTube URL with MM:SS timestamps. This is convenient but only accurate to about 1 s.
- **(c)** For self-hosted audio (VOA, LibriVox), run WhisperX or forced alignment for word-level timings of about ±50–200 ms. This is the best quality.

### Cited Findings
- **YouTube Data API captions.**
  - `captions.download` works only for videos owned by the authenticated user; other videos return 403 "permissions … not sufficient".
  - Auto-captions are not exposed via the official API.
  - Cost: `captions.download` 200 quota units, `captions.list` 50. — [youtube2text blog](https://youtube2text.org/blog/youtube-data-api-transcripts) (vendor source); [YouTube captions implementation guide](https://developers.google.com/youtube/v3/guides/implementation/captions?hl=en)
  - Libraries like youtube-transcript-api scrape the player's caption feed; this is unofficial. — [socialcrawl 2026](https://www.socialcrawl.dev/blog/youtube-data-api-2026)
- **Gemini.**
  - Accepts YouTube URLs directly. The current docs show the Interactions API with `gemini-3.8-flash` and `{"type":"video","uri":YOUTUBE_URL}`. The free tier allows up to 8 h of YouTube video per day.
  - Gemini receives only the raw audio/video; no YouTube transcript or metadata is fetched. — [Gemini video understanding docs](https://ai.google.dev/gemini-api/docs/video-understanding)
  - The official audio doc prompt asks for transcription with "accurate timestamps for each segment (Format: MM:SS)". — [Gemini audio docs](https://ai.google.dev/gemini-api/docs/audio)
  - Video is sampled at 1 FPS and audio at 1 Kbps mono, with timestamps added every second. Use MM:SS at ≤1 FPS, or MM:SS.sss at higher FPS. Vertex: one YouTube URL per request, and the video must be public or owned. — [Google Cloud Gemini video understanding](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/video-understanding)
  - A JSON output schema of `{start, text, voice}` per segment works for diarized transcripts. — [Towards Data Science](https://towardsdatascience.com/unlocking-multimodal-video-transcription-with-gemini/)
- **WhisperX / forced alignment.**
  - WhisperX runs VAD, then Whisper, then wav2vec2 forced alignment for word timestamps. 93.2% word-segmentation precision at a 200 ms collar vs 85.4% for Whisper alone. Plain Whisper timestamps can be off by seconds. — [WhisperX paper, Interspeech 2023](https://www.isca-archive.org/interspeech_2023/bain23_interspeech.pdf); [github.com/m-bain/whisperx](https://github.com/m-bain/whisperx)
  - v3 splits output into sentences via nltk. Weak spots: numbers, symbols and noise; it needs a language-specific wav2vec2 model. — [WhisperX repo](https://github.com/m-bain/whisperx)
  - Vendor claims of ±50 ms (vs Whisper ±500 ms) are less rigorous. — [forasoft](https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/whisperx-diarization-word-level-timestamps)

### Inferences
- **Recommended pipeline per source.**
  1. **User-pasted SRT/VTT or "Show transcript" text.** Parse it, merge lines into sentences on `.?!`, and use the first line's start and the last line's end (or the next start) as boundaries.
     - The "Show transcript" copy usually alternates a timestamp line (`0:05`) and a text line. This is from general knowledge and should be checked against the current YouTube UI.
     - The only timing is each line's start, so sentence end = next line start.
  2. **YouTube URL only.** Server-side Gemini call asking for JSON `[{start:"MM:SS", end:"MM:SS", text}]`, one sentence per item, verbatim. Expect ±1 s error.
     - Pad each segment by about 0.3–0.5 s.
     - Give the learner a "nudge start/end ±0.25 s" control.
     - Optionally verify by having the learner's first replay confirm.
  3. **Self-hosted audio with known text (VOA, LibriVox, user upload).** Forced-align the known text with WhisperX/wav2vec2 to get word-level times. This enables per-word replay and word-level hints.
- **Gemini caveats.** Gemini may paraphrase or normalise text, e.g. writing numbers as digits or dropping fillers. Prompt it for verbatim output and normalise during scoring (see §6).
- **Legal footing.** Store only the derived transcript and timestamps alongside the YouTube video ID, never the media.

### Gaps
- No published accuracy benchmark was found for Gemini YouTube timestamps; the ~1 s figure is inferred from 1 FPS / per-second timestamping.
- aeneas (TTS+DTW sentence aligner) was not compared.
- The exact current "Show transcript" copy-paste format was not verified from a source.

## 6. Concrete UX: shortcuts, hint ladder, per-word diff scoring, tolerance

### Takeaway
Copy DailyDictation's **modifier-key replay plus progressive reveal to the first error with character-masked remainder**, and Language Reactor's **single-key line navigation**. Score per word after normalising case, punctuation, contractions and numbers.

### Cited Findings
- **DailyDictation.**
  - Keys: replay on Ctrl (configurable), play/pause on backtick.
  - Auto Replay 0–10× with a 0.5–3.0 s gap.
  - Speed menu.
  - Reveals the correct prefix, highlights the wrong letter in the first wrong word, and masks the rest by character count.
  - Toggles: "Show answer immediately" and "Show full answer".
  - Skip and Next buttons.
  - Autocorrect and spellcheck disabled on input.
  - Optional mobile word suggestions. — [dailydictation exercise page (observed)](https://dailydictation.com/exercises/short-stories/1-first-snowfall.1/listen-and-type)
- **Language Reactor keys:** A/S/D for previous/replay/next, Q for auto-pause, W for play/pause, E to reveal the blurred line. — [languagereactor.com/help/basic](https://www.languagereactor.com/help/basic)

### Inferences (design proposal)

**Keys.** The cursor stays in the textbox at all times.

| Key | Action |
|---|---|
| **Ctrl** (tap alone) or **Ctrl+Space** | Replay sentence |
| **Ctrl+↓ / Ctrl+↑** | Slower / faster: 0.5, 0.75, 1, 1.25 |
| **Enter** | Check |
| **Ctrl+→ / Ctrl+←** | Next / previous sentence |
| **Tab** | Reveal next word (hint) |
| **Ctrl+Enter** | Show full answer / skip |
| **Ctrl+B** | Replay the last 2 s ("back-up"), for long sentences |

Avoid bare letter keys, which conflict with typing. Language Reactor uses them only because it has no text input.

**Hint ladder**, each step costing points:
1. Word count and length mask: `____ __ ________ ____.`
2. First letter of each word.
3. Auto-check reveals the prefix up to the first error (DailyDictation style).
4. Tab reveals the next word.
5. Show full answer.

Track `hintsUsed` and `replays` per sentence.

**Scoring.**
- Tokenise both the answer and the reference, then run word-level Levenshtein/LCS alignment. Mark each reference word as correct, wrong (with a char-level diff to underline the letters), or missing; mark extra typed words as extra.
- Sentence score = correct words / reference words, minus hint penalties.
- "Perfect" = 100% with 0 hints. Lesson accuracy = sum of correct / sum of reference words.

**Tolerance**, by normalisation before comparing:
- Lower-case everything and strip punctuation except intra-word apostrophes and hyphens.
- Unify curly and straight apostrophes.
- Expand or accept contraction equivalents (`I'm`=`I am`, `won't`=`will not`, `gonna`≈`going to` optional).
- Numbers: accept digits or words (`26th`=`twenty-sixth`, `5`=`five`, `$5`=`five dollars`, `%`=`percent`).
- Hyphen/space/compound variants (`e-mail`/`email`, `OK`/`okay`).
- British/US spelling (`colour`/`color`) via a small map.
- Fillers (`um`, `uh`) optional.
- Optionally allow 1-character typos only for words of 6 or more characters, as "almost": shown in amber, not counted as perfect.
- Keep strict mode for Numbers/Spelling-Names style drills.

**Segmentation UI.**
- Sentence list with a status dot per sentence. Clicking jumps to it.
- Per-sentence start/end nudge controls (±0.25 s) for imperfect timestamps.
- On YouTube, call `pauseVideo()` when `getCurrentTime() >= end` (poll every ~50–100 ms, since the IFrame API has no time events).

**After a correct answer:**
- Auto-play once at 1× (if it was solved at slow speed).
- Offer a "say it" shadowing step.
- Log error categories (function words, endings -s/-ed, numbers, names, connected speech) for targeted review.

### Gaps
- No user-research data was found ranking these features by learner preference. The ranking above is inferred from which features the major tools make default or put on single keys.
