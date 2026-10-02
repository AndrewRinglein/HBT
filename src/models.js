/* ── THE CHARACTER MODELS (viewer.character-models, 2026-09-29) ───────────────
   Engine DECISIONS.md 2026-09-29 "the playable opening": "A unit with no 3D model shows its token";
   "Motions: enemies need idle, move, attack, hit reaction and death. Heroes need those and whatever their
   weapon's powers need." And "the playable battle screen": "A dead unit is its 3D model lying on the ground
   (the death motion's end). An unconscious (downed) unit is the same, with a bleed-out counter."
   Which look a unit type wears, which file and clip is each motion, and every file's hash are the pack's
   (tools/character-models.mjs). This module only draws: a model stands where its token stands (board.js owns
   every position and every walk), plays what the fold's cues say (lunge -> attack, flash -> hit), and lies
   down when the fold says the unit is downed or dead. It decides nothing and computes no game number. */
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js'
import {atlasSourceURL} from './atlas.js'
import {release} from './painted.js'
import transformationRegistry from '../../assets/characters/hero-transformations/activation-registry.json' with {type:'json'}
import {transformationFor} from '../../assets/characters/hero-transformations/afflictions.mjs'
import {createBodyAfflictions} from '../../assets/characters/hero-transformations/body-afflictions.mjs'

export const bundledModels = typeof __BUNDLED_MODELS__ === 'undefined' ? null : __BUNDLED_MODELS__
const LOOPS = new Set(['idle', 'move', 'flight'])
const FADE = .25              // s — the crossfade between two motions
const RECOIL = .28            // s — the recoil of a body that has no hit reaction (viewer SWITCHES modelRecoil)
const LUNGE = .36             // s — the lean of a body that has no strike or shot motion (viewer SWITCHES modelLunge)
const TURN = 12               // 1/s — how fast a body turns to face (the battle demo's motion.mjs turnToward)

/** the model binding for a unit type, or null when it has none (it keeps its token) */
export function modelBinding(typeId, pack = bundledModels) {
  const b = pack && typeof typeId === 'string' && Object.hasOwn(pack, typeId) ? pack[typeId] : null
  if (!b) return null
  if (b.typeId !== typeId || !Array.isArray(b.looks) || !b.looks.length) throw new Error(`character models for ${typeId}: the pack row is not this type's`)
  return b
}
/** which of a type's looks a unit wears: the looks in turn, by the unit's id (viewer SWITCHES modelLooks) */
export const lookFor = (b, unitId) => b.looks[((unitId % b.looks.length) + b.looks.length) % b.looks.length]

/* A GLB with its pictures taken out: a motion file keeps only its rig and its animations (a Zombie's clip file
   carries a whole textured body the page never shows); `meshes` keeps the bodies with flat colours, for a host
   that cannot decode images. The binary chunk is kept byte for byte. */
const GLB = 0x46546c67, JSON_CHUNK = 0x4e4f534a
export function slimGLB(buffer, { meshes = false } = {}) {
  const dv = new DataView(buffer)
  if (dv.getUint32(0, true) !== GLB || dv.getUint32(16, true) !== JSON_CHUNK) throw new Error('not a GLB')
  const length = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)))
  for (const k of ['textures', 'images', 'samplers']) delete json[k]
  if (meshes) {
    json.materials = (json.materials || []).map(m => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: m.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1] } }))
    const geometry = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_mesh_quantization'])
    for (const k of ['extensionsUsed', 'extensionsRequired']) if (json[k]) json[k] = json[k].filter(x => geometry.has(x))
  } else {
    for (const n of json.nodes || []) { delete n.mesh; delete n.skin; delete n.camera }
    for (const k of ['meshes', 'skins', 'materials', 'cameras', 'extensionsUsed', 'extensionsRequired']) delete json[k]
  }
  const text = new TextEncoder().encode(JSON.stringify(json)), pad = (4 - text.length % 4) % 4
  const bin = new Uint8Array(buffer, 20 + length), out = new Uint8Array(20 + text.length + pad + bin.length), o = new DataView(out.buffer)
  o.setUint32(0, GLB, true); o.setUint32(4, 2, true); o.setUint32(8, out.length, true); o.setUint32(12, text.length + pad, true); o.setUint32(16, JSON_CHUNK, true)
  out.set(text, 20); out.fill(0x20, 20 + text.length, 20 + text.length + pad); out.set(bin, 20 + text.length + pad)
  return out.buffer
}

