import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url))
function run(disabled = '', before = '', body = '') {
  const code = `(async()=>{
    const {UNIT_PACK:pack}=await import('./src/content/generated/pack.ts');
    ${before}
    const content=await import('./src/content/index.ts');
    const {createBattle}=await import('./src/core/setup.ts');
    const {runBattle}=await import('./src/core/battle.ts');
    ${body || `const ctx=createBattle({heroes:['test-warrior'],enemies:['unit.zombie'],mapId:'map.open',replicate:13});
      const result=runBattle(ctx);
      const {createHash}=await import('node:crypto');
      console.log(JSON.stringify({result,hash:createHash('sha256').update(JSON.stringify([ctx.events,ctx.state,ctx.rng.log,result])).digest('hex'),
        present:Object.keys(content.ACTIONS).filter(id=>process.env.CF_DISABLE_IDS.split(',').includes(id)),
        items:Object.keys(content.ITEMS),stormGrant:content.ITEMS['item.lightning-staff'].abilities}));`}
  })().catch(error=>{console.error(error.stack);process.exitCode=1})`
  const result = spawnSync(process.execPath, [tsx, '-e', code], {
    encoding: 'utf8', env: { ...process.env, TSX_DISABLE_CACHE: '1', CF_DISABLE_IDS: disabled },
  })
  return { ...result, data: result.status === 0 ? JSON.parse(result.stdout.trim()) : undefined }
}

describe('authored validation before experimental action filtering', () => {
  it.each(['power.lightning-staff.storm', 'attack.halberd.hack', 'power.holy-symbol.heal'])('keeps an unrelated battle byte-identical with %s absent, without disabling items', id => {
    const baseline = run()
    const disabled = run(id)
    expect(baseline.status, baseline.stderr).toBe(0)
    expect(disabled.status, disabled.stderr).toBe(0)
    expect(disabled.data.hash).toBe(baseline.data.hash)
    expect(disabled.data.result).toEqual(baseline.data.result)
    expect(disabled.data.present).toEqual([])
    expect(disabled.data.items).toEqual(baseline.data.items)
    expect(disabled.data.stormGrant).toContain('power.lightning-staff.storm')
  })

  it('does not invent a disabled action for its real bearer or accept execution', () => {
    const result = run('power.lightning-staff.storm', '', `
      const ctx=createBattle({heroes:['alpha-air-mage'],enemies:['unit.zombie']});
      const {executeAction}=await import('./src/core/commands.ts');
      const before=JSON.stringify([ctx.state,ctx.events,ctx.rng.log]);
      const rejected=executeAction(ctx,{actor:0,actionId:'power.lightning-staff.storm',centre:ctx.state.units[1].hex});
      console.log(JSON.stringify({absent:!ctx.actions['power.lightning-staff.storm'],rejected,unchanged:before===JSON.stringify([ctx.state,ctx.events,ctx.rng.log])}));`)
    expect(result.status, result.stderr).toBe(0)
    expect(result.data).toEqual({ absent: true, rejected: { ok: false, reason: 'action-not-ready' }, unchanged: true })
  })

  it('keeps a scenario requiring an omitted weapon grant invalid at fielding', () => {
    const result = run('attack.halberd.hack', '', `
      let error='';try{createBattle({heroes:['alpha-oathblade'],enemies:['unit.zombie']})}catch(e){error=e.message}
      console.log(JSON.stringify({error}));`)
    expect(result.status, result.stderr).toBe(0)
    expect(result.data.error).toContain("grants 'attack.halberd.hack', which is not a weapon action")
  })

  it.each(['items', 'enchanted'])('unknown authored %s grants still reject even if the unknown ID is disabled', registry => {
    const result = run('power.test-missing-grant', `
      const row=Object.values(pack.${registry}).find(row=>row.abilities.length);
      row.abilities=['power.test-missing-grant'];`)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("grants power 'power.test-missing-grant'")
  })

  it.each(['power.lightning-staff.storm', 'power.move'])('disabled %s cannot conceal a duplicate action profile', id => {
    const result = run(id, `pack.authoredAbilities[${JSON.stringify(id)}]={...Object.values(pack.authoredAbilities)[0],id:${JSON.stringify(id)}};`)
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/duplicate profiles|power AND a movement/)
  })

  it('disabled malformed burst profiles remain authored-content errors', () => {
    const result = run('power.lightning-staff.storm', `pack.authoredBursts['power.lightning-staff.storm'].burst.shape={kind:'unrecognised'};`)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('shape')
  })
})
