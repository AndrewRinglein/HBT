/* ── WHAT AN ACTION ACTUALLY DOES — pure, content-only ─────────────────────
   Every field the engine models is surfaced in the engine's own words:
     moves   — shape (path / sidestep / flight), stepRange, budgetMod, riders
     attacks — status rider, crit bonus, critCount, damage type
     bursts  — authored shape, recipient filters and ordered payload
     powers  — effect (damage / heal / selfGuard), area, range
   Split out of viewer-core.js 2026-09-02. */

import { MOD_UP, MOD_DOWN, BADGE_HUE } from './theme.js'

/* Signed numbers go through ONE helper. Hardcoding '+' produced "crit +-5" on
   Punch, whose crit is genuinely negative (2026-09-01). */
export const sgn = n => (n > 0 ? '+' : '') + n
export const STATSHORT = { strength: 'STR', precision: 'PRE', magic: 'MAG', spirit: 'SPI',
  accuracy: 'ACC', dodge: 'DODGE', armor: 'ARMOR', resist: 'MAGIC RESIST', fireResist: 'FIRE RESIST', poisonResist: 'POISON RESIST', shadowResist: 'SHADOW RESIST', coldResist: 'COLD RESIST', movement: 'MOVE', reach: 'REACH' }

/* ── THE KIT (seam.items-per-unit, folded 2026-09-03) ──────────────────────
   A hero is fielded as the bare row plus the items the log says it wears
   (unit.equipped): the granted attacks come FIRST — the weapon in hand — then
   the row's own, the same order the engine builds (core/items.ts applyItems).
   D = V.data: the unit sheets (UD) and the attack/ability tables (AT, AB) the
   grants resolve against. Nothing is computed: ids are looked up. */
/* WHAT AN ACTION IS — the ENGINE's answer (viewer.reads-engine, review V1). static.json's actionKinds is
   the engine's own predicates (core/action.ts isCharge · isAttack · isMove · isBurst · isPower) run over
   every row: 'charge' (an attack and a move at once — one of the unit's attacks, never a destination
   walk), 'attack', 'move', 'burst' or 'power'. The viewer kept its own copies and they disagreed: a
   movement profile won, so the fast zombie's Charge fell into neither column. A row the table does not
   name is a missing fact, and the viewer never guesses (Law 1). */
export function classOf(a, D) {
  const k = a && D && D.KINDS && D.KINDS[a.id]
  if (!k) throw new Error(`viewer: action ${a && a.id} has no engine classification — data.actionKinds (static.json) is missing it; re-dump with npm run static`)
  return k
}
export function kitOf(u, D) {
  const d = (D.UD || {})[u && u.typeId] || {}
  const kit = (u && u.kit) || { grants: [], abilities: [], badges: [] }
  /* ONE ACTION TYPE (engine 26fa562): one registry; where a row goes is the engine's classification */
  const ACT = D.ACT || {}
  const attacks = [], abilities = [], moves = []
  const push = (row) => { if (!row) return
    const k = classOf(row, D)
    const list = k === 'attack' || k === 'charge' ? attacks : k === 'move' ? moves : abilities
    if (!list.some(x => x.id === row.id)) list.push(row) }
  for (const id of kit.grants) push(ACT[id] && { id, ...ACT[id] })
  for (const a of (d.attacks || [])) push(a)
  for (const id of kit.abilities) push(ACT[id] && { id, ...ACT[id] })
  for (const p of (d.abilities || [])) push(p)
  /* a badge may grant an action too (badge.mechanism 2e76ede) */
  for (const id of (kit.badges || [])) push(ACT[id] && { id, ...ACT[id] })
  for (const m of (d.moves || [])) push(m)
  /* v2.prone, the engine's grantedActionIds: a status the unit holds may grant an action while held —
     a prone status's stand action ("only appears while prone"), named by the status's own row, in
     status-id order. Derived from what the log folded, so standing removes it with nothing to undo. */
  const ROWS = D.STATUS_ROWS || {}
  for (const sid of Object.keys((u && u.st) || {}).sort()) {
    const g = u.st[sid] > 0 && ROWS[sid] ? ROWS[sid].standAction : null
    if (g) push(ACT[g] && { id: g, ...ACT[g] })
  }
  return { attacks, abilities, moves }
}

