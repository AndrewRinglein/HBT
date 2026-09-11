#!/usr/bin/env node
// The viewer's gate — the minimum on day one (THREE-PACKAGES-PLAN §3):
//   1. the DOOR PROBE — nothing under src/ or tools/ imports an engine path
//      except src/engine.ts (the kingdom's ISC-003 rule, at this altitude)
//   2. typecheck (src/*.ts, tools/*.mts)
//   3. build (which runs verify.mjs before writing BATTLE-VIEWER.html)
//
//   node tools/gate.mjs            check only: builds to .build/, never touches BATTLE-VIEWER.html
//   node tools/gate.mjs --land     the same, then writes BATTLE-VIEWER.html
//   node tools/gate.mjs --fresh    also re-export every library battle from the
//                                  engine at ../engine and diff it byte-for-byte
//                                  against battles/ — the engine's own regression
//                                  test for thirteen real battles (plan §8.4).
//                                  A difference is reported, never written over.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(PKG)
const fresh = process.argv.includes('--fresh'), land = process.argv.includes('--land'), dirtyOk = process.argv.includes('--dirty-ok')
const fail = (m) => { console.error('GATE FAIL — ' + m); process.exit(1) }

/* 1 · the door probe */
{
  const offenders = []
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|ts|mjs|mts)$/.test(f)) {
      const rel = relative(PKG, p).replaceAll('\\', '/')
      if (rel === 'src/engine.ts') continue
      /* any mention of the engine's source tree at all — import, require,
         dynamic import, a path in a template string (review 2026-09-03: the
         old regex missed a template-string import in dump-fields) */
      const src = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')   // prose may name the engine; code may not
      for (const m of src.matchAll(/engine[\\/]src\b/g)) offenders.push(`${rel} names the engine's source (${src.slice(Math.max(0, m.index - 30), m.index + 12).replace(/\s+/g, ' ')})`)
    } } }
  walk('src'); walk('tools')
  if (offenders.length) fail('the door is not the only way in:\n  ' + offenders.join('\n  '))
  console.log('door probe: only src/engine.ts imports the engine')
}
/* 1b · Law 5 — no mode below the intent layer; Law 6 — one hue per status */
{
  /* strings first, then comments — a URL in a string must not hide the rest of its line */
  const strip = src => src.replace(/`(?:\\.|[^`\\])*`/g, '``').replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  /* everything below the intent layer: all of src/ except the harness and the page entry */
  /* RECURSIVE, like the door probe and the hue probe above it: src/ is flat
     today, so a flat scan caught everything — and would silently exit the law
     the day anyone makes src/fx/ (REVIEW §D7, 2026-09-04) */
  const below = []
  ;(function walk(d) { for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + f.name
    if (f.isDirectory()) walk(p)
    else if (/\.(js|ts|mjs|mts)$/.test(f.name) && !['src/harness.js', 'src/main.js'].includes(p)) below.push(p) } })('src')
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
try { execFileSync('node', ['../engine/node_modules/typescript/bin/tsc', '--noEmit'], { stdio: 'inherit' }); console.log('typecheck (the door, the sheet, the .mts tools — the .js is not typed): clean') }
catch { fail('typecheck') }
/* 2b · the engine's map list, through the door, against both dumps */
{
  const tsx = resolve('../engine/node_modules/tsx/dist/cli.mjs')
  const maps = execFileSync('node', [tsx, 'tools/list-maps.mts'], { encoding: 'utf8' }).trim().split(/\s+/)
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), statics = JSON.parse(readFileSync('generated/static.json', 'utf8'))
  const missF = maps.filter(m => !fields[m]), missS = maps.filter(m => !(statics.maps || []).includes(m))
  if (missF.length) fail(`generated/fields.json lacks ${missF.join(', ')} — run node tools/dump-fields.mjs`)
  if (missS.length) fail(`generated/static.json lacks ${missS.join(', ')} — run npm run static`)
  console.log(`maps: ${maps.length} in the engine, all in both dumps`)
}
/* 3 · build + verify — into .build/ unless --land */
mkdirSync('.build', { recursive: true })
const outPage = land ? 'BATTLE-VIEWER.html' : join('.build', 'BATTLE-VIEWER.html')
try { execFileSync('node', ['tools/build-viewer.mjs', '--out', outPage], { stdio: 'inherit' }) } catch { fail('build/verify') }
if (!land) console.log('check only — BATTLE-VIEWER.html untouched (pass --land to write it)')

/* --fresh · re-export and diff */
if (fresh) {
  /* an export from a dirty engine tree stamps HEAD's sha and is not HEAD's
     battle — refuse unless told the caller knows (review 2026-09-03) */
  const engineDirty = execFileSync('git', ['-C', '../engine', 'status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0
  if (engineDirty && !dirtyOk) fail('--fresh: the engine tree is dirty; its exports would carry HEAD\'s sha for battles HEAD did not produce. Land or stash it, or pass --dirty-ok to compare anyway')
  const lib = JSON.parse(readFileSync('battles/library.json', 'utf8')).battles
  const tsx = resolve('../engine/node_modules/tsx/dist/cli.mjs')
  let diffs = 0
  for (const { file, label } of lib) {
    const cur = JSON.parse(readFileSync(join('battles', file), 'utf8'))
    /* a scenario export carries its replicate too (--seed <n>, engine 2026-09-03): re-export with the same dice */
    const args = cur.seed.scenarioId ? ['--scenario', cur.seed.scenarioId, ...(cur.seed.replicate != null ? ['--seed', String(cur.seed.replicate)] : [])]
      : [String(cur.seed.replicate), cur.seed.mapId, String(cur.seed.enemyCount)]
    let out
    try { out = execFileSync('node', [tsx, 'tools/export-battle.mts', ...args], { cwd: '../engine', encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }) }
    catch (e) { console.error(`fresh: ${label} — export failed: ${String(e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')}`); diffs++; continue }
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
