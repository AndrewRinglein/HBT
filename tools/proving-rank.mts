// THE PROVING — the rank rollup (proving.rank, 2026-09-05; session 9's E7,
// 9-PROVING-SETTLED.md §2 and §4).
//
//   npm run proving:rank [--state <dir>] [--doc <path> | --no-doc]
//                                   reads .state/proving/*/rollup.json
//                                   writes .state/proving/ranking.json
//                                   writes ../PROVING-RESULTS.md (generated; declared in DOCS.md)
//
// One row per SUBJECT across every plan that has run, tagged by ladder (the
// fixture and the side it was measured on), with the columns the dashboard
// shows: Power (flip rate — ruled: the score), wins WITH beside the control's
// wins, swing (margin shift from the subject's side, permille), tempo,
// presence, invalid. Below the table: the initiative mirrors per map and the
// gap sweep, the control candidates with the seed-1 rule applied, and a
// FINDINGS section the rollup writes and nobody hands-edits.
//
// Sorting is Power, then swing, then id (Law 6). Integers only (Law 7). This
// tool reads results and the pack for names and tags; it runs no battle and
// decides nothing.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { UNITS } from '../src/content/index.js'
import type { SubjectResult, MatchupResult } from '../src/sim/proving.js'
import stampJson from '../src/content/generated/pack.stamp.json' with { type: 'json' }

const HERE = dirname(fileURLToPath(import.meta.url))
const ENGINE = join(HERE, '..')
const ROOT = join(ENGINE, '..')
const args = process.argv.slice(2)
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
// --state <dir> reads another results tree (the tests point it at a scratch run); --doc <path> writes the document elsewhere; --no-doc skips it
const STATE = opt('--state') ?? join(ENGINE, '.state', 'proving')
const outDoc = args.includes('--no-doc') ? null : (opt('--doc') ?? join(ROOT, 'PROVING-RESULTS.md'))

type Rollup = {
  plan: string; planFile?: string; stamp: string; generated: string; maps: string[]; seed: number; switches?: Record<string, unknown>
  ranking: { id: string; fixture: string; rotation: string; side: 'hero' | 'enemy'; slot?: number; pairs: number; valid: number; invalid: number; flips: number; flipRatePermille: number; marginShiftMean: number; swing: number; tempoShiftMean: number; presence: number }[]
  matchups: { id: string; hero: string; enemy: string; sides?: string; gap?: number; heroWins: number; enemyWins: number; other: number; invalid: number; marginMean: number; turnsMean: number; battles: { map: string; seed: number; outcome: string; turns: number; margin: number; error?: string }[] }[]
}

const packStamp = (stampJson as { contentSha: string }).contentSha
if (!existsSync(STATE)) { console.error(`proving-rank: nothing under ${STATE} — run npm run proving <plan> first`); process.exit(2) }
const planDirs = readdirSync(STATE).filter((d) => d.startsWith('proving.') && existsSync(join(STATE, d, 'rollup.json')))
const rollups: Rollup[] = planDirs.map((d) => JSON.parse(readFileSync(join(STATE, d, 'rollup.json'), 'utf8')) as Rollup)

const fileOf = (dir: string, key: string) => join(dir, key.replace(/[^a-z0-9.@-]+/gi, '_') + '.json')

// ── the units ────────────────────────────────────────────────────────────────

const FAMILIES = ['undead', 'demon', 'beast', 'horror', 'human', 'construct', 'dragon', 'vampire']
type Kind = 'hero' | 'civilian' | 'enemy'
function kindOf(id: string): Kind {
  const u = UNITS[id]
  if (!u) return id.startsWith('unit.') ? 'enemy' : 'hero'
  if (u.side === 'enemy') return 'enemy'
  return (u.tags ?? []).includes('civilian') ? 'civilian' : 'hero'
}
const classOf = (id: string) => (UNITS[id]?.tags ?? []).find((t) => t.startsWith('class.'))?.slice(6) ?? null
const familyOf = (id: string) => (UNITS[id]?.tags ?? []).find((t) => FAMILIES.includes(t)) ?? null

