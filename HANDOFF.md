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
2. Stage `engine/` and the root `*.md` design docs into your workspace and
   work there. Run `npm install` if node_modules is absent, then
   `npm run typecheck && npx vitest run` — you should see **345 passed / 37
   files**. If you don't, STOP and diff against git before writing anything.
3. Read, in order: `engine/CLAUDE.md` (the project instructions — the laws,
   the vocabulary, the commands), `engine/ENGINE-CONSTITUTION.md`,
   `engine/COMBAT-SEQUENCE.md`. Skim `engine/DECISIONS.md` bottom-up — it is
   the chronological record of Angela's rulings, verbatim.

## 1. Where the world stands

- **Engine repo** (`engine/`, git): HEAD `4c6aa4c`, clean. **Content repo**
  (`content/`, git): HEAD `6b23dd7`, clean. Both repos live ON HER MACHINE;
  commit there after every ship.
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
