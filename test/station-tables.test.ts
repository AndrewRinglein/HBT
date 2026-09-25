// fix.retired-stations (2026-09-25). "ACC.TERRAIN (400) and DMG.TERRAIN (300) were
// retired when terrain moved into the stat pipeline. Both constants still sit in the
// station tables reading as unbuilt gaps." ACC.TERRAIN has since been REVIVED (V2
// concealment, v2.ground-table 2026-09-24); DMG.TERRAIN stays retired. The tables now
// say, in data, which stations nothing writes and why — and this test keeps that
// list honest in both directions, so it cannot drift the way the prose did.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ACC, DMG, UNWIRED_STATIONS } from '../src/core/pipeline.js'

const SRC = fileURLToPath(new URL('../src/', import.meta.url))

function sources(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== 'generated') out.push(...sources(p)) }
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

/** Every `ACC.X` / `DMG.X` the engine's CODE reads — comments stripped, so prose that names a station does not count as writing it. */
function stationsInCode(): Set<string> {
  const seen = new Set<string>()
  for (const f of sources(SRC)) {
    const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const m of code.matchAll(/\b(ACC|DMG)\.([A-Z_]+)\b/g)) seen.add(`${m[1]}.${m[2]}`)
  }
  return seen
}

describe('the station tables distinguish retired from not-yet-built — fix.retired-stations', () => {
  const used = stationsInCode()
  const tables = { ACC, DMG } as const
  const unwired = { ACC: UNWIRED_STATIONS.acc, DMG: UNWIRED_STATIONS.dmg } as const

  it('DMG.TERRAIN is retired, not a gap; ACC.TERRAIN is live again (V2 concealment)', () => {
    expect(UNWIRED_STATIONS.dmg.TERRAIN).toBe('retired')
    expect(UNWIRED_STATIONS.acc.TERRAIN).toBeUndefined()
    expect(used.has('ACC.TERRAIN')).toBe(true)
  })

  it('every station nothing writes is named as retired or not-yet-built', () => {
    for (const t of ['ACC', 'DMG'] as const) for (const k of Object.keys(tables[t])) {
      if (!used.has(`${t}.${k}`)) expect((unwired[t] as Record<string, string>)[k], `${t}.${k} has no writer and no status`).toMatch(/^(retired|notYet)$/)
    }
  })

  it('a station named retired or not-yet-built has no writer — build one and the list must change with it', () => {
    for (const t of ['ACC', 'DMG'] as const) for (const k of Object.keys(unwired[t])) {
      expect(k in tables[t], `${t}.${k} is not a station`).toBe(true)
      expect(used.has(`${t}.${k}`), `${t}.${k} is listed unwired but the engine writes it`).toBe(false)
    }
  })

  it('the unwired stations today: DMG.TERRAIN retired; ACC.FINAL, DMG.POSITIONAL, DMG.APPLY not yet', () => {
    expect(UNWIRED_STATIONS).toEqual({ acc: { FINAL: 'notYet' }, dmg: { TERRAIN: 'retired', POSITIONAL: 'notYet', APPLY: 'notYet' } })
  })
})
