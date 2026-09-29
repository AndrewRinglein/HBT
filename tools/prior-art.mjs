// tools/prior-art.mjs — the prior-art audit (tool.prior-art-audit, 2026-09-28).
//
// Ruled: DECISIONS.md 2026-09-28 "a whole-project review for duplicated mechanisms; name the
// prior art before building" and "the duplication review, ruled" (the review page's Prevention
// section, "fine as proposed"). The trap in engine/CLAUDE.md ("Before any new mechanism, name what
// already does it") was a rule a chat had to remember; this makes it a check.
//
// One inventory of the four packages' hand-written source (engine, kingdom, viewer, the content
// tools): string vocabularies (arrays, sets, unions, module-level object keys and values of three
// or more ids or words, and `kind` literals in a union of shapes), top-level function and constant
// names, and the calls, members and dispatch literals the ruled funnels name
// (tools/prior-art-funnels.json). Three flags, each only for what is NEW against a baseline:
//   look-alike vocabulary  a new list sharing 75% or more (and at least three members) with a list
//                          in another file, measured against the smaller list, with the difference
//   same name, second home a new top-level function or constant whose name another file declares
//   funnel bypass          a new call to a funnel's inner primitive, a new read of its member, or a
//                          new dispatch on its literals, from outside the funnel's owner files
// No TypeScript parser: the engine's typescript is the native 7.x build with no JS API, so this
// reads tokens. It is a detector — a flag asks for a "Prior art:" line, it never blocks a landing.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

export const HERE = dirname(fileURLToPath(import.meta.url))
/** The HBT folder: engine/tools/.. /.. */
export const ROOT = join(HERE, '..', '..')

/** Where hand-written source lives, per package. `flat` roots are read one level deep only. */
export const SCOPE = [
  { pkg: 'engine', dir: 'src' }, { pkg: 'engine', dir: 'tools' },
  { pkg: 'kingdom', dir: 'src' }, { pkg: 'kingdom', dir: 'tools' },
  { pkg: 'viewer', dir: 'src' }, { pkg: 'viewer', dir: 'tools' },
  { pkg: 'content', dir: '.', flat: true },
]
// Not hand-written, not source, or superseded (engine/tools/replay: CLAUDE.md "awaiting deletion").
const SKIP_DIR = new Set(['node_modules', 'generated', 'archive', '_archive', 'scratch', 'test', 'tests', 'fixtures',
  'dist', 'runs', '.state', '.git', '_to_delete', 'replay', 'exports', '__pycache__', 'specs'])
const EXT = /\.(ts|mts|cts|js|mjs|cjs)$/
const NOT_SOURCE = /\.d\.[mc]?ts$|\.(test|spec|verify)\.[mc]?[jt]s$|\.tmp\./
const MAX_BYTES = 400_000

/** Every in-scope file, as a path relative to the HBT folder with forward slashes, sorted. */
export function sourceFiles(root = ROOT) {
  const out = []
  const walk = (abs, flat) => {
    let entries
    try { entries = readdirSync(abs, { withFileTypes: true }) } catch (e) { if (e.code === 'ENOENT') return; throw e }
    for (const e of entries) {
      const p = join(abs, e.name)
      if (e.isDirectory()) { if (!flat && !SKIP_DIR.has(e.name)) walk(p, false); continue }
      if (e.isFile() && inScopeName(e.name)) out.push(relative(root, p).split(sep).join('/'))
    }
  }
  for (const s of SCOPE) walk(join(root, s.pkg, s.dir), !!s.flat)
  return out.sort()
}
const inScopeName = (name) => EXT.test(name) && !NOT_SOURCE.test(name)
/** Is a path (relative to the HBT folder) one the inventory reads? */
export function inScope(rel) {
  const parts = rel.split('/')
  const s = SCOPE.find((x) => parts[0] === x.pkg && (x.dir === '.' ? parts.length === 2 : parts[1] === x.dir))
  if (!s || !inScopeName(parts.at(-1))) return false
  return !parts.slice(1, -1).some((d) => SKIP_DIR.has(d))
}

// ── tokens ─────────────────────────────────────────────────────────────────────
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await'])
const OPS = ['===', '!==', '...', '**=', '=>', '==', '!=', '&&', '||', '??', '?.', '<=', '>=', '+=', '-=', '*=', '/=', '++', '--', '**']

