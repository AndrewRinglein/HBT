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
//
// THE PICTURES ARE NOT KEPT (found the same day: with all twenty drawings of a compare held at once — 166 MB a compare, three
// compares a view — the tool's page stalled in 2 of 17 runs beside a busy machine). comparer() is handed the drawings one at a
// time, turn about, and keeps the first of each way, where the two first differ (the only pixels the rule has to look at
// again: everywhere else the two ways have already agreed), each later drawing's colours at those pixels alone, and one
// byte a pixel for how unsteady each way has been. A drawing handed in may be drawn over once the call returns.

/**
 * The compare of two ways of drawing one view, fed one drawing at a time: `a(pictures)` a drawing of the reference way,
 * `b(pictures)` one of the other way — turn about, the reference first — each a list of pictures, one a canvas (Uint8Array,
 * RGBA); `done()` the count:
 *   differing — pixels at which no drawing of the other way shows a colour a drawing of the reference shows; worst — at such a
 *   pixel, how far the nearest pair of drawings is apart (the largest over them, of 255); draws — drawings of each way;
 *   firstPair — pixels in which the two first drawings differ; unsteady / unsteadyBy — pixels not the same in every drawing
 *   of the reference, and the most one differs from its first; otherUnsteady / otherUnsteadyBy — the same of the other way.
 * Stands by itself (the tool hands its text to the page).
 */
export function comparer() {
  const words = p => new Uint32Array(p.buffer, p.byteOffset, p.byteLength >> 2)
  const apart = (x, y) => Math.max(Math.abs((x & 255) - (y & 255)), Math.abs((x >>> 8 & 255) - (y >>> 8 & 255)), Math.abs((x >>> 16 & 255) - (y >>> 16 & 255)), Math.abs((x >>> 24) - (y >>> 24)))
  let a0 = null, b0 = null, na = 0, nb = 0, ua = null, ub = null, at = null
  const av = [], bv = []
  /** how far this drawing is from its way's first, kept as the most seen at each pixel */
  const steady = (first, pictures, most) => { for (let c = 0; c < first.length; c++) { const f = first[c], p = words(pictures[c]), m = most[c]
    for (let w = 0; w < f.length; w++) if (p[w] !== f[w]) { const d = apart(p[w], f[w]); if (d > m[w]) m[w] = d } } }
  /** this drawing's colours at the pixels the two first drawings differ in */
  const there = pictures => at.map((list, c) => { const p = words(pictures[c]), out = new Uint32Array(list.length); for (let k = 0; k < list.length; k++) out[k] = p[list[k]]; return out })
  return {
    a(pictures) {
      if (na !== nb) throw new Error('pixel-agree: the two ways are drawn turn about, the reference first')
      na++
      if (!a0) { a0 = pictures.map(p => words(p).slice()); ua = a0.map(x => new Uint8Array(x.length)); return }
      steady(a0, pictures, ua); av.push(there(pictures))
    },
    b(pictures) {
      if (nb !== na - 1) throw new Error('pixel-agree: the two ways are drawn turn about, the reference first')
      nb++
      if (!b0) { b0 = pictures.map(p => words(p).slice()); ub = b0.map(x => new Uint8Array(x.length))
        at = a0.map((x, c) => { const y = b0[c]; let n = 0; for (let w = 0; w < x.length; w++) if (x[w] !== y[w]) n++
          const list = new Uint32Array(n); n = 0; for (let w = 0; w < x.length; w++) if (x[w] !== y[w]) list[n++] = w; return list })
        return }
      steady(b0, pictures, ub); bv.push(there(pictures))
    },
    done() {
      if (!na) throw new Error('pixel-agree: no drawing to compare')
      if (na !== nb) throw new Error('pixel-agree: the two ways must be drawn as many times each (' + na + ' and ' + nb + ')')
      let differing = 0, worst = 0, firstPair = 0
      const A = [], B = []
      for (let c = 0; c < at.length; c++) { const list = at[c]; firstPair += list.length
        for (let k = 0; k < list.length; k++) { const w = list[k]
          A.length = 0; B.length = 0; A.push(a0[c][w]); B.push(b0[c][w])
          for (const v of av) A.push(v[c][k]); for (const v of bv) B.push(v[c][k])
          let met = false, least = 255
          for (let i = 0; i < A.length && !met; i++) for (let j = 0; j < B.length; j++) { if (A[i] === B[j]) { met = true; break } const d = apart(A[i], B[j]); if (d < least) least = d }
          if (!met) { differing++; if (least > worst) worst = least } } }
      const count = most => { let px = 0, by = 0; for (const m of most) for (let w = 0; w < m.length; w++) if (m[w]) { px++; if (m[w] > by) by = m[w] } return { px, by } }
      const ra = count(ua), rb = count(ub)
      return { differing, worst, draws: na, firstPair, unsteady: ra.px, unsteadyBy: ra.by, otherUnsteady: rb.px, otherUnsteadyBy: rb.by }
    },
  }
}

/** the same, of drawings already in hand: A the reference way's, B the other way's, as many */
export function agree(A, B) {
  if (!A.length) throw new Error('pixel-agree: no drawing to compare')
  if (B.length !== A.length) throw new Error('pixel-agree: the two ways must be drawn as many times each (' + A.length + ' and ' + B.length + ')')
  const c = comparer()
  for (let i = 0; i < A.length; i++) { c.a(A[i]); c.b(B[i]) }
  return c.done()
}
