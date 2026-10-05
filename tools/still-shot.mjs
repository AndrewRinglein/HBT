// A screenshot of a page whose 3D board never stops drawing — viewer.screenshot-time-out-under-load (2026-10-05).
//
// THE CAUSE (measured; viewer SWITCHES.md shotStallCause): the battle screen's 3D scene draws a frame every frame it is asked
// for (requestAnimationFrame; the bodies never stand still), and under software GL — the headless Chrome these tools drive
// (--use-angle=swiftshader) — one frame takes about 1.7 s on an idle machine. A screenshot is drawn by the same pipeline: it
// waits behind the frames already under way and behind every new one the page goes on asking for. Idle that is 7 to 10 s a
// shot; with other suites on the machine each frame is slower and the shot runs past its 30 s limit — though nothing the test
// reads is in the picture.
//
// THE FIX, in two steps, both needed (measured: holding alone leaves the FIRST shot as slow as before — 7.2 s — because the
// frames already under way still have to be drawn; shots taken once the page is still take 2.2 to 2.3 s):
//   1. HOLD the page's frame loop: no new animation frame is handed out (the callbacks asked for meanwhile are kept, in
//      order), so the work ahead of the shot can no longer grow;
//   2. WAIT for the page's own settled signal: frames the helper itself asks for — empty ones — come back slowly while the
//      frames under way are still being drawn and quickly once they are done; two quick ones in a row and the page is still.
// Then the picture is taken, and every kept callback is given back to the browser — the page goes on drawing exactly where
// it stopped. Nothing is skipped, no assertion is touched, and no limit is lengthened. EVERY screenshot the kingdom's tools
// take goes through here (viewer test/viewer.screenshot-time-out-under-load.test.ts refuses a tool that takes one directly).
//
//   import {stillShot,lastStill} from './still-shot.mjs'
//   const ms = await stillShot(page, page, {path})                  // the whole page
//   const ms = await stillShot(page, page.locator('#x'), {path})    // one element
// Returns how long the shot itself took, in milliseconds; lastStill says how long the page took to stand still before it.
//
// THE MEASURE — the same page shot both ways, turn about, so the two are timed on the same machine in the same minute:
//   node tools/still-shot.mjs [BATTLE-SANDBOX.html] [shots each way, default 3]

/** a frame that comes back within this many ms of the one before is a quick one: nothing is being drawn */
export const QUICK_MS = 120
/** the wait for stillness gives up after this long and the picture is taken of the page as it is */
export const SETTLE_LIMIT_MS = 90000
/** what the last stillShot found: how long the page took to stand still, over how many frames, whether it did, and the shot's own time */
export const lastStill = { settleMs: 0, frames: 0, still: true, shotMs: 0 }

/** hold the page's frame loop: no new animation frame is handed out until letGo; a callback cancelled meanwhile stays cancelled */
export async function holdFrames(page) {
  await page.evaluate(() => {
    if (window.__heldFrames) return
    /* the page's own two functions, kept as they are and put back as they were — not copies of them */
    const real = window.requestAnimationFrame, cancel = window.cancelAnimationFrame, held = new Map()
    let next = -1
    window.requestAnimationFrame = cb => { held.set(next, cb); return next-- }
    window.cancelAnimationFrame = id => { if (!held.delete(id)) cancel.call(window, id) }
    const letGo = () => { window.requestAnimationFrame = real; window.cancelAnimationFrame = cancel; delete window.__heldFrames; for (const cb of held.values()) real.call(window, cb) }
    letGo.frame = cb => real.call(window, cb)   // a frame of the browser's own, for the helper's wait — never one of the page's
    window.__heldFrames = letGo
  })
}
/** wait until the held page stands still: its frames under way are drawn. {settleMs, frames, still} */
export async function settle(page, quick = QUICK_MS, limit = SETTLE_LIMIT_MS) {
  return await page.evaluate(([quick, limit]) => new Promise(done => {
    const frame = window.__heldFrames && window.__heldFrames.frame
    if (!frame) return done({ settleMs: 0, frames: 0, still: false })
    const t0 = performance.now(); let last = t0, inRow = 0, frames = 0
    const tick = () => { const now = performance.now(); frames++
      inRow = now - last <= quick ? inRow + 1 : 0; last = now
      if (inRow >= 2) return done({ settleMs: Math.round(now - t0), frames, still: true })
      if (now - t0 > limit) return done({ settleMs: Math.round(now - t0), frames, still: false })
      frame(tick) }
    frame(tick)
  }), [quick, limit])
}
/** give the page its frame loop back: every callback kept while it was held is asked for again, in the order it came — and
    the page is handed back DRAWING: this waits for its next frame, so the first frame after the hold is not spent inside
    whatever the tool does next (a click and a 5 s wait for its answer ran out there in a loaded gate, 2026-10-05). A page
    that was not held is left alone. */
