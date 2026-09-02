// The Load Game screen — the front of the slice, from Andrew's mock
// (research/mocks/Load Game.html, 2026-09-01; "This is supposed to be the load
// game screen", 2026-09-02). Three campaigns in sequence, three party slots
// each; three leaderboards above. A slot holds ONE Campaign with ONE autosave
// (GLOSSARY.md: "one autosave per Campaign, permanent death") — the slot is
// the Campaign, so three slots are three Campaigns, not three saves of one.
//
// The boards are the mock's fake data, and say so on the page: there is no
// AccountState yet (SKELETON-SETTLED.md:110), and the tier names on the mock —
// Peasants · Nobles · Creators — differ from that ruling's Commoner · Noble ·
// Royalty/Creator. The mock's words are used and the collision is flagged.

import { campaignOf, type CampaignState } from '../core/campaign.js'
import { REALMS, SLOTS_PER_REALM, type RealmRow } from '../content/realms.js'
import { STAGES } from '../content/stages.js'
import { PROLOGUE } from '../content/prologue.js'
import { bannerOf } from './art.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// ── the saves: one key per slot ─────────────────────────────────────────────
export const LEGACY_SAVE_KEY = 'hobat-kingdom-save'
export const slotKey = (realmId: string, n: number) => `hobat-kingdom-save:${realmId}:${n}`

export function readSlot(realmId: string, n: number): string | null {
  try { return localStorage.getItem(slotKey(realmId, n)) } catch { return null }
}
export function writeSlot(realmId: string, n: number, json: string): void {
  try { localStorage.setItem(slotKey(realmId, n), json) } catch { /* a private window; Download still works */ }
}
export function clearSlot(realmId: string, n: number): void {
  try { localStorage.removeItem(slotKey(realmId, n)) } catch {}
}
/** The pre-slot browser save, if one is left over, becomes slot 1 of the first realm — once. */
export function migrateLegacySave(): void {
  try {
    const old = localStorage.getItem(LEGACY_SAVE_KEY)
    if (!old) return
    const first = REALMS[0]!
    if (!localStorage.getItem(slotKey(first.id, 1))) localStorage.setItem(slotKey(first.id, 1), old)
    localStorage.removeItem(LEGACY_SAVE_KEY)
  } catch {}
}
// ── what a slot shows ───────────────────────────────────────────────────────
export type SlotSummary =
  | { state: 'empty' }
  | { state: 'broken'; why: string }
  | { state: 'ended' | 'live'; campaign: CampaignState; progress: string }

export function summarize(json: string | null): SlotSummary {
  if (!json) return { state: 'empty' }
  let c: CampaignState
  try { c = campaignOf(json) } catch (e) { return { state: 'broken', why: (e as Error).message } }
  if (c.ended) return { state: 'ended', campaign: c, progress: `ended Week ${c.ended.week} — ${c.ended.reason}` }
  if (c.cursor.prologue !== null) {
    const row = PROLOGUE.find((r) => r.n === c.cursor.prologue)
    return { state: 'live', campaign: c, progress: row ? `the opening · battle ${row.n}, ${row.name}` : 'the opening' }
  }
  const stage = STAGES.find((s) => s.id === c.cursor.stage)
  return { state: 'live', campaign: c, progress: `Week ${c.week} · ${stage?.title ?? c.cursor.stage}${c.cursor.step !== 'open' ? ' · ' + c.cursor.step : ''}` }
}

// ── the boards: the mock's numbers, verbatim, and fake ──────────────────────
type BoardRow = readonly [name: string, note: string, xp: string]
export const BOARDS: readonly { title: string; sub: string; foot: string; rows: readonly BoardRow[] }[] = [
  { title: 'Peasants', sub: 'Season III · XP earned', foot: 'See all · 1,204 players', rows: [
    ['Wren of the Mill', 'three runs, no deaths', '4,120'], ['Hob Tallow', 'burned the Barrows down', '3,870'], ['Marla Thistle', 'keeps the priest alive', '3,415'],
    ['Ossian', '“the knight is fine”', '3,102'], ['Little Pike', '—', '2,980'], ['Dunstan Ferry', "third try's the charm", '2,744'], ['Ida Greaves', '—', '2,690'] ] },
  { title: 'Nobles', sub: 'Season III · XP earned', foot: 'See all · 312 players', rows: [
    ['Lady Corvane', 'all four acts, one party', '9,860'], ['Ser Aldric Vane', '“no mercy for the Warden”', '8,205'], ['House Merrow', '—', '7,740'],
    ['The Widow Ashgrove', 'kept Rose human', '7,310'], ['Baron Halloway', '—', '6,955'], ['Ysolde of Fen', 'root everything', '6,480'], ['Ser Pell', '—', '6,120'] ] },
  { title: 'Creators', sub: '● 2 live now', foot: 'See all · 48 creators', rows: [
    ['GrimBarrow', 'live · Skyship no-hit attempt', '14,300'], ['Tessaly', 'live · first-time Eve', '11,940'], ['DeadKnightDan', '“the Colossus is a puzzle”', '10,870'],
    ['Marrowlight', '—', '9,660'], ['Quillfeather', 'lore runs only', '8,915'], ['Ash & Ember', 'co-op duo', '8,200'], ['Vesper', '—', '7,750'] ] },
]

