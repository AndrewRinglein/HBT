/* ── THE PLAY INPUT'S FACTS (viewer.play-input, 2026-09-30; PLAYABLE-OPENING-PLAN.md item 7; engine DECISIONS.md
   2026-09-29 "the playable battle screen" and "the playable screen: the acting mark, pointing at an enemy, the
   forecast"; VFX/UI-BUILD-NOTES-2026-09-02.md §5). The host (the kingdom's play input) asks the engine and hands
   these over; the board draws them and decides nothing: which hexes the hero may walk to (reach), the enemies' zones
   of control (zoc, hatched), the engine's walk to the hex pointed at (path, in walk order) and where it provokes, the
   ghost, an enemy's reach (threat), the chosen action's legal targets, and the aim — the arrow and the forecast
   (hit chance, damage, the Health it would leave; lethal draws the skull). Validated whole, then copied, like the
   targeting facts (targeting.js): a malformed payload is the host's error, never drawn. No range, path, legality or
   number is worked out here. */
const KEYS = ['actor', 'slot', 'reach', 'zoc', 'path', 'provokes', 'ghost', 'threat', 'targets', 'aim', 'note']
/* viewer.play-chrome (2026-09-30; PLAYABLE-OPENING-PLAN.md item 8): the ending, optional so a host that only plans
   need not say it — endTurn {yetToAct: unit ids} while End Turn may be given (the engine's heroesYetToAct: a non-empty
   list is what the pop-up asks about), null or absent when it may not; endActivation true while the acting hero's
   activation may be ended (a paid primary ends it by itself — engine rule.primary-ends-activation). */
const ENDING_KEYS = ['endTurn', 'endActivation']
/* movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions are part of
   what's needed now"): the swap, optional too, while the acting hero carries something to swap. Null or absent: no swap on
   the bar.
   viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the
   unit's gear'; "Just the ability to swap hands with inventory"): {cost, choices, why, carried, refused} —
     carried  [{instance, item, name, held}]  everything the unit carries, hands first then stowed: what may be rearranged
     choices  [{label, hands}]                the hand lists the engine would take (instances, in carried order); confirming
                                              one offers {kind:'swap', index, unit} back
     refused  [{hands, why}]                  every other arrangement of what it carries, with the engine's own reason
     cost                                     the engine's swapCost, in stamina
     why                                      with no choice at all, the engine's reason (the swap is spent, no stamina …)
   Was {cost, choices: [{label}], why}: one button per hand list. */
/* viewer.switch-hero-asks (engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes asks first
   ...': "it should pop up and say, 'End activation of X hero and start activation of Y hero.'"; '... the switch pop-up is
   for any player unit': "And you can click yes or no."): the question, optional too — ask {kind:'switch', from, to} (unit
   ids) while the host wants the player asked whether to end the Activation of the unit acting and begin another's; the
   chrome draws the pop-up with their names and offers {kind:'answer', yes} back. Whether the question arises at all is the
   host's, from the engine. Null or absent: nothing is asked. */
