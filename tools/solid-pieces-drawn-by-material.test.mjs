// viewer.solid-pieces-drawn-by-material (engine backlog; split out of viewer.scene-drawn-in-few-calls by the home chat 2026-10-05;
// engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the speed first; …'). "The solid pieces of a scene - opaque,
// not blended - are each drawn in their own call today, and pieces that share a material can be drawn together with no change
// to the picture. Wanted: at scene build, the solid pieces are grouped by material (and by whatever else must match for the
// result to be the same pixels - shadow casting and receiving, the see-through fade's membership, layers) and each group is
// drawn in one call. Untouched: every blended or two-sided foliage piece, the bodies, the effects, and the see-through check's
// behaviour - a piece that can be faded see-through must still fade by itself."
// Held here on the sources, without a graphics card: WHICH pieces go into which batch and which are left as they were; that a
// batch hands the card, for every piece, the very numbers three hands it for that piece drawn alone (its model-view, normal and
// world matrices, bit for bit) and that the shader reads them where three's read the object's own — nothing else of three's
// shader changed; that a batch draws the pieces three would draw, in the order three draws them (where two pieces cross, the
// later drawn shows), and hands the shadow pass its casters alone; that a faded piece leaves its batch and returns; and what
// the driver does with them (when they are built, what each pass draws). That the PICTURE is the same pixels is the page's half, in real Chrome
// (../test/viewer.solid-pieces-drawn-by-material.test.ts: tools/frame-cost.mjs draws every view both ways and compares).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { standOut } from '../src/stand-out.js'
const A = await modules()
const { solidBatches, batchable, batchKey, exactVertex, hookKeepsVertex, ExactBatch, PIECE_LAYER, PIECE_TEXELS } = A
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const onLayer = (o, n) => o.layers.mask === (1 << n) >>> 0

/** a made scene: rocks of one material in two shapes, walls of another, a lone statue, blended leaves, an instanced part, a
    piece of two materials, rocks that cast no shadow, a mirrored rock */
function made() {
  const top = new THREE.Group(), root = new THREE.Group(); root.position.set(3, 0, -2); root.rotation.y = .4; top.add(root)
  const rock = new THREE.MeshStandardMaterial({ name: 'rock' }), wall = new THREE.MeshStandardMaterial({ name: 'wall' }), lone = new THREE.MeshStandardMaterial({ name: 'statue' })
  const leaf = new THREE.MeshStandardMaterial({ name: 'leaf', transparent: true, side: THREE.DoubleSide })
  const shapeA = new THREE.BoxGeometry(1, 1, 1), shapeB = new THREE.SphereGeometry(.6, 8, 6), wallShape = new THREE.BoxGeometry(4, 3, .3), plane = new THREE.PlaneGeometry(1, 1)
  const r = rng(11), all = {}
  const put = (name, geometry, material, { cast = true, mirror = false } = {}) => { const m = new THREE.Mesh(geometry, material); m.name = name; m.castShadow = cast; m.receiveShadow = true
    m.position.set(r() * 30 - 15, r() * 2, r() * 30 - 15); m.rotation.set(r() * 6, r() * 6, r() * 6); m.scale.set(.5 + r() * 2, .5 + r() * 2, .5 + r() * 2); if (mirror) m.scale.x *= -1
    root.add(m); all[name] = m; return m }
  for (let i = 0; i < 5; i++) put('rock' + i, i % 2 ? shapeA : shapeB, rock)
  for (let i = 0; i < 3; i++) put('wall' + i, wallShape, wall)
  put('statue', shapeB, lone)
  for (let i = 0; i < 4; i++) put('leaf' + i, plane, leaf)
  for (let i = 0; i < 2; i++) put('pebble' + i, shapeA, rock, { cast: false })
  put('mirrored', shapeA, rock, { mirror: true })
  put('two', shapeA, [rock, wall])
  const inst = new THREE.InstancedMesh(shapeA, wall, 3); inst.name = 'instanced'; root.add(inst); all.instanced = inst
  return { top, root, all, rock, wall, lone, leaf }
}

