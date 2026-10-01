// viewer.character-models (PLAYABLE-OPENING-PLAN.md item 5; DECISIONS.md 2026-09-29 "the playable opening":
// "A unit with no 3D model shows its token"; "Motions: enemies need idle, move, attack, hit reaction and death").
// The viewer draws a unit type as a 3D model from one pack, built by ../viewer/tools/character-models.mjs from
// assets/characters/APPROVED-CHARACTERS.md's records and assets/battle-demo/roster.mjs. This asks the ENGINE's
// content whether every bound type is one it fields, whether battle 1's enemies are all bound with the motions
// the ruling names (what a look lacks is listed, never borrowed), and whether every file is the one hashed —
// so a renamed unit or a replaced model shows up here, not only in the viewer. Reads files; imports no viewer code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { UNITS, ENCOUNTERS } from '../../engine/src/content/index.js'

type Ref = { path: string, sha256: string, clip?: string }
type Look = { id: string, height: number, pivot: string, model: Ref, motions: Record<string, Ref>, missing: string[], props: Ref[] }
const pack = (): Record<string, { typeId: string, looks: Look[] }> => JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }))
const RULED = ['idle', 'move', 'attack', 'hit', 'death']

describe('the character models stand on the engine roster', () => {
  const models = pack()
  it('binds only unit types the engine fields', () => {
    for (const typeId of Object.keys(models)) expect(Object.hasOwn(UNITS, typeId), typeId).toBe(true)
  })
  it("battle 1's enemies are all models with the ruled motions; its civilians are models too", () => {
    const enc = (ENCOUNTERS as Record<string, any>)['encounter.opening.orphanage']
    const fielded = [...enc.setup, ...enc.schedule.flatMap((s: any) => s.spawn)]
    const enemies = [...new Set(fielded.filter((f: any) => !f.civilian).map((f: any) => f.unit))]
    const civilians = [...new Set(fielded.filter((f: any) => f.civilian).map((f: any) => f.unit))]
    expect(enemies).toEqual(['unit.zombie'])
    for (const typeId of enemies) {
      expect(models[typeId], typeId).toBeDefined()
      for (const look of models[typeId]!.looks) {
        for (const m of ['idle', 'move', 'attack', 'death']) expect(look.motions[m], `${look.id} ${m}`).toBeDefined()
        expect(RULED.filter(m => !look.motions[m])).toEqual(look.missing)
      }
    }
    /* Law 10 (viewer.every-model, 2026-10-01): was `toBeUndefined()` — the civilians kept their tokens. Andrew 2026-09-30
       (DECISIONS.md 'a true 3D battle'): "Everything in Orphanage has a 3D model"; they now wear their own roster bodies
       (kingdom/test/every-model.test.ts) */
    expect(civilians.length).toBeGreaterThan(0)
    for (const typeId of civilians) expect(models[typeId], typeId).toBeDefined()
  })
  it('the bow hero shoots, is struck and falls', () => {
    const look = models['hero.base.ranger-scantily']!.looks[0]!
    expect(Object.keys(look.motions).sort()).toEqual(['attack', 'death', 'hit', 'idle', 'move', 'ranged'])
    expect(look.missing).toEqual([])
  })
  it('every file is the one its hash names', () => {
    const files = new Map<string, string>()
    for (const b of Object.values(models)) for (const look of b.looks) for (const r of [look.model, ...Object.values(look.motions), ...look.props]) files.set(r.path, r.sha256)
    for (const [path, sha] of files) expect(createHash('sha256').update(readFileSync('../' + path)).digest('hex'), path).toBe(sha)
  })
})
