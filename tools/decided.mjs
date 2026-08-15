#!/usr/bin/env node
// "Has this already been decided?" — asked mechanically, before asking Angela.
//
// This exists because of one incident: COMBAT-SEQUENCE.md line 155 says an attack's
// hits resolve one at a time, each running the full cycle before the next. That was
// litigated during the framework build. It was then re-asked as an open question,
// hours after a rule was added to CLAUDE.md saying to grep the design folder first.
//
// A rule you have to remember is not a mechanism. This is the mechanism.
//
//   node tools/decided.mjs "multi attack hits resolve"     ask directly
//   node tools/decided.mjs --scan TRIGGER-NOTES.md         check every question in a doc
//
// It reports CANDIDATE rulings, not verdicts. The point is to make the check cheap
// enough that it always happens, not to automate the judgement.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DESIGN = '..'
const HERE = '.'

// A "ruling" is a line that decides something. These are the shapes the corpus
// actually uses, found by reading it rather than guessed.
const RULING = [
  /\*\*The rule[:s]?\b/i,        // "**The rule: onAttack always...**"
  /\bmust\b|\balways\b|\bnever\b/i,
  /\bresolved?\s+\*\*/i,
  /\banswered\b/i,
  /^\s*\|\s*\d+\s*\|/,           // numbered sequence tables
  /^\s*\d+\.\s+\*\*/,            // numbered rules
]

const STOP = new Set(['the','a','an','is','are','do','does','of','to','in','on','and','or','for','it',
  'that','this','we','you','i','be','can','what','when','which','how','if','not','with','as','at','by',
  'should','would','their','they','there','than','then','from','have','has','one','two','all','any'])

function docs() {
  const out = []
  for (const dir of [DESIGN, HERE]) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      // Dated snapshots and archives are a RECORD of what was considered, not the
      // contract. Searching them returns rulings that were superseded, which is
      // worse than no answer.
      if (/-\d{4}-\d{2}-\d{2}\.md$/.test(f) || /^archive/i.test(f)) continue
      const p = join(dir, f)
      if (!statSync(p).isFile()) continue
      out.push(p)
    }
  }
  return out
}

const terms = (s) => [...new Set(String(s).toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [])].filter((w) => !STOP.has(w))

function search(query, { min = 2 } = {}) {
  const want = terms(query)
  if (!want.length) return []
  const hits = []
  for (const p of docs()) {
    const lines = readFileSync(p, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (line.length < 25) return
      const low = line.toLowerCase()
      const score = want.filter((w) => low.includes(w)).length
      if (score < min) return
      const ruling = RULING.some((r) => r.test(line))
      hits.push({ file: p, line: i + 1, score: score + (ruling ? 1.5 : 0), ruling, text: line.trim() })
    })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 6)
}

const argv = process.argv.slice(2)

if (argv[0] === '--scan') {
  // Pull every question out of a plan document and check each one.
  const file = argv[1]
  if (!file || !existsSync(file)) { console.error('usage: decided.mjs --scan <file.md>'); process.exit(2) }
  const lines = readFileSync(file, 'utf8').split('\n')
  const questions = lines
    .map((l, i) => ({ l: l.trim(), i: i + 1 }))
    .filter(({ l }) => l.includes('?') && l.length > 30 && !l.startsWith('>'))
  console.log(`\n${file} — ${questions.length} question(s)\n`)
  let flagged = 0
  for (const q of questions) {
    const hits = search(q.l, { min: 3 }).filter((h) => !h.file.endsWith(file.replace('./', '')))
    const strong = hits.filter((h) => h.ruling)
    if (!strong.length) continue
    flagged++
    console.log(`  line ${q.i}: ${q.l.replace(/\*\*/g, '').slice(0, 96)}`)
    for (const h of strong.slice(0, 2)) console.log(`     ↳ ${h.file}:${h.line}  ${h.text.replace(/\*\*/g, '').slice(0, 96)}`)
    console.log()
  }
  console.log(flagged ? `${flagged} question(s) may already be answered. Read the lines above before asking.\n`
                      : 'No question matched an existing ruling.\n')
  process.exit(0)
}

const q = argv.join(' ')
if (!q) { console.error('usage: decided.mjs "<question>"  |  decided.mjs --scan <file.md>'); process.exit(2) }
const hits = search(q)
console.log(`\n"${q}"\n`)
if (!hits.length) console.log('  nothing found — likely genuinely open\n')
for (const h of hits) console.log(`  ${h.ruling ? 'RULING  ' : '        '}${h.file}:${h.line}\n     ${h.text.replace(/\*\*/g, '').slice(0, 110)}\n`)
