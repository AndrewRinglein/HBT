/* ── THE PAINTED BOARD (viewer.painted-board, 2026-09-29) ─────────────────────
   Engine DECISIONS.md 2026-09-29 "the playable battle screen": "The painted 3D
   scenes are the battle board, turned into hex maps." A map.opening.* battle is
   drawn on its painted scene (assets/terrain-3d/<scene>/scene.glb) behind the
   same board, camera and tokens as every other battle; the WebGL camera follows
   the board's CSS camera through terrain3d.js exactly as an Atlas scene does.
   Every number here is the pack's (tools/painted-scenes.mjs, which refuses a
   scene whose hexes are not where the engine's are): the scene-metre -> board-px
   map and the display height of each hex. Nothing is fitted or guessed. */
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {atlasSourceURL} from './atlas.js'
import {createMapSurroundings} from '../../assets/battle-atlas/map-surroundings.mjs'
import {createTerrainFire} from '../../assets/battle-atlas/terrain-fire.mjs'
import {loadCursedGround} from '../../assets/battle-atlas/cursed-ground.mjs'

export const bundledPainted = typeof __BUNDLED_PAINTED__ === 'undefined' ? null : __BUNDLED_PAINTED__

/** the painted binding for the map a battle's map.loaded names, or null when the map has none */
export function paintedBinding(mapId, field, pack = bundledPainted) {
  const b = pack && typeof mapId === 'string' && Object.hasOwn(pack, mapId) ? pack[mapId] : null
  if (!b) return null
  if (b.kind !== 'painted' || b.mapId !== mapId) throw new Error(`painted scene for ${mapId}: the pack row is not this map's`)
  /* Law 1: a board of another size means the engine map changed under the pack — never stretch it */
  if (field && (field.width !== b.cols || field.height !== b.rows)) throw new Error(`painted scene ${b.scene} is ${b.cols}×${b.rows}, but the engine board is ${field.width}×${field.height}`)
  if (field && b.heights.length !== field.hexes.length) throw new Error(`painted scene ${b.scene}: ${b.heights.length} hex heights for ${field.hexes.length} hexes`)
  return structuredClone(b)
}
/** scene metres -> board CSS px (x east, y south, z toward the camera) — worldToCSS's shape, the pack's numbers */
export function paintedToCSS(b) {
  const t = b.toBoard
  return new THREE.Matrix4().set(t.sx, 0, 0, t.px0 - t.x0 * t.sx,
    0, 0, t.sy, t.py0 - t.z0 * t.sy, 0, t.sx, 0, 0, 0, 0, 0, 1)
}
export const paintedHeights = b => b.heights.slice()
export const paintedSceneURL = (b, location) => atlasSourceURL('assets/terrain-3d/' + b.scene + '/scene.glb', location)

/** free a parsed scene's geometry, materials and textures (the character models reuse it: models.js) */
export function release(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  root.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [].concat(o.material || [])) { materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v) } })
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => { t.source?.data?.close?.(); t.dispose() })
}
const hex = buf => Array.from(new Uint8Array(buf), n => n.toString(16).padStart(2, '0')).join('')

