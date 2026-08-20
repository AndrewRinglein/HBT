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
  execSync('npx tsx tools/export-battle.mts 21 map.thicket 8 > /tmp/replay-test-battle.json', { shell: '/bin/bash' })
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
    expect(html).toContain('"replicate":21')
    expect(html).toContain('"mapId":"map.thicket"')
  })

  it('every token the battle needs is embedded — a Burning Zombie is never invisible', () => {
    for (const t of ['warrior', 'ranger', 'mage', 'zombie', 'zombie-burning']) {
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
  it('regeneration has its own colour and vfx name — never poison-green fallback', () => {
    expect(html).toContain("'status.regeneration':'#7cd9a6'")
    expect(html).toContain("n === 'regeneration' ? 'regen'")
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
