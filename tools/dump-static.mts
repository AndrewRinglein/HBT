// Write generated/static.json — the read-only content the viewer draws from,
// read THROUGH THE DOOR (src/engine.ts) and shaped by src/sheet.ts.
//   npm run static        (from viewer/)
// Nothing here is computed; every field is copied from a definition. The
// standalone page bakes this file in; the game (stage 3) reads the same door
// at runtime. Never hand-edit the output.
import { writeFileSync } from 'node:fs'
// viewer.new-enemy-ability-line: the content's authored enemy rows, as a module — so the dump stays one self-contained program
// wherever it is run from (tools/runtime-metadata.test.mjs bundles it and runs it in an empty folder)
import AUTHORED_ENEMIES from '../../content/gen/enemies-authored.json' with { type: 'json' }
import { codeStamp } from '../../engine/tools/code-stamp.mjs'
import { allSheets, absorbingStatusIds, statusNames, attackTable, abilityTable, actionTable, badgeTable, layerNames, groundApplies, groundNames, actionKinds, statusRows, itemClasses, itemTable, handCount, tagCarriers } from '../src/sheet.js'
import { readCatalog } from '../src/engine.js'
const { MAPS } = await readCatalog()

/* viewer.new-enemy-ability-line (engine DECISIONS.md 2026-10-04 '… new enemies are named …', Andrew: "In that notification
   there should be something like, \"This enemy can do X.\""): each enemy kind's player-facing sentence, dumped with the
   unit sheets. The sentence is CONTENT — the enemy's own authored row (content/gen/enemies-authored.json `playerLine`, the
   row the content's ship publishes word for word in content/hbt-content.json; the page test holds the two equal), never
   typed in the viewer. The engine's pack does not carry the field (its unit row has no player-facing line — a gap for the
   engine's queue, viewer SWITCHES abilityLineDoor), so it does not come through the door; a kind with no sentence, or no
   fielded unit, has no entry. */
function unitLines(units: Record<string, unknown>): Record<string, string> {
  const rows = (AUTHORED_ENEMIES as { units?: { id: string; playerLine?: string | null }[] }).units
  if (!Array.isArray(rows)) throw new Error('dump-static: content/gen/enemies-authored.json carries no units')
  const out: Record<string, string> = {}
  for (const row of rows) if (typeof row.playerLine === 'string' && row.playerLine && row.id in units) out[row.id] = row.playerLine
  return out
}
const UNIT_SHEETS = allSheets()

/* the engine's code stamp, not its HEAD (Andrew, 2026-10-01): a ruling commit leaves this file unchanged */
const { stamp: engineCommit, dirty } = codeStamp()

/* attacks/abilities: the whole tables, so a unit.equipped grant resolves at fold
   time; layers: the ground layer names by number (2026-09-03) */
const out = { engineCommit, engineDirty: dirty, maps: MAPS.map((m) => m.id), units: UNIT_SHEETS, unitLines: unitLines(UNIT_SHEETS), statuses: statusNames(), absorbingStatuses: absorbingStatusIds(),
  attacks: attackTable(), abilities: abilityTable(), actions: actionTable(), badges: badgeTable(),
  layers: layerNames(), ...groundApplies(),
  /* viewer.hex-tooltip: each ground's name for the hex tooltip — the engine's own id as words (sheet.ts groundNames) */
  terrainNames: groundNames(),
  /* viewer.reads-engine (review V1, V5): the engine's classification of every action and each status's behaviour */
  actionKinds: actionKinds(), statusRows: statusRows(),
  /* viewer.shield-guard-motion: each item's own class — a power a held shield grants raises the shield */
  itemClasses: itemClasses(),
  /* viewer.panel-lists-items: each item's own row (name, class, hands, slots, what it gives) and the engine's count of hands */
  items: itemTable(), hands: handCount(),
  /* viewer.bar-shows-tag-requirement: for each tag a trigger requires (onlyWithTag), the actions that carry it — the engine's
     carriesTag, asked action by action; the bar lists a tag-required trigger on those attacks only */
  tagCarriers: tagCarriers() }
writeFileSync('generated/static.json', JSON.stringify(out))
console.log(`static.json: ${out.maps.length} maps · ${Object.keys(out.units).length} units · ${Object.keys(out.unitLines).length} unit lines · ${Object.keys(out.statuses).length} statuses · ${Object.keys(out.actions).length} actions · ${Object.keys(out.badges).length} badges · ${Object.keys(out.itemClasses).length} items · ${Object.entries(out.tagCarriers).map(([tag, ids]) => ids.length + ' carry ' + tag).join(', ') || 'no tag requirement'} · engine ${engineCommit}${dirty ? ' (DIRTY tree)' : ''}`)
