// Current damage markers only; future status resolution belongs to the engine.
import { kitOf } from './actions.js'

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
export function dangerOf(u, D) {
  const A = DANGER_AUTHORED[u.typeId]; if (A) return A
  const UD = D.UD || {}
  const d = UD[u.typeId] || {}; const a = kitOf(u, D).attacks[0]; if (!a) return null      // the weapon in hand: the kit's first grant
  const live = u.dmgSeen ? u.dmgSeen[a.id] : undefined
  const statv = a.stat != null ? d[a.stat] : undefined
  const n = live != null ? live : statv != null ? Math.max(0, statv + (a.bonus || 0)) : null
  return n == null ? null : { n, kind: a.kind === 'ranged' ? 'ranged' : 'melee' }
}
