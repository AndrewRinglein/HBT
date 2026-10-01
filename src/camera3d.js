/* ── THE ORBIT CAMERA (viewer.true-3d-camera, 2026-09-30) ──────────────────────────────────────────────────
   Engine DECISIONS.md 2026-09-30 "a true 3D battle: an orbit camera, every Orphanage unit its own model, no flash
   of another map": "The battle camera is a true 3D orbit camera: a real perspective camera that rotates all the way
   around, tilts, zooms and pans, with the terrain and the characters seen correctly from any angle … The ground
   marks (hexes, reach, path, the arrow), the bars and names under units, and every click follow the 3D camera."

   ONE THREE.PerspectiveCamera, in the scene's metres, IS the camera. The board's DOM stage — the hex marks, the
   arrow, the bars and names, the floats, the click targets — is drawn THROUGH it: the stage's CSS matrix is this
   camera's own projection of the board plane, so nothing on the board can part from the 3D scene at any angle.
   Until 2026-09-30 it was the other way round (terrain3d.js copied the stage's CSS transform into the WebGL
   camera), and that is what stretched the scene and the bodies: a board pixel south is not the length of one east
   (the field's rows are 96 px where a regular hex's would be 110.9), and the CSS zoom scaled the board but not
   its height.

   The pose is the board camera's own (board.js applyCam): the board point it looks at (board px), the turn (yaw,
   degrees), the tilt (degrees from straight down) and the zoom. The lens is the board's: a 2600 px perspective
   (the field of view follows the viewport's height). Presentation only — no game number is worked out here. Pure:
   no DOM, no clock. */
import * as THREE from 'three'

/** the lens: px from the eye to the board's focus at 1x (the board's CSS perspective since 2026-09-01) */
export const LENS = 2600
const DEG = Math.PI / 180

/** scene metres -> board px for a board with no 3D scene: the board's own px, the same length every way (nothing to stretch) */
export function flatAffine(field) {
  const s = field.colStep / (Math.sqrt(3) * 1.5)
  return new THREE.Matrix4().set(s, 0, 0, 0, 0, 0, s, 0, 0, s, 0, 0, 0, 0, 0, 1)
}
/** px per metre east, south and up — the board map's own (worldToCSS / paintedToCSS / flatAffine) */
export function boardScale(A) {
  const e = A.elements
  return { east: Math.hypot(e[0], e[1], e[2]), up: Math.hypot(e[4], e[5], e[6]), south: Math.hypot(e[8], e[9], e[10]) }
}
/** the billboards' correction: a board px south is this much of one east, so a standee drawn in board px is squeezed
    south by it to stand true (CSS var --aniso; 1 on a board with no 3D scene) */
export const anisoOf = A => { const s = boardScale(A); return s.south / s.east }

const PSWAP = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1)   // (east, up, south) -> (east, south, up)
const FLIP = new THREE.Matrix4().makeScale(1, -1, 1)                                     // screen y runs down; the camera's up

/** the camera for a pose: a real PerspectiveCamera (position, orientation, lens) — `out` is updated when given */
export function orbitCamera(A, pose, viewport, out = new THREE.PerspectiveCamera()) {
  const { east, up } = boardScale(A)
  if (!(viewport.w > 0 && viewport.h > 0) || ![pose.x, pose.y, pose.yaw, pose.tilt, pose.zoom].every(Number.isFinite) || !(pose.zoom > 0))
    throw new Error('orbit camera: invalid pose or viewport')
  if (Math.abs(up - east) > 1e-6 * east) throw new Error('orbit camera: the board map scales height unlike east')
  const focus = new THREE.Vector3(pose.x, pose.y, 0).applyMatrix4(A.clone().invert())
  const dist = LENS / (pose.zoom * east)                                                 // metres from the eye to the focus
  const R = new THREE.Matrix4().makeRotationX(pose.tilt * DEG).multiply(new THREE.Matrix4().makeRotationZ(pose.yaw * DEG))
  const view = new THREE.Matrix4().makeTranslation(0, 0, -dist).multiply(FLIP).multiply(R).multiply(PSWAP)
    .multiply(new THREE.Matrix4().makeTranslation(-focus.x, -focus.y, -focus.z))
  const world = view.clone().invert(), scale = new THREE.Vector3()
  world.decompose(out.position, out.quaternion, scale)
  out.up.set(0, 1, 0)
  out.userData.focus = focus; out.userData.dist = dist; out.userData.pose = { ...pose }
  lens(out, viewport)
  out.updateMatrixWorld(true)
  return out
}
/** the lens for a viewport: the 2600 px perspective as a vertical field of view; near and far around the board */
export function lens(camera, viewport) {
  const dist = camera.userData.dist
  camera.fov = 2 * Math.atan(viewport.h / 2 / LENS) / DEG
  camera.aspect = viewport.w / viewport.h
  camera.near = Math.max(.05, dist / 50); camera.far = dist * 40
  camera.updateProjectionMatrix()
  camera.userData.viewport = { w: viewport.w, h: viewport.h }
  return camera
}
/** the stage's CSS matrix (column-major, for matrix3d with transform-origin 0 0 0): board px -> the board wrap's px,
    through the camera. The stage is laid out centred in the wrap (left/top 50%, margins minus half its size), so the
    wrap's centre — the lens's axis — is the stage's (w/2, h/2). CSS z keeps the eye's depth order (nearer is larger). */
