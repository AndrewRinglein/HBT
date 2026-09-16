// Smoke for SLICE.html — the screens driven headlessly through the shared tree DOM: the
// title, the mode-select, the draft, prep, the battle, the Week, absences, a quest,
// the roster. It is the H checks ISC-048/049/050 mechanised as far as text can be;
// Andrew still opens the page.  node tools/smoke-slice.mjs SLICE.html
import { bootSlice } from './atlas-dom.mjs'
const {w,store,root,click}=bootSlice(process.argv[2])
const text = () => root.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const has = (s) => { if (!text().includes(s)) throw new Error(`expected "${s}" on screen; got: ${text().slice(0, 400)}`) }
// the front: the Load Game screen (the mock, 2026-09-02) — three campaigns, two locked, three slots; + New Party reaches the draft
has('Heroes of Blight and Tragic'); has('Choose a campaign'); has('Peasants'); has('Locked'); has('Empty slot')
click('slot-new'); has('The opening'); click('advance'); has('The draft'); has('Three come to the fire')
// back out: the slot now holds the run and offers Continue / End Game
click('title'); has('Questing'); has('Continue'); has('End Game'); click('slot-end'); has('Really end it'); click('slot-end-cancel'); has('End Game')
click('slot-continue'); has('The draft'); click('title'); click('slot-end'); click('slot-clear'); has('Empty slot')
// ISC-049 — roster from the Week; ISC-048 — four Territories, the Stage, the purse
click('slot-fixture'); has('Reveal')
// walk prep to the Week: advance × 4 needs deploys… use the roster button from prep instead
click('roster'); has('The roster'); has('Max HP'); has('field'); click('roster')
console.log('smoke: Load Game → new party → draft; end game; fixture → prep → roster: OK')
console.log(text().slice(0, 200))
// the fixture's Week: to the world screen at Quest, absences on screen, a quest sent
click('title'); click('slot-end'); click('slot-clear'); click('slot-fixture')
click('advance'); click('advance')   // reveal → council → deploy
for (const e of root.els.filter((x) => x.dataset.act === 'deploy').slice(0, 2)) e.handlers.click()
click('advance')                     // → equip: its own screen now (ruled 2026-09-04), opened once Deploy is done
has('Equip — the heroes you are sending'); has('right hand'); has('armor'); has('slot 1'); has('Set bonuses when you leave')
if (text().includes('1 · Reveal')) throw new Error('the Equip screen still carries the prep step bar')
{ const t = text(); let at = t.indexOf('Idols'); for (const w of ['Bloodrunes', 'Relics', 'Weapons', 'Armor', 'Trinkets']) { const n = t.indexOf(w, at + 1); if (at < 0 || n < 0) throw new Error(`the six sections are not in the ruled order — ${w} does not follow`); at = n } }
click('advance')                     // → battle
has('The battle'); has('Fielded as equipped')
// Canonical prop presentation uses the same saved battle/outcome-picker flow.
click('title')
const propKey = [...store.keys()].find(k => k.startsWith('hobat-kingdom-save:'))
const propBattle = JSON.parse(store.get(propKey))
propBattle.cursor.engagement.mapId = 'map.thicket'
store.set(propKey, JSON.stringify(propBattle))
click('slot-continue'); has('The battle'); has('map.thicket')
const drawnProps=root.querySelectorAll('[data-prop]').filter(p=>p.dataset.prop.startsWith('prop.obstacle.'))
if (!drawnProps.length) throw new Error('canonical high props are absent from the actual shared viewer')
if (!drawnProps.some(p=>p.title?.includes('high · material 3'))) throw new Error('canonical prop metadata is absent')
console.log('smoke: saved registered-map battle draws canonical prop footprints; outcome picker retained: OK')
click('decide'); has('Reckoning'); click('apply')
// the Hell-TCG copies (2026-09-04): the recap, then rewards.html's cards, then the level-up sheet — their
// ceremonies run on a real DOM; here the same performX calls are driven through the page's smoke hook
has('VICTORY'); has('Slain:'); has('XP Earned:'); click('exit')
has('Your Heroes'); has('Rewards'); has('Reveal all'); if ((root.innerHTML.match(/reward-card face-down/g) || []).length !== 3) throw new Error('three face-down cards expected')
const drive = w.__sliceDrive
drive.takeReward(drive.offers()[1])
while (!text().includes('Week 3 — ')) {
  const lv = root.els.find((x) => x.dataset.act === 'level-hero')
  if (lv) { lv.handlers.click(); has('Level Up!'); has('LEVEL 1'); drive.levelUp(lv.dataset.id, {}); drive.closeLevelSheet(); continue }
  click('exit')
}
has('Week 3 — Conquest'); has('held'); has('unclaimed'); has('supplies'); has('faith'); has('mana'); has('salvage')
click('advance'); has('Week 3 — Defense')
click('advance'); has('Week 3 — Quest results')
click('advance'); has('Week 3 — City')
has('The Beacon'); has('Build — Salvage'); has('The Chapel'); has('Escort the survivors')
// V2: repair and buy without advancing the Week or City activity.
const repair = root.els.find((e) => e.dataset.act === 'build' && e.dataset.key === 'repair')
if (!repair) throw new Error('no affordable repair offered in City')
repair.handlers.click(); has("The Forge's shelf")
const buy = root.els.find((e) => e.dataset.act === 'buy-item')
if (!buy) throw new Error('repair did not immediately open the shelf')
buy.handlers.click(); has('Week 3 — City')
const first = root.els.find((x) => x.dataset.act === 'party'); first.handlers.click(); click('send-quest', 'quest.escort'); has('In flight'); has('2 Weeks left')
click('roster'); has('onQuest — quest escort, 2 Weeks'); click('roster')
console.log('smoke: Field → City; repair then buy without advancing; quest dispatch → roster: OK')

