/* ── THE TACTICAL CAMERA POLICY (viewer.tactical-camera, 2026-10-01) ─────────────────────────────────────────────────
   Andrew accepted the caravan preview's camera on 2026-10-01 ("Okay, that works well. How do we add this to our game
   visualization?"; ATLAS-COMBAT-INTEGRATION.md "Caravan camera and surroundings: implementation handoff — 2026-10-01")
   and then: "This is a redesign of our camera … We need to redesign the camera." This is that policy, for every board,
   in the viewer's own terms: the pose is board.js's (the board point looked at in board px, the turn, the tilt FROM
   STRAIGHT DOWN, the zoom against the 2600 px lens — camera3d.js). The preview's 40–75° are ELEVATIONS above the ground,
   so tactical tilt runs 15–50°; overhead is tilt 0.

   The preview's 14 m / 55 m distances are not carried over as numbers (the handoff: "translate the policy through the
   viewer's existing board affine/lens and actual character size"): the far limit is the fit of the ORIGINAL board (the
   engine's map, never decoration) at the current turn, tilt and viewport; the near limit is set by a standing figure's
   height on screen. Pure: numbers in, numbers out — no DOM, no THREE. Every look number is viewer SWITCHES
   cameraPolicy. */

/** look numbers (viewer SWITCHES cameraPolicy) */
export const POLICY = Object.freeze({
  START_ELEVATION: 40,          // the initial / Angled view, degrees above the ground
  ELEVATION_MIN: 40,            // tactical: never flatter than the Angled view
  ELEVATION_MAX: 75,            // tactical: never steeper (Overhead is its own toggle)
  WHOLE_ELEVATION: 55,          // Whole map: the board fitted from this angle, unturned (the preview's)
  ANGLE_STEP: 10,               // Lower angle / Raise angle
  TURN_STEP: 90,                // viewer.xcom-camera: the arrow keys (and Q / E) turn a quarter (was 60, one hex side)
  INSPECT_ELEVATION_MIN: 3,     // Inspect: broader exploration
  INSPECT_ELEVATION_MAX: 89,
  DRAG_PX: 5,                   // from Overhead a left drag past it unlocks the tilt (a board click stays 4 px, board.js)
  FIT_MARGIN: 1.08,             // the whole-map fit's breathing room
  INSPECT_FAR: 1.65,            // Inspect may pull back this far beyond the whole-map fit
  FIGURE_SHARE: .5,             // tactical nearest: a standing figure is at most half the view's height
  INSPECT_FIGURE_SHARE: 1,      // Inspect nearest: a figure may fill the view
  PAN_FREEDOM: 1.5,             // how fast the pan bound opens as the camera comes nearer than the fit
  EDGE_ROOM: 60,                // board px the pan may go past the first and last rows (a head above, a name and bars below)
  /* viewer.xcom-camera (engine DECISIONS.md 2026-10-01 'the XCOM-style camera'): one fixed angle and zoom — the Angled view
     at the standard zoom — the wheel looks a little nearer or farther and springs back, the map scrolls at its edges */
  ZOOM_NEAR: 1.8,               // the wheel's nearest, against the standard zoom (was 1.4: "a little bit further", 2026-10-01)
  ZOOM_FAR: .6,                 // the wheel's farthest (was .75)
  ZOOM_REST_MS: 600,            // the wheel still this long: back to the standard zoom
  EDGE_SCROLL_PX: 36,           // the pointer within this of the board's edge scrolls the map that way (was 18)
  EDGE_WINDOW_PX: 14,           // or within this of the screen's edge while it is over the battle (viewer.xcom-camera-tuning)
  EDGE_SCROLL_SPEED: 700,       // board px a second
  /* viewer.camera-no-void (engine DECISIONS.md 2026-10-03 'the camera never shows white space'): the standard zoom is this much
     nearer than the zoom at which the battle area just fills with board, so there is board beyond it on both axes to scroll
     to; the wheel pulls back no farther than that fill (viewer SWITCHES noVoidStandard) */
  FILL_ROOM: 1.25,
})
export const tiltOfElevation = e => 90 - e
export const elevationOfTilt = t => 90 - t
/** tactical tilt limits (degrees from straight down) */
export const TILT = Object.freeze({
  START: tiltOfElevation(POLICY.START_ELEVATION), WHOLE: tiltOfElevation(POLICY.WHOLE_ELEVATION),
  MIN: tiltOfElevation(POLICY.ELEVATION_MAX), MAX: tiltOfElevation(POLICY.ELEVATION_MIN),
  INSPECT_MIN: tiltOfElevation(POLICY.INSPECT_ELEVATION_MAX), INSPECT_MAX: tiltOfElevation(POLICY.INSPECT_ELEVATION_MIN),
})
const DEG = Math.PI / 180
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** the distance (in the box's units) at which a box [east, up, south], centred on the focus, fits the viewport whole —
    every corner inside the frustum (the preview's tactical-camera-math.mjs fitDistance, verbatim in substance).
    fov: the vertical field of view (radians); elevation and yaw in radians. */
export function fitDistance(size, aspect, fov, elevation, yaw, margin = POLICY.FIT_MARGIN) {
  const s = Math.sin, c = Math.cos, dir = [s(yaw) * c(elevation), s(elevation), c(yaw) * c(elevation)]
  const right = [c(yaw), 0, -s(yaw)], up = [-s(yaw) * s(elevation), c(elevation), -c(yaw) * s(elevation)]
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], tan = Math.tan(fov / 2)
  let distance = 0
  for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
    const p = [size[0] * x, size[1] * y, size[2] * z], depth = dot(p, dir)
    distance = Math.max(distance, depth + Math.abs(dot(p, right)) / (tan * aspect), depth + Math.abs(dot(p, up)) / tan)
  }
  return distance * margin
}
/** the zoom that shows the whole original board: the board (iso px, `w` east by `h` south) with a standing figure's room
    (`figure` px) above and below its middle, at this turn and tilt, through the 2600 px lens on this viewport */
