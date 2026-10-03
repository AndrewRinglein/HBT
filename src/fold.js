/* ══════════════════════════════════════════════════════════════════════════
   THE FOLD — pure. state × event → state, plus the CUES the draw side plays.
   No DOM, no clock of its own, no content it was not handed. This is the half
   of the viewer that the constitution's tests run over, that the kingdom can
   run without a screen, and that stage 3's folded-state test compares across
   a live log and a file (THREE-PACKAGES-PLAN §8.5).

   Everything on screen folds out of events. If it isn't in the log, it isn't
   on the screen. Split out of viewer-core.js 2026-09-02; the event handling is
   the same code, with the DOM side effects returned as cues instead of done.

   2026-09-03: brought current with the engine's feature run
   (engine/EVENTS-FOR-THE-VIEWER-2026-09-03.md) — arrivals at any seq, the
   encounter events, corpses and ground layers as board objects, zones of
   control and attacks of opportunity, the Deathbed, Surge, Power, and the kit
   a unit is fielded with (unit.equipped).
   ══════════════════════════════════════════════════════════════════════════ */
import { sgn } from './actions.js'

/* view-state clocks the fold stamps from the `now` it is handed — a beat's
   duration is the pump's business, but the fold knows WHICH beats linger */
const FIRE_MS = 1600, TRIG_MS = 1400, MISS_MS = 900

export function createState() {
  return {
    U: {},                 // id -> unit {id,name,typeId,side,hex,hp,maxHp,stam,maxStam,st,life,bleed,…}
    turnNo: 0, phase: 'hero', activeId: null,
    activations: 0,         // activation.begin events folded — a new Activation of the same unit is still new (viewer.turn-taking)
    subjectId: null, subjectMode: 'acting',
    acted: {},             // id -> true, this phase (plain data — Law 5b)
    BURST: null,            // durable engine declaration + recipient summaries; visibility belongs to pump
    AIM: null, FIRING: null, TRIGFLASH: null,
    ATTACK: null,          // the declared attack {kind, dt, dmg} — outlives AIM, so an ordinary attack's
                           // following damage beats still know what struck them
    critPending: false,    // the attack.hit that just landed was a crit; the damage beat reads it
    outcome: null,
    /* ── 2026-09-03 ── */
    begun: false,          // battle.begin has passed: a unit.enter after it is an ARRIVAL, not the roster
    corpses: {},           // corpse id -> {id, hex, of, typeId, side} — board objects (corpse.created/removed)
    layers: {},            // hex -> painted ground layer number (only non-zero hexes are keys)
    power: null,           // the enemy side's Power pool after the last power.gained; null until one
    encounter: null,       // {id, name, gaps, objectives:[unit ids], result?}
    AOO: null,             // {holder, mover, attackId} while a free swing interrupts the mover's walk
    board: null,           // {width, height, deploy:{hero, enemy}} from map.loaded (engine 5603c40, §10)
    props: null,           // detached initial prop facts; null only before map.loaded
  }
}

/** a unit's row in S.U — one shape, whether it entered at setup or arrived */
function mkUnit(e, UD) {
  return { id: e.actor, name: e.name, typeId: e.typeId, side: e.side, hex: e.hex,
    hp: e.hp, maxHp: e.maxHp, stam: e.stamina, maxStam: e.maxStamina, st: {}, stBy: {}, life: 'standing', bleed: 0,
    /* `mvBase` was the resting movement until mvOf() read it off the sheet plus
       the log's modifiers (2026-09-03); it is kept OUT rather than set-and-unread */
    activeMv: null, moveUsed: false, primaryUsed: false, mods: [], injuries: [], cds: {}, dmgSeen: {},
    /* the kit the engine fielded this unit with (unit.equipped): items, the
       attacks they grant, the powers they grant — the bare row has none of it */
    kit: { items: [], grants: [], abilities: [], badges: [], held: [] },
    /* V2 R6 (engine v2.loadout / v2.loadout-swap, 2026-09-24): the item INSTANCES in
       hand (unit.equipped's instanceId, in order) and stowed (unit.enter's `stowed`);
       loadout.swapped moves them. `kit.held` is one row per in-hand instance — what its
       unit.equipped granted — so a swap can take exactly that instance's grants away. */
    hands: [], stowed: (e.stowed || []).map(i => ({ instanceId: i.instanceId, itemId: i.itemId })),
    /* THE DEATHBED, REVERSED (engine b4cbd9b, 2026-09-04): no stands, no wound
       levels — `woundLevel` is gone from the engine. A unit that stood carries
       the Wounded BADGE and wears a small red skull from here on (Angela). */
    deathbed: false,        // stood at the Deathbed: the skull, permanent
    badges: [],             // badge ids (unit.badged at fielding, badge.gained mid-battle)
    rolls: null,            // Deathbed Fighting rolls made, from deathbed.stood/fell `ordinal`
    spent: [],              // actions whose charges ran out (power.exhausted) — they leave the bar
    charges: {},            // actionId -> uses left (charge.spent)
    /* V2 R6 item uses (engine v2.item-uses, 2026-09-24): a use belongs to the item instance.
       spentItems = the instances carried in already spent (unit.enter's `spent`); itemUses =
       instanceId -> { itemId, left } as charge.spent states it (instanceLeft 0 = spent). */
    spentItems: [...(e.spent || [])],
    itemUses: {},
    surgeChance: null,      // the accumulating chance (surge.checked); declared here so the row shape never varies
    prone: null,            // v2.prone (2026-09-23): the prone status ids from unit.proned; null once unit.stood says it stood
    arrived: e.arrived || null, raised: false, objective: false, hunt: null, confusedFrom: null, moveMods: null, aiOverride: null, grown: null }
}

/** Fold ONE event into S. ctx = {UD, SN}. Returns the cues to play. */
/* A prop's word on a float: the last segment of its id ('prop.test.well' → WELL).
   Text, never a number. */
const propWord = id => String(id ?? '').split('.').pop().toUpperCase()
/* The collision a push ended in (knocked / knockback.blocked name it: collidedWith,
   blocker, collisionValue, remaining). The float names what was struck and the
   blocker's collision value, verbatim from the event (n/of). */
const COLLIDED = { unit: 'A BODY' }   // 'edge' and 'floor' read as the engine's own word

