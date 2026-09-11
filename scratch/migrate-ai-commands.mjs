import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/ai/modes.ts'
let s = readFileSync(path, 'utf8')
function replace(from, to) {
  if (!s.includes(from)) throw new Error(`missing migration source: ${from}`)
  s = s.replaceAll(from, to)
}
replace("import { executeFlight, executeMove, executeSidestep, flightLandings, livingEnemies, movePowerOf, moveStaminaCost, nearestEnemy, occupancy, pathTo, reachable, stepRangeOf, usableMoves } from './../core/movement.js'", "import { livingEnemies, movementOptions, movePowerOf, moveStaminaCost, nearestEnemy, stepRangeOf, usableMoves } from './../core/movement.js'")
replace("import type { Reach } from './../core/movement.js'", "import { executeAction, validateAction, type ActionRequest } from './../core/commands.js'")
replace("import { isPassable } from './../content/maps.js'\n", '')
replace('areaUnitIdsOf, attackDef, canAttack, performAttack, preview, reachOf', 'areaUnitIdsOf, attackDef, preview, reachOf')
replace('canUsePower, isReady, powerBlastIdsOf, powerTargetsOf, previewPower, usePower', 'isReady, powerBlastIdsOf, powerTargetsOf, previewPower')
replace("import { isConfused }", "import { isBlocked, isConfused }")
replace("import { settle } from './../core/settle.js'\n", '')
s = s.replace(/\b(?:canAttack|canUsePower)\(/g, 'legalTarget(')
s = s.replace(/(?:performAttack|usePower)\(ctx, ([^,]+), ([^,]+), ([^)]+)\)/g, 'act(ctx, { actor: $1, target: $2, actionId: $3 })')
s = s.replace(/\s*settle\(ctx, [^)]+\);?/g, '')
s = s.replace(/executeSidestep\(ctx, u.id, ([^,]+), (power|step)\)/g, 'act(ctx, { actor: u.id, destination: $1, actionId: $2.id })')
s = s.replace(/executeMove\(ctx, u.id, pathTo\(reach, u.hex, (bestHex|best)\), walk\)/g, 'act(ctx, { actor: u.id, destination: $1, actionId: walk.id })')
replace('const reach = reachable(ctx, u, walk.move.budgetMod)', 'const destinations = moveTargets(ctx, u, walk)')
replace('for (const [hex] of [...reach].sort((a, b) => a[0] - b[0]))', 'for (const hex of destinations)')
replace('const hexes = [...reach.keys()].sort((a, b) => a - b)', 'const hexes = destinations')
replace('  const occ = occupancy(ctx)\n', '')
replace('stepCandidates(ctx, u, range, occ)', 'moveTargets(ctx, u, power)')
replace('stepCandidates(ctx, u, range)', 'moveTargets(ctx, u, step)')
replace('stepCandidates(ctx, u, stepRangeOf(step))', 'moveTargets(ctx, u, step)')
const start = s.indexOf('/**\n * Every hex a sidestep-shaped power')
const end = s.indexOf('function idle(', start)
if (start < 0 || end < 0) throw new Error('missing step candidates')
s = s.slice(0, start) + s.slice(end)
replace("let plan: { power: MoveDef; hex: HexId; reach?: Reach } | null = null", "let plan: { power: MoveDef; hex: HexId } | null = null")
const moverStart = s.indexOf('      if (m.move.shape === \'path\') {', s.indexOf('if (movers.length > 0)'))
const moverEnd = s.indexOf('\n    }\n    if (plan)', moverStart)
if (moverStart < 0 || moverEnd < 0) throw new Error('missing mover candidates')
s = s.slice(0, moverStart) + `      for (const h of moveTargets(ctx, u, m)) {
        const sc = scoreOf(h)
        if (better(sc, best)) { best = sc; plan = { power: m, hex: h } }
      }` + s.slice(moverEnd)
replace("if (plan.reach) executeMove(ctx, u.id, pathTo(plan.reach, u.hex, plan.hex), plan.power)\n      else executeFlight(ctx, u.id, plan.hex, plan.power)", "act(ctx, { actor: u.id, destination: plan.hex, actionId: plan.power.id })")
replace("for (const n of [...ctx.geo.neighboursOf(u.hex)].sort((a, b) => a - b)) {\n        if (occ.has(n) || !isPassable(ctx.state.terrain[n] ?? 0)) continue", "for (const n of moveTargets(ctx, u, power)) {")
// A zero-distance recovery has a rider worth using when starved; geometry
// alone cannot make standing still beat itself in the movement score.
replace('if (better(sc, best)) { best = sc; bestHex = n }', 'if (better(sc, best) || (n === u.hex && stepRangeOf(power) === 0 && u.stamina < u.maxStamina)) { best = sc; bestHex = n }')
replace("if (!t || t.lifeState !== 'standing' || t.side === u.side)", "if (!t || !livingEnemies(ctx, u).some(e => e.id === t!.id))")
replace("  emit(ctx, 'activation.idle'", "  if (ctx.state.outcome) return\n  emit(ctx, 'activation.idle'")
replace("  if (!MODES[u.ai])", "  if (ctx.state.outcome || u.lifeState !== 'standing' || isBlocked(ctx, u) || u.primaryUsed) return\n  if (!MODES[u.ai])")
const insertion = s.indexOf('/** Lowest current health')
s = s.slice(0, insertion) + `/** Candidate legality and actual resolution share the public command mechanism. */
function legalTarget(ctx: Ctx, actor: number, target: number, actionId: string): boolean {
  return validateAction(ctx, { actor, target, actionId }).ok
}
function act(ctx: Ctx, request: ActionRequest): true {
  const result = executeAction(ctx, request)
  if (!result.ok) throw new Error(\`AI selected an illegal action: \${request.actionId}: \${result.reason}\`)
  return true
}
function moveTargets(ctx: Ctx, u: Unit, power: MoveDef): HexId[] {
  return movementOptions(ctx, u.id, power.id).map(plan => plan.destination)
}

` + s.slice(insertion)
if (/executeMove|executeFlight|executeSidestep|pathTo\(|reachable\(|occupancy\(|stepCandidates\(/.test(s)) throw new Error('unmigrated execution or candidates')
writeFileSync(path, s)