test('the solid pieces that share a material are one batch; the blended, the instanced, the many-materialled, the lone and the mirrored are left as they were', () => {
  const { top, all, rock, wall } = made(), B = solidBatches(top)
  assert.deepEqual(B.batches.map(b => [b.name, b.instanceCount, b.castShadow, b.receiveShadow]), [['solid-batch:rock', 7, true, true], ['solid-batch:wall', 3, true, true]],
    'two batches, in the order of their materials: the rocks — those that cast a shadow and the pebbles that do not, together — and the walls')
  assert.equal(B.pieces.length, 10)
  for (const p of B.pieces) { assert.ok(onLayer(p.o, PIECE_LAYER), p.o.name + ' waits on the pieces\' layer: no pass of the view draws it by itself'); assert.equal(p.o.visible, true, 'and is still a visible piece of the scene')
    assert.equal(p.batch.getVisibleAt(p.id), true) }
  for (const name of ['statue', 'leaf0', 'leaf3', 'mirrored', 'two', 'instanced']) assert.ok(onLayer(all[name], 0), name + ' is drawn as it was')
  /* the batches hang from the scene's group, hold each shape once, are never culled as one, and offer no ray */
  for (const b of B.batches) { assert.equal(b.parent, top); assert.equal(b.frustumCulled, false); assert.equal(b.perObjectFrustumCulled, false); assert.equal(b.sortObjects, false); assert.ok(b.isBatchedMesh)
    assert.notEqual(b.material, rock); assert.notEqual(b.material, wall); assert.ok(b.customDepthMaterial?.isMeshDepthMaterial) }
  assert.equal(B.batches[0]._geometryCount, 2, 'the rocks\' two shapes, each held once'); assert.equal(B.batches[1]._geometryCount, 1)
  /* a batch's material is the pieces' own behind a shader hook of the batch's: the same number (its place in three's order of
     drawing), the same look whatever is set on the material later */
  assert.equal(Object.getPrototypeOf(B.batches[0].material), rock); assert.equal(B.batches[0].material.id, rock.id); assert.equal(B.batches[1].material.id, wall.id)
  assert.equal(B.batches[0].material.name, 'rock'); assert.equal(B.batches[0].material.transparent, false)
  rock.roughness = .21; assert.equal(B.batches[0].material.roughness, .21, 'what is set on the material is the batch\'s look too')
  assert.notEqual(B.batches[0].material.onBeforeCompile, rock.onBeforeCompile); assert.notEqual(B.batches[0].material.customProgramCacheKey(), rock.customProgramCacheKey())
  /* what was counted: every piece of the opaque pass, batched or not */
  assert.equal(B.solid, 5 + 3 + 1 + 2 + 1 + 1 + 1, 'the scene\'s solid pieces: rocks, walls, the statue, pebbles, the mirrored rock, the two-material piece, the instanced part')
  /* what must match */
  assert.equal(batchKey(all.rock0) === batchKey(all.rock2), true); assert.equal(batchKey(all.rock0) === batchKey(all.rock1), true, 'two shapes of the same attributes share a batch')
  assert.equal(batchKey(all.rock0), batchKey(all.pebble0), 'a piece that casts no shadow shares its material\'s batch'); assert.notEqual(batchKey(all.rock1), batchKey(all.mirrored), 'mirrored apart')
  const recv = all.rock0.clone(); recv.receiveShadow = false; recv.updateMatrixWorld(true); assert.notEqual(batchKey(all.rock0), batchKey(recv), 'taking shadow apart')
  const late = all.rock0.clone(); late.renderOrder = 2; late.updateMatrixWorld(true); assert.notEqual(batchKey(all.rock0), batchKey(late), 'the order they are drawn in apart')
  const coloured = new THREE.Mesh(all.rock1.geometry.clone(), rock); coloured.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(coloured.geometry.attributes.position.count * 3), 3)); coloured.updateMatrixWorld(true)
  assert.notEqual(batchKey(all.rock1), batchKey(coloured), 'a shape with another set of attributes apart')
  /* what cannot be batched at all */
  const no = (change, why) => { const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); top.add(m); change(m); top.updateMatrixWorld(true); assert.equal(batchable(m, top), false, why); top.remove(m) }
  const yes = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); top.add(yes); assert.equal(batchable(yes, top), true); top.remove(yes)
  no(m => { m.material.transparent = true }, 'a blended piece'); no(m => { m.material = new THREE.ShaderMaterial() }, 'a shader of its own')
  no(m => { m.material.blending = THREE.AdditiveBlending }, 'another blending'); no(m => { m.material = new THREE.MeshPhysicalMaterial({ transmission: .5 }) }, 'a glass')
  no(m => { m.geometry.morphAttributes.position = [m.geometry.attributes.position.clone()] }, 'a shape that morphs'); no(m => { m.geometry.setDrawRange(0, 6) }, 'a part of a shape')
  no(m => { m.onBeforeRender = () => {} }, 'a piece with a hook of its own'); no(m => { m.customDepthMaterial = new THREE.MeshDepthMaterial() }, 'a shadow material of its own')
  no(m => { m.layers.set(2) }, 'a piece on another layer'); no(m => { m.visible = false }, 'a hidden piece'); no(m => { m.material.normalMapType = THREE.ObjectSpaceNormalMap }, 'a normal map in the object\'s own space')
  no(m => { m.material.wireframe = true }, 'a wireframe'); no(m => { m.material.displacementMap = new THREE.Texture() }, 'a displaced one')
  no(m => { m.frustumCulled = false }, 'a piece three draws in sight or out of it')
  B.dispose()
})

const viewCamera = () => { const c = new THREE.PerspectiveCamera(22, 1448 / 716, .5, 400); c.position.set(14, 31, 37); c.lookAt(1, 0, -3); c.updateMatrixWorld(true); return c }
const sunCamera = () => { const c = new THREE.OrthographicCamera(-70, 70, 70, -70, 1, 200); c.position.set(-45, 80, 38); c.lookAt(0, 0, 0); c.updateMatrixWorld(true); return c }

