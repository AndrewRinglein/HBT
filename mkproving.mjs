// mkproving.mjs — writes every Proving plan in content/proving/ from the engine pack's rows.
// Session 9 (2026-09-04/05). Re-run after every pack change: node mkproving.mjs (from content/). Never hand-edit a plan file.
// Retune of 2026-09-05 folded in: C1's enemy six is TWELVE ZOMBIES (9-PROVING-NOTES §2b); the initiative plans run under mirrorSideRules: row.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const s = readFileSync(root + '/engine/src/content/generated/pack.ts', 'utf8')
const pack = eval('(' + s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1) + ')')
const rows = [...pack.prologueParty, ...pack.authoredEnemies].filter((r) => !/^unit\.test/.test(r.typeId))
const heroes = rows.filter((r) => r.typeId.startsWith('hero.base.'))
const civilians = rows.filter((r) => r.typeId.startsWith('hero.fixed.'))
const enemies = rows.filter((r) => r.typeId.startsWith('unit.'))
const kit = (id) => { const r = rows.find((x) => x.typeId === id); return { unit: id, items: [...(r.defaultItems ?? [])] } }
const MAPS = ['map.proving.open', 'map.proving.ridge', 'map.proving.ford', 'map.proving.copse', 'map.proving.ruin']
const z = (n) => Array(n).fill('unit.zombie')
const W = (id, o) => { mkdirSync(root + '/content/proving', { recursive: true }); writeFileSync(`${root}/content/proving/${id}.json`, JSON.stringify(o, null, 2) + '\n'); console.log(id, 'subjects', (o.subjects ?? []).length, 'matchups', (o.matchups ?? []).length) }

// C1 — the control: three kitted heroes west, twelve zombies east (was four zombies + two ghouls; retuned). Seat 2 (the mage) is the hero seat subjects replace; seat 0 (a zombie) the enemy seat.
const C1_HEROES = ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire'].map(kit)
// RETUNED 2026-09-05 (engine session, per 9-PROVING-SETTLED §3 step 2): on pack f7507218a00e C1 as written (z4 g2) went 1-4 on the seed-1 five; twelve zombies went 3-2 / 6-4 / +107 and is the control. Seat 0 is still a zombie.
const C1_ENEMIES = z(12)
const C1_AS_WRITTEN = [...z(4), 'unit.ghoul', 'unit.ghoul']
const SQUADS = { 'squad.c1-heroes': C1_HEROES, 'squad.c1-enemies': C1_ENEMIES }
const F = [{ id: 'f.c1', hero: 'squad.c1-heroes', enemy: 'squad.c1-enemies' }]
const common = { maps: MAPS, seed: 1 }

// 1. initiative — enemies against enemies, hero side (west) moves first. Matchups only.
const mirrors = { 'squad.zombies-4': z(4), 'squad.zombies-6': z(6), 'squad.strong-zombies-4': Array(4).fill('unit.strong-zombie'), 'squad.skeletons-4': Array(4).fill('unit.skeleton'), 'squad.ghouls-4': Array(4).fill('unit.ghoul'), 'squad.imps-4': Array(4).fill('unit.imp'), 'squad.demon-hounds-4': Array(4).fill('unit.demon-hound') }
W('initiative', { id: 'proving.initiative', switches: { mirrorSideRules: 'row' }, note: 'How much does initiative matter? Enemies against enemies (ruled 2026-09-04: the hero-side rules — Deathbed Fighting, stamina — stay out of it), the same four on both sides, the west side moves first. Ten battles a mirror on each of the five Proving maps; the rank page reports per map, because the starting gap set by each map\'s deploy edges moves this number by itself (9-PROVING-NOTES §6: the first mover\'s edge repeats every 2×movement hexes). Runs under mirrorSideRules: row (E4, landed 2026-09-05): a zombie stays a zombie wherever it stands.', ...common, squads: mirrors, fixtures: [], subjects: [], matchups: Object.keys(mirrors).map((sq) => ({ id: 'm.' + sq.slice(6), hero: sq, enemy: sq, sides: 'byList', pairs: 10 })) })

