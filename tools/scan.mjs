#!/usr/bin/env node
// Static scans over kingdom/src — the probes that are facts about the code, not
// about a run. Each exits nonzero when its rule is broken, so each can stand
// behind a P-tier criterion.
//
//   node tools/scan.mjs only-writer     ISC-014: applyBattleResult is the only writer
//
// only-writer. GAME-ARCHITECTURE.md §1 rule 2: combat touches the Campaign in
// exactly one function. Read through GLOSSARY.md's prefix contract — performX /
// applyX / beginX / endX / tickX / rollX / setX mutate; viewX / listX / canX /
// xOf / resolveX / makeX cannot — the rule is checkable without running anything:
//   1. exactly one `function applyBattleResult(` exists under src/, and
//   2. no OTHER impure-prefixed function takes an EngagementResult.
// It is RED until applyBattleResult exists — the honest state of a criterion
// about a function that has not been written.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const which = process.argv[2]
const files = []
const walk = (d) => { if (!existsSync(d)) return; for (const f of readdirSync(d)) {
  const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(f)) files.push(p) } }
walk('src')

const IMPURE = /^(perform|apply|begin|end|tick|roll|set|draw)[A-Z]/

if (which === 'only-writer') {
  const writers = []
  const others = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/function\s+(\w+)\s*\(([^)]*)\)/g)) {
      const [, name, params] = m
      if (name === 'applyBattleResult') writers.push(f)
      else if (IMPURE.test(name) && /EngagementResult/.test(params)) others.push(`${name} in ${f}`)
    }
  }
  const problems = []
  if (writers.length === 0) problems.push('no applyBattleResult is defined anywhere under src/')
  if (writers.length > 1) problems.push(`applyBattleResult is defined ${writers.length} times: ${writers.join(', ')}`)
  if (others.length) problems.push(`other impure functions take an EngagementResult: ${others.join(', ')}`)
  if (problems.length) { console.log(`only-writer: FAIL — ${problems.join('; ')}`); process.exit(1) }
  console.log(`only-writer: PASS — applyBattleResult in ${writers[0]} is the only impure function that takes an EngagementResult`)
  process.exit(0)
}

console.error('usage: node tools/scan.mjs only-writer')
process.exit(2)
