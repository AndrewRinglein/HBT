// The unit SHEET — a unit definition with its attack, ability and move ids
// resolved to the definitions the panel and the action bar print.
//
// OWED TO THE ENGINE (THREE-PACKAGES-PLAN.md §8.3, correction 1). This is
// content interpretation — kits, copyOf, weapon → attack — and the viewer must
// not own it: the same sheet the kingdom's panel wants should come from one
// read-only `sheetOf(typeId)` in engine/src/content/, exported through both
// doors. Until the engine lands that, the resolution lives here, moved
// verbatim from VFX/tool/viewer/dump-static.mts (2026-09-02), and it is the
// FIRST entry in tools/exemptions.json — EXEMPTION sheet. It reads content only, through the
// door, and computes nothing: every field is copied from a definition.
import { UNITS, ATTACKS, ABILITIES, MOVES, STATUSES } from './engine.js'

const plain = (o: unknown) => (o ? JSON.parse(JSON.stringify(o)) : undefined)
const many = (ids: readonly string[] | undefined, table: Record<string, unknown>) =>
  (ids ?? []).map((id) => ({ id, ...(plain(table[id]) ?? {}) })).filter((x: any) => x.name !== undefined)

export type UnitSheet = Record<string, unknown> & { typeId: string; name: string }

export function sheetOf(typeId: string): UnitSheet | undefined {
  const u = (UNITS as Record<string, any>)[typeId]
  if (!u) return undefined
  return {
    typeId,
    name: u.name ?? typeId,
    role: u.role,
    side: u.side,
    // stats the panel's grid shows, verbatim from the def. `accuracy` is BASE
    // accuracy — the live total is the engine's, and is one of the five
    // exemptions until the engine emits it (plan §8.3).
    movement: u.movement, armor: u.armor, resist: u.resist, dodge: u.dodge,
    accuracy: u.accuracy,
    reach: u.reach, maxHp: u.maxHp, maxStamina: u.maxStamina,
    staminaRegen: u.staminaRegen,
    strength: u.strength, precision: u.precision, magic: u.magic, spirit: u.spirit,
    crit: u.crit, luck: u.luck, tags: plain(u.tags), attributes: plain(u.attributes),
    ai: u.ai,
    attacks: many(u.attacks, ATTACKS as Record<string, unknown>),
    abilities: many(u.abilities, ABILITIES as Record<string, unknown>),
    moves: many(u.moves, MOVES as Record<string, unknown>),
    triggers: plain(u.triggers) ?? [],
  }
}

export function allSheets(): Record<string, UnitSheet> {
  const out: Record<string, UnitSheet> = {}
  for (const typeId of Object.keys(UNITS)) { const s = sheetOf(typeId); if (s) out[typeId] = s }
  return out
}

/** statusId -> display name, for every label the viewer prints. */
export function statusNames(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [id, s] of Object.entries(STATUSES) as [string, any][])
    out[id] = s?.name ?? id.replace(/^(test\.)?status\./, '')
  return out
}