/** the attack profile's kind (melee · ranged) for an attack or a charge; otherwise the engine's class */
export const kindOf = (a, D) => { const k = classOf(a, D); return k === 'attack' || k === 'charge' ? (a.attack.kind || 'melee') : k }

export function actionsOf(u, D) {
  if (!u) return []
  const k = kitOf(u, D)
  /* capability.charges: an action that spent its last use LEAVES the list
     (power.exhausted) — Andrew 2026-09-02, "they should vanish" */
  const spent = new Set(u.spent || [])
  const rows = []
  for (const m of k.moves)     if (!spent.has(m.id)) rows.push({ ...m, kind: 'move' })
  for (const a of k.attacks)   if (!spent.has(a.id)) rows.push({ ...a, kind: kindOf(a, D), isAttack: true, ...(classOf(a, D) === 'charge' ? { charge: true } : {}) })
  for (const p of k.abilities) if (!spent.has(p.id)) rows.push({ ...p, kind: classOf(p, D), isPower: true })
  return rows
}

/** the absorbing pool — the sum of every status the engine marks reducesIncomingDamage (static.json
    absorbingStatuses), as folded. ONE helper for the board's Protection bar and the panel's (review V4: the
    panel kept its own two-name list and took the first, where the engine and the board take the sum). */
export function absorbOf(u, D) {
  return ((D && D.ABSORBING_STATUSES) || []).reduce((n, id) => n + ((u && u.st && u.st[id]) || 0), 0)
}

/* EXEMPTION stat-delta (tools/exemptions.json): the per-stat sum of the
   modifiers the log stated — statmod.added, and the kit's stat deltas from
   unit.equipped — printed as the stat's delta and added to the resting
   movement numeral. The engine emits each modifier, not the running total. */
export function modOf(u, stat) {
  return ((u && u.mods) || []).reduce((n, m) => n + (m.stat === stat ? (m.value || 0) : 0), 0)
}
/** the unit's movement at rest: the sheet's figure plus every movement
    modifier the log stated (an item's −1, a wound's −1). During an activation
    the engine's own `movePoints` / `movePointsLeft` outrank it (activeMv —
    activation.begin, moved, surge.hit). At rest it misses what the engine reads
    only at activation: terrain, auras, Slow, Root (exemption move-range). */
export function mvOf(u, D) {
  const base = ((D.UD || {})[u && u.typeId] || {}).movement
  if (base == null) return null
  return Math.max(0, base + modOf(u, 'movement'))
}

/* EXEMPTION move-range (tools/exemptions.json): a path or flight spends the
   unit's movement budget, which the power may modify — the sum is the
   viewer's until the sheet states the move's range. A sidestep is exact.
   During the unit's own activation the budget is the ENGINE's (activeMv —
   activation.begin, moved, surge.hit; viewer.reads-engine, review V6); at rest
   it is the resting figure, which misses terrain, auras, Slow and Root. */
export function moveHexes(a, u, D) {
  const mv = a.move || {}
  if (mv.shape === 'sidestep') return a.range == null ? 1 : a.range
  const base = u && u.activeMv != null ? u.activeMv : mvOf(u, D)
  if (base == null) return null
  return Math.max(0, base + (mv.budgetMod || 0))
}

/* EXEMPTION dmg-fallback: the engine's own damageOnHit once this attack has
   been declared — it carries every live modifier — else the declare-time
   stat + bonus the ledger showed. The fallback duplicates engine math. */
export function dmgOf(a, u, D) {
  if (a.kind === 'burst') return null          // an action-bar row's kind is the engine's class (actionsOf)
  /* an attack's stat and bonus live under `attack` since 26fa562; a legacy
     power shape still carries them on the row */
  const p = a.attack || a
  const live = u && u.dmgSeen ? u.dmgSeen[a.id] : undefined
  /* viewer.live-stat-mods (2026-10-01; Andrew: "None of the attacks have their damage modified by the
     Strength" after a Leap): the seen number moves by whatever the attack's stat has gained or lost
     since it was seen (fold's dmgSeenMods); with nothing recorded it stands as seen */
  if (live != null) {
    const then = p.stat != null && u.dmgSeenMods && u.dmgSeenMods[a.id] ? (u.dmgSeenMods[a.id][p.stat] || 0) : null
    return { n: then == null ? live : Math.max(0, live + modOf(u, p.stat) - then), live: true }
  }
  // A scalar base is not the total of a multi-packet attack. Wait for the
  // engine's observed damageOnHit; authored packet rows remain visible below.
  if (p.secondaryDamage?.length) return null
  const statv = p.stat != null ? ((D.UD || {})[u && u.typeId] || {})[p.stat] : undefined
  // viewer.live-stat-mods: the sheet's stat plus the unit's live modifiers to it (an item's, a Leap's)
  if (statv != null) return { n: Math.max(0, statv + modOf(u, p.stat) + (p.bonus || 0)), live: false }
  return null
}

