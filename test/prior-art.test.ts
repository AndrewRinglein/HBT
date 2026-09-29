// tool.prior-art-audit (2026-09-28; DECISIONS.md "the duplication review, ruled" and "the opening is
// tested with the player's party ... the prior-art audit also finds what the engine holds that
// belongs elsewhere"): the inventory, its three flags, the gate's verdict and jscpd's clones.
import { describe, expect, it } from 'vitest'
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  tokenize, scanSource, inventoryOf, readFunnels, flagsFor, describe as say, verdict, namesPriorArt,
  clonesOf, clonesTouching, inScope, type Inventory, type Clone,
} from '../tools/prior-art.mjs'

const rules = readFunnels()
const NONE: Inventory = { files: {} }
/** The review's pinned files (test/fixtures/prior-art-pinned, verbatim git show copies). */
function pinned(): Record<string, string> {
  const root = fileURLToPath(new URL('./fixtures/prior-art-pinned/', import.meta.url))
  const out: Record<string, string> = {}
  const walk = (d: string) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.txt')) out[relative(root, p).split(sep).join('/').replace(/\.txt$/, '')] = readFileSync(p, 'utf8') } }
  walk(root)
  return out
}
const PINNED = inventoryOf(pinned(), rules)
const one = (path: string, text: string): Inventory => inventoryOf({ [path]: text }, rules)
const withFile = (inv: Inventory, path: string, text: string): Inventory => ({ files: { ...inv.files, ...one(path, text).files } })

