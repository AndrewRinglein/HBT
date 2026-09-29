// tools/wrong-home.mjs — the wrong-home audit (tool.wrong-home-audit, 2026-09-28).
//
// Andrew, 2026-09-28 (DECISIONS.md "the opening is tested with the player's party, not the Alpha Team;
// the prior-art audit also finds what the engine holds that belongs elsewhere"): "…or that the engine
// had something that was supposed to be somewhere else and we need to remove it from the engine."
// tools/prior-art.mjs finds a new copy of something the tree already has; this finds what the engine
// holds that another package owns — the removal list, generated/wrong-home.md.
//
// Prior art, extended: the gate's hardcode scan (content-instance ids and creature tags on added
// src/core lines) and the duplication review's pass 3, "content in code" (a one-off read). Four
// findings, in hand-written engine source (engine/src, generated/ excluded):
//   Codex row typed in the engine     an object keyed by, or with the id of, a content id — a family
//                                     the Codex authors (every family in content/hbt-content.json but
//                                     test) and not one of the engine's own names (generated/vocabulary.json)
//   Codex value typed beside its id   an object naming a content id with an engine stat typed as a number
//   kingdom fact                      a number under a campaign key (tools/wrong-home.json kingdomKeys)
//   viewer display fact               a colour literal outside src/view (the engine's own text renderer)
// A file or id tools/wrong-home.json rules to be the engine's (the ground table) is never listed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tokenize, sourceFiles, changedFiles, heldVerdict, ROOT, HERE } from './prior-art.mjs'

const ID = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9.-]*$/
const LOGIC = /^engine\/src\/(core|ai|sim)\//
const COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function readRules(path = join(HERE, 'wrong-home.json')) {
  const r = JSON.parse(readFileSync(path, 'utf8'))
  for (const e of r.ruledEngine ?? []) if (!e.path || !e.ruling || e.ruling.length < 20) throw new Error(`wrong-home.json: a ruled engine entry needs a path and its ruling — ${JSON.stringify(e).slice(0, 80)}`)
  return { ruledEngine: r.ruledEngine ?? [], kingdomKeys: new Set(r.kingdomKeys ?? []) }
}