export function shortStatus(id, SN) {
  return SN[id] || String(id || '').replace(/^(test\.)?status\./, '')
}

/* ── WHAT A TRIGGER'S EFFECT IS CALLED (Angela, 2026-09-04) ────────────────
   > "Badge grant should not be labeled 'badge grant.' It should be labeled
   > what the badge grant is. In this case … it should be labeled
   > 'rotting flesh.'"

   Eleven effect kinds exist; four were named and SEVEN fell through to the raw
   engine id, so a zombie's claw read `badge.grant`, a ghoul's `corpse.consume`
   and the Kiln's `layer.paint`. Every one is named here, and the names that
   exist as content — a badge, a layer, a status — are READ FROM THE DUMPED
   TABLE, never typed (Law 4). The action bar and the panel both call this: they
   carried two diverging copies of the logic, which is why the panel and the bar
   could disagree about the same trigger. */
/* HOW MUCH, IN WORDS (viewer.panel-area-trigger-text, 2026-10-04): an effect's amount is a number or the engine's scaling
   rule (core/trigger.ts ValueSpec: base + mult × what ÷ div, rounded as stated — what is the party's Magic or Spirit, the
   enemy side's Power, or one of the acting unit's own stats). The panel printed the rule as a string — the Bruiser Demon's
   "Protection [object Object]". The rule is SAID, never worked out (Law 0): "0.334 × Power", "4 + ARMOR". */
const SCALE_WORD = { partyMagic: 'party Magic', partySpirit: 'party Spirit', power: 'Power' }
export function valueWords(v) {
  if (v == null || typeof v !== 'object') return v
  const what = v.scale === 'stat' ? statWord(v.stat) : SCALE_WORD[v.scale]
  if (!what) throw new Error('viewer: unknown value scale ' + JSON.stringify(v))
  const term = (v.mult != null && v.mult !== 1 ? v.mult + ' × ' : '') + what + (v.div != null && v.div !== 1 ? ' ÷ ' + v.div : '')
  return (v.base ? v.base + ' + ' : '') + term + (v.round ? ' (rounded ' + v.round + ')' : '')
}
export function effectWord(ef, D, SN) {
  const w = effectWordOf(ef, D, SN)
  if (w && w.val != null && typeof w.val === 'object') w.val = valueWords(w.val)
  return w
}
function effectWordOf(ef, D, SN) {
  if (!ef || !ef.kind) return null
  const BD = (D && D.BADGES) || {}, LY = (D && D.LAYERS) || {}
  const layerName = id => String(id || '').replace(/^layer\./, '')
  switch (ef.kind) {
    case 'status.apply':   return { word: shortStatus(ef.statusId, SN), val: ef.value, statusId: ef.statusId }
    case 'status.remove':  return { word: 'Remove ' + shortStatus(ef.statusId, SN), val: ef.value, statusId: ef.statusId }
    case 'badge.grant':    return { word: (BD[ef.badgeId] || {}).name || String(ef.badgeId || '').replace(/^badge\./, ''), badge: true }
    case 'damage':         return { word: (ef.damageType ? ef.damageType + ' damage' : 'Damage'), val: ef.amount ?? ef.value }
    case 'statDamage':    return { word: (ef.damageType ? ef.damageType + ' damage' : 'Damage'), val: ef.bonus }
    case 'burstScale':     return { word: 'Burst damage percentage', val: ef.percent }
    case 'heal':           return { word: 'Heal', val: ef.amount ?? ef.value }
    case 'knockback':      return { word: 'Knockback', val: ef.hexes ?? ef.value }
    case 'statMod':        return { word: statWord(ef.stat), val: ef.value, signed: true }
    case 'stamina.drain':  return { word: 'Stamina drain', val: ef.value }
    case 'stamina.gain':   return { word: 'Stamina', val: ef.value, signed: true }
    case 'loseMaxStamina': return { word: 'Max Stam', val: -Math.abs(ef.value), signed: true }
    case 'loseMaxHp':      return { word: 'Max Health', val: -Math.abs(ef.value), signed: true }
    case 'stand':          return { word: 'Stand up' }
    case 'reveal':         return { word: 'Reveal' }
    case 'corpse.eat':     return { word: 'Eats a corpse', val: ef.radius, radius: true }
    case 'power.gain':     return { word: 'Power', val: ef.value, signed: true }
    case 'layer.paint':    return { word: layerName(ef.layer) + ' ground', val: ef.radius, radius: true }
    case 'corpse.raise':   return { word: 'Raises a corpse', val: ef.radius, radius: true }
    case 'corpse.consume': return { word: 'Consumes a corpse', val: ef.radius, radius: true }
    /* an effect kind the engine added and the viewer has not been taught: show
       the engine's own word rather than invent one, and it is a viewer finding */
    default: return { word: ef.kind, unknown: true }
  }
}

