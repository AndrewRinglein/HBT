// viewer.every-model (DECISIONS.md 2026-09-30 'the battle is its own full screen; ...; every 3D character': "And there are
// no 3D characters in this. I want all the 3D characters and enemies and motions."; 'a bunch of motions, not every one':
// "I want to see a bunch of motions in there" — "a lacking motion is filled from the approved or selected motions where
// one fits, and is still listed where none does"; 'a true 3D battle': "Everything in Orphanage has a 3D model, so if
// you're not finding the 3D model, you're just not looking in the right place."). Expect: "In battles 1-3 every hero,
// enemy and civilian on the board is a 3D model that idles, walks (or flies), attacks, flinches and dies; none stands as a
// 2D token." This asks the ENGINE's content what battles 1-3 field — enemies, civilians, and every hero the screen may
// draft — and whether the viewer's pack (../viewer/tools/character-models.mjs) gives each a body with those motions; the
// viewer's half (../viewer/tools/every-model.test.mjs) loads the bodies and stands them on the page's board, the
// kingdom's (../kingdom/tools/sandbox-every-model.verify.mjs) opens each battle in the COMMITTED sandbox. Imports no
// page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { UNITS, ENCOUNTERS } from '../../engine/src/content/index.js'
import { SCENARIOS } from '../../engine/src/content/scenarios.js'

type Ref = { path: string, sha256: string, clip: string, borrowed?: boolean }
type Look = { id: string, height: number, model: Ref, motions: Record<string, Ref>, missing: string[] }
const models: Record<string, { typeId: string, looks: Look[] }> = JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }))
const run = (cwd: string, args: string[]) => execFileSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: '' } })
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const nodesOf = (p: string) => { const b = readFileSync('../' + p); return (JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')).nodes as { name: string }[]).map((n) => n.name) }
const opening = [1, 2, 3].map((n) => Object.values(SCENARIOS as Record<string, any>).find((s) => s.openingPosition === n)!.encounterId as string)
const fielded = (id: string) => { const enc = (ENCOUNTERS as Record<string, any>)[id]; return [...enc.setup, ...(enc.schedule ?? []).flatMap((s: any) => s.spawn ?? [])].map((f: any) => f.unit as string) }
const heroes = Object.keys(UNITS).filter((t) => t.startsWith('hero.base.'))

describe('battles 1-3: every hero, enemy and civilian a 3D model with its motions', () => {
  it('battles 1-3 are the Orphanage, the Lumberjack House and the Bridge; they field civilians as well as enemies', () => {
    expect(opening).toEqual(['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.opening.bridge'])
    expect(fielded(opening[0]!).filter((t) => t.startsWith('hero.fixed.')).length).toBeGreaterThan(0)
  })
  it('every unit type they field, and every hero the screen may draft, is a model that idles, walks, strikes and dies', () => {
    const all = [...new Set([...opening.flatMap(fielded), ...heroes])]
    for (const t of all) {
      expect(models[t], `${t} is a model`).toBeDefined()
      for (const look of models[t]!.looks) for (const m of ['idle', 'move', 'attack', 'death']) expect(look.motions[m], `${t} ${look.id} ${m}`).toBeDefined()
    }
  })
  it('each flinches, unless no selected flinch fits its body — then it is listed, and only then', () => {
    for (const t of new Set([...opening.flatMap(fielded), ...heroes])) for (const look of models[t]!.looks) {
      expect(!look.motions.hit, `${t} ${look.id}`).toBe(look.missing.includes('hit'))
      /* the selected performances move the CC_Base rig: a body on it lacks nothing they fill */
      if (look.missing.length) expect(nodesOf(look.model.path).includes('CC_Base_Hip'), `${t} ${look.id} lacks ${look.missing}`).toBe(false)
    }
  })
  it("each civilian wears its own roster body — the activation registry's identity, the roster's body, the paint record's bytes", () => {
    const registry = json('../assets/characters/hero-transformations/activation-registry.json'), roster = json('../assets/characters/hero-transformations/player-roster/roster.json').characters
    const civilians = [...new Set(opening.flatMap(fielded).filter((t) => t.startsWith('hero.fixed.')))]
    expect(civilians.sort()).toEqual(['hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife', 'hero.fixed.orphans', 'hero.fixed.school-teacher'])
    for (const t of civilians) {
      const look = models[t]!.looks[0]!, body = roster.find((c: any) => c.id === registry.typeIds[t]).bodyModel.replace(/\\/g, '/')
      expect(body.endsWith('/' + look.model.path), t).toBe(true)
      expect(createHash('sha256').update(readFileSync('../' + look.model.path)).digest('hex')).toBe(json('../' + look.model.path.replace(/[^/]+$/, 'paint-record.json')).outputSHA256)
    }
  })
  it('a borrowed motion is a selected one, its bytes the selection\'s', () => {
    const free = '../assets/characters/oathblade-armor/rebuild/free-motion-study/'
    const selected = new Map([...Object.values(json(free + 'selections.json').clips), ...Object.values(json(free + 'battle-actions/selections.json').clips)].map((c: any) => [c.clip, c.sha256]))
    let borrowed = 0
    for (const b of Object.values(models)) for (const look of b.looks) for (const r of Object.values(look.motions)) {
      if (!r.borrowed) continue
      borrowed++
      expect(createHash('sha256').update(readFileSync('../' + r.path)).digest('hex'), r.path).toBe(r.sha256)
      if (selected.has(r.clip)) expect(r.sha256, r.clip).toBe(selected.get(r.clip))
    }
    expect(borrowed).toBeGreaterThan(0)
  })
  it('the viewer page: the bodies load, strike and flinch on their own bone lengths, and every unit of battles 1-3 stands on the board as its model', () => {
    const out = run('../viewer', ['--test', 'tools/every-model.test.mjs'])
    expect(out).toMatch(/# pass 5/)
    expect(out).toMatch(/# fail 0/)
  }, 150000)
  it('the sandbox page opened with ?play= on battles 1-3 carries a model for every unit on the board', () => {
    const out = run('../kingdom', ['tools/sandbox-every-model.verify.mjs', 'BATTLE-SANDBOX.html'])
    expect(out).toMatch(/sandbox every model: .*passed/)
  }, 90000)
})
