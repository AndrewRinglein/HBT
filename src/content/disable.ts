// The kill-switch seam — TEST HARNESS ONLY.
//
// `CF_DISABLE_IDS=status.poison,attack.warrior.axe` removes those rows from the
// content registries at load. The Iron Gauntlet uses this to prove that an item's
// tests actually test the thing: run the item's test files with its content
// disabled, and they MUST fail. A test that passes either way is tautological —
// it would have passed before the feature existed, so it proves nothing.
//
// This lives in content/, not core/: the engine never knows the switch exists.
// It sees a registry that simply lacks a row, which is indistinguishable from the
// content never having been authored. Nothing in a shipped game sets the variable.
//
// `prefix` covers registries keyed bare (UNITS uses 'zombie'; the probe vocabulary
// says 'unit.zombie'), so both spellings disable the same row.

const raw = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.CF_DISABLE_IDS ?? ''
const DISABLED: ReadonlySet<string> = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))

export function omitDisabled<T>(reg: Readonly<Record<string, T>>, prefix = ''): Readonly<Record<string, T>> {
  if (DISABLED.size === 0) return reg
  return Object.fromEntries(
    Object.entries(reg).filter(([k]) => !DISABLED.has(k) && !DISABLED.has(prefix + k)),
  )
}

/** Visible for tests. */
export function disabledIds(): ReadonlySet<string> { return DISABLED }

/**
 * Strip disabled TRIGGER ids from unit defs. Triggers live inline on the def,
 * not in a registry of their own, so the registry filter above cannot reach
 * them — this can. Same contract: byte-identical input object when nothing is
 * disabled.
 */
export function stripDisabledTriggers<U extends { triggers?: readonly { id: string }[]; auras?: readonly { id: string }[]; aiChanges?: readonly { id: string }[]; aiRules?: readonly { id: string }[] }>(
  reg: Readonly<Record<string, U>>,
): Readonly<Record<string, U>> {
  if (DISABLED.size === 0) return reg
  // auras (capability.auras, 2026-09-03) live inline on the def like triggers — same seam
  return Object.fromEntries(Object.entries(reg).map(([k, u]) => {
    let v = u
    if (v.triggers?.some((t) => DISABLED.has(t.id))) v = { ...v, triggers: v.triggers.filter((t) => !DISABLED.has(t.id)) }
    if (v.auras?.some((a) => DISABLED.has(a.id))) v = { ...v, auras: v.auras.filter((a) => !DISABLED.has(a.id)) }
    // ai.mode-change (2026-09-26): a row's mode changes live inline on the def too — same seam
    if (v.aiChanges?.some((c) => DISABLED.has(c.id))) v = { ...v, aiChanges: v.aiChanges.filter((c) => !DISABLED.has(c.id)) }
    // ai.encounter-rules (2026-09-26): an encounter row's AI rules live inline on the row — same seam
    if (v.aiRules?.some((r) => DISABLED.has(r.id))) v = { ...v, aiRules: v.aiRules.filter((r) => !DISABLED.has(r.id)) }
    return [k, v]
  }))
}
