# HANDOFF — The Combat Framework engine chat

*Written 2026-08-21, at the close of the movement batch. You are inheriting the
engine/simulation chat for Heroes of Blight and Tragic. Read this whole file
before touching anything; it is short on purpose and everything it points at is
long.*

---

## 0. First ten minutes

1. Connect the folder `C:\Users\aring\Desktop\Heroes of Blight and Tragic`
   (the whole project). The engine lives in `engine/`, the Codex content
   pipeline in `content/`, design docs at the root, VFX assets in `VFX/`.
2. **Read §0a below first — which surface you are on decides how you work.**
   Then, from `engine/`: `npm run typecheck && npx vitest run` — you should see
   **345 passed / 37 files** (plus 1 todo). If you don't, STOP and diff against
   git before writing anything.
3. Read, in order: `engine/CLAUDE.md` (the project instructions — the laws,
   the vocabulary, the commands), `engine/ENGINE-CONSTITUTION.md`,
   `engine/COMBAT-SEQUENCE.md`. Skim `engine/DECISIONS.md` bottom-up — it is
   the chronological record of Angela's rulings, verbatim.
4. **The `iron-gauntlet` skill is the spine** (`.claude/skills/iron-gauntlet/`,
   added 2026-08-21). It carries the loop, the eleven gate checks, the
   exemption discipline and the pre-flight, and routes to `add-and-verify`,
   `batch-add`, `run-sweep` and `visual-replay`. In Cowork it is installed as
   an account skill and loads automatically; in a terminal it loads from the
   repo. Do not improvise the loop.

## 0a. Which surface you are on — READ THIS BEFORE §0.2

This project has been driven from more than one place, and they are not
equivalent. Diagnose before you start; the 2026-08-21 session lost an hour to
not knowing which it was on.