/* viewer.every-model: a performance borrowed from another body of the same rig (tools/character-models.mjs SELECTED) keeps
   its rotations, and the body keeps its own bone lengths — every translation but the pivot's is dropped, and the pivot's
   travel is carried over at the ratio of the two bodies' pivot heights. That is the civilian study's own transfer
   ("authored rotation/timing with fitted target rest translations", civilian-study motion-record.json), and why: a strike
   that kept its donor's translations "stretched child from about 1.025 ready height to 1.848" (civilian-study run.json) */
export function borrowClip(clip, source, body, pivot) {
  const from = source.getObjectByName(pivot)?.position, to = body.getObjectByName(pivot)?.position
  if (!from || !to || !(from.length() > 0)) throw new Error(`borrowed ${clip.name}: no ${pivot} to carry its travel`)
  const k = to.length() / from.length(), tracks = []
  for (const t of clip.tracks) {
    const dot = t.name.lastIndexOf('.'), node = t.name.slice(0, dot), prop = t.name.slice(dot + 1)
    if (prop === 'quaternion') tracks.push(t)
    else if (prop === 'position' && node === pivot) {
      const v = Float32Array.from(t.values)
      for (let i = 0; i < v.length; i += 3) { v[i] = to.x + (v[i] - from.x) * k; v[i + 1] = to.y + (v[i + 1] - from.y) * k; v[i + 2] = to.z + (v[i + 2] - from.z) * k }
      tracks.push(new THREE.VectorKeyframeTrack(t.name, t.times, v, t.getInterpolation()))
    }
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

const hex = buf => Array.from(new Uint8Array(buf), n => n.toString(16).padStart(2, '0')).join('')
/** fetch a look's files, refuse any that is not the approved file, parse them: the body, its motions, what it holds */
export async function loadLook(look, platform = {}) {
  const cancelled = () => platform.cancelled?.() === true
  const bytes = new Map(), parsed = new Map()
  const bytesOf = ref => {
    if (!bytes.has(ref.path)) bytes.set(ref.path, (async () => {
      const url = atlasSourceURL(ref.path, platform.location)
      const response = await (platform.fetch || globalThis.fetch)(url)
      if (!response.ok) throw new Error(`character model ${ref.path}: ${response.status}`)
      const data = await response.arrayBuffer()
      if (cancelled()) throw new Error('character model load cancelled')
      const digest = hex(await (platform.digest || (d => crypto.subtle.digest('SHA-256', d)))(data))
      if (digest !== ref.sha256) throw new Error(`character model ${ref.path} is ${digest.slice(0, 12)}, the approved file is ${ref.sha256.slice(0, 12)}`)
      return { url, data }
    })())
    return bytes.get(ref.path)
  }
  const gltfOf = (ref, what) => {
    const key = ref.path + '|' + what
    if (!parsed.has(key)) parsed.set(key, bytesOf(ref).then(({ url, data }) => {
      if (cancelled()) throw new Error('character model load cancelled')
      const slim = what === 'motion' ? slimGLB(data) : platform.textures === false ? slimGLB(data, { meshes: true }) : data
      return (platform.parse || ((d, base) => new GLTFLoader().parseAsync(d, base)))(slim, url.slice(0, url.lastIndexOf('/') + 1))
    }))
    return parsed.get(key)
  }
  const model = await gltfOf(look.model, 'model')
  const entries = await Promise.all(Object.entries(look.motions).map(async ([motion, ref]) => {
    const g = ref.path === look.model.path ? model : await gltfOf(ref, 'motion')
    const clip = g.animations.find(c => c.name === ref.clip)
    if (!clip) throw new Error(`character model ${ref.path} has no animation '${ref.clip}'`)
    return [motion, ref.borrowed ? borrowClip(clip, g.scene, model.scene, look.pivot) : clip]
  }))
  const props = await Promise.all((look.props || []).map(async p => ({ ...p, scene: (await gltfOf(p, 'model')).scene })))
  if (cancelled()) throw new Error('character model load cancelled')
  return { look, scene: model.scene, clips: Object.fromEntries(entries), props }
}

/* a held prop: at the grip between the middle and ring fingers, in the hand it is held in, each fit as its owner fits it
   (tools/character-models.mjs DEMO_HELD, viewer.weapons-in-hand):
     forearm (the bow) — turned along the forearm at the motion it was fitted on; turned (the sword, the mace) — a quarter
     turn about the hand; square (the shield) — square to the hand at the motion it was fitted on, at its offset: the battle
     demo's own fits (oathblade-armor/rebuild/purchased-stage-equipment.js)
     tester — the weapon tester's palm-centred socket, flipped to the palm, the weapon's long axis on the socket's, at its
     stored grip, scale and roll (weapon-card-models/tester/equipment.js select, adjust) */
function fitProp(root, p, clips, pose, reference, i) {
  const bone = n => root.getObjectByName('CC_Base_' + p.hand + '_' + n)
  const hand = bone('Hand'), mid = bone('Mid1'), ring = bone('Ring1'), fore = bone('Forearm')
  if (!hand || !mid || !ring || !fore) throw new Error(`${p.path}: the rig has no ${p.hand} hand to hold it`)
  const V = () => new THREE.Vector3()
  pose(reference)
  const s = hand.getWorldScale(V()).x, local = b => hand.worldToLocal(b.getWorldPosition(V()))
  const grip = local(mid).add(local(ring)).multiplyScalar(.5).add(new THREE.Vector3((p.hand === 'R' ? -.012 : .012) / s, 0, 0))
  const socket = new THREE.Group(); socket.name = `held:${i}:${p.item ?? p.path}`; socket.position.copy(grip); socket.scale.setScalar(1 / s); hand.add(socket)
  const source = p.node ? p.scene.getObjectByName(p.node) : p.scene
  if (!source) throw new Error(`${p.path} has no ${p.node} to hold`)
  const held = source.clone(true); held.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false } })
  if (p.fit === 'turned') { socket.rotation.z = Math.PI / 2; socket.add(held); return }
  if (p.fit === 'square') {
    const clip = clips[p.calibrate.motion]; pose(clip, clip.duration * p.calibrate.at)
    socket.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert())
    held.position.fromArray(p.at); socket.add(held); return
  }
  if (p.fit === 'tester') {
    socket.position.x += (p.hand === 'R' ? -.0011 : .0006) / s; socket.position.y += (p.hand === 'R' ? -.0007 : -.003) / s
    const index = bone('Index1'), pinky = bone('Pinky1')
    if (!index || !pinky) throw new Error(`${p.path}: the rig's ${p.hand} hand has no fingers to face it by`)
    const flip = local(index).sub(local(pinky)).z < 0 ? Math.PI : 0
    socket.quaternion.setFromEuler(new THREE.Euler(0, flip, Math.PI / 2))
    const normalized = new THREE.Group(), adjust = new THREE.Group()
    if (p.preNormalized) normalized.add(held)
    else {
      /* the source's +Y is the long axis: a quarter turn about X puts the tip on +Z; the raw grip (x, y, z) goes with it */
      const orient = new THREE.Group(); orient.rotation.x = Math.PI / 2; orient.add(held); normalized.add(orient)
      normalized.scale.setScalar(p.scale); const [x, y, z] = p.grip; normalized.position.set(-x * p.scale, y * p.scale, z * p.scale)
    }
    adjust.rotation.set(0, 0, THREE.MathUtils.degToRad(p.roll || 0)); adjust.add(normalized); socket.add(adjust); return
  }
  socket.add(held)
  const clip = clips[p.calibrate.motion]; pose(clip, clip.duration * p.calibrate.at)
  const forward = hand.getWorldPosition(V()).sub(fore.getWorldPosition(V())).normalize()
  const right = new THREE.Vector3(0, 1, 0).cross(forward).normalize(), up = forward.clone().cross(right).normalize()
  socket.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward))))
}

