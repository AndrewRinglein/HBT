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
import { UNITS, ATTACKS, ABILITIES, MOVES, STATUSES, LAYER_IDS, HEX_COUNT, distance } from './engine.js'

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
    // `tags` is THE ONE FIELD (engine fix.unit-tags, 2026-09-03) — `attributes` is gone
    crit: u.crit, luck: u.luck, tags: plain(u.tags) ?? [],
    ai: u.ai,
    // 2026-09-03 fields (EVENTS-FOR-THE-VIEWER §8), copied verbatim: absent
    // stays absent — the engine's defaults are the engine's to state
    toughness: u.toughness, stands: u.stands, surge: u.surge, vision: u.vision,
    powerOnArrival: u.powerOnArrival,
    auras: plain(u.auras) ?? [],
    defaultItems: plain(u.defaultItems),
    attacks: many(u.attacks, ATTACKS as Record<string, unknown>),
    abilities: many(u.abilities, ABILITIES as Record<string, unknown>),
    moves: many(u.moves, MOVES as Record<string, unknown>),
    triggers: plain(u.triggers) ?? [],
  }
}

/** Every attack and ability definition by id — what a `unit.equipped` grant
    resolves against at fold time (seam.items-per-unit: a hero's kit is applied
    at fielding, and the bare row does not carry it). Copied, never shaped. */
export function attackTable(): Record<string, unknown> { return plain(ATTACKS) ?? {} }
export function abilityTable(): Record<string, unknown> { return plain(ABILITIES) ?? {} }

/** Hex distance for every pair on the 16×16 board, as one base64 string of
    HEX_COUNT² bytes (row-major: dist(a,b) at a*HEX_COUNT+b) — the engine's
    own `distance`, dumped so the viewer draws an aura's radius without
    re-implementing hex geometry (Law 0 / Law 4). Map-independent. */
export function hexDistanceTable(): string {
  const n = HEX_COUNT
  const out = new Uint8Array(n * n)
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) out[a * n + b] = distance(a, b)
  return Buffer.from(out).toString('base64')
}

/** The ground layers by number — 1 burning · 2 frost · 3 poisoned · 4 darkness —
    read from the engine, never typed (Law 4). */
export function layerNames(): Record<number, string> { return { ...LAYER_IDS } }

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
