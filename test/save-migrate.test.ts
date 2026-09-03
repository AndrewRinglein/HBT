// save.migrate — a save written before G5–G7 lacks cursor.equipSession, sold and
// spent; the load fills them in with the one value such a save holds (nothing fitted,
// sold or spent). Anything else missing is still refused. 2026-09-03, from Andrew's
// slot 1: "a save this build cannot read — save's cursor is missing 'equipSession'".
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf, saveOf } from '../src/core/campaign.js'

const fixture = () => JSON.parse(readFileSync('fixtures/slice-prep.json', 'utf8'))

describe('the save migration', () => {
  it('an older save without equipSession, sold and spent loads as one with them empty', () => {
    const old = fixture()
    delete old.cursor.equipSession; delete old.cursor.sold; delete old.cursor.spent
    const loaded = campaignOf(JSON.stringify(old))
    expect(loaded.cursor.equipSession).toBeNull()
    expect(loaded.cursor.sold).toEqual([]); expect(loaded.cursor.spent).toEqual([])
    expect(JSON.parse(saveOf(loaded))).toEqual(JSON.parse(saveOf(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))))
  })
  it('a save missing a field with no empty value is still refused', () => {
    const old = fixture()
    delete old.cursor.stage
    expect(() => campaignOf(JSON.stringify(old))).toThrow(/cursor is missing 'stage'/)
    const notCampaign = fixture(); delete notCampaign.roster
    expect(() => campaignOf(JSON.stringify(notCampaign))).toThrow(/not a Campaign/)
  })
})
