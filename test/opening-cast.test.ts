// viewer.opening-cast (PLAYABLE-OPENING-PLAN.md item 10; DECISIONS.md 2026-09-29 "the playable opening": "A unit with
// no 3D model shows its token"; "outfits may be reused across heroes"). Expect: "Battles 2 and 3 play in the new screen
// with every unit shown as a model or its token, archers shooting and imps flying." The viewer's pack
// (../viewer/tools/character-models.mjs) binds unit types to approved models; this asks the ENGINE's content whether
// battles 2 and 3's enemies and every drafted hero are bound, whether the civilians keep their tokens, whether what a
// unit's sheet asks (a shot for a ranged attack, a flight for a flight power) is bound or listed missing — never
// borrowed — and whether every file is the one hashed. Reads files; imports no viewer code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { UNITS, ENCOUNTERS, ACTIONS } from '../src/content/index.js'

type Ref = { path: string, sha256: string, clip?: string }
type Look = { id: string, model: Ref, motions: Record<string, Ref>, missing: string[], props: Ref[] }
const models: Record<string, { typeId: string, looks: Look[] }> = JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }))
const RULED = ['idle', 'move', 'attack', 'hit', 'death']
const fielded = (id: string) => { const enc = (ENCOUNTERS as Record<string, any>)[id]; return [...enc.setup, ...(enc.schedule ?? []).flatMap((s: any) => s.spawn ?? [])] }
const types = (id: string, civilian: boolean) => [...new Set(fielded(id).filter((f: any) => !!f.civilian === civilian).map((f: any) => f.unit as string))].sort()
const unit = (t: string) => (UNITS as Record<string, any>)[t]
const action = (id: string) => (ACTIONS as Record<string, any>)[id]
const flies = (t: string) => (unit(t).moves ?? []).some((m: string) => action(m)?.move?.shape === 'flight')
const shoots = (t: string) => (unit(t).attacks ?? []).some((a: string) => action(a)?.attack?.kind === 'ranged')

describe("battles 2 and 3's cast in the new screen", () => {
  it('battle 2 fields the Skeleton Archer, the Soldier and Zombies with the Lumberjack and his Wife; battle 3 the Imps', () => {
    expect(types('encounter.opening.lumberjack', false)).toEqual(['unit.skeletal-archer', 'unit.soldier', 'unit.zombie'])
    expect(types('encounter.opening.lumberjack', true)).toEqual(['hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife'])
    expect(types('encounter.opening.bridge', false)).toEqual(['unit.fire-imp', 'unit.imp'])
  })
  it('every enemy is a model that stands, walks and falls; what its look lacks is listed; the civilians are models too', () => {
    for (const enc of ['encounter.opening.lumberjack', 'encounter.opening.bridge']) {
      for (const t of types(enc, false)) {
        expect(models[t], t).toBeDefined()
        for (const look of models[t]!.looks) {
          for (const m of ['idle', 'move', 'death']) expect(look.motions[m], `${t} ${look.id} ${m}`).toBeDefined()
          for (const m of RULED) expect(look.missing.includes(m), `${t} ${look.id} ${m}`).toBe(!look.motions[m])
        }
      }
      /* Law 10 (viewer.every-model, 2026-10-01): was `toBeUndefined()` — the civilians kept their tokens. Andrew 2026-09-30
         (DECISIONS.md 'a true 3D battle'): "none stands as a 2D token" (test/every-model.test.ts) */
      for (const t of types(enc, true)) expect(models[t], t).toBeDefined()
    }
  })
  it('the archers shoot: a ranged enemy has a shot motion or lists it missing (the shot is the board projectile)', () => {
    expect(shoots('unit.skeletal-archer')).toBe(true)
    for (const look of models['unit.skeletal-archer']!.looks) expect(!!look.motions.ranged || look.missing.includes('ranged')).toBe(true)
    /* Law 10 (viewer.every-model, 2026-10-01): was ['attack', 'hit', 'ranged'] — listed, never borrowed. Andrew 2026-09-30
       (DECISIONS.md 'a bunch of motions, not every one'): the selected motions "may be used on the Skeleton Archer" */
    expect(models['unit.skeletal-archer']!.looks[0]!.missing).toEqual([])
  })
  it('the imps fly: the engine grants the Imp flight and its look has a flight motion', () => {
    expect(flies('unit.imp')).toBe(true)
    for (const look of models['unit.imp']!.looks) expect(look.motions.flight, look.id).toBeDefined()
    for (const t of Object.keys(models)) if (unit(t) && flies(t)) for (const look of models[t]!.looks) expect(!!look.motions.flight || look.missing.includes('flight'), t).toBe(true)
  })
  it('every drafted hero wears an outfit by its class, with idle, move, attack, hit and death', () => {
    const heroes = Object.keys(UNITS).filter((t) => t.startsWith('hero.base.'))
    expect(heroes.length).toBeGreaterThanOrEqual(24)
    const byClass = new Map<string, string>()
    for (const t of heroes) {
      const cls = (unit(t).tags as string[]).filter((x) => x.startsWith('class.'))
      expect(cls.length, t).toBe(1)
      const look = models[t]?.looks[0]
      expect(look, t).toBeDefined()
      for (const m of RULED) expect(look!.motions[m], `${t} ${m}`).toBeDefined()
      if (byClass.has(cls[0]!)) expect(look!.id, t).toBe(byClass.get(cls[0]!)); else byClass.set(cls[0]!, look!.id)
    }
  })
  it('every file is the one its hash names', () => {
    const files = new Map<string, string>()
    for (const b of Object.values(models)) for (const look of b.looks) for (const r of [look.model, ...Object.values(look.motions), ...look.props]) files.set(r.path, r.sha256)
    for (const [path, sha] of files) expect(createHash('sha256').update(readFileSync('../' + path)).digest('hex'), path).toBe(sha)
  })
})
