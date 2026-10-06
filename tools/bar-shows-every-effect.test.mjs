// viewer.bar-shows-every-effect (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once
// the move is done, nothing else greys; every action shows all it does; the Soldier holds no sword'). Andrew: "some of the
// information and some of the actions are missing. For example, a dagger giving you one protection is not shown in the dagger
// attack." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): THE AUDIT (tools/bar-audit.mjs) is
// run over the page for every unit the opening run can field — the engine's own list of each unit's actions and triggers
// (tools/fixtures/bar-audit-roster.json, held to the engine by test/viewer.bar-shows-every-effect.test.ts) against the bar as
// drawn — and wants (1) a button for every action on the engine's sheet and (2) everything an action does said on its button
// or in its tooltip. The Stab's own text is read. And past the roster: every action row the engine has, and every trigger an
// item brings, is said whole by the function the tooltip is drawn from. The sandbox's half is kingdom
// tools/bar-shows-every-effect.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { auditPage, actionNeeds, said } from './bar-audit.mjs'
import { actionLines, ridersOf, unitTriggers, triggersFor } from '../src/actions.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const ROSTER = JSON.parse(readFileSync('tools/fixtures/bar-audit-roster.json', 'utf8'))
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
/* Law 10, 2026-10-04 - viewer.bar-shows-tag-requirement (engine DECISIONS.md 2026-10-04 'after the backlog run: ... a trigger on the hero with a tag
   requirement ...'): a trigger may require a tag (`onlyWithTag`), and which actions carry a tag is the engine's answer, dumped (static.json tagCarriers).
   The page's functions are handed that table as the page hands it (was: D without it - the functions then had no answer for Pharaoh's Gauntlets'
   brawl requirement and refuse to guess). No assertion below is changed: every trigger an item brings is still said on each attack it rides - and
   which attacks a tag-required trigger rides is now the audit's question too (tools/bar-audit.mjs actionNeeds). */
const D = { UD: STATIC.units, ACT: STATIC.actions, BADGES: STATIC.badges, LAYERS: STATIC.layers, ITEMS: STATIC.items, KINDS: STATIC.actionKinds, TAG_CARRIERS: STATIC.tagCarriers }
let audit
const run = () => (audit ??= auditPage(html, ROSTER))

test('the audit, sheet actions vs bar buttons: every action the engine\'s unit holds is a button on its bar', () => {
  const { units } = run()
  /* Law 10, 2026-10-04 (engine fix.opening-probe-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "One,
     yes." — a party of 1, 2, 3, 4, 5, 6): this read
       assert.ok(units.length >= 80, 'the roster\'s units'); assert.ok(units.reduce((n, u) => n + u.actions.length, 0) >= 350, 'their actions')
     — floors under the roster of the day (83 units, 360 actions), whose opening battles 2 to 5 each fielded one more drafted
     hero than the player has. The roster is the engine's (held to it by test/viewer.bar-shows-every-effect.test.ts), and it
     is four heroes smaller by the ruling: 79 units, 340 actions. What the floors stood for is held exactly instead — the
     audit read EVERY unit of the roster and every action each holds — with a floor still under each so an emptied roster
     cannot pass. */
  const rostered = ROSTER.battles.flatMap(b => b.units), actionsOf = list => list.reduce((n, u) => n + u.actions.length, 0)
  assert.equal(units.length, rostered.length, 'the audit read every unit of the roster'); assert.ok(units.length >= 75, 'the roster\'s units')
  /* Law 10, 2026-10-06 — engine item rule.special-moves-unlock-at-level-two (engine DECISIONS.md 2026-10-06 'a hero's special moves
     unlock at level 2, ruled: all of them, every hero …'): this read
       assert.equal(actionsOf(units), actionsOf(rostered), 'and every action each holds'); assert.ok(actionsOf(units) >= 330, 'their actions')
     — a floor under the roster of the day, 340 actions. The roster is the engine's (held to it, unit for unit and action for
     action, by test/viewer.bar-shows-every-effect.test.ts), and a level-1 hero no longer holds its class's special move: 42
     fieldings of the opening are of a level-1 hero, so it is 298 actions over the same 79 units. What the floor stood for is
     held exactly beside it; the floor is said again under the roster as it is, so an emptied roster still cannot pass. */
  assert.equal(actionsOf(units), actionsOf(rostered), 'and every action each holds'); assert.ok(actionsOf(units) >= 290, 'their actions')
  const heroes = new Set(units.filter(u => u.typeId.startsWith('hero.base.')).map(u => u.typeId)); assert.equal(heroes.size, 24, 'the 24 base heroes')
  const missing = units.flatMap(u => u.missingActions.map(id => `${u.battle} · ${u.name}: ${id}`))
  assert.deepEqual(missing, [], 'no action on the engine\'s sheet is missing from the bar')
  for (const u of units) assert.deepEqual([...u.drawn].sort(), [...new Set(u.actions)].sort(), `${u.name}: the bar draws the unit's actions and nothing else`)
})

