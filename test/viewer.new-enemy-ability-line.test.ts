// viewer.new-enemy-ability-line (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class
// line, no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer
// start'). Andrew: "I think when enemies have new mechanics and appear, there should probably be a notification when that
// enemy is focused on. In that notification there should be something like, \"This enemy can do X.\"" The sentences are
// CONTENT — one on each enemy row of the six opening battles (content/gen/enemies-authored.json `playerLine`), published
// (content/hbt-content.json) and dumped with the unit sheets (viewer generated/static.json `unitLines`). The engine's side:
// nothing of it changes, and what each sentence claims is held here against the engine's own rows — the ranged kinds have
// an attack that reaches, the fliers a flight, the hounds a move that ignores zones of control, the ones that burn, poison,
// weaken, bleed, raise and heal the trigger that does it. FOUND, for the engine's queue: the engine's unit row carries no
// player-facing line (the pack does not read the field), so the sentence reaches the viewer from the published content, not
// through the engine's door (viewer SWITCHES abilityLineDoor). The viewer's half is
// ../viewer/tools/new-enemy-ability-line.test.mjs; the sandbox's half ../kingdom/tools/new-enemy-ability-line.verify.mjs.
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { UNITS, ACTIONS, ENCOUNTERS } from '../../engine/src/content/index.js'

type Trigger = { hook: string; effect: { kind: string; statusId?: string }; select?: unknown }
type Unit = { typeId: string; name: string; side: string; attacks: string[]; abilities: string[]; moves: string[]; triggers?: Trigger[]; auras?: unknown[] }
type Action = { range?: number; move?: { shape?: string; ignoresZoc?: boolean }; attack?: unknown; effects?: { kind: string }[] }
const U = UNITS as unknown as Record<string, Unit>, A = ACTIONS as unknown as Record<string, Action>
const AUTHORED: { units: { id: string; playerLine?: string | null }[] } = JSON.parse(readFileSync('../content/gen/enemies-authored.json', 'utf8'))
const LINE = Object.fromEntries(AUTHORED.units.map((r) => [r.id, r.playerLine]))
const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']
/** every enemy kind the six opening battles field, read from the engine's own recordings of them */
const kinds = [...new Set(OPENING.flatMap((n) => (JSON.parse(readFileSync(`../viewer/battles/test.opening-${n}.json`, 'utf8')).events as { type: string; side?: string; typeId?: string }[])
  .filter((e) => e.type === 'unit.enter' && e.side === 'enemy').map((e) => e.typeId!)))].sort()
const reaches = (u: Unit) => Math.max(...u.attacks.map((id) => A[id]?.range ?? 0))
const applies = (u: Unit, status: string) => (u.triggers ?? []).some((t) => t.effect.kind === 'status.apply' && t.effect.statusId === status)
const does = (u: Unit, kind: string) => (u.triggers ?? []).some((t) => t.effect.kind === kind)

describe('the "New enemy" notice says what the enemy can do, in the content\'s own words', () => {
  it('the six opening encounters are the engine\'s, and every enemy kind they field has a sentence or says it has none', () => {
    for (const n of OPENING) expect(Object.keys(ENCOUNTERS)).toContain('encounter.opening.' + n)
    expect(kinds.length).toBeGreaterThanOrEqual(16)
    for (const k of kinds) {
      expect(U[k], k).toBeTruthy(); expect(k in LINE, `${k} has an authored row`).toBe(true)
      const line = LINE[k]
      expect(line === null || typeof line === 'string', `${k}: a sentence, or null for none`).toBe(true)
      if (typeof line === 'string') { expect(line).toMatch(/^This enemy can [a-z].*\.$/); expect(line).not.toMatch(/\d/) }
    }
  })
  it('each sentence says what the kind\'s own rows do', () => {
    const says = (k: string, re: RegExp) => expect(LINE[k] ?? '', k).toMatch(re)
    for (const k of kinds) {
      const u = U[k]!, line = LINE[k]; if (typeof line !== 'string') continue
      /* said to strike from afar: it has an attack that reaches; said to fly: a flight; said to run past: a move that ignores zones of control */
      if (/far away|from a distance/.test(line)) expect(reaches(u), `${k} reaches`).toBeGreaterThan(1)
      if (/\bfly\b/.test(line)) expect(u.moves.some((id) => A[id]?.move?.shape === 'flight'), `${k} flies`).toBe(true)
      if (/without drawing a free attack/.test(line)) expect(u.moves.some((id) => A[id]?.move?.ignoresZoc === true), `${k} ignores zones of control`).toBe(true)
      for (const [word, status] of [['burn', 'status.burn'], ['poison', 'status.poison'], ['weaken', 'status.weak'], ['bleed', 'status.bleed'], ['Protection', 'status.protection']] as const)
        if (new RegExp(word, 'i').test(line)) expect(applies(u, status), `${k} applies ${status}`).toBe(true)
      if (/raise the dead/.test(line)) expect(does(u, 'corpse.raise'), `${k} raises`).toBe(true)
      if (/\bheals?\b/.test(line)) expect(does(u, 'heal') || applies(u, 'status.regeneration') || u.abilities.some((id) => (A[id]?.effects ?? []).some((e) => e.kind === 'corpse.eat')), `${k} heals`).toBe(true)
      if (/tires? you/.test(line)) expect(does(u, 'stamina.drain'), `${k} drains stamina`).toBe(true)
    }
    /* and the other way round for the two things a player cannot see coming: every kind that flies, or that ignores zones of
       control, says so (a blast from range is said where it is the kind's point; the Fire Imp's sentence is the item's own) */
    for (const k of kinds) { const u = U[k]!
      if (u.moves.some((id) => A[id]?.move?.shape === 'flight')) says(k, /\bfly\b/)
      if (u.moves.some((id) => A[id]?.move?.ignoresZoc === true)) says(k, /without drawing a free attack/) }
    says('unit.skeletal-archer', /shoot/)
  })
  it('the viewer page: the notice\'s third line is the content\'s row; a kind with none shows its name alone; no sentence is typed in viewer/src or kingdom/src', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/new-enemy-ability-line.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 4/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: on the built BATTLE-SANDBOX.html battle 2\'s "New enemy / Skeleton Archer" carries the content\'s sentence that it shoots from range', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/new-enemy-ability-line.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/new-enemy-ability-line.verify.mjs', 'scratch/new-enemy-ability-line.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/new-enemy-ability-line: .*passed/)
  }, 170000)
})
