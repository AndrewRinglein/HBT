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
//                       2. typecheck (src/*.ts, tools/*.mts), the tool suites and
//                          test/ — the page tests that ask the engine's content
//                          (moved here from engine/test, Andrew 2026-10-01);
//                       2b. the engine's map list against both dumps
//   --part verify k/4   3. the candidate page in .build/ (deterministic: no
//                          timestamp) — built ONCE per tree, every verify and tests
//                          part checks that one copy — and verify.mjs over slice k of the
//                          library (tools/verify-slices.mjs; slice 1 also runs
//                          every check that is not per battle)
//   --part tests        3b. the node --test lists that run against the page
//   --status            which parts passed on this tree, and verify's library-wide
//                       checks over the facts of all four slices
//   --land              A PAGE LANDING. Since 2026-10-06 (tool.landing-on-the-quick-check; engine/DECISIONS.md
//                       'the one plan: land on the quick check, run the whole suites twice a day, four streams
//                       and one lander'): refuses unless the page is built and every VERIFY part passed on THIS
//                       tree against the one candidate, unchanged, built from the same engine code and viewer
//                       commit — the page plays its battles through: cursor equals events, the outcome matches;
//                       then writes that candidate as BATTLE-VIEWER.html — no rebuild. The checks and tests
//                       parts are not asked for: one that was not run is printed SKIPPED with the last
//                       scheduled run, never PASS; one that was run on this tree and FAILED still refuses.
//                       (Until that day: refused unless EVERY part passed on this tree.)
//   (no flag)           every part in sequence, in one command, recorded — for a
//                       shell with no time limit; says whether --land may run. This is
//                       the viewer's suite of the scheduled run (engine/tools/suites.mjs
//                       --run all --full, twice a day): where the checks and tests parts run
//   --fresh             re-export every library battle from the engine at ../engine
//                       and diff it byte-for-byte against battles/ — the engine's
//                       own regression test for the library (plan §8.4). A
//                       difference is reported, never written over. Not a part.
//
// TESTS FOLLOW WHAT CHANGED (Andrew, 2026-10-04, engine/DECISIONS.md 'combat is tested only when
// the engine changed; a visual change does not re-run the fights' and 'the same for content and
// kingdom changes: each kind of change runs its own tests'; engine/tools/code-stamp.mjs,
// engine/tools/suites.mjs). The parts are still recorded against the exact tree, and a landing of
// viewer CODE is what it was: every part on this tree, then --land. Two things are new:
//   · when every part is green the gate appends one line to .state/passes.jsonl — the gate passed on
//     THE VIEWER'S CODE (src/, tools/, test/, the battle library; not generated/ and not the built
//     page), beside the other packages' code as it stood. A merge keeps that line; combine and wrap
//     read it, so the merge-back does not run this gate again on the same code.
//   · --land on a tree whose parts have NOT all passed no longer always refuses: when the viewer's
//     code has a recorded pass — only a regenerated dump, a document or the commit the page stamps
//     moved — it rebuilds the page and lands it, printing every part SKIPPED with the reason and the
//     page REBUILT, NOT RE-VERIFIED. Never PASS for a part that did not run (Law 9).
// What it costs, as ruled: the gate plays the engine's battles and kingdom's built page, and its
// pass is keyed on the viewer's code alone — a new content pack or an engine change that breaks the
// page's playback is found at the once-per-chat full run (combine --full), not at the rebuild.
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync, execSync } from 'node:child_process'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { mergedFails } from './verify-slices.mjs'
import { PAGE_TESTS } from './page-tests.mjs'
import { codeStamp, stampOf, allStamps, PACKAGES } from '../../engine/tools/code-stamp.mjs'
import { readPasses, hasPass, appendPass, appendFail, copyName, suiteLastScheduledNow, SCHEDULED_COMMAND } from '../../engine/tools/suites.mjs'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(PKG)
const argv = process.argv.slice(2)
const dirtyOk = argv.includes('--dirty-ok')
class GateFail extends Error {}
const fail = (m) => { throw new GateFail(m) }

const SLICES = 4
const RECORD = '.build/gate-parts.json'
const CANDIDATE = '.build/gate-candidate.html'
/* the page tests run as TEST_PARTS parts (viewer.caravan-scene, 2026-10-01): the one tests part had grown to 165-168 s against
   Cowork's ~178 s kill — one more test file and it could never finish there. Each part is one share of PAGE_TESTS' files in
   order, consecutive files of the same list still one node --test run. */
