// Presentation-only facts; this fixture is not a battle or a combat proof.
import {it,expect} from 'vitest'
import {burstForecast} from '../src/ui/burst-forecast.js'
it('copies typed packet, terrain and conditional facts without combat arithmetic or unsafe HTML',()=>{
 const facts={centre:92,hexes:[91,92,93],damage:6,heal:2,targets:[{id:0,uid:100,hex:92,damage:6,applied:5,heal:2,shielded:['wall.<img>'],low:['edge.&'],conditional:true,packets:[{id:'p.<script>',source:'profile.&',damageType:'physical',raw:8,absorbed:0,defense:0,mitigationDelta:0,floorAdjustment:0,resisted:0,resolved:6,applied:5,overkill:1,ledger:[{station:525,name:'BURST_COVER',effectId:'edge.&',before:8,after:6,delta:-2}]}]}]} as Parameters<typeof burstForecast>[0]
 const before=JSON.stringify(facts),rendered=burstForecast(facts,[{name:'Hero <img onerror=x>'}])
 expect(JSON.stringify(facts)).toBe(before);expect(rendered.headline).toContain('HP loss 5, healing 2');expect(rendered.headline).toContain('forecast before burst reactions');expect(rendered.headline).toContain('Conditional reactions may change results.')
 expect(rendered.details).toContain('Resolved damage 6');expect(rendered.details).toContain('overkill 1');expect(rendered.details).toContain('BURST_COVER · edge.&amp; · 8 → 6 (-2)')
 expect(rendered.details).toContain('Terrain shielding: wall.&lt;img&gt;');expect(rendered.details).toContain('Low props crossed: edge.&amp;')
 expect(rendered.details).toContain('Conditional:');expect(rendered.details).toContain('does not run triggered effects');expect(rendered.details).not.toContain('<img');expect(rendered.details).not.toContain('<script>')
 expect(rendered.details).not.toMatch(/hit chance|critical chance|block chance/i)
 // Every numeric-looking field is escaped too, even if an imported label is malformed.
 const malformed=structuredClone(facts) as any;malformed.targets[0].packets[0].applied='<img src=x>';malformed.targets[0].packets[0].ledger[0].delta='<script>x</script>'
 const bad=burstForecast(malformed,[]).details;expect(bad).not.toContain('<img');expect(bad).not.toContain('<script>');expect(bad).toContain('&lt;img src=x&gt;');expect(bad).toContain('&lt;script&gt;x&lt;/script&gt;')
})
