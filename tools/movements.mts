// tools/movements.mts — the list of every movement the content needs (movement.inventory).
//
// Ruled 2026-10-01 (Andrew, engine/DECISIONS.md 'the movements'): "We need a really wide range of movement options for the
// player units to support different items and different powers ... 1. Identify all of the movements." Identifying only:
// nothing is built here. One row per action a player unit can hold — each weapon class's attacks and powers, each shield's
// powers, each item use (drinking a potion among them), each power, each movement power, and the loadout swap — naming:
//   content   the content ids that grant it (an item's weapon class — its base row —, a class power, a badge, a unit type)
//   action    the action id, its name and kind (melee, ranged, power, burst, move, flight, in place, swap)
//   engine    yes — an engine command (src/content ACTIONS) · inert — a command whose row compiled no effect yet (its gap
//             named) · no — the pack names it and the engine has no row for it (the item's gap)
//   bar       the action bar column it is drawn in (viewer src/actionbar.js: moves, attacks, powers; the swap in the stamina
//             strip) — an engine command is on the bar, an action the engine lacks is not
//   motion    the viewer's motion word it plays (viewer tools/character-models.mjs MOTIONS), by the viewer's own rules:
//             a melee attack strikes (`attack`); a ranged attack shoots (`ranged`), a body without one strikes instead
//             (viewer src/models.js strike); a walk is `move`, a flight `flight`, a body without one walks (models.js frame);
//             a power, a burst, a move in place and the swap play no body motion (viewer src/fold.js power.used,
//             burst.declared, loadout.swapped: an effect, a float, no clip)
//   bodies    on each hero body the drafted heroes wear (viewer CLASS_LOOKS, packCharacterModels): the approved or selected
//             clip it plays, a stand-in, or nothing
//   selected  a selected performance whose recorded use fits a row with no motion — not bound to any motion word; binding
//             one may need a new motion word, which is Angela's (DISPLAY-RULES 21), so it is named, never bound here
//   ruling    a ruling that settles the motion still to be built
// The count of what is missing heads the list. engine SWITCHES.md 'movement.inventory' holds the defaults taken.
//
//   npx tsx tools/movements.mts           write generated/movements.json and generated/movements.md
//   npx tsx tools/movements.mts --check   exit 1 if either is stale (test/movement-inventory.test.ts refuses a stale copy)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { ACTIONS, ITEMS, UNITS, BADGES } from '../src/content/index.js'
import { MOVES } from '../src/content/moves.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import type { ActionDef, ItemDef } from '../src/core/types.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const GROUPS = ['weapon', 'shield', 'item-use', 'power', 'unit', 'movement', 'swap'] as const
export type Group = typeof GROUPS[number]
export type Row = {
  readonly group: Group
  readonly content: readonly string[]
  readonly action: string | null
  readonly name: string
  readonly kind: string | null
  readonly engine: 'yes' | 'inert' | 'no'
  readonly bar: 'move' | 'attack' | 'power' | 'swap' | null
  readonly motion: string | null
  readonly bodies: Readonly<Record<string, string | null>>
  readonly motionStatus: 'played' | 'partial' | 'missing'
  readonly selected: { readonly key: string, readonly label: string, readonly clip: string, readonly record: string } | null
  readonly ruling: string | null
  readonly note: string | null
  readonly variants: number
}
export type Inventory = {
  readonly motionWords: readonly string[]
  readonly bodyMotions: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly rows: readonly Row[]
  readonly counts: { readonly rows: number, readonly missing: number, readonly noEngine: number, readonly inert: number, readonly noMotion: number, readonly selectedUnbound: number, readonly partial: number }
}

/* The six shield powers' motion, ruled after movement.swap-and-shields listed it missing (viewer SWITCHES swapShieldMotions). */
const SHIELD_RULING = "Ruled 2026-10-01 (Andrew, engine DECISIONS.md 'a shield power plays a raise-the-shield motion', engine b91a3f7); the build is filed as viewer.shield-guard-motion — not built yet"
/* movement.swap-and-shields (viewer SWITCHES swapShieldMotions): "no draw or stow clip among the approved or selected motions" */
const SWAP_NOTE = 'no draw or stow clip among the approved or selected motions (movement.swap-and-shields; viewer SWITCHES swapShieldMotions); no ruling'
/* The selected performances (assets/characters/oathblade-armor/rebuild/free-motion-study/selections.json, Andrew 2026-09-29)
   a row with no motion is matched to, by the use each was selected for (engine SWITCHES movementSelectedFits). */