/** fetch the scene, refuse it unless it is the scene the hexes were measured on, and parse it */
export async function loadPaintedScene(b, platform = {}) {
  const cancelled = () => platform.cancelled?.() === true
  const url = paintedSceneURL(b, platform.location)
  const response = await (platform.fetch || globalThis.fetch)(url)
  if (!response.ok) throw new Error(`painted scene ${b.scene}: ${response.status}`)
  const bytes = await response.arrayBuffer()
  if (cancelled()) throw new Error('painted scene load cancelled')
  const digest = hex(await (platform.digest || (d => crypto.subtle.digest('SHA-256', d)))(bytes))
  if (digest !== b.sceneSha256) throw new Error(`painted scene ${b.scene} is ${digest.slice(0, 12)}, its hexes were measured on ${b.sceneSha256.slice(0, 12)}`)
  const gltf = await (platform.parse || ((data, base) => new GLTFLoader().parseAsync(data, base)))(bytes, url.slice(0, url.lastIndexOf('/') + 1))
  const root = gltf.scene
  if (cancelled()) { release(root); throw new Error('painted scene load cancelled') }
  /* the approved review page's surfaces (assets/battle-atlas/orphanage-riverside.mjs): everything
     receives shadow, ground/river/growth cast none, the river reads wet */
  root.traverse(o => {
    if (!o.isMesh) return
    o.receiveShadow = true; o.castShadow = !/Ground_|River_|Growth_/.test(o.name)
    for (const m of [].concat(o.material)) if (o.name.startsWith('River_Water')) { m.roughness = .34; m.metalness = .18 }
  })
  const group = new THREE.Group(); group.name = 'painted:' + b.scene; group.add(root)
  /* viewer.caravan-scene (2026-10-01): the scene's presentation profile (tools/presentation-profile.mjs) — its decorative
     surroundings, its fires and its cursed fog, all as the accepted caravan preview draws them (assets/battle-atlas/
     caravan-aftermath.mjs), from the scene's own packed facts. The GLB holds none of them: loading it alone omits them. */
  const effects = b.presentation ? await presentScene(root, group, b, platform, cancelled).catch(e => { release(root); throw e }) : null
  let disposed = false
  return { group, animated: !!effects?.animate, animate: effects?.animate,
    dispose() { if (disposed) return; disposed = true; effects?.dispose(); group.remove(root); release(root) } }
}
/** the ground fire's ash bed (the preview's decal under each ground fire) */
const ASH = { vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying vec2 v;void main(){vec2 q=v-.5;float n=sin(q.x*53.)*sin(q.y*47.)*.05;float a=1.-smoothstep(.26,.5,length(q)+n);gl_FragColor=vec4(.07,.043,.025,a*.83);}' }
/** the preview's fire site: a ground fire low and wide over its hex, a wreck's fire taller over the cart (20 flame origins) */
const fireSite = ({ at: [x, y, z], kind }) => { const g = kind === 'ground'
  return { position: new THREE.Vector3(x, y, z), radius: 2.0, width: g ? .58 : .65, height: g ? 1.25 : 2.1,
    origins: Array.from({ length: 20 }, (_, j) => new THREE.Vector3(x + Math.cos(j * 2.4) * Math.sqrt(j / 20) * (g ? 1.15 : 1.45), y + (g ? 0 : (j % 3) * .15), z + Math.sin(j * 2.4) * Math.sqrt(j / 20) * (g ? 1.0 : .8))) } }
async function presentScene(root, group, b, platform, cancelled) {
  const P = b.presentation, undo = []
  /* nothing decorative is ever under the pointer or in the fit: the board's picking and the camera's fit read the engine's
     board, never this scene — and the effects refuse a ray besides */
  const inert = g => g.traverse(o => { o.raycast = () => {} })
  if (P.surroundings) { const s = createMapSurroundings(root, P.surroundings); inert(s.group); s.group.userData.decorative = true; group.add(s.group)
    /* the clones share the scene's own geometry and materials: release(root) frees those once; this frees the backdrop's own */
    undo.push(() => { group.remove(s.group); s.dispose() }) }
  let fire = null, curse = null
  if (P.effects?.fire && P.fireSites?.length) {
    fire = createTerrainFire(P.fireSites.map(fireSite)); inert(fire.group); group.add(fire.group)
    const ashGeometry = new THREE.PlaneGeometry(3, 3), ashMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ASH })
    for (const site of P.fireSites) if (site.kind === 'ground') { const ash = new THREE.Mesh(ashGeometry, ashMaterial); ash.rotation.x = -Math.PI / 2; ash.position.set(site.at[0], .023, site.at[2]); ash.raycast = () => {}; fire.group.add(ash) }
    undo.push(() => { fire.dispose(); ashGeometry.dispose(); ashMaterial.dispose() })
  }
  if (P.effects?.cursedGround && P.cursedSites?.length) {
    curse = await loadCursedGround(P.cursedSites, { autoAnimate: false, cancelled,
      loadTexture: platform.loadTexture || (path => new THREE.TextureLoader().loadAsync(atlasSourceURL(path.replace(/^\//, ''), platform.location))) })
    if (curse) { inert(curse.group); group.add(curse.group); undo.push(() => curse.dispose()) }
  }
  if (cancelled()) { undo.forEach(f => f()); throw new Error('painted scene load cancelled') }
  return { animate: fire || curse ? (t, camera) => { fire?.update(t, .65); curse?.update(t, camera) } : null,
    dispose() { undo.splice(0).reverse().forEach(f => f()) } }
}
/* the approved review page's light (assets/battle-atlas/orphanage-riverside.mjs), in scene metres */
export const PAINTED_EXPOSURE = 1.08
export function paintedEnvironment(scene, binding = null) {
  const hemi = new THREE.HemisphereLight('#e1edff', '#77734f', 1.5), sun = new THREE.DirectionalLight('#fff0d5', 2.8)
  sun.position.set(-45, 80, 38); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096)
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.bias = -.00003; sun.shadow.normalBias = .04
  const background = scene.background
  /* the pale review backdrop, unless the scene's profile names its own (the caravan's dark #302c25 — its surroundings fade into it) */
  scene.add(hemi, sun, sun.target); scene.background = new THREE.Color(binding?.presentation?.environment?.background || '#d8d4c8')
  return () => { scene.remove(hemi, sun, sun.target); scene.background = background; sun.shadow.map?.dispose() }
}
