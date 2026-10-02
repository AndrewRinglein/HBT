// v2.swap — the loadout swap. COMBAT-V2-DESIGN-2026-09-07 §11.2 (ruled 2026-09-07):
//
//   "One swap per activation. Only before the primary action … a swap may happen
//    before the move or after it … Costs stamina. `swapCost` is a stat, default 1,
//    and it is foldable … A Surge reopens everything, the swap included. Enemies do
//    not swap loadouts."
//
// A swap names the instances the hero will hold afterwards; everything else it
// carries is stowed. The hands are re-folded by difference: what leaves takes its
// stat modifiers, attacks, powers and triggers with it, what arrives brings its
// own — the same rows applyItems folds at fielding, so the swapped hero is the
// hero that would have been fielded holding those items (SWITCHES.md 'V2 swap'
// names the three places it is not: current Health, cooldowns, the AI mode).
//
// ONE legality function, canSwap: the command boundary and every caller read it.
// ONE mutator, performSwap: it spends the stamina and emits loadout.swapped, then
// one unit.equipped per instance that came into a hand (§15.2).
import { emit, spendStamina } from './mutate.js'
import { effective } from './stats.js'
import { isBlocked } from './status.js'
import { FOLDABLE, HANDS, HELD_CLASSES, handsOf, instanceUsesLeft, unfoldedOf } from './items.js'
import type { Ctx, ItemDef, ItemInstance, Unit } from './types.js'
import type { Trigger } from './trigger.js'

/** What the swap costs this unit now — the swapCost stat, never below 0. */
export function swapCostOf(ctx: Ctx, u: Unit): number {
  return Math.max(0, effective(ctx, u, 'swapCost').value)
}

/**
 * Why this swap is illegal, or null when it is legal. `hands` is the list of
 * instanceIds the unit will hold afterwards, in hand order (first = right hand).
 */
export function canSwap(ctx: Ctx, actor: number, hands: readonly string[]): string | null {
  const u = ctx.state.units[actor]
  if (!u) return 'no such unit'
  if (u.side === 'enemy') return 'enemies do not swap loadouts'
  if (ctx.state.outcome) return 'the battle is over'
  if (u.lifeState !== 'standing' || isBlocked(ctx, u)) return 'the unit cannot act'
  if (!u.loadout) return 'the unit carries no loadout'
  if (u.primaryUsed) return 'the primary action is spent — the swap comes before it'
  if (u.swapUsed) return 'the swap of this activation is spent'
  if (!Array.isArray(hands) || hands.some((h) => typeof h !== 'string')) return 'malformed hands'
  if (new Set(hands).size !== hands.length) return 'the same instance twice'
  const carried = [...u.loadout.hands, ...u.loadout.stowed]
  let used = 0
  for (const id of hands) {
    const inst = carried.find((i) => i.instanceId === id)
    if (!inst) return `the unit does not carry '${id}'`
    const row = ctx.items[inst.itemId]
    if (!row || !HELD_CLASSES.includes(row.itemClass)) return `'${id}' is not a weapon or shield`
    used += handsOf(row)
  }
  if (used > HANDS) return 'more than two hands of weapons and shields'
  const now = u.loadout.hands.map((i) => i.instanceId)
  if (now.length === hands.length && now.every((id, k) => id === hands[k])) return 'nothing changes'
  if (u.stamina < swapCostOf(ctx, u)) return 'not enough stamina'
  return null
}

/** Add or take away one item's stat modifiers on the unit's own fields — the fields applyItems writes. */
function fold(u: Unit, row: ItemDef, sign: 1 | -1): void {
  const rec = u as unknown as Record<string, number | undefined>
  for (const [k, v] of Object.entries(row.statModifiers)) {
    if (typeof v !== 'number' || v === 0) continue
    // the fold applyItems makes (foldStats), read the same way — a stat the engine cannot fold is refused at load
    if (!(FOLDABLE as readonly string[]).includes(k)) throw new Error(`swap: '${row.id}' modifies '${k}', which the engine cannot fold`)
    const unset = unfoldedOf(k)
    const next = (rec[k] ?? unset) + sign * v
    // an optional field absent at fielding stays absent while it holds its unfolded value
    if (rec[k] === undefined && next === unset) continue
    rec[k] = next
  }
}