**Cowork (the Claude desktop app).** File reads and writes hit the real folder
directly. **Commands do not** — the shell is a Linux VM with the folder mounted
in, so `uname -s` says Linux and `C:\` does not exist. The distinction matters
because the project's whole workflow is execution.

- `node_modules` is NOT in git and is NOT in this folder by default. Earlier
  sessions installed into a scratch copy that evaporated with the session,
  which is why the folder can look "already set up" and not be.
- If the sandbox has no network (`npm install` → 403), you cannot install
  anything yourself. **The fix is a one-time install by Andrew on Windows**,
  which puts the packages on disk where the sandbox can read them:
  ```
  npm install
  npm install --no-save --no-package-lock --force \
    @rolldown/binding-linux-x64-gnu@1.2.3 \
    @esbuild/linux-x64@0.28.2 \
    @typescript/typescript-linux-x64@7.0.2
  ```
  The second line adds Linux binaries beside the Windows ones so BOTH sides can
  run the suite. Versions must match what `package.json` resolves to — read
  them from `node_modules/<pkg>/package.json`, do not copy these blindly.
- **Git locks.** The old advice here said `.git/*.lock` "can't be unlinked" and
  gave a `_stale_locks` workaround. That was wrong: Cowork blocks file deletion
  until the user approves it. Call `allow_cowork_file_delete` once and
  `rm -f .git/*.lock` works normally. The workaround is retired.
- **You can delete files** after that approval, so the old "no rm on the
  device" rule is also retired for this surface.

**A terminal (Claude Code).** Commands run natively on Windows. Everything
works except the two child-process tests, which were made cross-platform on
2026-08-21 — but Git Bash is still the better shell.

**A bridge session** (`device_bash` / `device_commit_files`). What §4 below
describes. If those tools are not in your list, §4 does not apply to you, and
neither does the stage-a-copy-and-push-back model in §0.2 — edit the files in
place instead. That model is what caused the `settled.json` clobbers in §3.

## 1. Where the world stands

- **Engine repo** (`engine/`, git): HEAD `9408a12`, clean. **Content repo**
  (`content/`, git): HEAD `646499d`, clean, untouched 2026-08-21 afternoon.
  Commit after every ship.
- **2026-08-21 afternoon, five commits, none of them game mechanics:**
  `77cef46` lockfile name · `82238d3` the suite and gauntlet no longer assume a
  POSIX shell · `79ff0e6` doc rot + the new `iron-gauntlet` skill · `9408a12` a
  verification check-run. Details in §8.
- **The standard battle is 6v4**: six Codex-tracked test heroes (one per
  class — test-oathblade, test-sky-pirate, test-dusk-hawk, test-air-mage,
  test-lucius, test-osric) vs 3 test-zombies + 1 test-zombie-burning. They are
  READ FROM DATA: `content/settled.json testCohort` → `assemble.mjs` →
  `mkenginepack.mjs` → `engine/src/content/generated/pack.ts` (NEVER
  hand-edit; regenerate: `cd content && node assemble.mjs && node
  mkenginepack.mjs`) → loud loader `src/content/pack.ts`. To tweak a test
  hero, edit its clone in settled.json and regenerate — never the original.
- **Movement is content** (landed today): rows in `src/content/moves.ts`
  (power.move / power.sidestep cd1 / power.side-roll / the flight ladder),
  grants in unit data (`moves: [...]`), AI chooses by SHAPE never by name.
  Enemies carry exactly one movement power and pay no stamina.
- **Benched beasts** (hero-side, out of the party until party assembly
  exists): spirit-snake, green-drake (flies — the only flight grantor),
  shadow-hound-puppy (enemy-side placeholder, awaiting her real stat block).
- **Statuses landed**: poison, burn, regeneration, bleed, stun/daze,
  weak/enfeeble, protection/ward, slow/hobble. Terrain ground effects
  (burning/poisoned/water) on the two-beat rhythm (entry + End of Activation).

## 2. The workflow — non-negotiable

Everything lands through the **Iron Gauntlet**. You do not decide whether an
item passed; `node tools/gate.mjs <id>` decides, and `--land` commits.

```
node tools/next.mjs                      what's ready
node tools/gate.mjs <id>                 check (changes nothing)
node tools/gate.mjs <id> --land          land it
node tools/review.mjs <id> --ok "..."    record ANGELA's verdict, her words only
node tools/audit-all.mjs --label "..."   batch close (MANDATORY at batch end)
node tools/decided.mjs "question"        BEFORE asking Angela anything
```

- The `batch-add`, `add-and-verify`, `run-sweep`, `visual-replay` skills in
  `engine/.claude/skills/` are the loops. Use them, don't improvise.
- Never edit `.state/backlog.json` status by hand. Never weaken a test to
  pass a gate — a flagged landing is the CORRECT outcome for legitimate test
  edits (write the Law-10 reason in a comment at the edit).
- Exemptions (`unreachable`, `generalizationExempt`, ...) demand ≥20-char
  written reasons, withhold the seal, and flag for her review. Genuine
  structural cases only (precedent: the benched drake).
- Ambiguity → a switch in `SWITCHES.md`, not a question. Value you're about
  to type → grep the design docs for its owner first (`grep -rn "<id>" ..
  --include=*.md`). Both failure modes have bitten this project; CLAUDE.md
  tells the stories.

## 3. HAZARD: the concurrent Codex chat

Another chat works `content/` at the same time and has TWICE overwritten
`settled.json` from a stale snapshot, erasing the testCohort, hero rulings,
drake attacks and Drake's Maw (2026-08-20 and again 2026-08-21). The content
git caught both; both were merge-restored, nothing lost.

**Protocol, both directions:**
1. **RE-STAGE every content/ file from the device immediately before editing
   it** — your staged copy goes stale the moment the other chat writes.
2. Commit to the content git after every write, with a message saying what
   changed.
3. If `device_commit_files` rejects for mtime drift: that IS the other chat.
   Re-stage, diff against `git show HEAD:<file>`, merge THEIR additions with
   the restored data — never pick one side blind.
4. The other chat also *publishes Angela's rulings* in settled.json `powers`
   etc. Check the diff for new rulings before assuming clobber = garbage;
   today's sidestep-cooldown/Side Roll/flight-ladder rulings arrived exactly
   that way, mid-clobber.

## 4. Device quirks (her machine, via the bridge)

- **git locks can't be unlinked**: on `index.lock exists`, `mkdir -p
  .git/_stale_locks && mv .git/*.lock .git/_stale_locks/<name>.$(date +%s)`
  then retry. Commit with `git -c user.name=Claude -c
  user.email=noreply@anthropic.com commit ...`.
- **No rm on the device** — move unwanted files into a `_to_delete/` or
  `_archive/` folder instead.
- Commit per-file with `expectedMtimeMs` where her hand-edits are possible
  (root design docs especially); `force` only for engine files you own.
- `.claude/` paths are refused by device_commit_files — write those via a
  base64 heredoc in device_bash.
- The pipeline runs ON THE DEVICE fine (node v22): `cd content && node
  assemble.mjs && node mkenginepack.mjs` then stage the regenerated
  `engine/src/content/generated/pack.ts` back to your workspace.

## 5. Her review queue (pending — do not clear it yourself)

4 flagged landings await her verdict via `node tools/review.mjs` (run it only
when she has actually reviewed, quoting her words):
`fix.beast-pen-hero-correction`, `content.test-cohort`, `movement.powers`,
`movement.flight`. The Game Builder (`GAME-BUILDER.html`, both copies — engine/
and project root) shows the ledger; ship both copies whenever the gate
rebuilds it.

## 6. Open threads, in her words where possible

- **Weapons phase**: "Stats first, weapons next." The cohort has no engine
  loadout yet; item slots live in the Codex only.
- **test.fixture-migration** (backlog chore): ~25 test files still field the
  old dictated warrior/ranger/mage/zombie defs as custom-battle fixtures;
  migrate them to the pack, then delete the old defs from index.ts.
- **Shadow Hound Puppy**: awaiting her dictated stat block (snake/drake
  precedent — it goes in the Codex, not hardcoded).
- **Party assembly**: the mechanism that would field benched beasts. Doesn't
  exist; nothing scheduled.
- **3 unpublished ids from movement.powers**: power.move / power.sidestep /
  power.side-roll are Codex rows but CODEX.md prints their NAMES, not id
  strings, so content-check counts them INVENTED. Fix belongs in the Codex
  chat's renderer (print ids in the power table) — then the flag clears.
- **Sprint**: published in GAME-DESIGN with no grantor, "Not ruled". Do not
  add a row for it.
- **Old unanswered design questions**: the Marked contradiction; Weak's
  duration. Check `node tools/decided.mjs` before re-asking — they may have
  been ruled in the Codex chat since.
- **Backlog**: `node tools/next.mjs`. movement.powers/flight are done; the
  passes #9-13 items (roles/hills/mage/cooldowns) predate the gauntlet era —
  read them skeptically against what already exists.

## 7. Working with Angela

Bring her: gate-5 data, gates that failed for DESIGN reasons, genuine forks.
Don't bring her: anything a switch absorbs, code failures (fix them), numbers
a sweep can measure, questions decided.mjs answers. She dictates content in
plain speech — transcribe VERBATIM into DECISIONS.md and the Codex
(settled.json), never paraphrase, never invent adjacent values ("copy, don't
invent"). When she corrects you, the correction is a ruling; record it. All
content changes go through the Codex source of truth — "This should be updated
inside of the codex, inside of our source of truth, not hard-coded somewhere."

---

## 8. The 2026-08-21 afternoon session — tooling, and two open findings

No game mechanic moved. All eight control-battle hashes are byte-identical to
the ones in `.state/baseline.hash`, before and after.

**What landed (outside the gauntlet — see the caveat).**

- **The suite and the gauntlet no longer assume a POSIX shell** (`82238d3`).
  Five places used bash-only syntax. Two of them *failed open*, which is why
  this was not cosmetic:
  - `gate.mjs`'s kill-switch check expects its command to FAIL. Under `cmd.exe`
    it failed because `CF_DISABLE_IDS` is not a program — so the tautology
    check would have passed **every** item while testing nothing.
  - `effect-size.mts`'s WITHOUT arm would not have run at all, reporting
    `NO MEASURABLE EFFECT` — a number that would have gone to Angela.
  - `killswitch.test.ts`'s Law 9 test passed on Windows for the wrong reason:
    `toThrow()` was satisfied by the shell error, not the loud failure.
  - `gate.mjs --abandon` joined two git commands with `;`, so on `cmd.exe` the
    clean never ran and abandon left the tree dirty while reporting success.
  - `replay.test.ts` hardcoded `/tmp` and `/bin/bash`, so on Windows the file
    failed to load and its 18 tests were **skipped, not reported**.
- **Doc rot** (`79ff0e6`). `pnpm verify` / `pnpm sweep` never existed (npm, and
  the gauntlet replaced them); `packages/` has never existed (it is `src/`);
  `engine/CLAUDE.md` still carried the retired Activation definition while the
  root `CLAUDE.md` had the new one. A third stale copy of two skills was
  archived out of `skills-to-install/`.
- **The `iron-gauntlet` skill** (`79ff0e6`), and installed into Cowork so it
  auto-loads there.

**CAVEAT — none of this went through the gate.** There is no backlog item for
tooling or docs, and `gate.mjs` only operates on backlog ids. It was committed
directly, with typecheck, the full 345/37 suite and all eight baseline hashes
as the standing evidence. If that should have been a backlog row, it still can
be, retroactively. Flagged deliberately rather than buried.

**Two findings NOT acted on — both real, both still open:**

1. **Ability cooldowns are off by one against the settled convention.**
   `2-ACTIONS-SETTLED.md:71` and the ruling at `2-ACTIONS-NOTES.md:1060` say
   *"CD N = skip N Turns. CD 0 is usable again next Turn."* `movement.ts:55`
   implements exactly that (`turn + cooldown + 1`). `ability.ts:99` does not —
   `turn + a.cooldown`. So `power.mage.bolt` at CD 6 skips 5 turns, and any
   ability at CD 1 would be a no-op. `test/additions.test.ts:172` currently
   asserts the wrong behaviour, so fixing it is a test edit needing a Law 10
   reason. Nothing in `SWITCHES.md` or the inbox tracks this.
2. **`additions.test.ts` is coupled to a fact nobody stated.** It asserts
   `cds.length === casts.length` for `cooldown.set` events — but
   `setMoveCooldown` emits that event too, and `power.sidestep` (cd 1) is
   granted to four of the six standard heroes. It passes only because none of
   them runs out of stamina at replicate 1. Landed before `movement.powers`
   existed; it will break the first time a hero sidesteps in that battle.

**Also still true:** the four flagged landings in §5 are still awaiting her
verdict. Nothing was reviewed or cleared.
