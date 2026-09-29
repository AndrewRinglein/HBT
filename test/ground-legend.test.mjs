// fix.ground-one-funnel (engine, 2026-09-28; engine DECISIONS.md "the duplication review, ruled",
// findings C3 C4): the content tools read the ground from the engine's exported vocabulary. A map
// using every V2 ground the engine decodes passes the validator; the ground-layers rule lists the
// engine's five layers, cursed ground (weak) among them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateMap } from '../map-schema.mjs';

const V = JSON.parse(fs.readFileSync(new URL('../../engine/generated/vocabulary.json', import.meta.url), 'utf8'));

test('a map using every ground glyph the engine decodes passes the content validator', () => {
  const glyphs = V.terrain.map((t) => t.glyph).join('');
  assert.ok(/[lmd]/.test(glyphs), 'lava, marsh and desert are engine glyphs');
  const rows = [glyphs.padEnd(20, '.'), '.'.repeat(20)];
  assert.doesNotThrow(() => validateMap({ id: 'map.ground-legend', name: 'Legend', note: 'test', rows }));
});

test('a glyph the engine does not decode is refused', () => {
  assert.throws(() => validateMap({ id: 'map.ground-legend', name: 'Legend', note: 'test', rows: ['..q.', '....'] }), /glyph outside the map legend/);
});

test("the Codex's rule.ground-layers lists the engine's layers, weak among them", () => {
  const D = JSON.parse(fs.readFileSync(new URL('../hbt-content.json', import.meta.url), 'utf8'));
  const row = D.powers.find((p) => p.id === 'rule.ground-layers');
  assert.deepEqual(row.layers, V.layers.map((l) => l.id.replace(/^layer\./, '')));
  assert.ok(row.layers.includes('weak'));
  assert.match(row.description, /The five layers are: burning · frost · poisoned · darkness · weak/);
  assert.match(fs.readFileSync(new URL('../FUNCTIONS.md', import.meta.url), 'utf8'), /The five ground layers — `burning` · `frost` · `poisoned` · `darkness` · `weak`/);
});
