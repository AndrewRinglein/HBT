// Smoke for SLICE.html — the screens driven headlessly through a tiny fake DOM: the
// title, the mode-select, the draft, prep, the battle, the Week, absences, a quest,
// the roster. It is the H checks ISC-048/049/050 mechanised as far as text can be;
// Andrew still opens the page.  node tools/smoke-slice.mjs SLICE.html
// a tiny DOM: enough for render() + wire() to run and for clicks to be simulated
import { readFileSync } from 'node:fs'
const html = readFileSync(process.argv[2], 'utf8')
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'))
const store = new Map()
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
class El {
  constructor() { this.handlers = {}; this.dataset = {}; this._html = '' }
  set innerHTML(h) { this._html = h; this.els = [...h.matchAll(/<(\w+)([^>]*)data-act="([^"]+)"([^>]*)>/g)].map((m) => { const e = new El(); const attrs = m[2] + m[4]; for (const a of attrs.matchAll(/data-(\w+)="([^"]*)"/g)) e.dataset[a[1]] = a[2]; e.dataset.act = m[3]; e.disabled = /\bdisabled\b/.test(attrs); return e }) }
  get innerHTML() { return this._html }
  querySelectorAll(sel) { return sel === '[data-act]' ? this.els : [] }
  addEventListener(t, f) { this.handlers[t] = f }
}
const root = new El()
globalThis.document = { getElementById: () => root, createElement: () => new El(), head: { appendChild() {} } }
globalThis.URL = { createObjectURL: () => '', revokeObjectURL: () => {} }
globalThis.Blob = class {}
new Function(script)()
const text = () => root.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const click = (act, id) => { const e = root.els.find((x) => x.dataset.act === act && (id === undefined || x.dataset.id === id)); if (!e) throw new Error(`no [data-act=${act}${id ? ' id=' + id : ''}] on screen: ${text().slice(0, 300)}`); if (e.disabled) throw new Error(`${act} is disabled`); e.handlers.click() }
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
click('roster'); has('The roster'); has('field slot'); click('roster')
console.log('smoke: Load Game → new party → draft; end game; fixture → prep → roster: OK')
console.log(text().slice(0, 200))
// the fixture's Week: to the world screen at Quest, absences on screen, a quest sent
click('title'); click('slot-end'); click('slot-clear'); click('slot-fixture')
click('advance'); click('advance')   // reveal → council → deploy
for (const e of root.els.filter((x) => x.dataset.act === 'deploy').slice(0, 2)) e.handlers.click()
click('advance'); click('advance')   // → equip → battle
has('The battle'); click('decide'); has('Reckoning'); click('apply'); click('exit')
while (!text().includes('Week 3 — ')) click(root.els.find((x) => ['take-reward', 'leave-level-up', 'level-up'].includes(x.dataset.act)).dataset.act)
has('Week 3 — Conquer'); has('held'); has('unclaimed'); has('supplies'); has('faith'); has('mana'); has('salvage')
click('advance'); click('advance'); click('advance')  // build → mend → Week 4 Buy
has('Week 4 — Buy'); click('advance'); has('Week 4 — Quest'); has('Did not turn up this Week'); has('Escort the survivors')
const first = root.els.find((x) => x.dataset.act === 'party'); first.handlers.click(); click('send-quest'); has('In flight'); has('2 Weeks left')
click('roster'); has('onQuest — quest quest.escort, 2 Weeks'); click('roster')
console.log('smoke: Week → absences → quest sent → roster shows it: OK')
