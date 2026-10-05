// An item's card — its CONTENT, as plain data. kingdom.equip-item-card (2026-10-05).
//
// Ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post: notices, target lines, item cards, …'): "When you're selecting
// items in the equipment phase, you need to be able to look at your items somehow. You need to be able to click on them, and
// then they pop up somewhere on the screen, to the right or somewhere, as a card with a description."
//
// ONE FUNCTION OVER THE ITEM DATA — itemCardOf(itemId) — for every screen that shows an item's card: Equip, the reward
// screen, and the battle screen after them (viewer.item-card-in-battle). What comes back is plain data (strings, numbers,
// lists; it survives JSON whole), so a screen in another package can be handed it as it is handed every other table. No
// screen composes an item's words itself.
//
// WHERE EACH PART COMES FROM
//   what it is and gives   the item's row (src/content/items.ts — the engine's compiled row joined to the campaign's fields):
//                          name, class, tier, hands, restriction, uses, set, and each stat it gives while equipped, worded by
//                          the one label table (src/content/stat-labels.ts).
//   what it grants         each attack and power on the row, by the ENGINE's own action row for the numbers — the stat and
//                          bonus, the damage type, the reach, the Stamina, Crit, Accuracy, hits — so a Forge row's attack shows
//                          what THAT row fields; and by the CODEX's words for what it does: its triggers ("On attack: gain 1
//                          Protection"), a power's description, and its line (src/content/generated/item-words.ts, made by
//                          tools/mk-item-words.mjs — never typed here).
//   a line of what it is   the Codex's line for the item; a Forge row says its base's, and names the attribute it carries with
//                          the attribute's own line and triggers.

import { itemOf, isShield, type ItemRow } from './items.js'
import { statLabelOf } from './stat-labels.js'
import { ITEM_WORDS, ATTRIBUTE_WORDS, GRANT_WORDS, type TriggerWords, type AttackWords, type PowerWords } from './generated/item-words.js'
import { ACTIONS, isAttack } from '../engine.js'

export type ItemCardGrant = {
  readonly id: string
  readonly name: string
  readonly kind: 'attack' | 'power'
  /** What it does, a line per fact: the numbers the battle fields, then each trigger, a power's description, its line. */
  readonly lines: readonly string[]
}
export type ItemCard = {
  readonly id: string
  readonly name: string
  /** Its kind in a word: Weapon, Shield, Armor, Trinket, Idol, Bloodrune, Relic. */
  readonly kind: string
  readonly tier: number
  /** Short facts beside the kind: its hands, who may carry it, its uses a battle, its set. */
  readonly facts: readonly string[]
  /** What it gives while equipped: each stat, the amount, and the words ("+5 Block"). */
  readonly gives: readonly { readonly stat: string; readonly amount: number; readonly words: string }[]
  /** The item's own triggers, in the Codex's words. */
  readonly lines: readonly string[]
  /** Each attack and power it grants. */
  readonly grants: readonly ItemCardGrant[]
  /** The attribute a Forge row carries — its name, its line and its triggers — or null. */
  readonly attribute: { readonly id: string; readonly name: string; readonly lines: readonly string[] } | null
  /** One line of what it is — the Codex's. */
  readonly line: string
}

const ITEM_BY_ID = new Map(ITEM_WORDS.map((r) => [r.id, r]))
const ATTRIBUTE_BY_ID = new Map(ATTRIBUTE_WORDS.map((r) => [r.id, r]))
const GRANT_BY_ID = new Map<string, AttackWords | PowerWords>(GRANT_WORDS.map((r) => [r.id, r]))

const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * When a trigger fires, in words. The first twelve are the battle screen's own (viewer src/actions.js HOOK_WORD), word for
 * word — test/equip-item-card.test.ts holds them equal, so the card and the action bar say one thing. The last three are
 * hooks the Codex names and that table does not (kingdom SWITCHES.md itemCardHookWords).
 */
export const HOOK_WORDS: Readonly<Record<string, string>> = {
  onHit: 'On hit', onAttack: 'On attack', onDamage: 'On damage', onKill: 'On kill', onMiss: 'On miss', onCrit: 'On crit', onBlock: 'On block',
  onTakingDamage: 'When hit', onDeath: 'On death', onBurst: 'On burst', startOfBattle: 'At the start of the battle', onActivationEnd: 'At the end of its Activation',
  onDodge: 'On dodge', aura: 'Aura', passive: 'Always',
}
/** "On attack: gain 1 Protection" — the hook in words, the Codex's own sentence, the chance when it is not certain. */
const triggerLine = (t: TriggerWords): string => `${HOOK_WORDS[t.hook] ?? cap(t.hook)}${t.chance !== undefined ? ` (${t.chance}%)` : ''}: ${t.effect}`

/**
 * The Codex's words for a granted action: its own row; or, for a Forge row's action (the engine names it for the attribute:
 * attack.dagger.stab.keen), the words of the action it was made from. Undefined when the Codex has no row for either.
 */
