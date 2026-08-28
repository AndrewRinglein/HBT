// The generated unit pack's loader — the seam where Codex-tracked units enter
// the engine. Angela 2026-08-20: "we're going to read from the data and it's
// clearly differentiated text. We're not hardcoding." The pack file itself is
// GENERATED (content/mkenginepack.mjs) and never hand-edited; this loader
// validates it LOUDLY at import time (Law 9) and hands back plain UnitDefs.
import { UNIT_PACK } from './generated/pack.js'
import type { AttackDef, UnitDef } from '../core/types.js'
import { validateTrigger } from '../core/trigger.js'

const REQUIRED = ['typeId', 'name', 'side', 'maxHp', 'armor', 'resist', 'accuracy', 'dodge',
  'strength', 'precision', 'magic', 'spirit', 'role', 'movement', 'reach',
  'maxStamina', 'staminaRegen', 'ai', 'attacks',
  // moves joined 2026-08-21 — movement is a granted CHOICE, read from the
  // data like everything else; a pack row without one is a pipeline bug.
  'moves'] as const

export function packUnits(): Readonly<Record<string, UnitDef>> {
  const out: Record<string, UnitDef> = {}
  // authoredEnemies joined 2026-08-26 (content.enemy-pack): the prologue's
  // real enemies, keyed by their FULL Codex id (unit.zombie) so they can never
  // collide with the legacy bare-key fixtures ('zombie') awaiting migration.
  for (const row of [...UNIT_PACK.heroes, ...UNIT_PACK.enemies, ...(UNIT_PACK as { authoredEnemies?: readonly unknown[] }).authoredEnemies ?? [],
    ...(UNIT_PACK as { prologueParty?: readonly unknown[] }).prologueParty ?? [],
    // alphaTeam joined 2026-08-27 (content.alpha-team): the test cohort rebuilt
    // on real scaffolding — authored kits, authored attack rows, riders in the
    // real vocabulary. Delivered from the content session (S31): "The Alpha
    // Team is landed … I want to switch to using these heroes."
    ...(UNIT_PACK as { alphaTeam?: readonly unknown[] }).alphaTeam ?? []]) {
    const r = row as unknown as UnitDef & { typeId: string; copyOf?: string }
    for (const k of REQUIRED) {
      if ((r as Record<string, unknown>)[k] === undefined) {
        throw new Error(`unit pack: '${r.typeId ?? '?'}' is missing '${k}' — regenerate the pack (content/mkenginepack.mjs), never patch it by hand`)
      }
    }
    // Id families, all clearly differentiated (Angela 2026-08-20): the cohort
    // is test- prefixed; the authored bestiary carries its full Codex id under
    // the declared unit. kind; the party and civilians are hero.*; and the
    // alpha- family is the S31 Alpha Team (delivered 2026-08-27) — the cohort
    // rebuilt the way heroes actually are. Anything else is a pipeline bug.
    if (!r.typeId.startsWith('test-') && !r.typeId.startsWith('unit.') && !r.typeId.startsWith('hero.')
      && !r.typeId.startsWith('alpha-')) {
      throw new Error(`unit pack: '${r.typeId}' is not test- / unit.* / hero.* / alpha- — the pack must stay clearly differentiated (Angela 2026-08-20)`)
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

/** The authored enemies' attacks — generated rows, validated like the units. */
export function packAttacks(): Readonly<Record<string, AttackDef>> {
  const raw = (UNIT_PACK as { authoredAttacks?: Readonly<Record<string, AttackDef>> }).authoredAttacks ?? {}
  for (const [k, a] of Object.entries(raw)) {
    if (k !== a.id) throw new Error(`unit pack: attack key '${k}' names id '${a.id}'`)
    if (!['melee', 'ranged'].includes(a.kind) || typeof a.reach !== 'number' || a.reach < 1) {
      throw new Error(`unit pack: attack '${k}' has no usable kind/reach — regenerate the pack`)
    }
  }
  return raw
}
