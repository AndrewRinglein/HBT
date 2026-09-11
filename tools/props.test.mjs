import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createState, fold } from '../src/fold.js'
import * as board from '../src/board.js'
import { El } from './fakedom.mjs'

const props = () => [{ id: 'prop.fixture', height: 'high', material: 2, footprint: { kind: 'hex', hexes: [0, 2] } }]
test('map facts fold detached props without turning ground into obstacles', () => {
  const S = createState(), event = { type: 'map.loaded', mapId: 'test.map.props', width: 3, height: 1, props: props() }
  fold(S, event, {})
  assert.deepEqual(S.props, props())
  event.props[0].footprint.hexes[0] = 1
  assert.deepEqual(S.props, props())
})
test('prop layer renders every footprint and replaces it on seek without changing ground', () => {
  globalThis.document = { createElement: tag => new El(tag) }
  const ground = new El('div'), stage = new El('div'); stage.appendChild(ground)
  const V = { data: { POS: [0, 1, 2].map(px => ({ px, py: 0 })), LAYOUT: { W: 128, H: 132 }, ASSETS: { 'hexMountain.png': 'test-art' }, F: { props: props() } }, S: { props: props() }, layers: { ground }, dom: { stage } }
  assert.equal(typeof board.syncProps, 'function')
  board.syncProps(V)
  assert.equal(V.layers.props.children.length, 2)
  assert.deepEqual(V.layers.props.children.map(x => x.dataset.prop), ['prop.fixture', 'prop.fixture'])
  assert.equal(ground.children.length, 0)
  V.S.props = []; board.syncProps(V)
  assert.equal(V.layers.props.children.length, 0)
})