// 1b. initiative by starting gap — the open map only, the two lines placed a chosen distance apart. `gap` is an engine ask (E6).
W('initiative-gap', { id: 'proving.initiative-gap', switches: { mirrorSideRules: 'row' }, note: 'Initiative by starting distance, zombies-4 mirror on the open Proving map, twenty seeds a gap. `gap` (hexes between the two lines, overriding the deploy edges) is a matchup field the rig must learn (9-PROVING-SETTLED E6). Interim probe on map.open: first mover 17-3 at gap 3 and 11, 14-6 at 5 and 13, 9-11 at 7, 9 and 15.', maps: ['map.proving.open'], seed: 1, squads: { 'squad.zombies-4': z(4) }, fixtures: [], subjects: [], matchups: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((gap) => ({ id: 'm.zombies-4-gap-' + gap, hero: 'squad.zombies-4', enemy: 'squad.zombies-4', sides: 'byList', gap, pairs: 20 })) })

// 2. controls — confirm C1 on the Proving maps, with the neighbours to retune from.
const cands = { 'squad.c1-enemies': C1_ENEMIES, 'squad.c1-z4g2': C1_AS_WRITTEN, 'squad.c1-z3g2': [...z(3), 'unit.ghoul', 'unit.ghoul'], 'squad.c1-z5g2': [...z(5), 'unit.ghoul', 'unit.ghoul'], 'squad.c1-z6g2': [...z(6), 'unit.ghoul', 'unit.ghoul'], 'squad.c1-z5g1': [...z(5), 'unit.ghoul'], 'squad.c1-z4g3': [...z(4), 'unit.ghoul', 'unit.ghoul', 'unit.ghoul'], 'squad.c1-z13': z(13), 'squad.c1-z14': z(14) }
W('controls', { id: 'proving.controls', note: 'The control fight, confirmed on the Proving maps before any subject hangs on it. C1 is three kitted level-1 heroes (warrior-iron, ranger-aggressive, mage-fire, start kits) against TWELVE ZOMBIES — retuned 2026-09-05 from four zombies + two ghouls (squad.c1-z4g2 here), which went 1-4 on the seed-1 five once Rotting Flesh fell to 2%. The neighbours are here so the retune is a choice among measured fixtures, not a guess: the rule is the candidate whose hero wins of ten is nearest five, ties to the margin nearest zero, ties to the fewer bodies. Whichever wins becomes squad.c1-enemies in the three unit plans (9-PROVING-SETTLED §3).', ...common, squads: { 'squad.c1-heroes': C1_HEROES, ...cands }, fixtures: [], subjects: [], matchups: Object.keys(cands).map((sq) => ({ id: 'm.c1-v-' + sq.slice(6), hero: 'squad.c1-heroes', enemy: sq, pairs: 10 })) })

// 3. every hero — replaces the mage seat of C1, in its own start kit.
W('units-hero', { id: 'proving.units-hero', note: 'Every hero.base.* row, level 1, in its own start kit (ruled 2026-09-04: heroes do not exist without kits), replacing seat 2 (mage-fire) of the control three. The subject\'s `items` ride into its seat (E5, landed 2026-09-05). Five pairs a subject: one seed, five maps.', ...common, squads: SQUADS, fixtures: F, subjects: heroes.map((r) => ({ id: r.typeId, fixture: 'f.c1', rotation: 'replace', side: 'hero', slot: 2, items: [...(r.defaultItems ?? [])] })), matchups: [{ id: 'm.c1', hero: 'squad.c1-heroes', enemy: 'squad.c1-enemies' }] })

// 4. every enemy — replaces a zombie seat of C1.
W('units-enemy', { id: 'proving.units-enemy', note: 'Every authored unit.* row (the unit.test-* rows are not content), replacing seat 0 (a zombie) of the control six. Five pairs a subject: one seed, five maps. A unit the fielding refuses (no attack, a row the registry lacks) is INVALID with its reason — a finding about the row, listed on the page, never a zero.', ...common, squads: SQUADS, fixtures: F, subjects: enemies.map((r) => ({ id: r.typeId, fixture: 'f.c1', rotation: 'replace', side: 'enemy', slot: 0 })), matchups: [{ id: 'm.c1', hero: 'squad.c1-heroes', enemy: 'squad.c1-enemies' }] })

