/* ── WHAT AN ACTION ACTUALLY DOES — pure, content-only ─────────────────────
   Every field the engine models is surfaced in the engine's own words:
     moves   — shape (path / sidestep / flight), stepRange, budgetMod, riders
     attacks — area, status rider, crit bonus, critCount, damage type
     powers  — effect (damage / heal / selfGuard), area, range
   Split out of viewer-core.js 2026-09-02. */

import { MOD_UP, MOD_DOWN } from './theme.js'

/* Signed numbers go through ONE helper. Hardcoding '+' produced "crit +-5" on
   Punch, whose crit is genuinely negative (2026-09-01). */
export const sgn = n => (n > 0 ? '+' : '') + n
export const STATSHORT = { strength: 'STR', precision: 'PRE', magic: 'MAG', spirit: 'SPI',
  accuracy: 'ACC', dodge: 'DODGE', armor: 'ARMOR', resist: 'RESIST', movement: 'MOVE', reach: 'REACH' }

/* ── THE KIT (seam.items-per-unit, folded 2026-09-03) ──────────────────────
   A hero is fielded as the bare row plus the items the log says it wears
   (unit.equipped): the granted attacks come FIRST — the weapon in hand — then
   the row's own, the same order the engine builds (core/items.ts applyItems).
   D = V.data: the unit sheets (UD) and the attack/ability tables (AT, AB) the
   grants resolve against. Nothing is computed: ids are looked up. */
export function kitOf(u, D) {
  const d = (D.UD || {})[u && u.typeId] || {}
  const kit = (u && u.kit) || { grants: [], abilities: [] }
  const AT = D.AT || {}, AB = D.AB || {}
  const attacks = [], abilities = []
  for (const id of kit.grants) { const a = AT[id]; if (a) attacks.push({ id, ...a }) }
  for (const a of (d.attacks || [])) if (!attacks.some(x => x.id === a.id)) attacks.push(a)
  for (const id of kit.abilities) { const p = AB[id]; if (p) abilities.push({ id, ...p }) }
  for (const p of (d.abilities || [])) if (!abilities.some(x => x.id === p.id)) abilities.push(p)
  return { attacks, abilities, moves: d.moves || [] }
}

export function actionsOf(u, D) {
  if (!u) return []
  const k = kitOf(u, D)
  const rows = []
  for (const m of k.moves)     rows.push({ ...m, kind: 'move' })
  for (const a of k.attacks)   rows.push({ ...a, kind: a.kind || 'melee', isAttack: true })
  for (const p of k.abilities) rows.push({ ...p, kind: 'power', isPower: true })
  return rows
}

/* EXEMPTION stat-delta (tools/exemptions.json): the per-stat sum of the
   modifiers the log stated — statmod.added, and the kit's stat deltas from
   unit.equipped — printed as the stat's delta and added to the resting
   movement numeral. The engine emits each modifier, not the running total. */
export function modOf(u, stat) {
  return ((u && u.mods) || []).reduce((n, m) => n + (m.stat === stat ? (m.value || 0) : 0), 0)
}
/** the unit's movement at rest: the sheet's figure plus every movement
    modifier the log stated (an item's −1, a wound's −1). During an activation
    the engine's own `movePoints` / `movePointsLeft` outrank it. */
export function mvOf(u, D) {
  const base = ((D.UD || {})[u && u.typeId] || {}).movement
  if (base == null) return null
  return Math.max(0, base + modOf(u, 'movement'))
}

/* EXEMPTION move-range (tools/exemptions.json): a path or flight spends the
   unit's movement budget, which the power may modify — the sum is the
   viewer's until the sheet states the move's range. A sidestep is exact. */
export function moveHexes(a, u, D) {
  if (a.shape === 'sidestep') return a.stepRange == null ? 1 : a.stepRange
  const base = mvOf(u, D)
  if (base == null) return null
  return Math.max(0, base + (a.budgetMod || 0))
}

/* EXEMPTION dmg-fallback: the engine's own damageOnHit once this attack has
   been declared — it carries every live modifier — else the declare-time
   stat + bonus the ledger showed. The fallback duplicates engine math. */
