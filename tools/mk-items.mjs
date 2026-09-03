#!/usr/bin/env node
// The kingdom's item rows, generated from the codex — G2 of GEAR-IMPLEMENTATION.md.
//
//   node tools/mk-items.mjs [--codex ../content/hbt-content.json] [--combos ../content/gen/tier3-combinations.json]
//
// Reads content/hbt-content.json (items, enchants, kits) and the hand-authored tier-3
// combinations, writes src/content/generated/items.ts. The kingdom never types an item
// row by hand (CLAUDE.md: "Never hand-edit generated/"); when the content session lands
// new rows — the tier-2 enchants, the Waystation's items, the set fields — this runs
// again and the rows follow. Deterministic: the same inputs give the same file, byte for
// byte (ISC-051 checks that).
//
// What it makes, in order:
//   1. every codex item, as it is;
//   2. a MASTERWORK row for every tier-1 two-hander and armor (GEAR-DESIGN.md §3: +1 Max
//      Stamina, tier 2) — the rule is settled, so the rows are derived, not authored;
//   3. an ENCHANTED row for every tier-1 base × every codex enchant flagged `buyable`
//      (the nine tier-2 enchants, once the content session lands them; none today);
//   4. the tier-3 combinations from content/gen/tier3-combinations.json, checked
//      against the codex: an unknown base is a refusal (Law 9); an unknown enchant is a
//      NAMED GAP (generated/items-gaps.json) until the content session lands it.
//
// A row's shape is src/content/items.ts's ItemRow. Costs: the codex's equipCost keys
// (faith, manaCrystals) become currency ids. `uses` is the codex's `uses` when it exists
// (the Waystation rows will carry it), else null — a permanent item.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const argv = process.argv.slice(2)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const CODEX = val('--codex', '../content/hbt-content.json')
const COMBOS = val('--combos', '../content/gen/tier3-combinations.json')
const OUT = 'src/content/generated/items.ts'

const codex = JSON.parse(readFileSync(CODEX, 'utf8'))
const combos = JSON.parse(readFileSync(COMBOS, 'utf8'))
const byId = new Map(codex.items.map((i) => [i.id, i]))
const enchants = new Map(codex.enchants.map((e) => [e.id, e]))

const CURRENCY = { faith: 'currency.faith', manaCrystals: 'currency.mana', supplies: 'currency.supplies', salvage: 'currency.salvage' }
const fail = (msg) => { console.error(`mk-items: ${msg}`); process.exit(1) }

const tierOf = (t) => { const n = Number(t); if (!Number.isInteger(n)) fail(`tier '${t}' is not an integer`); return n }
const costOf = (ec) => {
  const out = {}
  for (const [k, v] of Object.entries(ec ?? {})) { const c = CURRENCY[k]; if (!c) fail(`equipCost key '${k}' names no currency`); out[c] = v }
  return out
}
const sum = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b ?? {})) o[k] = (o[k] ?? 0) + v; return o }
/** Stable key order, so the file is byte-stable. */
const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]))

function rowOfCodex(i) {
  return {
    id: i.id, name: i.name, itemClass: i.itemClass, tier: tierOf(i.tier),
    hands: i.hands ?? 0, slots: i.slots ?? 0, classRestriction: i.classRestriction ?? null,
    tags: [...(i.tags ?? [])].sort(), sets: [...(i.sets ?? [])].sort(),
    uses: i.uses ?? null, equipCost: sorted(costOf(i.equipCost)),
    // the Waystation's catalog: which band opens the row, and what it costs there (GEAR-DESIGN.md §4)
    waystationBand: i.waystationBand ?? null, price: sorted(costOf(i.price)),
    statModifiers: sorted(i.statModifiers ?? {}), attackModifiers: sorted(i.attackModifiers ?? {}), grants: [...(i.grants ?? [])],
    base: null, enchant: null, source: 'codex',
  }
}

const rows = []
for (const i of codex.items) rows.push(rowOfCodex(i))

// 2. masterwork — tier-1 two-handers and armor, +1 Max Stamina, tier 2. Never a shield.
for (const i of codex.items) {
  const base = rowOfCodex(i)
  if (base.tier !== 1) continue
  const isShield = base.tags.includes('shield')
  const twoHander = base.itemClass === 'weapon' && base.hands === 2
  if (isShield || !(twoHander || base.itemClass === 'armor')) continue
  rows.push({
    ...base, id: `${base.id}.masterwork`, name: `Masterwork ${base.name}`, tier: 2,
    statModifiers: sorted(sum(base.statModifiers, { staminaMax: 1 })),
    base: base.id, enchant: null, source: 'masterwork',
  })
}

// 3. enchanted — tier-1 base × buyable enchant, when the codex has buyable enchants
const applies = (base, e) => {
  const tags = new Set(base.tags)
  const ranged = ['bow', 'crossbow', 'sling', 'thrown', 'staff', 'wand', 'tome'].some((t) => tags.has(t))
  for (const t of e.appliesToTags ?? []) {
    if (t === 'armor' && base.itemClass === 'armor') return true
    if (t === 'shield' && tags.has('shield')) return true
    if (t === 'weapons' && base.itemClass === 'weapon' && !tags.has('shield')) return true
    if (t === 'ranged' && base.itemClass === 'weapon' && ranged) return true
    if (t === 'melee' && base.itemClass === 'weapon' && !ranged && !tags.has('shield')) return true
    if (tags.has(t)) return true
  }
  return false
}
for (const i of codex.items) {
  const base = rowOfCodex(i)
  if (base.tier !== 1 || base.tags.includes('shield')) continue
  for (const e of codex.enchants) {
    if (!e.buyable || !applies(base, e)) continue
    const word = e.name ?? e.id.replace(/^enchant\./, '')
    rows.push({
      ...base, id: `${base.id}.${e.id.replace(/^enchant\./, '')}`, name: `${word} ${base.name}`, tier: 2,
      statModifiers: sorted(sum(base.statModifiers, e.statModifiers)), attackModifiers: sorted(sum(base.attackModifiers, e.attackModifiers)), grants: [...base.grants, ...(e.grants ?? [])],
      base: base.id, enchant: e.id, source: 'enchanted',
    })
  }
}

