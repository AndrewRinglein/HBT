// tool.effect-size-rules (2026-09-25) — which WITHOUT arm tools/effect-size.mts runs.
//
// A content item's control arm disables its rows through the kill-switch seam
// (src/content/disable.ts). A RULE item has no row to disable — disabling the content
// it touches crashes the arm (Law 9) and measures nothing (seen on status.tick-resist
// and terrain.water-cleanses). So a rule item declares `effectSwitch` on its backlog
// row: the cfg switch values its WITHOUT arm runs with, content untouched.
//
// Imported by the tool and its test only; nothing in src/ reads it.
import { DEFAULT_CONFIG } from '../src/core/types.js'

export type WithoutArm =
  | { mode: 'switch'; switches: Record<string, unknown> }
  | { mode: 'disable'; ids: string }

/**
 * A usable effectSwitch: a non-empty object of real switches, each the default's type
 * and each DIFFERENT from the default — a value equal to it would run two identical
 * arms, which reads as "no effect", the most dangerous wrong answer this tool can give.
 */
export function checkEffectSwitch(sw: unknown): Record<string, unknown> {
  if (!sw || typeof sw !== 'object' || Array.isArray(sw) || Object.keys(sw).length === 0) {
    throw new Error(`effectSwitch must be a non-empty object of switch values, got ${JSON.stringify(sw)}`)
  }
  const defaults = DEFAULT_CONFIG.switches as Record<string, unknown>
  for (const [k, v] of Object.entries(sw)) {
    if (!Object.hasOwn(defaults, k)) throw new Error(`effectSwitch: ${k} is not a switch (src/core/types.ts DEFAULT_CONFIG)`)
    if (typeof v !== typeof defaults[k] || Array.isArray(v) !== Array.isArray(defaults[k])) throw new Error(`effectSwitch: ${k} has type ${typeof v}, the switch is ${typeof defaults[k]}`)
    if (JSON.stringify(v) === JSON.stringify(defaults[k])) throw new Error(`effectSwitch: ${k} = ${JSON.stringify(v)} is the default — both arms would be the same battle`)
  }
  return sw as Record<string, unknown>
}

/** One backlog id with an effectSwitch measures by switch; anything else by disabling the ids. */
export function withoutArmFor(ids: string, backlog: readonly { id: string; effectSwitch?: unknown }[]): WithoutArm {
  const row = ids.includes(',') ? undefined : backlog.find((x) => x.id === ids.trim())
  if (row && row.effectSwitch !== undefined) return { mode: 'switch', switches: checkEffectSwitch(row.effectSwitch) }
  return { mode: 'disable', ids }
}
