// V2 explicitly removes V1 compatibility (user ruling 2026-09-10).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { campaignOf, saveOf } from '../src/core/campaign.js'

const fixture = () => JSON.parse(readFileSync('fixtures/slice-prep.json', 'utf8'))

describe('the save migration', () => {
  it('V2 requires every cursor field rather than migrating an old save', () => {
    for (const key of ['equipSession', 'sold', 'spent']) {
      const old = fixture(); delete old.cursor[key]
      expect(() => campaignOf(JSON.stringify(old))).toThrow(`cursor is missing '${key}'`)
    }
    const old = fixture(); delete old.version
    expect(() => campaignOf(JSON.stringify(old))).toThrow(/V2/)
  })
  it('a save missing a field with no empty value is still refused', () => {
    const old = fixture()
    delete old.cursor.stage
    expect(() => campaignOf(JSON.stringify(old))).toThrow(/cursor is missing 'stage'/)
    const notCampaign = fixture(); delete notCampaign.roster
    expect(() => campaignOf(JSON.stringify(notCampaign))).toThrow(/not a Campaign/)
  })
})