export function fold(S, e, ctx, now = 0) {
  const { UD, SN } = ctx
  const U = S.U, cues = []
  const cue = (k, o) => cues.push({ k, ...o })
  const collisionCue = (e, hex) => { if (!e.collidedWith) return
    const what = e.collidedWith === 'prop' ? propWord(e.blocker) : COLLIDED[e.collidedWith] || String(e.collidedWith).toUpperCase()
    cue('float', { hex, kind: 'collision', text: 'COLLISION · ' + what + ' ×' + e.collisionValue, n: e.collisionValue, of: 'collisionValue', small: true }) }
  const nm = id => (U[id] && U[id].name) || ('#' + id)
  switch (e.type) {
    case 'unit.enter':
      U[e.actor] = mkUnit(e, UD)
      /* an ARRIVAL — a wave, a raise, a summon — lands as a beat; the roster
         before battle.begin is seeded silently by the pump (2026-09-03) */
      if (S.begun) cue('arrive', { id: e.actor, hex: e.hex })
      break
    case 'battle.begin': S.begun = true; break
    case 'map.loaded':
      /* the board is the map's: width, height and which edge each side deploys on */
      S.board = { mapId: e.mapId, width: e.width, height: e.height, deploy: e.deploy ? { ...e.deploy } : null }
      if (!Array.isArray(e.props)) throw new Error('map.loaded has no canonical props; export this battle with the current engine')
      S.props = structuredClone(e.props)
      break
    case 'unit.equipped':
      /* seam.items-per-unit: the fielded unit is the bare row PLUS its kit —
         the item's stat deltas fold as modifiers (source = the item), its
         grants become the unit's attacks and powers. The chevron and the panel
         read them like any other modifier. The item's own triggers are NOT in
         the event (engine finding, 2026-09-03). */
      if (U[e.actor]) { const u = U[e.actor]
        u.kit.items.push(e.itemId)
        u.kit.held.push({ instanceId: e.instanceId ?? null, itemId: e.itemId, grants: [...(e.grants || [])], abilities: [...(e.abilities || [])] })
        if (e.instanceId != null && !u.hands.some(i => i.instanceId === e.instanceId)) u.hands.push({ instanceId: e.instanceId, itemId: e.itemId })
        for (const a of (e.grants || [])) if (!u.kit.grants.includes(a)) u.kit.grants.push(a)
        for (const a of (e.abilities || [])) if (!u.kit.abilities.includes(a)) u.kit.abilities.push(a)
        for (const [stat, value] of Object.entries(e.mods || {})) u.mods.push({ stat, op: 'add', value, source: e.itemId, fielded: true, ...(e.instanceId != null ? { instance: e.instanceId } : {}) }) }
      break
    /* ── THE SWAP (engine v2.loadout-swap dd78ff1, 2026-09-24; COMBAT-V2 §11.2, §15.1:
       "the rail icons and the unit's kit"). The stamina.spent before it has already set
       the bar; the unit.equipped lines after it bring what ARRIVED. This beat takes away
       what LEFT the hands — each leaving instance's own grants, powers and modifiers, as
       its unit.equipped stated them — sets the hands to the event's handsAfter, and
       stows everything else carried. One float: SWAP, and the stamina it cost. */
    case 'loadout.swapped':
      if (U[e.actor]) { const u = U[e.actor]
        const after = (e.handsAfter || []).map(i => ({ instanceId: i.instanceId, itemId: i.itemId }))
        const stays = id => after.some(i => i.instanceId === id)
        const carried = [...(e.handsBefore || []), ...u.stowed]
        const leaving = new Set((e.handsBefore || []).map(i => i.instanceId).filter(id => !stays(id)))
        u.kit.held = u.kit.held.filter(h => !leaving.has(h.instanceId))
        u.kit.items = u.kit.held.map(h => h.itemId)
        u.kit.grants = [...new Set(u.kit.held.flatMap(h => h.grants))]
        u.kit.abilities = [...new Set(u.kit.held.flatMap(h => h.abilities))]
        u.mods = u.mods.filter(m => !(m.fielded && m.instance != null && leaving.has(m.instance)))
        /* the hands are the event's own, in hand order; the unit.equipped of an arriving
           instance then adds its kit row and finds it already in hand */
        u.hands = after
        u.stowed = carried.filter(i => !stays(i.instanceId)).map(i => ({ instanceId: i.instanceId, itemId: i.itemId }))
        cue('float', e.stamina ? { hex: u.hex, kind: 'note', text: 'SWAP · −' + e.stamina + ' STAMINA', n: e.stamina, of: 'stamina', small: true }
          : { hex: u.hex, kind: 'note', text: 'SWAP', small: true }) }
      break
    case 'unit.grown':
      /* progression applied at fielding (engine 5603c40): the level table's
         stat deltas and the specialty — part of what the unit IS, like the kit,
         so `fielded` keeps it off the battle's buff/debuff chevron */
      if (U[e.actor]) { const u = U[e.actor]
        u.grown = { table: e.table, level: e.level, specialtyId: e.specialtyId || null }
        for (const [stat, value] of Object.entries(e.mods || {})) u.mods.push({ stat, op: 'add', value, source: e.table + (e.level != null ? ' L' + e.level : ''), fielded: true }) }
      break
    /* ── BADGES (engine 2e76ede, §12) ───────────────────────────────────── */
    case 'unit.badged':
      /* at fielding, after unit.equipped: what the unit was BORN with. Its
         mods are `fielded`, like the kit's — what it IS, not a battle buff. */
      if (U[e.actor]) { const u = U[e.actor]
        if (!u.badges.includes(e.badgeId)) u.badges.push(e.badgeId)
        u.kit.badges.push(e.badgeId)
        for (const [stat, value] of Object.entries(e.mods || {})) u.mods.push({ stat, op: 'add', value, source: e.badgeId, fielded: true }) }
      break
    case 'unit.modified':
      /* seam.unit-mods (engine 2026-09-25, mutate.ts applyUnitMods): the per-unit numbers a hero was
         BUILT with, one line per source (the opening's first hero, the crucible roll, a set bonus).
         Max Health and Max Stamina come stated as the unit's new pools, current rising with them;
         every other stat is a `fielded` mod, like the kit's and the badges' — what the unit IS, not a
         battle buff. Folded for viewer.painted-board: battle 1's hero carries two. */
      if (U[e.actor]) { const u = U[e.actor]
        if (e.maxHp != null) { u.maxHp = e.maxHp; u.hp = e.hp }
        if (e.maxStamina != null) { u.maxStam = e.maxStamina; u.stam = e.stamina }
        for (const [stat, value] of Object.entries(e.stats || {})) if (stat !== 'maxHp' && stat !== 'maxStamina') u.mods.push({ stat, op: 'add', value, source: e.source, fielded: true }) }
      break
    case 'badge.gained':
      /* mid-battle: the deathbed's Wounded, an affliction's Rotting Flesh. The
         statmod.added / maxHp.* lines that follow put its modifiers on, so the
         mods are NOT folded here — only the badge itself. */
      if (U[e.actor]) { const u = U[e.actor]
        if (!u.badges.includes(e.badgeId)) u.badges.push(e.badgeId)
        cue('badge', { id: e.actor, badgeId: e.badgeId, name: e.name })
        cue('float', { hex: u.hex, kind: 'badge', text: (e.name || e.badgeId).toUpperCase(), small: true }) }
      break
    case 'badge.held': break                                   // a grant that was already there; nothing changed
    case 'charge.spent':
      /* capability.charges: one use gone, `left` remain — the bar prints it */
      if (U[e.actor]) (U[e.actor].charges = U[e.actor].charges || {})[e.abilityId ?? e.actionId] = e.left
      /* v2.item-uses: the instance that paid, and what it has left */
      if (U[e.actor] && e.instanceId != null) U[e.actor].itemUses[e.instanceId] = { itemId: e.itemId, left: e.instanceLeft }
      break
    case 'power.exhausted':
      /* capability.charges (engine): the action spent its last use and LEAVES
         the unit's list for the rest of the Battle — "they should vanish from
         the list of things available to a hero" (Andrew 2026-09-02). Not in
         §11/§12; found in the Arc Golem export (viewer finding, 2026-09-04). */
      if (U[e.actor]) (U[e.actor].spent = U[e.actor].spent || []).push(e.abilityId ?? e.actionId)
      break

    /* ── the encounter (EVENTS-FOR-THE-VIEWER §1) ────────────────────────── */
    case 'encounter.begin':
      S.encounter = { id: e.causeId, name: e.name, gaps: e.gaps ? e.gaps.slice() : [], objectives: [], result: null }
      break
    case 'encounter.objective':
      if (U[e.actor]) U[e.actor].objective = true
      if (S.encounter) S.encounter.objectives.push(e.actor)
      break
    case 'encounter.wave':
      cue('banner', { kind: 'wave', text: 'A wave arrives', sub: (e.units || []).join(' · ') })
      break
    case 'encounter.roll': break                                         // a scripted either/or was rolled: the log says which
    case 'unit.shunted':
      if (U[e.actor]) { U[e.actor].hex = e.hex; cue('float', { hex: e.hex, kind: 'note', text: 'SHUNTED', small: true }) }
      break
    case 'encounter.won':
      if (S.encounter) S.encounter.result = { won: true, reason: e.reason, to: e.to }
      cue('banner', { kind: 'won', text: 'Objective met', sub: e.reason })
      break
    case 'encounter.lost':
      if (S.encounter) S.encounter.result = { won: false, reason: e.reason, actor: e.actor, limit: e.limit }
      cue('banner', { kind: 'lost', text: 'Objective failed', sub: e.reason + (e.actor != null ? ' — ' + nm(e.actor) : '') })
      break
    /* fold the event's OWN numbers (fixed 2026-08-27): turn.begin carries a
       1-based `turn` and phase.begin carries `phase` — never count locally */
    case 'turn.begin': S.turnNo = e.turn ?? (S.turnNo + 1); break
    case 'phase.begin': if (e.phase) S.phase = e.phase
      /* viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed': "the
         enemy did an attack, and then their attack probability was stuck on the screen when it became the hero's turn, so I
         couldn't figure out whose turn it was"; 'the battle screen's turn-taking, ruled', point 2): the Hero Phase opens with
         its banner and nothing of the Enemy Phase on the board — the declared attack and its hit chance (a miss line the
         pump never expired once it ran dry), a free swing, a burst, a lit row, the panel's last target */
      if (e.phase === 'hero') {
        S.AIM = null; S.ATTACK = null; S.AOO = null; S.BURST = null; S.critPending = false; S.FIRING = null; S.TRIGFLASH = null
        cue('inspect.clear'); cue('banner', { kind: 'phase', text: 'Hero Phase', sub: 'your heroes act' })
      }
      break
    case 'phase.end.done': S.phase = e.side === 'hero' ? 'enemy' : 'hero'; S.acted = {}; break
    case 'action.spent':
      if (!U[e.actor] || typeof e.moveUsed !== 'boolean' || typeof e.primaryUsed !== 'boolean') throw new Error('action.spent lacks authoritative actor/slot state')
      U[e.actor].moveUsed = e.moveUsed; U[e.actor].primaryUsed = e.primaryUsed
      break
    case 'activation.begin':
      S.BURST = null
      S.activeId = e.actor; S.subjectId = e.actor; S.subjectMode = 'acting'; S.activations++
      /* the engine names the budget only when something reduced it (Law 12);
         otherwise the resting figure stands — the draw side reads mvOf() */
      if (U[e.actor]) { U[e.actor].activeMv = e.movePoints ?? null; U[e.actor].moveMods = e.movementMods || null; U[e.actor].confusedFrom = null; U[e.actor].moveUsed = false; U[e.actor].primaryUsed = false }
      S.AIM = null; S.AOO = null; cue('inspect.clear')          // FIRING and floats run their own clocks
      break
    case 'activation.end':
      S.BURST = null
      S.acted[e.actor] = true
      /* viewer.turn-taking (engine DECISIONS.md 2026-10-03, point 1: one current hero, its mark cleared when its Activation
         ends): until 2026-10-03 the acting mark stuck to the last unit to act until the next activation.begin */
      if (S.activeId === e.actor) S.activeId = null
      if (U[e.actor]) { U[e.actor].activeMv = null; U[e.actor].moveMods = null; U[e.actor].confusedFrom = null }
      S.ATTACK = null; S.AOO = null
      break
    case 'move.begin':
      S.BURST = null
      S.AOO = null
      /* moves light their own row too (ruled 2026-09-01) — causeId names the MoveDef */
      if (e.causeId) S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS }
      break
    case 'moved':
      if (U[e.actor]) { U[e.actor].hex = e.to; U[e.actor].activeMv = e.movePointsLeft
        if (e.causeId) S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS } }
      if (S.AOO && S.AOO.mover === e.actor) S.AOO = null                 // the walk resumed; the free swing is over
      break
    /* ── zones of control and attacks of opportunity (§2, reversed §12) ─── */
    case 'move.stopped':
      /* ZoC IS A THREAT, NOT A STOP (engine 1019510, 2026-09-04): there is no
         held. `reason: 'hit'` — the provoked swing on the way out connected and
         the mover lost its movement where it stood. The aoo.provoked /
         attack.declared / damage.applied beats tell it; this line only fixes
         the hex. The hit is the cause of stopping, never entering a zone. */
      if (U[e.actor]) U[e.actor].hex = e.hex
      if (e.reason === 'hit') cue('float', { hex: e.hex, kind: 'note', text: 'STOPPED BY HIT', small: true })
      S.AOO = null
      break
    case 'aoo.provoked':
      /* one attack a unit makes on someone else's turn: the ordinary
         attack.declared/hit/miss that follow belong to this, and the label
         says so. The holder acts; the mover's activation resumes after. */
      S.AOO = { holder: e.actor, mover: e.target, attackId: e.attackId }
      if (['from', 'to', 'moveSeq'].some(key => Object.hasOwn(e, key))) {
        if (![e.from, e.to, e.moveSeq].every(n => Number.isSafeInteger(n) && n >= 0) || e.from === e.to)
          throw new Error('opportunity attempt has invalid hex or movement identity')
        Object.assign(S.AOO, { from: e.from, to: e.to, moveSeq: e.moveSeq })
      }
      // This event itself says the mover tried another step. No guessed path,
      // range or animation into a hex the engine never let the mover enter.
      if (U[e.target] && S.AOO.to == null) cue('float', { hex: U[e.target].hex, kind: 'note', text: 'TRIES TO KEEP MOVING', small: true })
      if (U[e.actor]) cue('float', { hex: U[e.actor].hex, kind: 'aoo', text: 'ATTACK OF OPPORTUNITY', small: true })
      S.subjectId = e.actor; S.subjectMode = 'acting'
      break
    case 'aoo.skipped': break                                             // nothing to draw; the log names the reason
    case 'zoc.ignored': break                                             // viewer.caravan-scene: a mover that ignores ZoC (the Bloodhound) passes a holder; no attack, nothing to draw
    case 'block.rolled':
      if (e.blocked) {
        S.AIM = null; S.ATTACK = null; S.critPending = false
        if (U[e.defender]) cue('float', { hex: U[e.defender].hex, kind: 'block', text: 'BLOCK', small: true })
      }
      break
    case 'burst.declared':
      S.AIM = null; S.ATTACK = null; S.AOO = null; S.critPending = false
      S.BURST = { ...structuredClone(e), shielded: [], struck: [] }
      S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS }
      S.subjectId = e.actor; S.subjectMode = 'acting'
      break
    case 'burst.shielded':
      if (S.BURST?.causeId === e.causeId && S.BURST.actor === e.actor) S.BURST.shielded.push(structuredClone(e))
      cue('float', { hex: e.hex, kind: 'note', text: 'Terrain shielding', small: true })
      break
    case 'burst.struck':
      if (S.BURST?.causeId === e.causeId && S.BURST.actor === e.actor) S.BURST.struck.push(structuredClone(e))
      break
    case 'attack.declared':
      S.BURST = null
      if (U[e.actor] && U[e.target]) {
        cue('lunge', { a: e.actor, t: e.target, kind: e.kind })
        S.AIM = { from: U[e.actor].hex, to: U[e.target].hex, hit: e.hitChance,
          type: e.damageType, tgt: e.target, kind: e.kind,
          dmg: e.damageOnHit,
          aoo: !!(S.AOO && S.AOO.holder === e.actor), hit_n: e.hit, hit_of: e.of }
        S.ATTACK = { kind: e.kind, dt: e.damageType, dmg: e.damageOnHit, aoo: !!(S.AOO && S.AOO.holder === e.actor) }
        /* the engine's OWN live damage for this attack — it carries Weak and
           every other live modifier; the action bar prints it, not a formula */
        if (e.damageOnHit != null) (U[e.actor].dmgSeen = U[e.actor].dmgSeen || {})[e.attackId] = e.damageOnHit
        /* viewer.live-stat-mods (2026-10-01; Andrew: the Leap's +2 Strength left the attacks' numbers alone): the
           attacker's live modifiers as that number was seen, so a later +2 (or its end) moves it */
        if (e.damageOnHit != null) { const sums = {}; for (const m of U[e.actor].mods || []) sums[m.stat] = (sums[m.stat] || 0) + (m.value || 0);
          (U[e.actor].dmgSeenMods = U[e.actor].dmgSeenMods || {})[e.attackId] = sums }
        S.FIRING = { unit: e.actor, ability: e.attackId, until: now + FIRE_MS }
        S.subjectId = e.target; S.subjectMode = 'target'
      } break
    case 'attack.hit':
      S.critPending = !!e.crit
      /* Ordinary attack metadata outlives AIM so the impact and subsequent
         damage beats retain their source after the forecast clears. */
      if (S.ATTACK && U[e.target]) {
        /* THE EMPHASIS LADDER, rung 2 (ruled 2026-09-02, VISUAL-BATTLE-UPDATES §1.3):
           a crit keeps the word — Andrew: "I think we actually want the word
           'crit' when all it's doing is damage" — and on top of it the impact
           renders at the super tier and the camera kicks along the blow. The
           numeral itself is the crit's on the damage beat (critPending). */
        cue('fx.attack', { kind: S.ATTACK.kind, dt: S.ATTACK.dt, a: e.actor, t: e.target, dmg: S.ATTACK.dmg, crit: !!e.crit })
        if (e.crit) { cue('float', { hex: U[e.target].hex, kind: 'crit', text: 'CRIT!', big: true })
          cue('kick', { a: e.actor, t: e.target }) }
      }
      /* the projection is a FORECAST — it clears at impact so the result
         number never shares the screen with it (ruled 2026-08-27) */
      S.AIM = null
      break
    case 'attack.miss':
      /* ONE place says miss (2026-08-27): the lingering targeting line carries the roll */
      if (S.AIM) { S.AIM.missed = { roll: e.roll, ...(e.missCause ? {cause:e.missCause} : {}) }; S.AIM.expire = now + MISS_MS }
      if (S.ATTACK && U[e.target]) cue('fx.attack', { kind: S.ATTACK.kind, dt: S.ATTACK.dt, a: e.actor, t: e.target, dmg: S.ATTACK.dmg })
      if (S.activeId != null) { S.subjectId = S.activeId; S.subjectMode = 'acting' }
      break
    case 'attack.cancelled':
      /* a multihit ended early ("target fell"): the forecast goes with it */
      S.AIM = null; S.ATTACK = null
      if (S.activeId != null) { S.subjectId = S.activeId; S.subjectMode = 'acting' }
      break
    case 'damage.applied':
      if (U[e.target]) { U[e.target].hp = e.hpAfter
        // Critical belongs to this resolved attack, never to intervening hook
        // damage between attack.hit and the attack's HP event.
        const critical = !!e.attackId && e.crit === true
        cue('flash', { id: e.target })
        const tick = String(e.causeId || '').includes('status.')
        if (tick) cue('fx.tick', { id: e.target, cause: e.causeId })
        /* HITSTOP (ruled 2026-09-01, VISUAL-BATTLE-UPDATES §1.2): a strike freezes
           the tokens for 70ms, a crit for 140. A status tick is not a strike. */
        else cue('hitstop', { ms: critical ? 140 : 70 })
        /* EVERY damage floats overhead and drifts up, coloured by damage type
           (ruled 2026-08-27): red physical, blue magic, white true. A crit's
           numeral arrives bigger, gold-rimmed, snaps in and HOLDS before it
           drifts — every other number fades in and drifts at once (rung 2). */
        /* every number a float carries names the event field it came from —
           the constitution's catch checks e[of] === n, verbatim */
        if (e.packets) {
          e.packets.forEach((p, packetIndex) => {
            cue('float', { hex: U[e.target].hex, kind: 'damage', dt: p.damageType, text: '−' + p.applied, n: p.applied, of: 'applied', packetIndex, big: true, crit: critical })
            if (p.resisted) cue('float', { hex: U[e.target].hex, kind: 'resisted', text: p.resisted + ' resisted', n: p.resisted, of: 'resisted', packetIndex, small: true })
            if (p.absorbed) cue('float', { hex: U[e.target].hex, kind: 'absorbed', text: p.absorbed + ' absorbed', n: p.absorbed, of: 'absorbed', packetIndex, small: true })
          })
        } else {
          cue('float', { hex: U[e.target].hex, kind: 'damage', dt: e.damageType, text: '−' + e.amount, n: e.amount, of: 'amount', big: true, crit: critical })
          if (e.resisted) cue('float', { hex: U[e.target].hex, kind: 'resisted', text: e.resisted + ' resisted', n: e.resisted, of: 'resisted', small: true })
          if (e.absorbed) cue('float', { hex: U[e.target].hex, kind: 'absorbed', text: e.absorbed + ' absorbed', n: e.absorbed, of: 'absorbed', small: true })
        }
        if (e.attackId) S.critPending = false
        S.AIM = null
        if (S.activeId != null) { S.subjectId = S.activeId; S.subjectMode = 'acting' } }
      break
    case 'heal.applied':
      if (U[e.target]) { U[e.target].hp = e.hpAfter
        cue('float', { hex: U[e.target].hex, kind: 'heal', text: '+' + e.amount, n: e.amount, of: 'amount', big: true })
        cue('fx.status', { id: e.target, style: 'heal' }) }
      break
    case 'heal.boosted':
      /* Karma raised a heal: the status's own word and the event's `by` */
      if (U[e.target]) cue('float', { hex: U[e.target].hex, kind: 'status', statusId: e.statusId, text: (SN[e.statusId] || e.statusId) + ' +' + e.by, n: e.by, of: 'by', small: true })
      break
    case 'status.applied':
      if (U[e.target]) { U[e.target].st[e.statusId] = e.after
        if (e.by != null) U[e.target].stBy[e.statusId] = e.by             // Taunt's `by` is who the taunted must target
        if (e.after > e.before) {
          /* the event's own `amount` when it carries one; the delta only as a
             fallback (review 2026-09-03: never recompute what the log states) */
          const n = e.amount != null ? e.amount : e.after - e.before
          cue('float', { hex: U[e.target].hex, kind: 'status', statusId: e.statusId, text: (SN[e.statusId] || e.statusId) + ' ' + sgn(n), n, of: e.amount != null ? 'amount' : 'after' })
          cue('fx.status', { id: e.target, style: e.statusId }) } }
      break
    case 'status.cancelled':
      /* Burn and Frost annihilate one for one on application: the status.reduced
         that follows moves the pip; this beat names the annihilation */
      if (U[e.target]) cue('float', { hex: U[e.target].hex, kind: 'status', statusId: e.against, text: (SN[e.against] || e.against) + ' −' + e.amount + ' cancelled', n: e.amount, of: 'amount', small: true })
      break
    case 'trigger.fired':
      /* No float (ruled 2026-08-27): the status.applied that follows floats the
         same words. The panel's ⚡ chip flash and the log name the cause. */
      S.TRIGFLASH = { unit: e.actor, id: e.causeId, until: now + TRIG_MS }
      if (e.actor != null) { S.subjectId = e.actor; S.subjectMode = 'acting' }
      break
    /* ── PRONE AND STANDING (engine v2.prone 022b560, 2026-09-23; COMBAT-V2-DESIGN §10) ──
       The status.applied just before unit.proned has already set the pip and
       floated "Prone +1"; this beat is the going-down itself. unit.stood follows
       the status.expired of every prone status the unit held — the log states
       both, so the token lies down and gets up on the engine's word, never on
       the viewer's reading of which statuses are prone. Neither touches HP. */
    case 'unit.proned':
      if (U[e.target]) { const u = U[e.target]
        u.prone = [...new Set([...(u.prone || []), e.statusId])].sort()
        cue('float', { hex: u.hex, kind: 'status', statusId: e.statusId, text: 'PRONE', small: true }) }
      break
    case 'unit.stood':
      if (U[e.actor]) { U[e.actor].prone = null
        cue('float', { hex: U[e.actor].hex, kind: 'note', text: 'STANDS', small: true }) }
      break
    case 'status.reduced': if (U[e.target]) U[e.target].st[e.statusId] = e.after; break
    case 'status.expired': if (U[e.target]) { delete U[e.target].st[e.statusId]; delete U[e.target].stBy[e.statusId] } break
    case 'stamina.spent': case 'stamina.regen': case 'stamina.gained':
      if (U[e.actor]) U[e.actor].stam = e.stamina; break
    case 'stamina.drained':
      /* a trigger drained the TARGET's stamina (target-stamina-loss, 2026-09-03) */
      if (U[e.target]) { U[e.target].stam = e.stamina
        if (e.amount) cue('float', { hex: U[e.target].hex, kind: 'note', text: '−' + e.amount + ' STAMINA', n: e.amount, of: 'amount', small: true }) }
      break
    /* `knocked` MOVES A UNIT (folded 2026-09-01) — unhandled, knocked units
       rendered at a stale hex until their next move */
    case 'knocked':
      if (S.AOO?.mover === e.target) S.AOO = null
      /* a push of `asked` travels `hexes` (engine 2e649b5); `stoppedBy` says
         what cut it short — occupied, impassable, the edge of the board */
      if (U[e.target]) { const from = U[e.target].hex
        U[e.target].hex = e.to
        cue('shove', { id: e.target, from, to: e.to, hexes: e.hexes })
        cue('float', { hex: e.to, kind: 'knocked', text: e.stoppedBy ? 'KNOCKED · ' + String(e.stoppedBy).toUpperCase() : 'KNOCKED', small: true })
        collisionCue(e, e.to) }
      break
    /* ── KNOCKBACK COLLISIONS (engine v2.knockback-collisions eab6530, 2026-09-23;
       COMBAT-V2 §9.3) — a push that could not take one hex. The mover stays put;
       when the event names what it struck, the mover wears the collision. A
       Stand Firm push (reason 'cannot be knocked back', `by` the badges) says
       so in the engine's own words. The damage is the next event's
       damage.applied (collision: true), floated as every damage is. */
    case 'knockback.blocked':
      if (U[e.target]) {
        if (e.collidedWith) collisionCue(e, U[e.target].hex)
        else if (e.by) cue('float', { hex: U[e.target].hex, kind: 'knocked', text: String(e.reason).toUpperCase(), small: true }) }
      break
    /* ── KDB — knock down and back (engine v2.kdb e0987b0, 2026-09-23; COMBAT-V2
       §9.1/§9.2/§9.5). One kdb.rolled per check: the margin, chance and roll are
       the log's (log.js); nothing changes state here — a fired "back" continues
       with `knocked`, a "down" with status.applied + unit.proned, both already
       folded. The one cue is a word when the check FIRED: what was rolled
       (kdbType) and, when a badge stopped some of it, what was applied.
       A check that did not fire, or an immune target, floats nothing. */
    case 'kdb.rolled':
      if (e.fired && U[e.target]) {
        const KDB = { back: 'KNOCKED BACK', down: 'KNOCKED DOWN', both: 'KNOCKED DOWN AND BACK' }
        const rolled = KDB[e.kdbType] || 'KDB'
        const text = e.applied === e.kdbType ? rolled : rolled + ' · ' + (e.applied === 'none' ? 'RESISTED' : 'ONLY ' + String(e.applied).toUpperCase())
        cue('float', { hex: U[e.target].hex, kind: 'kdb', text, small: true }) }
      break
    /* ── Thorns (engine v2.thorns, 2026-09-24; COMBAT-V2 §9.4). One thorns.reflected
       per connecting melee hit on a thorned unit: the word floats over the ATTACKER
       it pricked (`target`). The HP loss is the damage.applied that follows
       (thorns: true), already folded — nothing changes state here. */
    case 'thorns.reflected':
      if (U[e.target]) cue('float', { hex: U[e.target].hex, kind: 'thorns', text: 'THORNS ' + e.thorns, n: e.thorns, of: 'thorns', small: true })
      break
    /* ── Prop destruction (engine v2.prop-destroy / v2.prop-attack, 2026-09-24; COMBAT-V2
       §12, §15.1). The props drawn from map.loaded change by id, exactly as the events
       state them: prop.damaged sets the steps taken (below the tier; at the tier the
       prop.destroyed that follows says what is left), prop.destroyed replaces the prop
       with the engine's own `remnant` (low cover, same id) or removes it. prop.struck
       is an attack aimed at a prop's hex: a word, no unit, no roll. */
    case 'prop.struck':
      S.AIM = null; S.ATTACK = null; S.BURST = null
      S.FIRING = { unit: e.actor, ability: e.attackId, until: now + FIRE_MS }
      cue('float', { hex: e.hex, kind: 'note', text: 'STRIKES ' + (e.props || []).length + ' PROP' + ((e.props || []).length === 1 ? '' : 'S'), small: true })
      break
    case 'prop.damaged':
      if (Array.isArray(S.props)) {
        const at = S.props.findIndex(p => p.id === e.prop)
        if (at >= 0 && e.stepsAfter < e.tier) { S.props = S.props.slice(); S.props[at] = { ...S.props[at], steps: e.stepsAfter } }
        const p = at >= 0 ? S.props[at] : null
        if (p && p.footprint.kind === 'hex' && e.stepsAfter < e.tier) cue('float', { hex: p.footprint.hexes[0], kind: 'note', text: 'DAMAGED ' + e.stepsAfter + '/' + e.tier, n: e.stepsAfter, of: 'steps', small: true })
      }
      break
    case 'prop.destroyed':
      if (Array.isArray(S.props)) {
        const at = S.props.findIndex(p => p.id === e.prop)
        if (at >= 0) {
          const hex = S.props[at].footprint.kind === 'hex' ? S.props[at].footprint.hexes[0] : null
          S.props = S.props.slice()
          if (e.leaves === 'low') {
            if (!e.remnant || e.remnant.id !== e.prop) throw new Error('prop.destroyed leaves low cover but carries no remnant; export this battle with the current engine')
            S.props[at] = structuredClone(e.remnant) }
          else S.props.splice(at, 1)
          if (hex != null) cue('float', { hex, kind: 'note', text: e.leaves === 'low' ? 'DESTROYED · LOW COVER' : 'DESTROYED', small: true })
        }
      }
      break
    case 'maxHp.lost':
      if (U[e.target]) { U[e.target].maxHp = e.maxHp; U[e.target].hp = e.hp
        cue('float', { hex: U[e.target].hex, kind: 'maxhp', text: '−' + e.amount + ' MAX HP', n: e.amount, of: 'amount', small: true }) }
      break
    case 'maxHp.gained':
      /* the mirror of maxHp.lost — a ghoul that fed */
      if (U[e.target]) { U[e.target].maxHp = e.maxHp; U[e.target].hp = e.hp
        cue('float', { hex: U[e.target].hex, kind: 'maxhpUp', text: '+' + e.amount + ' MAX HP', n: e.amount, of: 'amount', small: true }) }
      break
    case 'staminaMax.lost':
      if (U[e.actor]) { U[e.actor].maxStam = e.maxStamina; U[e.actor].stam = e.stamina } break
    case 'maxstamina.gained':
      /* a badge raised Max Stamina (the werewolf's Lycanthropy). Note the
         engine spells this one all-lowercase where the loss is `staminaMax.lost`
         — a viewer finding, 2026-09-04; folded as spelt. */
      if (U[e.target]) { U[e.target].maxStam = e.maxStamina
        cue('float', { hex: U[e.target].hex, kind: 'maxhpUp', text: '+' + e.amount + ' MAX STAMINA', n: e.amount, of: 'amount', small: true }) }
      break
    case 'statmod.added':
      /* the buff/debuff layer's data (UI-BUILD-NOTES §1), held on the unit */
      if (U[e.actor]) (U[e.actor].mods = U[e.actor].mods || []).push({ stat: e.stat, op: e.op, value: e.value, source: e.source })
      break
    case 'statmod.expired': {
      /* V2 shields (engine 4789cbd, 2026-09-23): a mod that lasted until the end of the
         holder's next activation is gone — remove the one the log added, as spelt */
      const mods = U[e.actor] && U[e.actor].mods
      const at = mods ? mods.findIndex(m => m.stat === e.stat && m.op === e.op && m.value === e.value && m.source === e.source) : -1
      if (at >= 0) mods.splice(at, 1)
      break
    }
    case 'cooldown.set':
      /* ONE ACTION TYPE (engine 26fa562, §11): `actionId` on every kind;
         `abilityId` is kept for readers that used it, and `attackId` is gone */
      if (U[e.actor]) (U[e.actor].cds = U[e.actor].cds || {})[e.actionId ?? e.abilityId] = e.readyOnTurn; break
    case 'crit.effect':
      /* a Critical Injury Chart row landed — the biggest single beat the
         engine emits, and rung 3 of the ladder (ruled 2026-09-02): not a
         float. A plate lands on the token, holds, then flies to the panel's
         injury list. critCount can land several on one attack; the board
         QUEUES them. */
      if (U[e.target]) { cue('injury', { id: e.target, name: e.name })
        ;(U[e.target].injuries = U[e.target].injuries || []).push(e.name)
        /* the injured unit is the subject while the plate lands, so the plate
           flies to ITS injury list (review 2026-09-03: crit.effect arrives after
           damage.applied has already handed the panel back to the attacker) */
        S.subjectId = e.target; S.subjectMode = 'target' }
      break
    case 'power.hit':
      /* no invented tier: the event carries no amount, so the impact takes the default */
      if (U[e.target] && e.actor != null && e.target !== e.actor)
        cue('fx.attack', { kind: 'ranged', dt: 'magic', a: e.actor, t: e.target, dmg: null })
      break
    /* ── the consequence stack (§4) ─────────────────────────────────────── */
    /* DEATHBED FIGHTING (Angela, 2026-09-03 evening, VISUAL-BATTLE-UPDATES §3.2):
       "a pop-up, the game should freeze, and it should say 'Unit downed,
       deathbed fighting roll'. Then, if it passes, a very bold statement:
       'Deathbed fighting: this hero fights on.'" — a MODAL cue, never a float,
       and never the word "stands" where the player reads. The roll and the
       chance are the event's, verbatim (n/of, the root law's catch). The wound
       level lands on the unit as the dripping blood. */
    case 'deathbed.stood':
      /* the hero fights on. From here on it wears a SMALL RED SKULL in the
         overhead status row — Angela 2026-09-04: "they need a skull in their
         status bar, to show they're on death's door". The Wounded badge and
         its modifiers arrive in the badge.gained / statmod lines that follow. */
      if (U[e.target]) { const u = U[e.target]
        u.deathbed = true; u.rolls = e.ordinal
        cue('deathbed', { id: e.target, result: 'stood', n: e.roll, of: 'roll', chance: e.chance, chanceOf: 'chance' })
        cue('stand', { id: e.target })
        S.subjectId = e.target; S.subjectMode = 'target' }
      break
    case 'deathbed.fell':
      /* bleedsOut true → life.downed and the bleed-out; false → life.dead and a corpse */
      if (U[e.target]) { U[e.target].rolls = e.ordinal
        cue('deathbed', { id: e.target, result: 'fell', n: e.roll, of: 'roll', chance: e.chance, chanceOf: 'chance', bleedsOut: !!e.bleedsOut }) }
      break
    case 'deathbed.none':
      /* a Wounded unit at 0: no roll, dead (engine b4cbd9b) */
      if (U[e.target]) cue('deathbed', { id: e.target, result: 'none', reason: e.reason })
      break
    case 'hp.reset':
      /* the fresh bar after a stand */
      if (U[e.target]) { const u = U[e.target]
        u.hp = e.hp; u.maxHp = e.maxHp
        cue('float', { hex: u.hex, kind: 'heal', text: '+' + e.hp, n: e.hp, of: 'hp', big: true })
        cue('fx.status', { id: e.target, style: 'heal' }) }
      break
    case 'bleedout.accelerated':
      /* a hit on the downed moved the counter (never kills) */
      if (U[e.target]) { U[e.target].bleed = e.bleedOut
        cue('flash', { id: e.target })
        cue('float', { hex: U[e.target].hex, kind: 'bleed', text: 'BLEED-OUT ' + e.bleedOut, n: e.bleedOut, of: 'bleedOut', small: true }) }
      break
    case 'life.downed': if (S.AOO?.mover === e.target) S.AOO = null; if (U[e.target]) U[e.target].life = 'downed'; break
    case 'life.dead': if (S.AOO?.mover === e.target) S.AOO = null; if (U[e.target]) { U[e.target].life = 'dead'; cue('hitstop', { ms: 110 })
        /* v2.knockback-collisions: a consuming prop (the well) took the body —
           reason 'consumed', `by` the prop, corpse:false. No corpse.created
           follows, so none is drawn; the word names the prop. */
        if (e.reason === 'consumed') cue('float', { hex: U[e.target].hex, kind: 'consumed', text: 'CONSUMED · ' + propWord(e.by), big: true }) } break
    case 'bleedout.set': case 'bleedout.tick': if (U[e.target]) U[e.target].bleed = e.bleedOut; break
    /* ── bodies and the undead economy (§3) ─────────────────────────────── */
    case 'corpse.created':
      /* a board object: it stays until removed. Summons and obliterations make none. */
      S.corpses[e.corpse] = { id: e.corpse, hex: e.hex, of: e.of, typeId: e.typeId, side: e.side }
      break
    case 'corpse.removed':
      delete S.corpses[e.corpse]
      cue('corpse.gone', { corpse: e.corpse, hex: e.hex, how: e.how })
      if (e.how === 'destroyed') cue('float', { hex: e.hex, kind: 'note', text: 'CORPSE DESTROYED', small: true })
      break
    case 'unit.raised':
      /* follows a corpse.removed how:'raised' and the unit.enter: a rise */
      if (U[e.raised]) { U[e.raised].raised = true
        cue('rise', { id: e.raised, hex: e.hex })
        cue('float', { hex: e.hex, kind: 'raised', text: 'RISES', big: true }) }
      break
    case 'corpse.eaten':
      /* the ghoul feeds; heal.applied + statmod.added + maxHp.gained follow */
      if (U[e.actor]) cue('float', { hex: U[e.actor].hex, kind: 'eaten', text: 'FEEDS', small: true })
      break
    case 'unit.obliterated':
      /* Shadow reached Max Health: life.dead follows with corpse:false — no body */
      if (U[e.target]) cue('float', { hex: U[e.target].hex, kind: 'obliterated', text: 'OBLITERATED', big: true })
      break
    /* ── Surge, Power (§5) ──────────────────────────────────────────────── */
    /* viewer.reads-engine (review V7): the amount the engine kept is its `after` (fix.surge-spend: a Surge
       takes away 100, it does not empty the amount); the movement a Surge restores is surge.hit's movePoints */
    case 'surge.checked': if (U[e.actor]) U[e.actor].surgeChance = e.after ?? e.chance; break
    case 'surge.hit':
      /* the hero acts AGAIN inside the same activation: the engine reopened both slots (reopenSurgeCycle —
         it emits no action.spent for the reopening, so this event is the statement) and restored its movement */
      if (U[e.actor]) { if (e.after != null) U[e.actor].surgeChance = e.after
        U[e.actor].activeMv = e.movePoints ?? U[e.actor].activeMv
        U[e.actor].moveUsed = false; U[e.actor].primaryUsed = false; cue('float', { hex: U[e.actor].hex, kind: 'surge', text: 'SURGE!', big: true }) }
      break
    case 'power.gained':
      /* the enemy side's Power pool rose — a side-wide number, not a unit's */
      S.power = e.after
      cue('power', { after: e.after, amount: e.amount })
      break
    /* ── the ground and the light (§6) ──────────────────────────────────── */
    case 'layer.painted': case 'layer.cancelled':
      if (e.after) S.layers[e.hex] = e.after; else delete S.layers[e.hex]
      break
    case 'band.advanced':
      cue('banner', { kind: 'band', text: 'Row ' + e.row + ' ' + String(e.layer).replace(/^layer\./, ''), sub: 'the band advances' })
      break
    case 'night.fell': cue('banner', { kind: 'night', text: 'Night falls', sub: 'every hex is dark' }); break
    case 'light.cast': break                       // the layer.painted lines before it already lit the hexes
    /* ── the AI (§7) ────────────────────────────────────────────────────── */
    case 'ai.mode':
      if (U[e.actor] && e.confusedFrom) { U[e.actor].confusedFrom = e.confusedFrom
        cue('float', { hex: U[e.actor].hex, kind: 'status', statusId: 'status.confusion', text: 'CONFUSED', small: true }) }
      break
    case 'ai.override':
      /* the encounter overrides a civilian's mode until a Turn ends (ai.civilian-flight,
         ruled 2026-09-03 after Angela watched Supper seed 5): held on the unit for the panel */
      if (U[e.actor]) U[e.actor].aiOverride = { mode: e.mode, untilTurn: e.untilTurn }
      break
    case 'ai.hunts':
      if (U[e.actor]) { U[e.actor].hunt = e.target
        cue('float', { hex: U[e.actor].hex, kind: 'note', text: 'HUNTS', small: true }) }     // the panel names the quarry
      break
    case 'power.used':
      S.BURST = null
      if (e.causeId) S.FIRING = { unit: e.actor, ability: e.causeId, until: now + FIRE_MS }
      /* viewer.shield-guard-motion (engine DECISIONS.md 2026-10-01, Andrew: "When they play shield power, they should raise the
         shield animation."): a power the user's held shield granted — its kit row's own grant (unit.equipped), the item's class the
         engine's (ctx.IC, static.json itemClasses) — raises the shield on the body */
      if (e.causeId && U[e.actor] && ctx.IC && U[e.actor].kit.held.some(h => (h.abilities.includes(e.causeId) || h.grants.includes(e.causeId)) && ctx.IC[h.itemId] === 'shield'))
        cue('guard', { id: e.actor, power: e.causeId })
      if (e.target != null && U[e.target] && e.target !== e.actor) cue('fx.attack', { kind: 'ranged', dt: 'magic', a: e.actor, t: e.target, dmg: null })
      else {
        /* the power's own effect from the sheet, never a guess: selfGuard reads as
           protection, heal as heal, anything else gets no status flourish */
        const def = e.causeId && U[e.actor] ? ((UD[U[e.actor].typeId] || {}).abilities || []).find(p => p.id === e.causeId) : null
        const fx = def && def.effect === 'selfGuard' ? 'status.protection' : def && def.effect === 'heal' ? 'heal' : null
        if (fx) cue('fx.status', { id: e.actor, style: fx })
      }
      break
    case 'battle.end': S.BURST = null; S.AOO = null; S.outcome = e.outcome; break
  }
  return cues
}

