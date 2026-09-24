// verify.mjs in slices — the library-wide half of verify, and which slice drives which battle.
//
// Cowork's shell kills a command at ~178 s and one verify.mjs run takes ~3 min
// (Andrew, 2026-09-23: "shorten the checks so a chat can run them" — split,
// never weaken). `verify.mjs <page> --slice k/N` drives only its share of the
// library battles; slice 1 also runs every check that is not per battle. The
// checks that need EVERY battle's facts (the icon set, both row kinds, the
// status frames) are evaluated here: by verify.mjs itself when it runs whole,
// and by the gate over the merged facts of all N slices. One function per
// check, so the two paths cannot drift apart.

/* the single checks (camera, file-drop, live, the feature run, …) cost about
   what 3500 events of driving do (measured 2026-09-23: ~25 s against ~7 ms per
   event), so slice 1 starts that heavy */
const SINGLES_WEIGHT = 3500

/** battle index → slice number (1..n): longest first into the lightest slice. Deterministic. */
export function assignSlices(battles, n) {
  const load = Array(n).fill(0); load[0] = SINGLES_WEIGHT
  const out = Array(battles.length)
  const order = battles.map((b, i) => [b.battle.events.length, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
  for (const [w, i] of order) { let k = 0; for (let j = 1; j < n; j++) if (load[j] < load[k]) k = j; out[i] = k + 1; load[k] += w }
  return out
}

/** the icons among the action bars of every library battle and every playback TEST */
export function iconFails({ uses, damaging, plain }) {
  const u = new Set(uses), f = []
  if (!(u.has('ra-crossed-swords') && u.has('ra-shoe-prints') && u.has('ra-bow') && !u.has('ra-crossbow'))) f.push(`icons: expected swords, shoe-prints and the bow (never the crossbow) among uses, got ${[...u].join(',')}`)
  if (!(damaging > 0 && plain > 0)) f.push(`icons: rows damaging=${damaging} plain=${plain} — both kinds must appear`)
  return f
}

/** the no-forecast check must have seen a status-bearing frame somewhere in the library */
export function frameFails({ statusFrames }) {
  return statusFrames > 0 ? [] : ['no status-bearing frames exercised the no-forecast check']
}

/** the N slice records of one page → the library-wide failures (coverage first: every battle driven exactly once, the singles once) */
export function mergedFails(records, n) {
  const f = []
  const got = records.filter(Boolean)
  if (got.length !== n) return [`slices: ${got.length} of ${n} recorded`]
  const count = got[0].libraryCount
  const driven = new Map()
  for (const r of got) {
    if (r.libraryCount !== count || r.n !== n) f.push(`slices: slice ${r.k} saw ${r.libraryCount} battles in ${r.n} slices, slice ${got[0].k} saw ${count} in ${got[0].n}`)
    for (const i of r.battles) driven.set(i, (driven.get(i) || 0) + 1)
  }
  for (let i = 0; i < count; i++) if (driven.get(i) !== 1) f.push(`slices: library battle ${i} was driven ${driven.get(i) || 0} times, not once`)
  const singles = got.filter(r => r.singles).length
  if (singles !== 1) f.push(`slices: the single checks ran in ${singles} slices, not one`)
  f.push(...iconFails({ uses: got.flatMap(r => r.uses), damaging: got.reduce((s, r) => s + r.damaging, 0), plain: got.reduce((s, r) => s + r.plain, 0) }))
  f.push(...frameFails({ statusFrames: got.reduce((s, r) => s + r.statusFrames, 0) }))
  return f
}