/** The Codex's ids (id → where its row sits) and the families it authors. `sources`: { file label: parsed JSON }. */
export function codexIndex(sources) {
  const ids = new Map()
  const walk = (o, p) => {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${p}[${i}]`))
    else if (o && typeof o === 'object') {
      if (typeof o.id === 'string' && ID.test(o.id) && !ids.has(o.id)) ids.set(o.id, p)
      for (const k of Object.keys(o)) walk(o[k], `${p}.${k}`)
    }
  }
  for (const [file, json] of Object.entries(sources)) walk(json, file)
  const families = new Set([...ids.keys()].map((i) => i.split('.')[0]))
  families.delete('test')   // the test lane: engine scenarios and content/test rows, not the Codex's
  return { ids, families }
}

/** The engine's own names — events, effect kinds, hooks, outcomes, layers, terrain: never a content row. */
export function engineNames(vocabulary) {
  const out = new Set()
  const add = (x) => { if (typeof x === 'string') out.add(x); else if (x && typeof x === 'object' && typeof x.id === 'string') out.add(x.id) }
  for (const [k, v] of Object.entries(vocabulary)) if (k !== '_' && Array.isArray(v)) v.forEach(add)
  return { names: out, stats: new Set(vocabulary.stats ?? []) }
}

export function loadContext(root = ROOT) {
  return {
    // the published Codex, then the authored rows it is built from (statuses live only in settled.json)
    codex: codexIndex(Object.fromEntries(['hbt-content.json', 'settled.json'].map((f) => [`content/${f}`, JSON.parse(readFileSync(join(root, 'content', f), 'utf8'))]))),
    engine: engineNames(JSON.parse(readFileSync(join(root, 'engine', 'generated', 'vocabulary.json'), 'utf8'))),
    rules: readRules(),
  }
}

const ownerOf = (id, ctx) => (ctx.codex.ids.has(id) ? ctx.codex.ids.get(id) : `the Codex's ${id.split('.')[0]} rows — no row yet`)

/** Findings in one engine file. */
export function scanEngineFile(path, text, ctx) {
  if (ctx.rules.ruledEngine.some((e) => e.path === path && !e.ids)) return []
  const ruledIds = new Set(ctx.rules.ruledEngine.filter((e) => e.path === path && e.ids).flatMap((e) => e.ids))
  const T = tokenize(text), out = []
  const is = (k, v) => T[k] && T[k].t === 'p' && T[k].v === v
  const content = (s) => ID.test(s) && ctx.codex.families.has(s.split('.')[0]) && !ctx.engine.names.has(s) && !ruledIds.has(s)
  /** The `{` that opens the object literal token k sits in (null at top level or inside ( / [ ). */
  const opener = (k) => {
    let d = 0
    for (let j = k - 1; j >= 0; j--) {
      if (T[j].t !== 'p') continue
      if (T[j].v === '}' || T[j].v === ')' || T[j].v === ']') d++
      else if (T[j].v === '{' || T[j].v === '(' || T[j].v === '[') { if (d === 0) return T[j].v === '{' ? j : null; d-- }
    }
    return null
  }
  /** The depth-1 `key: literal` entries of the object opened at token o. */
  const entries = (o) => {
    const res = []
    let d = 0
    for (let j = o + 1; T[j]; j++) {
      if (T[j].t === 'p' && (T[j].v === '{' || T[j].v === '(' || T[j].v === '[')) { d++; continue }
      if (T[j].t === 'p' && (T[j].v === '}' || T[j].v === ')' || T[j].v === ']')) { if (d === 0) break; d--; continue }
      if (d === 0 && (T[j].t === 'id' || T[j].t === 'str') && is(j + 1, ':') && T[j + 2] && (is(j - 1, '{') || is(j - 1, ','))) {
        const v = T[j + 2], neg = is(j + 2, '-') && T[j + 3]?.t === 'num'
        res.push({ key: T[j].v, line: T[j].line, value: neg ? `-${T[j + 3].v}` : v.v, t: neg ? 'num' : v.t })
      }
    }
    return res
  }
  const rows = new Set()
  for (let k = 0; k < T.length; k++) {
    const t = T[k]
    if (t.t === 'str' && content(t.v)) {
      // a row keyed by the id: 'attack.drake.snap': { … }
      if (is(k + 1, ':') && is(k + 2, '{') && !rows.has(k + 2)) { rows.add(k + 2); out.push({ what: 'Codex row typed in the engine', file: path, line: t.line, id: t.v, owner: ownerOf(t.v, ctx) }); continue }
      const o = opener(k)
      // a row with the id: { id: 'attack.drake.snap', … }
      if (o !== null && is(k - 1, ':') && T[k - 2]?.t === 'id' && T[k - 2].v === 'id' && !rows.has(o)) { rows.add(o); out.push({ what: 'Codex row typed in the engine', file: path, line: t.line, id: t.v, owner: ownerOf(t.v, ctx) }); continue }
      // a value beside its id: { unit: 'unit.zombie', maxHp: 12 }
      if (o !== null && is(k - 1, ':') && !rows.has(o)) {
        const typed = entries(o).filter((e) => e.t === 'num' && ctx.engine.stats.has(e.key))
        if (typed.length) { rows.add(o); out.push({ what: 'Codex value typed beside its id', file: path, line: typed[0].line, id: t.v, detail: typed.map((e) => `${e.key}: ${e.value}`).join(', '), owner: ownerOf(t.v, ctx) }); continue }
      }
      // a content name the engine's logic reads: applyStatus(ctx, id, 'status.protection', …) in core
      if (LOGIC.test(path) && ctx.codex.ids.has(t.v)) out.push({ what: 'content name in engine logic', file: path, line: t.line, id: t.v, owner: ownerOf(t.v, ctx) })
    }
    // a campaign quantity: { xp: 5 }
    if ((t.t === 'id' || t.t === 'str') && ctx.rules.kingdomKeys.has(t.v) && is(k + 1, ':') && (T[k + 2]?.t === 'num' || is(k + 2, '{') || is(k + 2, '[')) && (is(k - 1, '{') || is(k - 1, ',')))
      out.push({ what: 'kingdom fact', file: path, line: t.line, id: t.v, owner: 'the kingdom (a campaign quantity: tools/wrong-home.json kingdomKeys)' })
    // a colour
    if (t.t === 'str' && COLOUR.test(t.v) && !path.startsWith('engine/src/view/'))
      out.push({ what: 'viewer display fact', file: path, line: t.line, id: t.v, owner: 'the viewer (a display colour)' })
  }
  return out
}

/** Every finding in the engine's hand-written source. */
export function removalList(root = ROOT, ctx = loadContext(root)) {
  const out = []
  for (const f of sourceFiles(root).filter((p) => p.startsWith('engine/src/'))) out.push(...scanEngineFile(f, readFileSync(join(root, f), 'utf8'), ctx))
  return out
}
const keyOf = (x) => `${x.file}|${x.what}|${x.id}`
export const describeFinding = (x) => `${x.what}: ${x.id}${x.detail ? ` (${x.detail})` : ''} — ${x.file}:${x.line} — owner: ${x.owner}`

/** Findings new in `after` against `before`: a (file, what, id) seen more often than before. */
export function newFindings(before, after) {
  const had = new Map()
  for (const x of before) had.set(keyOf(x), (had.get(keyOf(x)) ?? 0) + 1)
  const out = []
  for (const x of after) { const n = had.get(keyOf(x)) ?? 0; if (n > 0) had.set(keyOf(x), n - 1); else out.push(x) }
  return out
}

/** Does an item's spec say why a value is the engine's? ("Engine rule: …") */
export const namesEngineRule = (item) => /\bengine rule\s*:/i.test(`${item?.spec ?? ''}`)
export function wrongHomeVerdict(item, fresh) {
  return heldVerdict(fresh.map(describeFinding), namesEngineRule(item),
    { clean: 'nothing another package owns', marker: 'Engine rule:', named: 'the spec names the engine rule', more: 'node tools/wrong-home.mjs --item' })
}

/** The gate's check: the item's changed engine files, before and after. */
export function checkWrongHome(item, root = ROOT) {
  const ctx = loadContext(root)
  const changed = changedFiles(root).filter((c) => c.path.startsWith('engine/src/'))
  const before = changed.filter((c) => c.before !== null).flatMap((c) => scanEngineFile(c.path, c.before, ctx))
  const after = changed.filter((c) => c.after !== null).flatMap((c) => scanEngineFile(c.path, c.after, ctx))
  const fresh = newFindings(before, after)
  return { ...wrongHomeVerdict(item, fresh), findings: fresh }
}

// ── the removal list on disk ─────────────────────────────────────────────────────
export const LIST_JSON = join(HERE, '..', 'generated', 'wrong-home.json')
export const LIST_MD = join(HERE, '..', 'generated', 'wrong-home.md')
export function markdown(findings) {
  const by = new Map()
  for (const x of findings) { if (!by.has(x.what)) by.set(x.what, []); by.get(x.what).push(x) }
  const lines = ['# What the engine holds that another package owns', '',
    '*GENERATED by `node tools/wrong-home.mjs --write` (tools/audit-all.mjs runs it) — never hand-edit. tool.wrong-home-audit, 2026-09-28: Andrew, "…or that the engine had something that was supposed to be somewhere else and we need to remove it from the engine."*', '',
    `${findings.length} to move out of the engine. Ruled the engine's own, and never listed: ${readRules().ruledEngine.map((e) => `\`${e.path}\` (${e.ruling})`).join('; ') || 'nothing'}.`, '']
  for (const [what, xs] of by) {
    lines.push(`## ${what} (${xs.length})`, '', '| Where | What | Owner |', '|---|---|---|')
    for (const x of xs) lines.push(`| \`${x.file}:${x.line}\` | \`${x.id}\`${x.detail ? ` — ${x.detail}` : ''} | ${x.owner} |`)
    lines.push('')
  }
  return lines.join('\n')
}

