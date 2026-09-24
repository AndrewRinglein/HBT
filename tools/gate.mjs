#!/usr/bin/env node
// The viewer's gate — the minimum on day one (THREE-PACKAGES-PLAN §3), in parts
// since 2026-09-23 (Andrew: "shorten the checks so a chat can run them"; the
// kingdom's shape, kingdom/tools/gate.mjs). Cowork's shell kills a command at
// ~178 s and the one-command gate took over five minutes, so the same checks
// run as separate commands, each recorded against a hash of the exact working
// tree (everything `git add -A` would commit; .build/ is never in it). Nothing
// is dropped or weakened — only split:
//
//   --part checks       1. the DOOR PROBE — nothing under src/ or tools/ names the
//                          engine's source except src/engine.ts; 1b. Laws 5 and 6;
//                       2. typecheck (src/*.ts, tools/*.mts) and the tool suites;
//                       2b. the engine's map list against both dumps
//   --part verify k/4   3. build the candidate page into .build/ (deterministic: no
//                          timestamp) and run verify.mjs over slice k of the
//                          library (tools/verify-slices.mjs; slice 1 also runs
//                          every check that is not per battle)
//   --part tests        3b. the node --test lists that run against the page
//   --status            which parts passed on this tree, and verify's library-wide
//                       checks over the facts of all four slices
//   --land              refuses unless every part passed on THIS tree and the
//                       page rebuilds byte-identical to the one they verified;
//                       then writes BATTLE-VIEWER.html
//   (no flag)           every part in sequence, in one command, recorded — for a
//                       shell with no time limit; says whether --land may run
//   --fresh             re-export every library battle from the engine at ../engine
//                       and diff it byte-for-byte against battles/ — the engine's
//                       own regression test for the library (plan §8.4). A
//                       difference is reported, never written over. Not a part.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs'
import { execFileSync, execSync } from 'node:child_process'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { mergedFails } from './verify-slices.mjs'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(PKG)
const argv = process.argv.slice(2)
const dirtyOk = argv.includes('--dirty-ok')
class GateFail extends Error {}
const fail = (m) => { throw new GateFail(m) }

const SLICES = 4
const RECORD = '.build/gate-parts.json'
const CANDIDATE = '.build/gate-candidate.html'
const PARTS = ['checks', ...Array.from({ length: SLICES }, (_, i) => `verify ${i + 1}/${SLICES}`), 'tests']

/* the working tree as `git add -A` would commit it, through a throwaway index;
   .build/ (the record, the candidate) leaves the hash staged or not */
function treeHash() {
  const idx = join(tmpdir(), `vgate-index-${process.pid}-${Date.now()}`)
  try { copyFileSync(resolve(execSync('git rev-parse --git-path index', { encoding: 'utf8' }).trim()), idx) } catch {}
  const env = { ...process.env, GIT_INDEX_FILE: idx }
  try {
    execSync('git add -A -- .', { env, stdio: 'pipe' })   // .build/ is gitignored; a ":!.build" pathspec makes git refuse
    execSync('git rm -r -q --cached --ignore-unmatch -- .build', { env, stdio: 'pipe' })
    return execSync('git write-tree', { env, encoding: 'utf8' }).trim()
  } finally { try { rmSync(idx, { force: true }) } catch {} }
}
const readRecord = () => { try { return JSON.parse(readFileSync(RECORD, 'utf8')) } catch { return null } }
const sha256 = f => createHash('sha256').update(readFileSync(f)).digest('hex')
const secs = t0 => Math.round((Date.now() - t0) / 1000)

/* ── 1–2b · the static checks ───────────────────────────────────────────── */
function checks() {
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
  try { execFileSync('node', ['--test', 'tools/fakedom.test.mjs', 'tools/runtime-metadata.test.mjs', 'tools/elemental-display.test.mjs', 'tools/damage-packets.test.mjs', 'tools/bursts.test.mjs', 'tools/loadout-swap.test.mjs', 'tools/item-uses.test.mjs', 'tools/prop-destroy.test.mjs'], { stdio: 'inherit' }) }
  catch { fail('runtime metadata isolation or tool catalog validation') }
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
}

