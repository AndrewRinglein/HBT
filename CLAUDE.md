# The Viewer — package instructions

The battle viewer of *Heroes of Blight and Tragic*: it **draws what happened and
never decides**. The standalone replay page and the battle screen inside the
game are one component. A **sibling package to `engine/` and `kingdom/`, and its
own nested git repository** (ruled 2026-09-02, `THREE-PACKAGES-PLAN.md`). It
imports the engine through one door and never edits it.

**Read first, in this order:** the root `STATE.md` · the root `CLAUDE.md` (laws,
vocabulary) · `GLOSSARY.md` (the naming authority) · **`VIEWER-CONSTITUTION.md`**
(this package's seven laws, each with its catch) · `THREE-PACKAGES-PLAN.md`
(the seams, the stages, what not to do) · then the look, which is ruled in
`VFX/PLAYBACK-DESIGN.md`, `VFX/UI-BUILD-NOTES-2026-09-02.md` and the work list
`VFX/VISUAL-BATTLE-UPDATES.md`. `VFX/VIEWER-CHECKPOINT.md` is the thread's dated
record — traps, rulings, what exists.

---

## Commands — all from `viewer/`

There is **no install step**. The package runs on `../engine/node_modules`.
Python 3 with Pillow is present for the art half.

```
node tools/gate.mjs              door probe · laws 5 and 6 · typecheck · build (verify runs inside the build)
node tools/gate.mjs --fresh      the above, then re-export every library battle from ../engine and diff byte-for-byte
node tools/build-viewer.mjs      BATTLE-VIEWER.html — refuses to write unless verify passes
node tools/verify.mjs BATTLE-VIEWER.html     the headless fold of every battle, every surface, every catch
npm run static                   generated/static.json from the door (unit sheets, status names, map list)
node tools/dump-fields.mjs [engineRoot]      generated/fields.json for EVERY map (interim until viewer.geometry lands in engine/src)
python3 tools/prep-art.py [hell-tcg-root]    generated/art/ from the source art (only when art changes)
npm run typecheck
```

**Publishing:** `BATTLE-VIEWER.html` is the one generated page; the artifact is
published *from it*, never from a copy (ruled 2026-09-02: "one HTML that is just
being referenced in two places").

**Commit at the end of every session** — `git add -A && git commit` from
`viewer/`. Until 2026-09-02 a week of this work had no history.

---

## Where things live

```
src/engine.ts      THE DOOR — types and read-only content. Never a rule, a mutator, preview() or the AI.
src/sheet.ts       unit sheets resolved from content — OWED TO THE ENGINE (exemption "sheet")
src/fold.js        PURE: state × event → state + cues. No DOM, no clock. The half every test runs over.
src/viewer.js      mountBattleViewer(el, data, opts) → {push, seek, play, pause, step, dispose, …}; the pump, DUR
src/board.js       the DOM half of the board: ground, tokens, floats, hexVFX bridge, camera
src/panel.js       the focus panel          src/actionbar.js   the 12-slot bar + stamina strip
src/actions.js     what an action does/triggers (pure)      src/projection.js   tick projection + danger (pure, exempt)
src/icons.js       the RPG Awesome sprite + the four ability glyphs      src/theme.js   ONE hue per status
src/log.js         the log sentences (pure)  src/hexvfx.js  the canvas VFX library
src/harness.js     the REPLAY page only: dropdown, transport, rail, log, file-drop, page fit
src/main.js        the standalone entry      src/page.html  its shell      src/styles.css  the stylesheet
tools/             build, verify, gate, the dumps, prep-art, fakedom, exemptions.json, design/ (the Python design surfaces)
generated/         static.json · fields.json · ra-glyphs.json · art/  — never hand-edit
battles/           the showcase library (library.json is the roster; each file is an export-battle.mts output with its engineCommit stamp)
BATTLE-VIEWER.html generated — never hand-edit
```

## The rules this package lives under

- **Law 0: the viewer computes nothing.** Every number is in the log, in the
  sheet, or the engine owes an event. The six places it still computes carry an
  `EXEMPTION <name>` marker and are listed in `tools/exemptions.json`; that file
  only shrinks. Never add a seventh without writing the debt down first.
- **The door is the only way in.** `src/engine.ts`. The gate probes for any other
  engine import.
- **Nothing replay-only below `harness.js`.** No `mode` check inside a draw call.
- **`fold.js` stays pure.** If you need the DOM, return a cue and play it in
  `board.js`.
- **The stylesheet is id-based** (`#stage`, `#panel`, …), so one viewer per
  document until it is classed — a known debt, not a rule.
- **Every ruling is dated and lives in its owning document** — the look in the
  VFX documents, the seams in the plan, the laws here.

## Traps (from `VFX/VIEWER-CHECKPOINT.md`, kept here because they bite in this code)

No CSS filters inside the 3D scene · every wrapper in the 3D chain needs
`preserve-3d` · the ground must be the stage's FIRST child · anything low on a
token needs `translateZ` · never redraw floats from a render · `.pip` is the
status pip, prefix new class names · a native `<select>` cannot open in the
artifact pane · verify against script and stylesheet, never the whole file
(base64 art contains everything) · never hardcode a `+` on a delta.
