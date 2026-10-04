// kingdom.page-test-strong-party — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'no testing that the battles can be won until
// these items are done; the page tests play an overpowered party; faster landing': "I'm okay forgoing all testing battle
// until we're done with all these items. Right now, I'm doing more views or experience testing. So we can just skip all
// testing battles that aren't just done from a quality standpoint." · "Go ahead, overpowered power party.").
//
// Expect: "The opening page tests pass on any run seed without a seed search: `node tools/opening-run-six.verify.mjs` plays
// all six battles to a win on the first seed tried, in well under a minute, with every flow assertion intact; changing a
// hero's kit or an enemy's row no longer needs new seeds; the skipped can-the-computer-win tests are listed by name with
// the ruling."
//
// The method is tools/opening-page.mjs playedOut: a battle the page test means to win is the run's own battle with the
// party made overpowered FOR THE TEST ONLY (unit mods on the party's heroes through the engine's per-hero seam,
// BattleOptions.heroMods), played once by the engine's AI on the Engagement's own seed; a battle it means to lose is the
// party held idle and cut at Turn 1 (the turn cap). The save pasted into the page is still the run's own battle to the
// page: its config — the encounter, the heroes, their Hero rows — is untouched.
import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, performFieldOpeningBattle, listDraftOffers, performOpeningDeploy } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { performAdvancePrep } from '../src/core/prep.js'
import { createSandbox, restoreSandbox, sandboxResult, type SandboxConfig } from '../src/core/sandbox.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { encounterDef } from '../src/engine.js'

const DRIVER = ['tools/opening-page.mjs', 'tools/opening-run-six.verify.mjs', 'tools/opening-loop-three.verify.mjs', 'tools/abbotown-map.verify.mjs']
type Played = { save: string; result: ReturnType<typeof sandboxResult>; how: string; seed: number }
type Driver = { playedOut: (config: SandboxConfig, won: boolean) => Played; STRONG_PARTY: { source: string; stats: Record<string, number> }; HELD_PARTY: { source: string; stats: Record<string, number>; turnCap: number } }
const driver = (): Promise<Driver> => import('../tools/opening-page.mjs' as string) as Promise<Driver>

