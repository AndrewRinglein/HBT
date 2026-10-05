// kingdom.lumberjack-wife-top-card-art — reported 2026-10-05 (Andrew, engine/DECISIONS.md 'playtest post, two more reports':
// "The lumberjack wife in battle 2, in the top card, just has LW and not her art, when there clearly is her art.").
//
// Expect: "In the opening's battle 2 the Lumberjack's Wife's top card shows her art; a test walks every unit of the six
// opening battles and fails if a unit whose art is in the index shows initials; the report names the cause and lists the units
// that truly have no art."
//
// The cause: the top bar's card is the unit type's token in the battle screen's art table (viewer tools/prep-art.py ARTMAP ->
// viewer generated/art/manifest.json, which the kingdom's pages are built with — tools/battle-view-assets.mjs). Her row there
// was the lettered ART PENDING standee, written 2026-09-30 when no art of her existed. Her art was made afterwards — her own
// body, the one she wears on the board (the civilian study) — and never entered the table. Her row now takes its token from
// that body's own front render.
//
// "The index": art for a unit exists when the viewer's character-model pack gives its type a body (what stands on the board),
// or the kingdom's art index holds its card. A unit with neither has no art, and its lettered card is an art need, not a fault.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { UNITS, ENCOUNTERS } from '../../engine/src/content/index.js'
import { SCENARIOS } from '../../engine/src/content/scenarios.js'

type Row = { token: string; card: string | null; aspect: number; height: number }
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const manifest = json('../viewer/generated/art/manifest.json') as { files: string[]; artmap: Record<string, Row> }
const bodies: Record<string, { looks: { model: { path: string } }[] }> = JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }))
const index = json('generated/art/index.json') as { heroes?: Record<string, string> }
const opening = [1, 2, 3, 4, 5, 6].map((n) => (Object.values(SCENARIOS as Record<string, { openingPosition?: number; encounterId?: string }>).find((s) => s.openingPosition === n)!.encounterId)!)
const fielded = (id: string) => { const enc = (ENCOUNTERS as Record<string, any>)[id]; return [...enc.setup, ...(enc.schedule ?? []).flatMap((s: any) => s.spawn ?? [])].map((f: any) => f.unit as string) }
const heroes = Object.keys(UNITS).filter((t) => t.startsWith('hero.base.'))
/** Every unit type the six opening battles field — enemies, civilians, arrivals — and every hero the run may draft. */
const everyone = [...new Set([...opening.flatMap(fielded), ...heroes])].sort()
const lettered = (t: string) => { const row = manifest.artmap[t]; return !row || row.token.startsWith('ph-') }
const hasArt = (t: string) => !!bodies[t] || !!index.heroes?.[t]
const WIFE = 'hero.fixed.lumberjacks-wife'

describe('kingdom.lumberjack-wife-top-card-art — no top card is lettered while the unit\'s art exists', () => {
  it('the six opening battles are the Orphanage to the Cathedral, and battle 2 fields the Lumberjack\'s Wife', () => {
    expect(opening).toEqual(['encounter.opening.orphanage', 'encounter.opening.lumberjack', 'encounter.opening.bridge', 'encounter.opening.cavern-trail', 'encounter.opening.gates', 'encounter.opening.cathedral'])
    expect(fielded(opening[1]!)).toContain(WIFE)
    expect(everyone.length).toBeGreaterThan(heroes.length)
  })

  it('every unit of the six opening battles, and every hero the run may draft: a unit whose art exists does not show the lettered standee', () => {
    const wrong = everyone.filter((t) => lettered(t) && hasArt(t))
    expect(wrong, `lettered in the top bar though its art exists: ${wrong.map((t) => `${t} (${(UNITS as Record<string, { name?: string }>)[t]?.name ?? t}; body ${bodies[t]?.looks[0]?.model.path ?? 'none'})`).join(', ')}`).toEqual([])
    // a token named by the table is a file the pages are built with
    for (const t of everyone.filter((x) => !lettered(x))) expect(manifest.files, `${t}'s token ${manifest.artmap[t]!.token}`).toContain(manifest.artmap[t]!.token)
  })

  it('the Lumberjack\'s Wife\'s token is her own: made from her own body\'s render, and no other unit\'s', () => {
    const row = manifest.artmap[WIFE]!
    expect(row.token.startsWith('ph-'), `her token is ${row.token}`).toBe(false)
    expect(existsSync('../viewer/generated/art/' + row.token)).toBe(true)
    expect(Object.entries(manifest.artmap).filter(([, r]) => r.token === row.token).map(([t]) => t), 'never borrowed, never lent').toEqual([WIFE])
    // the art table's own row names where it comes from: the body the character-model pack gives her
    const body = bodies[WIFE]!.looks[0]!.model.path, folder = body.replace(/[^/]+$/, '')
    const table = readFileSync('../viewer/tools/prep-art.py', 'utf8'), line = table.split('\n').find((l) => l.includes(`'${WIFE}'`))!
    expect(line, 'her row in viewer/tools/prep-art.py').toContain(folder)
    const src = line.match(/'src':\s*'([^']+)'/)![1]!
    expect(src.startsWith(folder), `${src} is a render of ${body}`).toBe(true)
    expect(existsSync('../' + src)).toBe(true)
  })

  it('the page: on the built battle screen, in each of the six opening battles, every top-bar card shows its unit\'s own art — the Lumberjack\'s Wife hers', () => {
    const out = execFileSync(process.execPath, ['tools/top-card-art.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/top-card-art: .* passed/)
    expect(out).not.toContain('ph-lumberjacks-wife')
  }, 300000)
})