// 5. every civilian — the same seat as the heroes, in what the row carries.
W('civilians', { id: 'proving.civilians', note: 'Every hero.fixed.* civilian row, replacing seat 2 (mage-fire) of the control three — the same seat the heroes take, so a civilian\'s number sits on the hero ladder and reads against it. Items are what the row carries (a pitchfork, a pile of rocks); a row with none fields bare, which for a civilian is the truth.', ...common, squads: SQUADS, fixtures: F, subjects: civilians.map((r) => ({ id: r.typeId, fixture: 'f.c1', rotation: 'replace', side: 'hero', slot: 2, items: [...(r.defaultItems ?? [])] })), matchups: [{ id: 'm.c1', hero: 'squad.c1-heroes', enemy: 'squad.c1-enemies' }] })

// ── passes two and three ──
const row = (id) => rows.find((x) => x.typeId === id)
const imps = (n) => Array(n).fill('unit.imp')
const classOf = (r) => (r.tags ?? []).find((t) => t.startsWith('class.'))

const C3_HEROES = ['hero.base.paladin-shiney', 'hero.base.rogue-raven', 'hero.base.priest-robes'].map(kit)
const C2_ENEMIES = [...imps(4), 'unit.fire-imp', 'unit.hellhound']   // a guess to be confirmed — controls-2 carries the neighbours

// ── pass two ────────────────────────────────────────────────────────────────
// controls-2: C2 = the C1 heroes against a demon six (imp seat 0 is the enemy seat); C3 = a second hero three against C1's undead (priest seat 2 is the hero seat).
const c2 = { 'squad.c2-enemies': C2_ENEMIES, 'squad.c2-imps-5': imps(5), 'squad.c2-imps-6': imps(6), 'squad.c2-imps-7': imps(7), 'squad.c2-imps-4-fire-poison': [...imps(4), 'unit.fire-imp', 'unit.poison-imp'], 'squad.c2-imps-3-hound-hell': [...imps(3), 'unit.demon-hound', 'unit.hellhound'], 'squad.c2-imps-5-hound': [...imps(5), 'unit.demon-hound'], 'squad.c2-imps-4-hell-hell': [...imps(4), 'unit.hellhound', 'unit.hellhound'] }
const c3 = { 'squad.c3-enemies': C1_ENEMIES, 'squad.c3-z8': z(8), 'squad.c3-z10': z(10), 'squad.c3-z14': z(14), 'squad.c3-z4g2': C1_AS_WRITTEN, 'squad.c3-z3g2': [...z(3), 'unit.ghoul', 'unit.ghoul'], 'squad.c3-z5g1': [...z(5), 'unit.ghoul'], 'squad.c3-z6': z(6) }
W('controls-2', { id: 'proving.controls-2', note: 'Pass two (Angela 2026-09-04: "a plan for 1 and 2"): a second control per side. C2 keeps the C1 heroes and swaps the family — a demon six, imps with a fire-imp and a hellhound, seat 0 an imp. C3 keeps C1\'s zombies (twelve, retuned) and swaps the heroes — paladin-shiney, rogue-raven, priest-robes in start kits, seat 2 the priest. Same retune rule as C1 (9-PROVING-SETTLED §3): the candidate whose seed-1 five is 2-3 or 3-2, ties to the ten-battle margin nearest zero, ties to fewer bodies; the winner becomes squad.c2-enemies / squad.c3-enemies in the -2 unit plans. Interim data: the C1 four beat imps-4 10-0 and imps-5 7-1-2; the second four lost to ghouls-4 0-10 and split undead-close 4-6 — expect C3 lighter than C1.', ...common, squads: { 'squad.c1-heroes': C1_HEROES, 'squad.c3-heroes': C3_HEROES, ...c2, ...c3 }, fixtures: [], subjects: [], matchups: [...Object.keys(c2).map((sq) => ({ id: 'm.c2-v-' + sq.slice(6), hero: 'squad.c1-heroes', enemy: sq, pairs: 10 })), ...Object.keys(c3).map((sq) => ({ id: 'm.c3-v-' + sq.slice(6), hero: 'squad.c3-heroes', enemy: sq, pairs: 10 }))] })

