// The backlog, one to-do list per area (Andrew, 2026-10-01: up to four workers at
// once, one per area, each in its own copy of the folder). Four files, so two
// workers landing in different areas never write the same list:
//
//   .state/backlog.engine.json           every item whose kind is not below
//   .state/backlog.viewer-kingdom.json   kind viewer or kingdom
//   .state/backlog.content.json          kind content
//   .state/backlog.art.json              kind art
//
// An item may name its area outright (`"area": "content"`); otherwise its kind
// decides. Each area also has its own gate progress file,
// .state/gate-progress.<area>.json. `needs` may cross areas: every reader sees
// all four lists, every writer writes only the item's own.
//
// A folder holding the old single .state/backlog.json (a test fixture, an old
// copy) is read and written as that one file, exactly as before.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const AREAS = ['engine', 'viewer-kingdom', 'content', 'art']
const BY_KIND = { viewer: 'viewer-kingdom', kingdom: 'viewer-kingdom', content: 'content', art: 'art' }
const LEGACY = 'backlog.json'

/** The area an item belongs to: its own `area`, else its kind's, else engine. */
export function areaOf(item) {
  const a = item?.area ?? BY_KIND[item?.kind] ?? 'engine'
  if (!AREAS.includes(a)) throw new Error(`item ${item?.id}: unknown area '${a}' — one of ${AREAS.join(', ')}`)
  return a
}

export const backlogFile = (area, state = '.state') => join(state, `backlog.${area}.json`)
export const progressFile = (area, state = '.state') => join(state, `gate-progress.${area}.json`)
const legacy = (state) => join(state, LEGACY)

/** Every file the backlog lives in here: the one legacy file, or the four area files. */
export function backlogFiles(state = '.state') {
  return existsSync(legacy(state)) ? [legacy(state)] : AREAS.map((a) => backlogFile(a, state))
}

/** Every item, area by area in AREAS order, each list in its own order. A missing area file is empty. */
export function readBacklog(state = '.state') {
  const files = backlogFiles(state)
  if (!files.some((f) => existsSync(f))) throw new Error(`${join(state, 'backlog.<area>.json')}: none here — run from the engine folder`)
  return files.flatMap((f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []))
}

/**
 * Write the list that holds `area` (the item's), from the whole backlog `all` —
 * only that area's rows, so another area's list is never touched. In a legacy
 * folder it writes the one file.
 */
export function saveArea(all, area, state = '.state') {
  if (existsSync(legacy(state))) { writeFileSync(legacy(state), JSON.stringify(all, null, 1) + '\n'); return legacy(state) }
  const file = backlogFile(area, state)
  writeFileSync(file, JSON.stringify(all.filter((x) => areaOf(x) === area), null, 1) + '\n')
  return file
}

/** saveArea for the area `item` belongs to. Returns the file written. */
export const saveItem = (all, item, state = '.state') => saveArea(all, areaOf(item), state)

/** The progress file for `item`: its area's, or the old single file in a legacy folder. */
export const progressFor = (item, state = '.state') => (existsSync(legacy(state)) ? join(state, 'gate-progress.json') : progressFile(areaOf(item), state))