/* viewer.walk-in-step (engine DECISIONS.md 2026-10-01, Andrew: "when the characters are moving on the map, they're not
   actually walking or moving. They just slide across."): how far a travelling motion carries the body per second of its
   clip, in metres on the body — the clip's own stride, so the cast can play it at the token's pace with the feet on the
   ground. A clip that travels (root motion: the zombies' slow walk, the imps' walk and flight, the oathblade's walk
   forward) is its pivot's travel over the clip; an in-place walk (the humanoids' and civilians' Walk) is the speed a
   planted foot slides back under the hips (a foot within 3% of the body's height of its lowest is planted). Null where
   neither can be read: that motion plays at its own pace, as before. */
export function groundSpeed(clip, { pose, root, stage, pivot, feet, height, inPlace }) {
  const dur = clip.duration; if (!(dur > 0)) return null
  const n = Math.max(16, Math.ceil(dur * 30)), inv = new THREE.Matrix4(), hip = [], soles = feet.map(() => [])
  for (let i = 0; i <= n; i++) {
    /* a looping action wraps at its end: the last sample is a hair before it */
    pose(clip, Math.min(dur * i / n, dur - 1e-4)); root.position.x = root.position.z = 0
    stage.updateMatrixWorld(true); inv.copy(stage.matrixWorld).invert()
    hip.push(new THREE.Vector3().setFromMatrixPosition(pivot.matrixWorld).applyMatrix4(inv))
    feet.forEach((f, j) => soles[j].push(new THREE.Vector3().setFromMatrixPosition(f.matrixWorld).applyMatrix4(inv)))
  }
  const travel = Math.hypot(hip[n].x - hip[0].x, hip[n].z - hip[0].z)
  if (travel > .05 * height) return travel / dur
  if (!inPlace) return null
  const dt = dur / n, speeds = []
  for (const s of soles) {
    const low = Math.min(...s.map(p => p.y)) + .03 * height
    for (let i = 0; i < n; i++) if (s[i].y < low && s[i + 1].y < low)
      speeds.push(Math.hypot(s[i + 1].x - hip[i + 1].x - s[i].x + hip[i].x, s[i + 1].z - hip[i + 1].z - s[i].z + hip[i].z) / dt)
  }
  if (!speeds.length) return null
  speeds.sort((x, y) => x - y)
  const v = speeds[speeds.length >> 1]
  return v > 1e-3 ? v : null
}