// 4. the tier-3 combinations — authored by hand, checked here. An unknown BASE is a
// typo and a refusal. An unknown ENCHANT is the content session's row not yet landed
// (the 2026-09-02 renames and additions — destroying, rooting, gale …): the
// combination is NOT emitted and is written to generated/items-gaps.json, named, so
// the count of what is missing is visible and nothing is rounded to a wrong row.
const gaps = []
for (const c of combos) {
  const b = byId.get(c.base)
  const e = enchants.get(c.enchant)
  if (!b) fail(`combination '${c.id}' names base '${c.base}', which is not in the codex`)
  if (!e) { gaps.push({ id: c.id, needs: c.enchant, why: 'enchant not in the codex yet' }); continue }
  const base = rowOfCodex(b)
  rows.push({
    ...base, id: c.id, name: c.name, tier: 3,
    statModifiers: sorted(sum(base.statModifiers, e.statModifiers)), attackModifiers: sorted(sum(base.attackModifiers, e.attackModifiers)), grants: [...base.grants, ...(e.grants ?? [])],
    base: base.id, enchant: e.id, source: 'combination',
  })
}

// ids unique; sorted by id so the file is stable and registry order is never a tiebreak
const seen = new Set()
for (const r of rows) { if (seen.has(r.id)) fail(`duplicate item id '${r.id}'`); seen.add(r.id) }
rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

const counts = {}
for (const r of rows) counts[r.source] = (counts[r.source] ?? 0) + 1
const header = `// GENERATED by tools/mk-items.mjs from ${CODEX} and ${COMBOS}. Never hand-edit; regenerate.
// ${rows.length} rows: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ')}.
//
// The kingdom's items are the codex's. The shape is src/content/items.ts's ItemRow.

import type { ItemRow } from '../items.js'

export const ITEM_ROWS: readonly ItemRow[] = [
`
const body = rows.map((r) => '  ' + JSON.stringify(r) + ',').join('\n')
mkdirSync('src/content/generated', { recursive: true })
writeFileSync(OUT, header + body + '\n]\n')
writeFileSync('src/content/generated/items-gaps.json', JSON.stringify({ generatedBy: 'tools/mk-items.mjs', count: gaps.length, gaps }, null, 1) + '\n')

// 5. the kits — what each codex hero wears at entry (G3). A plain array on the hero
// row is the full kit (heroKits override, or a civilian's dictated tool); {pinned}
// pins part and leaves the class draw as a SPEC the kingdom does not roll; null is
// no kit at all. Every kit item must be a row above (Law 9).
const kits = {}
const kitSpecs = []
for (const h of codex.heroes.heroes) {
  const k = h.kit
  if (Array.isArray(k)) { for (const id of k) if (!seen.has(id)) fail(`hero '${h.id}' wears '${id}', which is no item row`); kits[h.id] = [...k] }
  else if (k && Array.isArray(k.pinned)) kitSpecs.push({ id: h.id, pinned: k.pinned, why: 'the class-draw remainder is a SPEC; the roll belongs to the draft' })
}
const kitLines = Object.keys(kits).sort().map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(kits[id])},`).join('\n')
writeFileSync('src/content/generated/kits.ts', `// GENERATED by tools/mk-items.mjs from ${CODEX} (heroes[].kit). Never hand-edit; regenerate.
// ${Object.keys(kits).length} heroes with a full kit; ${kitSpecs.length} with a pinned part and a draw still owed (kits-specs below).
//
// What a hero wears at entry — hbt-content.json heroKits (2026-08-27b: all 24 Eve heroes
// carry FULL kits) and the civilians' dictated tools. A hero absent here has no kit.

export const HERO_KITS: Readonly<Record<string, readonly string[]>> = {
${kitLines}
}

/** Heroes whose kit is only partly pinned — the remainder is a class draw the kingdom does not roll. */
export const KIT_SPECS: readonly { readonly id: string; readonly pinned: readonly string[] }[] = ${JSON.stringify(kitSpecs.map(({ id, pinned }) => ({ id, pinned })))}

/** General item slots per codex hero (heroes[].ported.itemSlots) — hands and the armor slot are not counted. */
export const HERO_ITEM_SLOTS: Readonly<Record<string, number>> = {
${codex.heroes.heroes.filter((h) => Number.isInteger(h.ported?.itemSlots)).map((h) => `  ${JSON.stringify(h.id)}: ${h.ported.itemSlots},`).join('\n')}
}
`)
console.log(`src/content/generated/kits.ts — ${Object.keys(kits).length} kits, ${kitSpecs.length} pinned specs`)
if (gaps.length) console.log(`${gaps.length} combination(s) wait on enchants the codex does not have yet — src/content/generated/items-gaps.json`)
console.log(`${OUT} — ${rows.length} rows (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')})`)
// 6. the pool's kit gaps — needs the kingdom's pool, so it runs as TypeScript
execSync('node ../engine/node_modules/tsx/dist/cli.mjs tools/kit-gaps.mts', { stdio: 'inherit' })
