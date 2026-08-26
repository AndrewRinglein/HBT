// The visual replay rig — export a real battle, assemble the viewer, and prove
// the page carries every effect it claims to show. The battle export runs the
// REAL engine in a child process, so disabling content through the kill-switch
// seam genuinely breaks these tests.
import { beforeAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Scratch paths for the exported battles and built pages.
 *
 * These were hardcoded `/tmp/...` with `{ shell: '/bin/bash' }`, which is a
 * POSIX assumption: Windows has neither, so this whole file failed to load and
 * all 18 of its tests were skipped — silently green on the summary line.
 * `tmpdir()` resolves per platform and the `>` redirect works in both cmd.exe
 * and bash, so the commands themselves are unchanged. Quoted because the
 * Windows temp path contains no spaces today but is not guaranteed not to.
 * Portability only — no assertion in this file was touched (Law 10).
 */
const tmp = (name: string) => join(tmpdir(), name)
const BATTLE = tmp('replay-test-battle.json')
const PAGE = tmp('replay-test.html')
const SHOWCASE_BATTLE = tmp('replay-showcase-battle.json')
const SHOWCASE_PAGE = tmp('replay-showcase.html')

let html = ''
let battle: { engineCommit: string; events: { type: string; causeId?: string }[] }

beforeAll(() => {
  // Demo seed 21 → 1 → 0 across 2026-08-20 (Law 10, reasons written each
  // time): battle flow changes whenever the roster does — beasts, then the
  // Codex cohort. Seed 0 shows sear 4, heal 3, wash 2 under the six-hero
  // party. The CLAIMS under test are unchanged.
  execSync(`npx tsx tools/export-battle.mts 0 map.thicket 8 > "${BATTLE}"`)
  execSync(`node tools/build-replay.mjs "${BATTLE}" "${PAGE}"`)
  html = readFileSync(PAGE, 'utf8')
  battle = JSON.parse(readFileSync(BATTLE, 'utf8'))
}, 30_000)

describe('the replay rig', () => {
  it('assembles a self-contained page from the three committed pieces + one battle', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('const D = ')
    expect(html.length).toBeGreaterThan(400_000) // tokens + hexVFX are inlined
  })

  it('the battle is a seed with its engine commit — a stale replay says so', () => {
    expect(html).toContain(`"engineCommit":"${battle.engineCommit}"`)
    expect(html).toContain('"replicate":0')
    expect(html).toContain('"mapId":"map.thicket"')
  })

  it('every token the battle needs is embedded — a Burning Zombie is never invisible', () => {
    for (const t of ['warrior', 'ranger', 'mage', 'zombie', 'zombie-burning', 'spirit-snake',
      'test-oathblade', 'test-sky-pirate', 'test-dusk-hawk', 'test-air-mage', 'test-lucius', 'test-osric',
      'test-zombie', 'test-zombie-burning']) {
      expect(html, `token ${t}`).toContain(`"${t}":{"w":`)
    }
  })

  it('the seed shows what this batch built: sear, heal, and river wash are IN the events', () => {
    const types = (f: (e: { type: string; causeId?: string }) => boolean) => battle.events.filter(f).length
    expect(types((e) => e.type === 'status.applied' && e.causeId === 'trigger.zombie-burning.sear')).toBeGreaterThan(0)
    expect(types((e) => e.type === 'heal.applied')).toBeGreaterThan(0)
    expect(types((e) => e.type === 'status.reduced' && e.causeId === 'terrain.water')).toBeGreaterThan(0)
  })
})

