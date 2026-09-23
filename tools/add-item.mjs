#!/usr/bin/env node
// Add pending work only. Gate/review remain the only writers of verdict fields.
// node tools/add-item.mjs spec.json [--backlog .state/backlog.json] [--first]
// --first puts the new items at the top of the queue (next.mjs takes backlog order).
import { readFileSync, writeFileSync, renameSync } from 'node:fs'

const allowed = new Set(['id', 'kind', 'shape', 'spec', 'expect', 'needs', 'probeIds', 'variants', 'changesBaseline', 'neutral', 'note', 'unreachable', 'coreLiteralAllow', 'generalizationExempt', 'killSwitchExempt'])
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
    for (const key of ['changesBaseline', 'neutral']) if (key in item && typeof item[key] !== 'boolean') throw new Error(`${key} must be boolean`)
    for (const key of ['note', 'unreachable', 'coreLiteralAllow', 'generalizationExempt', 'killSwitchExempt']) {
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

try {
  const first = process.argv.includes('--first')
  const args = process.argv.slice(2).filter(a => a !== '--first')
  if (!(args.length === 1 || (args.length === 3 && args[1] === '--backlog'))) throw new Error('usage: node tools/add-item.mjs spec.json [--backlog path] [--first]')
  const path = args[2] ?? '.state/backlog.json'
  const original = readFileSync(path, 'utf8')
  const existing = JSON.parse(original)
  const input = JSON.parse(readFileSync(args[0], 'utf8'))
  const items = Array.isArray(input) ? input : [input]
  validate(items, existing)
  // Validate the whole batch before any write. Refuse a stale source snapshot.
  if (readFileSync(path, 'utf8') !== original) throw new Error('backlog changed during validation; retry')
  const temporary = `${path}.${process.pid}.pending`
  writeFileSync(temporary, JSON.stringify(first ? [...items, ...existing] : [...existing, ...items], null, 1) + '\n', { flag: 'wx' })
  renameSync(temporary, path)
  console.log(`Added ${items.length} pending item(s): ${items.map(item => item.id).join(', ')}`)
} catch (error) {
  console.error(`add-item: ${error.message}`)
  process.exitCode = 1
}
