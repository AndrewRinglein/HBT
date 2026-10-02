// Current damage markers only; future status resolution belongs to the engine.
import { dmgOf, kitOf } from './actions.js'

/* ── DANGER MARKER (UI-BUILD-NOTES §1) ─────────────────────────────────────
   The signature damage — a stable, learnable rating. Content has no field
   naming a unit's signature attack, so the marker reads the unit's FIRST
   attack in the engine's own order (the kit's first grant — the weapon in hand
   — then the row's), and its number is the action bar's: dmgOf, the engine's
   damageOnHit once seen, else the sheet's stat plus its live modifiers plus the
   bonus (EXEMPTION dmg-fallback). viewer.reads-engine (review V2): the hand
   table of four typeIds is gone — it said 3 where the engine deals the test
   zombies 4 — and so is this file's own fallback, which read pre-one-action-
   type fields that no longer exist. The glyph is the attack profile's kind. */
export function dangerOf(u, D) {
  const a = kitOf(u, D).attacks[0]; if (!a) return null
  const shown = dmgOf(a, u, D)
  return shown ? { n: shown.n, kind: (a.attack || {}).kind === 'ranged' ? 'ranged' : 'melee' } : null
}
