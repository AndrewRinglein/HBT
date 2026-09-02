#!/usr/bin/env node
// Static scans over kingdom/src — the probes that are facts about the code, not
// about a run. Each exits nonzero when its rule is broken, so each can stand
// behind a P-tier criterion.
//
//   node tools/scan.mjs only-writer        ISC-014: applyBattleResult is the only writer
//   node tools/scan.mjs one-availability   ISC-010: commitmentOf is the only opinion on availability
//
// only-writer. GAME-ARCHITECTURE.md §1 rule 2: combat touches the Campaign in
// exactly one function. Read through GLOSSARY.md's prefix contract — performX /
// applyX / beginX / endX / tickX / rollX / setX mutate; viewX / listX / canX /
// xOf / resolveX / makeX cannot — the rule is checkable without running anything:
//   1. exactly one `function applyBattleResult(` exists under src/, and
//   2. no OTHER impure-prefixed function takes an EngagementResult — outside
//      src/core/mutate.ts, the facade the writer itself writes through (GLOSSARY:
//      nothing outside mutate.ts may define an applyX/setX), which may hold a
//      result on the cursor (setBattleOutcome) but never define the writer.
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
      else if (IMPURE.test(name) && /EngagementResult/.test(params) && !/mutate\.ts$/.test(f)) others.push(`${name} in ${f}`)
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

if (which === 'one-availability') {
  // GAME-ARCHITECTURE.md §2.3: "nothing else in the codebase is allowed to have
  // an opinion about hero availability." The answers commitmentOf gives, and
  // the two roster lists it alone may consult, appear in no other src/core file.
  const WORDS = [/'onQuest'/, /'wounded'/, /'unavailable'/, /'captured'/, /\.captured\.includes\(/, /\.unavailable\.includes\(/, /assignments\[[^\]]+\]\?\.(field|city)/]
  const offenders = []
  let answerer = null
  for (const f of files) {
    const path = f.replace(/\\/g, '/')
    if (!path.startsWith('src/core/')) continue
    // the state shape names its fields ('captured', 'unavailable' are keys the
    // loader checks for) and decides nothing — it is the one file exempt
    if (path === 'src/core/campaign.ts') continue
    const text = readFileSync(f, 'utf8')
    const hits = WORDS.filter((w) => w.test(text))
    if (/function commitmentOf\(/.test(text)) { answerer = f; continue }
    if (hits.length) offenders.push(`${f} (${hits.length} availability word(s))`)
  }
  const problems = []
  if (!answerer) problems.push('no commitmentOf is defined under src/core')
  if (offenders.length) problems.push(`other core files have an opinion about availability: ${offenders.join(', ')}`)
  if (problems.length) { console.log(`one-availability: FAIL — ${problems.join('; ')}`); process.exit(1) }
  console.log(`one-availability: PASS — ${answerer} is the only file in src/core that answers availability`)
  process.exit(0)
}

console.error('usage: node tools/scan.mjs only-writer | one-availability')
process.exit(2)