/** Resolve the swap. Throws when canSwap would refuse (Law 9) — callers ask first. */
export function performSwap(ctx: Ctx, actor: number, hands: readonly string[]): void {
  const why = canSwap(ctx, actor, hands)
  if (why) throw new Error(`unit ${actor} cannot swap to [${hands.join(', ')}]: ${why}`)
  const u = ctx.state.units[actor]!
  const lo = u.loadout!
  const carried = [...lo.hands, ...lo.stowed]
  const before = lo.hands.map((i) => ({ ...i }))
  const after: ItemInstance[] = hands.map((id) => ({ ...carried.find((i) => i.instanceId === id)! }))
  const leaving = before.filter((i) => !hands.includes(i.instanceId))
  const arriving = after.filter((i) => !before.some((b) => b.instanceId === i.instanceId))
  const cost = swapCostOf(ctx, u)
  spendStamina(ctx, actor, cost, 'engine')
  // v2.item-uses: a power an item instance pays for is counted by instance — the row's own
  // share is what the count holds beyond the instances in reach before the swap
  const counted = [...new Set((u.itemUses ?? []).map((e) => e.actionId))]
  const ownShare = Object.fromEntries(counted.map((a) => [a, (u.usesLeft[a] ?? 0) - instanceUsesLeft(ctx.items, u, a)]))

  // stats, by difference
  for (const i of leaving) fold(u, ctx.items[i.itemId]!, -1)
  for (const i of arriving) fold(u, ctx.items[i.itemId]!, 1)
  // a lower maximum clamps; a higher one does not heal (SWITCHES.md swapHealthClamp)
  if (u.hp > u.maxHp) u.hp = u.maxHp
  if (u.stamina > u.maxStamina) u.stamina = u.maxStamina

  // actions: the hands' grants, the row's attacks, the hands' powers, then everything
  // else the unit holds — the order applyItems + makeUnit give at fielding (Law 6)
  const provided = (list: readonly ItemInstance[]) => {
    const attacks: string[] = [], powers: string[] = []
    for (const i of list) {
      const row = ctx.items[i.itemId]!
      for (const a of row.grants) if (!attacks.includes(a)) attacks.push(a)
      for (const a of row.abilities) if (!powers.includes(a)) powers.push(a)
    }
    return { attacks, powers }
  }
  const was = provided(before), now = provided(after)
  const rest = u.actions.filter((a) => !was.attacks.includes(a) && !was.powers.includes(a) && !now.attacks.includes(a) && !now.powers.includes(a))
  // the row's own attacks sit after the hands' grants and before any power, as makeUnit lays them out
  const attackish = (a: string) => { const d = ctx.actions[a]; return !!d && (d.attack !== undefined || d.burst !== undefined) }
  u.actions = [...now.attacks, ...rest.filter(attackish), ...now.powers.filter((a) => !now.attacks.includes(a)), ...rest.filter((a) => !attackish(a))]
  // limits: a power newly in hand is seeded with its uses once; one that was held before keeps its count and its cooldown
  for (const a of [...now.attacks, ...now.powers]) {
    const n = ctx.actions[a]?.uses
    if (n && u.usesLeft[a] === undefined && !counted.includes(a)) u.usesLeft[a] = n
  }

  // triggers: one copy per leaving instance goes, one copy per arriving instance comes (no dedup, trigger.ts §5)
  let triggers: Trigger[] = [...u.triggers]
  for (const i of leaving) {
    for (const t of ctx.items[i.itemId]!.triggers) {
      const k = triggers.findIndex((x) => x.id === t.id && x.source === t.source)
      if (k >= 0) triggers = [...triggers.slice(0, k), ...triggers.slice(k + 1)]
    }
  }
  for (const i of arriving) triggers.push(...ctx.items[i.itemId]!.triggers.map((t) => Object.freeze({ ...t })))
  u.triggers = triggers

  lo.hands = after
  lo.stowed = carried.filter((i) => !hands.includes(i.instanceId)).map((i) => ({ ...i }))
  u.swapUsed = true
  // v2.item-uses (swapLimits, ruled): each instance keeps its own count through the swap;
  // the power's count is the row's share plus what the instances now in hand can pay
  for (const a of counted) {
    const n = ownShare[a]! + instanceUsesLeft(ctx.items, u, a)
    if (n > 0 || u.actions.includes(a)) u.usesLeft[a] = n; else delete u.usesLeft[a]
  }

  emit(ctx, 'loadout.swapped', 'engine', { actor, handsBefore: before, handsAfter: after.map((i) => ({ ...i })), stamina: cost })
  for (const i of arriving) {
    const row = ctx.items[i.itemId]!
    const mods: Record<string, number> = {}
    for (const [k, v] of Object.entries(row.statModifiers)) if (typeof v === 'number') mods[k] = v
    emit(ctx, 'unit.equipped', i.itemId, { actor, itemId: i.itemId, instanceId: i.instanceId, grants: [...row.grants], abilities: [...row.abilities], mods })
  }
}