/* ── WHO A TRIGGER OR A POWER LANDS ON, IN WORDS (viewer.panel-area-trigger-text, 2026-10-04) ─────────────
   A trigger's `select` is a word ('self' · 'target') or the engine's Targeting row (core/target.ts: select, side,
   radius, origin, requireTags, excludeSelf). The panel printed the row as a string — "→ [object Object]" on every
   area trigger (found landing fix.fire-imp-burn-spares-self). The words are made of the row's OWN fields, in the
   engine's own phrase for them (core/target.ts: "every OTHER unit within N hexes", "every other ally"): nothing is
   typed per unit, and a shape the viewer has not been taught throws rather than guess (Law 1). The engine has no
   namer of its own to read (viewer SWITCHES areaTargetWords). */
export function targetWords(sel) {
  if (sel === 'self') return 'self'
  if (sel === 'target') return 'the target'
  if (!sel || typeof sel !== 'object') throw new Error('viewer: unknown target ' + JSON.stringify(sel))
  const tags = (sel.requireTags || []).join(' ')
  const who = (tags ? tags + ' ' : '') + ({ any: 'unit', ally: 'ally', enemy: 'enemy' }[sel.side] || 'unit')
  if (sel.select === 'self') return 'self'
  if (sel.select === 'unit') return 'one ' + who
  if (sel.select !== 'area') throw new Error('viewer: unknown target select ' + JSON.stringify(sel.select))
  const every = 'every ' + (sel.excludeSelf ? 'other ' : '') + who
  if (sel.radius == null) return every                     // the whole side, unbounded — "heal all rangers"
  return every + ' within ' + sel.radius + ' hex' + (sel.radius === 1 ? '' : 'es') + (sel.origin === 'target' ? ' of the target' : '')
}

