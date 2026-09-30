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
const AIM_KEYS = ['from', 'to', 'target', 'hit', 'dmg', 'hpAfter', 'lethal', 'locked']
export function playFacts(value, positions) {
  const fail = why => { throw new Error('invalid play facts: ' + why) }
  if (value === null) return null
  const object = (v, keys, what) => {
    if (!v || typeof v !== 'object' || Object.getPrototypeOf(v) !== Object.prototype) fail(what + ' is not a plain object')
    const names = Object.keys(v), optional = keys === KEYS ? ENDING_KEYS : []
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
  return { endTurn, endActivation: v.endActivation === true, actor: intOrNull(v.actor, 'actor'), slot: v.slot, reach: hexes(v.reach, 'reach'), zoc: hexes(v.zoc, 'zoc'),
    path: hexes(v.path, 'path', false), provokes: hexes(v.provokes, 'provokes'), ghost, threat, targets: hexes(v.targets, 'targets'), aim, note: v.note }
}
