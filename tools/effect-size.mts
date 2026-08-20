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
  const run = (env: string) =>
    JSON.parse(execSync(`${env}npx tsx tools/effect-size.mts --arm`, { encoding: 'utf8' }).trim().split('\n').pop()!)
  const withArm = run('')
  const without = run(`CF_DISABLE_IDS=${ids} `)
  console.log(`effect of ${ids} — ${REPS} paired battles per map, WITH vs WITHOUT`)
  let anyDelta = false
  for (const map of Object.keys(withArm)) {
    const a = withArm[map], b = without[map]
    if (b.invalid === REPS) { console.log(`  ${map}: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.`); anyDelta = true; continue }
    const dWin = a.heroWins - b.heroWins
    const dTurns = ((a.turns - b.turns) / REPS)
    if (dWin !== 0 || Math.abs(dTurns) > 0.01) anyDelta = true
    console.log(`  ${map}: heroWins ${b.heroWins}->${a.heroWins} (${dWin >= 0 ? '+' : ''}${dWin})  meanTurns ${(b.turns / REPS).toFixed(1)}->${(a.turns / REPS).toFixed(1)}`)
  }
  console.log(anyDelta ? 'MEASURABLE' : 'NO MEASURABLE EFFECT at this sample size — consequence clause caught state changes, but outcomes did not move. Consider a sweep with more replicates before drawing balance conclusions.')
}