test('a batch hands the card, for every piece it draws, the very numbers three hands it for that piece drawn alone — model-view, normal and world matrix, bit for bit, for the view\'s camera and for the sun\'s', () => {
  const { top } = made(), B = solidBatches(top), camera = viewCamera(), sun = sunCamera()
  const bits = a => Array.from(new Uint32Array(new Float32Array(a).buffer))
  assert.equal(PIECE_TEXELS, 12)
  let checked = 0
  for (const cam of [camera, sun, camera]) for (const b of B.batches) {
    b.onBeforeRender(null, null, cam, b.geometry, b.material)
    const data = b._matricesTexture.image.data, drawn = b.drawnLast
    assert.ok(drawn.length >= 3, b.name + ': pieces in this camera\'s sight')
    for (const o of drawn) { const id = B.pieces.find(p => p.o === o).id, at = id * PIECE_TEXELS * 4
      /* three's own two lines for an object drawn alone (WebGLRenderer renderObject), and what it hands the card: rounded to single */
      o.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, o.matrixWorld); o.normalMatrix.getNormalMatrix(o.modelViewMatrix)
      assert.deepEqual(bits(data.slice(at, at + 16)), bits(o.modelViewMatrix.elements), o.name + ': its model-view matrix, to the bit')
      assert.deepEqual(bits([data[at + 16], data[at + 17], data[at + 18], data[at + 20], data[at + 21], data[at + 22], data[at + 24], data[at + 25], data[at + 26]]), bits(o.normalMatrix.elements), o.name + ': its normal matrix, to the bit')
      assert.deepEqual(bits(data.slice(at + 32, at + 48)), bits(o.matrixWorld.elements), o.name + ': its world matrix, to the bit')
      checked++ }
    /* the texture is three's batchingTexture, a row a whole number of pieces wide */
    assert.equal(b._matricesTexture.image.width % PIECE_TEXELS, 0); assert.ok(b._matricesTexture.image.width * b._matricesTexture.image.height >= b.instanceCount * PIECE_TEXELS)
  }
  assert.ok(checked >= 24, 'pieces checked: ' + checked)
  /* worked out again only when the camera a pass is drawn from is another one, or has moved, or the batch has changed */
  const b = B.batches[0], lists = b.lists
  b.onBeforeRender(null, null, camera); assert.equal(b.lists, lists, 'the same camera, not moved: nothing worked out again')
  camera.position.x += .01; camera.updateMatrixWorld(true); b.onBeforeRender(null, null, camera); assert.equal(b.lists, lists + 1, 'moved: once')
  b.onBeforeShadow(null, b, camera, sun); assert.equal(b.lists, lists + 2, 'the shadow pass: for the sun\'s camera')
  b.onBeforeRender(null, null, camera); assert.equal(b.lists, lists + 3, 'and the view\'s pass after it: for the view\'s again')
  b.setVisibleAt(0, false); b.onBeforeRender(null, null, camera); assert.equal(b.lists, lists + 4, 'a piece left the batch: once more')
  B.dispose()
})

