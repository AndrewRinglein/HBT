// What a run never touched.
//
// Computed from the EVENT LOG ONLY, like score.ts beside it. This is a
// MEASUREMENT, not a rule: nothing here may be reachable from src/core, and a
// battle must be byte-identical whether or not anyone asks for the report.
//
// WHY THIS EXISTS. A sweep answers "did it help." It cannot, on its own,
// distinguish two very different silences:
//
//   1. the content ran and changed nothing
//   2. the content never ran
//
// Both present as a flat win rate. The second is not a finding about the game,
// it is a finding about the RUN — and acting on it is how a balance conclusion
// gets drawn about a mechanic nobody exercised.
//
// Not hypothetical. `movement.flight` landed on 2026-08-21 with a clean gate.
// A 640-battle sweep across all eight maps then showed `power.flight`,
// `power.flight-swift` and `power.flight-labored` firing ZERO times, because
// their only grantor is a benched beast. The gate's green check could not have
// gone red, and nothing in the harness said so — it was found by hand-counting
// causeIds. This is that check, mechanised.
//
// The distinction that makes the report worth reading is REACHABLE vs
// OUT OF SCOPE. An id nobody on the field carries is not a gap in the run; it
// is a gap in the roster, and saying so is the difference between "your sweep
// was blind" and "you fielded the wrong units."

import type { Ctx, Event } from '../core/types.js'

export type CoverageSlice = {
  kind: string
  /** Ids the fielded roster could produce in this matchup. */
  reachable: string[]
  /** Of those, the ones that actually appear in the log as a cause. */
  exercised: string[]
  /** Of those, the ones that never appear. THE POINT OF THE REPORT. */
  unused: string[]
}

export type Coverage = {
  slices: CoverageSlice[]
  reachable: number
  exercised: number
  /** Integer percent, 0..100 (Law 7 — no floats in reported numbers). */
  percent: number
  /** Every unused id, flattened, for a one-line verdict. */
  blind: string[]
}

/**
 * What the fielded roster could possibly produce, by kind.
 *
 * Read from the units actually on the board plus the terrain actually on the
 * map — never from the whole registry, because "the Codex has 300 powers and
 * you used 2" is a true statement that tells you nothing about this run.
 */
function reachableOf(ctx: Ctx, events: readonly Event[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const add = (kind: string, id: string) => {
    if (!out.has(kind)) out.set(kind, new Set())
    out.get(kind)!.add(id)
  }
  for (const u of ctx.state.units) {
    // A granted action whose row is missing from the registry is NOT reachable —
    // that is the kill-switch seam removing it, and reporting it as unused
    // would turn every disabled row into a false finding.
    for (const id of u.actions) if (ctx.actions[id]) add('action', id)
    for (const t of u.triggers) add('trigger', t.id)
  }
  for (const e of events) {
    // The map census includes terrain that nobody visited. Merely loading it
    // makes it reachable, not exercised. All names stay local to this report.
    if (e.type === 'map.loaded') {
      for (const [id, count] of Object.entries(e)) {
        if (id.startsWith('terrain.') && typeof count === 'number' && count > 0) add('terrain', id)
      }
    }
    if (e.type === 'moved' && typeof e['terrain'] === 'string') add('terrain', e['terrain'])
  }
  return out
}

/**
 * Every id the log names as a CAUSE. `causeId` is Law 12's promise — every
 * line names what caused it — so this is exactly the set of content that did
 * something, with no per-mechanic instrumentation.
 */
function exercisedOf(events: readonly Event[]): Set<string> {
  const seen = new Set<string>()
  for (const e of events) {
    if (typeof e.causeId === 'string') seen.add(e.causeId)
    // Triggers name themselves in `source`, and a trigger that ROLLED and did
    // not fire still counts as exercised — the content was consulted, which is
    // the question this report asks. (A trigger that never rolls at all is the
    // blind spot worth reporting.)
    const src = e['source']
    if (typeof src === 'string') seen.add(src)
    const sid = e['statusId']
    if (typeof sid === 'string') seen.add(sid)
    for (const field of ['actionId', 'attackId', 'abilityId', 'moveId']) {
      const id = e[field]
      if (typeof id === 'string') seen.add(id)
    }
    if (e.type === 'moved' && typeof e['terrain'] === 'string') seen.add(e['terrain'])
  }
  return seen
}

export function coverage(ctx: Ctx, events: readonly Event[] = ctx.events): Coverage {
  const reach = reachableOf(ctx, events)
  const seen = exercisedOf(events)
  const slices: CoverageSlice[] = []
  let totalReach = 0
  let totalSeen = 0
  const blind: string[] = []

  // Sorted throughout — Law 6, so two runs of the same battle print the same
  // report in the same order.
  for (const kind of [...reach.keys()].sort()) {
    const ids = [...reach.get(kind)!].sort()
    const exercised = ids.filter((id) => seen.has(id))
    const unused = ids.filter((id) => !seen.has(id))
    slices.push({ kind, reachable: ids, exercised, unused })
    totalReach += ids.length
    totalSeen += exercised.length
    blind.push(...unused)
  }

  return {
    slices,
    reachable: totalReach,
    exercised: totalSeen,
    percent: totalReach === 0 ? 100 : Math.round((totalSeen * 100) / totalReach),
    blind: blind.sort(),
  }
}

/**
 * Merge coverage across a sweep. An id counts as exercised if ANY battle used
 * it — one blind battle is normal, and reporting per-battle blindness would
 * bury the signal that matters: content no battle in the whole sweep touched.
 */
export function mergeCoverage(all: readonly Coverage[]): Coverage {
  const byKind = new Map<string, { reach: Set<string>; seen: Set<string> }>()
  for (const c of all) {
    for (const s of c.slices) {
      if (!byKind.has(s.kind)) byKind.set(s.kind, { reach: new Set(), seen: new Set() })
      const e = byKind.get(s.kind)!
      for (const id of s.reachable) e.reach.add(id)
      for (const id of s.exercised) e.seen.add(id)
    }
  }
  const slices: CoverageSlice[] = []
  let totalReach = 0
  let totalSeen = 0
  const blind: string[] = []
  for (const kind of [...byKind.keys()].sort()) {
    const { reach, seen } = byKind.get(kind)!
    const ids = [...reach].sort()
    const exercised = ids.filter((id) => seen.has(id))
    const unused = ids.filter((id) => !seen.has(id))
    slices.push({ kind, reachable: ids, exercised, unused })
    totalReach += ids.length
    totalSeen += exercised.length
    blind.push(...unused)
  }
  return {
    slices,
    reachable: totalReach,
    exercised: totalSeen,
    percent: totalReach === 0 ? 100 : Math.round((totalSeen * 100) / totalReach),
    blind: blind.sort(),
  }
}

/** The human line. Kept here so the CLI and any future dashboard agree. */
export function renderCoverage(c: Coverage): string {
  const head = `COVERAGE  ${c.percent}% of reachable content exercised (${c.exercised}/${c.reachable})`
  if (c.blind.length === 0) {
    return `${head}\n  everything the roster could reach was used at least once`
  }
  const lines = [`${head}`, `  ${c.blind.length} reachable id(s) NEVER USED — a change to any of them will read as no effect:`]
  for (const s of c.slices) {
    if (s.unused.length === 0) continue
    lines.push(`    ${s.kind.padEnd(8)} ${s.unused.join(' ')}`)
  }
  return lines.join('\n')
}