test('the audit, sheet effects vs shown text: everything an action does is on its button or in its tooltip', () => {
  const { gaps } = run()
  assert.deepEqual(gaps, [], 'the audit\'s list of what is not shown is empty:\n' + gaps.slice(0, 40).join('\n'))
})

test('the Stab: a unit holding a dagger sees "gain 1 Protection" on it — on the button and whole in the tooltip', () => {
  const { units } = run()
  const holders = units.filter(u => u.actions.includes('attack.dagger.stab'))
  assert.ok(holders.length >= 2, 'the Orphanage\'s civilians hold daggers')
  for (const u of holders) {
    const shown = u.rows['attack.dagger.stab']
    assert.match(shown, /On attack: gain 1 Protection/, `${u.name}: ${shown}`)
    assert.match(shown.split(' | ')[0], /Stab .*Protection 1/, 'the chip on the button itself: ' + shown.split(' | ')[0])
  }
  /* the Flaming Longsword's Slash says its fire: the Burn and the fire damage the item brings */
  const flaming = units.find(u => u.triggers.some(t => t.source === 'item.longsword.flaming'))
  assert.match(flaming.rows['attack.longsword.slash'], /On hit: apply 1 Burn/); assert.match(flaming.rows['attack.longsword.slash'], /On hit: 2 fire damage/)
  /* Law 10, 2026-10-04 — content.longsword-loses-stab (engine item; engine DECISIONS.md 2026-10-04 'after the backlog run: ... the Longsword loses Stab ...', "3 yes"): the Longsword's Stab is no longer a row, so it cannot be the
     action the fire is NOT said on. The rule is unchanged and said of every other action the holder has: a trigger scoped to the Slash is said on the Slash alone
     (was: assert.doesNotMatch(flaming.rows['attack.longsword.stab'], /Burn|fire/, 'a trigger scoped to the Slash is not said on the Stab')) */
  const others = flaming.actions.filter(id => id !== 'attack.longsword.slash')
  assert.ok(others.length > 0, 'the holder has other actions: ' + flaming.actions.join(', '))
  for (const id of others) assert.doesNotMatch(flaming.rows[id], /Burn|fire/, 'a trigger scoped to the Slash is not said on ' + id + ': ' + flaming.rows[id])
  /* a power's own effects are on its button (they were on no screen): the Bishop's Heal */
  const bishop = units.find(u => u.actions.includes('power.holy-symbol.heal'))
  assert.match(bishop.rows['power.holy-symbol.heal'].split(' | ')[0], /Heal .*party Spirit/); assert.match(bishop.rows['power.holy-symbol.heal'], /Target: one ally · Range 6/)
})