test('a batch draws the pieces three would draw, in the order three draws them: in sight of the camera, the nearer first, then the earlier made — and hands the shadow pass its casters alone', () => {
  const { top, all } = made(), B = solidBatches(top), sun = sunCamera()
  /* three's own: which meshes a pass draws (Frustum.intersectsObject) and in what order (WebGLRenderer projectObject's depth
     of the middle of each mesh's sphere; WebGLRenderLists painterSortStable: that depth, then the object's number) */
  const threes = (camera, list) => { const proj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), frustum = new THREE.Frustum().setFromProjectionMatrix(proj, camera.coordinateSystem, camera.reversedDepth)
    return list.filter(o => frustum.intersectsObject(o)).map(o => ({ o, z: new THREE.Vector4().copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld).applyMatrix4(proj).z })).sort((a, b) => a.z !== b.z ? a.z - b.z : a.o.id - b.o.id).map(x => x.o.name) }
  const r = rng(5)
  let culled = 0, orders = new Set()
  for (let view = 0; view < 40; view++) {
    const camera = new THREE.PerspectiveCamera(8 + r() * 30, 1448 / 716, .5, 400); camera.position.set(r() * 60 - 30, 5 + r() * 40, r() * 60 - 30); camera.lookAt(r() * 20 - 10, 0, r() * 20 - 10); camera.updateMatrixWorld(true)
    for (const b of B.batches) { const mine = B.pieces.filter(p => p.batch === b).map(p => p.o)
      b.onBeforeRender(null, null, camera)
      const drew = b.drawnLast.map(o => o.name), want = threes(camera, mine)
      assert.deepEqual(drew, want, `view ${view}, ${b.name}: the pieces three would draw, in three's order`)
      if (drew.length < mine.length) culled++; orders.add(b.name + ':' + drew.join(' '))
      /* what the card is told to draw: each piece's own stretch of the batch's index buffer, and which piece each is */
      const range = {}
      b.drawnLast.forEach((o, i) => { const p = B.pieces.find(x => x.o === o); b.getGeometryRangeAt(b.getGeometryIdAt(p.id), range)
        assert.equal(b._multiDrawStarts[i], range.start * b.geometry.getIndex().array.BYTES_PER_ELEMENT); assert.equal(b._multiDrawCounts[i], range.count); assert.equal(b._indirectTexture.image.data[i], p.id) })
      assert.equal(b._multiDrawCount, drew.length) }
  }
  assert.ok(culled >= 5, 'views with a piece out of sight, not drawn: ' + culled); assert.ok(orders.size >= 30, 'the order follows the camera: ' + orders.size + ' different')
  /* two pieces at the same depth: the earlier made first, as three has it */
  const twin = new THREE.Group(), stone = new THREE.MeshStandardMaterial(), box = new THREE.BoxGeometry(1, 1, 1)
  for (let i = 0; i < 4; i++) { const o = new THREE.Mesh(box, stone); o.name = 'twin' + i; o.position.set(i % 2 ? 2 : -2, 0, 0); twin.add(o) }
  const T = solidBatches(twin), front = new THREE.PerspectiveCamera(30, 1, .5, 100); front.position.set(0, 0, 20); front.lookAt(0, 0, 0); front.updateMatrixWorld(true)
  T.batches[0].onBeforeRender(null, null, front)
  assert.deepEqual(T.batches[0].drawnLast.map(o => o.name), threes(front, twin.children.filter(o => !o.isBatchedMesh))); assert.deepEqual(T.batches[0].drawnLast.map(o => o.name).filter(n => n === 'twin0' || n === 'twin2'), ['twin0', 'twin2'])
  T.dispose()
  /* the shadow pass: the casters in the sun's sight, and no pebble (they cast none) */
  const rocks = B.batches[0]; rocks.onBeforeShadow(null, rocks, viewCamera(), sun)
  assert.deepEqual(rocks.drawnLast.map(o => o.name).sort(), ['rock0', 'rock1', 'rock2', 'rock3', 'rock4'], 'the rocks cast; the pebbles of the same batch do not')
  rocks.onBeforeRender(null, null, sun); assert.equal(rocks.drawnLast.length, 7, 'the view\'s pass draws them all')
  /* a piece out of the batch (faded see-through) is in neither */
  rocks.setVisibleAt(B.pieces.find(p => p.o === all.rock2).id, false); rocks.onBeforeRender(null, null, sun); assert.ok(!rocks.drawnLast.includes(all.rock2)); assert.equal(rocks.drawnLast.length, 6)
  rocks.onBeforeShadow(null, rocks, viewCamera(), sun); assert.ok(!rocks.drawnLast.includes(all.rock2)); assert.equal(rocks.drawnLast.length, 4)
  B.dispose()
})

