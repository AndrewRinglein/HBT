// The Load Game screen's plumbing — a slot is a Campaign with one autosave;
// what a slot says about its save; the old single save moves into slot 1 once.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { slotKey, readSlot, writeSlot, clearSlot, migrateLegacySave, summarize, LEGACY_SAVE_KEY } from '../src/ui/loadgame.js'
import { REALMS, SLOTS_PER_REALM } from '../src/content/realms.js'
import { saveOf } from '../src/core/campaign.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { loadFixture } from './walk.js'

const store = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) } }
const fixture = readFileSync('fixtures/slice-prep.json', 'utf8')

describe('the Load Game screen', () => {
  beforeEach(() => store.clear())
  it('three campaigns in sequence, one playable, three slots each, keyed apart', () => {
    expect(REALMS.map((r) => r.campaign)).toEqual(['I', 'II', 'III'])
    expect(REALMS.filter((r) => r.playable).map((r) => r.id)).toEqual([REALMS[0]!.id])
    expect(REALMS[1]!.after).toBe(REALMS[0]!.id); expect(REALMS[2]!.after).toBe(REALMS[1]!.id)
    expect(SLOTS_PER_REALM).toBe(3)
    const keys = REALMS.flatMap((r) => Array.from({ length: SLOTS_PER_REALM }, (_, i) => slotKey(r.id, i + 1)))
    expect(new Set(keys).size).toBe(9)
  })
  it('a slot holds one save; clearing it ends that run and touches no other slot', () => {
    const r = REALMS[0]!.id
    writeSlot(r, 1, fixture); writeSlot(r, 2, saveOf(makeNewCampaign(7)))
    expect(readSlot(r, 1)).toBe(fixture); expect(readSlot(r, 3)).toBeNull()
    clearSlot(r, 1)
    expect(readSlot(r, 1)).toBeNull(); expect(readSlot(r, 2)).not.toBeNull()
  })
  it('summarize says empty, live (Week and Stage, or the opening), ended, or broken', () => {
    expect(summarize(null)).toEqual({ state: 'empty' })
    expect(summarize('{"nonsense":1}').state).toBe('broken')
    const live = summarize(fixture)
    expect(live.state).toBe('live'); if (live.state === 'live') expect(live.progress).toMatch(/^Week 3 · Conquer/)
    const opening = summarize(saveOf(makeNewCampaign(1)))
    if (opening.state === 'live') expect(opening.progress).toMatch(/^the opening/); else throw new Error(opening.state)
    const ended = loadFixture((c) => { c.ended = { week: 5, reason: 'the company fell' } })
    const e = summarize(saveOf(ended.campaign))
    expect(e.state).toBe('ended'); if (e.state === 'ended') expect(e.progress).toMatch(/ended Week 5/)
  })
  it('the pre-slot browser save becomes slot 1 of the first campaign, once, and never overwrites a slot', () => {
    store.set(LEGACY_SAVE_KEY, fixture)
    migrateLegacySave()
    expect(readSlot(REALMS[0]!.id, 1)).toBe(fixture); expect(store.has(LEGACY_SAVE_KEY)).toBe(false)
    const other = saveOf(makeNewCampaign(3))
    store.set(LEGACY_SAVE_KEY, other)
    migrateLegacySave()
    expect(readSlot(REALMS[0]!.id, 1)).toBe(fixture)
  })
})