type Row = {
  id: string; name: string; kind: Kind; side: 'hero' | 'enemy'; class: string | null; family: string | null; tags: string[]
  plan: string; fixture: string; ladder: string; rotation: string; slot?: number
  pairs: number; valid: number; invalid: number; invalidReasons: string[]
  flips: number; flipRatePermille: number; winsWith: number; controlWins: number; swing: number; marginShiftMean: number; tempo: number; presence: number
  detail: { map: string; seed: number; with: { outcome: string; margin: number; turns: number; error?: string }; without: { outcome: string; margin: number; turns: number; error?: string }; flipped: boolean; marginShift: number; tempoShift: number; presence: number }[]
  findings: string[]
  stamp: string; current: boolean
}

const winFor = (side: 'hero' | 'enemy', outcome: string) => (side === 'hero' ? outcome === 'heroClear' || outcome === 'objectiveMet' : outcome === 'wipe' || outcome === 'objectiveFailed')

const rows: Row[] = []
const findings: string[] = []
for (const r of rollups) {
  const dir = join(STATE, r.plan)
  for (const s of r.ranking) {
    if (s.rotation !== 'replace' && s.rotation !== 'add') continue   // pass one ranks units; items and grows are later passes
    const key = `${s.id}@${s.fixture}.${s.rotation}.${s.side}${s.slot !== undefined ? '.' + s.slot : ''}`
    const f = fileOf(dir, key)
    const res = existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as SubjectResult) : null
    const pairs = res?.pairs ?? []
    const winsWith = pairs.filter((p) => p.with.outcome !== 'invalid' && winFor(s.side, p.with.outcome)).length
    const controlWins = pairs.filter((p) => p.without.outcome !== 'invalid' && winFor(s.side, p.without.outcome)).length
    const invalidReasons = [...new Set(pairs.flatMap((p) => [p.with.error, p.without.error]).filter((x): x is string => Boolean(x)))]
    const own: string[] = []
    if (s.valid === 0 && s.pairs > 0) own.push(`INVALID on every pair — ${invalidReasons.join(' · ')}`)
    if (s.presence === 0 && s.swing !== 0 && s.valid > 0) own.push(`zero presence with a swing of ${s.swing} — the subject did nothing and the fight still moved`)
    const u = UNITS[s.id]
    if (u && u.side !== 'summon' && u.attacks.length === 0) own.push('the row carries no attacks — it fields and walks')
    const ladder = `${s.fixture.replace(/^f\./, '').toUpperCase()}-${s.side}`
    rows.push({
      id: s.id, name: u?.name ?? s.id, kind: kindOf(s.id), side: s.side, class: classOf(s.id), family: familyOf(s.id), tags: [...(u?.tags ?? [])],
      plan: r.plan, fixture: s.fixture, ladder, rotation: s.rotation, ...(s.slot !== undefined ? { slot: s.slot } : {}),
      pairs: s.pairs, valid: s.valid, invalid: s.invalid, invalidReasons,
      flips: s.flips, flipRatePermille: s.flipRatePermille, winsWith, controlWins, swing: s.swing, marginShiftMean: s.marginShiftMean, tempo: s.tempoShiftMean, presence: s.presence,
      detail: pairs.map((p) => ({ map: p.map, seed: p.seed, with: { outcome: p.with.outcome, margin: p.with.margin, turns: p.with.turns, ...(p.with.error ? { error: p.with.error } : {}) }, without: { outcome: p.without.outcome, margin: p.without.margin, turns: p.without.turns, ...(p.without.error ? { error: p.without.error } : {}) }, flipped: p.flipped, marginShift: p.marginShift, tempoShift: p.tempoShift, presence: p.presence })),
      findings: own, stamp: r.stamp, current: r.stamp === packStamp,
    })
    for (const o of own) findings.push(`${s.id} (${r.plan}): ${o}`)
  }
  if (r.stamp !== packStamp) findings.push(`${r.plan}: results are from pack ${r.stamp}; the engine's pack is ${packStamp} — re-run`)
}
// the rig invariant, read off the results: a subject whose every pair is byte-for-byte the control
// (same outcome, no margin shift, no tempo shift) either IS the seat it replaced or changed nothing
for (const row of rows) {
  if (row.valid > 0 && row.detail.every((d) => !d.flipped && d.marginShift === 0 && d.tempoShift === 0)) {
    row.findings.push('identical to the control on every pair — the seat it replaced (the rig invariant), or a unit that changed nothing')
    findings.push(`${row.id} (${row.plan}): identical to the control on every pair`)
  }
}
rows.sort((a, b) => b.flipRatePermille - a.flipRatePermille || b.swing - a.swing || a.id.localeCompare(b.id))