/** three's shader text with its #include lines resolved */
const resolved = text => { for (let i = 0; i < 6 && /#include <\w+>/.test(text); i++) text = text.replace(/^[ \t]*#include <(\w+)>/gm, (_, name) => { assert.ok(name in THREE.ShaderChunk, name); return THREE.ShaderChunk[name] }); return text }
const squeezed = text => text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n')
/** a chunk of three's with a `#ifdef NAME … #endif` block (no nesting but one level) taken out */
const without = (chunk, name) => { const lines = chunk.split('\n'), out = []; let depth = 0
  for (const l of lines) { const t = l.trim(); if (depth) { if (/^#if/.test(t)) depth++; else if (/^#endif/.test(t)) depth--; continue } if (t === '#ifdef ' + name) { depth = 1; continue } out.push(l) } return out.join('\n') }

test('the shader reads the piece\'s own matrices where three\'s read the object\'s — and is three\'s own in everything else', () => {
  for (const lib of ['standard', 'physical', 'basic', 'lambert', 'phong', 'depth']) {
    const stock = THREE.ShaderLib[lib].vertexShader, exact = exactVertex(stock, { normals: lib !== 'depth' }), text = resolved(exact)
    assert.notEqual(exact, stock)
    assert.doesNotMatch(text, /\b(modelViewMatrix|normalMatrix|modelMatrix)\b/, lib + ': none of the object\'s own matrices is read any more')
    assert.match(text, /mvPosition = vec4\( dot\( vec4\( exactModelView\[ 0 \]\.x, exactModelView\[ 1 \]\.x, exactModelView\[ 2 \]\.x, exactModelView\[ 3 \]\.x \), mvPosition \), /); assert.match(text, /getIndirectIndex\( gl_DrawID \)/)
    /* the piece's matrices are read from three's own batchingTexture, a piece's twelve texels from where the piece is in it */
    assert.match(exact, /int exactAt = int\( getIndirectIndex\( gl_DrawID \) \) \* 12;/); assert.doesNotMatch(exact, /#include <batching_vertex>/); assert.match(exact, /#include <batching_pars_vertex>/)
    assert.equal(/exactNormal/.test(exact), lib !== 'depth', lib + ': the normal matrix is read where normals are')
    assert.doesNotMatch(exact, /uniform /, 'no uniform is added: three hands a batch its texture itself')
    /* everything else is three's: every line of it that is not the placing is a line of three's own text */
    const lines = new Set(stock.split('\n').map(l => l.trim()).filter(Boolean))
    const added = squeezed(exact).split('\n').filter(l => !lines.has(l))
    for (const l of added) assert.match(l, /exact|batchingMatrix|mvPosition|gl_Position|transformedNormal|transformedTangent|worldPosition|^#(ifdef|endif|if) |^#endif$|objectNormal|objectTangent/, lib + ': an added line that is not the placing: ' + l)
    const kept = stock.split('\n').map(l => l.trim()).filter(Boolean).filter(l => !squeezed(exact).split('\n').includes(l))
    assert.deepEqual(kept.sort(), ['#include <batching_vertex>', '#include <project_vertex>', ...(lib === 'depth' ? [] : ['#include <defaultnormal_vertex>', '#include <worldpos_vertex>'])].sort(), lib + ': of three\'s own lines only these are replaced')
  }
  /* the three chunks, against three's own: three's text with the batching and instancing branches taken out, the object's
     matrix renamed — and its `matrix * vector` spelt as one dot product a row (the matrix's row gathered from its columns):
     the same sum, and on the graphics card the same bits as the uniform's (written `matrix * vector` with a matrix read from
     a texture, the card adds the products up another way: found in real Chrome, solid-batches.js says) */
  const row = (m, i, n) => `vec${n}( ${Array.from({ length: n }, (_, c) => `${m}[ ${c} ].${i}`).join(', ')} )`
  const times = (m, v, n) => `vec${n}( ${['x', 'y', 'z', 'w'].slice(0, n).map(i => `dot( ${row(m, i, n)}, ${v} )`).join(', ')} )`
  assert.equal(times('M', 'v', 3), 'vec3( dot( vec3( M[ 0 ].x, M[ 1 ].x, M[ 2 ].x ), v ), dot( vec3( M[ 0 ].y, M[ 1 ].y, M[ 2 ].y ), v ), dot( vec3( M[ 0 ].z, M[ 1 ].z, M[ 2 ].z ), v ) )')
  const std = exactVertex(THREE.ShaderLib.standard.vertexShader)
  const project = squeezed(without(without(THREE.ShaderChunk.project_vertex, 'USE_BATCHING'), 'USE_INSTANCING')).replace('modelViewMatrix * mvPosition', times('exactModelView', 'mvPosition', 4))
  assert.doesNotMatch(project, /modelViewMatrix/); assert.ok(squeezed(std).includes(project), 'project_vertex: three\'s, with the piece\'s own model-view matrix')
  const normal = squeezed(without(without(THREE.ShaderChunk.defaultnormal_vertex, 'USE_BATCHING'), 'USE_INSTANCING')).replace('normalMatrix * transformedNormal', times('exactNormal', 'transformedNormal', 3)).replace('modelViewMatrix * vec4( transformedTangent, 0.0 )', times('exactModelView', 'vec4( transformedTangent, 0.0 )', 4))
  assert.doesNotMatch(normal, /normalMatrix|modelViewMatrix/); assert.ok(squeezed(std).includes(normal), 'defaultnormal_vertex: three\'s, with the piece\'s own normal matrix')
  const world = squeezed(without(THREE.ShaderChunk.worldpos_vertex, 'USE_INSTANCING')).replace('#ifdef USE_BATCHING\n', '').replace('worldPosition = batchingMatrix * worldPosition;\n#endif', 'worldPosition = ' + times('batchingMatrix', 'worldPosition', 4) + ';').replace('worldPosition = modelMatrix * worldPosition;\n', '')
  assert.doesNotMatch(world, /modelMatrix/); assert.ok(squeezed(std).includes(world), 'worldpos_vertex: three\'s, the piece\'s own world matrix alone')
  /* a shader that is not three's as expected is refused, never half-changed */
  assert.throws(() => exactVertex('void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }'), /vertex shader holds/)
})

test('a material whose own hook rewrites the vertex shader is left out of every batch; one that tones the colour (the scene\'s ground look) is batched, hook and all', () => {
  const plain = new THREE.MeshStandardMaterial(); assert.equal(hookKeepsVertex(plain), true)
  const toned = new THREE.MeshStandardMaterial(); toned.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', '#include <tonemapping_fragment>\n gl_FragColor.rgb *= .9;') }; toned.customProgramCacheKey = () => 'tone'
  assert.equal(hookKeepsVertex(toned), true)
  const waving = new THREE.MeshStandardMaterial(); waving.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += 1.;') }
  assert.equal(hookKeepsVertex(waving), false)
  const asks = new THREE.MeshStandardMaterial(); asks.onBeforeCompile = shader => { shader.fragmentShader = 'uniform mat4 modelMatrix;\n' + shader.fragmentShader }
  assert.equal(hookKeepsVertex(asks), false, 'a fragment shader that asks for the object\'s own matrix')
  const breaks = new THREE.MeshStandardMaterial(); breaks.onBeforeCompile = () => { throw new Error('no') }; assert.equal(hookKeepsVertex(breaks), false)
  assert.equal(hookKeepsVertex(new THREE.ShaderMaterial()), false)
  const top = new THREE.Group(); for (const m of [toned, waving]) for (let i = 0; i < 3; i++) { const o = new THREE.Mesh(new THREE.BoxGeometry(), m); o.position.x = i; top.add(o) }
  const B = solidBatches(top); assert.equal(B.batches.length, 1); assert.equal(B.pieces.length, 3); assert.ok(B.pieces.every(p => p.o.material === toned))
  /* the batch's shader: the material's own hook first, then the placing; its program is its own */
  const b = B.batches[0], lib = THREE.ShaderLib.standard, shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader }
  b.material.onBeforeCompile(shader, null)
  assert.match(shader.fragmentShader, /gl_FragColor\.rgb \*= \.9;/, 'the tone is kept'); assert.match(shader.vertexShader, /exactModelView/)
  assert.deepEqual(Object.keys(shader.uniforms), [], 'no uniform of the batch\'s: three hands a batch its texture itself')
  assert.equal(b.material.customProgramCacheKey(), 'tone|solid-batch'); assert.notEqual(b.material.customProgramCacheKey(), toned.customProgramCacheKey())
  const depth = { uniforms: {}, vertexShader: THREE.ShaderLib.depth.vertexShader, fragmentShader: THREE.ShaderLib.depth.fragmentShader }
  b.customDepthMaterial.onBeforeCompile(depth, null); assert.match(depth.vertexShader, /exactModelView/); assert.deepEqual(Object.keys(depth.uniforms), []); assert.doesNotMatch(depth.vertexShader, /exactNormal/)
  assert.equal(b.customDepthMaterial.customProgramCacheKey(), 'solid-batch-depth')
  B.dispose()
})

test('a piece the see-through rule fades leaves its batch and is drawn by itself; solid again, it returns — every other piece stays in', () => {
  const { top, all } = made(), B = solidBatches(top), faded = new Map()
  const piece = o => B.pieces.find(p => p.o === o)
  assert.equal(B.sync(faded), false); assert.equal(B.out, 0)
  faded.set(all.wall1, all.wall1.material); faded.set(all.leaf0, all.leaf0.material)     // a wall, and a leaf that is in no batch
  assert.equal(B.sync(faded), true); assert.equal(B.out, 1)
  assert.equal(piece(all.wall1).batch.getVisibleAt(piece(all.wall1).id), false, 'the faded wall is out of its batch'); assert.ok(onLayer(all.wall1, 0), 'and drawn by itself')
  for (const p of B.pieces) if (p.o !== all.wall1) { assert.equal(p.batch.getVisibleAt(p.id), true, p.o.name + ' stays in'); assert.ok(onLayer(p.o, PIECE_LAYER)) }
  assert.equal(B.sync(faded), false, 'asked again: nothing to change')
  faded.delete(all.wall1); faded.set(all.rock3, all.rock3.material)
  assert.equal(B.sync(faded), true); assert.equal(B.out, 1)
  assert.equal(piece(all.wall1).batch.getVisibleAt(piece(all.wall1).id), true, 'solid again: back in its batch'); assert.ok(onLayer(all.wall1, PIECE_LAYER))
  assert.equal(piece(all.rock3).batch.getVisibleAt(piece(all.rock3).id), false)
  /* asked whole: every piece by itself and no batch, as first written — and back */
  B.whole = true
  for (const b of B.batches) assert.equal(b.visible, false); for (const p of B.pieces) assert.ok(onLayer(p.o, 0), p.o.name + ' drawn by itself')
  B.whole = false
  for (const b of B.batches) assert.equal(b.visible, true); for (const p of B.pieces) assert.ok(onLayer(p.o, p.o === all.rock3 ? 0 : PIECE_LAYER))
  /* put away: the scene is as it was built */
  const batches = [...B.batches]; B.dispose()
  for (const b of batches) assert.equal(b.parent, null); top.traverse(o => { if (o.isMesh) assert.ok(onLayer(o, 0), o.name + ' on its own layer again') })
  let left = 0; top.traverse(o => { if (o.isBatchedMesh) left++ }); assert.equal(left, 0)
})

/* ── the driver ── */
async function driven({ batches } = {}) {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
  Object.defineProperty(wrap, 'clientWidth', { value: 1448, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 716, configurable: true })
  const log = []
  const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true }
  /** what a pass of this camera draws: every shown mesh on a layer the camera sees (three's own rule) */
  const drawnBy = (scene, camera) => { const out = []; scene.traverse(o => { if (o.isMesh && shown(o) && o.layers.test(camera.layers)) out.push(o.isBatchedMesh ? o.name + ' x' + o.instanceCount : o.name) }); return out.sort() }
  class Renderer { constructor(o) { this.shadowMap = {}; this.canvas = o.canvas; this.domElement = o.canvas } setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render(scene, camera) { log.push({ pass: 'scene', drawn: drawnBy(scene, camera) }) } }
  class BodyRenderer extends Renderer { clear() {} setClearColor() {} render(scene, camera) { log.push({ pass: scene.overrideMaterial ? 'depth' : 'bodies', drawn: drawnBy(scene, camera) }) } }
  const group = new THREE.Group(), stone = new THREE.MeshStandardMaterial({ name: 'stone' }), wood = new THREE.MeshStandardMaterial({ name: 'wood' }), leaf = new THREE.MeshStandardMaterial({ name: 'leaf', transparent: true })
  const mesh = (name, geometry, material, x, y, z) => { const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m }
  /* where the driver's own first camera stands (a board that has not framed itself: the starting angled view at its middle) and
     the place on the ground it looks at: two bodies stand there, a wall in two lengths between them and the camera (it hides
     them), a third length of the same wall behind them (it hides nothing), a low length of it at their feet (below the waist:
     no wall to the see-through rule, and it can hide a shin), two far crates, a lone post, a leaf */
  const affine = A.paintedToCSS(b), eye = A.orbitCamera(affine, { x: field.w / 2, y: field.h / 2, yaw: 0, tilt: field.tilt, zoom: 1 }, { w: 1448, h: 716 }).position.clone()
  const at = new THREE.Vector3(field.w / 2, field.h / 2, 0).applyMatrix4(affine.clone().invert()), toEye = eye.clone().sub(at).normalize()
  const side = new THREE.Vector3(toEye.z, 0, -toEye.x).normalize()
  const length = new THREE.BoxGeometry(8, 8, .3)
  const facing = (name, along) => { const p = at.clone().addScaledVector(toEye, along).add(new THREE.Vector3(0, 1, 0)), m = mesh(name, length, stone, p.x, p.y, p.z); m.lookAt(eye); return m }
  const walls = [facing('wall-a', 6), facing('wall-b', 7), facing('wall-c', -12)]
  const flat = new THREE.Vector3(toEye.x, 0, toEye.z).normalize(), foot = at.clone().addScaledVector(flat, 1.5)
  const low = mesh('wall-d', new THREE.BoxGeometry(8, .6, .3), stone, foot.x, foot.y + .3, foot.z); low.rotation.y = Math.atan2(flat.x, flat.z)
  const far = (name, geometry, material, across, back) => { const p = at.clone().addScaledVector(side, across).addScaledVector(toEye, back); return mesh(name, geometry, material, p.x, p.y + .5, p.z) }
  far('crate-a', new THREE.BoxGeometry(1, 1, 1), wood, 30, -25); far('crate-b', new THREE.BoxGeometry(1, 1, 1), wood, 34, -25)
  far('post', new THREE.BoxGeometry(.2, 2, .2), new THREE.MeshStandardMaterial({ name: 'post' }), -30, -25); far('leaf', new THREE.PlaneGeometry(1, 1), leaf, 20, -20)
  const bodies = [{ life: 'standing', at: at.clone().addScaledVector(side, .8), h: 1.7 }, { life: 'standing', at: at.clone().addScaledVector(side, -.8), h: 1.5 }]
  const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; for (const B of bodies) { const m = new THREE.Mesh(new THREE.BoxGeometry(.9, B.h, .6), new THREE.MeshStandardMaterial()); m.name = 'body'; m.position.set(B.at.x, B.at.y + B.h / 2, B.at.z); g.add(m) } scene.add(g)
    return { size: bodies.length, frame() {}, dispose() {}, body: () => null,
      aims() { const out = []; for (const B of bodies) { if (B.life !== 'standing') continue; out.push({ feet: B.at.y, at: new THREE.Vector3(B.at.x, B.at.y + B.h * .55, B.at.z) }, { feet: B.at.y, at: new THREE.Vector3(B.at.x, B.at.y + B.h * .9, B.at.z) }) } return out } } }
  const V = { look: standOut(['shadows']), dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: {}, subjectId: null, activeId: null }, view: { inspectId: null } }
  let now = 1000
  const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async () => ({ group, dispose() {} }), createCast, now: () => now, ...(batches === undefined ? {} : { batches }) })
  await driver.ready
  const frame = (ms = 130) => { now += ms; const f = frames.pop(); frames.length = 0; f(now); return log.splice(0) }
  return { V, driver, frame, first: log.splice(0), group, walls, bodies }
}
const pass = (f, name) => f.filter(e => e.pass === name).at(-1)?.drawn

test('the driver builds the batches when the scene loads — where the browser draws many in one call; a stand-in renderer is given none unless it asks', async () => {
  const none = await driven()
  assert.equal(none.V.solidBatches, null, 'a renderer that is not the browser\'s: every piece by itself, as before')
  let n = 0; none.group.traverse(o => { if (o.isBatchedMesh) n++ }); assert.equal(n, 0)
  none.driver.dispose()
  const { V, driver, group } = await driven({ batches: true })
  assert.ok(V.solidBatches, 'the page says how the solid pieces are drawn')
  assert.equal(V.solidBatches.batches, 2, 'the stone walls and the wooden crates: two batches'); assert.equal(V.solidBatches.pieces, 6); assert.equal(V.solidBatches.solid, 7, 'of the scene\'s seven solid pieces (the post is the only one of its material)')
  assert.equal(typeof V.solidBatches.ms, 'number'); assert.equal(V.solidBatches.whole, false)
  /* a batch is no piece of the see-through rule's and none of the bodies' depth */
  assert.ok(V.seeThrough.pieces().every(p => !p.o.isBatchedMesh), 'the see-through rule\'s pieces are the pieces themselves')
  assert.equal(V.seeThrough.pieces().length, 8, 'all eight of them (a leaf is a wall to it)')
  driver.dispose(); assert.equal(V.solidBatches, null)
  n = 0; group.traverse(o => { if (o.isBatchedMesh) n++; else if (o.isMesh) assert.ok(onLayer(o, 0)) }); assert.equal(n, 0, 'put away with the scene')
})

test('what each pass draws: the scene\'s pass the batches and what is in none; a faded piece by itself, out of its batch; the bodies\' depth the pieces themselves, never a batch', async () => {
  const { V, frame, first, walls } = await driven({ batches: true })
  const f = [...first, ...frame(130)]
  /* the walls in front of the bodies are faded by the see-through rule: each is out of its batch and drawn by itself */
  const faded = walls.filter(o => V.seeThrough.faded.has(o)), solid = walls.filter(o => !V.seeThrough.faded.has(o))
  assert.ok(faded.length >= 1 && solid.length >= 1, `a wall in front of the bodies is see-through (${faded.map(o => o.name)}), one behind them is not (${solid.map(o => o.name)})`)
  assert.equal(V.solidBatches.out, faded.length)
  const scene = pass(f, 'scene')
  for (const o of faded) { assert.ok(scene.includes(o.name), o.name + ' is drawn by itself while it is faded'); assert.equal(o.material.transparent, true) }
  for (const o of solid) assert.ok(!scene.includes(o.name), o.name + ' is drawn by its batch alone')
  assert.ok(scene.includes('solid-batch:stone x4') && scene.includes('solid-batch:wood x2'), 'the batches are drawn: ' + scene)
  assert.ok(!scene.includes('wall-d'), 'the low wall by its batch alone')
  assert.ok(!scene.includes('crate-a') && !scene.includes('crate-b')); assert.ok(scene.includes('post') && scene.includes('leaf'), 'what is in no batch is drawn as it was')
  /* the bodies' own canvas: its depth from the pieces themselves (those that can hide a body, never a faded one, never a batch); then the bodies alone */
  const depth = pass(f, 'depth'), bodies = pass(f, 'bodies')
  assert.ok(depth.every(n => !n.startsWith('solid-batch')), 'no batch in the depth pass: ' + depth)
  for (const o of faded) assert.ok(!depth.includes(o.name), 'a see-through piece hides nothing')
  assert.ok(depth.includes('wall-d') && depth.every(n => /^(wall|crate|post)/.test(n)), 'the solid pieces that can hide a body — the low wall at their feet among them — each by itself: ' + depth)
  assert.ok(!depth.includes('crate-a') && !depth.includes('post'), 'and not what stands far to the side')
  assert.deepEqual(bodies, ['body', 'body'], 'then the bodies alone')
  /* asked for the depth whole: every solid piece by itself, as first written — still no batch */
  V.bodiesDepth.whole = true; const g = frame(0), all = pass(g, 'depth')
  assert.deepEqual(all, ['crate-a', 'crate-b', 'post', 'wall-d', ...solid.map(o => o.name)].sort(), 'every solid piece, by itself'); V.bodiesDepth.whole = false; frame(0)
  /* asked for the pieces whole: no batch anywhere, every piece by itself in the scene's pass */
  V.solidBatches.whole = true; const h = frame(0), each = pass(h, 'scene')
  assert.ok(each && each.every(n => !n.startsWith('solid-batch')), 'asked whole, the frame is drawn again at once with no batch: ' + each)
  for (const n of ['wall-a', 'wall-b', 'wall-c', 'wall-d', 'crate-a', 'crate-b', 'post', 'leaf']) assert.ok(each.includes(n), n + ' by itself')
  V.solidBatches.whole = false; const back = pass(frame(0), 'scene'); assert.ok(back.includes('solid-batch:wood x2') && !back.includes('crate-a'))
  /* a still frame draws nothing, batches or no */
  assert.deepEqual(frame(0), [], 'nothing changed: nothing drawn')
})
