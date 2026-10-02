// The Equip screen — GEAR-DESIGN.md §6, 7-KINGDOM-SETTLED.md 2026-09-02 (G11):
// heroes across the top with card art and red/green deltas from what they wear;
// per hero two hand slots, one armor slot, N item slots; below, the stash in six
// sections in this order: idols · Bloodrunes · relics · weapons · armor ·
// trinkets. Click an item then a slot — or drag it onto the slot — to equip;
// dropping on a full slot swaps and the old item bounces to the stash; costs
// show as items go on and refund while the screen is open; leaving lists the
// set bonuses. Shared by prep's Equip step and the roster's Fit-gear session.
//
// Renders from read-models (loadoutOf, heroModsOf, canEquip/whyNotEquip) and
// acts through slice.ts's wiring (data-act equip / unequip). No state of its
// own but the picked item, which is a view choice, not a Campaign fact.

import type { CampaignState } from '../core/campaign.js'
import { loadoutOf, canEquip, whyNotEquip, canUnequip, equipCostOf } from '../core/shop.js'
import { heroModsOf, type SetLine } from '../core/sets.js'
import { itemOf, isShield, type ItemRow } from '../content/items.js'
import { fieldedItemsOf } from '../core/loadout.js'
import { fieldedPreviewOf } from '../core/seam.js'
import type { UnitDef } from '../engine.js'
import { portraitIdOf, portraitOf } from './art.js'
import { statLabelOf } from '../content/stat-labels.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** The six sections, in the ruled order. A class the codex still carries but the order does not name (consumable) falls to the end. */
export const SECTIONS: readonly { itemClass: ItemRow['itemClass']; title: string }[] = [
  { itemClass: 'idol', title: 'Idols' },
  { itemClass: 'bloodrune', title: 'Bloodrunes' },
  { itemClass: 'relic', title: 'Relics' },
  { itemClass: 'weapon', title: 'Weapons' },
  { itemClass: 'armor', title: 'Armor' },
  { itemClass: 'trinket', title: 'Trinkets' },
]

