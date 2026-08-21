// The generated unit pack's loader — the seam where Codex-tracked units enter
// the engine. Angela 2026-08-20: "we're going to read from the data and it's
// clearly differentiated text. We're not hardcoding." The pack file itself is
// GENERATED (content/mkenginepack.mjs) and never hand-edited; this loader
// validates it LOUDLY at import time (Law 9) and hands back plain UnitDefs.
import { UNIT_PACK } from './generated/pack.js'
import type { UnitDef } from '../core/types.js'
import { validateTrigger } from '../core/trigger.js'

const REQUIRED = ['typeId', 'name', 'side', 'maxHp', 'armor', 'resist', 'accuracy', 'dodge',
  'strength', 'precision', 'magic', 'spirit', 'role', 'movement', 'reach',
  'maxStamina', 'staminaRegen', 'ai', 'attacks',
  // moves joined 2026-08-21 — movement is a granted CHOICE, read from the
  // data like everything else; a pack row without one is a pipeline bug.
  'moves'] as const

export function packUnits(): Readonly<Record<string, UnitDef>> {
  const out: Record<string, UnitDef> = {}
  for (const row of [...UNIT_PACK.heroes, ...UNIT_PACK.enemies]) {
    const r = row as unknown as UnitDef & { typeId: string; copyOf?: string }
    for (const k of REQUIRED) {
      if ((r as Record<string, unknown>)[k] === undefined) {
        throw new Error(`unit pack: '${r.typeId ?? '?'}' is missing '${k}' — regenerate the pack (content/mkenginepack.mjs), never patch it by hand`)
      }
    }
    if (!r.typeId.startsWith('test-')) {
      throw new Error(`unit pack: '${r.typeId}' is not test- prefixed — the cohort must stay clearly differentiated (Angela 2026-08-20)`)
    }
    for (const t of r.triggers ?? []) validateTrigger(t)
    for (const m of r.moves) {
      if (!/^power\./.test(m)) {
        throw new Error(`unit pack: '${r.typeId}' grants movement '${m}' — movement powers live under power.* (Codex 2026-08-20: "Grants power.flight")`)
      }
    }
    if (out[r.typeId]) throw new Error(`unit pack: duplicate typeId '${r.typeId}'`)
    out[r.typeId] = r
  }
  return out
}

/** The pack's own note — surfaced so tooling can print WHY these units exist. */
export const UNIT_PACK_NOTE = UNIT_PACK.note