/** JS/TS source -> tokens {t: 'id'|'str'|'num'|'tmpl'|'re'|'p', v, line}. Comments dropped. */
export function tokenize(src) {
  const toks = [], n = src.length
  let i = 0, line = 1
  const tmpl = []   // brace depth inside each open `${`
  const regexOk = () => {
    const p = toks.at(-1)
    if (!p) return true
    if (p.t === 'p') return !(p.v === ')' || p.v === ']' || p.v === '}')
    return p.t === 'id' && REGEX_AFTER_WORD.has(p.v)
  }
  // Scan template text from i (just after ` or a closing } of ${ }); returns true if it stopped at ${.
  const templateText = () => {
    while (i < n) {
      const c = src[i]
      if (c === '\\') { i += 2; continue }
      if (c === '\n') line++
      if (c === '`') { i++; return false }
      if (c === '$' && src[i + 1] === '{') { i += 2; tmpl.push(0); return true }
      i++
    }
    return false
  }
  while (i < n) {
    const c = src[i]
    if (c === '\n') { line++; i++; continue }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === '﻿') { i++; continue }
    const at = line
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2), end = e < 0 ? n : e + 2
      for (let k = i; k < end; k++) if (src[k] === '\n') line++
      i = end; continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1, v = ''
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { v += src[j + 1] ?? ''; j += 2; continue } v += src[j]; j++ }
      toks.push({ t: 'str', v, line: at }); i = j + 1; continue
    }
    if (c === '`') { i++; toks.push({ t: 'tmpl', v: '`', line: at }); templateText(); continue }
    if (c === '}' && tmpl.length && tmpl.at(-1) === 0) { tmpl.pop(); i++; templateText(); continue }
    if (c === '/' && regexOk()) {
      let j = i + 1, cls = false
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') cls = true
        else if (src[j] === ']') cls = false
        else if (src[j] === '/' && !cls) break
        j++
      }
      j++
      while (j < n && /[a-z]/i.test(src[j])) j++
      toks.push({ t: 're', v: src.slice(i, j), line: at }); i = j; continue
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i + 1
      while (j < n && /[\w.]/.test(src[j])) j++
      toks.push({ t: 'num', v: src.slice(i, j), line: at }); i = j; continue
    }
    if (/[A-Za-z_$\u0080-￿]/.test(c)) {
      let j = i + 1
      while (j < n && /[\w$\u0080-￿]/.test(src[j])) j++
      toks.push({ t: 'id', v: src.slice(i, j), line: at }); i = j; continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    const v = op ?? c
    if (tmpl.length) { if (v === '{') tmpl[tmpl.length - 1]++; else if (v === '}') tmpl[tmpl.length - 1]-- }
    toks.push({ t: 'p', v, line: at }); i += v.length
  }
  return toks
}

// ── one file's inventory ───────────────────────────────────────────────────────
const WORD = /^[A-Za-z_$@][\w$.:/@-]*$/
const words = (xs) => [...new Set(xs.filter((m) => m.length <= 64 && WORD.test(m)))]
const OPEN = new Set(['(', '[', '{']), CLOSE = new Set([')', ']', '}'])
const STMT = new Set(['export', 'import', 'const', 'let', 'var', 'function', 'class', 'type', 'interface', 'enum', 'declare', 'async'])
const KEYWORD = new Set(['const', 'let', 'var', 'export', 'import', 'function', 'class', 'enum', 'type', 'interface', 'return', 'await', 'async', 'new', 'default'])
const EXPR_START = new Set(['=', '(', ',', ':', '[', '?', '=>', '{', '||', '&&', '??', '!', '...'])

/**
 * One file's inventory. `track` names what the funnels count: { calls, members } as Sets.
 * Dispatch literals (`case 'x'`, `=== 'x'`) are counted for every string — the funnels pick theirs.
 */