const fmtCost = (cost: Readonly<Record<string, number>>): string => Object.entries(cost).map(([cur, n]) => `${n} ${cur.replace('currency.', '')}`).join(', ')
const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`

/** "chain set bonus from Chains of the Wrathful: +2 precision (2 other chain items)". */
export function setLineOf(l: SetLine): string {
  const paid = [...Object.entries(l.stats).map(([k, n]) => `${sign(n)} ${statLabelOf(k).toLowerCase()}`), ...(l.attackDamage ? [`${sign(l.attackDamage)} damage on this weapon`] : [])].join(', ')
  return `${l.tag} set bonus from ${itemOf(l.itemId).name}: ${paid} (${l.count} ${l.shape === 'per-other' ? `other ${l.tag} item${l.count === 1 ? '' : 's'}` : `${l.tag} items worn`})`
}

/** The red/green deltas one hero's gear makes — items and sets together. */
export function deltasOf(c: CampaignState, heroId: string): string {
  const m = heroModsOf(c, heroId)
  const stat = (k: string, n: number) => `<span class="delta ${n > 0 ? 'won' : 'lost'}">${sign(n)} ${esc(statLabelOf(k).toLowerCase())}</span>`
  const parts = [...Object.entries(m.total).map(([k, n]) => stat(k, n)), ...Object.entries(m.weapons).map(([id, n]) => stat(`damage · ${itemOf(id).name}`, n))]
  return parts.join(' ') || '<span class="meta">no change from gear</span>'
}

/**
 * The stat block, the battle viewer's (viewer/src/panel.js): two columns, label left,
 * the value right in monospace with a small ± in front when gear or a set moved it,
 * % on Accuracy, Dodge and Crit. The numbers are the ENGINE's own fielded unit —
 * fieldedPreview over what the battle is handed (items, progress, badges, the set
 * bonuses as unit mods; seam.ts fieldedPreviewOf) — so the card shows what the battle
 * fields, and the ± is gear and sets against the same hero bare. A row the engine has
 * no item for is said, not hidden. (kingdom.reads-engine, review K3 and K11: the card
 * kept its own stat map and added the sets itself, which the battle never fought.)
 */
export const STAT_ROWS: readonly [label: string, key: keyof UnitDef & string][] = [
  ['Move', 'movement'], ['Armor', 'armor'], ['Resist', 'resist'], ['Dodge', 'dodge'], ['Max HP', 'maxHp'],
  ['Accuracy', 'accuracy'], ['Crit', 'crit'], ['Strength', 'strength'], ['Precision', 'precision'], ['Stam Regen', 'staminaRegen'],
  // v2.thorns (engine 88064ac, 2026-09-24): Thorns is a folded stat now, so the card shows it
  ['Thorns', 'thorns'],
]
const PCT = new Set(['accuracy', 'dodge', 'crit'])

export function statBlock(c: CampaignState, heroId: string): string {
  const h = c.roster[heroId]!
  const { stowed } = fieldedItemsOf(h.equipped)
  let now: UnitDef, bare: UnitDef
  try { ({ now, bare } = fieldedPreviewOf(h)) }
  catch (e) { return `<div class="stats gap"><b>the engine cannot field this gear</b> — ${esc((e as Error).message)}</div>` }
  const rows = STAT_ROWS.map(([label, key]) => {
    const base = (bare[key] as number | undefined) ?? 0
    const value = (now[key] as number | undefined) ?? 0
    const d = value - base
    return `<div class="stRow"><span class="stN">${esc(label)}</span><span class="stV${d > 0 ? ' up' : d < 0 ? ' down' : ''}">${d ? `<em>${sign(d)}</em>` : ''}${value}${PCT.has(key) ? '%' : ''}</span></div>`
  })
  const half = Math.ceil(rows.length / 2)
  return `<div class="stats"><div class="stCols"><div>${rows.slice(0, half).join('')}</div><div>${rows.slice(half).join('')}</div></div>${stowed.length ? `<div class="meta">${esc(stowed.map((i) => itemOf(i).name).join(', '))} stowed — carried into battle, grants nothing until swapped into a hand</div>` : ''}</div>`
}

/** What leaving says: every triggered set per hero, or that none is. */
export function setSummary(c: CampaignState, heroIds: readonly string[]): string {
  const rows = heroIds.map((h) => ({ h, lines: heroModsOf(c, h).lines })).filter((r) => r.lines.length)
  return `<div class="card setline"><b>Set bonuses when you leave</b> ${rows.length
    ? `<table>${rows.map((r) => `<tr><td>${esc(c.roster[r.h]!.name)}</td><td class="meta">${r.lines.map((l) => esc(setLineOf(l))).join('<br>')}</td></tr>`).join('')}</table>`
    : '<span class="meta">none — a set pays when its members are worn together</span>'}</div>`
}

/**
 * Which worn item a stash item would displace on this hero if dropped where it
 * belongs: the armor for an armor; the hand slot chosen for a hand item; the same
 * class for a capped class (idol, Bloodrune, relic). Null = it fits beside.
 */
export function displaceFor(c: CampaignState, heroId: string, itemId: string, slot: string): string | undefined {
  const l = loadoutOf(c, heroId)
  const row = itemOf(itemId)
  if (canEquip(c, heroId, itemId)) return undefined
  if (slot === 'armor') return l.armor ?? undefined
  if (slot === 'hand-r') return l.hands[0]
  if (slot === 'hand-l') return l.hands[1] ?? l.hands[0]
  if (slot.startsWith('item-')) {
    const at = Number(slot.slice(5))
    const there = l.items[at]
    if (there) return there
  }
  const same = c.roster[heroId]!.equipped.filter((id) => itemOf(id).itemClass === row.itemClass && !isShield(itemOf(id)) === !isShield(row))
  return same.find((d) => canEquip(c, heroId, itemId, d))
}

export type EquipScreenOptions = { where: 'prep' | 'roster'; picked: string | null }

/**
 * The Equip screen, whole — ruled 2026-09-04 (Angela): "we need an equip screen. It's
 * reachable from the main kingdom map, and it automatically pops up before a battle,
 * after war council" · "Deploy is before equip. Because deploy tells you what heroes
 * you're equipping so it goes: council, deploy, equip."
 *
 * So it is its own screen with its own head and its own way out — at prep it is what the
 * cursor's Equip step shows (opened by itself once Deploy is done, and the way out is To
 * the battle); from the map it is the roster's Fit-gear session over every living hero,
 * and the way out is Done. The panel below (equipScreen) is the same in both.
 */
export function equipPage(c: CampaignState, heroIds: readonly string[], o: EquipScreenOptions & { engagementId?: string; canAdvance?: boolean }): string {
  const prep = o.where === 'prep'
  return `<div class="equip-page">
    <div class="bar"><h2 style="margin:0;border:0;padding:0">Equip${prep ? ' — the heroes you are sending' : ' — fitting gear'}</h2>
      <span class="meta">${prep ? esc(o.engagementId ?? '') + ' · what goes on now goes into the battle' : 'between battles · idols are fitted at prep only, when the battle is about to happen'}</span>
      <span class="sp"></span>
      <button class="primary" data-act="${prep ? 'advance' : 'close-equip'}"${prep && o.canAdvance === false ? ' disabled' : ''}>${prep ? 'To the battle →' : 'Done — keep it'}</button>
    </div>
    ${heroIds.length ? equipScreen(c, heroIds, o) : '<div class="card"><p class="meta">nobody to equip — deploy someone first</p></div>'}
  </div>`
}

export function equipScreen(c: CampaignState, heroIds: readonly string[], o: EquipScreenOptions): string {
  const picked = o.picked && c.stash.includes(o.picked) ? o.picked : null
  const heroes = heroIds.map((h) => heroCard(c, h, picked)).join('')
  const stash = stashSections(c, heroIds, picked)
  const paid = c.cursor.equipSession?.paid ?? []
  return `<div class="equip">
    <div class="heroes">${heroes}</div>
    <p class="meta">${picked ? `<b>${esc(itemOf(picked).name)}</b> in hand — click a slot to put it on (a full slot swaps; the old item goes back to the stash), or drag it there. Click it again to put it down.` : 'Click an item below, then a slot — or drag it onto the slot. × takes an item off, into the stash.'}${o.where === 'roster' ? ' Idols are fitted at prep only.' : ''}</p>
    ${stash}
    ${paid.length ? `<p class="meta">Paid this session — refunded if it comes off before you leave: ${paid.map((p) => `${esc(itemOf(p.itemId).name)} on ${esc(c.roster[p.heroId]?.name ?? p.heroId)} (${esc(fmtCost(p.cost))})`).join(' · ')}</p>` : ''}
    ${setSummary(c, heroIds)}
  </div>`
}

function heroCard(c: CampaignState, heroId: string, picked: string | null): string {
  const h = c.roster[heroId]!
  const l = loadoutOf(c, heroId)
  const art = portraitOf(portraitIdOf(h))
  const off = (id: string) => canUnequip(c, heroId, id) ? `<button class="quiet x" data-act="unequip" data-id="${esc(heroId)}" data-item="${esc(id)}" title="off, into the stash">×</button>` : ''
  const slot = (key: string, label: string, id: string | null, note = '') => {
    const drop = picked ? displaceFor(c, heroId, picked, key) : undefined
    const ok = picked ? canEquip(c, heroId, picked, drop) : false
    const why = picked && !ok ? whyNotEquip(c, heroId, picked, drop) ?? '' : ''
    const attrs = `data-slot="${esc(key)}" data-hero="${esc(heroId)}"${drop ? ` data-displace="${esc(drop)}"` : ''}${picked ? ` data-act="drop" data-item="${esc(picked)}" data-id="${esc(heroId)}"` : ''}`
    return `<div class="slot${id ? ' full' : ''}${picked ? (ok ? ' can' : ' cant') : ''}" ${attrs} title="${esc(why || (drop ? `swap out ${itemOf(drop).name}` : label))}">
      <span class="k">${esc(label)}${note ? ` <i>${esc(note)}</i>` : ''}</span>
      ${id ? `<span class="v">${esc(itemOf(id).name)}${off(id)}</span>` : '<span class="v meta">—</span>'}
    </div>`
  }
  const twoHander = l.hands.length === 1 && Math.max(1, itemOf(l.hands[0]!).hands) === 2
  const hands = twoHander
    ? slot('hand-r', 'both hands', l.hands[0]!)
    : slot('hand-r', 'right hand', l.hands[0] ?? null) + slot('hand-l', 'left hand', l.hands[1] ?? null)
  const items = Array.from({ length: Math.max(l.itemSlots.max, l.items.length) }, (_, i) => slot(`item-${i}`, `slot ${i + 1}`, l.items[i] ?? null, l.items[i] && itemOf(l.items[i]!).itemClass === 'weapon' ? 'spare' : ''))
  return `<div class="herocard">
    ${statBlock(c, heroId)}
    <div class="art">${art ? `<img src="${art}" alt="">` : '<div class="noart"></div>'}<div class="plate"><b>${esc(h.name)}</b><span>${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · L${h.level}${h.specialty ? ' · ' + esc(h.specialty.replace('specialty.', '')) : ''}</span></div></div>
    <div class="slots">${hands}${slot('armor', 'armor', l.armor)}${items.join('')}</div>
  </div>`
}

function stashSections(c: CampaignState, heroIds: readonly string[], picked: string | null): string {
  const classes = [...SECTIONS.map((s) => s.itemClass), ...[...new Set(c.stash.map((id) => itemOf(id).itemClass))].filter((k) => !SECTIONS.some((s) => s.itemClass === k))]
  const sections = classes.map((cls) => {
    const title = SECTIONS.find((s) => s.itemClass === cls)?.title ?? cls
    const ids = c.stash.filter((id) => itemOf(id).itemClass === cls)
    if (!ids.length) return `<div class="section"><h3>${esc(title)}</h3><p class="meta">none in the stash</p></div>`
    return `<div class="section"><h3>${esc(title)}</h3><div class="items">${ids.map((id) => {
      const row = itemOf(id)
      const cost = fmtCost(equipCostOf(id))
      const fits = heroIds.filter((h) => canEquip(c, h, id) || c.roster[h]!.equipped.some((d) => canEquip(c, h, id, d)))
      return `<div class="item${picked === id ? ' picked' : ''}${fits.length ? '' : ' nofit'}" draggable="true" data-act="pick" data-id="${esc(id)}" title="${esc(fits.length ? `fits ${fits.map((h) => c.roster[h]!.name).join(', ')}` : heroIds.map((h) => whyNotEquip(c, h, id) ?? '').filter(Boolean)[0] ?? 'nobody can wear it')}">
        <b>${esc(row.name)}</b>
        <small>${esc([`tier ${row.tier}`, row.itemClass === 'weapon' ? (isShield(row) ? 'shield' : `${Math.max(1, row.hands)}-hand`) : null, row.classRestriction ? row.classRestriction.replace('class.', '') + ' only' : null, row.uses ? `${row.uses} use` : null, cost ? `${cost} to equip` : null, Object.entries(row.statModifiers).map(([k, n]) => `${sign(n)} ${k}`).join(' ') || null, row.setBonus ? `${row.setBonus.tag} set` : null, row.sets.length && !row.setBonus ? row.sets.join('/') + ' set' : null].filter(Boolean).join(' · '))}</small>
      </div>`
    }).join('')}</div></div>`
  })
  return `<div class="stash">${sections.join('')}${c.stash.length ? '' : '<p class="meta">the stash is empty — the Forge\'s shelf, the spoils, and anything taken off fill it</p>'}</div>`
}
