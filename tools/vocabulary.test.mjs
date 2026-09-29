// plumbing.vocabulary-export (engine, 2026-09-28; engine DECISIONS.md "the duplication review,
// ruled", finding V12): the viewer's hook and effect label tables are checked against the engine's
// ONE vocabulary, engine/generated/vocabulary.json. The engine adding a hook or an effect kind the
// viewer does not name fails here, not silently on screen as a raw id.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ATTACK_HOOKS, effectWord } from '../src/actions.js'
import { HOOKLBL } from '../src/panel.js'

const V = JSON.parse(fs.readFileSync(new URL('../../engine/generated/vocabulary.json', import.meta.url), 'utf8'))

test('every engine hook has a panel label', () => {
  assert.deepEqual(V.hooks.filter((h) => !HOOKLBL[h]), [])
  assert.deepEqual(Object.keys(HOOKLBL).filter((h) => !V.hooks.includes(h)), [], 'a label for a hook the engine does not have')
})

test("the action bar's attack hooks are the engine's attacker hooks", () => {
  assert.deepEqual([...ATTACK_HOOKS].sort(), [...V.attackerHooks].sort())
})

test('every trigger effect kind has a word', () => {
  const unnamed = V.triggerEffectKinds.filter((kind) => effectWord({ kind, statusId: 'status.burn', value: 1 }, {}, {})?.unknown)
  assert.deepEqual(unnamed, [])
})

// fix.ground-one-funnel (engine, 2026-09-28; review V3 V9): the ground comes from the engine too.
import { TSWATCH, layerHue, STYLE } from '../src/theme.js'
const STATIC = JSON.parse(fs.readFileSync(new URL('../generated/static.json', import.meta.url), 'utf8'))

test('every ground the engine decodes has a swatch — nothing falls back to plains in silence', () => {
  const ids = [...new Set(V.terrain.filter((t) => !t.layer).map((t) => t.id))]
  assert.deepEqual(ids.filter((id) => !TSWATCH[id]), [])
})

test("the painted layers' statuses are the engine's, as generated/static.json carries them", () => {
  const want = Object.fromEntries(V.layers.filter((l) => l.onEnter.length).map((l) => [l.id, l.onEnter[0][0]]))
  assert.deepEqual(STATIC.layerStatus, want, 'generated/static.json is stale — npm run static')
  assert.equal(layerHue('layer.weak', STATIC.layerStatus), STYLE['status.weak'].hue)   // cursed ground wears Weak's hue
})
