# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| vocabmaster-editorial | Chaptered editorial | Margin folio + mobile chapter chip | Typographic title page, masked entrance | Cover + five chapters; wipe → parallax → stagger → scroll-driven SVG morph → natural-flow close | Colophon with full-width text CTA | Pen nib becomes an underline, then an open notebook while a sentence is typed and a local vocabulary slip appears | Warm paper, persimmon ink, reused 3D illustrations | React `views/LandingPage.tsx` |
| vocabmaster-arcade | Interactive product stage | Quiet masthead with anchor links | Layered CSS retro CRT and physical printer | Depth stage → user-triggered morph → interactive method tabs → skill stagger → still FAQ and close | Learning direction chooser and live account CTA | Same piece of paper feeds through the printer, unfolds into a working quiz and shrinks into a review slip | Blue-lavender desk, CRT phosphor and existing mascot | React `views/LandingPage.tsx` |
| vocabmaster-spatial | Live surface / Spatial stage | Glass Command Bar with live Scrubber HUD | 4-Plane Dimensional Spatial Deck (Far, Mid, Text, Foreground) | Pin (2.4vh) → Pin (2.4vh) → Pan (0.6x) → Pin (2.8vh) → Flow close | Target Band Level Command Horizon with instant Google/Free launch | Scroll-Scrubbed Retention Timeline & Living Contextual Transformer | Dark Lavender/Cyan spatial lab, 3D pastel assets and mascot | React `views/LandingPage.tsx` |
| vocabmaster-issue | Magazine issue | Issue strip with a Mục lục (table of contents) drawer: focus trap, Esc, jump links | Layered magazine cover: "Vocab" masthead behind the mascot, word sticker and cover lines in front, 4 parallax planes | 10 acts: cover parallax → letter pin + kinetic strikes → reveal + self-drawing SVG curve → PEAK pin 4.6 (5-step lesson) → pan 3 (6 IELTS pages) → flow + stagger (games, playable hunt) → reveal + parallax (report, LLL picker) → highlighter reveal table → FAQ accordion → coupon close | Cut-out subscription coupon with goal chips, magnet CTA and Google sign-in | "Bản thảo có lời phê": the visitor runs a real 5-step lesson on one word while red handwritten margin notes record each action, then the word is stamped onto its SM-2 review dates | Warm cream paper, navy ink, lavender accent, lime highlighter, red editor's pen; Fraunces + Be Vietnam Pro + JetBrains Mono + Patrick Hand | React `views/LandingPage.tsx` + `components/landing/` |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- `vocabmaster-editorial` is the first recorded build. It claims the ink-stroke morph tied to sentence writing and the local vocabulary slip. No prior rows to compare.
- `vocabmaster-arcade` changes 6/6 gate dimensions from editorial. It claims the one-sheet printer-to-exercise-to-review interaction. The two builds share the product assets and account entry points, not the structure.
- `vocabmaster-spatial` changes 6/6 gate dimensions from both prior builds. It claims the 4-plane dimensional hero stage, the scroll-scrubbed SM-2 retention wave, horizontal 4-skill pan, and interactive workbench peak with live Web Speech pronunciation.
- `vocabmaster-issue` changes 6/6 gate dimensions from each of the three prior rows. It claims the magazine-issue grammar (TOC drawer, cover, cut-out coupon close), the margin-notes-in-red-pen lesson run-through, and a 10-act length outside the 6-to-7 band. It shares product assets, the account entry points, and the SM-2 dates (1, 6, 15, 38 days) with the earlier VocabMaster builds.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