export async function letGo(page) {
  await page.evaluate(() => { if (!window.__heldFrames) return null; window.__heldFrames(); return new Promise(done => window.requestAnimationFrame(() => done(null))) })
}

/** the picture of a still page; `target` is the page or a locator; returns the milliseconds the shot itself took. The frame
    loop is given back whether the shot is taken or fails. */
export async function stillShot(page, target, options = {}) {
  await holdFrames(page)
  try {
    Object.assign(lastStill, await settle(page), { shotMs: 0 })
    const t0 = Date.now()
    await target.screenshot(options)
    lastStill.shotMs = Date.now() - t0
  } finally { await letGo(page) }
  return lastStill.shotMs
}

/* ── the measure, run by hand ── */
if (process.argv[1] && /(^|[\\/])still-shot\.mjs$/.test(process.argv[1])) {
  const { createRequire } = await import('node:module'), { createServer } = await import('node:net'), { spawn } = await import('node:child_process')
  const { resolve, dirname, relative } = await import('node:path'), { fileURLToPath } = await import('node:url'), { mkdirSync } = await import('node:fs')
  const here = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(here, '../..')
  const PAGE = resolve(process.argv[2] ?? 'BATTLE-SANDBOX.html'), N = Number(process.argv[3] ?? 3), OUT = resolve(here, '../scratch/still-shot'); mkdirSync(OUT, { recursive: true })
  const { chromium } = createRequire(resolve(ROOT, 'engine/package.json'))('playwright-core')
  const port = await new Promise((ok, no) => { const s = createServer(); s.on('error', no); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) }) })
  const server = spawn(process.execPath, [resolve(ROOT, 'tools/battle-atlas/serve.mjs'), String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((ok, no) => { let out = ''; const t = setTimeout(() => no(Error('the battle server did not start: ' + out)), 30000); server.stdout.on('data', d => { out += d; if (/Battle Atlas/.test(out)) { clearTimeout(t); ok() } }) })
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`http://127.0.0.1:${port}/${relative(ROOT, PAGE).replace(/\\/g, '/')}?play=encounter.opening.orphanage`)
    await page.waitForFunction(() => window.__sandbox?.session && window.__sandbox.viewer && !window.__sandbox.busy && window.__sandbox.viewer._V?.camera3d, null, { timeout: 180000 })
    await page.waitForFunction(() => !document.querySelector('#terrainLoading'), null, { timeout: 150000 }).catch(() => console.log('  the 3D map was still loading'))
    await page.waitForTimeout(1000)
    /* the page's own time per frame while it draws: from one animation frame to the next, over a few */
    const perFrame = () => page.evaluate(() => new Promise(done => { const at = []; const tick = () => { at.push(performance.now()); if (at.length < 4) requestAnimationFrame(tick); else done(Math.round((at[at.length - 1] - at[0]) / (at.length - 1))) }; requestAnimationFrame(tick) }))
    const frame = await perFrame()
    const running = [], held = [], waits = []
    for (let k = 0; k < N; k++) {
      const t0 = Date.now(); await page.screenshot({ path: resolve(OUT, `running-${k}.png`), timeout: 300000 }); running.push(Date.now() - t0)   // the old way, here only to be timed
      await perFrame()                                                                                                                      // the page drawing again, as a tool finds it
      held.push(await stillShot(page, page, { path: resolve(OUT, `held-${k}.png`), timeout: 300000 })); waits.push(`${lastStill.settleMs} ms over ${lastStill.frames} frames${lastStill.still ? '' : ' (NOT still)'}`)
      await perFrame()
    }
    const mid = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
    console.log(`  the page draws a frame every ${frame} ms (software GL)`)
    console.log(`  frame loop running: the shot took ${running.join(', ')} ms (median ${mid(running)} ms)`)
    console.log(`  frame loop held:    the page stood still after ${waits.join('; ')}`)
    console.log(`  frame loop held:    the shot then took ${held.join(', ')} ms (median ${mid(held)} ms)`)
    console.log(`still-shot: ${N} full-page shots each way on ${relative(ROOT, PAGE).replace(/\\/g, '/')} — median ${mid(running)} ms inside the shot with the frame loop running, ${mid(held)} ms with it held and the page still`)
  } finally { await browser.close(); server.kill() }
}
