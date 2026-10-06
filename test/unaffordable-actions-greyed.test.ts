// viewer.unaffordable-actions-greyed — the host's half. Ruled 2026-10-05 (Andrew, engine/DECISIONS.md 'a prone unit only stands;
// Stand Up is its one move; …; what cannot be paid is greyed; …'): asked what is chosen when attack one cannot be paid for —
// "If a tax can't be paid for or a power can't be paid for, it should be grayed out." ('tax' is 'attack' - dictation.)
//
// The play input says ONE new thing to the bar, and it is the engine's answer: `cantPay` — every action the acting unit is
// granted that the engine's one limits check (actionReady) refuses, each with one line that says why, read from the
// engine's own numbers in the order that check asks them: its Stamina against the action's cost, the Turn it is ready on
// (a cooldown, or the warm-up its row wrote at fielding), a use. The bar greys those and nothing else; a press on one is
// answered by its line and changes nothing; the moment the engine takes the action again it is off the list. A unit that
// is down names none here — its actions wait on the stand (standFirst). No rule of the host's own.
//
// The expect: "A hero with 1 Stamina shows its 2-Stamina attack greyed with the reason on hover, and its 0- and 1-Stamina
// actions lit; a power on cooldown is greyed with the Turns left; a once-per-Battle power already used is greyed; after a
// Turn restores Stamina the attack is lit again; after a move with attack one unaffordable, no attack is chosen; a hero who
// can pay for everything shows the bar it showed before."
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, type Sandbox } from '../src/core/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { unpaidLine } from '../src/ui/refusals.js'
import { encounterDef, isMove, isAttack, grantedActionIds, actionReady, staminaCostOf, readyOn, standsUp, type BattleCommand } from '../src/engine.js'
import { drainStamina, gainStamina } from '../../engine/src/core/mutate.js'
import { spendAction } from '../../engine/src/core/action.js'
import { applyStatus } from '../../engine/src/core/status.js'
import { kdbDownStatus } from '../../engine/src/core/kdb.js'

const ORPHANAGE = 'encounter.opening.orphanage', DWARF = 'hero.base.warrior-iron'
type U = Sandbox['ctx']['state']['units'][number]
function battle1(hero = DWARF) {
  const s = createSandbox({ mapId: encounterDef(ORPHANAGE).mapId!, heroes: [hero], enemies: [], seed: 1, encounterId: ORPHANAGE })
  advanceSandbox(s)
  const P = createPlayInput(() => s, (c: BattleCommand) => commandSandbox(s, c))
  const me = () => s.ctx.state.units.find((x) => x.typeId === hero)!
  const acting = () => (s.ctx.battleCursor?.at === 'acting' ? s.ctx.battleCursor.actor : null)
  const begin = (u: U) => { if (acting() === u.id) return; P.input({ kind: 'choose', id: u.id }); expect(acting(), `${u.name}'s Activation`).toBe(u.id) }
  const act = (id: string) => s.ctx.actions[id]!
  const granted = (u: U) => grantedActionIds(s.ctx, u)
  /** what the engine's one limits check refuses the unit now, of what it grants it */
  const refused = (u: U) => granted(u).filter((id) => !actionReady(s.ctx, u, act(id)))
  const named = () => (P.facts().cantPay ?? []).map((c) => c.id)
  const why = (id: string) => (P.facts().cantPay ?? []).find((c) => c.id === id)?.why
  const standOf = (u: U) => granted(u).find((id) => standsUp(act(id))) ?? null
  /** the fact is the engine's answer, action for action (a unit that is down names none: its actions wait on the stand) */
  const agree = (u: U, when: string) => expect([...named()].sort(), `${when}: the fact names exactly what the engine refuses`).toEqual(standOf(u) === null ? refused(u).sort() : [])
  /** the unit's Stamina brought to `n` by the engine's own mutators */
  const staminaTo = (u: U, n: number) => { if (u.stamina > n) drainStamina(s.ctx, u.id, u.stamina - n, 'viewer.unaffordable-actions-greyed'); else if (u.stamina < n) gainStamina(s.ctx, u.id, n - u.stamina, 'viewer.unaffordable-actions-greyed'); expect(u.stamina).toBe(n) }
  const nextTurn = (u: () => U) => { if (acting() !== null) P.input({ kind: 'end-activation' }); if (acting() !== null) P.input({ kind: 'end-activation' }); P.input({ kind: 'end-turn' }); begin(u())
    /* knocked down meanwhile by the Zombies: it stands (one press), so what it can pay for is the question again */
    const stand = standOf(u()); if (stand !== null && acting() === u().id) P.input({ kind: 'slot', actionId: stand, unit: u().id }) }
  return { s, P, me, begin, acting, act, granted, refused, named, why, agree, staminaTo, nextTurn }
}
const names = (s: Sandbox, ids: readonly string[]) => ids.map((id) => s.ctx.actions[id]!.name).join(', ') || 'none'

