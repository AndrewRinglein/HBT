/* ══════════════════════════════════════════════════════════════════════════
   THE FOLD — pure. state × event → state, plus the CUES the draw side plays.
   No DOM, no clock of its own, no content it was not handed. This is the half
   of the viewer that the constitution's tests run over, that the kingdom can
   run without a screen, and that stage 3's folded-state test compares across
   a live log and a file (THREE-PACKAGES-PLAN §8.5).

   Everything on screen folds out of events. If it isn't in the log, it isn't
   on the screen. Split out of viewer-core.js 2026-09-02; the event handling is
   the same code, with the DOM side effects returned as cues instead of done.
   ══════════════════════════════════════════════════════════════════════════ */
import { stStyle } from './theme.js'
import { sgn } from './actions.js'

/* view-state clocks the fold stamps from the `now` it is handed — a beat's
   duration is the pump's business, but the fold knows WHICH beats linger */
const FIRE_MS = 1600, TRIG_MS = 1400, MISS_MS = 900

export function createState() {
  return {
    U: {},                 // id -> unit {id,name,typeId,side,hex,hp,maxHp,stam,maxStam,st,life,bleed,…}
    turnNo: 0, phase: 'hero', activeId: null,
    subjectId: null, subjectMode: 'acting',
    acted: {},             // id -> true, this phase (plain data — Law 5b)
    AIM: null, FIRING: null, TRIGFLASH: null,
    outcome: null,
  }
}