const SELECTIONS = 'assets/characters/oathblade-armor/rebuild/free-motion-study/selections.json'
const FITS = {
  consume: 'an item use consumed on use, aimed at the user or an ally ("Selected for drinking or consuming an item")',
  getup: 'a movement power that stands the unit up ("Selected stand-up performance")',
  spell: 'any other power or burst ("Selected for suitable forms of casting and power use; exact abilities and effects remain to be assigned")',
} as const

const isTest = (id: string) => /(^|[.-])test(-|\.|$)/.test(id)
const ACTION_ID = /^(?:power|attack|burst)\.[a-z0-9][a-z0-9.-]*$/
const baseOf = (it: ItemDef) => (it as ItemDef & { base?: string }).base ?? it.id
const classPowers = (UNIT_PACK as unknown as { classPowers?: Readonly<Record<string, ActionDef>> }).classPowers ?? {}

type Def = ActionDef & { move?: { shape: string, stepRange?: number }, attack?: { kind: string }, burst?: unknown, effects?: readonly { kind: string }[], gaps?: readonly string[], uses?: number, target?: { select?: string, side?: string } }
const defOf = (id: string): Def | undefined => (ACTIONS[id] ?? classPowers[id]) as Def | undefined

function kindOf(d: Def | undefined): string | null {
  if (!d) return null
  if (d.move) return d.move.shape === 'flight' ? 'flight' : d.move.shape === 'sidestep' && d.move.stepRange === 0 ? 'in place' : 'move'
  if (d.attack) return d.attack.kind === 'ranged' ? 'ranged' : 'melee'
  return d.burst ? 'burst' : 'power'
}
/* the motion word the viewer plays for each kind, and what it plays on a body without that word */
const MOTION_OF: Readonly<Record<string, string | null>> = { melee: 'attack', ranged: 'ranged', move: 'move', flight: 'flight', 'in place': null, power: null, burst: null, swap: null }
const STAND_IN: Readonly<Record<string, string>> = { ranged: 'attack', flight: 'move' }

/** the hero bodies the drafted heroes wear, each motion word -> the clip it plays (the viewer's own pack) */
async function heroBodies(): Promise<{ words: string[], bodies: Record<string, Record<string, string>> }> {
  const cm = await import(pathToFileURL(ROOT + 'viewer/tools/character-models.mjs').href) as { MOTIONS: string[], packCharacterModels: () => Promise<Record<string, { looks: { name: string, motions: Record<string, { clip: string }> }[] }>> }
  const pack = await cm.packCharacterModels()
  const bodies: Record<string, Record<string, string>> = {}
  for (const [typeId, entry] of Object.entries(pack)) {
    if (!typeId.startsWith('hero.base.')) continue
    for (const look of entry.looks) {
      const motions = Object.fromEntries(Object.entries(look.motions).map(([w, m]) => [w, m.clip]).sort(([a], [b]) => a!.localeCompare(b!)))
      const had = bodies[look.name]
      if (had && JSON.stringify(had) !== JSON.stringify(motions)) throw new Error(`movements: the ${look.name} body plays different motions on ${typeId}`)
      bodies[look.name] = motions
    }
  }
  if (!Object.keys(bodies).length) throw new Error('movements: the viewer\'s pack names no hero body')
  return { words: [...cm.MOTIONS], bodies: Object.fromEntries(Object.entries(bodies).sort(([a], [b]) => a.localeCompare(b))) }
}