describe('viewer.unaffordable-actions-greyed — what the acting unit cannot pay for is the engine\'s answer, with a line that says why', () => {
  it('a hero who can pay for everything: the fact is there and names nothing', () => {
    const b = battle1(), u = b.me(); b.begin(u)
    expect(b.refused(u), 'the engine takes every action of a fresh hero').toEqual([])
    expect(P_facts(b).cantPay, 'the fact is there').toEqual([])
  })

  it('a hero with 1 Stamina: every action that costs 2 or more is named with "Not enough Stamina: needs N, has 1.", its 0- and 1-Stamina actions are not; a press on one is answered by its line and changes nothing', () => {
    const b = battle1(), { s, P } = b, u = b.me(); b.begin(u)
    const all = b.granted(u), dear = all.filter((id) => staminaCostOf(u, b.act(id)) >= 2), cheap = all.filter((id) => staminaCostOf(u, b.act(id)) <= 1)
    expect(dear.some((id) => isAttack(b.act(id))), `it has an attack that costs 2 or more (${names(s, dear)})`).toBe(true)
    expect(cheap.some((id) => isAttack(b.act(id))) && cheap.some((id) => isMove(b.act(id))), `and an attack and a move that cost 1 or less (${names(s, cheap)})`).toBe(true)
    b.staminaTo(u, 1)
    b.agree(u, 'at 1 Stamina')
    expect([...b.named()].sort()).toEqual([...dear].sort())
    for (const id of dear) expect(b.why(id), b.act(id).name).toBe(`Not enough Stamina: needs ${staminaCostOf(u, b.act(id))}, has 1.`)
    // the press: answered in words, nothing chosen, nothing happens
    const began = P.facts(), from = s.ctx.events.length
    for (const id of dear) {
      expect(P.input({ kind: 'slot', actionId: id, unit: u.id }), 'the press is answered').toBe(true)
      const f = P.facts()
      expect(f.note).toBe(b.why(id)); expect(f.slot, 'it is not chosen').toBe(began.slot); expect(f.slot).not.toBe(id)
      expect(f.reach).toEqual(began.reach); expect(f.targets).toEqual(began.targets); expect(s.ctx.events.length, 'nothing happened').toBe(from)
    }
    // an attack it can pay for is chosen as before
    const lit = cheap.find((id) => isAttack(b.act(id)))!
    expect(P.input({ kind: 'slot', actionId: lit, unit: u.id })).toBe(true); expect(P.facts().slot).toBe(lit)
    console.log(`  ${u.name} at 1 Stamina: greyed — ${names(s, dear)}; lit — ${names(s, cheap)}`)
  })

  it('the moment it can be paid it is off the list: Stamina given back in the same Activation, and a Turn that restores Stamina', () => {
    const b = battle1(), { s } = b, u = b.me(); b.begin(u)
    const dear = b.granted(u).filter((id) => staminaCostOf(u, b.act(id)) >= 2)
    b.staminaTo(u, 1); expect(b.named().length).toBe(dear.length)
    b.staminaTo(u, 2); b.agree(u, 'at 2 Stamina'); for (const id of dear.filter((x) => staminaCostOf(u, b.act(x)) === 2)) expect(b.named(), b.act(id).name).not.toContain(id)
    // a Turn: the engine's own regeneration
    b.staminaTo(u, 0); b.agree(u, 'at 0 Stamina')
    const paid = b.granted(u).filter((id) => staminaCostOf(u, b.act(id)) > 0); for (const id of paid) expect(b.named()).toContain(id)
    let turns = 0
    while (b.me().stamina < Math.max(...dear.map((id) => staminaCostOf(b.me(), b.act(id)))) && turns < 8) { b.nextTurn(b.me); turns++; b.agree(b.me(), `Turn +${turns}, ${b.me().stamina} Stamina`) }
    expect(turns, 'Turns pass and Stamina comes back by itself').toBeGreaterThan(0)
    for (const id of dear) expect(b.named(), `${b.act(id).name} is lit again`).not.toContain(id)
    console.log(`  ${b.me().name}: ${turns} Turn(s) restored its Stamina to ${b.me().stamina} and ${names(s, dear)} left the list`)
  })

  it('a power on cooldown is named with the Turns left, one fewer each Turn, and leaves the list the Turn the engine takes it again', () => {
    const b = battle1(), { s } = b, u = b.me(); b.begin(u)
    const cd = b.granted(u).find((id) => !!b.act(id).cooldown)
    expect(cd, `${u.name} holds an action with a cooldown`).toBeTruthy()
    const a = b.act(cd!)
    // the engine's own spend (THE ONE SPEND: Stamina, the cooldown) — the use itself is not this file's subject
    b.staminaTo(u, u.maxStamina)
    spendAction(s.ctx, u.id, a, 'primary')
    b.staminaTo(u, u.maxStamina)
    const left = () => readyOn(b.me(), cd!) - s.ctx.state.turn
    expect(left(), 'the engine set its cooldown').toBe(a.cooldown! + 1)
    expect(actionReady(s.ctx, u, a)).toBe(false)
    const seen: number[] = []
    for (let i = 0; i < 8 && left() > 0; i++) {
      b.agree(b.me(), `${left()} Turn(s) left`)
      expect(b.why(cd!), a.name).toBe(`On cooldown: ready in ${left()} ${left() === 1 ? 'Turn' : 'Turns'}.`)
      seen.push(left()); b.nextTurn(b.me); b.staminaTo(b.me(), b.me().maxStamina)
    }
    expect(seen, 'the count goes down a Turn at a time').toEqual(Array.from({ length: a.cooldown! + 1 }, (_, i) => a.cooldown! + 1 - i))
    expect(b.named(), `${a.name} is lit again`).not.toContain(cd)
    console.log(`  ${b.me().name}'s ${a.name} (cooldown ${a.cooldown}): named for ${seen.join(', ')} Turn(s) left, then lit`)
  })

  it('the words: one plain line for each question the engine\'s check asks, and a unit that is down names none', () => {
    expect(unpaidLine({ kind: 'stamina', needs: 2, has: 1 })).toBe('Not enough Stamina: needs 2, has 1.')
    expect(unpaidLine({ kind: 'cooldown', turns: 1 })).toBe('On cooldown: ready in 1 Turn.')
    expect(unpaidLine({ kind: 'cooldown', turns: 3 })).toBe('On cooldown: ready in 3 Turns.')
    expect(unpaidLine({ kind: 'warm-up', turns: 2 })).toBe('Warming up: ready in 2 Turns.')
    expect(unpaidLine({ kind: 'uses' })).toBe('No uses left this Battle.')
    const b = battle1(), { s, P } = b, u = b.me()
    applyStatus(s.ctx, u.id, kdbDownStatus(s.ctx)!, 1, 'viewer.unaffordable-actions-greyed', s.ctx.state.units.find((x) => x.side === 'enemy')!.id)
    b.begin(u); b.staminaTo(u, 0)
    expect(P.facts().cantPay, 'down: its actions wait on the stand, one reason at a time').toEqual([])
    expect(P.facts().standFirst!.length).toBeGreaterThan(0)
  })

  it('a warm-up not done and a use already spent, each read from the engine\'s own state: named with its own line while the engine refuses the action', () => {
    /* No hero of the opening is fielded holding an action with a warm-up or with uses, so the STATE is made by hand here, and
       only here, on the engine's own fields (the Turn an action is ready on; its uses left) — exactly what its fielding writes
       for a row with a warm-up, and what is left when an item's uses are counted out. What is held is the reading: the
       engine refuses, the fact names it, and the line is the one for that question. A power whose LAST use is spent by the
       engine leaves the unit's list (engine core/action.ts spendUse, ruled 2026-09-02: "they should vanish from the list") —
       so it is off the bar, as it was before this item (kingdom SWITCHES unpaidUsedUpVanishes). */
    const b = battle1(), { s } = b, u = b.me(); b.begin(u)
    const id = b.granted(u).find((x) => !isMove(b.act(x)) && !b.act(x).cooldown && staminaCostOf(u, b.act(x)) === 0)!
    expect(id).toBeTruthy()
    const rows = s.ctx as unknown as { actions: Record<string, unknown> }, own = rows.actions, row = b.act(id), turn = s.ctx.state.turn
    // a warm-up of two Turns, as fielding writes it: the row says warm-up W, and the unit is ready on Turn W + 1
    rows.actions = { ...own, [id]: { ...row, warmup: turn + 1 } }; u.cooldowns[id] = turn + 2
    b.agree(u, 'warming up'); expect(b.why(id)).toBe('Warming up: ready in 2 Turns.')
    rows.actions = own; delete u.cooldowns[id]; b.agree(u, 'ready'); expect(b.named()).not.toContain(id)
    // uses counted out
    rows.actions = { ...own, [id]: { ...row, uses: 1 } }; u.usesLeft[id] = 0
    b.agree(u, 'no use left'); expect(b.why(id)).toBe('No uses left this Battle.')
    rows.actions = own; delete u.usesLeft[id]; b.agree(u, 'ready again'); expect(b.named()).not.toContain(id)
  })

  it('after a move with attack one unaffordable no attack is chosen, and attack one is named with why', () => {
    const b = battle1(), { s, P } = b, u = b.me(); b.begin(u)
    const attacks = b.granted(u).filter((id) => isAttack(b.act(id)))
    expect(staminaCostOf(u, b.act(attacks[0]!)), 'attack one costs Stamina').toBeGreaterThan(0)
    const hex = P.facts().reach[0]!, cost = sandboxChoices(s).find((c) => c.command.actor === u.id && 'destination' in c.command && c.command.destination === hex)!.cost
    b.staminaTo(u, cost)
    expect(P.input({ kind: 'hex', hex })).toBe(true); expect(P.input({ kind: 'hex', hex })).toBe(true)
    expect(u.stamina, 'nothing is left for attack one').toBe(0)
    if (b.acting() === u.id) {
      const f = P.facts()
      expect(f.slot === null || isMove(b.act(f.slot)), 'no attack is chosen — Punch is not chosen in its place').toBe(true)
      expect(b.why(attacks[0]!)).toBe(`Not enough Stamina: needs ${staminaCostOf(u, b.act(attacks[0]!))}, has 0.`)
      b.agree(u, 'after the walk')
    }
  })

  it('the page: on the built battle screen a hero at 1 Stamina shows its dearer actions greyed with the reason, the rest lit, and lit again when it can pay', () => {
    const out = execFileSync(process.execPath, ['tools/unaffordable-actions-greyed.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/unaffordable-actions-greyed: .* passed/)
    for (const line of out.split('\n').filter((l) => /^  /.test(l))) console.log(line)
  }, 240000)
})

function P_facts(b: ReturnType<typeof battle1>) { return b.P.facts() }