// ── rendering ───────────────────────────────────────────────────────────────
function boardHtml(b: (typeof BOARDS)[number]): string {
  return `<div class="board"><div class="bh"><span class="tier">${esc(b.title)}</span><span class="sub">${esc(b.sub)}</span></div>
    ${b.rows.map((r, i) => `<div class="brow"><span class="rank">${i + 1}</span><span class="who"><span class="nm">${esc(r[0])}</span><span class="note">${esc(r[1])}</span></span><span class="xp">${esc(r[2])}</span></div>`).join('')}
    <div class="foot">${esc(b.foot)}</div></div>`
}

function partyHtml(c: CampaignState): string {
  const heroes = Object.values(c.roster).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 6)
  if (!heroes.length) return '<span class="meta">nobody drafted yet</span>'
  return `<div class="party">${heroes.map((h) => `<div class="face${h.lifeState === 'dead' ? ' dead' : h.wound ? ' hurt' : ''}" title="${esc(h.name)} — L${h.level}${h.lifeState === 'dead' ? ', fallen' : ''}">${esc(h.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2))}<b>${h.level}</b></div>`).join('')}</div>`
}

function slotHtml(realm: RealmRow, n: number, confirmEnd: boolean): string {
  const s = summarize(readSlot(realm.id, n))
  const id = `data-realm="${esc(realm.id)}" data-n="${n}"`
  if (!realm.playable) return `<div class="slot locked"><span class="lbl">Slot ${n}</span><span class="meta">${n === 1 ? 'Unlocks with the campaign' : ''}</span></div>`
  if (s.state === 'empty') return `<div class="slot empty"><span class="lbl">———</span><span class="meta">Empty slot</span><span class="sp"></span>
    <button class="primary" data-act="slot-new" ${id}>+ New Party</button>
    <label class="file quiet">Load a save <input type="file" accept=".json,application/json" data-act="slot-file" ${id}></label>
    ${n === 1 ? `<button class="quiet" data-act="slot-fixture" ${id}>the fixture</button>` : ''}</div>`
  if (s.state === 'broken') return `<div class="slot broken"><span class="lbl">Slot ${n}</span><span class="meta">a save this build cannot read — ${esc(s.why.slice(0, 80))}</span><span class="sp"></span><button class="danger" data-act="slot-clear" ${id}>Clear</button></div>`
  if (s.state === 'ended') return `<div class="slot ended"><span class="lbl">Party ${n}</span>${partyHtml(s.campaign)}<span class="prog">${esc(s.progress)}</span><span class="sp"></span><span class="tick">✓</span>
    <button data-act="slot-continue" ${id}>Load</button><button class="quiet" data-act="slot-clear" ${id}>Clear</button></div>`
  return `<div class="slot live"><span class="lbl">${n === 1 ? 'Questing' : 'Party ' + n}</span>${partyHtml(s.campaign)}<span class="prog">${esc(s.progress)}</span><span class="sp"></span>
    <button class="go" data-act="slot-continue" ${id}>Continue</button>
    ${confirmEnd ? `<button class="danger" data-act="slot-clear" ${id}>Really end it</button><button class="quiet" data-act="slot-end-cancel" ${id}>Keep</button>` : `<button class="danger" data-act="slot-end" ${id}>End Game</button>`}</div>`
}

/** The whole screen. `confirmEnd` names the one slot whose End Game is awaiting a second click. */
export function loadGameScreen(status: string, error: boolean, buildSha: string, confirmEnd: { realm: string; n: number } | null): string {
  return `<div class="lg">
    <div class="lghead"><h1>Heroes of Blight and Tragic</h1><div class="strap">Choose a campaign, or return to one already underway.</div><span class="sp"></span><span class="meta">the slice · built at kingdom ${esc(buildSha)} · boards are the mock's numbers, not anyone's</span></div>
    <div class="boards">${BOARDS.map(boardHtml).join('')}</div>
    <div class="camps">${REALMS.map((realm) => {
      const banner = bannerOf(realm.banner)
      return `<div class="camp${realm.playable ? '' : ' locked'}">
        <div class="banner" ${banner ? `style="background-image:url(${banner})"` : ''}>${realm.playable ? '' : '<span class="lock">🔒</span>'}<span class="cno">Campaign ${realm.campaign}</span><span class="cname">${esc(realm.name)}</span></div>
        ${realm.playable ? '' : `<div class="lockmsg"><b>🔒 Locked</b> ${esc(realm.locked)}</div>`}
        ${Array.from({ length: SLOTS_PER_REALM }, (_, i) => slotHtml(realm, i + 1, confirmEnd?.realm === realm.id && confirmEnd.n === i + 1)).join('')}
      </div>` }).join('')}</div>
    <div class="status${error ? ' err' : ''}">${esc(status)}</div>
  </div>`
}
