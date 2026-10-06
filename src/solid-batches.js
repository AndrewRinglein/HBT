import * as THREE from 'three'
/* viewer.solid-pieces-drawn-by-material (2026-10-05; split out of viewer.scene-drawn-in-few-calls by the home chat; engine
   DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the speed first; …'). A painted scene is a thousand and more
   pieces, each drawn in a call of its own, though it is made of few materials and few shapes used many times (the Orphanage:
   800 solid pieces in two dozen materials). Here the scene's SOLID pieces — in the opaque pass: not blended — that share a
   material are drawn together: one batch a material (three's BatchedMesh: one call where the browser has multi-draw), each
   piece an instance of it. The blended pieces — the foliage — are not touched: how they may change is Andrew's to rule
   (viewer SWITCHES fewCallsFoliage).

   THE PICTURE IS THE SAME PIXELS, and three's own batching would not keep it, for two reasons found by drawing both ways in
   real Chrome and comparing (tools/frame-cost.mjs):
     · WHERE a piece is. three's batch places each instance on the graphics card (the camera's matrix times the piece's, in
       single precision, and a normal matrix worked out there); a piece drawn by itself is placed by matrices three works out
       in double precision and hands over rounded. The last bit differs, and with it an edge pixel here and a shade there. So a
       batch here hands the card, for every piece, the very numbers three hands it for that piece drawn alone — its model-view
       matrix and its normal matrix for the camera a pass is drawn from (the view's, or the sun's for the shadow), worked out
       by the same two calls, and its world matrix — in the batch's own texture, and the shader reads them where three's
       shader read the object's three uniforms. The same sums on the same numbers.
     · WHICH piece is drawn last. Where two pieces cross or lie on one another, their depths are the same to the last bit the
       depth buffer keeps, and the one drawn later shows (three's depth test passes on equal). three draws its solid pieces
       material by material, and within a material the nearest first (by where the middle of each piece's shape lies in the
       view), then by the order they were made. A batch here draws its pieces in exactly that order, worked out again when
       the camera moves, and carries its material's own number, so it takes its material's place among the others; pieces
       that cast no shadow share their material's batch (the shadow pass is handed the casters alone) so that nothing of a
       material is drawn out of turn.
   The frame-cost tool draws every view both ways — V.solidBatches.whole asks for each piece by itself, as first written —
   and compares every pixel.

   A piece the see-through rule fades leaves its batch for as long as it is faded and is drawn by itself, as it always was
   (sync). A piece three would not draw because it is out of the camera's sight is not drawn from its batch either (the same
   test). What a batch cannot hold exactly is left out of it and drawn as before: a piece with several materials, a shape
   that morphs, a material that is not one of three's own lit ones or whose own shader hook rewrites the vertex shader, an
   instanced part; and pieces of one material that differ in what a batch has one of (the shape's attributes, taking shadow,
   being mirrored) are batched apart. Pure scene work: no page, no board. */

/** the layer a batched piece's own mesh waits on: no pass of the view's camera draws it there, and it is still a visible
    piece of the scene to everything that asks (the see-through check, the bodies' depth) */
export const PIECE_LAYER = 13
/** texels of a batch's texture for each piece: its model-view matrix (4), its normal matrix (3 and one unused), its world matrix (4) */
export const PIECE_TEXELS = 12

const _mv = new THREE.Matrix4(), _n = new THREE.Matrix3(), _proj = new THREE.Matrix4(), _frustum = new THREE.Frustum(), _order = []
const plainHook = THREE.Object3D.prototype.onBeforeRender, plainAfter = THREE.Object3D.prototype.onAfterRender
const plainShadow = THREE.Object3D.prototype.onBeforeShadow, plainShadowAfter = THREE.Object3D.prototype.onAfterShadow
const libOf = m => m.isMeshPhysicalMaterial ? 'physical' : m.isMeshStandardMaterial ? 'standard' : m.isMeshBasicMaterial ? 'basic' : m.isMeshLambertMaterial ? 'lambert' : m.isMeshPhongMaterial ? 'phong' : null