export function effectTag(a, u, D, SN) {
  const bits = []
  if (a.kind === 'burst') {
    const b = a.burst
    bits.push(b.shape.kind === 'radius' ? 'radius ' + b.shape.radius : b.shape.kind, b.side)
    if (b.requireTags?.length) bits.push('tags ' + b.requireTags.join(', '))
    for (const p of b.packets) bits.push((p.stat ? (STATSHORT[p.stat] || p.stat) + ' ' + sgn(p.amount) : String(p.amount)) + ' ' + p.damageType + (p.powerScale != null ? ' · Power scale ' + p.powerScale : ''))
    if (b.heal != null) bits.push('heal ' + b.heal)
    if (a.uses != null) bits.push(a.uses + ' uses per battle')
    if (a.free) bits.push('free')
    return bits.join(' · ')
  }
  if (a.kind === 'move') {
    /* "Move: 6", "Move: 1 · Ignore ZOC" (ruled 2026-09-01, Andrew's copy). The
       RNG cell prints the number; the tag keeps only the SHAPE. */
    const mv = a.move || {}
    const n = moveHexes(a, u, D)
    if (mv.shape === 'sidestep') bits.push(n === 0 ? 'stands still' : 'Ignore ZOC')
    else if (mv.shape === 'flight') bits.push('no steps')
    /* a path walk that provokes nothing says so — the move's own ignoresZoc (review V1; the hounds) */
    if (mv.shape !== 'sidestep' && mv.ignoresZoc) bits.push('Ignore ZOC')
    if (mv.budgetMod) bits.push(sgn(mv.budgetMod) + ' move')
    return bits.join(' · ')
  }
  const p = a.attack || a
  /* a Charge walks to its target and strikes, one action (capability.charge) */
  if (a.charge) bits.push('charge')
  if (a.effect === 'heal') bits.push('heals')
  if (a.effect === 'selfGuard') bits.push('protection, permanent stat cost')
  if (p.applies) bits.push(shortStatus(p.applies.statusId, SN) + ' ' + sgn(p.applies.value))
  if (p.crit) bits.push('crit ' + sgn(p.crit))
  if (p.hits > 1) bits.push(p.hits + ' hits')
  if (p.critCount > 1) bits.push(p.critCount + ' criticals')
  if (p.armorPenetration != null) bits.push('Armor penetration ' + p.armorPenetration)
  for (const packet of (p.secondaryDamage || [])) bits.push('on ' + packet.when + ': ' + packet.amount + ' ' + packet.damageType)
  if (a.uses != null) bits.push(a.uses + ' use' + (a.uses === 1 ? '' : 's') + ' per battle')
  if (a.free) bits.push('free')
  if (p.damageType) bits.push(p.damageType)
  return bits.join(' · ')
}

/* ── WHAT THIS ACTION TRIGGERS (ruled 2026-09-01) ─────────────────────────
   "You look at the attack, you see what it does, not somewhere else." The
   attack's own `applies` rider plus the unit's triggers on attack hooks;
   `onlyWithAttack` scopes a trigger to one attack. */
/* the attacker's hooks inside its attack — the engine's ATTACKER_HOOKS; tools/vocabulary.test.mjs
   checks this set against engine/generated/vocabulary.json (plumbing.vocabulary-export,
   2026-09-28, review finding V12: onBlock was missing, so an attacker-side onBlock trigger never
   reached the attack's chip row) */
export const ATTACK_HOOKS = new Set(['onHit', 'onAttack', 'onDamage', 'onKill', 'onMiss', 'onCrit', 'onBlock'])

/* ── EVERYTHING AN ACTION DOES (viewer.bar-shows-every-effect, 2026-10-04) ────────────────────────────────
   Engine DECISIONS.md 2026-10-03 'the action bar: … every action shows all it does' (Andrew: "some of the
   information and some of the actions are missing. For example, a dagger giving you one protection is not shown in
   the dagger attack."). The audit (tools/bar-audit.mjs) listed what the bar left unsaid; four things answer it, all
   read off the engine's rows and none typed per unit:
     unitTriggers  — the triggers a FIELDED unit carries: its row's own, then those its held items bring, then its
                     badges' (the engine's applyItems / applyBadges order). The bar and the panel read only the bare
                     row before, so the Dagger's "onAttack: gain 1 Protection" was on no screen.
     effectSentence — one effect as a sentence, in the Codex's wording ("gain 1 Protection", "apply 2 Bleed",
                     "regain 1 Stamina", "STR +2 for the rest of the Battle").
     ridersOf      — the unit's triggers that ride one action: an attacker hook, on an action with an attack profile
                     (the engine fires them from its attack pipeline only — a power fires none), unscoped or scoped
                     to this attack, and never a defender's onBlock.
     actionLines   — the whole of one action, a line per fact: the row's tooltip. */
const STAT_WORD = { ...STATSHORT, maxHp: 'MAX HEALTH', maxStamina: 'MAX STAMINA', staminaRegen: 'STAMINA REGEN', rangedBlock: 'RANGED BLOCK' }
const statWord = k => STAT_WORD[k] || String(k).replace(/([A-Z])/g, ' $1').toUpperCase()
const hexes = n => n + ' hex' + (n === 1 ? '' : 'es')
const HOOK_WORD = { onHit: 'On hit', onAttack: 'On attack', onDamage: 'On damage', onKill: 'On kill', onMiss: 'On miss', onCrit: 'On crit', onBlock: 'On block',
  onTakingDamage: 'When hit', onDeath: 'On death', onBurst: 'On burst', startOfBattle: 'At the start of the battle', onActivationEnd: 'At the end of its Activation' }