/** Rebuild a state from scratch through events[0..n-1] — for scrub.
    Cues are dropped.

    THE RULE (2026-09-04, VIEWER-CONSTITUTION Law 3): **foldTo clears ONLY what
    the pump's clock stamped.** Everything else the events rebuilt exactly, and
    discarding it is how a scrub silently deleted the impact effect of every
    attack in the game — 678 of 678 measured (REVIEW-2026-09-04 §A). `ATTACK`
    outlives AIM on purpose (ordinary hit and damage beats still read it) and
    carries no clock; `AOO` marks the free swing; both are kept, as is the
    subject, so that seeking to N and stepping to N agree exactly.

    Clock-stamped, and therefore cleared: `FIRING` and `TRIGFLASH` (lingering
    highlights, stamped `until`) and the miss line's linger on `AIM`
    (`missed`/`expire`). Nothing should still be FLASHING after a jump; the
    forecast itself is state, not a flash, and stays. */
export function foldTo(events, n, ctx) {
  const S = createState()
  for (let i = 0; i < n && i < events.length; i++) fold(S, events[i], ctx, 0)
  S.FIRING = null; S.TRIGFLASH = null
  if (S.AIM) { S.AIM.missed = null; S.AIM.expire = null }
  return S
}

/** The event types the fold knows. verify.mjs checks every packed log and the
    pump's duration table against this until the engine exports EVENT_TYPES
    (THREE-PACKAGES-PLAN §8.3). */