/* ── the shader: the piece's own matrices, read where the object's uniforms were ── */
const texel = n => `texelFetch( batchingTexture, exactTexel${n ? ` + ivec2( ${n}, 0 )` : ''}, 0 )`
/* in place of three's batching_vertex (which reads one matrix a piece): the piece's place in the batch's texture and its matrices */
const READ = `
	int exactAt = int( getIndirectIndex( gl_DrawID ) ) * ${PIECE_TEXELS};
	int exactWide = textureSize( batchingTexture, 0 ).x;
	ivec2 exactTexel = ivec2( exactAt % exactWide, exactAt / exactWide );
	mat4 exactModelView = mat4( ${texel(0)}, ${texel(1)}, ${texel(2)}, ${texel(3)} );
	mat4 batchingMatrix = mat4( ${texel(8)}, ${texel(9)}, ${texel(10)}, ${texel(11)} );`
const READ_NORMAL = `
	mat3 exactNormal = mat3( ${texel(4)}.xyz, ${texel(5)}.xyz, ${texel(6)}.xyz );`
/* MATRIX TIMES VECTOR, SPELT ROW BY ROW. The same numbers are not yet the same sums: written `matrix * vector`, the browser's
   shader compiler adds the four products up one way when the matrix is a uniform (three's shader for a piece drawn alone) and
   another when it was just read from a texture (a batch) — the last bit of a vertex's place differs for some vertices, and
   in a view of the Orphanage half a dozen pixels with it (a blade of wheat's edge by 16 shades of 255; measured in real
   Chrome on this machine's card, 2026-10-05: six spellings tried, each against the pieces drawn alone). Spelt as one dot
   product a row — the matrix's row gathered from its columns — the batch's sums come out as the uniform's do. */
const row = (m, i, n) => `vec${n}( ${Array.from({ length: n }, (_, c) => `${m}[ ${c} ].${i}`).join(', ')} )`
const times = (m, v, n) => `vec${n}( ${['x', 'y', 'z', 'w'].slice(0, n).map(i => `dot( ${row(m, i, n)}, ${v} )`).join(', ')} )`
/* three's project_vertex, defaultnormal_vertex and worldpos_vertex with the piece's own matrices where the object's uniforms
   stood (modelViewMatrix, normalMatrix, modelMatrix) and nothing else changed */
const PROJECT = `
vec4 mvPosition = vec4( transformed, 1.0 );
mvPosition = ${times('exactModelView', 'mvPosition', 4)};
gl_Position = projectionMatrix * mvPosition;`
const NORMAL = `
vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
transformedNormal = ${times('exactNormal', 'transformedNormal', 3)};
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( ${times('exactModelView', 'vec4( transformedTangent, 0.0 )', 4)} ).xyz;
#endif`
const WORLD = `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	worldPosition = ${times('batchingMatrix', 'worldPosition', 4)};
#endif`
const once = (text, find, put, need = true) => { const n = text.split(find).length - 1
  if (n > 1 || (need && n !== 1)) throw new Error('solid batches: the vertex shader holds ' + find + ' ' + n + ' times'); return n ? text.replace(find, () => put) : text }
/** a vertex shader of three's (its #include lines unresolved) made to place each instance by its own matrices */
export function exactVertex(vertexShader, { normals = true } = {}) {
  let v = vertexShader
  if (!v.includes('#include <batching_pars_vertex>')) throw new Error('solid batches: the vertex shader holds #include <batching_pars_vertex> 0 times')
  v = once(v, '#include <batching_vertex>', READ + (normals ? READ_NORMAL : ''))
  v = once(v, '#include <project_vertex>', PROJECT)
  v = once(v, '#include <defaultnormal_vertex>', NORMAL, false)
  v = once(v, '#include <worldpos_vertex>', WORLD, false)
  return v
}
/** does this material's own shader hook leave the vertex shader as three wrote it, and ask the fragment shader for nothing
    of the object's? (then a batch can stand in for it exactly) */