/* one unlit twin per source material, shared by every body cloned from it (the clones share their materials too) */
const unlitTwins = new WeakMap()
const unlitOf = m => {
  if (m.isMeshBasicMaterial) return m
  if (!unlitTwins.has(m)) unlitTwins.set(m, Object.assign(new THREE.MeshBasicMaterial({ map: m.map || m.emissiveMap || null,
    color: m.map ? m.color : m.emissiveMap ? m.emissive : m.color, side: THREE.DoubleSide, toneMapped: false }), { name: m.name }))
  return unlitTwins.get(m)
}

/** one unit's body: the rig cloned, scaled to the roster's stature, its motions ready */
export function createBody(loaded, appearanceOptions = {}) {
  const { look, clips } = loaded
  const root = cloneRig(loaded.scene), hidden = new Set(look.hidden || []), meshes = []
  /* viewer.real-bodies: a wardrobe body's under-suit is a material of its body parts, hidden beneath the outfit as its owners hide
     it (outfits/eve/serpent-armhole.html, hero-transformations/battle.mjs) */
  const hiddenMaterials = new Set(look.hiddenMaterials || [])
  /* viewer.male-hero-outfits: an approved male outfit's main paint is drawn unlit, as its preview draws it (hero-outfits
     motion/viewer.mjs: its base colour, double-sided, not tone-mapped); a mesh of several parts is named by its node */
  const unlit = new Set(look.unlit || [])
  root.traverse(o => {
    if (hidden.has(o.name)) o.visible = false
    if (o.isMesh) {
      o.castShadow = false; o.receiveShadow = true; o.frustumCulled = false; meshes.push(o)
      if (hiddenMaterials.size) for (const m of [].concat(o.material)) if (hiddenMaterials.has(m.name)) { m.visible = false; m.depthWrite = false }
      if (unlit.has(o.name) || unlit.has(o.parent?.name)) o.material = Array.isArray(o.material) ? o.material.map(unlitOf) : unlitOf(o.material)
    }
  })
  const mixer = new THREE.AnimationMixer(root)
  const reference = clips.idle || clips.attack || Object.values(clips)[0]
  const pose = (clip, time = 0) => { mixer.stopAllAction(); const a = mixer.clipAction(clip); a.reset().play(); a.time = time; mixer.update(0); root.updateMatrixWorld(true) }
  for (const [i, p] of (loaded.props || []).entries()) fitProp(root, p, clips, pose, reference, i)
  pose(reference)
  let pivot = root.getObjectByName(look.pivot)
  if (!pivot) { const clean = s => s.replace(/[^a-z0-9]/gi, '').toLowerCase(); root.traverse(o => { if (!pivot && clean(o.name) === clean(look.pivot)) pivot = o }) }
  if (!pivot) throw new Error(`${look.name}: its rig has no placement pivot ${look.pivot}`)
  /* the token walks the body; the motion's own horizontal hip travel is cancelled (the battle demo's actors.mjs) */
  const at = new THREE.Vector3()
  const centre = () => { root.position.x = root.position.z = 0; pivot.updateWorldMatrix(true, false); at.setFromMatrixPosition(pivot.matrixWorld); root.worldToLocal(at); root.position.x = -at.x; root.position.z = -at.z }
  const shown = o => { for (let n = o; n && n !== root; n = n.parent) if (!n.visible) return false; return true }
  const bounds = () => {
    root.updateMatrixWorld(true); const b = new THREE.Box3()
    for (const o of meshes) {
      if (!shown(o)) continue
      if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); b.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)) }
      else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)) }
    }
    return b
  }
  centre()
  const b0 = bounds(), tall = b0.max.y - b0.min.y
  if (!(tall > 0)) throw new Error(`${look.name}: its body has no height`)
  const scale = look.height / tall
  const model = new THREE.Group(), lean = new THREE.Group(), stage = new THREE.Group()
  model.scale.setScalar(scale); model.position.y = -b0.min.y * scale; model.add(root); lean.add(model); stage.add(lean); stage.name = 'model:' + look.id
  stage.updateMatrixWorld(true)
  const measure = () => { const b = bounds(), inv = new THREE.Matrix4().copy(stage.matrixWorld).invert(); b.applyMatrix4(inv); return b.max.y - b.min.y }
  const standing = measure()
  /* viewer.walk-in-step: each travelling motion's ground speed, measured once from the clip on this body (groundSpeed) */
  const feet = []; root.traverse(o => { if (o.isBone && /foot(l|r|left|right)?$/.test(o.name.replace(/[^a-z]/gi, '').toLowerCase())) feet.push(o) })
  const gaits = {}
  for (const k of ['move', 'flight']) if (clips[k]) gaits[k] = groundSpeed(clips[k], { pose, root, stage, pivot, feet, height: look.height, inPlace: k === 'move' })
  pose(reference); centre()
  mixer.stopAllAction()
  const actions = {}
  for (const [k, clip] of Object.entries(clips)) { const a = mixer.clipAction(clip); a.setLoop(LOOPS.has(k) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !LOOPS.has(k); actions[k] = a }
  let motion = null, once = false, recoilT = Infinity, lungeT = Infinity, appearanceTime = 0, layer = null, selected = null, appearanceFailed = false
  const registry = appearanceOptions.registry || transformationRegistry
  const body = {
    look, stage, yaw: 0, face: 0, life: null, base: 'idle',
    get appearance() { return { identity: selected?.identity || null, state: layer?.state || 'normal', requested: selected?.state || 'normal', bodyFit: layer ? 'compatible' : 'pending' } },
    setAfflictions(unit) {
      selected = transformationFor(unit, registry, look.identity)
      if (!selected) return layer ? layer.set(null) : Promise.resolve()
      const profile = selected.profile
      if (!layer && !appearanceFailed && profile && profile.model.sha256 === look.model?.sha256 && appearanceOptions.loadHead) {
        try { layer = createBodyAfflictions(root, profile, {loadHead: ref => appearanceOptions.loadHead(ref, profile), onError: appearanceOptions.onError}) }
        catch(error) { appearanceFailed = true; appearanceOptions.onError?.(error) }
      }
      return layer ? layer.set(selected) : Promise.resolve()
    },
    get motion() { return motion },
    has: k => !!actions[k],
    /** play a motion: a loop (idle, move) until told otherwise; the rest once — the death holds its last frame */
    play(key, { snap = false } = {}) {
      const next = actions[key]; if (!next) return false
      const prev = motion && actions[motion]
      if (prev === next && LOOPS.has(key) && !snap) return true
      if (snap) mixer.stopAllAction(); else if (prev && prev !== next) prev.fadeOut(FADE)
      next.reset(); next.enabled = true; next.setEffectiveTimeScale(1); next.setEffectiveWeight(1)
      if (prev && prev !== next && !snap) next.fadeIn(FADE)
      next.play()
      if (snap && !LOOPS.has(key)) next.time = next.getClip().duration
      motion = key; once = !LOOPS.has(key) && key !== 'death'
      if (snap) { layer?.before(); mixer.update(0); layer?.after(appearanceTime, body.life === 'standing') }
      return true
    },
    /** metres of ground a travelling motion covers per second of its clip (null: unmeasured, it plays at its own pace) */
    gait: k => gaits[k] ?? null,
    /** the travelling motion keeps to the ground: over `metres` of the token's travel in a frame of `step` clip seconds it
        advances metres / gait — one stride per stride length, whatever the board's pace or the easing (viewer.walk-in-step) */
    pace(k, metres, step) { const a = actions[k], g = gaits[k]; if (a && g && step > 0) a.setEffectiveTimeScale(metres / (g * step)) },
    /** where a motion's clip is now, in clip seconds */
    clipTime: k => actions[k] ? actions[k].time : null,
    clipLength: k => actions[k] ? actions[k].getClip().duration : null,
    /** a body with no hit reaction recoils: it leans back and returns */
    recoilStart() { recoilT = 0 },
    recoil: () => recoilT < RECOIL ? Math.sin(Math.PI * recoilT / RECOIL) : 0,
    /** a body with no strike (or shot) motion leans toward its target and returns (viewer.opening-cast) */
    lungeStart() { lungeT = 0 },
    lunge: () => lungeT < LUNGE ? Math.sin(Math.PI * lungeT / LUNGE) : 0,
    lying: () => motion === 'death' && !!actions.death && actions.death.time >= actions.death.getClip().duration - 1e-4,
    frame(dt) {
      layer?.before(); mixer.update(dt); appearanceTime += dt; layer?.after(appearanceTime, body.life === 'standing'); centre()
      recoilT += dt; lungeT += dt
      lean.rotation.x = -.22 * body.recoil() + .18 * body.lunge()
      stage.rotation.y = body.yaw
      stage.updateMatrixWorld(true)
    },
    height: () => { stage.updateMatrixWorld(true); return measure() },
    standingHeight: () => standing,
    dispose() { layer?.dispose(); stage.removeFromParent(); mixer.stopAllAction(); mixer.uncacheRoot(root) },
  }
  /* a once motion (a strike, a flinch) returns to the body's resting motion when it ends */
  mixer.addEventListener('finished', e => { if (once && e.action === actions[motion]) { once = false; body.play(body.base) } })
  return body
}

