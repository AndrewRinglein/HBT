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
