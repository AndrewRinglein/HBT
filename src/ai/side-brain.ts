// THE SIDE BRAIN — ai.encounter-rules (AI-DESIGN.md §4; DECISIONS.md 2026-09-26,
// "by default units do not work together … we can have some overarching rules
// that could apply based on an encounter").
//
// "When an encounter turns coordination on, once per Phase before any
// Activation that side picks a focus target" (AI-DESIGN §4). For each coordinate
// rule on the running encounter, in the row's order (Law 6): its bound units on
// the side whose Phase is beginning pick one focus among their standing enemies,
// ranked by the rule's own `focus` tiers through the scorer (never a formula of
// its own — Laws 1-2). The pick is state (setAiFocus, `ai.focused`); the
// coordinated units' scoring reads it (the `sidePlan` consideration, modes.ts).
// Jobs (screen, flank, hold) are not built — SWITCHES.md encounterJobs.
import type { Ctx, Side } from '../core/types.js'
import { livingEnemies } from '../core/movement.js'
import { setAiFocus } from '../core/mutate.js'
import { rank } from './scorer.js'

export function sideStep(ctx: Ctx, side: Side): void {
  for (const rule of ctx.encounter?.aiRules ?? []) {
    if (rule.rule !== 'coordinate') continue
    // the bound units of this side still standing, by id — the lowest is the one
    // the scorer measures from (SWITCHES.md encounterFocusFrom)
    const bound = ctx.state.units.filter((u) => u.side === side && u.lifeState === 'standing' && u.aiRules?.includes(rule.id))
    if (!bound.length) continue
    const from = bound[0]!
    const plans = [...livingEnemies(ctx, from)].sort((a, b) => a.id - b.id).map((e) => ({ actionId: 'focus', target: e.id }))
    const top = rank({ ctx, actor: from }, plans, rule.focus)[0]
    setAiFocus(ctx, rule.id, side, top ? top.plan.target! : null)
  }
}
