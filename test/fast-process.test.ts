// tool.fast-process (Andrew 2026-09-30, DECISIONS.md "the fast process; the full process
// kept"): the gate is fast by default and `--full` keeps every per-item check. These pin
// the pure pieces: which test files the kill switch re-runs, that a fast pass can never
// replay into a --full run, and that one shard of one (a terminal's whole suite) is green.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  testFilesIn, killSwitchFiles, contextHash, recordShard, shardStatus,
} from '../tools/gate-progress.mjs'

const porcelain = [
  ' M test/additions.test.ts',          // an existing battle file the item edited
  '?? test/new-mechanic.test.ts',       // the item's own new test
  'A  test/staged-new.test.ts',         // a new test already staged
  ' M src/core/battle.ts',
  '?? test/helpers.ts',                 // not a test file
].join('\n')

describe('the kill switch re-runs the tests the item added', () => {
  it('finds the test files in git status output', () => {
    expect(testFilesIn(porcelain)).toEqual(['test/additions.test.ts', 'test/new-mechanic.test.ts', 'test/staged-new.test.ts'])
  })
  it('fast: only the added test files — the edited battle file is not re-run with the content off', () => {
    expect(killSwitchFiles(porcelain)).toEqual(['test/new-mechanic.test.ts', 'test/staged-new.test.ts'])
  })
  it('fast, nothing added: every touched test file, as before', () => {
    expect(killSwitchFiles(' M test/additions.test.ts\n M test/terrain.test.ts')).toEqual(['test/additions.test.ts', 'test/terrain.test.ts'])
  })
  it('--full: every touched test file, exactly as before 2026-09-30', () => {
    expect(killSwitchFiles(porcelain, true)).toEqual(testFilesIn(porcelain))
  })
})

describe('fast and full never share a recorded pass', () => {
  it('the process is part of the context hash', () => {
    const item = { id: 'x.y', spec: 's' }
    expect(contextHash({ ...item, process: 'fast' }, [], null)).not.toBe(contextHash({ ...item, process: 'full' }, [], null))
  })
})

describe('a terminal runs the whole suite as one command', () => {
  it('--shard 1/1 alone is a complete set, so wrap accepts it', () => {
    const s = recordShard(null, 'tree-1', 1, 1, true)
    expect(shardStatus(s, 'tree-1', 4).green).toBe(true)
  })
})

describe('the per-item flags moved to wrap, not away', () => {
  const read = (f: string) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')
  it('wrap runs prior-art and wrong-home over the whole tree', () => {
    const wrap = read('../tools/wrap.mjs')
    expect(wrap).toMatch(/'prior-art\.mjs'/)
    expect(wrap).toMatch(/'wrong-home\.mjs'/)
  })
  it('the gate still runs both per item under --full', () => {
    const gate = read('../tools/gate.mjs')
    expect(gate).toMatch(/const FULL = process\.argv\.includes\('--full'\)/)
    expect(gate.match(/if \(!FULL\) return \{ ok: true, note: 'fast/g)?.length).toBe(2)
  })
})