/* ── 3 · the candidate page: built, never verified here, only ever in .build/ ── */
function buildCandidate() {
  mkdirSync('.build', { recursive: true })
  try { execFileSync('node', ['tools/build-viewer.mjs', '--candidate', CANDIDATE], { stdio: 'inherit' }) } catch { fail('build') }
  return sha256(CANDIDATE)
}
function verifySlice(k) {
  const page = buildCandidate()
  const factsFile = join(tmpdir(), `vgate-facts-${process.pid}-${Date.now()}.json`)
  let facts = null, ok = true
  try { execFileSync('node', ['tools/verify.mjs', CANDIDATE, '--slice', `${k}/${SLICES}`, '--facts', factsFile], { stdio: 'inherit' }) } catch { ok = false }
  try { facts = JSON.parse(readFileSync(factsFile, 'utf8')) } catch {}
  try { rmSync(factsFile, { force: true }) } catch {}
  if (!facts || facts.k !== k || facts.n !== SLICES) ok = false
  return { ok, page, facts, why: ok ? '' : facts ? 'verify failed' : 'verify failed before it recorded its facts' }
}
const PAGE_TESTS = [
  ['tools/terrain-scene.test.mjs', 'tools/terrain-player.test.mjs', 'tools/atlas-combat.test.mjs', 'tools/presentation-review.test.mjs', 'tools/bursts-player.test.mjs', 'tools/clock.test.mjs', 'tools/targeting.test.mjs', 'tools/base-hero-art.test.mjs', 'tools/opportunity-step.test.mjs'],
  ['tools/direct-map.test.mjs'],
]
function pageTests() {
  const page = buildCandidate()
  let ok = true
  for (const list of PAGE_TESTS) try { execFileSync('node', ['--test', ...list], { stdio: 'inherit', env: { ...process.env, VIEWER_PAGE: resolve(CANDIDATE) } }) } catch { ok = false }
  return { ok, page, why: ok ? '' : 'a node --test list failed' }
}