export function scanSource(text, track = { calls: new Set(), members: new Set() }) {
  const T = tokenize(text)
  const depth = new Array(T.length)
  let d = 0
  for (let k = 0; k < T.length; k++) {
    if (T[k].t === 'p' && CLOSE.has(T[k].v)) d = Math.max(0, d - 1)
    depth[k] = d
    if (T[k].t === 'p' && OPEN.has(T[k].v)) d++
  }
  const is = (k, v) => T[k] && T[k].t === 'p' && T[k].v === v
  const isId = (k, v) => T[k] && T[k].t === 'id' && (v === undefined || T[k].v === v)
  /** The name a `const/let/var NAME ... =` at token k (the `=`) declares, walking back within its statement. */
  const declaredBefore = (k) => {
    for (let j = k - 1; j >= 0 && j > k - 60; j--) {
      if (depth[j] < depth[k]) break
      if (depth[j] === depth[k] && (is(j, ';') || is(j, '{') || is(j, '}'))) break
      if (depth[j] === depth[k] && isId(j) && ['const', 'let', 'var', 'type'].includes(T[j].v) && isId(j + 1)) return T[j + 1].v
    }
    return isId(k - 1) ? T[k - 1].v : null
  }
  /** Where the list starting at token k gets its name: `X = [`, `X: [`, `type X = 'a' | …`, `new Set([`. */
  const nameBefore = (k) => {
    let j = k - 1
    for (;;) {
      if (!T[j]) return null
      if (is(j, '>')) { let g = 1; j--; while (j >= 0 && g) { if (is(j, '>')) g++; else if (is(j, '<')) g--; j-- } continue }
      if (is(j, '(') || is(j, '.') || is(j, '|') || (isId(j) && ['new', 'Set', 'freeze', 'Object', 'from', 'Array', 'ReadonlySet'].includes(T[j].v))) { j--; continue }
      break
    }
    if (is(j, '=')) return declaredBefore(j)
    if (is(j, ':') && T[j - 1] && (T[j - 1].t === 'id' || T[j - 1].t === 'str')) return T[j - 1].v
    return null
  }
  const exported = (k) => isId(k - 1, 'export') || (isId(k - 1, 'declare') && isId(k - 2, 'export'))
  const vocab = [], names = [], calls = {}, members = {}, literals = {}
  const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1 }
  const addVocab = (name, line, members, how) => { const m = words(members); if (m.length >= 3) vocab.push({ name: name ?? `(unnamed@${line})`, line, how, members: m.sort() }) }

  for (let k = 0; k < T.length; k++) {
    const t = T[k]
    // top-level declarations
    if (depth[k] === 0 && t.t === 'id') {
      if (t.v === 'function' && !is(k - 1, '.')) {
        const j = is(k + 1, '*') ? k + 2 : k + 1
        if (isId(j) && T[j].v.length >= 3) names.push({ name: T[j].v, line: T[j].line, kind: 'function' })
      } else if ((t.v === 'class' || t.v === 'enum') && isId(k + 1) && !is(k - 1, '.') && exported(k)) {
        names.push({ name: T[k + 1].v, line: T[k + 1].line, kind: t.v })
      } else if (['const', 'let', 'var'].includes(t.v) && isId(k + 1) && !is(k - 1, '.') && !isId(k - 1, 'as') && !KEYWORD.has(T[k + 1].v)) {
        // the initializer: an alias (`= a.b`), a require or a dynamic import is not a second home
        let e = k + 2
        while (T[e] && !(depth[e] === 0 && (is(e, '=') || is(e, ';')))) e++
        let alias = false
        if (is(e, '=')) {
          let a = e + 1
          if (isId(a, 'require') || isId(a, 'import') || (isId(a, 'await') && isId(a + 1, 'import'))) alias = true
          else if (isId(a)) {
            while (is(a + 1, '.') && isId(a + 2)) a += 2
            const nx = T[a + 1]
            alias = !nx || is(a + 1, ';') || is(a + 1, ',') || (nx.line > T[a].line && !(nx.t === 'p' && ['.', '(', '[', '?.', '?', ':', '&&', '||', '??', '+', '-', '*', '/'].includes(nx.v)))
          }
        }
        // a name is a concept when it is exported, or when it is a module-level TABLE with a
        // constant's name (HELD_CLASSES = [...]); a script's own `const OUT = …` is not.
        const init = T[e + 1], table = is(e, '=') && init && ((init.t === 'p' && (init.v === '[' || init.v === '{')) || (init.t === 'id' && (init.v === 'new' || init.v === 'Object')))
        const constName = /^[A-Z][A-Z0-9_]{3,}$/.test(T[k + 1].v)
        if (!alias && (exported(k) || (table && constName))) names.push({ name: T[k + 1].v, line: T[k + 1].line, kind: t.v })
        // a module-level object literal: its keys and its string values are vocabularies
        if (is(e, '=')) {
          let o = e + 1
          if (isId(o, 'Object') && is(o + 1, '.') && isId(o + 2, 'freeze') && is(o + 3, '(')) o += 4
          if (is(o, '{')) {
            const base = depth[o] + 1, keys = [], vals = []
            let j = o + 1
            while (T[j] && !(depth[j] < base)) {
              if (depth[j] === base && (j === o + 1 || is(j - 1, ','))) {
                const kt = T[j]
                if (kt.t === 'id' || kt.t === 'str') {
                  if (!(kt.t === 'id' && ['get', 'set', 'async'].includes(kt.v) && isId(j + 1))) keys.push(kt.v)
                  if (is(j + 1, ':') && T[j + 2]?.t === 'str' && (is(j + 3, ',') || is(j + 3, '}'))) vals.push(T[j + 2].v)
                } else if (is(j, '[')) {
                  let c = j + 1
                  while (T[c] && !(depth[c] === base && is(c, ']'))) c++
                  if (is(c + 1, ':') && T[c + 2]?.t === 'str' && (is(c + 3, ',') || is(c + 3, '}'))) vals.push(T[c + 2].v)
                }
              }
              j++
            }
            const nm = T[k + 1].v
            addVocab(`${nm}{keys}`, T[k + 1].line, keys, 'object keys')
            addVocab(`${nm}{values}`, T[k + 1].line, vals, 'object values')
          }
        }
      }
    }
    // a union of shapes told apart by `kind`: type X = { kind: 'a' … } | { kind: 'b' … }
    if (t.t === 'id' && t.v === 'type' && isId(k + 1) && !is(k - 1, '.')) {
      let e = k + 2
      if (is(e, '<')) { let g = 1; e++; while (T[e] && g) { if (is(e, '<')) g++; else if (is(e, '>')) g--; e++ } }
      if (is(e, '=')) {
        const base = depth[e], kinds = []
        let j = e + 1
        for (; T[j]; j++) {
          if (depth[j] < base) break
          if (depth[j] === base && (is(j, ';') || (T[j].t === 'id' && STMT.has(T[j].v) && T[j].line > T[j - 1].line))) break
          if (depth[j] === base + 1 && isId(j, 'kind') && is(j + 1, ':') && T[j + 2]?.t === 'str') kinds.push(T[j + 2].v)
          if (depth[j] === base + 1 && isId(j, 'readonly') && isId(j + 1, 'kind') && is(j + 2, ':') && T[j + 3]?.t === 'str') kinds.push(T[j + 3].v)
        }
        addVocab(`${T[k + 1].v}.kind`, T[k + 1].line, kinds, 'kind union')
      }
    }
    // an array of strings: [ 'a', 'b', 'c' ] (a Set's too)
    if (is(k, '[') && (k === 0 || (T[k - 1].t === 'p' && EXPR_START.has(T[k - 1].v)) || isId(k - 1, 'return') || isId(k - 1, 'of') || isId(k - 1, 'in'))) {
      const xs = []
      let j = k + 1, ok = true
      while (T[j] && !is(j, ']')) {
        if (T[j].t !== 'str') { ok = false; break }
        xs.push(T[j].v); j++
        if (is(j, ',')) j++
        else if (!is(j, ']')) { ok = false; break }
      }
      if (ok && xs.length >= 3) addVocab(nameBefore(k), t.line, xs, 'array')
    }
    // a union of string literals: 'a' | 'b' | 'c'
    if (t.t === 'str' && is(k + 1, '|') && T[k + 2]?.t === 'str' && !(is(k - 1, '|') && T[k - 2]?.t === 'str')) {
      const xs = [t.v]
      let j = k + 2
      while (T[j]?.t === 'str') { xs.push(T[j].v); if (is(j + 1, '|') && T[j + 2]?.t === 'str') j += 2; else break }
      if (xs.length >= 3) addVocab(nameBefore(is(k - 1, '|') ? k - 1 : k), t.line, xs, 'union')
    }
    // what the funnels count
    if (t.t === 'id' && is(k + 1, '(') && track.calls.has(t.v) && !isId(k - 1, 'function')) bump(calls, t.v)
    if (t.t === 'id' && (is(k - 1, '.') || is(k - 1, '?.')) && track.members.has(t.v)) bump(members, t.v)
    if (t.t === 'str' && (isId(k - 1, 'case') || ['===', '!==', '==', '!='].some((o) => is(k - 1, o) || is(k + 1, o)))) bump(literals, t.v)
  }
  // one entry per name (a `let` re-declared in two branches is still one name)
  const seen = new Set()
  return { vocab, names: names.filter((x) => (seen.has(x.name) ? false : seen.add(x.name))), calls, members, literals }
}