describe('the viewer speaks the new events', () => {
  it('every landed status has its OWN pip colour and a NAMED vfx style — no silent fallback', () => {
    // Angela 2026-08-20: poison-green and regen-mint were indistinguishable at
    // pip size. One distinct hue per family, and regeneration moved to teal.
    for (const id of ['status.poison', 'status.burn', 'status.regeneration', 'status.bleed',
      'status.stun', 'status.weak', 'status.slow', 'status.protection']) {
      expect(html, id).toMatch(new RegExp(`'${id}':'#[0-9a-f]{6}'`))
    }
    expect(html).not.toContain("'status.regeneration':'#7cd9a6'")   // the old poison-twin mint
    for (const pair of ["stun: 'shadow'", "slow: 'frost'", "weak: 'affliction'", "protection: 'weak'", "bleed: 'bleed'"]) {
      expect(html, pair).toContain(pair)
    }
  })
  it('the new mechanics read as sentences: stun, slow, protection, ground', () => {
    expect(html).toContain('is stunned — the activation is lost')
    expect(html).toContain('is slowed — ')
    expect(html).toContain('absorbed by protection')
    expect(html).toContain('the embers catch')
    expect(html).toContain('the blight seeps')
  })
  it('the river wash, the sear, the resist pop and the heal log line all render', () => {
    expect(html).toContain('the river takes 1 ')
    expect(html).toContain('SEAR — ')
    expect(html).toContain('resist ${e.resisted}')
    expect(html).toContain('halved by burn')
  })
  it('the Burning Zombie carries its ember ring and its display name', () => {
    // endsWith since 2026-08-20: the pack's test-zombie-burning wears the same ring.
    expect(html).toContain("u.typeId.endsWith('zombie-burning') && u.life === 'standing'")
    expect(html).toContain("'Burning Zombie'")
  })
})

describe('the log lives to the RIGHT of the board and scrolls itself', () => {
  // Angela 2026-08-20: "Put the log to the right, and keep the screen in place
  // and let the scrolling of the log move the log text, not expand down."
  it('the main row never wraps — the log column cannot drop below the board', () => {
    expect(html).toMatch(/#main\s*\{[^}]*flex-wrap:\s*nowrap/)
  })
  it('the board gives way on narrow screens — CSS-scaled canvases, pixel space intact', () => {
    expect(html).toContain('stage.style.aspectRatio')
    expect(html).toContain("c.style.width = '100%'")
  })
  it('the event counter reserves its width — the toolbar never wraps mid-play', () => {
    expect(html).toMatch(/id="pos"[^>]*min-width:\s*13\dpx/)
  })
  it('the panel column is pinned and the log scrolls its own text inside it', () => {
    expect(html).toMatch(/aside\s*\{[^}]*position:\s*sticky/)
    expect(html).toMatch(/#log\s*\{[^}]*overflow-y:\s*auto/)
    expect(html).toMatch(/#panels\s*\{[^}]*overflow-y:\s*auto/)
  })
})

describe('the showcase build — engine-derived geometry, never the wrong painting', () => {
  let sh = ''
  beforeAll(() => {
    execSync(`npx tsx tools/export-battle.mts 0 test.map.showcase 12 > "${SHOWCASE_BATTLE}"`)
    execSync(`node tools/build-replay.mjs "${SHOWCASE_BATTLE}" "${SHOWCASE_PAGE}"`)
    sh = readFileSync(SHOWCASE_PAGE, 'utf8')
  }, 30_000)

  it('an artless map ships NO art and full engine-derived geometry', () => {
    expect(sh).toContain('"art":null')
    expect(sh).toContain('"terrain.burning"')
    expect(sh).toContain('"terrain.poisoned"')
    expect((sh.match(/"px":/g) ?? []).length).toBe(256)   // 16×16 hexes, generated (board ruled 2026-08-25)
  })
  it('the legend carries the ground behaviour, derived from the engine tables', () => {
    expect(sh).toContain('end of activation')   // burning/poisoned applies note
    expect(sh).toContain('washes')              // water strip note
  })
  it('ground breathes and statuses stand ON the tokens — the viewer code is present', () => {
    for (const probe of ['drawLiveGround', "'terrain.burning':'#A6431C'", 'status.stun', 'guard-arc', 'stam']) {
      expect(sh, probe).toContain(probe)
    }
  })
  it('two showcase builds are byte-identical — the geometry path is deterministic too', () => {
    const a = tmp('replay-sh-a.html'), b = tmp('replay-sh-b.html')
    execSync(`node tools/build-replay.mjs "${SHOWCASE_BATTLE}" "${a}"`)
    execSync(`node tools/build-replay.mjs "${SHOWCASE_BATTLE}" "${b}"`)
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'))
  })
})

describe('the replay is an artifact of its inputs — nothing else', () => {
  it('two builds of the same battle are byte-identical', () => {
    const a = tmp('replay-a.html'), b = tmp('replay-b.html')
    execSync(`node tools/build-replay.mjs "${BATTLE}" "${a}"`)
    execSync(`node tools/build-replay.mjs "${BATTLE}" "${b}"`)
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'))
  })
  it('the page embeds no build timestamp — the engine commit is its only provenance', () => {
    expect(html).not.toMatch(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/)
  })
})
