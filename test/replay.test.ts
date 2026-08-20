// The visual replay rig — export a real battle, assemble the viewer, and prove
// the page carries every effect it claims to show. The battle export runs the
// REAL engine in a child process, so disabling content through the kill-switch
// seam genuinely breaks these tests.
import { beforeAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let html = ''
let battle: { engineCommit: string; events: { type: string; causeId?: string }[] }

beforeAll(() => {
  // Demo seed 21 → 1 on 2026-08-20 (Law 10, written reason): the Beast-pen
  // roster and the status batch changed battle flow, and seed 21 no longer
  // happens to contain a river wash. Seed 1 shows sear 5, heal 7, wash 2 under
  // the new content — the CLAIMS under test (rig assembly, determinism, the
  // events carry the mechanics) are unchanged.
  execSync('npx tsx tools/export-battle.mts 1 map.thicket 8 > /tmp/replay-test-battle.json', { shell: '/bin/bash' })
  execSync('node tools/build-replay.mjs /tmp/replay-test-battle.json /tmp/replay-test.html')
  html = readFileSync('/tmp/replay-test.html', 'utf8')
  battle = JSON.parse(readFileSync('/tmp/replay-test-battle.json', 'utf8'))
}, 30_000)

describe('the replay rig', () => {
  it('assembles a self-contained page from the three committed pieces + one battle', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('const D = ')
    expect(html.length).toBeGreaterThan(400_000) // tokens + hexVFX are inlined
  })

  it('the battle is a seed with its engine commit — a stale replay says so', () => {
    expect(html).toContain(`"engineCommit":"${battle.engineCommit}"`)
    expect(html).toContain('"replicate":1')
    expect(html).toContain('"mapId":"map.thicket"')
  })

  it('every token the battle needs is embedded — a Burning Zombie is never invisible', () => {
    for (const t of ['warrior', 'ranger', 'mage', 'zombie', 'zombie-burning', 'spirit-snake']) {
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
    expect(html).toContain("u.typeId === 'zombie-burning' && u.life === 'standing'")
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
    execSync('npx tsx tools/export-battle.mts 0 test.map.showcase 12 > /tmp/replay-showcase-battle.json', { shell: '/bin/bash' })
    execSync('node tools/build-replay.mjs /tmp/replay-showcase-battle.json /tmp/replay-showcase.html')
    sh = readFileSync('/tmp/replay-showcase.html', 'utf8')
  }, 30_000)

  it('an artless map ships NO art and full engine-derived geometry', () => {
    expect(sh).toContain('"art":null')
    expect(sh).toContain('"terrain.burning"')
    expect(sh).toContain('"terrain.poisoned"')
    expect((sh.match(/"px":/g) ?? []).length).toBe(144)   // 12×12 hexes, generated
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
    execSync('node tools/build-replay.mjs /tmp/replay-showcase-battle.json /tmp/replay-sh-a.html')
    execSync('node tools/build-replay.mjs /tmp/replay-showcase-battle.json /tmp/replay-sh-b.html')
    expect(readFileSync('/tmp/replay-sh-a.html', 'utf8')).toBe(readFileSync('/tmp/replay-sh-b.html', 'utf8'))
  })
})

describe('the replay is an artifact of its inputs — nothing else', () => {
  it('two builds of the same battle are byte-identical', () => {
    execSync('node tools/build-replay.mjs /tmp/replay-test-battle.json /tmp/replay-a.html')
    execSync('node tools/build-replay.mjs /tmp/replay-test-battle.json /tmp/replay-b.html')
    expect(readFileSync('/tmp/replay-a.html', 'utf8')).toBe(readFileSync('/tmp/replay-b.html', 'utf8'))
  })
  it('the page embeds no build timestamp — the engine commit is its only provenance', () => {
    expect(html).not.toMatch(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/)
  })
})
