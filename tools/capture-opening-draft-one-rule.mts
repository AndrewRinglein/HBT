// fix.opening-draft-one-rule (2026-10-04): the opening draft's rolling procedure becomes exported functions the kingdom
// calls (one rule, one home). What openingHeroesOf returns must not move — the control battles and the opening probes
// field its party. This freezes, BEFORE the change, every replicate's whole drafted party (each hero's row, badges, rolls,
// mods, unfielded rolls, the hand it was offered with and the hand's scores) as one hash per replicate, and the party
// openingPartyOf fields at the sixth position. Refuses to overwrite (flag wx).
// node node_modules/tsx/dist/cli.mjs tools/capture-opening-draft-one-rule.mts --out test/fixtures/opening-draft-one-rule.json
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { openingHeroesOf, openingPartyOf, OPENING_POSITIONS } from '../src/content/opening-party.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh a frozen expectation implicitly')
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const last = OPENING_POSITIONS[OPENING_POSITIONS.length - 1]!
const replicates = Array.from({ length: 100 }, (_, replicate) => ({
  replicate,
  heroes: hash(openingHeroesOf(replicate, last.drafted)),
  party: hash(openingPartyOf(last.position, replicate)),
}))
// three replicates whole, so a moved hash can be read, not only seen
const whole = [0, 1, 11].map((replicate) => ({ replicate, heroes: openingHeroesOf(replicate, last.drafted) }))
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit: 'before fix.opening-draft-one-rule', note: 'openingHeroesOf(replicate, 6) and openingPartyOf(6, replicate), replicates 0-99, hashed over JSON; three replicates whole.', drafted: last.drafted, position: last.position, replicates, whole }, null, 1) + '\n', { flag: 'wx' })
console.log(`Captured ${replicates.length} replicates at position ${last.position} (${last.drafted} drafted).`)
