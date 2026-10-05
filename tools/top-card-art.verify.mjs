// kingdom.lumberjack-wife-top-card-art — reported 2026-10-05 (Andrew, engine DECISIONS.md 'playtest post, two more reports':
// "The lumberjack wife in battle 2, in the top card, just has LW and not her art, when there clearly is her art.").
//
// On the BUILT battle screen, each of the six opening battles as PLAY.html opens it (BATTLE-SANDBOX.html?play=<encounter>):
// every card in the top bar shows the art the page was built with for that unit's type (the viewer's art manifest), and no
// card is the lettered ART PENDING standee while art for that unit exists — its own body on the board (the viewer's
// character-model pack). A unit with no art at all is named, not failed: that is an art need.
//
//   node tools/top-card-art.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const art=JSON.parse(readFileSync('../viewer/generated/art/manifest.json','utf8')).artmap
const bodies=JSON.parse(execFileSync(process.execPath,['../viewer/tools/character-models.mjs','--json'],{encoding:'utf8',maxBuffer:1<<24}))
const OPENING=['encounter.opening.orphanage','encounter.opening.lumberjack','encounter.opening.bridge','encounter.opening.cavern-trail','encounter.opening.gates','encounter.opening.cathedral']
const WIFE='hero.fixed.lumberjacks-wife'
const lettered=row=>!row||row.token.startsWith('ph-')
const noArt=new Set(),seen=new Set();let cards=0,wife=null
for(const encounter of OPENING){
 const {w}=bootSlice(page,{search:'?play='+encounter}),h=w.__sandbox
 for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20)
 assert.equal(h.fault,'',encounter+': no fault')
 const V=h.viewer._V,chips=V.dom.rail.querySelectorAll('.railchip')
 assert.ok(chips.length>0,encounter+': the top bar has cards')
 for(const chip of chips){
  const u=h.session.ctx.state.units[+chip.dataset.i],row=art[u.typeId],shown=chip.querySelector('img').getAttribute('src')
  cards++;seen.add(u.typeId)
  /* the card shows the page's own art for this unit's type — the manifest's token, or the ART PENDING standee where the manifest has no row */
  assert.equal(shown,h.viewer.assets[(row??art._pending).token],`${encounter}: ${u.name}'s top card shows its type's token`)
  if(lettered(row)){
   assert.ok(!bodies[u.typeId],`${encounter}: ${u.name} (${u.typeId}) shows the lettered ART PENDING card in the top bar, though its art exists — its own body stands on the board (${bodies[u.typeId]?.looks[0].model.path})`)
   noArt.add(u.typeId)
  }
  if(u.typeId===WIFE)wife={encounter,name:u.name,token:row.token,shown}
 }
 h.viewer.dispose()
}
assert.ok(wife,'battle 2 fields the Lumberjack\'s Wife');assert.equal(wife.encounter,'encounter.opening.lumberjack')
assert.ok(!wife.token.startsWith('ph-')&&wife.shown.startsWith('data:image/png'),'her top card is her own art')
console.log(`top-card-art: on the built sandbox, the six opening battles — ${cards} top-bar cards of ${seen.size} unit types, each its type's own art; the Lumberjack's Wife shows ${wife.token}; unit types with no art at all, shown as the lettered standee: ${[...noArt].sort().join(', ')||'none'} — passed`)
