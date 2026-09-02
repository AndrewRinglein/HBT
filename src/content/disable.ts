// The kill-switch seam — TEST HARNESS ONLY. The kingdom's copy of the engine's
// src/content/disable.ts, for the same reason: `slice-gate.mjs --isc N --red`
// runs a criterion's probe with `KINGDOM_DISABLE_IDS=stage.mend` and the probe
// must FAIL, or it was never testing the thing.
//
// Lives in content/, not core/: the machine never knows the switch exists. It
// sees a registry that simply lacks a row, which is indistinguishable from the
// row never having been authored. Nothing in a shipped game sets the variable.

const raw = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.KINGDOM_DISABLE_IDS ?? ''
const DISABLED: ReadonlySet<string> = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))

export function omitDisabled<T extends { id: string }>(rows: readonly T[]): readonly T[] {
  if (DISABLED.size === 0) return rows
  return rows.filter((r) => !DISABLED.has(r.id))
}

/** Visible for tests. */
export function disabledIds(): ReadonlySet<string> { return DISABLED }