/** Fold ONE event into S. ctx = {UD, SN}. Returns the cues to play. */
export function fold(S, e, ctx, now = 0) {
  const { UD, SN } = ctx
  const U = S.U, cues = []
  const cue = (k, o) => cues.push({ k, ...o })
  const DCOL = { physical: '#ff5346', magic: '#6fb3ff', 'true': '#ffffff' }
  switch (e.type) {
    case 'unit.enter':
      U[e.actor] = { id: e.actor, name: e.name, typeId: e.typeId, side: e.side, hex: e.hex,
        hp: e.hp, maxHp: e.maxHp, stam: e.stamina, maxStam: e.maxStamina, st: {}, life: 'standing', bleed: 0,
        mvBase: (UD[e.typeId] || {}).movement ?? null, activeMv: null, mods: [], injuries: [], cds: {}, dmgSeen: {} }
      break
    /* fold the event's OWN numbers (fixed 2026-08-27): turn.begin carries a
       1-based `turn` and phase.begin carries `phase` — never count locally */
    case 'turn.begin': S.turnNo = e.turn ?? (S.turnNo + 1); break
    case 'phase.begin': if (e.phase) S.phase = e.phase; break
    case 'phase.end.done': S.phase = e.side === 'hero' ? 'enemy' : 'hero'; S.acted = {}; break
    case 'activation.begin':
      S.activeId = e.actor; S.subjectId = e.actor; S.subjectMode = 'acting'
      if (U[e.actor]) U[e.actor].activeMv = U[e.actor].mvBase
      S.AIM = null; cue('inspect.clear')          // FIRING and floats run their own clocks
      break
    case 'activation.end': S.acted[e.actor] = true; if (U[e.actor]) U[e.actor].activeMv = null; break
    case 'move.begin':
      /* moves light their own row too (ruled 2026-09-01) — causeId names the MoveDef */
      if (e.causeId) S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS }
      break
    case 'moved':
      if (U[e.actor]) { U[e.actor].hex = e.to; U[e.actor].activeMv = e.movePointsLeft
        cue('walk', { id: e.actor })
        if (e.causeId) S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS } }
      break
    case 'attack.declared':
      if (U[e.actor] && U[e.target]) {
        cue('lunge', { a: e.actor, t: e.target })
        const tdef = UD[U[e.target].typeId] || {}
        const mit = e.damageType === 'magic' ? (tdef.resist || 0) : (tdef.armor || 0)
        S.AIM = { from: U[e.actor].hex, to: U[e.target].hex, hit: e.hitChance,
          type: e.damageType, tgt: e.target, kind: e.kind,
          dmg: e.damageOnHit, mit, mitLabel: e.damageType === 'magic' ? 'resist' : 'armor' }
        /* the engine's OWN live damage for this attack — it carries Weak and
           every other live modifier; the action bar prints it, not a formula */
        if (e.damageOnHit != null) (U[e.actor].dmgSeen = U[e.actor].dmgSeen || {})[e.attackId] = e.damageOnHit
        S.FIRING = { unit: e.actor, ability: e.attackId, until: now + FIRE_MS }
        S.subjectId = e.target; S.subjectMode = 'target'
      } break
    case 'attack.hit':
      if (S.AIM) {
        cue('fx.attack', { kind: S.AIM.kind, dt: S.AIM.type, a: e.actor, t: e.target, dmg: S.AIM.dmg })
        if (e.crit) cue('float', { hex: U[S.AIM.tgt] ? U[S.AIM.tgt].hex : null, text: 'CRIT!', col: '#ffcf6a', big: true })
        /* the projection is a FORECAST — it clears at impact so the result
           number never shares the screen with it (ruled 2026-08-27) */
        S.AIM = null
      }
      break
    case 'attack.miss':
      /* ONE place says miss (2026-08-27): the lingering targeting line carries the roll */
      if (S.AIM) { S.AIM.missed = { roll: e.roll }; S.AIM.expire = now + MISS_MS
        cue('fx.attack', { kind: S.AIM.kind, dt: S.AIM.type, a: e.actor, t: e.target, dmg: S.AIM.dmg }) }
      if (S.activeId != null) { S.subjectId = S.activeId; S.subjectMode = 'acting' }
      break
    case 'damage.applied':
      if (U[e.target]) { U[e.target].hp = e.hpAfter
        cue('flash', { id: e.target })
        if (String(e.causeId || '').includes('status.')) cue('fx.tick', { id: e.target, cause: e.causeId })
        /* EVERY damage floats overhead and drifts up, coloured by damage type
           (ruled 2026-08-27): red physical, blue magic, white true. */
        cue('float', { hex: U[e.target].hex, text: '−' + e.amount, col: DCOL[e.damageType] || '#ffd9a0', big: true })
        if (e.resisted) cue('float', { hex: U[e.target].hex, text: e.resisted + ' resisted', col: '#9fb6c8', small: true })
        if (e.absorbed) cue('float', { hex: U[e.target].hex, text: e.absorbed + ' absorbed', col: '#8fd0ff', small: true })
        S.AIM = null
        if (S.activeId != null) { S.subjectId = S.activeId; S.subjectMode = 'acting' } }
      break
    case 'heal.applied':
      if (U[e.target]) { U[e.target].hp = e.hpAfter
        cue('float', { hex: U[e.target].hex, text: '+' + e.amount, col: '#8fe08a', big: true })
        cue('fx.status', { id: e.target, style: 'heal' }) }
      break
    case 'status.applied':
      if (U[e.target]) { U[e.target].st[e.statusId] = e.after
        if (e.after > e.before) { const st = stStyle(e.statusId)
          cue('float', { hex: U[e.target].hex, text: (SN[e.statusId] || e.statusId) + ' ' + sgn(e.after - e.before), col: st.hue })
          cue('fx.status', { id: e.target, style: e.statusId }) } }
      break
    case 'trigger.fired':
      /* No float (ruled 2026-08-27): the status.applied that follows floats the
         same words. The panel's ⚡ chip flash and the log name the cause. */
      S.TRIGFLASH = { unit: e.actor, id: e.causeId, until: now + TRIG_MS }
      if (e.actor != null) { S.subjectId = e.actor; S.subjectMode = 'acting' }
      break
    case 'status.reduced': if (U[e.target]) U[e.target].st[e.statusId] = e.after; break
    case 'status.expired': if (U[e.target]) delete U[e.target].st[e.statusId]; break
    case 'stamina.spent': case 'stamina.regen': case 'stamina.gained':
      if (U[e.actor]) U[e.actor].stam = e.stamina; break
    /* `knocked` MOVES A UNIT (folded 2026-09-01) — unhandled, knocked units
       rendered at a stale hex until their next move */
    case 'knocked':
      if (U[e.target]) { U[e.target].hex = e.to; cue('float', { hex: e.to, text: 'KNOCKED', col: '#cbb9a0', small: true }) }
      break
    case 'maxHp.lost':
      if (U[e.target]) { U[e.target].maxHp = e.maxHp; U[e.target].hp = e.hp
        cue('float', { hex: U[e.target].hex, text: '−' + e.amount + ' MAX HP', col: '#d1665c', small: true }) }
      break
    case 'staminaMax.lost':
      if (U[e.actor]) { U[e.actor].maxStam = e.maxStamina; U[e.actor].stam = e.stamina } break
    case 'statmod.added':
      /* the buff/debuff layer's data (UI-BUILD-NOTES §1), held on the unit */
      if (U[e.actor]) (U[e.actor].mods = U[e.actor].mods || []).push({ stat: e.stat, op: e.op, value: e.value, source: e.source })
      break
    case 'cooldown.set':
      if (U[e.actor]) (U[e.actor].cds = U[e.actor].cds || {})[e.abilityId] = e.readyOnTurn; break
    case 'crit.effect':
      /* a Critical Injury Chart row landed — the biggest single beat the engine emits */
      if (U[e.target]) { cue('float', { hex: U[e.target].hex, text: '✶ ' + e.name, col: '#ffcf6a', big: true })
        ;(U[e.target].injuries = U[e.target].injuries || []).push(e.name) }
      break
    case 'power.hit':
      if (U[e.target] && e.actor != null && e.target !== e.actor)
        cue('fx.attack', { kind: 'ranged', dt: 'magic', a: e.actor, t: e.target, dmg: 5 })
      break
    case 'life.downed': if (U[e.target]) U[e.target].life = 'downed'; break
    case 'life.dead': if (U[e.target]) U[e.target].life = 'dead'; break
    case 'bleedout.set': case 'bleedout.tick': if (U[e.target]) U[e.target].bleed = e.bleedOut; break
    case 'power.used':
      if (e.causeId) S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS }
      if (e.target != null && U[e.target] && e.target !== e.actor) cue('fx.attack', { kind: 'ranged', dt: 'magic', a: e.actor, t: e.target, dmg: 5 })
      else cue('fx.status', { id: e.actor, style: 'protection' })
      break
    case 'battle.end': S.outcome = e.outcome; break
  }
  return cues
}

