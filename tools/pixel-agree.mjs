// viewer.pixel-compare-tests-hold-against-frame-noise (2026-10-06) — do two WAYS of drawing one view give the same picture, on a
// graphics card whose own picture of a still frame is not always the same?
//
// WHAT WAS FOUND (viewer SWITCHES.md, the item's section; measured on the Orphanage, where it is largest): handed the very same
// calls with the very same numbers — every call of a frame on both canvases folded into one number, the same for forty frames
// running — this machine's card (an NVIDIA GeForce through ANGLE on Direct3D 11) gives back one of a few pictures: a handful
// of pixels, always the same ones for a view (six in the Orphanage's opening view, on its ground, its water and its house),
// each one shade of 255 apart, mostly changing together; which picture comes changes from frame to frame, in one frame of
// forty or in one of two. Not the antialiasing (a framebuffer without it does the same), not the shadow, the bodies, the
// batches, the pictures on the pieces or their filtering, not dithering, not the card being hurried (waited for, it does the
// same); the software renderer never does it. It is the card's, and cannot be taken out in the page.
//
// THE RULE: each way is drawn N times, turn about (reference, other, reference, other …), and
//     A PIXEL IS THE OTHER WAY'S DOING ONLY IF NONE OF ITS N DRAWINGS SHOWS A COLOUR THAT ONE OF THE REFERENCE'S N SHOWS THERE.
// A way that draws a pixel differently draws it differently every time, and fails by that pixel — by one shade on one pixel
// of two million; a pixel the card colours two ways is, sooner or later in N drawings, coloured the same way by both. No
// drawing is repeated until it matches: N is fixed, every drawing is counted, and nothing is tolerated — a matching colour
// must be found, exactly. Carried beside the count, as measured: what the card's own noise was in these very drawings — the
// pixels that were not the same in every drawing of the reference way, and by how much; the same of the other way — and the
// pixels in which the FIRST drawing of each way differed (what a compare of one drawing against one would have read).
//
// Why not "every pixel the other way differs in must be one the reference's drawings differed in" (the item's first wording):
// the noise is rare as often as it is common — once in forty frames in one run — so N reference drawings often show none of
// it, and the other way's one off frame would then fail: the same red-one-run-in-some, moved. What that rule would also catch
// and this one does not — a fault in only SOME drawings of the other way — shows here as the other way's own unsteadiness,
// by far more than a shade, and the page tests hold that too.

/**
 * @param A the reference way's drawings: each a list of pictures, one a canvas (Uint8Array, RGBA)
 * @param B the other way's drawings, as many
 * @returns {{differing:number, worst:number, draws:number, firstPair:number, unsteady:number, unsteadyBy:number, otherUnsteady:number, otherUnsteadyBy:number}}
 *   differing — pixels at which no drawing of B shows a colour a drawing of A shows; worst — at such a pixel, how far the
 *   nearest pair of drawings is apart (the largest over them, of 255); firstPair — pixels in which A's first drawing and B's
 *   first differ; unsteady / unsteadyBy — pixels not the same in every drawing of A, and the most one differs from A's first;
 *   otherUnsteady / otherUnsteadyBy — the same of B.
 */
export function agree(A, B) {
  const n = A.length
  if (!n) throw new Error('pixel-agree: no drawing to compare')
  if (B.length !== n) throw new Error('pixel-agree: the two ways must be drawn as many times each (' + n + ' and ' + B.length + ')')
  const canvases = A[0].length
  const words = a => new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2)
  const apart = (a, b, i) => Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]))
  let differing = 0, worst = 0, firstPair = 0
  for (let c = 0; c < canvases; c++) {
    const a = A.map(p => words(p[c])), b = B.map(p => words(p[c])), a0 = a[0], b0 = b[0]
    for (let w = 0; w < a0.length; w++) {
      if (a0[w] === b0[w]) continue
      firstPair++
      let met = false, least = 255
      for (let i = 0; i < n && !met; i++) for (let j = 0; j < n; j++) {
        if (a[i][w] === b[j][w]) { met = true; break }
        const d = apart(A[i][c], B[j][c], w * 4); if (d < least) least = d
      }
      if (!met) { differing++; if (least > worst) worst = least }
    }
  }
  const unsteady = P => {
    let px = 0, by = 0
    for (let c = 0; c < canvases; c++) {
      const p = P.map(x => words(x[c])), p0 = p[0]
      for (let w = 0; w < p0.length; w++) {
        let d = 0
        for (let i = 1; i < n; i++) if (p[i][w] !== p0[w]) { const f = apart(P[0][c], P[i][c], w * 4); if (f > d) d = f }
        if (d) { px++; if (d > by) by = d }
      }
    }
    return { px, by }
  }
  const ra = unsteady(A), rb = unsteady(B)
  return { differing, worst, draws: n, firstPair, unsteady: ra.px, unsteadyBy: ra.by, otherUnsteady: rb.px, otherUnsteadyBy: rb.by }
}
