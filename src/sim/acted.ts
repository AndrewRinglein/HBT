// THE ACTED SET — every event type that means the world CHANGED (Law 3: a
// mutator emitted it). One list, two readers: tools/probe.mts (gate 1 — did
// this id do anything in a real battle?) and src/sim/proving.ts (presence — did
// this subject do anything in the pair?). Moved here from probe.mts on
// 2026-09-04 (proving.rig) so the two never drift.
export const ACTED: ReadonlySet<string> = new Set(['damage.applied','heal.applied','power.used','attack.declared',
  'unit.enter','moved','ai.mode','status.applied','status.reduced','status.expired',
  'life.downed','life.dead','bleedout.set','bleedout.tick',
  // map.loaded added 2026-08-20 (landing map.showcase): a MAP's effect IS the
  // battles fought on it — loading onto the panel is the state it changes.
  // Widening ACTED is stricter, not looser: map items can now face gate 1
  // directly instead of hiding behind terrain probeIds.
  'map.loaded',
  // seam.items-per-unit (2026-09-02): an ITEM's effect is the unit it was put
  // on — attacks granted, stats folded at t=0 — and unit.equipped is the line
  // that says so. Same widening argument as map.loaded: items can face gate 1
  // by their own id instead of hiding behind the attacks they grant.
  'unit.equipped',
  // progression.level-table-by-type (2026-09-03): a hero grown at fielding — stats folded from its TABLE
  'unit.grown',
  // badge.mechanism (2026-09-04): a badge worn at fielding or gained mid-battle changed the unit
  'unit.badged', 'badge.gained',
  // seam.unit-mods (2026-09-25): a set bonus written onto one fielded hero changed the unit
  'unit.modified',
  // movement.bonus-actions (2026-08-25): a bonus move's rider IS its state
  // change — Focus moves zero hexes on purpose, so 'stamina.gained' is the only
  // mark it leaves. Same widening-is-stricter argument as map.loaded above.
  'stamina.gained', 'staminaMax.lost', 'statmod.added',
  // capability.knockback (2026-08-27): a knockback's state change is the hex
  // itself — 'knocked' is displacement, and a fully blocked push that only
  // logs knockback.blocked has genuinely changed nothing, so that one is
  // deliberately NOT here. Same widening-is-stricter argument as above.
  'knocked',
  // station.crit (2026-08-27): the chart's own state changes.
  'stamina.drained', 'maxHp.lost',
  // fix.downed-targetable (2026-09-03): a hit on the downed moves the counter,
  // and this is the line that says so. Widening, stricter, as above.
  'bleedout.accelerated',
  // encounter.runner (2026-09-03): an arrival is a unit that was not there
  // (unit.enter already counts); a shunt moved it; an objective outcome ended
  // the battle. Widening, stricter, as above.
  'unit.shunted', 'encounter.won', 'encounter.lost',
  // capability.power-pool (2026-09-03): the pool moved. Widening, stricter.
  'power.gained',
  // movement.zone-of-control / attack-of-opportunity (2026-09-03): a stop is a
  // move that did not finish; a provoke is a swing that would not have happened.
  'move.stopped', 'aoo.provoked',
  // capability.deathbed (2026-09-03): the roll's two outcomes both change the unit
  'deathbed.stood', 'deathbed.fell', 'deathbed.none',   // deathbed.none: Wounded at 0 dies with no roll (fix.deathbed-no-stands)
  // capability.surge (2026-09-03): a surge is another move and action
  'surge.hit',
  // capability.planted-banners (2026-10-05): an object planted on the board, and Surge Chance given to a unit
  'object.planted', 'surge.gained',
  // capability.placed-traps (2026-10-05): a trap put on the board, sprung, or taken off it
  'trap.placed', 'trap.sprung', 'trap.removed',
  // capability.corpses (2026-09-03): a body on the board, and what became of it
  'corpse.created', 'corpse.removed', 'unit.raised', 'corpse.eaten',
  // capability.ground-layers (2026-09-03): a stroke on the board
  'layer.painted', 'layer.cancelled', 'band.advanced',
  // encounter.area-fall (2026-09-28): areas marked on the board, and the fall that lands on them
  'area.marked', 'area.landed',
  // capability.vision (2026-09-03)
  'night.fell', 'light.cast',
  // capability.charges (2026-09-03): a use spent is a thing that cannot be undone this Battle
  'charge.spent', 'power.exhausted',
  // v2.prop-destroy (2026-09-24): a prop that took a step or fell is a changed board
  'prop.damaged', 'prop.destroyed',
  // v2.prop-attack (2026-09-24): an attack aimed at a prop's hex — always followed by prop.damaged
  'prop.struck',
  // ai.encounter-rules (2026-09-26): a unit bound by an encounter's AI rule is a
  // changed unit (its aiRules); a side's focus is state its units then act on.
  // Widening, stricter, as above.
  'ai.anchored', 'ai.coordinated', 'ai.focused'])