// ── the funnels ────────────────────────────────────────────────────────────────
export function readFunnels(path = join(HERE, 'prior-art-funnels.json')) {
  const rules = JSON.parse(readFileSync(path, 'utf8')).funnels
  for (const r of rules) {
    if (!r.concept || !r.owner || !Array.isArray(r.files) || !r.files.length) throw new Error(`prior-art-funnels.json: a funnel needs concept, owner and files — ${JSON.stringify(r).slice(0, 80)}`)
    if (!(r.calls?.length || r.members?.length || r.literalsFrom)) throw new Error(`prior-art-funnels.json: '${r.concept}' names nothing to count`)
  }
  return rules
}
export const trackOf = (rules) => ({ calls: new Set(rules.flatMap((r) => r.calls ?? [])), members: new Set(rules.flatMap((r) => r.members ?? [])) })

// ── the inventory ──────────────────────────────────────────────────────────────
/** Inventory of the files given ({ path: text }), or of the whole tree when none are given. */
export function inventoryOf(texts, rules) {
  const track = trackOf(rules)
  const files = {}
  for (const [path, text] of Object.entries(texts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) files[path] = scanSource(text, track)
  return { files }
}
export function readTree(root = ROOT) {
  const texts = {}
  for (const rel of sourceFiles(root)) {
    const abs = join(root, rel)
    if (statSync(abs).size > MAX_BYTES) continue   // a bundle, not hand-written
    texts[rel] = readFileSync(abs, 'utf8')
  }
  return texts
}

// ── the three flags ────────────────────────────────────────────────────────────
const EMPTY = { vocab: [], names: [], calls: {}, members: {}, literals: {} }
export const OVERLAP = 0.75, MIN_SHARED = 3

/**
 * Flags for what is new in `after` against `before` (both { files }), measured against `whole`
 * (the tree as it stands). A file in `after` and absent from `before` is all new.
 */
export function flagsFor({ before, after, whole, rules }) {
  const flags = [], pairs = new Set()
  // a list is old when the file already had a list of that name holding all its members (a file may
  // hold several lists of one name — scenarios.ts's many `heroes`)
  // an unnamed list is known by its members alone — its name carries a line number that moves
  const sameName = (a, b) => a === b || (a.startsWith('(unnamed@') && b.startsWith('(unnamed@'))
  const wasThere = (file, v) => (before.files[file] ?? EMPTY).vocab.some((x) => sameName(x.name, v.name) && v.members.every((m) => x.members.includes(m)))
  // look-alike vocabulary
  for (const [file, inv] of Object.entries(after.files)) {
    for (const v of inv.vocab) {
      if (wasThere(file, v)) continue
      for (const [other, oinv] of Object.entries(whole.files)) {
        if (other === file) continue
        for (const w of oinv.vocab) {
          const shared = v.members.filter((m) => w.members.includes(m))
          if (shared.length < MIN_SHARED || shared.length / Math.min(v.members.length, w.members.length) < OVERLAP) continue
          const key = [`${file}#${v.name}`, `${other}#${w.name}`].sort().join(' ~ ')
          if (pairs.has(key)) continue
          pairs.add(key)
          flags.push({
            flag: 'look-alike vocabulary', file, line: v.line, name: v.name, other, otherLine: w.line, otherName: w.name,
            shared: shared.length, onlyHere: v.members.filter((m) => !w.members.includes(m)), onlyThere: w.members.filter((m) => !v.members.includes(m)),
          })
        }
      }
    }
  }
  // same name, second home
  const homes = new Map()
  for (const [file, inv] of Object.entries(whole.files)) for (const x of inv.names) { if (!homes.has(x.name)) homes.set(x.name, []); homes.get(x.name).push({ file, line: x.line }) }
  for (const [file, inv] of Object.entries(after.files)) {
    const had = new Set((before.files[file] ?? EMPTY).names.map((x) => x.name))
    for (const x of inv.names) {
      if (had.has(x.name)) continue
      const elsewhere = (homes.get(x.name) ?? []).filter((h) => h.file !== file)
      if (!elsewhere.length) continue
      const key = [x.name, file, ...elsewhere.map((h) => h.file)].sort().join('|')
      if (pairs.has(key)) continue
      pairs.add(key)
      flags.push({ flag: 'same name, second home', file, line: x.line, name: x.name, other: elsewhere[0].file, otherLine: elsewhere[0].line, homes: elsewhere.length + 1 })
    }
  }
  // funnel bypass
  for (const r of rules) {
    const owners = new Set(r.files)
    let literals = []
    if (r.literalsFrom) {
      const [f, name] = r.literalsFrom.split('#')
      const list = (whole.files[f] ?? EMPTY).vocab.find((x) => x.name === name)
      if (!list) throw new Error(`prior-art-funnels.json: '${r.concept}' reads its literals from ${r.literalsFrom}, which the inventory does not have`)
      literals = list.members
    }
    for (const [file, inv] of Object.entries(after.files)) {
      if (owners.has(file)) continue
      const was = before.files[file] ?? EMPTY
      const grew = (kind, xs) => xs.filter((x) => (inv[kind][x] ?? 0) > (was[kind][x] ?? 0)).map((x) => `${kind === 'calls' ? `${x}()` : kind === 'members' ? `.${x}` : `'${x}'`} ${was[kind][x] ?? 0}→${inv[kind][x]}`)
      const hits = [...grew('calls', r.calls ?? []), ...grew('members', r.members ?? []), ...grew('literals', literals)]
      if (hits.length) flags.push({ flag: 'funnel bypass', file, name: r.concept, owner: r.owner, hits })
    }
  }
  return flags
}

/** One line per flag, for the gate's note, the audit and the ledger. */
export function describe(f) {
  if (f.flag === 'look-alike vocabulary') {
    const diff = [f.onlyHere.length ? `only here: ${f.onlyHere.slice(0, 6).join(', ')}${f.onlyHere.length > 6 ? ' …' : ''}` : '', f.onlyThere.length ? `only there: ${f.onlyThere.slice(0, 6).join(', ')}${f.onlyThere.length > 6 ? ' …' : ''}` : ''].filter(Boolean).join('; ')
    return `look-alike vocabulary: ${f.name} (${f.file}:${f.line}) shares ${f.shared} with ${f.otherName} (${f.other}:${f.otherLine})${diff ? ` — ${diff}` : ' — the same members'}`
  }
  if (f.flag === 'same name, second home') return `same name, second home: ${f.name} (${f.file}:${f.line}) is also declared in ${f.other}:${f.otherLine}${f.homes > 2 ? ` and ${f.homes - 2} more` : ''}`
  return `funnel bypass: ${f.file} — ${f.hits.join(', ')}, outside ${f.owner} (${f.name})`
}

/** Does an item's spec name its prior art? ("Prior art: …" or "priorArt: …") */
export const namesPriorArt = (item) => /\bprior[ -]?art\s*:/i.test(`${item?.spec ?? ''}`)


/** The verdict the gate records: flags or new clones hold the landing for review unless the spec names its prior art. */
export function verdict(item, flags, newClones) {
  return heldVerdict([...flags.map(describe), ...newClones.map(describeClone)], namesPriorArt(item),
    { clean: 'nothing new resembles what exists', marker: 'Prior art:', named: 'the spec names its prior art', more: 'node tools/prior-art.mjs --item' })
}
/** A flag's verdict (the prior-art and wrong-home flags share it): lines found hold the landing for review unless the spec carries the marker. */
export function heldVerdict(lines, named, { clean, marker, named: namedNote, more }) {
  if (!lines.length) return { ok: true, note: clean }
  const head = `${lines.length} new: ${lines.slice(0, 6).join(' · ')}${lines.length > 6 ? ` · … (${lines.length - 6} more: ${more})` : ''}`
  return { ok: false, review: !named, note: named ? `${head} — ${namedNote}` : `${head} — no "${marker}" line in the spec: lands for review` }
}

// ── clones (jscpd) ─────────────────────────────────────────────────────────────
export const JSCPD = join(HERE, 'jscpd', 'node_modules', 'jscpd', 'bin', 'jscpd')
const JSCPD_FORMATS = { format: ['typescript', 'javascript'], formatsExts: { typescript: ['ts', 'mts', 'cts'], javascript: ['js', 'mjs', 'cjs'] } }
/** jscpd over the files given (paths relative to root): every exact clone, both fragments. */
export function clonesOf(files, root = ROOT) {
  if (!existsSync(JSCPD)) throw new Error('jscpd is not installed — run: npm ci --prefix tools/jscpd')
  const out = mkdtempSync(join(tmpdir(), 'prior-art-'))
  try {
    const cfg = join(out, 'jscpd.json')
    writeFileSync(cfg, JSON.stringify({ path: files.map((f) => join(root, f)), reporters: ['json'], output: out, silent: true, gitignore: false, ...JSCPD_FORMATS }))
    execFileSync(process.execPath, [JSCPD, '--config', cfg], { cwd: root, stdio: 'pipe' })
    const r = JSON.parse(readFileSync(join(out, 'jscpd-report.json'), 'utf8'))
    const rel = (n) => relative(root, join(root, n)).split(sep).join('/')
    return r.duplicates.map((d) => {
      const a = { file: rel(d.firstFile.name), start: d.firstFile.start, end: d.firstFile.end }
      const b = { file: rel(d.secondFile.name), start: d.secondFile.start, end: d.secondFile.end }
      const key = createHash('sha1').update([a.file, b.file].sort().join('|') + '\n' + d.fragment).digest('hex').slice(0, 16)
      return { a, b, lines: d.lines, key }
    }).sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))
  } finally { try { rmSync(out, { recursive: true, force: true }) } catch { /* a temp folder */ } }
}
export const describeClone = (c) => `clone: ${c.lines} lines, ${c.a.file}:${c.a.start}-${c.a.end} = ${c.b.file}:${c.b.start}-${c.b.end}`
/** Clones with a fragment on an added line: `added` maps a file to its added [from, to] ranges. */
export function clonesTouching(clones, added) {
  const hits = (f) => (added[f.file] ?? []).some(([lo, hi]) => f.start <= hi && f.end >= lo)
  return clones.filter((c) => hits(c.a) || hits(c.b))
}

