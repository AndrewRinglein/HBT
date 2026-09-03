// Writes src/content/generated/kits-gaps.json: the pool heroes the codex gives no kit
// (ISC-053). Run by tools/mk-items.mjs after the rows; runnable alone:
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/kit-gaps.mts
import { writeFileSync } from 'node:fs'
import { KIT_GAPS, KIT_SPEC_IDS } from '../src/content/heroes.js'

writeFileSync('src/content/generated/kits-gaps.json', JSON.stringify({ writtenBy: 'tools/kit-gaps.mts', pool: KIT_GAPS, pinnedSpecs: KIT_SPEC_IDS }, null, 1) + '\n')
console.log(`src/content/generated/kits-gaps.json — ${KIT_GAPS.length} pool hero(es) without a kit${KIT_GAPS.length ? ': ' + KIT_GAPS.join(', ') : ''}`)