// ── initiative ───────────────────────────────────────────────────────────────

type Mirror = { id: string; squad: string; first: number; second: number; other: number; invalid: number; perMap: Record<string, { first: number; second: number; other: number }> }
const initiative = rollups.find((r) => r.plan === 'proving.initiative')
const mirrors: Mirror[] = (initiative?.matchups ?? []).map((m) => {
  const perMap: Mirror['perMap'] = {}
  for (const b of m.battles) {
    const p = (perMap[b.map] ??= { first: 0, second: 0, other: 0 })
    if (b.outcome === 'invalid') continue
    if (winFor('hero', b.outcome)) p.first++; else if (winFor('enemy', b.outcome)) p.second++; else p.other++
  }
  return { id: m.id, squad: m.hero, first: m.heroWins, second: m.enemyWins, other: m.other, invalid: m.invalid, perMap }
})
const gapPlan = rollups.find((r) => r.plan === 'proving.initiative-gap')
const gaps = (gapPlan?.matchups ?? []).filter((m) => m.gap !== undefined).map((m) => ({ gap: m.gap!, first: m.heroWins, second: m.enemyWins, other: m.other, invalid: m.invalid, margin: m.marginMean, turns: m.turnsMean })).sort((a, b) => a.gap - b.gap)
if (initiative && initiative.switches?.['mirrorSideRules'] !== 'row') findings.push(`proving.initiative ran under mirrorSideRules '${String(initiative.switches?.['mirrorSideRules'] ?? 'fielded')}' — the ruling wants the hero-side rules out of the number (row)`)

// ── controls ─────────────────────────────────────────────────────────────────

const controlsPlan = rollups.find((r) => r.plan === 'proving.controls')
const candidates = (controlsPlan?.matchups ?? []).map((m) => {
  const s1 = m.battles.filter((b) => b.seed === controlsPlan!.seed)
  const h = s1.filter((b) => winFor('hero', b.outcome)).length, e = s1.filter((b) => winFor('enemy', b.outcome)).length
  return { id: m.id, hero: m.hero, enemy: m.enemy, seed1: { hero: h, enemy: e }, passes: (h === 2 && e === 3) || (h === 3 && e === 2), ten: { hero: m.heroWins, enemy: m.enemyWins, other: m.other }, margin: m.marginMean, turns: m.turnsMean, invalid: m.invalid }
})
// which control do the unit plans actually hang on? read their fixtures' enemy squads
const unitPlans = rollups.filter((r) => ['proving.units-hero', 'proving.units-enemy', 'proving.civilians'].includes(r.plan))
// the control's own five AS THE UNIT LADDERS SAW IT — the WITHOUT arms are the control
const inUse: { plan: string; seed1: { hero: number; enemy: number }; passes: boolean; pairs: { map: string; seed: number; outcome: string; margin: number; turns: number }[] }[] = []
for (const r of unitPlans) {
  const first = rows.find((x) => x.plan === r.plan)
  if (!first) continue
  const h = first.detail.filter((d) => winFor('hero', d.without.outcome)).length, e = first.detail.filter((d) => winFor('enemy', d.without.outcome)).length
  const passes = (h === 2 && e === 3) || (h === 3 && e === 2)
  inUse.push({ plan: r.plan, seed1: { hero: h, enemy: e }, passes, pairs: first.detail.map((d) => ({ map: d.map, seed: d.seed, outcome: d.without.outcome, margin: d.without.margin, turns: d.without.turns })) })
  if (!passes) findings.push(`${r.plan}: the control the subjects are paired against went ${h}–${e} on the seed-1 five (the WITHOUT arms) — not 2–3/3–2; retune per 9-PROVING-SETTLED §3 step 2 from the candidates that pass: ${candidates.filter((x) => x.passes).map((x) => `${x.id} (${x.seed1.hero}–${x.seed1.enemy}, ten ${x.ten.hero}–${x.ten.enemy}, margin ${x.margin})`).join('; ') || 'none pass'}`)
}
const c1 = candidates.find((c) => c.id === 'm.c1-v-c1-enemies')
if (c1 && !c1.passes && inUse.length && inUse.every((u) => u.passes)) findings.push(`C1 as written in proving.controls (${c1.enemy}) went ${c1.seed1.hero}–${c1.seed1.enemy} on the seed-1 five; the unit plans were retuned and their control passes (${inUse.map((u) => `${u.plan} ${u.seed1.hero}–${u.seed1.enemy}`).join(', ')})`)

