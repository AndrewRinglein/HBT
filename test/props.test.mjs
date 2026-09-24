import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileMaps } from '../map-schema.mjs';
const prop = { id: 'prop.test', footprint: { kind: 'hex', hexes: [1, 2] }, height: 'high', material: 2 };
const map = props => ({ id: 'test.map.props', name: 'Props', note: 'Technical prop fixture', rows: ['....', '....'], props });
test('flat map compiler transports authored props without discarding ground', () => {
  const out = compileMaps([map([prop])], true)['test.map.props'];
  assert.deepEqual(out.props, [prop]); assert.deepEqual(out.rows, ['....', '....']);
});
for (const props of [[{ ...prop, material: 4 }], [{ ...prop, footprint: { kind: 'edge', hexes: [1] } }], [{ ...prop, footprint: { kind: 'hex', hexes: [1, 1] } }], [{ ...prop, footprint: { kind: 'hex', hexes: [8] } }], [prop, prop]]) {
  test(`rejects malformed static props ${JSON.stringify(props)}`, () => assert.throws(() => compileMaps([map(props)], true), /prop/i));
}
for (const props of [null, [{ ...prop, id: 'bare' }], [{ ...prop, id: 'prop.obstacle.1' }], [{ ...prop, height: 'low' }], [{ ...prop, footprint: { kind: 'hex', hexes: [] } }]]) test(`rejects unsupported prop authoring ${JSON.stringify(props)}`, () => assert.throws(() => compileMaps([map(props)], true), /prop/i));
test('compiler detaches footprint arrays', () => {
  const input = map([structuredClone(prop)]), out = compileMaps([input], true)['test.map.props'];
  input.props[0].footprint.hexes[0] = 5;
  assert.deepEqual(out.props, [prop]);
});
// v2.knockback-collisions (COMBAT-V2-DESIGN-2026-09-07 section 9.3): a prop carries its
// collision value and whether it consumes; both are optional and travel to the engine as authored.
test('collisionValue and consumes travel through the compiler', () => {
  const well = { ...prop, collisionValue: 3, consumes: true };
  assert.deepEqual(compileMaps([map([well])], true)['test.map.props'].props, [well]);
  assert.deepEqual(compileMaps([map([prop])], true)['test.map.props'].props[0].consumes, undefined);
});
for (const extra of [{ collisionValue: -1 }, { collisionValue: 1.5 }, { collisionValue: '3' }, { consumes: false }, { consumes: 'yes' }]) {
  test(`rejects malformed collision data ${JSON.stringify(extra)}`, () => assert.throws(() => compileMaps([map([{ ...prop, ...extra }])], true), /prop/i));
}
