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

**Files.** `units.json`, `attacks.json`, `statuses.json`. Each is an array of
rows with a `note` saying which backlog item the row proves.

**Not here (yet).** `settled.json` → `testCohort` (the six `test-*` clone heroes
and two zombies, 2026-08-20) predates this folder and still ships from there;
and the engine's `src/content/index.ts` still holds the pre-cohort fixtures
(zombie, warrior, ranger, mage, zombie-burning) that ~25 test files build
custom battles from — backlog `test.fixture-migration` moves them here.