test('past the roster: every action row the engine has, and every trigger an item or a badge brings, is said whole', () => {
  const lacking = []
  for (const [id, row] of Object.entries(STATIC.actions)) {
    const a = { id, ...row, kind: STATIC.actionKinds[id] === 'move' ? 'move' : STATIC.actionKinds[id] === 'burst' ? 'burst' : 'x' }
    const shown = actionLines(a, {}, D, STATIC.statuses).join(' | ') + ' | ' + a.staminaCost
    for (const n of actionNeeds({ id, ...row }, [], STATIC)) { const lacks = n.needs.filter(x => !said(shown, x)); if (lacks.length) lacking.push(`${id}: ${n.what} — ${lacks.map(x => x.word ?? x.num ?? x.anyOf.join('|')).join(', ')} — "${shown}"`) }
  }
  assert.deepEqual(lacking.slice(0, 25), [], `${lacking.length} action rows not said whole`)
  assert.ok(Object.keys(STATIC.actions).length > 700, 'every row')
  /* every item's triggers reach the unit that holds it, and an attacker's trigger is said on the attack it rides */
  let brought = 0, riding = 0
  for (const [itemId, item] of Object.entries(STATIC.items)) {
    if (!item.triggers.length) continue
    const u = { typeId: 'unit.none', kit: { held: [{ itemId, grants: item.grants, abilities: item.abilities }] }, badges: [] }
    assert.deepEqual(unitTriggers(u, D), item.triggers, itemId); brought++
    for (const g of item.grants) { const a = { id: g, ...STATIC.actions[g] }, shown = actionLines(a, u, D, STATIC.statuses).join(' | ')
      for (const n of actionNeeds(a, item.triggers, STATIC).filter(n => n.what.startsWith('trigger '))) { riding++
        const lacks = n.needs.filter(x => !said(shown, x)); assert.deepEqual(lacks, [], `${itemId} ${g}: ${n.what} — "${shown}"`) } }
  }
  assert.ok(brought > 150 && riding > 100, `${brought} items bring triggers, ${riding} ride an attack`)
  for (const [badgeId, b] of Object.entries(STATIC.badges)) if ((b.triggers || []).length) assert.deepEqual(unitTriggers({ typeId: 'unit.none', badges: [badgeId] }, D), b.triggers, badgeId)
  /* the engine fires attacker hooks from its attack pipeline only: a power carries no rider, and a defender's onBlock rides nothing */
  const owner = { typeId: 't' }, DD = { ...D, UD: { t: { triggers: [{ id: 'x', hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 } },
    { id: 'y', hook: 'onBlock', role: 'defender', chance: 100, select: 'self', effect: { kind: 'status.apply', statusId: 'status.protection', value: 1 } }] } } }
  assert.deepEqual(ridersOf(owner, { id: 'power.p', effects: [] }, DD), [], 'a power fires no attacker hook')
  assert.deepEqual(ridersOf(owner, { id: 'attack.a', attack: { kind: 'melee' } }, DD).map(t => t.id), ['x'], 'an attack carries the unscoped onHit, not the defender\'s onBlock')
  assert.deepEqual(triggersFor(owner, { id: 'attack.a', kind: 'melee', attack: { kind: 'melee' } }, DD, STATIC.statuses, () => ({ hue: '#fff' })).map(t => t.title), ['On hit: apply 1 Burn'])
})

/* capability.damage-from-two-stats (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …':
   "We do need that."; 'the Force Staff is Precision plus half Magic, as magic damage'): the bar's damage line says every term of
   the sum, in the engine's own fields — never one stat alone. */
