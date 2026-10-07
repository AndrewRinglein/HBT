#!/usr/bin/env node
// Add pending work only. Gate/review remain the only writers of verdict fields.
// node tools/add-item.mjs spec.json [--backlog <file>] [--first]
// --first puts the new items at the top of the queue (next.mjs takes backlog order).
// An item may carry `"later": true` (tool.later-items, Andrew 2026-10-06): next.mjs and start.mjs
// offer it only when nothing else in its area is ready, wherever it sits in the list.
// A viewer or kingdom item may carry `"look": true` (tool.look-items-land-on-a-picture, 2026-10-06; DECISIONS.md 'the one
// plan ...': a look-and-feel item "is checked by a screenshot for Andrew's eye, and rules and numbers keep their tests"):
// the gate takes a picture of the real built page in place of a test and lands it for review. Any other kind is refused.
// node tools/add-item.mjs --repoint <abandoned> <refiled> [--backlog <file>]
//   every pending item whose `needs` names the abandoned id (status failed) names the
//   re-filed one instead (Andrew, 2026-10-01, DECISIONS 'the abandoned ids' dependants
//   are repointed'). Landed and abandoned items keep their needs: those are history.
// Each item goes into its own area's list, .state/backlog.<area>.json (tools/backlog.mjs);
// --backlog <file> writes every item into that one file instead.
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { readBacklog, areaOf, backlogFiles, backlogFile } from './backlog.mjs'
import { LOOK_KINDS } from './gate-progress.mjs'

const allowed = new Set(['id', 'kind', 'shape', 'spec', 'expect', 'needs', 'probeIds', 'variants', 'changesBaseline', 'neutral', 'note', 'effectSwitch', 'later', 'look'])
const required = ['id', 'kind', 'shape', 'spec', 'expect']
const shapes = new Set(['counter', 'plumbing', 'numbers', 'rule', 'pool', 'data', 'modifier', 'decision', 'trigger', 'station', 'naming', 'flag'])

function validate(items, existing) {
  if (!Array.isArray(existing)) throw new Error('backlog must be an array')
  if (!items.length) throw new Error('specification must contain at least one item')
  const ids = new Set(existing.map(item => item.id))
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('each specification must be an object')
    for (const key of Object.keys(item)) if (!allowed.has(key)) throw new Error(`unsupported or gate-owned field: ${key}`)
    for (const key of required) if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error(`required nonempty text: ${key}`)
    if (!shapes.has(item.shape)) throw new Error(`unknown item shape: ${item.shape}`)
    if (!/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/.test(item.id)) throw new Error(`invalid item id: ${item.id}`)
    if (ids.has(item.id)) throw new Error(`duplicate item id: ${item.id}`)
    ids.add(item.id)
    for (const key of ['needs', 'probeIds', 'variants']) {
      if (key in item && (!Array.isArray(item[key]) || item[key].some(id => typeof id !== 'string' || !id.trim()) || new Set(item[key]).size !== item[key].length)) throw new Error(`${key} must be an array of distinct nonempty ids`)
    }
    for (const key of ['changesBaseline', 'neutral', 'later', 'look']) if (key in item && typeof item[key] !== 'boolean') throw new Error(`${key} must be boolean`)
    // tool.look-items-land-on-a-picture: only how a viewer or kingdom screen LOOKS may land on a picture; a rule, a number or what a control does keeps its test
    if (item.look === true && !LOOK_KINDS.includes(item.kind)) throw new Error(`look is for a ${LOOK_KINDS.join(' or ')} item: ${item.id} is kind '${item.kind}', and lands on its own test`)
    // tool.effect-size-rules: the switch values a RULE item's WITHOUT arm runs with (tools/effect-arm.ts checks them against the engine's switches when measured)
    if ('effectSwitch' in item && (!item.effectSwitch || typeof item.effectSwitch !== 'object' || Array.isArray(item.effectSwitch) || !Object.keys(item.effectSwitch).length)) throw new Error('effectSwitch must be a non-empty object of switch values')
    for (const key of ['note']) {
      if (key in item && (typeof item[key] !== 'string' || item[key].trim().length < (key === 'note' ? 1 : 20))) throw new Error(`${key} requires a written reason`)
    }
  }
  for (const item of items) for (const dependency of item.needs ?? []) {
    if (!ids.has(dependency)) throw new Error(`unknown dependency: ${dependency}`)
    if (dependency === item.id) throw new Error(`self dependency: ${item.id}`)
  }
  const byId = new Map([...existing, ...items].map(item => [item.id, item]))
  const visited = new Set(), visiting = new Set()
  function visit(id) {
    if (visiting.has(id)) throw new Error(`dependency cycle: ${id}`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of byId.get(id)?.needs ?? []) visit(dependency)
    visiting.delete(id); visited.add(id)
  }
  for (const item of items) visit(item.id)
}