const TEST_PARTS = 2
const PARTS = ['checks', ...Array.from({ length: SLICES }, (_, i) => `verify ${i + 1}/${SLICES}`), ...Array.from({ length: TEST_PARTS }, (_, i) => `tests ${i + 1}/${TEST_PARTS}`)]

/* the working tree as `git add -A` would commit it, through a throwaway index;
   .build/ (the record, the candidate), BATTLE-VIEWER.html (what --land writes) and .state/ (the pass record the gate
   itself appends) leave the hash staged or not */
function treeHash() {
  const idx = join(tmpdir(), `vgate-index-${process.pid}-${Date.now()}`)
  try { copyFileSync(resolve(execSync('git rev-parse --git-path index', { encoding: 'utf8' }).trim()), idx) } catch {}
  const env = { ...process.env, GIT_INDEX_FILE: idx }
  try {
    execSync('git add -A -- .', { env, stdio: 'pipe' })   // .build/ is gitignored; a ":!.build" pathspec makes git refuse
    /* the page is the gate's output, not its input: --land writing it must not change the tree it was verified on (GBH SWITCHES gate.pageOutsideTree) */
    execSync('git rm -r -q --cached --ignore-unmatch -- .build BATTLE-VIEWER.html .state', { env, stdio: 'pipe' })
    return execSync('git write-tree', { env, encoding: 'utf8' }).trim()
  } finally { try { rmSync(idx, { force: true }) } catch {} }
}
const readRecord = () => { try { return JSON.parse(readFileSync(RECORD, 'utf8')) } catch { return null } }
const sha256 = f => createHash('sha256').update(readFileSync(f)).digest('hex')
const secs = t0 => Math.round((Date.now() - t0) / 1000)

