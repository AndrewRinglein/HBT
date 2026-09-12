# The Viewer — package instructions

The battle viewer of *Heroes of Blight and Tragic*: it **draws what happened and
never decides**. The standalone replay page and the battle screen inside the
game are one component. A **sibling package to `engine/` and `kingdom/`, and its
own nested git repository** (ruled 2026-09-02, `THREE-PACKAGES-PLAN.md`). It
imports the engine through one door and never edits it.

**Read first, in this order:** the root `STATE.md` · the root `CLAUDE.md` (laws,
vocabulary) · `GLOSSARY.md` (the naming authority) · **`HANDOFF-2026-09-04.md`**
(what is built, what is open, how to work here — start there if you are new) ·
**`REVIEW-2026-09-04.md`** (the standing bug list — read §A before touching
`fold.js`) ·
**`VIEWER-CONSTITUTION.md`**
(this package's seven laws, each with its catch) · `THREE-PACKAGES-PLAN.md`
(the seams, the stages, what not to do) · then the look, which is ruled in
`VFX/PLAYBACK-DESIGN.md`, `VFX/UI-BUILD-NOTES-2026-09-02.md` and the work list
`VFX/VISUAL-BATTLE-UPDATES.md`. `VFX/VIEWER-CHECKPOINT.md` is the thread's dated
record — traps, rulings, what exists. `ENGINE-FINDINGS-2026-09-03.md` is what the
viewer found the engine's events do not carry — for the engine chat (16 findings
as of 2026-09-04).

---

## Commands — all from `viewer/`

Build tools run on `../engine/node_modules`. The renderer dependency is pinned
in this package: run `npm ci --ignore-scripts` to install Three.js from the lockfile.
The published page embeds it and the selected terrain assets; users need no install.
Python 3 with Pillow is present for the art half.

```
node tools/gate.mjs              CHECK ONLY: door probe · laws 5 and 6 · typecheck · engine map list vs the dumps · build into .build/ with verify inside
node tools/gate.mjs --land       the same, then writes BATTLE-VIEWER.html
node tools/gate.mjs --fresh      also re-export every library battle from ../engine and diff byte-for-byte (refuses a dirty engine; --dirty-ok to compare anyway; a scenario's --seed is passed through)
node tools/play.mjs <page> <export.json>   play ONE export headlessly: every event type folded/ignored/UNKNOWN, every cue, the final board objects, the first throw (asserts nothing — verify is the gate)
node tools/build-viewer.mjs [--out path]     the page — refuses to write unless verify passes
node tools/verify.mjs BATTLE-VIEWER.html     the headless fold of every battle, every surface, every catch (~50s)
npm run static                   generated/static.json through the door (unit sheets, status names, map list, attack/ability tables, layer names; stamped with the engine commit)
node tools/dump-fields.mjs       generated/fields.json for EVERY map, stamped; projection and exact distance access are engine-owned
python3 tools/prep-art.py [hell-tcg-root]    generated/art/ from the source art + art-src/ (only when art changes; clears orphans)
npm run typecheck                the door, the sheet and the .mts tools — the .js modules are not typed
ALLOW_EXEMPTION_GROWTH=1 …       only for the one commit that records a review's discovery of an unmarked computation
```

**Publishing:** `BATTLE-VIEWER.html` is the one generated page; the artifact is
published *from it*, never from a copy (ruled 2026-09-02: "one HTML that is just
being referenced in two places"). The page carries no timestamp, so after
`gate --land` the sources commit and the page commit are two commits by design —
the page stamps the sources' sha.

**Commit at the end of every session** — `git add -A && git commit` from
`viewer/`. Until 2026-09-02 a week of this work had no history.

---

## Where things live

```
src/engine.ts      THE DOOR — types and read-only content (and hex geometry: distance). Never a rule, a mutator, preview() or the AI.
src/sheet.ts       unit sheets resolved from content — OWED TO THE ENGINE (exemption "sheet")
src/fold.js        PURE: state × event → state + cues. No DOM, no clock. The half every test runs over. Current with engine 4516bbb (2026-09-03): arrivals, the encounter, the kit, corpses, layers, ZoC/AoO, the Deathbed, Surge, Power
src/viewer.js      mountBattleViewer(el, data, opts) → {push, seek, play, pause, step, dispose, …}; the pump, DUR
src/board.js       the DOM half of the board: ground, painted layers, corpses, auras, tokens, floats, banners, hexVFX bridge, camera
src/panel.js       the focus panel          src/actionbar.js   the 12-slot bar + stamina strip
src/actions.js     what an action does/triggers (pure)      src/projection.js   tick projection + danger (pure, exempt)
src/icons.js       the RPG Awesome sprite + the four ability glyphs      src/theme.js   ONE hue per status
src/log.js         the log sentences (pure)  src/hexvfx.js  the canvas VFX library (its palette is patched from theme.js at mount)
src/subject.js     the ONE rule for whose panel/bar/camera it is
src/harness.js     the REPLAY page only: dropdown, transport, rail, log, file-drop, page fit
src/main.js        the standalone entry      src/page.html  its shell      src/styles.css  the stylesheet
tools/             build, verify, gate, the dumps, list-maps.mts (the map list through the door), prep-art, fakedom, exemptions.json, design/ (the Python design surfaces)
art-src/           hand-placed SOURCE art the viewer owns (the parchment); prep-art copies it into generated/
generated/         static.json · fields.json · ra-glyphs.json · art/  — never hand-edit
battles/           the showcase library (library.json is the roster; each file is an export-battle.mts output with its engineCommit stamp)
BATTLE-VIEWER.html generated — never hand-edit
```

## The rules this package lives under

- **Law 0: the viewer computes nothing.** Every number is in the log, in the
  sheet, or the engine owes an event. The nine places it still computes carry an
  `EXEMPTION <name>` marker and are listed in `tools/exemptions.json`; that file
  only shrinks (verify fails on growth). Never add one without writing the debt
  down first, and never without `ALLOW_EXEMPTION_GROWTH=1` in the commit that does.
- **The door is the only way in.** `src/engine.ts`. The gate probes for any other
  engine import.
- **Nothing replay-only below `harness.js`.** No `mode` check inside a draw call.
- **`fold.js` stays pure.** If you need the DOM, return a cue and play it in
  `board.js`.
- **The stylesheet is id-based** (`#stage`, `#panel`, …), so one viewer per
  document until it is classed — a known debt, not a rule.
- **Keys act only while the pointer is over the board** (or the component has
  focus): two viewers on one page must not both pan.
- **The pump never pauses itself when it runs dry** — a live game pushes more.
  The harness hears `onDrain` and shows the replay as paused.
- **Every ruling is dated and lives in its owning document** — the look in the
  VFX documents, the seams in the plan, the laws here.

## Traps (from `VFX/VIEWER-CHECKPOINT.md`, kept here because they bite in this code)

No CSS filters inside the 3D scene · every wrapper in the 3D chain needs
`preserve-3d` · the ground must be the stage's FIRST child · anything low on a
token needs `translateZ` · never redraw floats from a render · `.pip` is the
status pip, prefix new class names · a native `<select>` cannot open in the
artifact pane · verify against script and stylesheet, never the whole file
(base64 art contains everything) · never hardcode a `+` on a delta.