// ── what an item changed, across the four packages ───────────────────────────────
const git = (pkg, args, root) => execFileSync('git', args, { cwd: join(root, pkg), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 })
/** Every in-scope file an item changed (uncommitted, per package), its text at HEAD and now, and its added line ranges. */
export function changedFiles(root = ROOT) {
  const out = []
  for (const pkg of [...new Set(SCOPE.map((s) => s.pkg))]) {
    if (!existsSync(join(root, pkg, '.git'))) continue
    for (const l of git(pkg, ['status', '--porcelain', '--untracked-files=all'], root).split('\n').filter(Boolean)) {
      let p = l.slice(3)
      if (p.includes(' -> ')) p = p.split(' -> ')[1]
      p = p.replace(/^"|"$/g, '')
      const rel = `${pkg}/${p}`
      if (!inScope(rel)) continue
      const untracked = l.startsWith('??')
      let before = null
      if (!untracked) { try { before = git(pkg, ['show', `HEAD:${p}`], root) } catch { before = null } }
      const abs = join(root, rel)
      const after = existsSync(abs) ? readFileSync(abs, 'utf8') : null
      let added = []
      if (after !== null) {
        if (before === null) added = [[1, after.split('\n').length]]
        else for (const m of git(pkg, ['diff', '-U0', 'HEAD', '--', p], root).matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
          const from = Number(m[1]), n = m[2] === undefined ? 1 : Number(m[2])
          if (n > 0) added.push([from, from + n - 1])
        }
      }
      out.push({ path: rel, before, after, added })
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/** The gate's check for one item: flags and new clones on what it changed, against the tree as it stands. */
export function checkItem(item, root = ROOT) {
  const rules = readFunnels()
  const changed = changedFiles(root)
  if (!changed.length) return { ok: true, note: 'no source file changed' }
  const tree = readTree(root)
  const whole = inventoryOf(tree, rules)
  const before = inventoryOf(Object.fromEntries(changed.filter((c) => c.before !== null).map((c) => [c.path, c.before])), rules)
  const after = inventoryOf(Object.fromEntries(changed.filter((c) => c.after !== null).map((c) => [c.path, c.after])), rules)
  const flags = flagsFor({ before, after, whole, rules })
  const touched = clonesTouching(clonesOf(Object.keys(tree), root), Object.fromEntries(changed.map((c) => [c.path, c.added])))
  return { ...verdict(item, flags, touched), flags, clones: touched }
}

// ── the audit's run: the whole tree against the last run ─────────────────────────
export const INVENTORY = join(HERE, '..', '.state', 'inventory.json')
export function audit({ root = ROOT, fresh = false, write = false, inventoryPath = INVENTORY } = {}) {
  const rules = readFunnels()
  const tree = readTree(root)
  const now = inventoryOf(tree, rules)
  let last = { files: {}, clones: [] }
  if (!fresh && existsSync(inventoryPath)) last = JSON.parse(readFileSync(inventoryPath, 'utf8'))
  const flags = flagsFor({ before: last, after: now, whole: now, rules })
  const clones = clonesOf(Object.keys(tree), root)
  const had = new Set(last.clones ?? [])
  const newClones = clones.filter((c) => !had.has(c.key))
  if (write) {
    const commits = {}
    for (const pkg of [...new Set(SCOPE.map((s) => s.pkg))]) { try { commits[pkg] = git(pkg, ['rev-parse', '--short', 'HEAD'], root).trim() } catch { commits[pkg] = null } }
    // one line per file, so a run's diff in git reads file by file
    const head = JSON.stringify({ _note: 'Written by tools/prior-art.mjs --write (tools/audit-all.mjs runs it). The prior-art audit diffs the tree against this file; never hand-edit it.', commits, clones: clones.map((c) => c.key) })
    const body = Object.entries(now.files).map(([f, inv]) => `  ${JSON.stringify(f)}: ${JSON.stringify(inv)}`).join(',\n')
    writeFileSync(inventoryPath, `${head.slice(0, -1)},\n "files": {\n${body}\n }\n}\n`)
  }
  return { flags, clones, newClones, baseline: fresh || !Object.keys(last.files).length ? 'none' : 'last run' }
}

// ── the command line ───────────────────────────────────────────────────────────
//   node tools/prior-art.mjs                       what is new since .state/inventory.json (read-only)
//   node tools/prior-art.mjs --write               and write .state/inventory.json (audit-all runs this)
//   node tools/prior-art.mjs --root <dir> --fresh  a whole tree with no baseline — e.g. the review's pinned export
//   node tools/prior-art.mjs --item                the uncommitted changes, as the gate sees them
//   --all prints every flag (default: the first 40)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(k); return i === -1 ? undefined : argv[i + 1] }
  const limit = argv.includes('--all') ? Infinity : 40
  const print = (lines) => { lines.slice(0, limit).forEach((l) => console.log(`  ${l}`)); if (lines.length > limit) console.log(`  … ${lines.length - limit} more (--all)`) }
  if (argv.includes('--item')) {
    const r = checkItem({ spec: '' }, opt('--root') ?? ROOT)
    console.log(`\nprior art — the uncommitted changes: ${r.flags?.length ?? 0} flag(s), ${r.clones?.length ?? 0} clone(s)\n`)
    print([...(r.flags ?? []).map(describe), ...(r.clones ?? []).map(describeClone)])
  } else {
    const r = audit({ root: opt('--root') ?? ROOT, fresh: argv.includes('--fresh'), write: argv.includes('--write') })
    const by = {}
    for (const f of r.flags) by[f.flag] = (by[f.flag] ?? 0) + 1
    console.log(`\nprior art — baseline: ${r.baseline}. New: ${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing'}; clones ${r.clones.length} (${r.newClones.length} new)\n`)
    print([...r.flags.map(describe), ...r.newClones.map(describeClone)])
  }
}
