// viewer.male-hero-outfits (engine backlog; DECISIONS.md 2026-10-01 'the approved male hero outfits come into the project', Andrew:
// "Number two, yes, that's quite important."). The engine's side: the seven heroes the outfits are for are base heroes of the engine's
// sheet, each a paladin or a priest. The viewer's half (../viewer/tools/male-hero-outfits.test.mjs) reads the pack against the import
// record and the approval it carries and stands the outfits up from their files. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SEVEN = ['paladin-dark', 'paladin-shiney', 'paladin-smug', 'priest-pauper', 'priest-armored', 'priest-robes', 'priest-scantily']

describe('the Black Oath, Dawnblade, Court Champion and the four priests stand in their own approved outfits', () => {
  it('each is a base hero of the engine\'s sheet, a paladin or a priest', () => {
    const units = JSON.parse(readFileSync('generated/static.json', 'utf8')).units
    for (const id of SEVEN) expect(units['hero.base.' + id]?.tags?.find((t: string) => t.startsWith('class.')), id).toBe('class.' + id.split('-')[0])
  })
  it('the viewer: each in the bytes his approval names with every ruled motion, none listed as missing; they stand up from their files', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/male-hero-outfits.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 3/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