const SQ2 = { 'squad.c1-heroes': C1_HEROES, 'squad.c2-enemies': C2_ENEMIES, 'squad.c3-heroes': C3_HEROES, 'squad.c3-enemies': C1_ENEMIES }
const F2 = [{ id: 'f.c2', hero: 'squad.c1-heroes', enemy: 'squad.c2-enemies' }, { id: 'f.c3', hero: 'squad.c3-heroes', enemy: 'squad.c3-enemies' }]
const M2 = [{ id: 'm.c2', hero: 'squad.c1-heroes', enemy: 'squad.c2-enemies' }, { id: 'm.c3', hero: 'squad.c3-heroes', enemy: 'squad.c3-enemies' }]
const both = (list, side, slot, withItems) => list.flatMap((r) => ['f.c2', 'f.c3'].map((fx) => ({ id: r.typeId, fixture: fx, rotation: 'replace', side, slot, ...(withItems ? { items: [...(r.defaultItems ?? [])] } : {}) })))
W('units-hero-2', { id: 'proving.units-hero-2', note: 'Pass two: every hero.base.* row on the two second controls — C2 (same teammates, demons across) and C3 (different teammates, the same undead). Seat 2 both times: the mage in C2, the priest in C3. A hero whose C1, C2 and C3 numbers disagree is the row to read.', ...common, squads: SQ2, fixtures: F2, subjects: both(heroes, 'hero', 2, true), matchups: M2 })
W('units-enemy-2', { id: 'proving.units-enemy-2', note: 'Pass two: every unit.* row on C2 (replacing an imp, seat 0, among demons) and C3 (replacing a zombie, seat 0, against a different hero three).', ...common, squads: SQ2, fixtures: F2, subjects: both(enemies, 'enemy', 0, false), matchups: M2 })
W('civilians-2', { id: 'proving.civilians-2', note: 'Pass two: every civilian on C2 and C3, the hero seat, as in proving.civilians.', ...common, squads: SQ2, fixtures: F2, subjects: both(civilians, 'hero', 2, true), matchups: M2 })

// levels: each hero and civilian at L2, L4, L6, L8, L10 against ITSELF at L1 — one fixture per unit, the unit in seat 2 of C1, `grow` on that seat (the rig has this today).
const specByClass = {}; for (const sp of Object.values(pack.specialties)) (specByClass[sp.class] ??= []).push(sp.id)
const refSpec = (cls) => specByClass[cls]?.[0]
const pickOf = (tableId) => pack.levels[tableId]?.rows.find((r) => r.choice)?.choice[0]
const tableOf = (r) => r.levelTable ?? classOf(r)
const progressAt = (r, level) => { const cls = classOf(r); const p = { level, specialtyId: refSpec(cls) }; if (level >= 5) p.levelFivePick = pickOf(tableOf(r)); return p }
const growUnits = [...heroes, ...civilians]
const lvSquads = { 'squad.c1-enemies': C1_ENEMIES }, lvFixtures = [], lvSubjects = [], lvMatchups = []
for (const r of growUnits) {
  const sq = 'squad.l1-' + r.typeId.split('.').pop(), fx = 'f.l1-' + r.typeId.split('.').pop()
  lvSquads[sq] = [C1_HEROES[0], C1_HEROES[1], kit(r.typeId)]
  lvFixtures.push({ id: fx, hero: sq, enemy: 'squad.c1-enemies' })
  lvMatchups.push({ id: 'm.' + fx.slice(2), hero: sq, enemy: 'squad.c1-enemies' })
  for (const level of [2, 4, 6, 8, 10]) lvSubjects.push({ id: `${r.typeId}@l${level}`, fixture: fx, rotation: 'grow', side: 'hero', slot: 2, progress: progressAt(r, level) })
}
W('levels', { id: 'proving.levels', note: 'Pass two (Angela: "we will eventually change level, but we\'ll start with level 1" — this is the eventually): every hero and civilian at levels 2, 4, 6, 8 and 10 against ITSELF at level 1, in its start kit, in seat 2 beside C1\'s warrior and ranger, against C1\'s twelve zombies. One fixture per unit, so the WITHOUT arm is the same body at level 1 and the number reads "what a level is worth to this unit." The specialty is the class\'s first in registry order (a reference, not a ranking — proving.specialties ranks them); the level-5 pick is the table\'s first option; no powers are drafted, because a draft is an offer of three and a choice, which no rule in the pack makes — a finding for the page, and a later plan (proving.powers) when the draft has a rule. A civilian with a type table levels on it; one the engine refuses is INVALID with its reason.', ...common, squads: lvSquads, fixtures: lvFixtures, subjects: lvSubjects, matchups: lvMatchups })