export function hookKeepsVertex(m) {
  const lib = THREE.ShaderLib[libOf(m)]; if (!lib) return false
  if (m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile) return true
  const shader = { name: '', defines: {}, uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader }
  try { m.onBeforeCompile(shader, null) } catch { return false }
  return shader.vertexShader === lib.vertexShader && !/\b(modelMatrix|modelViewMatrix|normalMatrix)\b/.test(shader.fragmentShader)
}

/* ── which pieces ── */
/** may this piece be drawn from a batch with the same pixels? (`top`: the group the scene's pieces hang from) */
export function batchable(o, top) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh) return false
  const m = o.material, g = o.geometry
  if (!m || Array.isArray(m) || !libOf(m)) return false
  /* the opaque pass only: nothing blended, nothing whose look needs the object's own matrices in the fragment shader */
  if (m.transparent || m.visible === false || (m.blending != null && m.blending !== THREE.NormalBlending) || m.wireframe || m.transmission > 0 || m.displacementMap
    || m.normalMapType === THREE.ObjectSpaceNormalMap || m.alphaToCoverage || m.alphaHash || (m.clippingPlanes && m.clippingPlanes.length)) return false
  if (!g || !g.isBufferGeometry || !g.attributes.position) return false
  for (const k in g.morphAttributes) if (g.morphAttributes[k]?.length) return false
  if (g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false
  if (o.onBeforeRender !== plainHook || o.onAfterRender !== plainAfter || o.onBeforeShadow !== plainShadow || o.onAfterShadow !== plainShadowAfter) return false
  if (o.customDepthMaterial !== undefined || o.customDistanceMaterial !== undefined) return false
  if (o.layers.mask !== 1 || !o.frustumCulled) return false
  for (let n = o; n; n = n.parent) { if (!n.visible) return false; if (n === top) break }
  return true
}
const kindOf = a => (a.isInterleavedBufferAttribute ? a.data.array : a.array).constructor.name + ':' + a.itemSize + ':' + (a.normalized ? 'n' : '')
/** what must be the same for two pieces to share a batch: the material; the shape's attributes (a batch has one set); whether
    they take shadow; where they come in the order of drawing; whether they are mirrored (the winding of a batch is one).
    Not whether they cast shadow: a batch hands the shadow pass its casters alone. */
export function batchKey(o) {
  const g = o.geometry
  return [o.material.uuid, g.index ? 'i' : '-', Object.keys(g.attributes).sort().map(k => k + '=' + kindOf(g.attributes[k])).join(','),
    o.receiveShadow ? 'r' : '-', o.renderOrder, o.matrixWorld.determinant() < 0 ? 'm' : '-'].join('|')
}
/** a shape whose attributes share one interleaved array, as its own plain arrays (the same numbers): a batch copies plain ones */
function plainGeometry(g) {
  if (!Object.values(g.attributes).some(a => a.isInterleavedBufferAttribute)) return g
  const c = new THREE.BufferGeometry(); c.setIndex(g.index)
  for (const [name, a] of Object.entries(g.attributes)) {
    if (!a.isInterleavedBufferAttribute) { c.setAttribute(name, a); continue }
    const src = a.data.array, stride = a.data.stride, at = a.offset, out = new src.constructor(a.count * a.itemSize)
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = src[i * stride + at + k]
    c.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize, a.normalized))
  }
  c.boundingBox = g.boundingBox; c.boundingSphere = g.boundingSphere
  return c
}