// The authored quest UI uses a normal serialized slot and the same click handlers.
// This remains a fake-DOM smoke, not a browser or visual-acceptance substitute.
click('title')
const key = [...store.keys()].find(k => k.startsWith('hobat-kingdom-save:'))
const base = JSON.parse(store.get(key))
base.quests = {}; base.assignments = {}; base.unavailable = []; base.foughtThisWeek = []
base.cursor = { ...base.cursor, stage: 'stage.city', fieldStep: null, step: 'open', engagement: null, battle: null, attack: null, questReport: null, equipSession: null }
for (const h of Object.values(base.roster)) { h.wound = 0; h.lifeState = 'alive'; h.badges = ['badge.responsible'] }
store.set(key, JSON.stringify(base))
click('slot-continue'); has('Rescue a Civilian'); has('Recover Supplies'); has('Required hero lead')
const ids = Object.keys(base.roster).sort().slice(0, 3)
for (const id of ids) click('party', id)
click('send-quest', 'quest.rescue-civilian'); has('In flight'); has('1 Week left')
click('advance'); click('advance'); click('advance') // City → Conquest → Defense → report
has('Quest report — Rescue a Civilian'); has('3 quest XP'); has('joins the roster')
const pending = JSON.parse(store.get(key)); const rosterBefore = Object.keys(pending.roster).length
click('title'); click('slot-continue'); has('Quest report — Rescue a Civilian')
click('quest-report')
if (root.els.some(e => e.dataset.act === 'exit')) drive.leaveLevelUp()
click('advance'); has('City')
const completed = JSON.parse(store.get(key))
if (Object.keys(completed.roster).length !== rosterBefore + 1) throw new Error('rescue did not create exactly one instance')
click('title'); click('slot-continue'); has('City')
if (Object.keys(JSON.parse(store.get(key)).roster).length !== rosterBefore + 1) throw new Error('reload repeated rescue')
console.log('smoke: authored Rescue dispatch → due saved report → acknowledgment → unique civilian → reload: OK')
// Supplies uses an explicit lead and two escorts selected through its own controls.
const lead = root.els.find(e => e.dataset.act === 'quest-lead')?.dataset.id
if (!lead) throw new Error('no Supplies lead selector')
click('quest-lead', lead)
const escorts = [...new Set(root.els.filter(e => e.dataset.act === 'party').map(e => e.dataset.id))].filter(id => id !== lead).slice(0, 2)
for (const id of escorts) click('party', id)
click('send-quest', 'quest.recover-supplies')
const sent = JSON.parse(store.get(key)).quests['quest.recover-supplies']
if (sent.leadHeroId !== lead || sent.heroes.length !== 3 || !escorts.every(id => sent.heroes.includes(id))) throw new Error('Supplies staffing differs from the selected lead and escorts')
click('title'); click('slot-continue'); has('In flight'); has('Recover Supplies')
console.log('smoke: Supplies explicit lead + two escorts → saved dispatch → reload: OK')