export function stageMatrix(A, camera, board) {
  camera.updateMatrixWorld(true)
  const k = LENS / camera.userData.dist                                                  // px per metre at the focus
  const persp = new THREE.Matrix4(); persp.elements[11] = -1 / LENS
  return new THREE.Matrix4().makeTranslation(board.w / 2, board.h / 2, 0).multiply(persp)
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, LENS)).multiply(new THREE.Matrix4().makeScale(k, -k, k))
    .multiply(camera.matrixWorldInverse).multiply(A.clone().invert()).elements.slice()
}
export const matrix3d = m => 'matrix3d(' + m.map(x => { const v = +x.toPrecision(14); return Object.is(v, -0) ? 0 : v }).join(',') + ')'

/** a board point (px; z up, as the stage's translateZ) as the camera shows it, in the wrap's px. `ahead` is false for a
    point behind the eye (its x, y then point the way it lies) */
export function screenOf(A, camera, x, y, z = 0) {
  const p = new THREE.Vector3(x, y, z).applyMatrix4(A.clone().invert())
  const c = p.clone().applyMatrix4(camera.matrixWorldInverse), vp = camera.userData.viewport
  const n = p.project(camera), ahead = c.z < 0
  const s = ahead ? 1 : -1
  return { x: (s * n.x + 1) / 2 * vp.w, y: (1 - s * n.y) / 2 * vp.h, ahead }
}
/** the pointer's ray (a point in the wrap's px) in board px: origin and direction (z up) */
export function boardRay(A, camera, px, py) {
  const vp = camera.userData.viewport, nx = 2 * px / vp.w - 1, ny = 1 - 2 * py / vp.h
  camera.updateMatrixWorld(true)
  const a = new THREE.Vector3(nx, ny, -1).unproject(camera).applyMatrix4(A), b = new THREE.Vector3(nx, ny, 1).unproject(camera).applyMatrix4(A)
  return { o: a, d: b.sub(a) }
}
/** RAYCAST AGAINST THE BOARD (not the CSS plane): what is under the pointer — the nearest along the ray of every unit's
    body (an upright cylinder on its feet, as tall as its figure) and every hex's top at its display height (the board's
    hex, a pointy hex of the cell's width and height). Units: {id, x, y, z, r, h}; hexes: {hex, x, y, z}; cell {W, H}.
    aniso: the board's south/east px ratio, so a body is round in the world, not in board px. Returns {unit, hex} or null. */
export function pickBoard(ray, hexes, units, cell, aniso = 1) {
  const { o, d } = ray, k = 1 / aniso
  let best = null
  const take = (t, hit) => { if (t >= 0 && (!best || t < best.t - 1e-9 || (Math.abs(t - best.t) <= 1e-9 && (hit.r2 ?? 0) < (best.r2 ?? 0)))) best = { t, ...hit } }
  for (const u of units) {
    /* the body in iso px (south scaled to east's length): the circle x² + y² = r² about the feet, between z and z + h */
    const ox = o.x - u.x, oy = (o.y - u.y) * k, dx = d.x, dy = d.y * k
    const a = dx * dx + dy * dy, b = 2 * (ox * dx + oy * dy), c = ox * ox + oy * oy - u.r * u.r
    if (a > 1e-12) { const D = b * b - 4 * a * c
      if (D >= 0) for (const t of [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)]) { const z = o.z + t * d.z; if (z >= u.z && z <= u.z + u.h) { take(t, { unit: u.id, hex: u.hex }); break } } }
    if (Math.abs(d.z) > 1e-12) for (const zc of [u.z + u.h, u.z]) { const t = (zc - o.z) / d.z, x = ox + t * dx, y = oy + t * dy; if (x * x + y * y <= u.r * u.r) take(t, { unit: u.id, hex: u.hex }) }
  }
  if (Math.abs(d.z) > 1e-12) for (const h of hexes) {
    const t = (h.z - o.z) / d.z, x = Math.abs(o.x + t * d.x - h.x), y = Math.abs(o.y + t * d.y - h.y)
    if (x <= cell.W / 2 && y <= cell.H / 2 - cell.H * x / (2 * cell.W)) take(t, { unit: null, hex: h.hex, r2: x * x + y * y })
  }
  return best ? { unit: best.unit, hex: best.hex } : null
}
