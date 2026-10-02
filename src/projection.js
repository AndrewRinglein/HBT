// Current damage markers only; future status resolution belongs to the engine.
import { dmgOf, kitOf, classOf } from './actions.js'

/* ── DANGER MARKER (UI-BUILD-NOTES §1) ─────────────────────────────────────
   The signature damage — a stable, learnable rating. Content has no field
   naming a unit's signature attack, so the marker reads the unit's first
   attack in the engine's own order (the kit's first grant — the weapon in hand
   — then the row's) THAT IS NOT A CHARGE, by the engine's classification
   (static.json actionKinds, core/action.ts isCharge); a unit whose only attacks
   are Charges keeps its first. Its number is the action bar's: dmgOf, the
   engine's damageOnHit once seen, else the sheet's stat plus its live modifiers
   plus the bonus (EXEMPTION dmg-fallback). viewer.reads-engine (review V2): the
   hand table of four typeIds is gone — it said 3 where the engine deals the test
   zombies 4. fix.danger-skips-charge (ruled 2026-10-02, Andrew, engine
   DECISIONS.md 'the fast zombie's danger marker reads 3, not its Charge's 4':
   "You can change it to 3."): the fast zombie reads its claw's 3, not its
   Charge's 4. The glyph is the attack profile's kind. */
export function dangerOf(u, D) {
  const all = kitOf(u, D).attacks
  const a = all.find((x) => classOf(x, D) !== 'charge') || all[0]; if (!a) return null
  const shown = dmgOf(a, u, D)
  return shown ? { n: shown.n, kind: (a.attack || {}).kind === 'ranged' ? 'ranged' : 'melee' } : null
}