/* ── a batch ── */
/** three's BatchedMesh, each instance placed by the matrices three would hand its piece drawn alone, and drawn in three's order */
export class ExactBatch extends THREE.BatchedMesh {
  constructor(count, vertices, indices, material) {
    super(count, vertices, indices, material)
    this.perObjectFrustumCulled = false; this.sortObjects = false; this.frustumCulled = false
    /* the batch's texture, laid out here: PIECE_TEXELS a piece, a row a whole number of pieces wide (three hands it to the
       shader as batchingTexture for every batch it draws — nothing of the material's) */
    const wide = Math.max(1, Math.ceil(Math.sqrt(count * PIECE_TEXELS) / PIECE_TEXELS)) * PIECE_TEXELS, high = Math.max(1, Math.ceil(count * PIECE_TEXELS / wide))
    this._matricesTexture.dispose()
    this._matricesTexture = new THREE.DataTexture(new Float32Array(wide * high * 4), wide, high, THREE.RGBAFormat, THREE.FloatType)
    /** each instance's piece: { id, o, world, centre, sphere, cast, start, count, drawn, z } */
    this.slots = []
    /* what the list was last worked out for: the camera's two matrices, the pass, and how often the batch had changed */
    this.changes = 0; this.listed = new Float64Array(34).fill(NaN); this.fills = 0; this.lists = 0
  }
  /** every piece of the batch, each with its shape's id in it: `pieces` [{ o, shape }] */
  hold(pieces) {
    const index = this.geometry.getIndex(), bytes = index ? index.array.BYTES_PER_ELEMENT : 1, range = {}
    for (const p of pieces) this.addInstance(p.shape)                      // (three writes a matrix of its own for each: every one first)
    const data = this._matricesTexture.image.data; data.fill(0)
    pieces.forEach((p, id) => { const o = p.o, g = o.geometry
      if (g.boundingSphere === null) g.computeBoundingSphere()
      this.getGeometryRangeAt(p.shape, range)
      /* where three reads a mesh's place in the order of drawing from: the middle of its shape's sphere, in the world */
      const centre = new THREE.Vector4().copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld)
      this.slots[id] = { id, o, world: o.matrixWorld, centre, sphere: g.boundingSphere.clone().applyMatrix4(o.matrixWorld), cast: !!o.castShadow, start: range.start * bytes, count: range.count, drawn: true, z: 0 }
      o.matrixWorld.toArray(data, id * PIECE_TEXELS * 4 + 32) })
    this._matricesTexture.needsUpdate = true; this.changes++
    return this
  }
  /* (three's own readers of a piece's matrix and of whether it is drawn, on this layout) */
  setMatrixAt(id, matrix) { const s = this.slots[id]; if (!s) return this; matrix.toArray(this._matricesTexture.image.data, id * PIECE_TEXELS * 4 + 32); this._matricesTexture.needsUpdate = true; this.changes++; return this }
  getMatrixAt(id, matrix) { return matrix.fromArray(this._matricesTexture.image.data, id * PIECE_TEXELS * 4 + 32) }
  setVisibleAt(id, visible) { const s = this.slots[id]; if (s && s.drawn !== !!visible) { s.drawn = !!visible; this.changes++ } return this }
  getVisibleAt(id) { return !!this.slots[id]?.drawn }
  /** before the view's pass: the pieces in sight, in three's order, each with its matrices for this camera */
  onBeforeRender(renderer, scene, camera) { this.list(camera, false) }
  /** before the shadow's pass (three hands the sun's camera): the pieces that cast, with their matrices for that camera */
  onBeforeShadow(renderer, object, camera, shadowCamera) { this.list(shadowCamera, true) }
  /**
   * What a pass of this camera draws from the batch, and with what: the pieces three would draw were each by itself — those
   * still in the batch whose shape's sphere meets the camera's sight (Frustum.intersectsObject's own test) and, for the
   * shadow, that cast — in the order three draws solid pieces of one material (WebGLRenderLists painterSortStable: the nearer
   * first by the clip depth of the middle of each one's sphere, then the earlier made); and for each its model-view and
   * normal matrix as WebGLRenderer.renderObject works them out for an object drawn alone. Worked out again only when the
   * camera, the pass or what is in the batch has changed.
   */
  list(camera, shadow) {
    const v = camera.matrixWorldInverse.elements, q = camera.projectionMatrix.elements, was = this.listed
    let same = was[32] === (shadow ? 1 : 0) && was[33] === this.changes
    for (let i = 0; same && i < 16; i++) if (was[i] !== v[i] || was[16 + i] !== q[i]) same = false
    if (same) return false
    was.set(v); was.set(q, 16); was[32] = shadow ? 1 : 0; was[33] = this.changes
    _proj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_proj, camera.coordinateSystem, camera.reversedDepth)
    const p = _proj.elements; _order.length = 0
    for (const s of this.slots) { if (!s || !s.drawn || (shadow && !s.cast) || !_frustum.intersectsSphere(s.sphere)) continue
      const c = s.centre; s.z = p[2] * c.x + p[6] * c.y + p[10] * c.z + p[14] * c.w; _order.push(s) }
    if (!shadow) _order.sort((a, b) => a.z !== b.z ? a.z - b.z : a.o.id - b.o.id)
    const starts = this._multiDrawStarts, counts = this._multiDrawCounts, indirect = this._indirectTexture.image.data, data = this._matricesTexture.image.data
    for (let i = 0; i < _order.length; i++) { const s = _order[i], at = s.id * PIECE_TEXELS * 4
      starts[i] = s.start; counts[i] = s.count; indirect[i] = s.id
      _mv.multiplyMatrices(camera.matrixWorldInverse, s.world); _mv.toArray(data, at)
      _n.getNormalMatrix(_mv); const n = _n.elements
      data[at + 16] = n[0]; data[at + 17] = n[1]; data[at + 18] = n[2]
      data[at + 20] = n[3]; data[at + 21] = n[4]; data[at + 22] = n[5]
      data[at + 24] = n[6]; data[at + 25] = n[7]; data[at + 26] = n[8] }
    this._multiDrawCount = _order.length; this._visibilityChanged = false
    this._indirectTexture.needsUpdate = true; this._matricesTexture.needsUpdate = true
    this.lists++; this.fills += _order.length; _order.length = 0
    return true
  }
  /** the pieces the last pass drew from the batch, in the order it drew them (read by the tests) */
  get drawnLast() { return Array.from(this._indirectTexture.image.data.slice(0, this._multiDrawCount), id => this.slots[id].o) }
  raycast() {}
}