/* ── 1–2b · the static checks ───────────────────────────────────────────── */
function checks(rec) {
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
  try { execFileSync('node', ['--test', 'tools/fakedom.test.mjs', 'tools/runtime-metadata.test.mjs', 'tools/elemental-display.test.mjs', 'tools/damage-packets.test.mjs', 'tools/bursts.test.mjs', 'tools/loadout-swap.test.mjs', 'tools/item-uses.test.mjs', 'tools/prop-destroy.test.mjs', 'tools/vocabulary.test.mjs'], { stdio: 'inherit' }) }
  catch { fail('runtime metadata isolation or tool catalog validation') }
  /* 2a · test/ — the viewer's page tests against the engine's content, run on the engine's vitest, against THIS tree's
     candidate page (built once per tree, as the tests parts use it): the landed page cannot carry the change being gated
     (GBH SWITCHES gate.checksOnCandidate) */
  candidate(rec)
  try { execFileSync('node', ['../engine/node_modules/vitest/vitest.mjs', 'run', '--dir', 'test', '--reporter=dot'], { stdio: 'inherit', env: { ...process.env, VIEWER_PAGE: resolve(CANDIDATE) } }) }
  catch { fail('test/ — the page tests against the engine') }
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

/* ── 3 · the candidate page: built ONCE, never verified here, only ever in .build/ ──
   Andrew, 2026-10-01: the gate builds its candidate once and runs every check against that one
   copy, instead of rebuilding it for each part. The build is recorded with the parts
   (rec.candidate: its sha256 and what it was built from); a part reuses it while the tree, the
   file's bytes, the engine's code stamp and the viewer commit the page stamps are all unchanged,
   and builds it again only when one of them moved. */
const candidateInputs = () => {
  let head = 'none'
  try { head = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch {}
  const { stamp, dirty } = codeStamp()
  return { engine: stamp, engineDirty: dirty, viewerHead: head }
}
const sameInputs = (a, b) => !!a && !!b && a.engine === b.engine && a.engineDirty === b.engineDirty && a.viewerHead === b.viewerHead
/** why the recorded candidate cannot be reused, or null when it can */
function staleCandidate(rec, inputs = candidateInputs()) {
  const c = rec && rec.candidate
  if (!c) return 'no candidate built on this tree'
  if (!existsSync(CANDIDATE) || sha256(CANDIDATE) !== c.page) return 'the candidate file is missing or changed'
  if (!sameInputs(c.inputs, inputs)) return `an input outside this tree changed since it was built (engine ${c.inputs.engine} → ${inputs.engine}, viewer ${String(c.inputs.viewerHead).slice(0, 7)} → ${inputs.viewerHead.slice(0, 7)})`
  return null
}
function candidate(rec) {
  const inputs = candidateInputs()
  if (!staleCandidate(rec, inputs)) { console.log(`candidate: reusing ${CANDIDATE} · sha256 ${rec.candidate.page.slice(0, 12)} (built once on this tree)`); return rec.candidate.page }
  mkdirSync('.build', { recursive: true })
  try { execFileSync('node', ['tools/build-viewer.mjs', '--candidate', CANDIDATE], { stdio: 'inherit' }) } catch { fail('build') }
  rec.candidate = { page: sha256(CANDIDATE), inputs, at: new Date().toISOString() }
  writeFileSync(RECORD, JSON.stringify(rec, null, 1) + '\n')   // saved now: a part that dies after the build still leaves it reusable
  return rec.candidate.page
}
function verifySlice(k, rec) {
  const page = candidate(rec)
  const factsFile = join(tmpdir(), `vgate-facts-${process.pid}-${Date.now()}.json`)
  let facts = null, ok = true
  try { execFileSync('node', ['tools/verify.mjs', CANDIDATE, '--slice', `${k}/${SLICES}`, '--facts', factsFile], { stdio: 'inherit' }) } catch { ok = false }
  try { facts = JSON.parse(readFileSync(factsFile, 'utf8')) } catch {}
  try { rmSync(factsFile, { force: true }) } catch {}
  if (!facts || facts.k !== k || facts.n !== SLICES) ok = false
  return { ok, page, facts, why: ok ? '' : facts ? 'verify failed' : 'verify failed before it recorded its facts' }
}
/** the node --test runs of test part k (1-based): PAGE_TESTS' files in order, cut into TEST_PARTS shares by count */
function testRuns(k, n = TEST_PARTS, lists = PAGE_TESTS) {
  const files = lists.flatMap((list, li) => list.map(f => ({ f, li }))), per = Math.ceil(files.length / n)
  const runs = []
  for (const { f, li } of files.slice((k - 1) * per, k * per)) { const last = runs.at(-1); if (last && last.li === li) last.files.push(f); else runs.push({ li, files: [f] }) }
  return runs.map(r => r.files)
}
function pageTests(k, rec) {
  const page = candidate(rec)
  let ok = true
  for (const list of testRuns(k)) try { execFileSync('node', ['--test', ...list], { stdio: 'inherit', env: { ...process.env, VIEWER_PAGE: resolve(CANDIDATE) } }) } catch { ok = false }
  return { ok, page, why: ok ? '' : 'a node --test list failed' }
}

/* ── the viewer's code, and the record a merge keeps (2026-10-04) ─────────── */
const ROOT = resolve(PKG, '..')
/** the viewer's code as it stands — engine/tools/code-stamp.mjs PACKAGE_CODE.viewer, the one definition */
const codeNow = () => stampOf('viewer', PKG)
const withKeyNow = () => { const s = allStamps(ROOT); return PACKAGES.map(p => s[p]).join('.') }
const when = p => `${String(p.at).slice(0, 16).replace('T', ' ')}${p.by ? ', ' + p.by : ''}${p.in ? ', in ' + p.in : ''}`
/** every part passed on this tree: one line in .state/passes.jsonl, against the viewer's code. `with` names the other
    packages' code only when every part ran on this code beside the code they all have now (the full run reads it). */
function recordGreen(parts) {
  const stamps = allStamps(ROOT), code = stamps.viewer, key = PACKAGES.map(p => stamps[p]).join('.')
  if (!PARTS.every(p => parts[p] && parts[p].code === code)) return   // the code moved under the parts: no pass for it
  const together = PARTS.every(p => parts[p].withKey === key) && PACKAGES.every(p => /^[0-9a-f]{10}$/.test(stamps[p]))
  appendPass(PKG, { suite: 'viewer', stamp: code, with: together ? stamps : null, at: new Date().toISOString(), by: 'gate (every part)', in: copyName(ROOT) })
}

/* ── one part, recorded ─────────────────────────────────────────────────── */
function runPart(name) {
  const t0 = Date.now(), tree = treeHash()
  let rec = readRecord()
  if (!rec || rec.tree !== tree || rec.slices !== SLICES) rec = { tree, slices: SLICES, parts: {} }   // a new tree: no parts, no candidate
  let r
  try {
    if (name === 'checks') { checks(rec); r = { ok: true } }
    else if (name.startsWith('tests ')) r = pageTests(+name.match(/^tests (\d+)\//)[1], rec)
    else r = verifySlice(+name.match(/^verify (\d+)\//)[1], rec)
  } catch (e) { if (!(e instanceof GateFail)) throw e; r = { ok: false, why: e.message } }
  rec.parts[name] = { ...r, secs: secs(t0), at: new Date().toISOString(), code: codeNow(), withKey: withKeyNow() }
  mkdirSync('.build', { recursive: true })
  writeFileSync(RECORD, JSON.stringify(rec, null, 1) + '\n')
  // a failed part is recorded against the viewer's code too: an older pass on this code is not relied on after it (--land then refuses)
  if (!r.ok) appendFail(PKG, { suite: 'viewer', stamp: rec.parts[name].code, by: `gate --part ${name}`, in: copyName(ROOT) })
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
  /* A PAGE LANDING (tool.landing-on-the-quick-check, 2026-10-06; engine/DECISIONS.md 'the one plan: land on the quick check,
     run the whole suites twice a day, four streams and one lander': "A page item also needs the page to build and play its
     battles through (the viewer gate's verify part), once per group, by the lander" · "Dropped: … the viewer's whole gate at
     every page landing (its checks and tests parts)"). `verified`: the page is built and every verify part passed on this
     tree against that one page — cursor equals events, the outcome matches, the library-wide checks over all four slices.
     The checks and tests parts are not asked for: `unrun` are the ones not run on this tree, said SKIPPED at the landing and
     run by the scheduled run. `failed`: a part that WAS run on this tree and failed — that is a failure in hand, not a
     check that was not run, and it still refuses the landing (GBH SWITCHES landing.viewerPartFailedStillRefuses). */
  const verifyParts = PARTS.filter(p => p.startsWith('verify'))
  const failed = PARTS.filter(p => cur[p] && !cur[p].ok)
  const unrun = PARTS.filter(p => !cur[p])
  const verified = verifyParts.every(p => cur[p] && cur[p].ok) && pages.size === 1 && !!merged && !merged.length && !failed.length
  const code = codeNow()
  if (green) recordGreen(cur)
  const pass = green ? null : hasPass(readPasses(PKG), 'viewer', code)
  console.log(`gate parts on tree ${tree.slice(0, 10)} (viewer code ${code}):\n${lines.join('\n')}\n` + (green ? 'ALL PARTS PASS — node tools/gate.mjs --land may write BATTLE-VIEWER.html'
    : verified ? `THE PAGE IS BUILT AND EVERY VERIFY PART PASSES — node tools/gate.mjs --land may write BATTLE-VIEWER.html. Not run on this tree, and not needed for a page landing (the scheduled run runs them): ${unrun.join(', ')}`
    : todo.length ? `still to run for a page landing: ${todo.filter(p => p.startsWith('verify') || failed.includes(p)).map(p => `node tools/gate.mjs --part ${p}`).join(' · ') || 'the verify parts again, against one page'}${unrun.some(p => !p.startsWith('verify')) ? ` — and, for the whole gate (the scheduled run): ${unrun.filter(p => !p.startsWith('verify')).map(p => `--part ${p}`).join(' · ')}` : ''}` : 'not landable')
    + (pass ? `\nviewer code ${code} has a recorded pass (${when(pass)}): the parts above are not needed for a tree that differs only in regenerated files or documents — node tools/gate.mjs --land rebuilds the page and says the parts were SKIPPED` : ''))
  return { green, verified, unrun, failed, page: green || verified ? [...pages][0] : null }
}

const partArg = argv.indexOf('--part')
if (partArg >= 0) {
  const name = [argv[partArg + 1], argv[partArg + 2]].filter(Boolean).join(' ').trim()
  const want = ['verify', 'tests'].includes(argv[partArg + 1]) ? name : argv[partArg + 1]
  if (!PARTS.includes(want)) { console.error(`usage: node tools/gate.mjs --part checks | --part verify <k>/${SLICES} | --part tests <k>/${TEST_PARTS}`); process.exit(2) }
  process.exit(runPart(want) ? 0 : 1)
}
if (argv.includes('--status')) process.exit(status().green ? 0 : 1)
if (argv.includes('--land')) {
  const tree = treeHash(), st = status(tree)
  if (!st.green && !st.verified) {
    // The page has not been played through on this tree. If the viewer's CODE is the code its gate last passed on, only a
    // regenerated file, a document or the stamped commit moved (2026-10-04: none of them starts the gate): rebuild
    // the page and land it, every part said to be SKIPPED. Otherwise refuse.
    // (Until 2026-10-06 the refusal read 'every part must pass on this exact tree first': a page landing asked for the
    // checks and tests parts too. tool.landing-on-the-quick-check: it asks for the page built and the verify parts.)
    const code = codeNow()
    const pass = hasPass(readPasses(PKG), 'viewer', code)
    if (!pass || st.failed.length) { console.error(`GATE REFUSES --land — ${st.failed.length ? `a part that was run on this tree FAILED (${st.failed.join(', ')}): fix it, or the tree, first` : `the page must be built and every verify part must pass on this exact tree first (node tools/gate.mjs --part verify k/${SLICES}, k = 1..${SLICES})`}`); process.exit(1) }
    let rec = readRecord()
    if (!rec || rec.tree !== tree || rec.slices !== SLICES) rec = { tree, slices: SLICES, parts: {} }
    let page
    try { page = candidate(rec) } catch (e) { if (!(e instanceof GateFail)) throw e; console.error('GATE REFUSES --land — ' + e.message); process.exit(1) }
    console.log('')
    for (const p of PARTS) console.log(`  SKIPPED  part ${p} — viewer code ${code} unchanged since its gate passed (${when(pass)})`)
    copyFileSync(CANDIDATE, 'BATTLE-VIEWER.html')
    if (treeHash() !== tree) { console.error('GATE REFUSES --land — the tree changed while the page was written'); process.exit(1) }
    console.log(`landed BATTLE-VIEWER.html · sha256 ${page.slice(0, 12)} · REBUILT, NOT RE-VERIFIED: no part was run on tree ${tree.slice(0, 10)} — the viewer's code is the code its gate passed on, and only regenerated files or documents differ. Its playback is next checked by the scheduled run of the whole suites (from engine/: ${SCHEDULED_COMMAND}), twice a day.`)
    process.exit(0)
  }
  // no rebuild: the candidate every part checked is the page that lands, if it is still that page
  const rec = readRecord(), stale = staleCandidate(rec)
  if (stale) { console.error(`GATE REFUSES --land — ${stale}. Run the verify and tests parts again`); process.exit(1) }
  const page = rec.candidate.page
  if (page !== st.page) { console.error(`GATE REFUSES --land — the candidate is ${page.slice(0, 12)}, the parts verified ${st.page.slice(0, 12)}. Run the verify and tests parts again`); process.exit(1) }
  // the parts a page landing does not ask for and that were not run on this tree: said SKIPPED, with the last scheduled run — never PASS (Law 9)
  if (!st.green) { console.log(''); for (const p of st.unrun) console.log(`  SKIPPED  part ${p} — not run at a page landing: the viewer's whole gate is run by the scheduled run (from engine/: ${SCHEDULED_COMMAND}); ${suiteLastScheduledNow(ROOT, 'viewer')}`) }
  copyFileSync(CANDIDATE, 'BATTLE-VIEWER.html')
  if (treeHash() !== tree) { console.error('GATE REFUSES --land — the tree changed while the page was written'); process.exit(1) }
  console.log(st.green ? `landed BATTLE-VIEWER.html · sha256 ${page.slice(0, 12)} · the page every part verified on tree ${tree.slice(0, 10)}`
    : `landed BATTLE-VIEWER.html · sha256 ${page.slice(0, 12)} · BUILT AND PLAYED THROUGH: the ${SLICES} verify parts passed against this page on tree ${tree.slice(0, 10)}; NOT RUN: ${st.unrun.join(', ')}`)
  process.exit(0)
}
if (argv.includes('--fresh')) {
  try {
    mkdirSync('.build', { recursive: true })
    /* an export from a dirty engine tree stamps HEAD's sha and is not HEAD's
       battle — refuse unless told the caller knows (review 2026-09-03) */
    const engineDirty = codeStamp().dirty
    if (engineDirty && !dirtyOk) fail('--fresh: the engine tree is dirty; its exports would carry the committed code stamp for battles the committed code did not produce. Land or stash it, or pass --dirty-ok to compare anyway')
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
if (argv.length && !(argv.length === 1 && dirtyOk)) { console.error('usage: node tools/gate.mjs [--part checks | --part verify k/' + SLICES + ' | --part tests k/' + TEST_PARTS + ' | --status | --land | --fresh [--dirty-ok]]'); process.exit(2) }

/* no flag: every part, in sequence, in one command */
for (const p of PARTS) runPart(p)
console.log('')
process.exit(status().green ? 0 : 1)