const pending = (item) => item.status === undefined

function repoint(all, from, to) {
  const byId = new Map(all.map((item) => [item.id, item]))
  if (byId.get(from)?.status !== 'failed') throw new Error(`--repoint: ${from} is not an abandoned item`)
  if (!byId.has(to) || byId.get(to).status === 'failed') throw new Error(`--repoint: ${to} is not a live item`)
  const changed = all.filter((item) => pending(item) && item.needs?.includes(from))
  if (!changed.length) throw new Error(`--repoint: no pending item needs ${from}`)
  const rows = changed.map((item) => ({ ...item, needs: [...new Set(item.needs.map((id) => (id === from ? to : id)))] }))
  for (const row of rows) if (row.needs.includes(row.id)) throw new Error(`self dependency: ${row.id}`)
  const next = new Map(byId); for (const row of rows) next.set(row.id, row)
  const visited = new Set(), visiting = new Set()
  const visit = (id) => {
    if (visiting.has(id)) throw new Error(`dependency cycle: ${id}`)
    if (visited.has(id)) return
    visiting.add(id); for (const d of next.get(id)?.needs ?? []) visit(d); visiting.delete(id); visited.add(id)
  }
  for (const row of rows) visit(row.id)
  return rows
}

try {
  const at = process.argv.indexOf('--repoint')
  if (at !== -1) {
    const [from, to] = process.argv.slice(at + 1, at + 3)
    const b = process.argv.indexOf('--backlog')
    if (!from || !to || from.startsWith('--') || to.startsWith('--') || (b !== -1 && !process.argv[b + 1])) throw new Error('usage: node tools/add-item.mjs --repoint <abandoned> <refiled> [--backlog path]')
    const single = b !== -1 ? process.argv[b + 1] : (backlogFiles().length === 1 ? backlogFiles()[0] : null)
    const files = single ? [single] : backlogFiles().filter((f) => existsSync(f))
    const originals = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]))
    const rows = repoint(single ? JSON.parse(originals.get(single)) : readBacklog(), from, to)
    for (const [f, text] of originals) if (readFileSync(f, 'utf8') !== text) throw new Error('backlog changed during validation; retry')
    const byId = new Map(rows.map((row) => [row.id, row]))
    for (const [f, text] of originals) {
      const list = JSON.parse(text)
      if (!list.some((item) => byId.has(item.id))) continue
      const temporary = `${f}.${process.pid}.pending`
      writeFileSync(temporary, JSON.stringify(list.map((item) => byId.get(item.id) ?? item), null, 1) + '\n', { flag: 'wx' })
      renameSync(temporary, f)
    }
    console.log(`Repointed ${from} -> ${to} in: ${rows.map((row) => row.id).join(', ')}`)
  } else {
    const first = process.argv.includes('--first')
    const args = process.argv.slice(2).filter(a => a !== '--first')
    if (!(args.length === 1 || (args.length === 3 && args[1] === '--backlog'))) throw new Error('usage: node tools/add-item.mjs spec.json [--backlog path] [--first]')
    const input = JSON.parse(readFileSync(args[0], 'utf8'))
    const items = Array.isArray(input) ? input : [input]
    // one file (--backlog, or an old single .state/backlog.json), or each item's area's list
    const single = args[2] ?? (backlogFiles().length === 1 ? backlogFiles()[0] : null)
    const snapshot = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '[]')
    if (single) {
      const original = readFileSync(single, 'utf8')
      validate(items, JSON.parse(original))
      if (readFileSync(single, 'utf8') !== original) throw new Error('backlog changed during validation; retry')
      put(single, JSON.parse(original), items)
    } else {
      const groups = new Map()
      for (const item of items) { const f = backlogFile(areaOf(item)); groups.set(f, [...(groups.get(f) ?? []), item]) }
      const originals = new Map([...groups.keys()].map((f) => [f, snapshot(f)]))
      validate(items, readBacklog())   // ids and needs are checked against every area
      // Validate the whole batch before any write. Refuse a stale source snapshot.
      for (const [f, text] of originals) if (snapshot(f) !== text) throw new Error('backlog changed during validation; retry')
      for (const [f, group] of groups) put(f, JSON.parse(originals.get(f)), group)
    }
    function put(path, existing, added) {
      const temporary = `${path}.${process.pid}.pending`
      writeFileSync(temporary, JSON.stringify(first ? [...added, ...existing] : [...existing, ...added], null, 1) + '\n', { flag: 'wx' })
      renameSync(temporary, path)
    }
    console.log(`Added ${items.length} pending item(s): ${items.map(item => item.id).join(', ')}`)
  }
} catch (error) {
  console.error(`add-item: ${error.message}`)
  process.exitCode = 1
}
