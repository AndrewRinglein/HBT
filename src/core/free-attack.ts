// Special free attacks — rule.free-attack-is-basic-attack (2026-10-04).
//
// Ruled 2026-09-28 (Andrew, DECISIONS.md 'counterattack, special free attacks, the opening six,
// shields, custom weapons'): "we're changing attack of opportunity, so it's using the same rules
// as everything else. No stamina, uses the basic attack." — "Special free attacks — counterattack,
// fend, the attack of opportunity — are one rule: the basic attack, no stamina, −20 Accuracy."
// Completed 2026-10-04 ('the basic attack is a weapon's first attack, and every free attack uses
// it without paying stamina'): "There's supposed to be a basic attack for each character … Most
// weapons have a basic attack … It is the first attack." — "If you have something that does not
// have a basic melee attack as its number 1 action, then you do not have a basic attack, and you
// use punch."
//
// This file is WHICH attack a free attack is. That it costs no Stamina and rolls at the ruled
// penalty is the attack function's `reaction` mode (pipeline.ts, action.ts spendAction). The core
// names no attack and no weapon: it reads the loadout and the rows' declared order.
import type { AttackDef, Ctx, Unit } from './types.js'
import { attacksOf, isAttack } from './action.js'
import { canAttack } from './pipeline.js'
import { unit } from './mutate.js'

const isMelee = (a: AttackDef): boolean => a.attack.kind === 'melee'
/**
 * The attacks a free attack is chosen among: the unit's attacks that do not walk. A charge — an
 * attack that moves before it strikes — is never a reaction (SWITCHES.md chargeNoReaction), so a
 * row that lists one first (a hound's closing bite) has its next attack as its first.
 */
const standingAttacksOf = (ctx: Ctx, u: Unit): AttackDef[] => attacksOf(ctx, u).filter((a) => a.move === undefined)

/** The attack ids the items a unit carries grant it — what is in its hands and what it wears (the stowed grant nothing). */
function carriedAttackIds(ctx: Ctx, u: Unit): Set<string> {
  const out = new Set<string>()
  for (const i of [...(u.loadout?.hands ?? []), ...(u.loadout?.worn ?? [])]) for (const a of ctx.items[i.itemId]?.grants ?? []) out.add(a)
  return out
}

/**
 * The unit's OWN melee attacks, in its declared order: the attacks no carried item grants — a hero
 * row's unarmed attack (Punch), a bestiary row's own attacks.
 */
export function ownMeleeAttacksOf(ctx: Ctx, u: Unit): AttackDef[] {
  const carried = carriedAttackIds(ctx, u)
  return standingAttacksOf(ctx, u).filter((a) => isMelee(a) && !carried.has(a.id))
}

/**
 * The unit's BASIC ATTACK, or null when it has none.
 *  - It holds a weapon: the first action that weapon's row lists, when that is a melee attack the
 *    unit has. The weapon is the main hand's — the first weapon in its hands, which is also the
 *    one held in two (SWITCHES.md basicAttackMainHand). A weapon whose first action is not a melee
 *    attack (a bow, a staff) gives NO basic attack.
 *  - It holds no weapon: its own first attack, when that is melee — Punch on a hero row, a
 *    bestiary row's first attack.
 */
export function basicAttackOf(ctx: Ctx, u: Unit): AttackDef | null {
  const weapon = (u.loadout?.hands ?? []).map((i) => ctx.items[i.itemId]).find((row) => row?.itemClass === 'weapon')
  if (weapon) {
    const first = ctx.actions[weapon.grants[0] ?? '']
    return first && isAttack(first) && isMelee(first) && standingAttacksOf(ctx, u).some((a) => a.id === first.id) ? first : null
  }
  const carried = carriedAttackIds(ctx, u)
  const own = standingAttacksOf(ctx, u).find((a) => !carried.has(a.id))
  return own && isMelee(own) ? own : null
}

/**
 * The attacks a special free attack may be, in the order they are tried: the basic attack, then
 * the unit's own melee attacks in its declared order ("you do not have a basic attack, and you use
 * punch"; a row that leads with a shot falls to its own first melee attack — SWITCHES.md
 * freeAttackRowLeadsWithShot). Never a weapon's second attack.
 */
export function freeAttackCandidates(ctx: Ctx, u: Unit): AttackDef[] {
  const basic = basicAttackOf(ctx, u)
  const own = ownMeleeAttacksOf(ctx, u)
  return basic ? [basic, ...own.filter((a) => a.id !== basic.id)] : own
}

/** The attack the unit's free attack is, legality aside: the first candidate, or null when it has none. */
export function freeAttackOf(ctx: Ctx, u: Unit): AttackDef | null {
  return freeAttackCandidates(ctx, u)[0] ?? null
}

/**
 * The holder's free attack on `targetId` right now — the first candidate that is LEGAL as a
 * reaction (canAttack: no Stamina asked, every other gate) — or why there is none: it has no
 * melee attack a free attack may be, or none of them is legal. The swing and the forecast of it
 * choose by this one function (Law 2). Pure.
 */
export function freeAttackChoice(ctx: Ctx, holderId: number, targetId: number): { attack: AttackDef } | { skipped: 'no melee attack' | 'not legal' } {
  const candidates = freeAttackCandidates(ctx, unit(ctx, holderId))
  if (candidates.length === 0) return { skipped: 'no melee attack' }
  const legal = candidates.find((a) => canAttack(ctx, holderId, targetId, a.id, 'reaction'))
  return legal ? { attack: legal } : { skipped: 'not legal' }
}