const OPTIONAL_KEYS = [...ENDING_KEYS, 'swap', 'ask']
const AIM_KEYS = ['from', 'to', 'target', 'hit', 'dmg', 'hpAfter', 'lethal', 'locked']
export function playFacts(value, positions) {
  const fail = why => { throw new Error('invalid play facts: ' + why) }
  if (value === null) return null
  const object = (v, keys, what) => {
    if (!v || typeof v !== 'object' || Object.getPrototypeOf(v) !== Object.prototype) fail(what + ' is not a plain object')
    const names = Object.keys(v), optional = keys === KEYS ? OPTIONAL_KEYS : []
    if (keys.some(k => !Object.hasOwn(v, k)) || names.some(k => !keys.includes(k) && !optional.includes(k))) fail(what + ' must carry exactly ' + keys.join(', ') + (optional.length ? ' (and may carry ' + optional.join(', ') + ')' : ''))
  }
  const int = (v, what) => { if (!Number.isInteger(v)) fail(what + ' is not an integer'); return v }
  const intOrNull = (v, what) => v === null ? null : int(v, what)
  const hex = (h, what) => { if (!Number.isInteger(h) || h < 0 || !Object.hasOwn(positions, h)) fail(what + ' is not a board hex'); return h }
  const hexes = (a, what, distinct = true) => {
    if (!Array.isArray(a)) fail(what + ' is not an array')
    const out = a.map((h, i) => hex(h, what + '[' + i + ']'))
    if (distinct && new Set(out).size !== out.length) fail(what + ' repeats a hex')
    return out
  }
  object(value, KEYS, 'the facts')
  const v = value
  if (v.slot !== null && (typeof v.slot !== 'string' || !v.slot)) fail('slot')
  if (v.note !== null && typeof v.note !== 'string') fail('note')
  let ghost = null, threat = null, aim = null
  if (v.ghost !== null) { object(v.ghost, ['unit', 'hex'], 'ghost'); ghost = { unit: int(v.ghost.unit, 'ghost.unit'), hex: hex(v.ghost.hex, 'ghost.hex') } }
  if (v.threat !== null) { object(v.threat, ['unit', 'move', 'hit'], 'threat')
    threat = { unit: int(v.threat.unit, 'threat.unit'), move: hexes(v.threat.move, 'threat.move'), hit: hexes(v.threat.hit, 'threat.hit') } }
  if (v.aim !== null) { const a = v.aim; object(a, AIM_KEYS, 'aim')
    if (typeof a.lethal !== 'boolean' || typeof a.locked !== 'boolean') fail('aim.lethal and aim.locked are booleans')
    aim = { from: hex(a.from, 'aim.from'), to: hex(a.to, 'aim.to'), target: intOrNull(a.target, 'aim.target'), hit: intOrNull(a.hit, 'aim.hit'),
      dmg: intOrNull(a.dmg, 'aim.dmg'), hpAfter: intOrNull(a.hpAfter, 'aim.hpAfter'), lethal: a.lethal, locked: a.locked } }
  let endTurn = null
  if (v.endTurn != null) { object(v.endTurn, ['yetToAct'], 'endTurn')
    if (!Array.isArray(v.endTurn.yetToAct)) fail('endTurn.yetToAct is not an array')
    const ids = v.endTurn.yetToAct.map((id, i) => int(id, 'endTurn.yetToAct[' + i + ']'))
    if (new Set(ids).size !== ids.length) fail('endTurn.yetToAct repeats a unit')
    endTurn = { yetToAct: ids } }
  if (v.endActivation !== undefined && typeof v.endActivation !== 'boolean') fail('endActivation is a boolean')
  let swap = null
  if (v.swap != null) { object(v.swap, ['cost', 'choices', 'why', 'carried', 'refused'], 'swap')
    const word = (x, what) => { if (typeof x !== 'string' || !x) fail(what); return x }
    const list = (a, what) => { if (!Array.isArray(a)) fail(what + ' is not an array'); return a }
    const carried = list(v.swap.carried, 'swap.carried').map((c, i) => { const at = 'swap.carried[' + i + ']'; object(c, ['instance', 'item', 'name', 'held'], at)
      if (typeof c.held !== 'boolean') fail(at + '.held is a boolean')
      return { instance: word(c.instance, at + '.instance'), item: word(c.item, at + '.item'), name: word(c.name, at + '.name'), held: c.held } })
    if (new Set(carried.map(c => c.instance)).size !== carried.length) fail('swap.carried repeats an instance')
    /* a hand list names instances the unit carries, each once */
    const hands = (a, what) => { const out = list(a, what).map((x, i) => word(x, what + '[' + i + ']'))
      if (new Set(out).size !== out.length || out.some(x => !carried.some(c => c.instance === x))) fail(what + ' names an instance twice, or one the unit does not carry')
      return out }
    const choices = list(v.swap.choices, 'swap.choices').map((c, i) => { const at = 'swap.choices[' + i + ']'; object(c, ['label', 'hands'], at)
      return { label: word(c.label, at + '.label'), hands: hands(c.hands, at + '.hands') } })
    const refused = list(v.swap.refused, 'swap.refused').map((c, i) => { const at = 'swap.refused[' + i + ']'; object(c, ['hands', 'why'], at)
      return { hands: hands(c.hands, at + '.hands'), why: word(c.why, at + '.why') } })
    if (v.swap.why !== null && typeof v.swap.why !== 'string') fail('swap.why')
    swap = { cost: int(v.swap.cost, 'swap.cost'), choices, why: v.swap.why, carried, refused } }
  let ask = null
  if (v.ask != null) { object(v.ask, ['kind', 'from', 'to'], 'ask')
    if (v.ask.kind !== 'switch') fail('ask.kind is not a question the screen knows')
    ask = { kind: 'switch', from: int(v.ask.from, 'ask.from'), to: int(v.ask.to, 'ask.to') } }
  return { endTurn, endActivation: v.endActivation === true, swap, ask, actor: intOrNull(v.actor, 'actor'), slot: v.slot, reach: hexes(v.reach, 'reach'), zoc: hexes(v.zoc, 'zoc'),
    path: hexes(v.path, 'path', false), provokes: hexes(v.provokes, 'provokes'), ghost, threat, targets: hexes(v.targets, 'targets'), aim, note: v.note }
}