const UNTIL_WORD = { endOfTurn: 'this Turn', endOfNextTurn: 'until the end of the next Turn', endOfActivation: 'until the end of the Activation',
  endOfNextActivation: 'until the end of the next Activation', battle: 'for the rest of the Battle' }

export function unitTriggers(u, D) {
  const d = ((D && D.UD) || {})[u && u.typeId] || {}, ITEMS = (D && D.ITEMS) || {}, BD = (D && D.BADGES) || {}
  const out = [...(d.triggers || [])]
  for (const h of ((u && u.kit && u.kit.held) || [])) out.push(...((ITEMS[h.itemId] || {}).triggers || []))
  for (const id of ((u && u.badges) || [])) out.push(...((BD[id] || {}).triggers || []))
  return out
}

/** `sel`: who it lands on — a trigger's select ('self' · 'target' · a Targeting row), or for a power's own effect its `who`
    (absent: whoever the power is aimed at) */
export function effectSentence(ef, sel, D, SN) {
  if (!ef || !ef.kind) return ''
  const BD = (D && D.BADGES) || {}, UD = (D && D.UD) || {}
  const self = sel === 'self' || (sel && typeof sel === 'object' && sel.select === 'self')
  const area = sel && typeof sel === 'object' && !self ? targetWords(sel) : ''
  const onSelf = self ? ' (self)' : '', to = area ? ' to ' + area : '', amt = v => valueWords(v)
  const st = id => shortStatus(id, SN), badge = id => (BD[id] || {}).name || String(id || '').replace(/^badge\./, '')
  switch (ef.kind) {
    case 'status.apply':   return self ? `gain ${amt(ef.value)} ${st(ef.statusId)}` : `apply ${amt(ef.value)} ${st(ef.statusId)}${to}`
    case 'status.remove':  return `remove ${ef.value == null ? 'all' : ef.value} ${st(ef.statusId)}${self ? ' from self' : area ? ' from ' + area : ''}`
    case 'badge.grant':    return `inflict ${[ef.badgeId, ...(ef.withBadgeIds || [])].map(badge).join(' with ')}${to}`
    case 'damage':         return `${amt(ef.amount)} ${ef.damageType} damage${onSelf}${to}`
    case 'statDamage':     return `${statWord(ef.stat)} ${sgn(ef.bonus)} ${ef.damageType} damage${ef.allies === 'always' ? ', allies too' : ''}${to}`
    case 'burstScale':     return `burst damage ${ef.percent}%`
    case 'heal':           return `heal ${amt(ef.amount)}${onSelf}${to}`
    case 'knockback':      return `push ${typeof ef.value === 'number' ? hexes(ef.value) : amt(ef.value) + ' hexes'} directly away${to}`
    case 'statMod':        return `${statWord(ef.stat)} ${sgn(ef.value)} ${UNTIL_WORD[ef.until] || ef.until}${ef.floor != null ? ' (minimum ' + ef.floor + ')' : ''}${onSelf}${to}`
    case 'stamina.drain':  return `drain ${amt(ef.value)} Stamina${onSelf}${to}`
    case 'stamina.gain':   return `regain ${amt(ef.value)} Stamina${self ? '' : to}`
    case 'loseMaxStamina': return `lose ${ef.value} Max Stamina for the rest of the Battle`
    case 'loseMaxHp':      return `lose ${ef.value} Max Health${onSelf}${to}`
    case 'stand':          return 'stand up'
    case 'reveal':         return 'reveal what is hidden' + to
    case 'power.gain':     return `Power ${typeof ef.value === 'number' ? sgn(ef.value) : '+ ' + amt(ef.value)}`
    case 'layer.paint':    return `${String(ef.layer || '').replace(/^layer\./, '')} ground, radius ${ef.radius}${ef.origin === 'target' ? ' round the target' : ''}`
    case 'corpse.raise':   return `raise ${ef.count == null ? 'a corpse' : ef.count + ' corpses'} within ${hexes(ef.radius)} as ${(UD[ef.unit] || {}).name || ef.unit}`
    case 'corpse.consume': return `consume every corpse within ${hexes(ef.radius)}, heal ${ef.healPer} for each`
    case 'corpse.eat':     return `eat a corpse within ${hexes(ef.radius)}: heal ${ef.heal}${Object.entries(ef.mods || {}).map(([k, v]) => ', ' + statWord(k) + ' ' + sgn(v)).join('')}${ef.maxHp ? ', MAX HEALTH ' + sgn(ef.maxHp) : ''}`
    default:               return ef.kind
  }
}

