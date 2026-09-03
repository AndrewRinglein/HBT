#!/usr/bin/env node
// Write generated/fields.json — board geometry and terrain for EVERY authored
// map, keyed by mapId, from the engine's own tools/field-geometry.mts.
//   node tools/dump-fields.mjs [engineRoot]
// Interim (THREE-PACKAGES-PLAN §3): when the engine's `viewer.geometry` item
// moves that tool into src/, this file goes away and the door supplies it.
// Every map is dumped, not only the library's, so a dropped export from any
// map can play (plan §8.6). Never hand-edit the output.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const engine = resolve(process.argv[2] ?? '../engine')
const tsx = resolve('../engine/node_modules/tsx/dist/cli.mjs')
/* the map list comes through the door (tools/list-maps.mts), never a direct engine import */
const list = execFileSync('node', [tsx, 'tools/list-maps.mts'], { encoding: 'utf8' }).trim().split(/\s+/)
const sha = (() => { try { return execFileSync('git', ['-C', engine, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() } catch { return 'unknown' } })()
const dirty = (() => { try { return execFileSync('git', ['-C', engine, 'status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0 } catch { return false } })()
const fields = {}
for (const id of list) {
  const f = JSON.parse(execFileSync('node', [tsx, 'tools/field-geometry.mts', id], { cwd: engine, encoding: 'utf8', maxBuffer: 1 << 26 }))
  if (f.tilt !== 49.3 || f.colStep !== 128) throw new Error(`STALE GEOMETRY for ${id}: tilt ${f.tilt} colStep ${f.colStep} — the engine's field-geometry.mts is not the board-space one`)
  fields[id] = f
}
fields._engine = { commit: sha, dirty }
writeFileSync('generated/fields.json', JSON.stringify(fields))
console.log(`fields.json: ${list.length} maps (${list.join(', ')}) · engine ${sha}${dirty ? ' (DIRTY tree)' : ''}`)