export const FOLDED_TYPES = ['burst.declared', 'burst.shielded', 'burst.struck', 'unit.enter', 'battle.begin', 'map.loaded', 'unit.equipped', 'loadout.swapped', 'unit.grown', 'turn.begin', 'phase.begin', 'phase.end.done', 'activation.begin', 'action.spent',
  'activation.end', 'move.begin', 'moved', 'attack.declared', 'attack.hit', 'attack.miss', 'attack.cancelled', 'damage.applied',
  'heal.applied', 'heal.boosted', 'status.applied', 'status.cancelled', 'trigger.fired', 'status.reduced', 'status.expired', 'unit.proned', 'unit.stood', 'stamina.spent',
  'stamina.regen', 'stamina.gained', 'stamina.drained', 'knocked', 'knockback.blocked', 'kdb.rolled', 'thorns.reflected', 'prop.struck', 'prop.damaged', 'prop.destroyed', 'maxHp.lost', 'maxHp.gained', 'staminaMax.lost', 'statmod.added', 'statmod.expired', 'cooldown.set',
  'crit.effect', 'power.hit', 'life.downed', 'life.dead', 'bleedout.set', 'bleedout.tick', 'bleedout.accelerated', 'power.used', 'battle.end',
  /* 2026-09-03 */
  'encounter.begin', 'encounter.objective', 'encounter.wave', 'encounter.roll', 'unit.shunted', 'encounter.won', 'encounter.lost',
  'move.stopped', 'aoo.provoked', 'aoo.skipped', 'zoc.ignored', 'block.rolled',
  'corpse.created', 'corpse.removed', 'unit.raised', 'corpse.eaten', 'unit.obliterated',
  'deathbed.stood', 'deathbed.fell', 'deathbed.none', 'hp.reset',
  'unit.badged', 'unit.modified', 'badge.gained', 'badge.held', 'power.exhausted', 'charge.spent', 'maxstamina.gained',
  'surge.checked', 'surge.hit', 'power.gained',
  'layer.painted', 'layer.cancelled', 'band.advanced', 'night.fell', 'light.cast',
  'ai.mode', 'ai.hunts', 'ai.override']