/* ── one part, recorded ─────────────────────────────────────────────────── */
function runPart(name) {
  const t0 = Date.now(), tree = treeHash()
  let rec = readRecord()
  if (!rec || rec.tree !== tree || rec.slices !== SLICES) rec = { tree, slices: SLICES, parts: {} }
  let r
  try {
    if (name === 'checks') { checks(); r = { ok: true } }
    else if (name === 'tests') r = pageTests()
    else r = verifySlice(+name.match(/^verify (\d+)\//)[1])
  } catch (e) { if (!(e instanceof GateFail)) throw e; r = { ok: false, why: e.message } }
  rec.parts[name] = { ...r, secs: secs(t0), at: new Date().toISOString() }
  mkdirSync('.build', { recursive: true })
  writeFileSync(RECORD, JSON.stringify(rec, null, 1) + '\n')
  console.log(`\npart ${name}: ${r.ok ? 'PASS' : 'FAIL — ' + r.why} (${secs(t0)} s) · tree ${tree.slice(0, 10)}`)
  return r.ok
}

/* ── which parts passed on this tree ─────────────────────────────────────── */
function status(tree = treeHash()) {
  const rec = readRecord(), cur = rec && rec.tree === tree && rec.slices === SLICES ? rec.parts : {}
  const lines = [], todo = []
  for (const p of PARTS) { const r = cur[p]
    lines.push(`  ${p.padEnd(12)} ${!r ? 'not run on this tree' : r.ok ? `PASS (${r.secs} s)` : `FAIL — ${r.why}`}`)
    if (!r || !r.ok) todo.push(p) }
  const pages = new Set(PARTS.filter(p => cur[p] && cur[p].page).map(p => cur[p].page))
  if (pages.size > 1) lines.push(`  page         the parts verified ${pages.size} different pages (an input outside this tree — the engine, a HEAD commit — changed between them): run the verify and tests parts again`)
  const slices = PARTS.filter(p => p.startsWith('verify')).map(p => cur[p])
  let merged = null
  if (slices.every(s => s && s.facts)) {                   // judged whenever all four recorded their facts, green or not
    merged = mergedFails(slices.map(s => s.facts), SLICES)
    lines.push(`  library-wide ${merged.length ? 'FAIL\n    ' + merged.join('\n    ') : 'PASS (every battle driven once; icons, row kinds, status frames over all slices)'}`)
  }
  const green = !todo.length && pages.size === 1 && merged && !merged.length
  console.log(`gate parts on tree ${tree.slice(0, 10)}:\n${lines.join('\n')}\n` + (green ? 'ALL PARTS PASS — node tools/gate.mjs --land may write BATTLE-VIEWER.html'
    : todo.length ? `still to run: ${todo.map(p => `node tools/gate.mjs --part ${p}`).join(' · ')}` : 'not landable'))
  return { green, page: green ? [...pages][0] : null }
}

const partArg = argv.indexOf('--part')
if (partArg >= 0) {
  const name = [argv[partArg + 1], argv[partArg + 2]].filter(Boolean).join(' ').trim()
  const want = argv[partArg + 1] === 'verify' ? name : argv[partArg + 1]
  if (!PARTS.includes(want)) { console.error(`usage: node tools/gate.mjs --part checks | --part verify <k>/${SLICES} | --part tests   (k = 1..${SLICES})`); process.exit(2) }
  process.exit(runPart(want) ? 0 : 1)
}
if (argv.includes('--status')) process.exit(status().green ? 0 : 1)
if (argv.includes('--land')) {
  const tree = treeHash(), st = status(tree)
  if (!st.green) { console.error('GATE REFUSES --land — every part must pass on this exact tree first'); process.exit(1) }
  let page
  try { page = buildCandidate() } catch (e) { console.error('GATE FAIL — ' + e.message); process.exit(1) }
  if (page !== st.page) { console.error(`GATE REFUSES --land — the page rebuilds as ${page.slice(0, 12)}, the parts verified ${st.page.slice(0, 12)}: an input outside this tree (the engine, the HEAD commit the page stamps) changed since. Run the verify and tests parts again`); process.exit(1) }
  if (treeHash() !== tree) { console.error('GATE REFUSES --land — the tree changed while the page was rebuilt'); process.exit(1) }
  copyFileSync(CANDIDATE, 'BATTLE-VIEWER.html')
  console.log(`landed BATTLE-VIEWER.html · sha256 ${page.slice(0, 12)} · the page every part verified on tree ${tree.slice(0, 10)}`)
  process.exit(0)
}
if (argv.includes('--fresh')) {
  try {
    mkdirSync('.build', { recursive: true })
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
      try { out = cur.atlasSetup
        ? execFileSync('node',[tsx,'tools/battle-atlas/combat-build.mts','--export-file',resolve('battles',file)],{cwd:'..',encoding:'utf8',maxBuffer:1<<28,stdio:['ignore','pipe','pipe']})
        : execFileSync('node', [tsx, 'tools/export-battle.mts', ...args], { cwd: '../engine', encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }) }
      catch (e) { console.error(`fresh: ${label} — export failed: ${String(e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')}`); diffs++; continue }
      const nu = JSON.parse(out)
      const same = JSON.stringify(nu.events) === JSON.stringify(cur.events) && nu.outcome === cur.outcome && nu.turns === cur.turns && (!cur.atlasSetup || (JSON.stringify(nu.atlasSetup)===JSON.stringify(cur.atlasSetup)&&JSON.stringify(nu.atlasScene)===JSON.stringify(cur.atlasScene)))
      if (same) console.log(`fresh: ${label} — byte-identical events (${cur.engineCommit} → ${nu.engineCommit})`)
      else {
        diffs++
        const at = nu.events.findIndex((e, i) => JSON.stringify(e) !== JSON.stringify(cur.events[i]))
        console.error(`fresh: ${label} — DIFFERS at event ${at} (${cur.engineCommit} → ${nu.engineCommit}): ${JSON.stringify(cur.events[at])?.slice(0, 120)} vs ${JSON.stringify(nu.events[at])?.slice(0, 120)}`)
        writeFileSync(join('.build', file), out)
      }
    }
    if (diffs) fail(`${diffs} library battle(s) differ from a fresh export — the new exports are in .build/, nothing in battles/ was touched`)
  } catch (e) { if (!(e instanceof GateFail)) throw e; console.error('GATE FAIL — ' + e.message); process.exit(1) }
  console.log('FRESH OK')
  process.exit(0)
}
if (argv.length && !(argv.length === 1 && dirtyOk)) { console.error('usage: node tools/gate.mjs [--part checks | --part verify k/' + SLICES + ' | --part tests | --status | --land | --fresh [--dirty-ok]]'); process.exit(2) }

/* no flag: every part, in sequence, in one command */
for (const p of PARTS) runPart(p)
console.log('')
process.exit(status().green ? 0 : 1)