describe('tool.prior-art-audit — the review\'s pinned tree, no baseline', () => {
  const lines = flagsFor({ before: NONE, after: PINNED, whole: PINNED, rules }).map(say)
  const has = (re: RegExp) => expect(lines.filter((l) => re.test(l)), String(re)).not.toEqual([])
  it('flags LAYER_STATUS against LAYER_IDS (V3)', () => has(/^look-alike vocabulary: (LAYER_IDS\{values\}.*LAYER_STATUS\{keys\}|LAYER_STATUS\{keys\}.*LAYER_IDS\{values\})/))
  it('flags OUTCOMES against Outcome (K6)', () => has(/^look-alike vocabulary: (Outcome \(.*OUTCOMES|OUTCOMES \(.*Outcome \()/))
  it('flags the hook copies (V12)', () => {
    has(/^look-alike vocabulary: HOOKS \(engine\/src\/core\/trigger\.ts:\d+\) shares 6 with ATTACK_HOOKS \(viewer\/src\/actions\.js/)
    has(/^look-alike vocabulary: HOOKS \(engine\/src\/core\/trigger\.ts:\d+\) shares 11 with HOOKLBL\{keys\} \(viewer\/src\/panel\.js:\d+\) — only here: onBlock$/)
  })
  it('flags levelTableOf, loadoutOf and fnv1a as second homes (K1, K4, K12)', () => {
    for (const n of ['levelTableOf', 'loadoutOf', 'fnv1a']) has(new RegExp(`^same name, second home: ${n} \\((engine|kingdom)/`))
  })
  it('flags movement.ts calling appliesOnEnterOf around enterGround (E1)', () => has(/^funnel bypass: engine\/src\/core\/movement\.ts — .*appliesOnEnterOf\(\)/))
  it('says the difference', () => {
    const l = lines.find((x) => /LAYER_STATUS\{keys\}/.test(x) && /LAYER_IDS\{values\}/.test(x))!
    expect(l).toMatch(/shares 4 with/)
    expect(l).toMatch(/layer\.darkness/)
  })
})

describe('tool.prior-art-audit — a scratch item', () => {
  it('a copy of HELD_CLASSES is flagged as a second home', () => {
    const path = 'kingdom/src/core/scratch-held.ts'
    const text = "// scratch\nconst HELD_CLASSES = ['weapon', 'shield'] as const\nexport const heldOf = (c: string) => HELD_CLASSES.includes(c as never)\n"
    const flags = flagsFor({ before: NONE, after: one(path, text), whole: withFile(PINNED, path, text), rules })
    expect(flags.map(say)).toContain('same name, second home: HELD_CLASSES (kingdom/src/core/scratch-held.ts:2) is also declared in engine/src/core/items.ts:249')
  })
  const beforeText = 'export function executeSidestep(ctx: Ctx, unitId: number, to: number) {\n  moveUnit(ctx, unitId, to)\n}\n'
  const afterText = 'export function executeSidestep(ctx: Ctx, unitId: number, to: number) {\n  moveUnit(ctx, unitId, to)\n  for (const [sid, n] of appliesOnEnterOf(terrainAt(ctx, to))) applyStatus(ctx, unitId, sid, n, \'terrain\')\n}\n'
  it('a call to appliesOnEnterOf from movement.ts is a funnel bypass; the same call inside ground.ts is not', () => {
    const m = 'engine/src/core/movement.ts', g = 'engine/src/core/ground.ts'
    const out = flagsFor({ before: one(m, beforeText), after: one(m, afterText), whole: withFile(PINNED, m, afterText), rules })
    expect(out.map(say)).toContain('funnel bypass: engine/src/core/movement.ts — appliesOnEnterOf() 0→1, outside enterGround (engine/src/core/ground.ts) (entering a hex)')
    expect(flagsFor({ before: one(g, beforeText), after: one(g, afterText), whole: withFile(PINNED, g, afterText), rules })).toEqual([])
  })
  it('an unchanged file raises nothing', () => {
    const m = 'engine/src/core/movement.ts', text = pinned()[m]!
    expect(flagsFor({ before: one(m, text), after: one(m, text), whole: PINNED, rules })).toEqual([])
  })
  it('without a "Prior art:" line the item lands for review; naming it lands normally', () => {
    const m = 'engine/src/core/movement.ts'
    const flags = flagsFor({ before: one(m, beforeText), after: one(m, afterText), whole: PINNED, rules })
    const bare = verdict({ spec: 'Sidesteps take the ground.' }, flags, [])
    expect([bare.ok, bare.review]).toEqual([false, true])
    expect(bare.note).toMatch(/no "Prior art:" line in the spec: lands for review/)
    const named = verdict({ spec: 'Sidesteps take the ground. Prior art: enterGround in ground.ts — this is a test of the flag, not a second entry beat.' }, flags, [])
    expect([named.ok, named.review]).toEqual([false, false])
    expect(verdict({ spec: 'x' }, [], [])).toEqual({ ok: true, note: 'nothing new resembles what exists' })
    expect([namesPriorArt({ spec: 'priorArt: x' }), namesPriorArt({ spec: 'prior art is nice' }), namesPriorArt(undefined)]).toEqual([true, false, false])
  })
})

describe('tool.prior-art-audit — the rules of the flags', () => {
  const lists = (a: string, b: string) => {
    const x = one('engine/src/core/a.ts', `export const A = [${a}]\n`), y = one('kingdom/src/core/b.ts', `export const B = [${b}]\n`)
    return flagsFor({ before: NONE, after: x, whole: { files: { ...PINNED.files, ...x.files, ...y.files } }, rules }).filter((f) => f.flag === 'look-alike vocabulary')
  }
  it('75% of the smaller list, and at least three shared', () => {
    expect(lists("'a','b','c','d','e'", "'a','b','c','x'")).toHaveLength(1)        // 3 of 4
    expect(lists("'a','b','c','d','e'", "'a','b','c','x','y'")).toHaveLength(0)    // 3 of 5
    expect(lists("'a','b','c'", "'a','b','x'")).toHaveLength(0)                    // 2 shared
  })
  it('a list that only lost members is not new', () => {
    const p = 'engine/src/core/a.ts'
    const whole = { files: { ...PINNED.files, ...one(p, "export const A = ['a','b','c']\n").files, ...one('kingdom/src/core/b.ts', "export const B = ['a','b','c','d']\n").files } }
    expect(flagsFor({ before: one(p, "export const A = ['a','b','c','d']\n"), after: one(p, "export const A = ['a','b','c']\n"), whole, rules })).toEqual([])
  })
  it('reads unions, sets, object keys and values, and a kind union', () => {
    const inv = scanSource([
      "export type Side = 'hero' | 'enemy' | 'neutral'",
      "const S = new Set<string>(['x', 'y', 'z'])",
      "export const M = { alpha: 'layer.a', beta: 'layer.b', 'gamma': 'layer.c' }",
      "export const L: Record<number, string> = { [K.A]: 'l.a', [K.B]: 'l.b', [K.C]: 'l.c' }",
      "export type E = | { readonly kind: 'k.one'; n: number } | { kind: 'k.two' } | { kind: 'k.three'; x: { kind: 'nested' } }",
    ].join('\n'))
    expect(inv.vocab.map((v) => [v.name, v.members.join(' ')])).toEqual([
      ['Side', 'enemy hero neutral'], ['S', 'x y z'], ['M{keys}', 'alpha beta gamma'], ['M{values}', 'layer.a layer.b layer.c'],
      ['L{values}', 'l.a l.b l.c'], ['E.kind', 'k.one k.three k.two'],
    ])
  })
  it('names: functions, exported constants, and module tables with a constant\'s name — not aliases, requires or script locals', () => {
    const inv = scanSource([
      'function fnv1a(v: number[]) { return 0 }', 'export const levelTableOf = (d: unknown) => d', "const HELD = ['a', 'b']",
      "const HELD_CLASSES = ['a', 'b']", 'export const LAYER_IDS = maps.LAYER_IDS', "const fs = require('fs')", 'const OUT = join(here, "x")',
      "export const ATTACK = ['a', 'b'] as const", 'export const X = 1',
    ].join('\n'))
    // HELD is progression.ts's copy of HELD_CLASSES (finding E13) — a table with a constant's name
    expect(inv.names.map((n) => n.name)).toEqual(['fnv1a', 'levelTableOf', 'HELD', 'HELD_CLASSES', 'ATTACK', 'X'])
  })
  it('the tokenizer keeps strings, templates, regexes and comments apart', () => {
    const t = tokenize("const a = `x ${ {k: 'in'}['k'] } y` // 'not a string'\nconst r = /['\"]/g; /* 'nor this' */ const s = 'real'")
    expect(t.filter((x) => x.t === 'str').map((x) => x.v)).toEqual(['in', 'k', 'real'])
    expect(t.filter((x) => x.t === 're').map((x) => x.v)).toEqual(["/['\"]/g"])
    expect(t.at(-1)!.line).toBe(2)
  })
  it('the ruled funnels name files that exist and a literal list the engine has', () => {
    const here = fileURLToPath(new URL('../../', import.meta.url))
    for (const r of rules) for (const f of r.files) expect(statSync(join(here, f)).isFile(), f).toBe(true)
    const trigger = inventoryOf({ 'engine/src/core/trigger.ts': readFileSync(join(here, 'engine/src/core/trigger.ts'), 'utf8') }, rules)
    expect(trigger.files['engine/src/core/trigger.ts']!.vocab.find((v) => v.name === 'TriggerEffect.kind')?.members).toContain('status.apply')
    expect([inScope('engine/src/core/ground.ts'), inScope('engine/src/content/generated/pack.ts'), inScope('engine/test/x.test.ts'), inScope('content/mkenginepack.mjs'), inScope('content/test/a.mjs'), inScope('viewer/tools/a.test.mjs')]).toEqual([true, false, false, true, false, false])
  })
})

describe('tool.prior-art-audit — clones', () => {
  it('a clone counts when a fragment sits on an added line', () => {
    const c: Clone = { a: { file: 'engine/src/x.ts', start: 10, end: 20 }, b: { file: 'kingdom/src/y.ts', start: 1, end: 11 }, lines: 11, key: 'k' }
    expect(clonesTouching([c], { 'engine/src/x.ts': [[20, 25]] })).toHaveLength(1)
    expect(clonesTouching([c], { 'engine/src/x.ts': [[21, 25]] })).toHaveLength(0)
    expect(clonesTouching([c], { 'kingdom/src/y.ts': [[5, 5]] })).toHaveLength(1)
  })
  it('jscpd finds a function copied into another package', () => {
    const root = mkdtempSync(join(tmpdir(), 'prior-art-test-'))
    const body = Array.from({ length: 24 }, (_, i) => `  total += weights[${i}] * values[(${i} + offset) % values.length] - bias(${i}, total)`).join('\n')
    const fn = (name: string) => `export function ${name}(weights: number[], values: number[], offset: number): number {\n  let total = 0\n${body}\n  return total\n}\n`
    mkdirSync(join(root, 'engine/src'), { recursive: true }); mkdirSync(join(root, 'kingdom/src'), { recursive: true })
    writeFileSync(join(root, 'engine/src/a.ts'), fn('score'))
    writeFileSync(join(root, 'kingdom/src/b.ts'), `// a copy\n${fn('scoreAgain')}`)
    const found = clonesOf(['engine/src/a.ts', 'kingdom/src/b.ts'], root)
    expect(found).toHaveLength(1)
    expect([found[0]!.a.file, found[0]!.b.file].sort()).toEqual(['engine/src/a.ts', 'kingdom/src/b.ts'])
  }, 170_000)
})

describe('tool.prior-art-audit — a list that only moved', () => {
  it('an unnamed list pushed down a line is not new', () => {
    const p = 'engine/src/core/a.ts'
    const before = one(p, "if (['a','b','c','d'].includes(x)) y()\n"), after = one(p, "\n\nif (['a','b','c','d'].includes(x)) y()\n")
    const whole = { files: { ...PINNED.files, ...after.files, ...one('kingdom/src/core/b.ts', "export const B = ['a','b','c','d']\n").files } }
    expect(flagsFor({ before, after, whole, rules })).toEqual([])
    expect(flagsFor({ before: NONE, after, whole, rules }).map((f) => f.flag)).toEqual(['look-alike vocabulary'])
  })
})