export function dmgOf(a, u, D) {
  const live = u && u.dmgSeen ? u.dmgSeen[a.id] : undefined
  if (live != null) return { n: live, live: true }
  const statv = a.stat != null ? ((D.UD || {})[u && u.typeId] || {})[a.stat] : undefined
  if (statv != null) return { n: Math.max(0, statv + (a.bonus || 0)), live: false }
  return null
}

export function shortStatus(id, SN) {
  return SN[id] || String(id || '').replace(/^(test\.)?status\./, '')
}

export function effectTag(a, u, D, SN) {
  const bits = []
  if (a.kind === 'move') {
    /* "Move: 6", "Move: 1 · Ignore ZOC" (ruled 2026-09-01, Andrew's copy). The
       RNG cell prints the number; the tag keeps only the SHAPE. */
    const n = moveHexes(a, u, D)
    if (a.shape === 'sidestep') bits.push(n === 0 ? 'stands still' : 'Ignore ZOC')
    else if (a.shape === 'flight') bits.push('no steps')
    if (a.budgetMod) bits.push(sgn(a.budgetMod) + ' move')
    return bits.join(' · ')
  }
  if (a.area === 'arc')    bits.push('arc, no roll')
  if (a.area === 'blast1') bits.push('blast, no roll')
  if (a.effect === 'heal') bits.push('heals')
  if (a.effect === 'selfGuard') bits.push('protection, permanent stat cost')
  if (a.applies) bits.push(shortStatus(a.applies.statusId, SN) + ' ' + sgn(a.applies.value))
  if (a.crit) bits.push('crit ' + sgn(a.crit))
  if (a.critCount > 1) bits.push(a.critCount + ' criticals')
  if (a.damageType && !a.area) bits.push(a.damageType)
  return bits.join(' · ')
}

/* ── WHAT THIS ACTION TRIGGERS (ruled 2026-09-01) ─────────────────────────
   "You look at the attack, you see what it does, not somewhere else." The
   attack's own `applies` rider plus the unit's triggers on attack hooks;
   `onlyWithAttack` scopes a trigger to one attack. */
export const ATTACK_HOOKS = new Set(['onHit', 'onAttack', 'onDamage', 'onKill', 'onMiss', 'onCrit'])
export function triggersFor(u, a, D, SN, stStyle) {
  const UD = D.UD || {}
  const out = []
  if (a.kind === 'move') {
    /* a move's riders ARE the buff/debuff layer — same green/red as the stat block */
    for (const e of (a.effects || [])) {
      if (e.kind === 'gainStamina')        out.push({ word: 'Stamina ' + sgn(e.value), hue: MOD_UP, chance: 100 })
      else if (e.kind === 'loseMaxStamina') out.push({ word: 'Max Stam ' + sgn(-Math.abs(e.value)), hue: MOD_DOWN, chance: 100 })
      else if (e.kind === 'statMod')        out.push({ word: (STATSHORT[e.stat] || e.stat) + ' ' + sgn(e.value),
                                                        hue: e.value > 0 ? MOD_UP : MOD_DOWN, chance: 100 })
    }
    return out
  }
  if (a.applies) out.push({ word: shortStatus(a.applies.statusId, SN), val: a.applies.value,
                            hue: stStyle(a.applies.statusId).hue, chance: 100 })
  const d = UD[u.typeId] || {}
  for (const t of (d.triggers || [])) {
    if (!ATTACK_HOOKS.has(t.hook)) continue
    if (t.onlyWithAttack && t.onlyWithAttack !== a.id) continue
    const ef = t.effect || {}
    const word = ef.kind === 'status.apply' ? shortStatus(ef.statusId, SN)
               : ef.kind === 'damage' ? 'Damage' : ef.kind === 'knockback' ? 'Knockback'
               : ef.kind === 'heal' ? 'Heal' : (ef.kind || '')
    if (!word) continue
    /* "Poison 1, 20%" — the value wears the status colour, the odds stay grey */
    out.push({ word, val: ef.value ?? ef.amount, hue: ef.statusId ? stStyle(ef.statusId).hue : '#d6b25e',
               chance: t.chance == null ? 100 : t.chance })
  }
  return out
}
