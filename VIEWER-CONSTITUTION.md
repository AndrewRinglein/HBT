# Viewer Constitution

*Heroes of Blight and Tragic — the battle viewer.*
*These laws govern the standalone replay page and the battle screen inside the game, which are one component. They were not written here: each was ruled between 2026-08-20 and 2026-09-01 and lived buried in 2,500 lines of design document, which is why they did not bind. Extracted 2026-09-02; the source line is cited so nothing here is invented. Each carries a* Caught by *— a check in `tools/gate.mjs` or `tools/verify.mjs` that fails when the law is broken. A law without a catch is a wish.*

The engine's constitution (`engine/ENGINE-CONSTITUTION.md`) applies here in full where it reaches: plain data, integers, named streams, explicit order, never swallow a failure, every log line names its cause.

---

## Law 0 — The viewer computes nothing.

**Everything on screen is folded out of the event log.** Every quantity the player sees is in the log, in the read-only content the door hands over, or the engine owes an event. The viewer never derives, estimates, re-implements or guesses a number.

> *"The battle surface renders only what the engine emitted. If something cannot be shown, that is a LOG finding — fix the engine's events. Never fake it in the viewer."* — `VFX/BATTLE-ENGINE-DESIGN.md:46`

This is the root; the six below are its consequences. It exists because the engine that simulates must be the engine that plays (`STATE.md`, Q4, ruled 2026-08-26), and a viewer that computes is a second engine that can disagree with the first.

*Caught by:* every number a float carries must appear verbatim in the event that cued it (`verify.mjs`, per battle, per cue). Every place the viewer still computes carries an `EXEMPTION <name>` marker, and `tools/exemptions.json` must list exactly those markers — an unlisted marker fails, a listed marker that no longer exists fails. **The file may only shrink.** Six today; each names the engine event or sheet field that retires it (`THREE-PACKAGES-PLAN.md` §8.3).

---

## The laws

### 1. The viewer never guesses.

> *"If the viewer needs a fact that is not in the log and not in the bundle, the build is incomplete — the viewer never guesses."* — `VFX/PLAYBACK-DESIGN.md:86`

A missing fact is a **build failure**, never a default, a fallback, or a placeholder that looks like data. The one honest placeholder is art: a unit with no token gets an *ART PENDING* standee, never borrowed art.

*Caught by:* `verify.mjs` — every fielded `typeId` has an art entry; every battle's map has field geometry; `generated/fields.json` covers every map the engine authors; `build-viewer.mjs` refuses a stylesheet reference to art that is not in `generated/art/`.

### 2. Render any unit, with zero viewer code per unit.

> *"Playback must render any typeId that has a token + a static entry, with zero viewer code changes per unit."* — `VFX/PLAYBACK-DESIGN.md:107` (Angela, 2026-08-20)

The roster is the content. A new unit is a sheet row and an art file, never a branch in the viewer.

*Caught by:* `verify.mjs` renders the panel and the action bar for **every** unit in **every** library battle, and a dropped export of any map plays (`harness.playExport`). `gate.mjs`'s door probe: the viewer reads content through `src/engine.ts` only.

### 3. Events carry order, never duration.

> *"Timing lives in the viewer. The DUR table is the whole pacing model; events carry order, never duration."* — `VFX/PLAYBACK-DESIGN.md:108`

The clock is the pump's. The fold is pure — state × event → state, plus cues — and has no clock of its own; the pump stamps the `now` it hands in. A replay and a live game play the same fold at the same pace.

*Caught by:* `verify.mjs` folds every battle twice — once through the pumped viewer, once through the pure `fold.js` — and the two final states must be identical. Every type in `DUR` must be a type some log carries. Every type a log carries must be folded or on `verify.mjs`'s explicit ignore list — a new engine event is a failure until it is placed on purpose.

### 4. Legends derive, never hand-typed.

> *"Legends derive, never hand-typed. TEFFECT comes from the engine's field table at build."* — `VFX/PLAYBACK-DESIGN.md:110`

Terrain effects, status names, unit sheets, board geometry: all generated from the engine through the door, into `generated/`, never typed into the viewer. `generated/` is never hand-edited.

*Caught by:* `generated/static.json` and `generated/fields.json` are written by `tools/dump-static.mts` and `tools/dump-fields.mjs` from the door; `verify.mjs` checks the field set against the engine's map list the dump recorded. (A hand edit is not yet caught mechanically — the built page stamps the engine commit it read, so a stale dump says so.)

### 5. Never a condition inside a draw call.

> *"A visual state that exists in one mode and not the other is a branch at the top, never a condition inside a draw call. The moment a `if (mode === …)` appears below the intent layer, the two products have started diverging and this design has failed."* — `VFX/BATTLE-ENGINE-DESIGN.md:156`

Replay-only chrome — transport, scrub, the battle dropdown, the unit rail, the log — lives in `src/harness.js` and nowhere below. `mountBattleViewer()` has no mode.

*Caught by:* `gate.mjs` fails if `src/viewer.js`, `board.js`, `panel.js`, `actionbar.js` or `fold.js` mentions `mode`, `playback`, `harness` or `replay` as an identifier. *(Added to the gate 2026-09-02.)*

### 6. One hue per status, everywhere.

> *"One hue per status, everywhere — pips, VFX, chips, panel."* — `VFX/PLAYBACK-DESIGN.md:109`

`src/theme.js` is the only place a status has a colour. The fold, the board, the panel and the bar all read it.

*Caught by:* `gate.mjs` fails if a status hue literal from `theme.js` appears in any other source file. *(Added 2026-09-02.)*

---

## What this constitution does not cover

The look — sizes, motion, what the danger marker is drawn with — is ruled in `VFX/PLAYBACK-DESIGN.md`, `VFX/UI-BUILD-NOTES-2026-09-02.md` and `VFX/VISUAL-BATTLE-UPDATES.md`, and it changes. The seams between packages are `THREE-PACKAGES-PLAN.md`'s. This file holds only what must not change while the look does.
