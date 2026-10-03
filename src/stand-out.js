/* ── THE CHARACTERS STAND OUT (viewer.characters-stand-out, 2026-10-03) ──────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-03 'the characters must stand out from the board' (Andrew): "the characters don't stand out
   enough against the backdrop. They look a little too small on the screen. … And what else can we do to make the characters
   stand out more? We have a very colorful background. Is that part of the problem? Do we need more shadows? I don't know
   what we need." — and, minutes later: "Actually, let's change this to 30% bigger characters, 10% smaller hexes."

   LOOKS TO JUDGE, not defaults: five options, each independent, each off unless the host names it. A host hands the names
   to mountBattleViewer as opts.look (the kingdom's battle page reads them from its query string) and standOut() turns them,
   ONCE, at mount, into the numbers the camera, the bodies, the scene and the board read — an option is never tested in a
   draw call (Law 5): what is off is the number that changes nothing. Pure: names in, numbers out — no DOM, no THREE.
   Every look number is viewer SWITCHES standOut*. What Andrew accepts becomes the default in a later item. */

/** the options, in the order the review page shows them, each with the words that say what it does */
export const LOOKS = Object.freeze({
  size: 'Characters 30% larger, hexes 10% smaller',
  shadows: 'Bodies cast shadows; the patch under the feet darker',
  ground: 'The painted ground a little darker and less saturated',
  rim: 'A thin light rim on each body in its side’s colour',
  disc: 'A side-coloured base disc under every unit',
})
/** look numbers (viewer SWITCHES standOutSize, standOutGround, standOutRim) */
export const STAND_OUT = Object.freeze({
  BOARD: .9,                                             // size: the standard view shows the board at this (hexes 10% smaller)
  BODY: 1.3,                                             // size: a body stands this tall against its present on-screen height
  GROUND: Object.freeze({ value: .8, saturation: .68 }), // ground: the painted scene's brightness and saturation, of 1
  RIM_M: .03,                                            // rim: its width, in scene metres
  RIM_BEHIND_M: .12,                                     // rim: how far behind its own body it is drawn, in scene metres
})
/** the looks a host named, as the numbers the viewer draws with; a name that is no look is refused (Law 1) */
export function standOut(names = []) {
  const on = Object.fromEntries(Object.keys(LOOKS).map(k => [k, false]))
  for (const n of names) { if (!Object.hasOwn(LOOKS, n)) throw new Error(`look "${n}" is not one of ${Object.keys(LOOKS).join(', ')}`); on[n] = true }
  return Object.freeze({
    on: Object.freeze(on),
    boardZoom: on.size ? STAND_OUT.BOARD : 1,             // the standard zoom, against the board's own (camera-no-void's)
    bodyScale: on.size ? STAND_OUT.BODY / STAND_OUT.BOARD : 1,   // a body's stature in the scene: 1.3× on a view at 0.9× is 1.44× against its hex
    shadows: on.shadows,
    ground: on.ground ? STAND_OUT.GROUND : null,
    rim: on.rim ? Object.freeze({ width: STAND_OUT.RIM_M, behind: STAND_OUT.RIM_BEHIND_M }) : null,
    disc: on.disc,
  })
}
/** no look named: the board as it is */
export const NO_LOOK = standOut()
