# Viewer Constitution

*Heroes of Blight and Tragic — the battle viewer.*
*Seven laws — a root and its six consequences. They govern the standalone replay page and the battle screen inside the game, which are one component. They were not written here: each was ruled between 2026-08-20 and 2026-09-01 and lived buried in 2,500 lines of design document, which is why they did not bind. Extracted 2026-09-02; the source line is cited so nothing here is invented. Each carries a* Caught by *— a check in `tools/gate.mjs` or `tools/verify.mjs` that fails when the law is broken. A law without a catch is a wish.*

The engine's constitution (`engine/ENGINE-CONSTITUTION.md`) applies here in full where it reaches: plain data, integers, named streams, explicit order, never swallow a failure, every log line names its cause.

---

## Law 0 — The viewer computes nothing.

**Everything on screen is folded out of the event log.** Every quantity the player sees is in the log, in the read-only content the door hands over, or the engine owes an event. The viewer never derives, estimates, re-implements or guesses a number.

> *"The battle surface renders only what the engine emitted. If something cannot be shown, that is a LOG finding — fix the engine's events. Never fake it in the viewer."* — `VFX/BATTLE-ENGINE-DESIGN.md:46`

This is the root; the six below are its consequences. It exists because the engine that simulates must be the engine that plays (`STATE.md`, Q4, ruled 2026-08-26), and a viewer that computes is a second engine that can disagree with the first.

*Caught by:* every float cue names the event FIELD its number came from (`n`, `of`), and `verify.mjs` asserts `event[of] === n` for every cue of every battle — not "the number appears somewhere in the event" (review 2026-09-03 measured that weaker test as a coin flip). Every place the viewer still computes carries an `EXEMPTION <name>` marker, and `tools/exemptions.json` must list exactly those markers — an unlisted marker fails, a listed marker that no longer exists fails, and **the list may only shrink**: verify compares it against the committed file and fails on growth unless `ALLOW_EXEMPTION_GROWTH=1` is set for the one commit that records a review's discovery of an unmarked computation. Nine today (six landed with stage 1; three found unmarked in the 2026-09-03 review); each names the engine event or sheet field that retires it (`THREE-PACKAGES-PLAN.md` §8.3).

---

## The laws

### 1. The viewer never guesses.

> *"If the viewer needs a fact that is not in the log and not in the bundle, the build is incomplete — the viewer never guesses."* — `VFX/PLAYBACK-DESIGN.md:86`

A missing fact is a **build failure**, never a default, a fallback, or a placeholder that looks like data. The one honest placeholder is art: a unit with no token gets an *ART PENDING* standee, never borrowed art.

*Caught by:* `verify.mjs` — every fielded `typeId` in the library has an art entry, and a dropped export fielding a `typeId` with none renders the `_pending` standee (the drop test fields one on purpose); `gate.mjs` asks the engine for its map list through the door and fails if either dump lacks a map; `build-viewer.mjs` inlines only what `prep-art.py`'s manifest lists, fails on an orphan file, on a manifest entry with no file, and on a stylesheet reference to art that is not there.

### 2. Render any unit, with zero viewer code per unit.

> *"Playback must render any typeId that has a token + a static entry, with zero viewer code changes per unit."* — `VFX/PLAYBACK-DESIGN.md:107` (Angela, 2026-08-20)

The roster is the content. A new unit is a sheet row and an art file, never a branch in the viewer.

*Caught by:* `verify.mjs` renders the panel and the action bar for **every** unit in **every** library battle, and a dropped export of any map plays (`harness.playExport`). `gate.mjs`'s door probe: the viewer reads content through `src/engine.ts` only.

### 3. Events carry order, never duration.

> *"Timing lives in the viewer. The DUR table is the whole pacing model; events carry order, never duration."* — `VFX/PLAYBACK-DESIGN.md:108`

The clock is the pump's. The fold is pure — state × event → state, plus cues — and has no clock of its own; the pump stamps the `now` it hands in. A replay and a live game play the same fold at the same pace.

*Caught by:* `verify.mjs` folds every battle twice — once through the pumped viewer, once through the pure `fold.js` — and the two final states must be identical. Every type in `DUR` must be folded or ignored; every type a log carries must be folded or on `verify.mjs`'s explicit ignore list — a new engine event is a failure until it is placed on purpose. The fold stamps its lingering view-state from the pump's BEAT clock (wall time × playback speed), so a highlight lasts the same number of beats at every speed; the pump, never a draw call, expires them.

### 4. Legends derive, never hand-typed.

> *"Legends derive, never hand-typed. TEFFECT comes from the engine's field table at build."* — `VFX/PLAYBACK-DESIGN.md:110`

Terrain effects, status names, unit sheets, board geometry: all generated from the engine through the door, into `generated/`, never typed into the viewer. `generated/` is never hand-edited.

*Caught by:* `generated/static.json` and `generated/fields.json` are written by `tools/dump-static.mts` and `tools/dump-fields.mjs` through the door, each stamped with the engine commit it read; `gate.mjs` checks both against the engine's live map list; `verify.mjs` fails if the two dumps carry different engine commits; the page header prints the viewer, engine, sheet and field commits with a `*` for a dirty tree, and carries no build timestamp, so the same sources build the same bytes and `git diff --quiet BATTLE-VIEWER.html` says whether the page is current. (A hand edit of a dump is still not caught mechanically.)

### 5. Never a condition inside a draw call.

> *"A visual state that exists in one mode and not the other is a branch at the top, never a condition inside a draw call. The moment a `if (mode === …)` appears below the intent layer, the two products have started diverging and this design has failed."* — `VFX/BATTLE-ENGINE-DESIGN.md:156`

Replay-only chrome — transport, scrub, the battle dropdown, the unit rail, the log — lives in `src/harness.js` and nowhere below. `mountBattleViewer()` has no mode.

*Caught by:* `gate.mjs` fails if any file under `src/` other than `harness.js` and `main.js` compares `mode` to a string, or mentions `playback`, `harness` or `replay` as a word — strings and comments stripped first. It is a word list, not a parser; the review of 2026-09-03 also found replay knowledge the words could not see (the export's outcome and turn count on the camera HUD, the event counter in the panel's foot) and moved both to the harness. *(Added 2026-09-02, sharpened 2026-09-03.)*

### 6. One hue per status, everywhere.

> *"One hue per status, everywhere — pips, VFX, chips, panel."* — `VFX/PLAYBACK-DESIGN.md:109`

`src/theme.js` is the only place a status has a colour — and the only place any board colour lives: damage types, heals, the buff/debuff pair, the ladder's gold, the note floats. The fold emits cues that say WHAT a float is, never what colour; the board asks theme. The canvas VFX (`hexvfx.js`) ships its own palette and is patched from theme at mount.

*Caught by:* `gate.mjs` fails if a status hue literal from `theme.js` appears in any other source file. It scans six-digit hex literals only; the VFX palette is patched rather than scanned. *(Added 2026-09-02; the fold's colour literals and the protection bar's second blue were found and removed 2026-09-03.)*

---

## What this constitution does not cover

The look — sizes, motion, what the danger marker is drawn with — is ruled in `VFX/PLAYBACK-DESIGN.md`, `VFX/UI-BUILD-NOTES-2026-09-02.md` and `VFX/VISUAL-BATTLE-UPDATES.md`, and it changes. The seams between packages are `THREE-PACKAGES-PLAN.md`'s. This file holds only what must not change while the look does.