test('an attack whose damage is a sum of terms says each on its line: the Force Blast, the Destroyer staffs, a stat of the attacker\'s own', () => {
  const said = id => actionLines({ id, ...STATIC.actions[id] }, {}, D, STATIC.statuses).find(l => l.includes('Damage'))
  assert.match(said('attack.force-staff.force-blast'), /Damage — \(PRE\w* \+ ½ party MAG\w*\)/)
  assert.match(said('attack.staff-of-the-destroyer.ruin'), /\(PRE\w* \+ 2 × party MAG\w*\)/)
  assert.match(said('attack.staff-of-the-ultimate-destroyer.annihilation'), /\(2 × PRE\w* \+ 2 × party MAG\w*\)/)
  assert.match(said('attack.war-hammer.skullsplitter'), /\(STR\w* \+ ARM\w*/)
  // an attack of one stat reads as it did
  assert.match(said('attack.longsword.slash'), /\(STR\w* \+1\)/)
  // every attack row the engine gives a second term is said so: no attack with terms shows a bare one-stat sum
  let n = 0
  for (const [id, a] of Object.entries(STATIC.actions)) { const p = a.attack; if (!p || !(p.addsStats?.length || p.statMult > 1)) continue; n++; assert.ok(/ \+ |× /.test(said(id).split('(')[1]), id + ': ' + said(id)) }
  assert.ok(n > 15, n + ' attacks carry a second term')
})

/* capability.summons (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need:
   summons"): a power that places a unit on a hex says so on the bar - what it summons and where - and the fold and the log
   know the engine's two lines for it. Read off the engine's own rows (generated/static.json). */
test('a summon is said: the bar names the unit and the empty hex; an attack says its Accuracy against anything summoned; the fold knows unit.summoned and unit.dismissed', async () => {
  const { targetWords, effectWord, helpsTarget } = await import('../src/actions.js')
  const { FOLDED_TYPES } = await import('../src/fold.js')
  const call = STATIC.actions['power.staff-of-summoning.call-the-wolf']
  assert.ok(call, 'the engine holds Call the Wolf')
  assert.deepEqual(call.target, { select: 'hex', side: 'any' })
  assert.equal(targetWords(call.target), 'an empty hex')
  assert.equal(effectWord(call.effects[0], D, STATIC.statuses).word, 'Summons Wolf')
  assert.equal(helpsTarget(call, 'hero', null), true, 'nothing flies at anyone')
  const lines = actionLines({ id: 'power.staff-of-summoning.call-the-wolf', ...call }, {}, D, STATIC.statuses).join(' | ')
  assert.match(lines, /summon one Wolf on that hex, on your side/)
  assert.match(lines, /an empty hex/)
  for (const t of ['unit.summoned', 'unit.dismissed']) assert.ok(FOLDED_TYPES.includes(t), t)
  const unbinding = actionLines({ id: 'attack.staff-of-summoning.unbinding', ...STATIC.actions['attack.staff-of-summoning.unbinding'] }, {}, D, STATIC.statuses).join(' | ')
  assert.match(unbinding, /[+]15 Accuracy against anything summoned/)
})

/* capability.raise-lower-magic (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "we need
   to lower and raise magic"): a burst that counts its stat several times says so, and what using it does to the sides' party
   stats is on its line; the fold knows the two lines. Read off the engine's own rows (generated/static.json). */
test('a side\'s party stat changing is said: the Vortex reads Magic three times and what using it lowers; the fold knows side.stat.changed and side.stat.restored', async () => {
  const { sideStatWords } = await import('../src/actions.js')
  const { FOLDED_TYPES, createState, fold } = await import('../src/fold.js')
  const vortex = STATIC.actions['power.staff-of-the-magi.vortex']
  assert.ok(vortex && vortex.burst, 'the engine holds Vortex as a burst')
  assert.deepEqual(vortex.burst.sideStats, [{ stat: 'magic', side: 'own', value: -1, until: 'battle' }, { stat: 'power', value: -1, until: 'battle' }])
  assert.equal(sideStatWords(vortex.burst.sideStats[0]), "lowers the party's Magic by 1 for the rest of the Battle")
  assert.equal(sideStatWords(vortex.burst.sideStats[1]), "lowers the enemy side's Power by 1 for the rest of the Battle")
  assert.equal(sideStatWords({ stat: 'spirit', side: 'enemy', value: 2, until: 'endOfNextTurn' }), "raises the enemy side's Spirit by 2 until the end of the next Turn")
  const lines = actionLines({ id: 'power.staff-of-the-magi.vortex', ...vortex, kind: 'burst' }, {}, D, STATIC.statuses).join(' | ')
  assert.match(lines, /3 × MAG\w*/)
  assert.match(lines, /using it lowers the party's Magic by 1 for the rest of the Battle/)
  assert.match(lines, /using it lowers the enemy side's Power by 1 for the rest of the Battle/)
  for (const t of ['side.stat.changed', 'side.stat.restored']) assert.ok(FOLDED_TYPES.includes(t), t)
})

/* capability.his-weapons-small-clauses (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'his 28 reward weapons read back …':
   "Everything else in here seems like something we need."): "On kill: the corpse is destroyed" is said under the attack it rides
   (the Staff of the Destroyer's Ruin, a weapon of Destroying), a status removed by a stat's amount says the amount (Mending
   Light: Weak equal to Spirit), and the fold takes a destroyed body off the board and says so. Read off the engine's own rows
   (generated/static.json). */
test('the corpse destroyed on a kill and a status removed by a stat\'s amount are said; the fold takes the destroyed body off the board', async () => {
  const { effectSentence, effectWord } = await import('../src/actions.js')
  const { createState, fold } = await import('../src/fold.js')
  const RUIN = 'attack.staff-of-the-destroyer.ruin'
  const staff = STATIC.items['item.staff-of-the-destroyer']
  const onKill = (staff.triggers || []).find(t => t.onlyWithAttack === RUIN && t.effect.kind === 'corpse.destroy')
  assert.ok(onKill, 'the engine holds Ruin\'s on-kill')
  assert.equal(effectSentence(onKill.effect, onKill.select, D, STATIC.statuses), 'the corpse is destroyed — nothing is left to raise or eat')
  assert.deepEqual(effectWord(onKill.effect, D, STATIC.statuses), { word: 'Destroys the corpse' })
  // it rides the attack it is scoped to, for a unit holding the staff, and no other attack
  const holder = { typeId: 'hero.base.mage-fire', kit: { held: [{ itemId: 'item.staff-of-the-destroyer' }] }, badges: [] }
  assert.deepEqual(ridersOf(holder, { id: RUIN, ...STATIC.actions[RUIN] }, D).filter(t => t.effect.kind === 'corpse.destroy').map(t => t.id), ['trigger.staff-of-the-destroyer.ruin.corpse-destroyed'])
  assert.deepEqual(ridersOf(holder, { id: 'attack.punch', ...STATIC.actions['attack.punch'] }, D).filter(t => t.effect.kind === 'corpse.destroy'), [])
  // the artifact attribute, on the weapon it is on
  const sword = STATIC.items['item.longsword.destroying']
  assert.deepEqual((sword.triggers || []).filter(t => t.effect.kind === 'corpse.destroy').map(t => [t.hook, t.onlyWithAttack]), [['onKill', 'attack.longsword.slash.destroying']])
  // Mending Light: the amount removed is the party's Spirit, said as every scaled amount is
  const mending = STATIC.actions['power.benevolent-rod.restoration']
  assert.ok(mending, 'the engine holds Mending Light')
  const remove = mending.effects.find(e => e.kind === 'status.remove')
  assert.match(effectSentence(remove, undefined, D, STATIC.statuses), /^remove party Spirit weak$/i)
  assert.match(effectSentence({ kind: 'status.remove', statusId: 'status.weak', value: 2 }, undefined, D, STATIC.statuses), /^remove 2 weak$/i)
  assert.match(effectSentence({ kind: 'status.remove', statusId: 'status.weak' }, undefined, D, STATIC.statuses), /^remove all weak$/i)
  assert.doesNotMatch(actionLines({ id: 'power.benevolent-rod.restoration', ...mending }, {}, D, STATIC.statuses).join(' | '), /object Object/)
  // the fold: the body is made, then destroyed - off the board, with its beat and its words
  const S = createState(), ctx = { UD: STATIC.units, SN: STATIC.statuses }
  fold(S, { type: 'corpse.created', causeId: RUIN, corpse: 1, hex: 89, of: 2, typeId: 'unit.zombie', side: 'enemy' }, ctx)
  assert.deepEqual(Object.keys(S.corpses), ['1'])
  const cues = fold(S, { type: 'corpse.removed', causeId: onKill.id, corpse: 1, hex: 89, how: 'destroyed', actor: 0, typeId: 'unit.zombie' }, ctx)
  assert.deepEqual(Object.keys(S.corpses), [])
  assert.ok(cues.some(c => c.k === 'corpse.gone' && c.how === 'destroyed' && c.hex === 89), 'the body\'s leaving beat')
  assert.ok(cues.some(c => c.k === 'float' && c.text === 'CORPSE DESTROYED' && c.hex === 89), 'the words over the hex')
})

/* capability.planted-banners (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a feature
   that is needed …': "All of those deadlines need to be added in as features that we need."): a power that plants a banner
   says all of it - that it is planted on the user's hex and stays, its reach, each stat it lends, the Weak it wards and what
   it gives at the End of an Activation - in the engine's own fields, and once a Battle. Read off the engine's own rows
   (generated/static.json); the audit holds every such row the same way (tools/bar-audit.mjs). */
test('a planted banner is said whole on its power: the hex, the reach, the stats, the ward, the lent triggers, one use a Battle', async () => {
  const { effectSentence, effectWord, plantWords } = await import('../src/actions.js')
  const id = 'power.banner-courage.plant', courage = STATIC.actions[id]
  assert.ok(courage, 'the engine holds Plant the Courage Banner')
  const plant = courage.effects[0]
  assert.deepEqual([plant.kind, plant.radius, plant.mods, plant.wards, plant.lends.map(t => [t.hook, t.effect])], ['plant', 2, { resist: 1 }, { 'status.weak': 2 }, [['onActivationEnd', { kind: 'surge.gain', value: 10 }]]])
  const said = plantWords(plant, D, STATIC.statuses)
  assert.match(said, /^plant a banner on your hex — it stays for the rest of the Battle, and you may walk away; allies within 2 hexes of that hex: /)
  assert.match(said, /RES\w* \+1/i)
  /* Restated 2026-10-06 (engine item content.resistance-to-weak-and-vigil-party-spirit; ruled 2026-10-05, GLOSSARY.md
     'Resistance to Weak'): the same two points, under the settled word. It was:
       assert.match(said, /2 of each weak does not land/i) */
  assert.match(said, /Resistance to Weak 2 \(2 points come off each Weak gained\)/)
  assert.match(said, /at the end of its activation: Surge Chance \+10/)
  assert.equal(effectSentence(plant, undefined, D, STATIC.statuses), said)
  assert.deepEqual(effectWord(plant, D, STATIC.statuses), { word: 'Plants a banner', val: 2, radius: true })
  assert.equal(effectSentence({ kind: 'surge.gain', value: 30 }, 'self', D, STATIC.statuses), 'Surge Chance +30')
  const lines = actionLines({ id, ...courage }, {}, D, STATIC.statuses).join(' | ')
  assert.ok(lines.includes(said), 'the tooltip carries the sentence')
  assert.match(lines, /Stamina 3/); assert.match(lines, /1 use/i)
  // the other banners the engine holds, by the same function: the Assassin's crit and its on-crit, the Vigil's heal, the Heroic's two stats and heal
  const of = pid => plantWords(STATIC.actions[pid].effects[0], D, STATIC.statuses)
  assert.match(of('power.banner-assassin.plant'), /within 1 hex of that hex: CRIT\w* \+20 · on crit: regain 1 Stamina/i)
  // Restated 2026-10-06 (engine item content.resistance-to-weak-and-vigil-party-spirit; ruled 2026-10-05, "2 by the party
  // spirit"): the Vigil heals by the PARTY's Spirit, and the bar says so in the words every party-Spirit heal has. It was:
  //   assert.match(of('power.banner-vigil.plant'), /within 1 hex of that hex: at the end of its activation: heal SPI\w*/i)
  assert.match(of('power.banner-vigil.plant'), /within 1 hex of that hex: at the end of its activation: heal party Spirit$/)
  assert.match(of('power.banner-heroism.plant'), /within 3 hexes of that hex: STR\w* \+2 · PRE\w* \+2 · at the end of its activation: heal 5/i)
  assert.equal(STATIC.actions['power.banner-mystic-power.plant'], undefined, 'the Mystic Banner is not planted as an object that does nothing')
})

/* capability.placed-traps (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a feature
   that is needed …': "All of those deadlines need to be added in as features that we need."): a use that places a trap says
   all of it - the empty hex it is aimed at, that one use is two hexes where it is, who the trap springs on, its damage and
   type, the status it leaves, who else it strikes and the ground its hex gains. Read off the engine's own rows
   (generated/static.json); the audit holds every such row the same way (tools/bar-audit.mjs). */
test('a trap is said whole on its use: the hex, the two hexes of one use, who springs it, its damage, its status, its radius, its ground', async () => {
  const { effectSentence, effectWord, trapWords } = await import('../src/actions.js')
  const row = id => STATIC.actions[id], trap = id => row(id).effects[0]
  const bear = row('power.bear-trap.use')
  assert.ok(bear, 'the engine holds the Bear Traps\' use')
  assert.deepEqual([bear.staminaCost, bear.uses, bear.range, bear.hexes, bear.target.select], [1, 1, 3, 2, 'hex'])
  assert.deepEqual(trap('power.bear-trap.use'), { kind: 'trap.place', damage: { amount: 4, damageType: 'physical' }, statuses: [{ statusId: 'status.root', value: 1 }] })
  assert.match(trapWords(trap('power.bear-trap.use'), D, STATIC.statuses), /^place a trap on that hex — the first unit to enter it takes 4 physical damage and gains 1 root; then the trap is gone$/i)
  assert.equal(effectSentence(trap('power.bear-trap.use'), undefined, D, STATIC.statuses), trapWords(trap('power.bear-trap.use'), D, STATIC.statuses))
  assert.deepEqual(effectWord(trap('power.bear-trap.use'), D, STATIC.statuses), { word: 'Places a trap' })
  const lines = actionLines({ id: 'power.bear-trap.use', ...bear }, {}, D, STATIC.statuses).join(' | ')
  assert.match(lines, /Stamina 1/); assert.match(lines, /1 use per battle/); assert.match(lines, /one use is 2 hexes, chosen one after another/)
  assert.match(lines, /empty hex/i)
  // the other three, by the same function
  assert.match(trapWords(trap('power.explosive-trap.use'), D, STATIC.statuses), /the first unit to enter it, and every unit within 1 hex of it, takes 2 \+ party Magic magic damage; then the trap is gone$/)
  assert.match(trapWords(trap('power.fire-trap.use'), D, STATIC.statuses), /takes party Magic magic damage and gains 1 burn; the hex becomes burning ground; then the trap is gone$/i)
  assert.match(trapWords(trap('power.magic-trap.use'), D, STATIC.statuses), /takes 2 × party Magic magic damage and gains 3 slow; then the trap is gone$/i)
  assert.equal(row('power.explosive-trap.use').hexes, undefined, 'the Explosive Trap is one trap')
  assert.doesNotMatch(actionLines({ id: 'power.explosive-trap.use', ...row('power.explosive-trap.use') }, {}, D, STATIC.statuses).join(' | '), /one use is/)
})

/* capability.stabilise-downed-ally (engine item, 2026-10-05; engine DECISIONS.md 2026-10-04 'every dead line on his items is a
   feature that is needed …': "All of those deadlines need to be added in as features that we need."): the Bandages say whom
   they may be used on - one DOWNED ally, within 1 hex - and what they do: the bleed-out count stops. Free, one use. Read off
   the engine's own rows (generated/static.json); the audit holds the row the same way (tools/bar-audit.mjs). */
test('the Bandages say whom they are aimed at and what they stop: one downed ally within 1 hex, its bleed-out count; free, one use', async () => {
  const { effectSentence, effectWord, targetWords } = await import('../src/actions.js')
  const id = 'power.bandages.use', use = STATIC.actions[id]
  assert.ok(use, 'the engine holds the Bandages\' use')
  assert.deepEqual([use.staminaCost, use.uses, use.free, use.range, use.target, use.effects], [0, 1, true, 1, { select: 'unit', side: 'ally', life: 'downed' }, [{ kind: 'bleedout.stop' }]])
  assert.equal(targetWords(use.target), 'one downed ally')
  assert.equal(targetWords({ select: 'unit', side: 'ally' }), 'one ally')
  assert.equal(effectSentence(use.effects[0], undefined, D, STATIC.statuses), 'stop its bleed-out count — it stays down and does not die of the count')
  assert.deepEqual(effectWord(use.effects[0], D, STATIC.statuses), { word: 'Stops the bleed-out' })
  const lines = actionLines({ id, ...use }, {}, D, STATIC.statuses).join(' | ')
  assert.match(lines, /one downed ally/); assert.match(lines, /stop its bleed-out count/)
  assert.match(lines, /Stamina 0/); assert.match(lines, /1 use per battle/); assert.match(lines, /free/)
})
