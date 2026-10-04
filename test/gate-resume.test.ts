// tool.gate-fits-cowork (Andrew 2026-09-26, 'Add it'): Cowork kills every shell call
// at ~178 s, so the gate must be finishable across several calls. These tests pin the
// pure pieces the gate is built from — the per-tree progress record, the budget stop,
// and the shard sets — plus a cheap end-to-end run of --shards-green on a scratch repo.
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  openProgress, recall, record, clearResults, stopBefore, budgetFrom, isCowork, contextHash,
  parseShard, normalizeShards, recordShard, shardStatus, treeHash,
} from '../tools/gate-progress.mjs'
import { stampOf } from '../tools/code-stamp.mjs'

const key = { id: 'item.a', tree: 'tree-1', ctx: 'ctx-1' }
const pass = { ok: true, note: 'fine' }

describe('the progress record is keyed by item, tree and context', () => {
  it('a re-run on the same key keeps what passed; nothing recorded starts empty', () => {
    let p = openProgress(null, key)
    expect(p.results).toEqual({})
    p = record(p, 'typecheck', pass, 4000)
    const again = openProgress(JSON.parse(JSON.stringify(p)), key)
    expect(recall(again, 'typecheck')).toMatchObject({ ok: true, note: 'fine' })
    expect(again.discarded).toBe(false)
  })
  it('a changed tree, item or context discards every recorded result, but keeps durations', () => {
    const p = record(openProgress(null, key), 'typecheck', pass, 4000)
    for (const other of [{ ...key, tree: 'tree-2' }, { ...key, id: 'item.b' }, { ...key, ctx: 'ctx-2' }]) {
      const q = openProgress(JSON.parse(JSON.stringify(p)), other)
      expect(recall(q, 'typecheck')).toBeNull()
      expect(q.discarded).toBe(true)
      expect(q.durations['typecheck']).toBe(4000)
    }
  })
  it('a failed hard check is never recorded; a passed check and a warned flag are', () => {
    let p = openProgress(null, key)
    p = record(p, 'control battles unchanged', { ok: false, note: 'CHANGED' }, 46000)
    p = record(p, 'existing tests untouched', { ok: false, warn: true, note: 'DELETED LINES' }, 100)
    p = record(p, 'content has a published source', { ok: true, warn: true, note: 'n ids' }, 900)
    expect(recall(p, 'control battles unchanged')).toBeNull()
    expect(recall(p, 'existing tests untouched')).toMatchObject({ ok: false, warn: true })
    expect(recall(p, 'content has a published source')).toMatchObject({ ok: true, warn: true })
    expect(p.durations['control battles unchanged']).toBe(46000)
  })
  it('a recorded result carries the effects a replay must re-apply (golden, review, invented)', () => {
    const p = record(openProgress(null, key), 'control battles unchanged', { ok: true, note: 'x', golden: 'map.a 0123abcd\n' }, 1)
    expect(recall(p, 'control battles unchanged')!.golden).toBe('map.a 0123abcd\n')
  })
  it('clearing the results (--abandon, --fresh, a landing) keeps durations', () => {
    const p = clearResults(record(openProgress(null, key), 'typecheck', pass, 4000))
    expect(recall(p, 'typecheck')).toBeNull()
    expect(p.durations['typecheck']).toBe(4000)
  })
  it('the context hash moves with what the checks read from outside the tree', () => {
    const item = { id: 'x', needs: ['y'], shape: 'plumbing', spec: 's', attempts: 1 }
    const backlog = [item, { id: 'y', status: 'done' }]
    const base = contextHash(item, backlog, 'golden')
    expect(contextHash({ ...item, attempts: 3 }, backlog, 'golden')).toBe(base)
    expect(contextHash({ ...item, probeIds: ['a.b'] }, backlog, 'golden')).not.toBe(base)
    expect(contextHash(item, [item, { id: 'y' }], 'golden')).not.toBe(base)
    expect(contextHash(item, backlog, 'moved')).not.toBe(base)
  })
})

describe('the time budget', () => {
  it('never stops before the first fresh check of a call, so every call makes progress', () => {
    expect(stopBefore({ elapsedMs: 999_000, budgetMs: 1000, estimateMs: 50_000, ranFresh: 0 })).toBe(false)
  })
  it('stops once elapsed time is past the budget, or the next check is expected to cross it', () => {
    expect(stopBefore({ elapsedMs: 121_000, budgetMs: 120_000, estimateMs: 0, ranFresh: 1 })).toBe(true)
    expect(stopBefore({ elapsedMs: 80_000, budgetMs: 120_000, estimateMs: 46_000, ranFresh: 2 })).toBe(true)
    expect(stopBefore({ elapsedMs: 80_000, budgetMs: 120_000, estimateMs: 5_000, ranFresh: 2 })).toBe(false)
    expect(stopBefore({ elapsedMs: 80_000, budgetMs: 120_000, estimateMs: undefined, ranFresh: 2 })).toBe(false)
    expect(stopBefore({ elapsedMs: 9e9, budgetMs: Infinity, estimateMs: 9e9, ranFresh: 5 })).toBe(false)
  })
  it('--budget wins; otherwise 150 s in Cowork and unlimited in a terminal', () => {
    const terminal = { env: { PATH: '/usr/bin' }, cwd: 'C:\\Users\\aring\\Desktop' }
    const cowork = { env: { PATH: '/opt/cowork/claude-bin:/usr/bin' }, cwd: '/sessions/x/mnt/y' }
    expect(isCowork(cowork.env, cowork.cwd)).toBe(true)
    expect(isCowork(terminal.env, terminal.cwd)).toBe(false)
    expect(budgetFrom(['x', 'id', '--budget', '120'], terminal.env, terminal.cwd)).toBe(120_000)
    expect(budgetFrom(['x', 'id', '--budget', '0'], cowork.env, cowork.cwd)).toBe(Infinity)
    expect(budgetFrom(['x', 'id'], cowork.env, cowork.cwd)).toBe(150_000)
    expect(budgetFrom(['x', 'id'], terminal.env, terminal.cwd)).toBe(Infinity)
    expect(() => budgetFrom(['x', 'id', '--budget', 'soon'], terminal.env, terminal.cwd)).toThrow()
  })
})

