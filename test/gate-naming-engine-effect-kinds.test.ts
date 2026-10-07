// The gate's check 'naming — new content ids use declared kinds' and the engine's own effect kinds (2026-10-06; GBH SWITCHES
// gate.namingSkipsEngineEffectKinds). Found landing the six one-use content items: since the gate's checks read an item's
// COMMITTED lines too (tool.gate-flags-read-committed-edits, the same day) the generated content pack's lines reach the
// naming check, and a trigger's effect kind - "kind": "surge.gain", the Banner of Heroism's lent on-miss line - was read as a
// minted id of the undeclared kind 'surge'. An effect kind is the engine's word, listed in its vocabulary export
// (generated/vocabulary.json effectKinds, written by tools/vocabulary.mts from core's EFFECT_KINDS); a quoted word that IS one
// of them is not an id. Nothing else is skipped: any other dotted name still mints its kind, and an undeclared kind still blocks.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mintedKinds } from '../tools/gate-progress.mjs'
import { EFFECT_KINDS } from '../src/core/types.js'

const EXPORTED = new Set<string>(JSON.parse(readFileSync('generated/vocabulary.json', 'utf8')).effectKinds)

describe('the naming check reads minted id kinds, and the engine\'s effect kinds are not ids', () => {
  it('the list it skips is the engine\'s own export, and the export is core\'s list', () => {
    expect([...EXPORTED].sort()).toEqual([...EFFECT_KINDS].sort())
    expect(EXPORTED.has('surge.gain')).toBe(true)
  })
  it('a pack line that says an effect kind mints nothing; the ids on the same lines still do', () => {
    const lines = [
      '+              "id": "trigger.banner-heroism.plant.surge-on-miss",',
      '+                "kind": "surge.gain",',
      '+              "source": "power.banner-heroism.plant"',
      '+          "kind": "badge.grant",',
      '+          "badgeId": "badge.impersonation",',
    ]
    expect(mintedKinds(lines, EXPORTED).sort()).toEqual(['badge', 'power', 'trigger'])
    // without the export nothing is skipped: the old reading, whole
    expect(mintedKinds(lines).sort()).toEqual(['badge', 'power', 'surge', 'trigger'])
  })
  it('only the exact word is skipped: any other name under the same first word is an id, and its kind is read', () => {
    expect(mintedKinds(['+  "id": "surge.heroic"'], EXPORTED)).toEqual(['surge'])
    expect(mintedKinds(['+  "id": "surge.gain.more"'], EXPORTED)).toEqual(['surge'])
    expect(mintedKinds(['+  id: \'trap.snare\', kind: \'trap.place\''], EXPORTED)).toEqual(['trap'])
    expect(mintedKinds(['+  id: `widget.one`'], EXPORTED)).toEqual(['widget'])
  })
  it('board row art is still not an id', () => {
    expect(mintedKinds(['+  rows: [\'ww..bbbb....\', \'xf..........xfxf....\'],'], EXPORTED)).toEqual([])
  })
})
