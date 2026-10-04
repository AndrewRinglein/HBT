// viewer.new-enemy-ability-line (engine DECISIONS.md 2026-10-04 'the opening's tutorial: … new enemies are named …', Andrew: "I
// think when enemies have new mechanics and appear, there should probably be a notification when that enemy is focused on.
// In that notification there should be something like, \"This enemy can do X.\""). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.lumberjack — battle 2, played by its own clock, the heroes idle): the "New
// enemy / Skeleton Archer" notice carries a line beginning "This enemy can" that says it shoots from range, and that line is
// the CONTENT's row, word for word (content/hbt-content.json, the published bestiary) — as every line the page holds is.
// Prints one line per step and `new-enemy-ability-line: … passed`.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const say=(...a)=>console.log('  '+a.join(' '))
const ROWS=Object.fromEntries(JSON.parse(readFileSync(new URL('../../content/hbt-content.json',import.meta.url),'utf8')).bestiary.map(r=>[r.id,r]))
const {w}=bootSlice(page,{search:'?play=encounter.opening.lumberjack'}),h=w.__sandbox
function playing(){
 const seen=[];let last=null
 for(let i=0;i<40000&&(h.busy||i<3);i++){w._flush(20)
  const n=h.viewer?.overlays.notice,key=n?n.lines.join(' / '):null
  if(key&&key!==last)seen.push(n.lines)
  last=key}
 assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')
 return seen
}
const $=id=>h.viewer._V.dom.root.querySelector('#'+id)
function endTurn(){
 const end=$('playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$('playAsk'),yes=$('playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 return playing()
}
// 1. the lines the page holds are the content's rows, every one
const held=h.viewer._V.data.UNIT_LINES
assert.ok(Object.keys(held).length>=16,'the battle screen holds the enemies\' sentences')
for(const [id,line] of Object.entries(held)){assert.equal(line,ROWS[id]?.playerLine,id+': the page\'s line is the published content\'s row');assert.match(line,/^This enemy can /)}
say(`1 the battle screen holds ${Object.keys(held).length} sentences, each the published content's own row`)
// 2. the Zombie on the board, then the Skeleton Archer on Turn 2: each notice's third line is that kind's row
const opening=playing()
assert.deepEqual(opening,[['New enemy','Zombie',ROWS['unit.zombie'].playerLine]],'the Zombie\'s notice carries its sentence')
const t2=endTurn();assert.equal(h.session.ctx.state.turn,2)
assert.equal(t2.length,1);const [a,b,c]=t2[0]
assert.deepEqual([a,b],['New enemy','Skeleton Archer']);assert.equal(c,ROWS['unit.skeletal-archer'].playerLine,'the line is the content\'s row')
assert.match(c,/^This enemy can /);assert.match(c,/shoot/i);assert.match(c,/far|distance|range/i)
say(`2 Turn 2: "${a}" / "${b}" / "${c}"`)
// 3. the notice is what stands on the screen: three lines in the gold notice
const node=h.viewer._V.dom.root.querySelector('#tutNotice');assert.equal(node,null,'and it has gone by itself')
console.log('new-enemy-ability-line: the notice says what the new enemy can do, in the content\'s own words, on the built sandbox — passed')