function wordsOf(actionId: string, row: ItemRow): AttackWords | PowerWords | undefined {
  const own = GRANT_BY_ID.get(actionId)
  if (own || row.base === null) return own
  for (let id = actionId; id.includes('.'); id = id.slice(0, id.lastIndexOf('.'))) { const w = GRANT_BY_ID.get(id); if (w) return w }
  return undefined
}

/** What the battle fields for an attack, from the engine's own row: "Strength -1 physical damage · melee · 0 Stamina · +5 Crit". */
function attackFacts(a: Readonly<Record<string, unknown>>): string {
  // the action's own Stamina and range; its attack profile's stat, bonus, type, Crit, Accuracy and hits (the engine's ActionDef)
  const p = (a['attack'] ?? {}) as Readonly<Record<string, unknown>>
  const of = (o: Readonly<Record<string, unknown>>, k: string) => (typeof o[k] === 'number' ? (o[k] as number) : 0)
  const stat = typeof p['stat'] === 'string' ? statLabelOf(p['stat'] as string) : ''
  const damage = [stat, of(p, 'bonus') ? sign(of(p, 'bonus')) : '', typeof p['damageType'] === 'string' ? p['damageType'] : '', 'damage'].filter(Boolean).join(' ')
  const reach = p['kind'] === 'melee' && of(a, 'range') <= 1 ? 'melee' : `reach ${of(a, 'range')}`
  return [damage, reach, of(p, 'hits') > 1 ? `${of(p, 'hits')} hits` : '', `${of(a, 'staminaCost')} Stamina`, of(p, 'crit') ? `${sign(of(p, 'crit'))} Crit` : '', of(p, 'accuracy') ? `${sign(of(p, 'accuracy'))} Accuracy` : ''].filter(Boolean).join(' · ')
}
/** What the battle fields for a power: its Stamina, its cooldown, whether it is free. */
function powerFacts(a: Readonly<Record<string, unknown>>): string {
  const num = (k: string) => (typeof a[k] === 'number' ? (a[k] as number) : 0)
  return [`${num('staminaCost')} Stamina`, num('cooldown') ? `cooldown ${num('cooldown')}` : '', a['free'] === true ? 'free' : ''].filter(Boolean).join(' · ')
}

function grantOf(actionId: string, row: ItemRow): ItemCardGrant | null {
  const a = (ACTIONS as Readonly<Record<string, unknown>>)[actionId] as (Readonly<Record<string, unknown>> & { name: string }) | undefined
  if (!a) return null   // a granted id whose row is absent is content never authored (the engine's kill-switch seam): nothing to show
  const kind: ItemCardGrant['kind'] = isAttack(a as never) ? 'attack' : 'power'
  const w = wordsOf(actionId, row)
  const lines = [
    kind === 'attack' ? attackFacts(a) : powerFacts(a),
    ...(w?.triggers ?? []).map(triggerLine),
    ...(w && w.kind === 'power' && w.description ? [w.description] : []),
    ...(w?.line ? [w.line] : []),
  ].filter(Boolean)
  return { id: actionId, name: a.name, kind, lines }
}

/** The item's kind in a word — its class as the content names it; a shield is a Shield whatever class its row is. */
const kindOf = (row: ItemRow): string => (isShield(row) ? 'Shield' : cap(row.itemClass))

/** The card for an item — every part of it, as plain data. Refuses an unknown item loudly (itemOf). Pure. */
export function itemCardOf(itemId: string): ItemCard {
  const row = itemOf(itemId)
  const own = ITEM_BY_ID.get(row.id) ?? (row.base ? ITEM_BY_ID.get(row.base) : undefined)
  const attribute = row.enchant ? ATTRIBUTE_BY_ID.get(row.enchant) : undefined
  const held = row.itemClass === 'weapon' || isShield(row)
  const facts = [
    held ? `${Math.max(1, row.hands)}-hand` : null,
    row.classRestriction ? `${row.classRestriction.replace('class.', '')} only` : null,
    row.uses ? `${row.uses} use${row.uses === 1 ? '' : 's'} a battle` : null,
    row.setBonus ? `${row.setBonus.tag} set` : row.sets.length ? `${row.sets.join('/')} set` : null,
  ].filter((x): x is string => x !== null)
  return {
    id: row.id, name: row.name, kind: kindOf(row), tier: row.tier, facts,
    gives: Object.entries(row.statModifiers).map(([stat, amount]) => ({ stat, amount, words: `${sign(amount)} ${statLabelOf(stat)}` })),
    lines: (own?.triggers ?? []).map(triggerLine),
    grants: row.grants.map((g) => grantOf(g, row)).filter((g): g is ItemCardGrant => g !== null),
    attribute: row.enchant ? { id: row.enchant, name: attribute?.name ?? row.enchant.replace('enchant.', ''), lines: [...(attribute?.line ? [attribute.line] : []), ...(attribute?.triggers ?? []).map(triggerLine)] } : null,
    line: own?.line ?? '',
  }
}