function selectedPerformances(): Record<string, { key: string, label: string, clip: string, record: string }> {
  const rec = JSON.parse(readFileSync(ROOT + SELECTIONS, 'utf8')) as { clips: Record<string, { label: string, clip: string }> }
  const out: Record<string, { key: string, label: string, clip: string, record: string }> = {}
  for (const key of Object.keys(FITS)) {
    const c = rec.clips[key]
    if (!c) throw new Error(`movements: ${SELECTIONS} no longer selects '${key}'`)
    out[key] = { key, label: c.label, clip: c.clip, record: SELECTIONS }
  }
  return out
}

/** every movement the content needs */
export async function movementInventory(): Promise<Inventory> {
  const { words, bodies } = await heroBodies()
  const sel = selectedPerformances()
  for (const w of Object.values(MOTION_OF)) if (w && !words.includes(w)) throw new Error(`movements: '${w}' is not one of the viewer's motion words`)

  // who grants each action: items (by weapon class / base row), class powers, badges, player unit types
  const grants = new Map<string, { items: Set<string>, classes: Set<string>, powers: boolean, badges: Set<string>, units: Set<string>, variants: number }>()
  const at = (a: string) => grants.get(a) ?? grants.set(a, { items: new Set(), classes: new Set(), powers: false, badges: new Set(), units: new Set(), variants: 0 }).get(a)!
  const gapRows: Row[] = []
  const items = Object.values(ITEMS).filter((i) => !isTest(i.id)).sort((a, b) => a.id.localeCompare(b.id))
  for (const it of items) {
    const base = baseOf(it)
    const baseActions = [...(ITEMS[base]?.grants ?? []), ...(ITEMS[base]?.abilities ?? [])]
    for (const a of [...it.grants, ...it.abilities]) {
      if (!ACTION_ID.test(a)) continue
      // a tiered variant's attack (attack.war-axe.chop.heavy) is its base attack's movement
      const folded = it.id !== base ? baseActions.find((b) => a.startsWith(b + '.')) : undefined
      const g = at(folded ?? a)
      g.items.add(base); g.classes.add(it.itemClass)
      if (folded) g.variants++
    }
  }
  for (const it of items.filter((i) => baseOf(i) === i.id)) {
    const group: Group = it.itemClass === 'weapon' ? 'weapon' : it.itemClass === 'shield' ? 'shield' : 'item-use'
    for (const gap of it.gaps ?? []) {
      const m = /^grants ((?:power|attack|burst)\.[a-z0-9.-]+) — (.*)$/.exec(gap)
      if (m && !ACTIONS[m[1]!]) gapRows.push(row(group, [it.id], m[1]!, m[1]!, null, 'no', `the pack names it; the engine has no row (${m[2]})`))
      else if (/^active: /.test(gap) && ![...it.grants, ...it.abilities].some((a) => ACTION_ID.test(a)))
        gapRows.push(row(group, [it.id], null, gap.split(' — ')[0]!, null, 'no', `an item power the engine has no row for (${gap.split(' — ').slice(1).join(' — ')})`))
    }
  }
  for (const id of Object.keys(classPowers)) at(id).powers = true
  for (const id of Object.keys(MOVES)) if (!isTest(id)) at(id)   // every movement power, held today or not
  for (const b of Object.values(BADGES)) if (!isTest(b.id)) for (const a of b.grants) if (ACTION_ID.test(a)) at(a).badges.add(b.id)
  for (const u of Object.values(UNITS)) {
    if (u.side !== 'hero' || isTest(u.typeId)) continue
    for (const a of [...(u.attacks ?? []), ...(u.abilities ?? []), ...(u.moves ?? [])]) if (!isTest(a)) at(a).units.add(u.typeId)
  }

  function row(group: Group, content: string[], action: string | null, name: string, kind: string | null, engine: Row['engine'], note: string | null, extra: Partial<Row> = {}): Row {
    const motion = kind ? MOTION_OF[kind] ?? null : null
    const cells: Record<string, string | null> = {}
    let has = 0
    for (const [body, m] of Object.entries(bodies)) {
      if (motion && m[motion]) { cells[body] = m[motion]!; has++; continue }
      const s = motion && kind ? STAND_IN[kind] : undefined
      cells[body] = s && m[s] ? `stand-in: ${s} (${m[s]})` : null
    }
    const n = Object.keys(bodies).length
    const motionStatus = !motion || has === 0 ? 'missing' : has === n ? 'played' : 'partial'
    const bar = engine === 'no' ? null : kind === 'swap' ? 'swap' : kind === 'move' || kind === 'flight' || kind === 'in place' ? 'move' : kind === 'melee' || kind === 'ranged' ? 'attack' : 'power'
    return { group, content, action, name, kind, engine, bar, motion, bodies: cells, motionStatus, selected: null, ruling: null, note, variants: 0, ...extra }
  }

  const rows: Row[] = [...gapRows]
  for (const [a, g] of grants) {
    const d = defOf(a)
    const kind = kindOf(d)
    const group: Group = d?.move ? 'movement' : g.classes.has('shield') ? 'shield' : g.classes.has('weapon') ? 'weapon' : g.items.size ? 'item-use' : g.powers || g.badges.size ? 'power' : 'unit'
    const held = [...g.items, ...g.badges, ...g.units]
    const content = group === 'movement' ? (held.length ? held : [a]) : g.items.size ? [...g.items] : g.powers ? [a, ...g.badges] : g.badges.size ? [...g.badges] : [...g.units]
    const engine: Row['engine'] = !ACTIONS[a] ? 'no' : d && !d.move && !d.attack && !d.burst && Array.isArray(d.effects) && d.effects.length === 0 && (d.gaps?.length ?? 0) > 0 ? 'inert' : 'yes'
    const natural = [...g.items].some((i) => ITEMS[i]?.classRestriction === 'class.beast' && (ITEMS[i]?.gaps ?? []).some((x) => /^natural/.test(x)))
    const note = engine === 'no' ? 'the engine has no row for it' : engine === 'inert' ? `on the bar, does nothing yet: ${d!.gaps![0]}` : natural ? 'a natural weapon (class.beast)'
      : group === 'movement' && !held.length ? 'no player unit, item or badge grants it today' : null
    let r = row(group, content.sort(), a, d?.name ?? a, kind, engine, note, { variants: g.variants })
    if (group === 'shield') r = { ...r, ruling: SHIELD_RULING }
    else if (r.motionStatus === 'missing' && engine !== 'no') {
      const effects = (d?.effects ?? []).map((e) => e.kind)
      const key = group === 'item-use' && d?.uses != null && (d.target?.select === 'self' || d.target?.side === 'ally') ? 'consume'
        : kind === 'in place' && effects.includes('stand') ? 'getup'
        : kind === 'power' || kind === 'burst' ? 'spell' : null
      if (key) r = { ...r, selected: sel[key]! }
    }
    rows.push(r)
  }
  rows.push(row('swap', ['loadout'], null, 'Swap (the loadout swap: exchange what is in hand for what is stowed)', 'swap', 'yes', SWAP_NOTE))

  const order = (r: Row) => GROUPS.indexOf(r.group)
  rows.sort((x, y) => order(x) - order(y) || x.content[0]!.localeCompare(y.content[0]!) || (x.action ?? x.name).localeCompare(y.action ?? y.name))
  const counts = {
    rows: rows.length,
    missing: rows.filter((r) => r.engine === 'no' || r.motionStatus === 'missing').length,
    noEngine: rows.filter((r) => r.engine === 'no').length,
    inert: rows.filter((r) => r.engine === 'inert').length,
    noMotion: rows.filter((r) => r.motionStatus === 'missing').length,
    selectedUnbound: rows.filter((r) => r.motionStatus === 'missing' && r.selected).length,
    partial: rows.filter((r) => r.motionStatus === 'partial').length,
  }
  return { motionWords: words, bodyMotions: bodies, rows, counts }
}

