#!/usr/bin/env node
// The kingdom's item fields, generated from the codex — G2 of GEAR-IMPLEMENTATION.md.
//
//   node tools/mk-items.mjs [--codex ../content/hbt-content.json] [--combos ../content/gen/tier3-combinations.json] [--out-dir src/content/generated]
//
// kingdom.reads-engine (2026-10-02; engine DECISIONS.md "the duplication review, ruled", findings K2 K8 K11 K15):
// an item's BATTLE facts — its class, tier, hands, slots, restriction, the stats it folds, what it grants, the uses
// its powers carry, and every Forge-derived row (masterwork, the buyable enchants, the tier-3 combinations) — are the
// engine's compiled rows, read through src/engine.ts by src/content/items.ts. This tool used to build its own copy
// of every row by the same rules (its steps 1-4) and the copies disagreed (94 rows' stats, 212 rows' grants). It now
// writes only what the engine does not carry: the CAMPAIGN fields of each codex item.
//
// What it makes:
//   1. items.ts — per codex item: its tags and the sets they make, its set bonus (payload keys in the engine's stat
//      names — content/stat-words.mjs, the one map — or attackDamage), the Waystation band and price, the equip
//      cost, the codex's `uses` (read only where the engine names its uses a gap), and the stat words the engine
//      has no stat for (itemSlots, corruption) — keyed by the codex word. Per codex enchant: the same stat words.
//   2. items-gaps.json — the tier-3 combinations checked against the codex: an unknown base is a refusal (Law 9);
//      an unknown enchant is a NAMED GAP until the content session lands it.
//   3. kits.ts — each codex hero's general item slots (heroes[].ported.itemSlots) and the heroes whose kit is only
//      pinned. A hero's KIT is its engine row's defaultItems (content/heroes.ts heroKitOf), not a copy here.
//   4. kits-gaps.json — the pool heroes with no kit (tools/kit-gaps.mts).
//
// Deterministic: the same inputs give the same files, byte for byte (ISC-051 checks that).

import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { statOf } from '../../content/stat-words.mjs'

const argv = process.argv.slice(2)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const CODEX = val('--codex', '../content/hbt-content.json')
const COMBOS = val('--combos', '../content/gen/tier3-combinations.json')
const OUT_DIR = val('--out-dir', 'src/content/generated')
const PACKAGE = fileURLToPath(new URL('../', import.meta.url))

const codex = JSON.parse(readFileSync(CODEX, 'utf8'))
const combos = JSON.parse(readFileSync(COMBOS, 'utf8'))
const byId = new Map(codex.items.map((i) => [i.id, i]))
const enchants = new Map(codex.enchants.map((e) => [e.id, e]))
const fail = (msg) => { console.error(`mk-items: ${msg}`); process.exit(1) }
/** Stable key order, so the file is byte-stable. */
const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]))

// A set is a TAG plus a `setBonus` block on the item that cares (GEAR-DESIGN.md §5, resolved 2026-09-03) — so the set
// tags are the tags any codex setBonus names, and a row's `sets` are those of its tags. Nothing here knows a tag by name.
const SET_TAGS = new Set(codex.items.map((i) => i.setBonus?.tag).filter(Boolean))
/** A set payload in the engine's stat names (the battle receives it as heroMods); attackDamage is this weapon's own. */
const payloadOf = (o, where) => sorted(Object.fromEntries(Object.entries(o).map(([k, v]) => {
  if (k === 'attackDamage') return [k, v]
  const st = statOf(k)
  if (!st) fail(`${where}: set payload '${k}' is no engine stat (content/stat-words.mjs)`)
  return [st, v]
})))
const setBonusOf = (sb, where) => {
  if (!sb) return null
  if (typeof sb.tag !== 'string') fail(`setBonus without a tag: ${JSON.stringify(sb)}`)
  const out = { tag: sb.tag }
  if (sb.each) out.each = payloadOf(sb.each, where)
  // capability.set-bonus (engine item, 2026-10-05): "for every … you carry" — the carrier is counted too when it bears the tag
  if (sb.withItself !== undefined) { if (sb.withItself !== true || !sb.each) fail(`setBonus on '${sb.tag}': withItself is true, on an each block, or absent`); out.withItself = true }
  if (sb.at !== undefined) { if (!Number.isInteger(sb.at) || !sb.once) fail(`setBonus at-count on '${sb.tag}' needs integer at and once{}`); out.at = sb.at; out.once = payloadOf(sb.once, where) }
  if (!out.each && out.at === undefined) fail(`setBonus on '${sb.tag}' pays nothing — each{} or at/once{}`)
  return out
}

const CURRENCY = { faith: 'currency.faith', manaCrystals: 'currency.mana', supplies: 'currency.supplies', salvage: 'currency.salvage' }
const costOf = (ec) => {
  const out = {}
  for (const [k, v] of Object.entries(ec ?? {})) { const c = CURRENCY[k]; if (!c) fail(`equipCost key '${k}' names no currency`); out[c] = v }
  return sorted(out)
}
/** The codex stat words the engine has no stat for — campaign quantities (itemSlots, corruption), keyed by the word. */
const campaignModsOf = (mods) => sorted(Object.fromEntries(Object.entries(mods ?? {}).filter(([k]) => !statOf(k))))

