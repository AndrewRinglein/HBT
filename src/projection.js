/* ── THE HEALTH-BAR PROJECTION (UI-BUILD-NOTES §2) — pure ──────────────────
   Where will this unit's health be at the start of the player's next turn?
   Implements the engine's OWN tick rules, read out of src/core/status.ts and
   src/content/statuses.ts on 2026-09-01:
     · poison ticks its VALUE as magic  → max(0, value − resist)
     · burn   ticks its VALUE as magic  → max(0, value − resist), and halves healing
     · bleed  ticks a FLAT 2 as true    → resist never touches it
     · regeneration heals its VALUE     → halved while burn is held
     · protection absorbs before health, and is spent doing it
   EXEMPTION tick-projection (tools/exemptions.json): this is a RULE and the
   viewer must not own it — it becomes an engine event, plan §8.3. */
import { PROJ_TINT } from './theme.js'

export function projectTick(u, UD) {
  const st = u.st || {}, d = UD[u.typeId] || {}
  const resist = d.resist || 0
  const burn = st['status.burn'] || 0, poison = st['status.poison'] || 0
  const bleed = (st['status.bleed'] || 0) > 0 ? 2 : 0
  const regen = st['status.regeneration'] || 0
  const dmgBurn = Math.max(0, burn - resist), dmgPois = Math.max(0, poison - resist)
  const damage = dmgBurn + dmgPois + bleed
  const heal = burn > 0 ? Math.floor(regen / 2) : regen
  const pool = (st['status.protection'] || 0) + (st['test.status.ward'] || 0)
  const absorbed = Math.min(pool, damage)
  const net = (damage - absorbed) - heal                 // + = loss, − = gain
  let tint = PROJ_TINT.heal
  if (damage > 0) { const top = Math.max(dmgBurn, dmgPois, bleed)
    tint = top === dmgBurn && dmgBurn > 0 ? PROJ_TINT.burn
         : top === dmgPois && dmgPois > 0 ? PROJ_TINT.poison : PROJ_TINT.bleed }
  return { net, absorbed, pool, tint, lethal: net > 0 && net >= u.hp }
}

/* ── DANGER MARKER (UI-BUILD-NOTES §1) ─────────────────────────────────────
   The signature damage is AUTHORED per bestiary entry — a stable, learnable
   rating. Content has no field for it yet, so zombies are hardcoded (ruled
   2026-09-01); it moves to the bestiary row the moment one exists. Heroes
   carry one too: the first attack — the weapon in hand — live damageOnHit
   once shown, else stat + bonus.
   EXEMPTION danger (tools/exemptions.json): the stat + bonus fallback. */
export const DANGER_AUTHORED = {
  'unit.zombie': { n: 3, kind: 'melee' }, 'unit.fast-zombie': { n: 3, kind: 'melee' },
  'test-zombie': { n: 3, kind: 'melee' }, 'test-zombie-burning': { n: 3, kind: 'melee' },
}
export function dangerOf(u, UD) {
  const A = DANGER_AUTHORED[u.typeId]; if (A) return A
  const d = UD[u.typeId] || {}; const a = (d.attacks || [])[0]; if (!a) return null
  const live = u.dmgSeen ? u.dmgSeen[a.id] : undefined
  const statv = a.stat != null ? d[a.stat] : undefined
  const n = live != null ? live : statv != null ? Math.max(0, statv + (a.bonus || 0)) : null
  return n == null ? null : { n, kind: a.kind === 'ranged' ? 'ranged' : 'melee' }
}
