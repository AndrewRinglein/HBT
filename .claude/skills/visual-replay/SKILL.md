---
name: visual-replay
description: Run a visual test of The Combat Framework — export a real battle, build the replay page with tokens and VFX, verify every new mechanic is visible on screen, and land the work as a Game Builder batch. Use when asked for a visual test, a replay, a simulation you can watch, or after landing mechanics that should be seen moving.
---
# visual-replay — RETIRED 2026-09-03

This skill drove `tools/build-replay.mjs` and `tools/replay/` to write
`VFX/replay.html`. That rig is superseded and its output is deleted: **the
viewer is its own package, `viewer/`** (`THREE-PACKAGES-PLAN.md` stage 1,
landed 2026-09-02). The generator files still exist only because deleting them
is the engine thread's landing (`STATE.md`, Visual Battle Engine row).

To watch a battle:

1. Export it — `npx tsx tools/export-battle.mts <seed> <mapId> 8 > b.json`
   (or `--scenario <id>`), from `engine/`.
2. Open `viewer/BATTLE-VIEWER.html` and drop `b.json` anywhere on the page.
   Or add it to `viewer/battles/library.json` and run `node tools/gate.mjs --land`
   from `viewer/`.

Read `viewer/CLAUDE.md`. Do not run the old commands; they rebuild a deleted page.