const zOf = t => { if (!t || t === 'none') return 0; let m = /translateZ\(([-\d.e]+)px\)/.exec(t); if (m) return +m[1]; m = /^matrix3d\(([^)]+)\)/.exec(t); return m ? +m[1].split(',')[14] : 0 }
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a))

/** the cast: every bound unit on the board as its model, in the 3D scene, following its token */
export function createCast(V, scene, toWorld, platform = {}) {
  const looks = new Map(), bodies = new Map(), group = new THREE.Group()
  const headLoads = new Map()
  /* board px per scene metre, upward: the scene's own map (the inverse of toWorld), its y axis -> the board's z */
  const up = toWorld.clone().invert().elements, PX_PER_M = Math.hypot(up[4], up[5], up[6])
  /* viewer.side-facing (engine DECISIONS.md 2026-10-01, Andrew: "The enemies should be facing to the left, and the heroes should
     be facing to the right." · "Every unit faces the direction it walks, and when a unit moves next to another unit, the unit,
     if it's an enemy, should turn to face them. … If someone then walks up from another hex, it turns to face them. You also
     turn to face anybody who attacks you."): a body starts facing its side's way across the board — the heroes (civilians
     among them) east, toward the enemy, the enemies west, read off the board's own map (board +x into the scene) — and keeps
     its facing: where it walks, toward an enemy that steps next to it (the engine's own distance, V.data.distance; the latest
     wins), toward whoever attacks it, toward its target when it strikes */
  const e0 = new THREE.Vector3(0, 0, 0).applyMatrix4(toWorld), e1 = new THREE.Vector3(100, 0, 0).applyMatrix4(toWorld)
  const EAST = Math.atan2(e1.x - e0.x, e1.z - e0.z)
  const restFace = u => u.side === 'enemy' ? wrapAngle(EAST + Math.PI) : EAST
  group.name = 'characters'; scene.add(group)
  const readStyle = platform.readStyle || (el => getComputedStyle(el))
  const load = platform.load || (look => loadLook(look, { ...platform, cancelled: () => disposed }))
  let disposed = false
  function loadHead(ref, profile) {
    if (!headLoads.has(ref.path)) headLoads.set(ref.path, (async () => {
      const loaded = await loadLook({id:ref.path,model:ref,motions:{},props:[]}, {...platform,cancelled:()=>disposed})
      try {
      let material; loaded.scene.traverse(o=>{if(o.isMesh&&!material)material=Array.isArray(o.material)?o.material[0]:o.material})
      if(!material)throw Error('Transformation head has no material: '+ref.path)
      let recess=null
      if(ref.path.endsWith('-undead.glb')&&profile.recess&&platform.textures!==false){
        const url=atlasSourceURL(profile.recess.path,platform.location),response=await (platform.fetch||globalThis.fetch)(url)
        if(!response.ok)throw Error('Transformation recess unavailable: '+profile.recess.path)
        const bytes=await response.arrayBuffer(),digest=hex(await (platform.digest||(d=>crypto.subtle.digest('SHA-256',d)))(bytes))
        if(digest!==profile.recess.sha256)throw Error('Transformation recess hash mismatch')
        const local=URL.createObjectURL(new Blob([bytes],{type:'image/png'}))
        try{recess=await new THREE.TextureLoader().loadAsync(local);recess.flipY=false}finally{URL.revokeObjectURL(local)}
      }
      return {scene:loaded.scene,material,recess}
      } catch(error) { release(loaded.scene); throw error }
    })().catch(error=>{headLoads.delete(ref.path);throw error}))
    return headLoads.get(ref.path)
  }
  function want(look) {
    let entry = looks.get(look.id)
    if (entry) return entry
    entry = { state: 'loading', loaded: null, error: null }; looks.set(look.id, entry)
    /* done: settles when the look is in or has failed (viewer.bodies-before-board: the board waits on it) */
    entry.done = Promise.resolve().then(() => load(look)).then(l => { if (disposed) return; entry.state = 'ready'; entry.loaded = l },
      err => { if (disposed) return; entry.state = 'failed'; entry.error = err; platform.onError?.(look, err) })
    return entry
  }
  /* where a unit stands: its token's feet, or — dead — its corpse (board.js syncCorpses) */
  function anchorOf(u) {
    if (u.life !== 'dead') return V.layers.UEL.get(u.id)?.root || null
    const c = Object.values(V.S.corpses || {}).find(c => c.of === u.id)
    return c ? V.layers.CORPSE?.get(c.id)?.node || null : null
  }
  function place(el, out) {
    const s = readStyle(el), x = parseFloat(s.left || el.style.left), y = parseFloat(s.top || el.style.top)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false
    out.set(x, y, zOf(s.transform || el.style.transform)).applyMatrix4(toWorld); return true
  }
  const drop = id => { bodies.get(id)?.dispose(); bodies.delete(id) }
  const faceToward = (B, p) => { const dx = p.x - B.stage.position.x, dz = p.z - B.stage.position.z; if (dx * dx + dz * dz > 1e-8) B.face = Math.atan2(dx, dz) }
  const hexWorld = h => { const p = V.data.POS?.[h]; return p ? new THREE.Vector3(p.px, p.py, 0).applyMatrix4(toWorld) : null }
  const whereIs = (id, out) => { const B = bodies.get(id); if (B) return out.copy(B.stage.position); const u = V.S.U[id], el = u && anchorOf(u); return el && place(el, out) ? out : null }
  const rest = (B, life) => life === 'standing' ? (B.has('idle') ? 'idle' : null) : 'death'
  function frame(dt) {
    if (disposed) return
    /* the pump's clock: its speed, and a hitstop freezes the bodies with the tokens (board.js hitstop) */
    const step = V.fx?.paused ? 0 : dt * (V.speed || 1)
    let changed = false
    const kept = new Set()
    /* viewer.side-facing: a unit standing on a new hex makes every enemy now next to it turn to face it */
    const dist = V.data.distance
    if (dist) for (const m of Object.values(V.S.U)) {
      const M = bodies.get(m.id); if (!M || m.life !== 'standing') continue
      if (M.hex != null && M.hex !== m.hex) {
        const at = hexWorld(m.hex)
        if (at) for (const o of Object.values(V.S.U)) {
          const O = bodies.get(o.id)
          if (!O || o.id === m.id || o.life !== 'standing' || o.side === m.side || dist(o.hex, m.hex) !== 1) continue
          faceToward(O, at)
        }
      }
      M.hex = m.hex
    }
    for (const u of Object.values(V.S.U)) {
      const binding = modelBinding(u.typeId, V.data.models); if (!binding) continue
      const look = lookFor(binding, u.id), entry = want(look)
      if (entry.state !== 'ready') continue
      let body = bodies.get(u.id)
      const el = anchorOf(u)
      /* a unit that has just died plays its death where it stood until its corpse is on the board;
         a death that leaves no corpse leaves nothing once the fall ends */
      if (!el && !(body && u.life === 'dead' && !body.lying())) continue
      if (!body) {
        /* a look that cannot be stood up is its token, said once — never the whole scene's failure (Law 9: said, not swallowed) */
        try { body = createBody(entry.loaded, {registry:platform.registry,loadHead:platform.loadHead||loadHead,onError:error=>platform.onError?.(look,error,{appearance:true})}) } catch (err) { entry.state = 'failed'; entry.error = err; platform.onError?.(look, err); continue }
        group.add(body.stage); bodies.set(u.id, body); changed = true
        body.life = u.life; const r = rest(body, u.life); if (r) body.play(r, { snap: true })
        body.face = body.yaw = restFace(u); body.hex = u.hex
        if (el) place(el, body.stage.position)
        body.last = body.stage.position.clone()
      }
      kept.add(u.id)
      body.setAfflictions(u)
      if (el) place(el, body.stage.position)
      /* life is the fold's: a change plays the death from its start (a seek lands on its end: snap) */
      if (body.life !== u.life) {
        const was = body.life; body.life = u.life
        if (u.life === 'standing') { if (body.has('idle')) body.play('idle') }
        else if (was === 'standing') body.play('death')
      }
      body.base = rest(body, u.life) || body.motion
      const E = V.layers.UEL.get(u.id)
      const walking = u.life === 'standing' && !!(E && E.walk && E.walk.playState !== 'finished' && E.walk.playState !== 'idle')
      if (walking) {
        /* a flight (the board's traversal says its shape — viewer.opening-cast) flies where the look can; else it walks */
        const going = E.walkShape === 'flight' && body.has('flight') ? 'flight' : 'move'
        if (body.motion !== going) body.play(going)
        const dx = body.stage.position.x - body.last.x, dz = body.stage.position.z - body.last.z
        if (dx * dx + dz * dz > 1e-8) body.face = Math.atan2(dx, dz)
        /* its stride timed to the ground it covers this frame: the feet do not slide (viewer.walk-in-step) */
        if (body.motion === going) body.pace(going, Math.hypot(dx, dz), step)
      } else if ((body.motion === 'move' || body.motion === 'flight') && body.base) body.play(body.base)
      body.last.copy(body.stage.position)
      body.yaw += wrapAngle(body.face - body.yaw) * (1 - Math.exp(-TURN * dt))
      body.frame(step)
    }
    for (const id of [...bodies.keys()]) if (!kept.has(id)) { drop(id); changed = true }
    /* the standee gives way to the body (and comes back when it goes) */
    if (changed) V.render?.()
  }
  /* viewer.bodies-before-board (engine DECISIONS.md 2026-09-30 "no 2D before the 3D bodies"): the looks of a unit with a
     body, asked for at once */
  const lookOf = u => { const binding = u && modelBinding(u.typeId, V.data.models); return binding ? want(lookFor(binding, u.id)) : null }
  return {
    frame,
    get size() { return bodies.size },
    shows: id => bodies.has(id),
    /** the unit has a body that is still loading — no token picture stands in for it meanwhile */
    pending: id => { const u = V.S.U[id], e = u && u.life !== 'dead' ? lookOf(u) : null; return !!e && (e.state === 'loading' || (e.state === 'ready' && !bodies.has(id))) },
    /** every unit now on the board's look, loaded or failed: the board opens when this settles */
    settle: () => Promise.all(Object.values(V.S.U).filter(u => u.life !== 'dead').map(lookOf).filter(Boolean).map(e => e.done)).then(() => { if (!disposed) frame(0) }),
    /** how tall a unit's body stands, in board px (viewer.under-unit: the acting arrow and the body effects ride its head) */
    heightPx: id => { const B = bodies.get(id); return B ? B.standingHeight() * PX_PER_M : null },
    body: id => bodies.get(id) || null,
    /** viewer.xcom-camera: where each standing body is to be seen — its chest and its head, in the scene — and its feet */
    aims() {
      const out = []
      for (const B of bodies.values()) { if (B.life !== 'standing') continue
        const p = B.stage.position, h = B.standingHeight()
        out.push({ feet: p.y, at: new THREE.Vector3(p.x, p.y + h * .55, p.z) }, { feet: p.y, at: new THREE.Vector3(p.x, p.y + h * .9, p.z) }) }
      return out
    },
    /** the fold's lunge: the attacker strikes, turned toward its target — a bow's shot when it has one; a look with
        neither leans toward it (the shot itself is the board's projectile, fx.attack) */
    strike(a, t, kind) {
      const A = bodies.get(a); if (!A || V.S.U[a]?.life !== 'standing') return
      if (!A.play(kind === 'ranged' && A.has('ranged') ? 'ranged' : 'attack')) A.lungeStart()
      const p = whereIs(t, new THREE.Vector3()); if (!p) return
      faceToward(A, p)
      /* viewer.side-facing: "You also turn to face anybody who attacks you" */
      const T = bodies.get(t); if (T && V.S.U[t]?.life === 'standing') faceToward(T, A.stage.position)
    },
    /** the fold's flash (damage landed): the hit reaction, or a recoil where the look has none */
    flinch(id) {
      const B = bodies.get(id); if (!B || V.S.U[id]?.life !== 'standing') return
      if (B.has('hit')) B.play('hit'); else B.recoilStart()
    },
    /** a seek: every body at its resting pose now — the dead and the downed at the death's end */
    snap() {
      for (const [id, B] of bodies) { const u = V.S.U[id]; if (!u) continue; B.setAfflictions(u); B.life = u.life; const r = rest(B, u.life); if (r) B.play(r, { snap: true }); B.yaw = B.face; B.hex = u.hex }
    },
    dispose() {
      if (disposed) return; disposed = true
      for (const id of [...bodies.keys()]) drop(id)
      group.removeFromParent()
      for (const e of looks.values()) if (e.loaded) { release(e.loaded.scene); for (const p of e.loaded.props) release(p.scene) }
      for (const pending of headLoads.values()) pending.then(h=>{release(h.scene);h.recess?.dispose()},()=>{})
      headLoads.clear()
    },
  }
}