// ── the command line ───────────────────────────────────────────────────────────
//   node tools/wrong-home.mjs           the removal list, and what is new since generated/wrong-home.json
//   node tools/wrong-home.mjs --write   and write generated/wrong-home.{json,md} (audit-all runs this)
//   node tools/wrong-home.mjs --item    the uncommitted engine changes, as the gate sees them
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  if (argv.includes('--item')) {
    const r = checkWrongHome({ spec: '' })
    console.log(`\nwrong home — the uncommitted engine changes: ${r.findings.length} new\n`)
    r.findings.forEach((x) => console.log(`  ${describeFinding(x)}`))
  } else {
    const all = removalList()
    const last = existsSync(LIST_JSON) ? JSON.parse(readFileSync(LIST_JSON, 'utf8')).findings : []
    const fresh = newFindings(last, all)
    console.log(`\nwrong home — ${all.length} on the removal list (${fresh.length} new since the last run)\n`)
    fresh.forEach((x) => console.log(`  ${describeFinding(x)}`))
    if (argv.includes('--write')) {
      writeFileSync(LIST_JSON, JSON.stringify({ _: 'GENERATED by engine/tools/wrong-home.mjs --write — never hand-edit', findings: all }, null, 1) + '\n')
      writeFileSync(LIST_MD, markdown(all) + '\n')
    }
  }
}