export function ridersOf(u, a, D) {
  if (!a || !a.attack) return []
  return unitTriggers(u, D).filter(t => ATTACK_HOOKS.has(t.hook) && !(t.onlyWithAttack && t.onlyWithAttack !== a.id) && t.role !== 'defender')
}
const riderLine = (t, D, SN) => `${HOOK_WORD[t.hook] || t.hook}: ${effectSentence(t.effect, t.select, D, SN)}${t.chance != null && t.chance < 100 ? ' (' + t.chance + '%)' : ''}`

/** every fact of one action, a line each — the row's tooltip, whole (the button shows what fits) */
export function actionLines(a, u, D, SN) {
  const k = a.kind === 'move' ? 'move' : a.kind === 'burst' ? 'burst' : a.attack ? 'attack' : 'power'
  const p = a.attack, lines = []
  lines.push((a.name || a.id) + ' — ' + (k === 'attack' ? `${p.kind} attack${a.move ? ' (charge)' : ''} · ${p.damageType}` : k === 'move' ? 'movement' : k))
  const lim = ['Stamina ' + a.staminaCost]
  if (a.cooldown) lim.push('Cooldown ' + a.cooldown)
  if (a.warmup) lim.push('Warm-up ' + a.warmup)
  if (a.uses != null) lim.push(a.uses + ' use' + (a.uses === 1 ? '' : 's') + ' per battle')
  if (a.free) lim.push('free — does not end the Activation')
  if (a.slot) lim.push(a.slot === 'either' ? 'uses the move or the primary action' : a.slot === 'movement' ? 'uses the move' : 'uses the primary action')
  lines.push(lim.join(' · '))
  if (p) {
    const base = ((D.UD || {})[u && u.typeId] || {}).accuracy, dm = dmgOf(a, u, D)
    lines.push(`Accuracy ${base == null ? '—' : base}${p.accuracy ? ' · ACC ' + sgn(p.accuracy) + ' with this attack' : ''} · Range ${a.range} · Damage ${dm ? dm.n : '—'} (${statWord(p.stat)}${p.bonus ? ' ' + sgn(p.bonus) : ''}${p.powerScale != null ? ' + Power × ' + p.powerScale : ''})`)
    const more = []
    if (p.crit) more.push('crit ' + sgn(p.crit))
    if (p.hits > 1) more.push(p.hits + ' hits')
    if (p.critCount > 1) more.push(p.critCount + ' criticals on a crit')
    if (p.armorPenetration != null) more.push('Armor penetration ' + p.armorPenetration)
    if (p.impact) more.push('Impact ' + p.impact)
    if (p.destroy) more.push('Destroy ' + p.destroy)
    for (const s of (p.secondaryDamage || [])) more.push('on ' + s.when + ': ' + s.amount + ' ' + s.damageType)
    if (more.length) lines.push(more.join(' · '))
    if (p.applies) lines.push('On hit: apply ' + p.applies.value + ' ' + shortStatus(p.applies.statusId, SN))
  }
  const mv = a.move
  if (mv) {
    const n = k === 'move' ? moveHexes(a, u, D) : null, bits = []
    if (mv.shape === 'sidestep') bits.push(mv.stepRange === 0 ? 'stands still' : `steps exactly ${hexes(mv.stepRange == null ? 1 : mv.stepRange)}, any direction — Ignore ZOC`)
    else if (mv.shape === 'flight') bits.push(`flies${n == null ? '' : ' up to ' + hexes(n)} — no steps`)
    else bits.push(mv.hexes != null ? `walks at most ${hexes(mv.hexes)}` : `walks${n == null ? '' : ' up to ' + hexes(n)}`)
    if (mv.shape !== 'sidestep' && mv.ignoresZoc) bits.push('Ignore ZOC')
    if (mv.budgetMod) bits.push(sgn(mv.budgetMod) + ' move')
    lines.push(bits.join(' · '))
  }
  const b = a.burst
  if (b) {
    const bits = [b.shape.kind === 'radius' ? 'radius ' + b.shape.radius : b.shape.kind, 'strikes ' + ({ any: 'any unit', ally: 'allies', enemy: 'enemies' }[b.side] || b.side) + ' (' + b.side + ')']
    if (b.requireTags && b.requireTags.length) bits.push('tags ' + b.requireTags.join(', '))
    for (const q of b.packets) bits.push((q.stat ? statWord(q.stat) + ' ' + sgn(q.amount) : String(q.amount)) + ' ' + q.damageType + (q.powerScale != null ? ' · Power scale ' + q.powerScale : ''))
    if (b.heal != null) bits.push('heal ' + b.heal)
    if (b.impact) bits.push('Impact ' + b.impact)
    if (b.destroy) bits.push('Destroy ' + b.destroy)
    lines.push(bits.join(' · '))
  }
  if (a.target) lines.push('Target: ' + targetWords(a.target) + (!p && !mv && !b && a.range ? ' · Range ' + a.range : ''))
  else if (!p && !mv && !b && a.range) lines.push('Range ' + a.range)
  for (const e of (a.effects || [])) lines.push(effectSentence(e, e.who, D, SN))
  for (const t of ridersOf(u, a, D)) lines.push(riderLine(t, D, SN))
  return lines.filter(Boolean)
}