const rows = codex.items.map((i) => ({
  id: i.id,
  tags: [...(i.tags ?? [])].sort(), sets: [...(i.tags ?? [])].filter((t) => SET_TAGS.has(t)).sort(), setBonus: setBonusOf(i.setBonus, i.id),
  // the Waystation's catalog: which band opens the row, and what it costs there (GEAR-DESIGN.md §4)
  waystationBand: i.waystationBand ?? null, price: costOf(i.price), equipCost: costOf(i.equipCost),
  uses: i.uses ?? null, campaignMods: campaignModsOf(i.statModifiers),
})).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
const enchantRows = codex.enchants.map((e) => ({ id: e.id, campaignMods: campaignModsOf(e.statModifiers) }))
  .filter((e) => Object.keys(e.campaignMods).length).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
const seen = new Set()
for (const r of rows) { if (seen.has(r.id)) fail(`duplicate item id '${r.id}'`); seen.add(r.id) }

// the tier-3 combinations — authored by hand, checked here. An unknown BASE is a typo and a refusal. An unknown
// ENCHANT is the content session's row not yet landed: written to items-gaps.json, named, so the count of what is
// missing is visible and nothing is rounded to a wrong row.
const gaps = []
for (const c of combos) {
  if (!byId.get(c.base)) fail(`combination '${c.id}' names base '${c.base}', which is not in the codex`)
  if (!enchants.get(c.enchant)) gaps.push({ id: c.id, needs: c.enchant, why: 'enchant not in the codex yet' })
}

const header = `// GENERATED by tools/mk-items.mjs from ${CODEX}. Never hand-edit; regenerate.
// ${rows.length} codex items' campaign fields · ${enchantRows.length} enchants with a campaign stat.
//
// The item's battle facts are the engine's compiled rows; src/content/items.ts joins these fields to them (ItemRow).

import type { CampaignItemRow, CampaignEnchantRow } from '../items.js'

export const ITEM_CAMPAIGN_ROWS: readonly CampaignItemRow[] = [
${rows.map((r) => '  ' + JSON.stringify(r) + ',').join('\n')}
]

export const ENCHANT_CAMPAIGN_ROWS: readonly CampaignEnchantRow[] = [
${enchantRows.map((r) => '  ' + JSON.stringify(r) + ',').join('\n')}
]
`

// the kits' campaign half — what each codex hero's slot model needs. The kit itself is the engine row's defaultItems.
const kitSpecs = []
for (const h of codex.heroes.heroes) {
  const k = h.kit
  if (k && !Array.isArray(k) && Array.isArray(k.pinned)) kitSpecs.push({ id: h.id, pinned: k.pinned })
}
const kitText = `// GENERATED by tools/mk-items.mjs from ${CODEX} (heroes[]). Never hand-edit; regenerate.
// ${codex.heroes.heroes.filter((h) => Number.isInteger(h.ported?.itemSlots)).length} heroes' item slots; ${kitSpecs.length} with a pinned part and a draw still owed (KIT_SPECS).
//
// A hero's kit is its engine row's defaultItems (src/content/heroes.ts heroKitOf — kingdom.reads-engine, review K15).

/** Heroes whose kit is only partly pinned — the remainder is a class draw the kingdom does not roll. */
export const KIT_SPECS: readonly { readonly id: string; readonly pinned: readonly string[] }[] = ${JSON.stringify(kitSpecs)}

/** General item slots per codex hero (heroes[].ported.itemSlots) — hands and the armor slot are not counted. */
export const HERO_ITEM_SLOTS: Readonly<Record<string, number>> = {
${codex.heroes.heroes.filter((h) => Number.isInteger(h.ported?.itemSlots)).map((h) => `  ${JSON.stringify(h.id)}: ${h.ported.itemSlots},`).join('\n')}
}
`
// Derive the pool report from THESE specs, before touching any output. The child reads the pool and the engine's kits.
const kitGaps = JSON.parse(execFileSync(process.execPath, [
  fileURLToPath(new URL('../../engine/node_modules/tsx/dist/cli.mjs', import.meta.url)),
  fileURLToPath(new URL('./kit-gaps.mts', import.meta.url)), '--candidate',
], { cwd: PACKAGE, encoding: 'utf8', input: JSON.stringify({ kitSpecs }) }))
const artifacts = {
  'items.ts': header,
  'items-gaps.json': JSON.stringify({ generatedBy: 'tools/mk-items.mjs', count: gaps.length, gaps }, null, 1) + '\n',
  'kits.ts': kitText,
  'kits-gaps.json': JSON.stringify(kitGaps, null, 1) + '\n',
}
// No validation or subprocess remains after the first write. A rejected candidate leaves all four previous
// artifacts intact, including the live set when the default output directory was requested.
mkdirSync(OUT_DIR, { recursive: true })
for (const [name, contents] of Object.entries(artifacts)) writeFileSync(join(OUT_DIR, name), contents)
console.log(`${join(OUT_DIR, 'kits.ts')} — ${kitSpecs.length} pinned specs`)
console.log(`${join(OUT_DIR, 'kits-gaps.json')} — ${kitGaps.pool.length} pool hero(es) without a kit`)
if (gaps.length) console.log(`${gaps.length} combination(s) wait on enchants the codex does not have yet — ${join(OUT_DIR, 'items-gaps.json')}`)
console.log(`${join(OUT_DIR, 'items.ts')} — ${rows.length} items' campaign fields, ${enchantRows.length} enchants'`)
