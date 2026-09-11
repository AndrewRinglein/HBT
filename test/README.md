# content/test — the test receptacle

**What this is.** Test content for the engine: bodies, attacks, triggers and
statuses that exist to PROVE a mechanism, never to ship. It lives here, beside
the real content, and reaches the engine through the same converter
(`mkenginepack.mjs` → `pack.test`) and the same loader as everything real.
Ruled 2026-09-02 (Andrew): *"We're not testing features if we're not pulling
them from the right way. When you hardcode something, it sort of tests the
features, but it doesn't really test it all the way."*

**The rule.** A test row is either a **delta over a real row** (`from` names a
real unit or attack id; `set` overrides fields; `attacks` / `triggers` /
`moves` replace the list) or, when no real row is close, a **complete body**.
Prefer the delta — a test body that starts from real content stays honest when
the real row moves.

**Ids are the test family and nothing else.** Units `test-*`, attacks
`attack.test-*`, triggers `test.*` or `trigger.test-*`, statuses `test.status.*`.
The converter refuses anything else; the engine's naming gate refuses it again.

**Wipe and refill.** Everything here is disposable. When a mechanism is proven
and real content carries it, delete the test rows; the tests that fielded them
are rewritten to real content or deleted with them. Nothing here is design,
and `content-check` lists every id here as `test`, never as INVENTED.

**Files.** `units.json`, `attacks.json`, `abilities.json`, `statuses.json`. Each
is an array of rows with a `note` saying which backlog item the row proves.
Ids: units `test-*`, attacks `attack.test-*`, powers `power.test-*`, statuses
`test.status.*`, triggers `test.*` / `trigger.test-*`.

V2 also uses `maps.json` (`test.map.*`) and `encounters.json`
(`test.encounter.*`). Complete map rows carry a name, note and rectangular glyph
rows; optional board/format metadata must match. TEST encounters name TEST maps,
declare their board and use the normal setup/schedule shape. Both pass through
the same bounded dimension validation as shipping content.

**Since 2026-09-02 (`test.fixture-migration`)** the engine's pre-cohort fixtures
live here too: `test-warrior`, `test-ranger`, `test-mage` (the 2026-08-14 bodies,
kept exactly), their six attacks and the Arcane Bolt, all renamed into the test
family. The engine types no unit but the three dictated beasts.

**Not here.** `settled.json` → `testCohort` (the six `test-*` clone heroes and
two zombies, 2026-08-20) predates this folder and still ships from there; its
rows swing the attacks in `attacks.json`.