export function triggersFor(u, a, D, SN, stStyle) {
  if (a.kind === 'burst') return []
  const out = []
  const hueOf = w => w.statusId ? stStyle(w.statusId).hue : w.badge ? BADGE_HUE : '#d6b25e'
  if (a.kind === 'move') {
    /* a move's riders ARE the buff/debuff layer — same green/red as the stat block */
    for (const e of (a.effects || (a.move || {}).effects || [])) {
      const title = effectSentence(e, e.who, D, SN)
      if (e.kind === 'stamina.gain')       out.push({ word: 'Stamina ' + sgn(e.value), hue: MOD_UP, chance: 100, title })
      else if (e.kind === 'loseMaxStamina') out.push({ word: 'Max Stam ' + sgn(-Math.abs(e.value)), hue: MOD_DOWN, chance: 100, title })
      else if (e.kind === 'statMod')        out.push({ word: (STATSHORT[e.stat] || e.stat) + ' ' + sgn(e.value),
                                                        hue: e.value > 0 ? MOD_UP : MOD_DOWN, chance: 100, title })
      /* viewer.bar-shows-every-effect: any other rider a move carries (a heal, a status, standing up) is a chip too */
      else { const w = effectWord(e, D, SN); if (w) out.push({ word: w.word, val: w.val, hue: hueOf(w), chance: 100, title }) }
    }
    return out
  }
  const prof = a.attack || a
  if (prof.applies) out.push({ word: shortStatus(prof.applies.statusId, SN), val: prof.applies.value,
                            hue: stStyle(prof.applies.statusId).hue, chance: 100, title: 'On hit: apply ' + prof.applies.value + ' ' + shortStatus(prof.applies.statusId, SN) })
  /* viewer.bar-shows-every-effect: a power's own effects — every power is its `effects` list (engine fix.one-effect-vocabulary),
     and the bar showed none of them */
  for (const e of (a.effects || [])) { const w = effectWord(e, D, SN); if (w) out.push({ word: w.word, val: w.val, signed: w.signed, hue: hueOf(w), chance: 100, title: effectSentence(e, e.who, D, SN) }) }
  /* the unit's triggers that ride this action — its row's, its items', its badges' (was: the bare row's only, on powers too) */
  for (const t of ridersOf(u, a, D)) {
    const w = effectWord(t.effect || {}, D, SN)
    if (!w) continue
    /* "Poison 1, 20%" — the value wears the status colour, the odds stay grey.
       A badge is a permanent thing the unit takes away from the battle, so it
       wears the badge hue rather than the generic brass (2026-09-04). */
    out.push({ word: w.word, val: w.val, hue: hueOf(w), chance: t.chance == null ? 100 : t.chance, title: riderLine(t, D, SN) })
  }
  return out
}
