// npx tsx tools/effect-size.mts <id>[,<id>...]
//
// The Iron Gauntlet's consequence measurement. The consequence clause proves a
// mechanic changed SOMETHING; this measures HOW MUCH, with the cleanest control
// arm that can exist: the same battles, same seeds, with the item's content
// disabled through the kill-switch seam. Paired by construction — the RNG keys
// name what each roll is, so the arms share dice until the mechanic itself
// diverges them (Law 4 is what makes this comparison honest).
//
// Child mode (--arm) runs one arm in one process, because CF_DISABLE_IDS is read
// at module load and cannot be toggled within a process.

import { execSync } from 'node:child_process'

const REPS = 25

if (process.argv.includes('--arm')) {
  const { createBattle } = await import('../src/core/setup.js')
  const { runBattle } = await import('../src/core/battle.js')
  const { MAP_PANEL } = await import('../src/content/maps.js')
  const rows: Record<string, { heroWins: number; turns: number; invalid: number }> = {}
  for (const mapId of MAP_PANEL) {
    let heroWins = 0, turns = 0, invalid = 0
    for (let r = 0; r < REPS; r++) {
      try {
        const ctx = createBattle({ replicate: r, enemyCount: 8, mapId })
        const res = runBattle(ctx)
        if (res.outcome === 'heroClear') heroWins++
        turns += res.turns
      } catch { invalid++ } // a disabled row referenced by other content fails loudly (Law 9)
    }
    rows[mapId] = { heroWins, turns, invalid }
  }
  console.log(JSON.stringify(rows))
} else {
  const ids = process.argv[2]
  if (!ids) { console.error('usage: npx tsx tools/effect-size.mts <id>[,<id>...]'); process.exit(2) }
  // `disable` arrives as an env option rather than a `VAR=x cmd` prefix: that
  // prefix is bash-only, and under cmd.exe the WITHOUT arm would not run at all
  // — which reads as "no measurable effect", the most dangerous wrong answer
  // this tool can give.
  const run = (disable?: string) =>
    JSON.parse(execSync('npx tsx tools/effect-size.mts --arm', {
      encoding: 'utf8',
      env: disable ? { ...process.env, CF_DISABLE_IDS: disable } : process.env,
    }).trim().split('\n').pop()!)
  const withArm = run()
  const without = run(ids)
  const disabled = new Set(ids.split(',').map(id => id.trim()))
  // Validate the entire comparison before printing any numeric conclusions.
  // Aggregates do not identify paired valid replicates, so invalid runs cannot
  // be subtracted or silently counted as zero-turn/zero-win observations.
  for (const [name, arm] of [['WITH', withArm], ['WITHOUT', without]] as const) {
    if (!arm || typeof arm !== 'object' || Array.isArray(arm)) throw new Error(`invalid ${name} comparison arm`)
    for (const [map, value] of Object.entries(arm) as [string, any][]) {
      if (!value || !['heroWins', 'turns', 'invalid'].every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)
        || value.invalid > REPS || value.heroWins > REPS - value.invalid) throw new Error(`invalid ${name} control totals: ${map}`)
    }
  }
  if (!Object.keys(withArm).length) throw new Error('empty WITH comparison arm')
  for (const map of Object.keys(without)) if (!Object.hasOwn(withArm, map)) throw new Error(`unexpected extra WITHOUT control: ${map}`)
  for (const map of Object.keys(withArm)) if (!Object.hasOwn(without, map) && !disabled.has(map)) throw new Error(`unexpected missing WITHOUT control: ${map}`)
  console.log(`effect of ${ids} — ${REPS} paired battles per map, WITH vs WITHOUT`)
  let anyDelta = false
  const unavailable: { map: string; reason: string; withInvalid?: number; withoutInvalid?: number }[] = []
  for (const map of Object.keys(withArm)) {
    const a = withArm[map], b = without[map]
    if (!b) {
      console.log(`  ${map}: UNAVAILABLE/PRESENCE-ONLY — explicitly disabled control absent from WITHOUT; no paired numerical effect`)
      unavailable.push({ map, reason: 'disabled-control' }); continue
    }
    if (a.invalid || b.invalid) {
      console.log(`  ${map}: UNAVAILABLE — invalid WITH ${a.invalid}/${REPS}, WITHOUT ${b.invalid}/${REPS}; paired valid replicate identities unavailable`)
      unavailable.push({ map, reason: 'invalid-replicates', withInvalid: a.invalid, withoutInvalid: b.invalid }); continue
    }
    const dWin = a.heroWins - b.heroWins
    const dTurns = ((a.turns - b.turns) / REPS)
    if (dWin !== 0 || Math.abs(dTurns) > 0.01) anyDelta = true
    console.log(`  ${map}: heroWins ${b.heroWins}->${a.heroWins} (${dWin >= 0 ? '+' : ''}${dWin})  meanTurns ${(b.turns / REPS).toFixed(1)}->${(a.turns / REPS).toFixed(1)}`)
  }
  if (unavailable.length) {
    console.log(`MEASUREMENT UNAVAILABLE — ${unavailable.length} control(s) lack complete paired evidence`)
    // Versioned machine contract for the gate. Exit 2 is unavailable evidence;
    // malformed arm data / child-process errors remain infrastructure failures.
    console.log('EFFECT_RESULT ' + JSON.stringify({ version: 1, status: 'unavailable', unavailable }))
    process.exitCode = 2
  } else {
    console.log(anyDelta ? 'MEASURABLE' : 'NO MEASURABLE EFFECT at this sample size — consequence clause caught state changes, but outcomes did not move. Consider a sweep with more replicates before drawing balance conclusions.')
    console.log('EFFECT_RESULT ' + JSON.stringify({ version: 1, status: 'measured', unavailable: [] }))
  }
}