// ── write ────────────────────────────────────────────────────────────────────

const ranking = {
  generated: new Date().toISOString().slice(0, 10), stamp: packStamp,
  plans: rollups.map((r) => ({ id: r.plan, file: r.planFile ?? null, stamp: r.stamp, current: r.stamp === packStamp, maps: r.maps, seed: r.seed, ...(r.switches ? { switches: r.switches } : {}), subjects: r.ranking.length, matchups: r.matchups.length })),
  units: rows,
  initiative: initiative ? { plan: initiative.plan, switches: initiative.switches ?? {}, maps: initiative.maps, mirrors } : null,
  gap: gapPlan ? { plan: gapPlan.plan, map: gapPlan.maps[0], switches: gapPlan.switches ?? {}, sweep: gaps } : null,
  controls: controlsPlan ? { plan: controlsPlan.plan, seed: controlsPlan.seed, inUse, candidates } : null,
  findings,
}
mkdirSync(STATE, { recursive: true })
writeFileSync(join(STATE, 'ranking.json'), JSON.stringify(ranking, null, 1))

// ── PROVING-RESULTS.md ───────────────────────────────────────────────────────

if (outDoc) {
  const L: string[] = []
  L.push(`# The Proving — results (generated)`, ``,
    `**Generated ${ranking.generated} by \`npm run proving:rank\` from \`engine/.state/proving/*/rollup.json\`, pack \`${packStamp}\`. Never hand-edit; re-run the plans and this tool.** The score is the flip rate (ruled 2026-09-03: "how much they move the needle"); five pairs — one seed, five maps — is one ranking, a coarse ruler by design. Swing is the margin shift from the subject's side, permille. Wins WITH / control: the pairs the subject's side won with it in, beside the pairs the control won without it. \`PROVING.html\` at the root is the same data with filters.`, ``)
  L.push(`Plans: ${ranking.plans.map((p) => `\`${p.id}\` (${p.subjects} subjects, ${p.matchups} matchups${p.current ? '' : ', STALE pack ' + p.stamp})`).join(' · ')}`, ``)
  const table = (title: string, list: Row[]) => {
    if (!list.length) return
    L.push(`## ${title}`, ``, `| # | Unit | Class / family | Power | Wins WITH / control | Swing | Tempo | Presence | Invalid |`, `|---|---|---|---|---|---|---|---|---|`)
    list.forEach((r, i) => L.push(`| ${i + 1} | ${r.name} \`${r.id}\` | ${r.class ?? r.family ?? '—'} | **${r.flips}/${r.valid}** | ${r.winsWith}/${r.valid} vs ${r.controlWins}/${r.valid} | ${r.swing > 0 ? '+' : ''}${r.swing} | ${r.tempo > 0 ? '+' : ''}${r.tempo} | ${r.presence} | ${r.invalid ? `${r.invalid} — ${r.invalidReasons.join('; ')}` : '—'} |`))
    L.push(``)
  }
  table('Hero ladder', rows.filter((r) => r.kind === 'hero'))
  table('Enemy ladder', rows.filter((r) => r.kind === 'enemy'))
  table('Civilians on the hero ladder', rows.filter((r) => r.kind === 'civilian'))
  if (ranking.initiative) {
    L.push(`## Initiative — ${ranking.initiative.plan} (mirrorSideRules: ${String(ranking.initiative.switches['mirrorSideRules'] ?? 'fielded')})`, ``, `Wins for the side moving first (west), per map, ten battles a mirror.`, ``)
    const maps = ranking.initiative.maps
    L.push(`| Mirror | First-mover wins | ${maps.map((m) => m.replace('map.proving.', '')).join(' | ')} |`, `|---|---|${maps.map(() => '---').join('|')}|`)
    for (const m of mirrors) L.push(`| \`${m.squad}\` | **${m.first}–${m.second}**${m.other ? ` (${m.other} other)` : ''} | ${maps.map((k) => { const p = m.perMap[k]; return p ? `${p.first}–${p.second}` : '—' }).join(' | ')} |`)
    L.push(``)
  }
  if (ranking.gap) {
    L.push(`## Starting gap — ${ranking.gap.plan} on \`${ranking.gap.map}\``, ``, `First-mover wins by the distance between the two lines, twenty battles a gap.`, ``, `| Gap | First | Second | Margin | Turns |`, `|---|---|---|---|---|`)
    for (const g of gaps) L.push(`| ${g.gap} | ${g.first} | ${g.second} | ${g.margin > 0 ? '+' : ''}${g.margin} | ${g.turns} |`)
    L.push(``)
  }
  if (ranking.controls) {
    L.push(`## Controls — ${ranking.controls.plan}`, ``, `The reference the rankings hang on. The rule (9-PROVING-SETTLED §3): the seed-${ranking.controls.seed} five must be 2–3 or 3–2; ties to the ten-battle margin nearest zero; ties to the fewer bodies.`, ``, `| Candidate | Enemy squad | Seed-${ranking.controls.seed} five | Passes | Ten | Margin | Turns |`, `|---|---|---|---|---|---|---|`)
    for (const c of candidates) L.push(`| ${c.id} | \`${c.enemy}\` | ${c.seed1.hero}–${c.seed1.enemy} | ${c.passes ? '✓' : ''} | ${c.ten.hero}–${c.ten.enemy}${c.ten.other ? ` (${c.ten.other})` : ''} | ${c.margin > 0 ? '+' : ''}${c.margin} | ${c.turns} |`)
    L.push(``)
    if (inUse.length) { L.push(`The control the unit ladders were actually paired against (their WITHOUT arms, seed-1 five): ${inUse.map((u) => `\`${u.plan}\` **${u.seed1.hero}–${u.seed1.enemy}**${u.passes ? '' : ' ✗'}`).join(' · ')}.`, ``) }
  }
  L.push(`## Findings (written by the rollup)`, ``)
  if (findings.length) for (const f of findings) L.push(`- ${f}`); else L.push(`- none`)
  L.push(``)
  writeFileSync(outDoc, L.join('\n'))
}

console.log(`proving-rank: ${rows.length} units across ${rollups.length} plans · ${mirrors.length} mirrors · ${gaps.length} gaps · ${candidates.length} control candidates · ${findings.length} findings`)
console.log(`  ${join(STATE, 'ranking.json')}`)
if (outDoc) console.log(`  ${outDoc}`)
for (const f of findings) console.log(`  finding: ${f}`)
