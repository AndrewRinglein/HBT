// The node --test lists that run against the page — ONE list, read by the gate's `--part tests` (tools/gate.mjs) and by
// build-viewer.mjs before it writes BATTLE-VIEWER.html (they were two copies until viewer.play-input, 2026-09-30).
// Each inner list is one `node --test` run with VIEWER_PAGE set to the page under test.
export const PAGE_TESTS = [
  ['tools/terrain-scene.test.mjs', 'tools/terrain-player.test.mjs', 'tools/atlas-combat.test.mjs', 'tools/presentation-review.test.mjs', 'tools/bursts-player.test.mjs', 'tools/clock.test.mjs', 'tools/targeting.test.mjs', 'tools/base-hero-art.test.mjs', 'tools/opportunity-step.test.mjs', 'tools/painted-board.test.mjs', 'tools/character-models.test.mjs', 'tools/under-unit.test.mjs', 'tools/play-input.test.mjs'],
  ['tools/direct-map.test.mjs'],
]
