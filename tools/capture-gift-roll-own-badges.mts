// kingdom.gift-roll-leaves-out-own-badges (2026-10-05): a hero's own badges are left out of its gift roll, which re-deals
// some drafts. This freezes, BEFORE the change, every replicate's whole drafted party of six (each hero's row, badges, rolls,
// mods, unfielded rolls, the hand it was offered with and the hand's scores) as one hash a replicate, replicates 0-199, and
// names the replicates in which a hero the draft took holds a badge its own row already has. Refuses to overwrite (flag wx).
// node node_modules/tsx/dist/cli.mjs tools/capture-gift-roll-own-badges.mts --out test/fixtures/gift-roll-own-badges-before.json
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { openingHeroesOf } from '../src/content/opening-party.js'
import { UNITS } from '../src/content/index.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh a frozen expectation implicitly')
const DRAFTED = 6
const hashes: string[] = [], doubled: number[] = []
for (let replicate = 0; replicate < 200; replicate++) {
  const party = openingHeroesOf(replicate, DRAFTED)
  hashes.push(createHash('sha256').update(JSON.stringify(party)).digest('hex').slice(0, 16))
  if (party.some((h) => h.badges.some((b) => (UNITS[h.id]!.badges ?? []).includes(b)))) doubled.push(replicate)
}
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ note: 'openingHeroesOf(replicate, 6), replicates 0-199, sha256 over JSON (first 16 hex), frozen before kingdom.gift-roll-leaves-out-own-badges; doubled: replicates in which a drafted hero held a badge its own row has.', drafted: DRAFTED, hashes, doubled }) + '\n', { flag: 'wx' })
console.log(`froze ${hashes.length} replicates; a drafted hero held a badge of its own in ${doubled.length}: ${doubled.join(', ')}`)