/** Rebuild a state from scratch through events[0..n-1] — for scrub. Cues are
    dropped and the lingering view-state clocks are cleared: nothing should
    still be flashing after a jump. */
export function foldTo(events, n, ctx) {
  const S = createState()
  for (let i = 0; i < n && i < events.length; i++) fold(S, events[i], ctx, 0)
  S.AIM = null; S.FIRING = null; S.TRIGFLASH = null
  if (S.activeId != null) { S.subjectId = S.activeId; S.subjectMode = 'acting' }
  return S
}

/** The event types the fold knows. verify.mjs checks every packed log and the
    pump's duration table against this until the engine exports EVENT_TYPES
    (THREE-PACKAGES-PLAN §8.3). */
export const FOLDED_TYPES = ['unit.enter', 'turn.begin', 'phase.begin', 'phase.end.done', 'activation.begin',
  'activation.end', 'move.begin', 'moved', 'attack.declared', 'attack.hit', 'attack.miss', 'damage.applied',
  'heal.applied', 'status.applied', 'trigger.fired', 'status.reduced', 'status.expired', 'stamina.spent',
  'stamina.regen', 'stamina.gained', 'knocked', 'maxHp.lost', 'staminaMax.lost', 'statmod.added', 'cooldown.set',
  'crit.effect', 'power.hit', 'life.downed', 'life.dead', 'bleedout.set', 'bleedout.tick', 'power.used', 'battle.end']
