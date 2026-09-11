// Run against a copied engine tree with the candidate pack before publication.
import { ACTIONS, UNITS } from '../engine/src/content/index.js'
import { createBattle } from '../engine/src/core/setup.js'
import { runBattle } from '../engine/src/core/battle.js'
import { UNIT_PACK } from '../engine/src/content/generated/pack.js'

for (const hero of UNIT_PACK.heroes) {
  if (!(hero.moves as readonly string[]).includes('power.move')) throw new Error(`${hero.typeId}: cohort hero requires plain power.move`)
}

for (const typeId of Object.keys(UNITS)) {
  const hero = UNITS[typeId]!.side === 'hero'
  // Actual setup folds badges as well as kits; fieldedDef alone does not.
  const unit = createBattle({ replicate: 0, heroes: hero ? [typeId] : [], enemies: hero ? [] : [typeId], strict: true }).state.units[0]!
  const row = UNITS[typeId]!
  if (!row.attacks.length && !row.abilities.length) throw new Error(`${typeId}: no attack or ability`)
  for (const id of unit.actions) {
    if (!ACTIONS[id]) throw new Error(`${typeId}: unknown action ${id}`)
  }
}
const ctx = createBattle({ replicate: 0, strict: true })
runBattle(ctx)
if (!ctx.state.outcome) throw new Error('Candidate smoke battle did not terminate')
console.log(`Candidate validated: ${Object.keys(UNITS).length} fielded definitions; smoke battle ${ctx.state.outcome}`)