export function fitZoom(board, viewport, yaw, tilt, figure, lensPx) {
  const fov = 2 * Math.atan(viewport.h / 2 / lensPx)
  const d = fitDistance([board.w, 2 * figure, board.h], viewport.w / viewport.h, fov, (90 - tilt) * DEG, yaw * DEG)
  return lensPx / d
}
/** the nearest zoom: a standing figure (`figure` board px tall) takes `share` of the view's height — never nearer
    than the fit (a tiny board) */
export const nearZoom = (viewport, figure, share, fit) => Math.max(fit, share * viewport.h / figure)
/** the zoom limits for a stance: tactical [fit, near]; Inspect pulls back further and comes nearer */
export function zoomLimits(stance, fit, viewport, figure) {
  if (stance === 'inspect') return [fit / POLICY.INSPECT_FAR, nearZoom(viewport, figure, POLICY.INSPECT_FIGURE_SHARE, fit)]
  return [fit, nearZoom(viewport, figure, POLICY.FIGURE_SHARE, fit)]
}
/** the tilt limits for a stance (degrees from straight down). viewer.xcom-camera: the tactical camera is one fixed angle,
    the Angled view's ("no tilt") */
export const tiltLimits = stance => stance === 'overhead' ? [0, 0] : stance === 'inspect' ? [TILT.INSPECT_MIN, TILT.INSPECT_MAX] : [TILT.START, TILT.START]
/** the pan bound on one axis: pinned to the middle at the whole-map fit, opening to [min, max] as the camera comes nearer
    (the preview's panLimit, in zoom: distance / maximum = fit / zoom) */
export function panRange(min, max, zoom, fit) {
  const freedom = clamp((1 - fit / zoom) * POLICY.PAN_FREEDOM, 0, 1)
  const middle = (min + max) / 2, half = (max - min) * .5 * freedom
  return [middle - half, middle + half]
}
/** a turn by a step, the short way into (-180, 180] */
export function turned(yaw, step) {
  let y = (yaw + step) % 360; if (y > 180) y -= 360; if (y <= -180) y += 360
  return Math.abs(y) < 1e-9 ? 0 : y
}
