#!/usr/bin/env node
// The handoff files, produced from .state/now.json and nothing else (Andrew,
// 2026-10-01: "wrap writes only now.json, and the other handoff files are
// produced from it"). wrap.mjs writes now.json — the Now line, the next chat,
// the count, what start.mjs printed and the chat's commits — then calls this.
// HANDOFF.md and STATE-ROW.md are renderings of it, never written by hand and
// never by anything else; the previous handoff is in git, not in archive/.
//
//   node tools/handoff.mjs      re-render HANDOFF.md and STATE-ROW.md from now.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const NOW_FILE = '.state/now.json'
const HANDOFF = 'HANDOFF.md'
const ROW = 'STATE-ROW.md'
const PACKAGE = 'engine'
const TITLE = 'Combat engine'   // the first cell of root STATE.md's workstream table

/** HANDOFF.md from a wrap's now.json. */
export function renderHandoff(now) {
  const lines = now.lines ?? []
  return [
    `# ${PACKAGE} — handoff ${now.at}`, '',
    `*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by \`start ${PACKAGE}\` — not by a chat, directly.*`, '',
    ...(now.committed === false ? ['**NOT COMMITTED** — this wrap is on disk; git does not have it.', ''] : []),
    ...lines, '',
    `## The chat's commits${now.since ? ` since the last wrap (${now.since})` : ' (last 20; no wrap on record)'}`, '',
    ...((now.commits ?? []).length ? now.commits.map((c) => `- ${c}`) : ['- none']), '',
    '## Next chat', '',
    // one plain-words line naming the chat, then the first line alone inside a fenced block
    now.next.label, '```', now.next.line, '```', '',
  ].join('\n')
}

/** STATE-ROW.md — one row of root STATE.md's workstream table (four cells); ../GBH/tools/state-rows.mjs assembles it. */
export function renderRow(now) {
  const lines = now.lines ?? []
  const get = (prefix) => (lines.find((l) => l.startsWith(prefix)) ?? '').slice(prefix.length).trim()
  const cell = (s) => s.replace(/\|/g, '\\|')
  return `| **${TITLE}** | \`engine/CLAUDE.md\` · \`engine/ENGINE-CONSTITUTION.md\` · \`engine/COMBAT-SEQUENCE.md\` · \`engine/HANDOFF.md\` | ${cell(`**\`${now.count}\`** (${now.at}), the count written by its own gate. Last landing: ${get('Last landing:').replace(/\. Previous chat ended:.*$/, '')}. Now: ${now.now}`)} | ${cell(`**Angela:** ${get('Yours:')}. **Queue:** ${get('Queue:')}`)} |\n`
}

/** Read now.json and write both files from it. Refuses a now.json a wrap did not write. */
export function produce() {
  if (!existsSync(NOW_FILE)) throw new Error(`${NOW_FILE}: not here — nothing to produce the handoff from`)
  const now = JSON.parse(readFileSync(NOW_FILE, 'utf8'))
  if (now.by !== 'wrap' || !now.next?.label || !now.next?.line) throw new Error(`${NOW_FILE}: not a wrap's (by: ${JSON.stringify(now.by)}) — only a wrap's now.json carries a handoff`)
  writeFileSync(HANDOFF, renderHandoff(now))
  writeFileSync(ROW, renderRow(now))
  return [HANDOFF, ROW]
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`${produce().join(' and ')} produced from ${NOW_FILE}`)
}
