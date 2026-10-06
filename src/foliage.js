import * as THREE from 'three'
/* ── THE FOLIAGE DRAWN ONCE (viewer.foliage-drawn-once, 2026-10-05) ───────────────────────────────────────────────────
   The chat's call 2026-10-05 (Andrew, engine DECISIONS.md 2026-10-05 'the computer avoids its own traps; W moves the view up;
   the Wolf's numbers stand; the player moves the summoned Wolf; the foliage is tried the smallest way'): Andrew was asked
   twice how the foliage may change for the last speed item (viewer.scene-drawn-in-few-calls; viewer SWITCHES fewCallsFoliage)
   and did not choose; by his standing word that the chat decides such details, records the switch and reports in a line,
   A — the smallest change to the look — is tried, for him to judge by eye.

   A scene's leaves, needles, grass and bark patches are two-sided blended pieces (857 of the Orphanage's 1,657 pieces, 1,002
   of the Lumberjack House's 1,271). three draws such a piece TWICE — its back faces, then its front faces
   (WebGLRenderer renderObject: `material.transparent === true && material.side === DoubleSide && material.forceSinglePass
   === false`), finding the shader for each half again — and after viewer.solid-pieces-drawn-by-material that is most of a
   frame's draw calls. With the switch on each such piece is drawn ONCE, both faces in one call (three's own
   `forceSinglePass`). NOTHING ELSE about the foliage is changed: still blended, still sorted far to near piece by piece,
   still faded see-through alone (its see-through copy is a copy of its material and is drawn the same way). What changes in
   the picture is only how a clump's own leaves overlap each other: where a piece's front faces and back faces cover the same
   pixel, the back was always drawn first; drawn once, they come in the order the piece's own triangles are stored in.

   THE SWITCH IS ONE WORD: FOLIAGE.ONCE. true — drawn once (the try). false — "drawn twice, as before": no material is
   touched at all, and the page is pixel for pixel what it was (viewer SWITCHES foliageDrawnOnce). A page can be asked for the
   other side while it runs (the driver's V.foliage.once — the tests and tools/frame-cost.mjs draw the same view both ways). */
export const FOLIAGE = Object.freeze({ ONCE: true })

/** is this material one three draws in two passes, a scene's own lit one: blended, two-sided, normally blended, no shader of
    its own (the fires, the ash, the fog and the rims are shaders of their own and are not the foliage) */
export const isFoliage = m => !!m && m.isMaterial === true && !m.isShaderMaterial && m.transparent === true && m.side === THREE.DoubleSide && m.blending === THREE.NormalBlending
const MARK = 'foliage'
/**
 * The scene's foliage, found once (as the scene loads) and switched: `once` true, each piece is drawn in one pass.
 * → { pieces, materials (a Set), once (get/set — set returns nothing; `changed` says whether the last set changed anything),
 *     dispose() (every material as it was made) }.
 * A piece's see-through copy (terrain3d.js seeThrough: `material.clone()`, which carries three's forceSinglePass and the
 * mark) is switched with the rest: every mesh of the group is looked at when the switch is thrown, never while drawing.
 */
export function foliageOf(group, once = FOLIAGE.ONCE) {
  const materials = new Set(); let pieces = 0, now = false
  group.traverse(o => {
    if (!o.isMesh) return
    let mine = false
    for (const m of [].concat(o.material)) if (isFoliage(m) && m.forceSinglePass === false) { materials.add(m); m.userData.foliage = MARK; mine = true } else if (materials.has(m)) mine = true
    if (mine) pieces++
  })
  /* three keeps the shader a material was last drawn with until the material says it changed: drawn twice, that is the front
     faces' — which lights a back face wrongly if both are then drawn with it at once — so every switch says so (needsUpdate) */
  const put = (m, v) => { if (m.forceSinglePass !== v) { m.forceSinglePass = v; m.needsUpdate = true } }
  const set = v => { v = !!v; for (const m of materials) put(m, v)
    group.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m?.userData?.foliage === MARK) put(m, v) }); now = v }
  set(once)
  return { pieces, materials,
    get once() { return now }, set once(v) { if (!!v !== now) set(v) },
    /** how many draws of foliage a pass of this camera makes when each is drawn once (drawn twice it makes twice as many):
        three's own rule for what a pass draws — shown, on a layer the camera sees, in its sight (WebGLRenderer projectObject) —
        counted for the tests and tools/frame-cost.mjs, never while drawing */
    inSight(camera) { camera.updateMatrixWorld(); _proj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _frustum.setFromProjectionMatrix(_proj, camera.coordinateSystem, camera.reversedDepth)
      let n = 0
      const walk = o => { if (o.visible === false) return
        if (o.isMesh && o.layers.test(camera.layers) && (o.frustumCulled === false || _frustum.intersectsObject(o))) {
          const m = o.material
          if (Array.isArray(m)) { for (const g of o.geometry.groups) if (m[g.materialIndex]?.visible && m[g.materialIndex].userData?.foliage === MARK) n++ } else if (m?.visible && m.userData?.foliage === MARK) n++ }
        for (const c of o.children) walk(c) }
      walk(group); return n },
    dispose() { set(false); for (const m of materials) delete m.userData.foliage } }
}
const _proj = new THREE.Matrix4(), _frustum = new THREE.Frustum()
