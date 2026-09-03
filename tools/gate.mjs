#!/usr/bin/env node
// The viewer's gate — the minimum on day one (THREE-PACKAGES-PLAN §3):
//   1. the DOOR PROBE — nothing under src/ or tools/ imports an engine path
//      except src/engine.ts (the kingdom's ISC-003 rule, at this altitude)
//   2. typecheck (src/*.ts, tools/*.mts)
//   3. build (which runs verify.mjs before writing BATTLE-VIEWER.html)
//
//   node tools/gate.mjs            check only; exit 1 on the first failure
//   node tools/gate.mjs --fresh    also re-export every library battle from the
//                                  engine at ../engine and diff it byte-for-byte
//                                  against battles/ — the engine's own regression
//                                  test for thirteen real battles (plan §8.4).
//                                  A difference is reported, never written over.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(PKG)
const fresh = process.argv.includes('--fresh')
const fail = (m) => { console.error('GATE FAIL — ' + m); process.exit(1) }

/* 1 · the door probe */
{
  const offenders = []
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|ts|mjs|mts)$/.test(f)) {
      const rel = relative(PKG, p)
      if (rel === 'src/engine.ts') continue
      const src = readFileSync(p, 'utf8')
      for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) if (/(^|\/)engine\//.test(m[1])) offenders.push(`${rel} imports ${m[1]}`)
    } } }
  walk('src'); walk('tools')
  if (offenders.length) fail('the door is not the only way in:\n  ' + offenders.join('\n  '))
  console.log('door probe: only src/engine.ts imports the engine')
}
/* 1b · Law 5 — no mode below the intent layer; Law 6 — one hue per status */
{
  const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const below = ['src/viewer.js', 'src/board.js', 'src/panel.js', 'src/actionbar.js', 'src/fold.js']
  const bad = []
  for (const f of below) for (const m of strip(readFileSync(f, 'utf8')).matchAll(/\bmode\s*[!=]==?\s*['"]|\b(playback|harness|replay)\b/g)) bad.push(`${f}: "${m[0].trim()}"`)
  if (bad.length) fail('Law 5 — a mode word below the intent layer:\n  ' + bad.join('\n  '))
  const theme = readFileSync('src/theme.js', 'utf8')
  const hues = [...theme.matchAll(/hue:\s*'(#[0-9a-f]{6})'/g)].map(m => m[1])
  const leaks = []
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|ts)$/.test(f) && f !== 'theme.js' && f !== 'hexvfx.js') { const src = readFileSync(p, 'utf8')
      for (const h of hues) if (src.toLowerCase().includes(h)) leaks.push(`${relative(PKG, p)} carries status hue ${h}`) } } }
  walk('src')
  if (leaks.length) fail('Law 6 — a status hue outside theme.js:\n  ' + leaks.join('\n  '))
  console.log('laws 5 and 6: no mode below the intent layer, no status hue outside theme.js')
}
/* 2 · typecheck */
try { execFileSync('node', ['../engine/node_modules/typescript/bin/tsc', '--noEmit'], { stdio: 'inherit' }); console.log('typecheck: clean') }
catch { fail('typecheck') }
/* 3 · build + verify */
try { execFileSync('node', ['tools/build-viewer.mjs'], { stdio: 'inherit' }) } catch { fail('build/verify') }

/* --fresh · re-export and diff */
if (fresh) {
  const lib = JSON.parse(readFileSync('battles/library.json', 'utf8')).battles
  const tsx = resolve('../engine/node_modules/tsx/dist/cli.mjs')
  let diffs = 0
  for (const { file, label } of lib) {
    const cur = JSON.parse(readFileSync(join('battles', file), 'utf8'))
    const args = cur.seed.scenarioId ? ['--scenario', cur.seed.scenarioId] : [String(cur.seed.replicate), cur.seed.mapId, String(cur.seed.enemyCount)]
    let out
    try { out = execFileSync('node', [tsx, 'tools/export-battle.mts', ...args], { cwd: '../engine', encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }) }
    catch (e) { console.error(`fresh: ${label} — export failed: ${e.message}`); diffs++; continue }
    const nu = JSON.parse(out)
    const same = JSON.stringify(nu.events) === JSON.stringify(cur.events) && nu.outcome === cur.outcome && nu.turns === cur.turns
    if (same) console.log(`fresh: ${label} — byte-identical events (${cur.engineCommit} → ${nu.engineCommit})`)
    else {
      diffs++
      const at = nu.events.findIndex((e, i) => JSON.stringify(e) !== JSON.stringify(cur.events[i]))
      console.error(`fresh: ${label} — DIFFERS at event ${at} (${cur.engineCommit} → ${nu.engineCommit}): ${JSON.stringify(cur.events[at])?.slice(0, 120)} vs ${JSON.stringify(nu.events[at])?.slice(0, 120)}`)
      writeFileSync(join('.build', file), out)
    }
  }
  if (diffs) fail(`${diffs} library battle(s) differ from a fresh export — the new exports are in .build/, nothing in battles/ was touched`)
}
console.log('GATE OK')
