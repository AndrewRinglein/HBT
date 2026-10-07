// The six one-use content items (2026-10-06; ruled 2026-10-06, DECISIONS.md 'the one-use rules: most are cut or reworded onto rules
// the engine already has; a handful are built' and '… the card-draw badge rules are cut for now'): content.one-use-class-powers-reworded,
// content.one-use-items-reworded, content.used-twice-rules-removed, content.banner-heroism-own-miss, content.impersonation-badge,
// content.card-draw-badge-rules-cut - one content pack for the six, captured on the tree merged with engine master 42d8dd8
// (group B: rule.surge-is-at-least-level, rule.special-moves-unlock-at-level-two; GBH SWITCHES combine.mergeMainFirst).
// Freeze every case's full hashes on this tree. `changed` marks the cases whose full events OR state differ from the
// combine-one-move capture (the layer below); `stateOnly` says the events, the RNG and the result are all unchanged; `added`
// marks a case the layer below does not hold. What moved, each read line by line against the same tree on main's pack:
//   FOUGHT DIFFERENTLY, all four by content.used-twice-rules-removed -
//     test.afflictions-at-zero-rule, test.opening-cavern-trail, showcase.prologue-enemies: the Werewolf's Claw Frenzy leaves it a
//       point of Strength stronger after every swing ("the ordering, I don't really care about");
//     showcase.horrors: the Eyeblight's Gaze is an attack by its Precision ("It should be based on its stat."), so the Eyeblights
//       shoot from range where they closed to claw.
//   WORDS ONLY (the same fight, event for event, but for one row's written line) -
//     progression-surge-0, -1, -2: the Wayfinder's Compass's line (content.one-use-items-reworded: "just give a bonus to vision");
//     test.set-bonus: the Blink Ring's line (the same item: "I don't think we need teleportation");
//     showcase.eve-24-b, test.banner-courage, test.bear-traps, test.mending-light, test.snarer-traps: Wise's line, an origin badge
//       whose one rule was the card draw (content.card-draw-badge-rules-cut: "you can cut all those for now").
//   ADDED, one fielding to an item: test.take-root, test.divine-bulwark, test.banner-heroism, test.impersonation.
// The 23 control battles did not move. Refuses to overwrite (flag wx), like the captures it copies.
// node node_modules/tsx/dist/cli.mjs tools/capture-one-use-content-items-cursor.mts --out test/fixtures/battle-cursor-one-use-content-items.json
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBattle } from '../src/core/battle.js'
import { battleCursorCases } from '../test/battle-cursor-cases.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const prior = JSON.parse(readFileSync('test/fixtures/battle-cursor-combine-one-move.json', 'utf8')) as { cases: { id: string; events: string; state: string; rng: string; result: unknown }[] }
const cases = battleCursorCases().map(({ id, create }) => {
  const ctx = create()
  const result = runBattle(ctx)
  const was = prior.cases.find((row) => row.id === id)
  const events = hash(ctx.events), state = hash(ctx.state), rng = hash(ctx.rng.log)
  const changed = was !== undefined && (was.events !== events || was.state !== state)
  const stateOnly = changed && was!.events === events && was!.rng === rng && JSON.stringify(was!.result) === JSON.stringify(result)
  return { id, events, state, rng, result, changed, ...(changed ? { stateOnly } : {}), ...(was === undefined ? { added: true } : {}) }
})
const note = 'The six one-use content items (2026-10-06): content.one-use-class-powers-reworded, content.one-use-items-reworded, content.used-twice-rules-removed, content.banner-heroism-own-miss, content.impersonation-badge, content.card-draw-badge-rules-cut, on the tree merged with engine master 42d8dd8. Cases marked changed differ from the combine-one-move capture; stateOnly means the events, the RNG and the result are unchanged; added marks a case the layer below does not hold.'
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'the six one-use content items', note, cases }, null, 2) + '\n', { flag: 'wx' })
console.log(`Captured ${cases.length} cases; changed: ${cases.filter((c) => c.changed).map((c) => `${c.id}${c.stateOnly ? ' (state only)' : ' (EVENTS/RNG/RESULT)'}`).join(', ') || 'none'}; added: ${cases.filter((c) => 'added' in c).map((c) => c.id).join(', ') || 'none'}.`)
