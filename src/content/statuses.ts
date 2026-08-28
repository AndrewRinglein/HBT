// The status registry. Explicit object, never decorators — greppability and
// deterministic load order both matter (Law 6).

import type { StatusDef } from '../core/status.js'
import { statusDamage, statusHeal } from '../core/status.js'
import { omitDisabled } from './disable.js'

// PUBLISHED SOURCE: `1-EFFECTS-SETTLED.md` § status.*
// Only ids published there may appear in this file. `status.burn` was implemented
// here and removed on 2026-08-14 — that document says outright it "is not yet
// shaped, so do not reference it from another session yet", and it was referenced.
const RAW_STATUSES: Readonly<Record<string, StatusDef>> = {
  // Shapes are a checklist, not a branch — see StatusDef. What differs between
  // these is only which hooks each one declares.
  'status.poison': {
    // RULED 2026-08-20: counters accumulate and tick down; pool is reserved for
    // spent-when-consumed (protection). 1-EFFECTS-SETTLED amended with a CHANGED entry.
    id: 'status.poison', name: 'Poison', shape: 'counter', stacking: 'add',
    tickDamageType: 'magic',   // RULED 2026-08-27: 'poison and burn is magic damage... reduced by resist' — same arithmetic as the 2026-08-20 flag, now typed
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'status.poison'),
  },
  'status.burn': {
    // Codex-published (79 uses). Same tick as poison — damage equal to value,
    // Resist-mitigated (ruled 2026-08-20), decay 1 — AND halves all healing
    // received while held (§5: halves, never blocks). 1-EFFECTS-SETTLED's regen
    // row already says "halved while status.burn is present"; the halving is
    // read by applyHealing from the halvesHealing flag, one code path.
    id: 'status.burn', name: 'Burn', shape: 'counter', stacking: 'add',
    tickDamageType: 'magic',   // ruled 2026-08-27, see poison
    halvesHealing: true,
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'status.burn'),
  },
  'status.regeneration': {
    // PUBLISHED: 1-EFFECTS-SETTLED.md — "Heals equal to its value at End of Phase,
    // then −1 — poison's mirror, so one number reads both directions."
    // The halved-while-Burn clause is deliberately NOT here: the same file says
    // status.burn is not yet shaped, do not reference it.
    id: 'status.regeneration', name: 'Regeneration', shape: 'counter', stacking: 'add',
    onPhaseEnd: (ctx, unitId, value) => statusHeal(ctx, unitId, value, 'status.regeneration'),
  },
  'status.stun': {
    // PUBLISHED: 1-EFFECTS-SETTLED.md § status.* (row added 2026-08-20);
    // GAME-DESIGN §5 "Stunned | the unit cannot act | −1"; Codex census: stun,
    // 22 uses — the Codex name is Stun (fresh over stale). blocksAction is read
    // by isBlocked() in the turn loop: the whole Activation is skipped — no move,
    // no primary — and the End of Activation ladder still runs (a stunned hero
    // in the river still soaks). Default decay 1: Stun N = N lost activations.
    id: 'status.stun', name: 'Stun', shape: 'counter', stacking: 'add',
    blocksAction: true,
  },
  'status.bleed': {
    // PUBLISHED: 1-EFFECTS-SETTLED.md § status.* (row added 2026-08-20); Codex
    // census: bleed, 63 uses — "Bleed ticks a flat 2 and Resist never touches
    // it"; GAME-DESIGN §5: "flat 2 damage — its value is a turn counter, not a
    // magnitude". The tick is typed TRUE (ruled 2026-08-27: "Bleed damage is
    // true damage") — the exact seam
    // statusDamage was built with (ruled 2026-08-20: burn/poison per tick,
    // "never bleed"). The tick amount is the constant 2, not the value.
    id: 'status.bleed', name: 'Bleed', shape: 'counter', stacking: 'add',
    tickDamageType: 'true',   // explicit since 2026-08-27; flat as ever
    onPhaseEnd: (ctx, unitId, _value) => statusDamage(ctx, unitId, 2, 'status.bleed'),
  },
  'status.protection': {
    // PUBLISHED: 1-EFFECTS-SETTLED.md § status.* (row added 2026-08-20); Codex
    // census: protection, 40 uses ("Protection decays 1 a Phase and is spent by
    // what it absorbs, so it limits itself" — Angela, Codex Martyr row);
    // COMBAT-SEQUENCE: "a depleting pool that also decays". The POOL shape made
    // real: absorbed at station PROTECTION (550, before armor/resist), spent by
    // spendAbsorb after the hit — preview never spends. Additive per the
    // answered protectionStacking switch; default decay 1 stops banking.
    id: 'status.protection', name: 'Protection', shape: 'pool', stacking: 'add',
    reducesIncomingDamage: true,
  },
  'test.status.ward': {
    // TESTING LANE — the second reducesIncomingDamage pool, proving the station
    // consumes data, not a name (and the second shield SWITCHES.md says makes
    // absorbSpendOrder observable: 'status.protection' < 'test.status.ward', so
    // Protection pays first). Never ships.
    id: 'test.status.ward', name: 'Ward (testing)', shape: 'pool', stacking: 'add',
    reducesIncomingDamage: true,
  },
  'status.dazed': {
    // PUBLISHED: the Critical Injury Chart (settled.json critChart, dictated
    // 2026-08-27) — "Dazed | loses access to class powers, 3 turns". A
    // counter: locksPowers is read by canUsePower; standard decay 1 per own
    // End of Activation, and one activation per Turn makes value 3 the
    // dictated three turns. Attacks and movement are untouched — only the
    // POWERS are gone.
    id: 'status.dazed', name: 'Dazed', shape: 'counter', stacking: 'add',
    locksPowers: true,
  },
  'status.weak': {
    // PUBLISHED: 1-EFFECTS-SETTLED.md § status.* (row added 2026-08-20);
    // GAME-DESIGN §5 "Weakness | −1 damage per point. It reduces damage dealt,
    // not the Strength and Precision stats | −1"; Codex census: weak, 38 uses —
    // the Codex name is Weak, fresh over stale, so the id follows it. Read at
    // pipeline station SOURCE_STATUS (250) by outgoingPenalty — attacks AND
    // powers, one damage function. Never ticks damage; decays 1.
    id: 'status.weak', name: 'Weak', shape: 'modifier', stacking: 'add',
    reducesOutgoingDamage: true,
  },
  'test.status.enfeeble': {
    // TESTING LANE — the second reducesOutgoingDamage instance, proving the
    // station consumes data, not a name. Never ships.
    id: 'test.status.enfeeble', name: 'Enfeeble (testing)', shape: 'modifier', stacking: 'add',
    reducesOutgoingDamage: true,
  },
  'status.slow': {
    // PUBLISHED: 1-EFFECTS-SETTLED.md § status.* (row added 2026-08-20);
    // GAME-DESIGN §5 "Slow | reduces Movement by its value | −1"; Codex
    // 2026-08-20 sub-note: "A one-Turn Movement loss is now the Slow status —
    // apply N Slow" (19 uses). Read once at beginActivation; floor 0 — at zero
    // points the unit still acts from where it stands. Never ticks damage.
    id: 'status.slow', name: 'Slow', shape: 'counter', stacking: 'add',
    reducesMovement: true,
  },
  'test.status.hobble': {
    // TESTING LANE — the second reducesMovement instance, proving the slot is
    // pure data. Never ships.
    id: 'test.status.hobble', name: 'Hobble (testing)', shape: 'counter', stacking: 'add',
    reducesMovement: true,
  },
  'test.status.daze': {
    // TESTING LANE (ruled 2026-08-20) — the second blocksAction instance, proving
    // the slot is pure data (the generalization gate's variant). Never ships;
    // retire when a published second stunner (Dazed, crit chart) arrives.
    id: 'test.status.daze', name: 'Daze (testing)', shape: 'counter', stacking: 'add',
    blocksAction: true,
  },
}

// Kill-switch seam — identical object when CF_DISABLE_IDS is unset.
export const STATUSES = omitDisabled(RAW_STATUSES)
