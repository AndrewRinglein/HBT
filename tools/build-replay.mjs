#!/usr/bin/env node
// node tools/build-replay.mjs <battle.json> <out.html>
//
// Assemble a replay from three committed pieces plus one fresh battle:
//   tools/replay/prefix.html   page shell + hexVFX, verbatim from the original rig
//   tools/replay/static.json   field geometry, terrain table, tokens (base64), art
//   tools/replay/app.js        the viewer application — THE file to edit for new events
//
// The battle comes from:  npx tsx tools/export-battle.mts <replicate> <mapId> <n>
// Commit BEFORE exporting — a battle is a seed, not a recording, and the header
// shows the engine commit so a stale replay says so (README-REPLAY.md).

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const [battlePath, outPath] = process.argv.slice(2)
if (!battlePath || !outPath) {
  console.error('usage: node tools/build-replay.mjs <battle.json> <out.html>')
  process.exit(2)
}
const prefix = readFileSync('tools/replay/prefix.html', 'utf8')
const staticD = JSON.parse(readFileSync('tools/replay/static.json', 'utf8'))
const app = readFileSync('tools/replay/app.js', 'utf8')
const battle = JSON.parse(readFileSync(battlePath, 'utf8'))

const D = { ...staticD, battle }
// The painted art belongs to ONE map (static.json artMapId). A battle on any
// other map gets ENGINE-DERIVED geometry (tools/field-geometry.mts) and no art
// — the viewer paints flat ground from the terrain ids instead. Demoing a map
// over the wrong painting is the trap the visual-replay skill warns about.
if (battle.seed.mapId !== staticD.artMapId) {
  D.field = JSON.parse(execSync(`npx tsx tools/field-geometry.mts ${battle.seed.mapId}`, { encoding: 'utf8' }))
  D.art = null
}
writeFileSync(outPath, prefix + JSON.stringify(D) + app)
console.error(`${outPath} — seed ${battle.seed.replicate} ${battle.seed.mapId} · engine ${battle.engineCommit} · ${battle.events.length} events · ${battle.outcome} in ${battle.turns} turns`)
