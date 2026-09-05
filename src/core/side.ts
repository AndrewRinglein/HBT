// proving.mirror-row-rules (2026-09-04) — the one reader of "which side's RULES
// does this unit follow".
//
// Two kinds of side-keyed code exist. ALLEGIANCE — who is an ally, whose phase
// this is, who has to die for the battle to end — is always `u.side`, the side
// the unit was fielded on. RULES — the hero side rolls Deathbed Fighting and
// bleeds out, runs Surge, is what the crit chart means by "vs heroes"; the
// enemy side dies at 0, feeds and reads the Power pool — are keyed by the
// answer here. SWITCHES.md `mirrorSideRules`: `fielded` (the fielded side's
// rules — a zombie among the heroes rolls Deathbed Fighting) or `row` (its own
// row's — a zombie stays a zombie wherever it stands). Angela 2026-09-04, via
// session 9: "If there's deathbed fighting, that will change the hero side, and
// the hero side has the limitation of stamina. So, can we just field enemies
// against enemies?" — the `row` arm is what makes that a clean measurement.
import type { Ctx, Side, Unit } from './types.js'

/** The side whose RULES this unit follows. Allegiance stays `u.side`. */
export function rulesSideOf(ctx: Ctx, u: Unit): Side {
  return ctx.cfg.switches.mirrorSideRules === 'row' ? u.rowSide : u.side
}