describe('shards: any complete set on the tree is green', () => {
  it('parses k/N for any N, and refuses k outside 1..N', () => {
    expect(parseShard('3/8')).toEqual({ k: 3, n: 8 })
    expect(parseShard('4/4')).toEqual({ k: 4, n: 4 })
    for (const bad of ['9/8', '0/4', '1/0', 'x', '', undefined, '1/4/2']) expect(parseShard(bad)).toBeNull()
  })
  it('a complete set of four or of eight is green; a partial set names what is left', () => {
    let s = normalizeShards(null, 't')
    for (let k = 1; k <= 8; k++) s = recordShard(s, 't', k, 8, true)
    expect(shardStatus(s, 't', 4)).toMatchObject({ green: true, n: 8 })
    let four = normalizeShards(null, 't')
    for (const k of [1, 2, 3, 4]) four = recordShard(four, 't', k, 4, true)
    expect(shardStatus(four, 't', 4)).toMatchObject({ green: true, n: 4 })
    let part = normalizeShards(null, 't')
    for (const k of [1, 2, 3, 5, 6, 7, 8]) part = recordShard(part, 't', k, 8, true)
    part = recordShard(part, 't', 4, 8, false)
    expect(shardStatus(part, 't', 4)).toMatchObject({ green: false, n: 8, todo: [4] })
    expect(shardStatus(normalizeShards(null, 't'), 't', 4)).toMatchObject({ green: false, n: 4, todo: [1, 2, 3, 4] })
  })
  it('a changed tree discards every set; the old one-set file still reads', () => {
    let s = normalizeShards(null, 't')
    for (let k = 1; k <= 4; k++) s = recordShard(s, 't', k, 4, true)
    expect(shardStatus(s, 'u', 4).green).toBe(false)
    expect(shardStatus(recordShard(s, 'u', 1, 8, true), 'u', 4)).toMatchObject({ green: false, n: 8, todo: [2, 3, 4, 5, 6, 7, 8] })
    expect(shardStatus({ tree: 't', total: 4, passed: [1, 2, 3, 4] }, 't', 4)).toMatchObject({ green: true, n: 4 })
  })
})

describe('end to end, on a scratch repository', () => {
  const gate = fileURLToPath(new URL('../tools/gate.mjs', import.meta.url))
  const repo = () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-resume-'))
    const git = (...a: string[]) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' })
    git('init', '-q')
    writeFileSync(join(dir, 'a.txt'), 'one\n')
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
    mkdirSync(join(dir, '.state'))
    writeFileSync(join(dir, '.state', 'backlog.json'), '[]')
    return dir
  }
  const run = (dir: string, ...args: string[]) => spawnSync(process.execPath, [gate, ...args], { cwd: dir, encoding: 'utf8' })

  // Changed 2026-10-04 (tool.tests-follow-what-changed; Andrew, DECISIONS.md 'combat is tested only
  // when the engine changed; a visual change does not re-run the fights'): the record is keyed on the
  // engine's CODE (tools/code-stamp.mjs), not on every file in the tree. What this test held is kept —
  // a complete set is green, a partial one names its gap, a changed tree is not green — with "tree"
  // now meaning the code: the edit that must discard the set is an edit under src/, and an edit to a
  // file that is not code (a.txt) must NOT. A record with a tree and no stamp, as the gate wrote
  // before this day, is no pass.
  it('--shards-green accepts a complete set of eight on this code and names the gap in a partial one', () => {
    const dir = repo()
    const tree = treeHash(dir)
    const stamp = stampOf('engine', dir)
    expect(stamp).toMatch(/^[0-9a-f]{10}$/)
    const sets = { 8: [1, 2, 3, 4, 5, 6, 7, 8] }
    writeFileSync(join(dir, '.state', 'shards.json'), JSON.stringify({ stamp, tree, sets }))
    const green = run(dir, '--shards-green')
    expect(green.status).toBe(0)
    expect(green.stdout).toContain('8 of 8 shards passed')
    writeFileSync(join(dir, '.state', 'shards.json'), JSON.stringify({ stamp, tree, sets: { 8: [1, 2, 3, 4, 5, 6, 7] } }))
    const partial = run(dir, '--shards-green')
    expect(partial.status).toBe(1)
    expect(partial.stdout).toContain('node tools/gate.mjs --shard 8/8')
    // an older tool's record — the same complete set against the tree, no stamp — is no pass
    writeFileSync(join(dir, '.state', 'shards.json'), JSON.stringify({ tree, sets }))
    expect(run(dir, '--shards-green').status).toBe(1)
    // a file that is not the engine's code changes: the set still stands
    writeFileSync(join(dir, 'a.txt'), 'two\n')
    writeFileSync(join(dir, '.state', 'shards.json'), JSON.stringify({ stamp, tree, sets }))
    expect(run(dir, '--shards-green').status).toBe(0)
    // the engine's code changes: every shard must run again
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 2\n')
    expect(run(dir, '--shards-green').status).toBe(1)
  }, 60_000)
  it('--shard refuses a k outside 1..N before running anything', () => {
    const r = run(repo(), '--shard', '9/8')
    expect(r.status).toBe(2)
    expect(r.stderr).toContain('usage')
  }, 30_000)
})