// specialties: every specialty at level 2 on its class's reference hero, against that hero at level 1. Beasts have no hero row yet.
const ref = { 'class.warrior': 'hero.base.warrior-iron', 'class.ranger': 'hero.base.ranger-aggressive', 'class.mage': 'hero.base.mage-fire', 'class.priest': 'hero.base.priest-armored', 'class.paladin': 'hero.base.paladin-shiney', 'class.rogue': 'hero.base.rogue-raven', 'class.civilian': 'hero.fixed.farmer' }
const spSquads = { 'squad.c1-enemies': C1_ENEMIES }, spFixtures = [], spSubjects = [], spMatchups = [], skipped = []
for (const sp of Object.values(pack.specialties)) {
  const unit = ref[sp.class]; if (!unit) { skipped.push(sp.id); continue }
  const sq = 'squad.l1-' + unit.split('.').pop(), fx = 'f.l1-' + unit.split('.').pop()
  if (!spSquads[sq]) { spSquads[sq] = [C1_HEROES[0], C1_HEROES[1], kit(unit)]; spFixtures.push({ id: fx, hero: sq, enemy: 'squad.c1-enemies' }); spMatchups.push({ id: 'm.' + fx.slice(2), hero: sq, enemy: 'squad.c1-enemies' }) }
  spSubjects.push({ id: `${unit}@l2-${sp.id.split('.').pop()}`, fixture: fx, rotation: 'grow', side: 'hero', slot: 2, progress: { level: 2, specialtyId: sp.id } })
}
W('specialties', { id: 'proving.specialties', note: `Pass two: every specialty at level 2 on its class's reference hero (the C1 seat-holders; priest-armored, paladin-shiney, rogue-raven, farmer for the rest), against that hero at level 1. Level 2 cannot exist without a specialty, so each number is "level 2 with this specialty"; read the specialties of one class against each other, not against zero. Skipped, no hero row to carry them: ${skipped.join(', ')} (class.beast — beasts are a hero class by ruling and have no row yet).`, ...common, squads: spSquads, fixtures: spFixtures, subjects: spSubjects, matchups: spMatchups })

// ── pass three: AI modes as subjects. `ai` is a rotation the rig must learn (E10). ──
const modes = ['flee', 'dumb-melee', 'melee-aggressive', 'ranged-kite', 'defender', 'support', 'focused-fire', 'value-hunter', 'follow', 'hunter']
const aiSubjects = modes.flatMap((mode) => [
  { id: `ai.${mode}`, fixture: 'f.c1', rotation: 'ai', side: 'hero', slot: 2 },
  { id: `ai.${mode}`, fixture: 'f.c1', rotation: 'ai', side: 'enemy', slot: 0 },
  { id: `ai.${mode}`, fixture: 'f.c1', rotation: 'ai', side: 'hero', slot: 'all' },
  { id: `ai.${mode}`, fixture: 'f.c1', rotation: 'ai', side: 'enemy', slot: 'all' },
])
W('ai', { id: 'proving.ai', note: 'Pass three (Angela 2026-09-04: "first, let\'s power rank everything, and then we can start to change AIs and see if that moves power ranking"): every AI mode in src/ai/modes.ts as a subject on C1 — the mode on one seat (the mage, seat 2; a zombie, seat 0) and on a whole side (slot "all"). WITH = the seat or side runs the mode; WITHOUT = the control as fielded. `ai` is a rotation the rig does not have yet (9-PROVING-SETTLED §7, E10); this file waits for it and does not validate until then. When an AI is changed, pass one re-runs and the page shows which rankings moved; this plan says what the mode itself was worth.', ...common, squads: { 'squad.c1-heroes': C1_HEROES, 'squad.c1-enemies': C1_ENEMIES }, fixtures: [{ id: 'f.c1', hero: 'squad.c1-heroes', enemy: 'squad.c1-enemies' }], subjects: aiSubjects, matchups: [{ id: 'm.c1', hero: 'squad.c1-heroes', enemy: 'squad.c1-enemies' }] })