/**
 * The scene's solid pieces gathered into batches, one a material (and whatever else must match: batchKey).
 * `group`: what the scene's pieces hang from (the batches are added to it). Returns the keeper of them:
 *   batches   the batches, in the order of their materials
 *   pieces    every batched piece: { o, batch, id, out }
 *   solid     how many pieces of the scene are drawn in the opaque pass at all (the batched and the left out)
 *   sync(faded)  a piece the see-through rule has faded leaves its batch and is drawn by itself; one no longer faded returns
 *   inStep(faded)  is every piece exactly where the fade puts it?
 *   whole     asked for WHOLE (false by default): every piece drawn by itself and no batch, as first written
 *   out       how many pieces are out of their batches now
 */
export function solidBatches(group, { now = () => 0 } = {}) {
  const t0 = now()
  group.updateMatrixWorld(true)
  const groups = new Map(), exact = new Map()
  let solid = 0
  group.traverse(o => {
    if (o.isMesh && !o.isBatchedMesh && [].concat(o.material).some(m => m && !m.transparent)) solid++
    if (!batchable(o, group)) return
    const m = o.material; if (!exact.has(m)) exact.set(m, hookKeepsVertex(m)); if (!exact.get(m)) return
    const key = batchKey(o); let g = groups.get(key); if (!g) groups.set(key, g = []); g.push(o)
  })
  const batches = [], pieces = []
  const order = [...groups.values()].filter(list => list.length > 1).sort((a, b) => a[0].material.id - b[0].material.id || a[0].id - b[0].id)
  for (const list of order) {
    const m = list[0].material, shapes = new Map()
    let vertices = 0, indices = 0
    for (const o of list) if (!shapes.has(o.geometry)) { shapes.set(o.geometry, -1); vertices += o.geometry.attributes.position.count; indices += o.geometry.index ? o.geometry.index.count : 0 }
    /* the batch's material IS the pieces' — the same object behind it, so the same look whatever is later set on it, and the
       same number (three draws its solid pieces in the order of their materials' numbers: a batch takes its material's place)
       — with a shader hook of its own before it: the material's own hook first, then the placing */
    const material = Object.create(m), hook = m.onBeforeCompile, keyOf = m.customProgramCacheKey
    material._listeners = undefined
    material.onBeforeCompile = (shader, renderer) => { hook.call(m, shader, renderer); shader.vertexShader = exactVertex(shader.vertexShader) }
    material.customProgramCacheKey = () => keyOf.call(m) + '|solid-batch'
    const batch = new ExactBatch(list.length, vertices, Math.max(indices, 1), material)
    /* the shadow pass draws depth alone: three's own depth material, placed the same way (three sets its side, map and
       alpha test from the batch's material at every pass, as it does its own) */
    const depth = new THREE.MeshDepthMaterial()
    depth.onBeforeCompile = shader => { shader.vertexShader = exactVertex(shader.vertexShader, { normals: false }) }
    depth.customProgramCacheKey = () => 'solid-batch-depth'
    batch.customDepthMaterial = depth
    batch.name = 'solid-batch:' + (m.name || m.uuid); batch.userData.solidBatch = true
    /* it casts if any piece of it does (the shadow pass is handed those alone) */
    batch.castShadow = list.some(o => o.castShadow); batch.receiveShadow = list[0].receiveShadow; batch.renderOrder = list[0].renderOrder
    /* a batch of mirrored pieces is itself mirrored: three takes a mesh's winding from its own matrix (the shader reads none of it) */
    if (list[0].matrixWorld.determinant() < 0) batch.scale.x = -1
    for (const g of shapes.keys()) shapes.set(g, batch.addGeometry(plainGeometry(g)))
    batch.hold(list.map(o => ({ o, shape: shapes.get(o.geometry) })))
    list.forEach((o, id) => { pieces.push({ o, batch, id, out: false }); o.layers.set(PIECE_LAYER) })
    group.add(batch); batch.updateMatrixWorld(true)
    batches.push(batch)
  }
  let whole = false, out = 0, disposed = false
  const put = p => { p.o.layers.set(whole || p.out ? 0 : PIECE_LAYER) }
  const api = {
    batches, pieces, solid, ms: now() - t0,
    get out() { return out },
    sync(faded) {
      let changed = false
      for (const p of pieces) { const is = faded.has(p.o); if (is === p.out) continue
        p.out = is; out += is ? 1 : -1; p.batch.setVisibleAt(p.id, !is); put(p); changed = true }
      return changed
    },
    /** is every batched piece where it should be: out of its batch and on the view's layer if faded (or all asked whole), else in its batch and waiting */
    inStep(faded) { for (const p of pieces) { const is = faded.has(p.o); if (p.out !== is || p.batch.getVisibleAt(p.id) !== !is || p.o.layers.mask !== ((whole || is) ? 1 : (1 << PIECE_LAYER) >>> 0)) return false } return true },
    get whole() { return whole },
    set whole(v) { v = !!v; if (v === whole) return; whole = v; for (const b of batches) b.visible = !v; for (const p of pieces) put(p) },
    dispose() { if (disposed) return; disposed = true
      for (const p of pieces) p.o.layers.set(0)
      for (const b of batches) { b.removeFromParent(); b.customDepthMaterial.dispose(); b.material.dispose(); b.dispose() }
      batches.length = 0; pieces.length = 0 },
  }
  return api
}
