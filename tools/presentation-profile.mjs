// viewer.caravan-scene (2026-10-01): the presentation profile of a painted scene — its look (environment, decorative
// surroundings, which effects run) from tools/presentation-profiles.json, and its FACTS (fire sites, cursed hexes) read
// from the scene's own files on the scene's own hash, so the replay and the live battle draw the same frozen scene.
// The handoff: "Add a validated profile for camera defaults, original encounter bounds, surroundings and environment/VFX
// settings. Pack scene-specific presentation metadata for fireSites, cursedCells and surroundings." Camera defaults are
// the policy's for every board (src/camera-policy.js) and the original bounds are the engine board's (the fit never
// reads decoration), so a profile carries neither; it may not, so nothing can quietly widen the fit.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ROOT = resolve(PKG, '..')
const KEYS = new Set(['source', 'environment', 'surroundings', 'effects'])
const fail = (scene, what) => { throw new Error(`presentation profile ${scene}: ${what}`) }
const num = v => typeof v === 'number' && Number.isFinite(v)

/** refuse a profile that is not exactly the shape the battle screen reads */
export function validateProfile(scene, p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) fail(scene, 'not an object')
  for (const k of Object.keys(p)) if (!KEYS.has(k)) fail(scene, `unknown field '${k}' (camera and bounds are not a profile's — the policy's and the engine board's)`)
  if (typeof p.source !== 'string' || !p.source) fail(scene, 'names no source')
  const e = p.environment
  if (!e || typeof e.background !== 'string' || !/^#[0-9a-f]{6}$/i.test(e.background) || Object.keys(e).length !== 1) fail(scene, 'environment is { background: "#rrggbb" }')
  const s = p.surroundings
  if (s !== undefined) {
    if (typeof s.groundName !== 'string' || !s.groundName) fail(scene, 'surroundings.groundName')
    if (!Array.isArray(s.propNames) || !s.propNames.length || s.propNames.some(n => typeof n !== 'string' || !n)) fail(scene, 'surroundings.propNames')
    if (!Array.isArray(s.soilPatches) || s.soilPatches.length !== 2 || s.soilPatches.some(q => !Array.isArray(q) || q.length !== 4 || !q.every(num))) fail(scene, 'surroundings.soilPatches is two [u, v, du, dv]')
    if (!Number.isSafeInteger(s.seed) || !num(s.width) || s.width <= 0) fail(scene, 'surroundings.seed and width')
    if (!Array.isArray(s.keepOut) || s.keepOut.some(k => !['west', 'east'].includes(k.side) || !num(k.zFrom) || !num(k.zTo) || k.zFrom >= k.zTo)) fail(scene, 'surroundings.keepOut is [{side: west|east, zFrom < zTo}]')
    for (const k of Object.keys(s)) if (!['groundName', 'propNames', 'soilPatches', 'seed', 'width', 'keepOut'].includes(k)) fail(scene, `surroundings.${k} is not read`)
  }
  const f = p.effects
  if (!f || typeof f.fire !== 'boolean' || typeof f.cursedGround !== 'boolean' || Object.keys(f).length !== 2) fail(scene, 'effects is { fire, cursedGround }')
  return p
}
export const readProfiles = () => JSON.parse(readFileSync(resolve(PKG, 'tools/presentation-profiles.json'), 'utf8'))

/** the packed presentation of a scene: its profile, plus its fire sites and cursed hexes read from the scene's own
    assembly.json and navigation.json — refused unless both were made on the scene's hash and agree with each other */
export function packPresentation(scene, nav, profiles = readProfiles()) {
  if (!Object.hasOwn(profiles, scene)) return null
  const p = validateProfile(scene, profiles[scene]), dir = 'assets/terrain-3d/' + scene
  const out = { environment: { ...p.environment }, effects: { ...p.effects } }
  if (p.surroundings) out.surroundings = structuredClone(p.surroundings)
  if (p.effects.fire) {
    const assembly = JSON.parse(readFileSync(resolve(ROOT, dir, 'assembly.json'), 'utf8'))
    if (!Array.isArray(assembly.fireSites)) fail(scene, `${dir}/assembly.json has no fireSites`)
    const ground = assembly.fireSites.filter(q => q[3] === 'ground')
    if (JSON.stringify([...(assembly.groundFireCells || [])].sort((a, b) => a - b)) !== JSON.stringify([...nav.groundFireCells].sort((a, b) => a - b))) fail(scene, 'assembly.json and navigation.json disagree on the ground fires')
    if (ground.length !== nav.groundFireCells.length) fail(scene, `${ground.length} ground fire sites for ${nav.groundFireCells.length} ground fire hexes`)
    out.fireSites = assembly.fireSites.map(q => { if (!(q.length >= 3 && q.slice(0, 3).every(num))) fail(scene, 'a fire site is not [x, y, z(, kind)]'); return { at: q.slice(0, 3), kind: q[3] === 'ground' ? 'ground' : 'wreck' } })
  }
  if (p.effects.cursedGround) out.cursedSites = nav.cursedCells.map(i => { const c = nav.cells[i]; return [c.center[0], c.floor + .025, c.center[2]] })
  return out
}