export function movementsJson(inv: Inventory): string {
  return JSON.stringify({ generatedBy: 'engine/tools/movements.mts (movement.inventory) — never hand-edit', ...inv }, null, 1) + '\n'
}

const TITLES: Record<Group, string> = {
  weapon: 'Weapon classes — each base weapon\'s attacks and powers (its tiered and enchanted variants fold into it)',
  shield: 'Shields — each shield\'s powers',
  'item-use': 'Item uses — the powers of trinkets, idols, relics, runes and armour (drinking a potion among them)',
  power: 'Powers — the class powers and what badges grant',
  unit: 'A player unit\'s own actions — no item grants them',
  movement: 'Movement powers',
  swap: 'The loadout swap',
}
const cell = (s: string | null | undefined) => (s ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const list = (xs: readonly string[]) => xs.length > 3 ? `${xs.slice(0, 3).map((x) => `\`${x}\``).join(', ')} +${xs.length - 3} more` : xs.map((x) => `\`${x}\``).join(', ')

export function movementsMarkdown(inv: Inventory): string {
  const c = inv.counts
  const bodies = Object.keys(inv.bodyMotions)
  const out = [
    '# The movements — every one the content needs',
    '',
    `**Missing: ${c.missing} of ${c.rows} movements** — ${c.noEngine} have no engine command · ${c.noMotion} have no motion on any hero body (${c.selectedUnbound} of them with a selected performance not yet bound to a motion word) · ${c.partial} more play a stand-in on some body · ${c.inert} are engine commands that do nothing yet.`,
    '',
    'Generated by `engine/tools/movements.mts` (movement.inventory; engine DECISIONS.md 2026-10-01 \'the movements\': "1. Identify all of the movements."). Never hand-edit: `npx tsx tools/movements.mts` rewrites it, and `test/movement-inventory.test.ts` refuses a stale copy. The same rows, whole, are `movements.json`.',
    '',
    `**Engine** — yes: an engine command · inert: a command whose row compiled no effect yet · no: the pack names it, the engine has no row. **Bar** — the action bar column it is drawn in (moves, attacks, powers; the swap in the stamina strip). **Motion** — the viewer's motion word it plays (${inv.motionWords.map((w) => `\`${w}\``).join(', ')}); — where the viewer plays no body motion for it. **${bodies.join('**, **')}** — the hero bodies the drafted heroes wear and the clip each plays: ${bodies.map((b) => `${b} ${Object.entries(inv.bodyMotions[b]!).map(([w, k]) => `${w} = ${k}`).join(', ')}`).join('; ')}. **Selected** — a selected performance whose recorded use fits, bound to no motion word (a new motion word is Angela's).`,
    '',
  ]
  for (const g of GROUPS) {
    const rows = inv.rows.filter((r) => r.group === g)
    if (!rows.length) continue
    out.push(`## ${TITLES[g]} (${rows.length})`, '')
    out.push(`| Content | Action | Kind | Engine | Bar | Motion | ${bodies.join(' | ')} | Selected · ruling · note |`)
    out.push(`|---|---|---|---|---|---|${bodies.map(() => '---|').join('')}---|`)
    for (const r of rows) {
      const extra = [r.selected ? `selected: ${r.selected.label} (${r.selected.clip})` : null, r.ruling, r.note, r.variants ? `${r.variants} tiered variants` : null].filter(Boolean).join(' · ')
      out.push(`| ${list(r.content)} | ${r.action ? `\`${r.action}\` ${cell(r.name)}` : cell(r.name)} | ${cell(r.kind)} | ${r.engine} | ${cell(r.bar)} | ${cell(r.motion)} | ${bodies.map((b) => cell(r.bodies[b])).join(' | ')} | ${cell(extra || null)} |`)
    }
    out.push('')
  }
  return out.join('\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\//g, process.platform === 'win32' ? '\\' : '/')) {
  const inv = await movementInventory()
  const files = { 'movements.json': movementsJson(inv), 'movements.md': movementsMarkdown(inv) }
  const at = (f: string) => new URL(`../generated/${f}`, import.meta.url)
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([f, text]) => { try { return readFileSync(at(f), 'utf8') !== text } catch { return true } }).map(([f]) => f)
    if (stale.length) { console.error(`generated/${stale.join(', generated/')} stale — run: npx tsx tools/movements.mts`); process.exit(1) }
    console.log('generated/movements.json and movements.md are current')
  } else {
    for (const [f, text] of Object.entries(files)) writeFileSync(at(f), text)
    console.log(`wrote generated/movements.json and generated/movements.md — ${inv.counts.missing} of ${inv.counts.rows} movements missing`)
  }
}