/** The Orphanage as a run fields it: the first hero drafted, sent, the battle begun — the config the page's session holds. */
function orphanageConfig(seed: number): SandboxConfig {
  const ctx = makeCtx(makeNewCampaign(seed))
  performAdvanceOpening(ctx, 'test')
  performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  const id = ABBOTOWN_MAP.sections[0]!.encounterId
  performFieldOpeningBattle(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  performOpeningDeploy(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const e = ctx.campaign.cursor.engagement!
  return { mapId: e.mapId, heroes: [...e.deployed], heroRows: e.deployed.map((h) => structuredClone(ctx.campaign.roster[h]!)), enemies: [], seed: e.seed, encounterId: e.id }
}
const modsOf = (save: string) => (JSON.parse(save) as { setup: { heroMods?: ({ stats?: { stat: string; add: number; source: string }[] } | null)[]; cfg?: { turnCap?: number } } }).setup

describe('kingdom.page-test-strong-party — the opening page tests settle each battle deliberately, with no seed sought', () => {
  it('the driver keeps no table of seeds and runs no search: one battle is played for each battle settled', () => {
    for (const file of DRIVER) {
      // the code, comments set aside (the dated notes say what stood there)
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code, `${file}: no table of known seeds`).not.toMatch(/\b(KNOWN|FOUND|HOME)\b/)
      expect(code, `${file}: no loop over seeds`).not.toMatch(/for\s*\([^)]*\bseed\b[^)]*;/)
      expect(code, `${file}: no count of seeds to try`).not.toMatch(/\bseeds\s*[:=]/)
      expect(code, `${file}: no scripted 'hold' or 'press' play`).not.toMatch(/'hold'|'press'/)
    }
    const page = readFileSync('tools/opening-page.mjs', 'utf8')
    expect(page).toContain('export function playedOut(config,won){')
    expect(page, 'a battle that does not end as meant stops the driver — it is not searched around').toMatch(/throw Error\(`\$\{config\.encounterId\} on seed \$\{config\.seed\}: meant to be/)
  })

  it('a battle meant to be won: the run\'s own party, overpowered for the test only, wins the one battle played with nobody hurt — and the page takes its save as that battle', async () => {
    const { playedOut, STRONG_PARTY } = await driver()
    for (const seed of [3, 11, 15]) {
      const config = orphanageConfig(seed), before = structuredClone(config)
      const won = playedOut(config, true)
      expect(won.result.outcome, `run seed ${seed}`).toBe('heroClear')
      expect(won.seed, 'on the Engagement\'s own seed — the first and only battle played').toBe(config.seed)
      const party = won.result.units.filter((u) => u.side === 'hero' && u.role === undefined)
      expect(party.map((u) => [u.lifeState, !!u.downed, !!u.stood]), 'nobody of the party dead, down or wounded').toEqual(party.map(() => ['standing', false, false]))
      // the save's config is the run's own battle, untouched: the encounter, the heroes, their Hero rows, the seed
      const saved = JSON.parse(won.save) as { config: SandboxConfig }
      expect(config, 'the driver does not touch the config it is handed').toEqual(before)
      expect(saved.config).toEqual(before)
      // the page's own import takes it (core/sandbox.ts restoreSandbox, unchanged), finished and won
      const back = restoreSandbox(won.save)
      expect(back.ctx.state.outcome).toBe('heroClear')
      expect(back.config).toEqual(before)
      expect(sandboxResult(back).outcome).toBe('heroClear')
      // what differs is the setup's per-hero mods, and they name their source: the test's, on every hero of the party
      for (const m of modsOf(won.save).heroMods!) {
        for (const [stat, add] of Object.entries(STRONG_PARTY.stats)) expect(m!.stats, `${stat} +${add} from ${STRONG_PARTY.source}`).toContainEqual({ stat, add, source: STRONG_PARTY.source })
      }
      // … and never the page's own fielding: the battle a player's run fields carries no such mod
      const own = createSandbox(before)
      expect(JSON.stringify(own.setup.heroMods ?? [])).not.toContain(STRONG_PARTY.source)
      expect(own.ctx.events.some((e) => e.type === 'unit.modified' && e['source'] === STRONG_PARTY.source)).toBe(false)
    }
  })

  it('a battle meant to be lost: the party held idle and the battle cut at Turn 1 — lost, nobody hurt, and the page takes its save as that battle', async () => {
    const { playedOut, HELD_PARTY } = await driver()
    for (const seed of [3, 11, 15]) {
      const config = orphanageConfig(seed)
      const lost = playedOut(config, false)
      expect([lost.result.outcome, lost.result.turns], `run seed ${seed}`).toEqual(['capped', HELD_PARTY.turnCap])
      const party = lost.result.units.filter((u) => u.side === 'hero' && u.role === undefined)
      expect(party.map((u) => [u.lifeState, !!u.downed, !!u.stood])).toEqual(party.map(() => ['standing', false, false]))
      expect(modsOf(lost.save).cfg?.turnCap).toBe(1)
      const back = restoreSandbox(lost.save)
      expect(back.ctx.state.outcome).toBe('capped')
      expect(back.config).toEqual(config)
    }
  })

  // Law 10, 2026-10-04 (kingdom.opening-replay-rules; engine DECISIONS.md 2026-10-03 '… a lost battle pays no XP; a replay
  // rolls new dice'): this test was titled '… eight battles settled …' and held
  //   // six won, and two lost first (battle 2 and battle 6): each line names the Engagement's own seed — none found
  //   expect(settled.length, `run seed ${seed}: eight battles settled`).toBe(8)
  //   expect(settled.filter((l) => / lost: the party held idle, cut at Turn 1 — capped on Turn 1/.test(l)).length).toBe(2)
  // The six-battle run now loses the Orphanage first too (a lost Orphanage pays no XP and is replayed on new dice), so
  // nine battles are settled, three of them lost first. Each is still the one battle played on the Engagement's own seed
  // — a replay's seed is the one the Campaign gives that replay, never one found.
  it('the six-battle page test passes on other run seeds with nothing sought: nine battles settled, each the one battle played, in well under a minute', () => {
    for (const seed of ['3', '15']) {
      const at = Date.now()
      const run = spawnSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, RUN_SIX_SEED: seed } })
      const took = Date.now() - at
      expect(run.status, `run seed ${seed}: ${run.stderr.split('\n').filter((l) => /Error/.test(l)).slice(0, 2).join(' | ')}`).toBe(0)
      expect(run.stdout).toMatch(/opening run six: .*passed/)
      const settled = run.stderr.split('\n').filter((l) => l.startsWith('settled battle '))
      // six won, and three lost first (battles 1, 2 and 6): each line names the Engagement's own seed — none found
      expect(settled.length, `run seed ${seed}: nine battles settled`).toBe(9)
      for (const line of settled) expect(line).toMatch(/the Engagement's own seed \d+$/)
      expect(settled.filter((l) => / lost: the party held idle, cut at Turn 1 — capped on Turn 1/.test(l)).length).toBe(3)
      expect(settled.filter((l) => /the strong party, the engine's AI — heroClear/.test(l)).length).toBe(6)
      expect(took, `run seed ${seed}: ${took} ms`).toBeLessThan(60000)
    }
  }, 180000)

  it('the three-battle page test and the map page test are settled the same way', () => {
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, LOOP_THREE_SEED: '5' } })
    expect(three).toMatch(/opening loop three: .*passed/)
    const map = execFileSync(process.execPath, ['tools/abbotown-map.verify.mjs', 'BATTLE-SANDBOX.html', 'PLAY.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(map).toMatch(/abbotown map: .*passed/)
  }, 120000)
})
