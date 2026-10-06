// viewer.attack-row-shows-totals — ruled 2026-10-06 (Andrew, engine DECISIONS.md 'an attack shows its total Accuracy and Crit, not
// the weapon's plus' and 'an attack's numbers: the total alone, no list of what it is made of': "The dagger doesn't show +5
// critical. What happens is the attack shows the total critical. The same thing is true of accuracy." / "We just need to see
// the total.").
//
// On the BUILT battle screen, the page PLAY.html opens for battle 2 (BATTLE-SANDBOX.html?play=encounter.opening.lumberjack):
// as each unit of the player's acts, every attack on its bar shows Accuracy and then Crit, and each is the LIVE ENGINE'S own
// figure for that unit's attack (engine attackFigures, asked of this page's own battle and compared row for row); no row and
// no tooltip names a part of a total ("+5 Crit", "ACC -5 with this attack", a figure beside the damage's stat). The
// Lumberjack's Wife carries the Dagger: her Stab's Crit is the total with the Dagger's 5 in it. Knocked down, her rows'
// Accuracy is the engine's figure for a unit on the floor — a change no line of the log states, which only the engine knows.
// The Dagger's own card still says what the weapon gives.
//
//   node tools/attack-row-shows-totals.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',LUMBERJACK='encounter.opening.lumberjack',STAB='attack.dagger.stab'
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {saveSandbox,restoreSandbox} from './src/core/sandbox.ts';export {applyStatus} from '../engine/src/core/status.ts';export {kdbDownStatus} from '../engine/src/core/kdb.ts';export {grantedActionIds,isAttack} from '../engine/src/core/action.ts';export {attackFigures} from '../engine/src/core/pipeline.ts';export {battleItemCard} from './src/ui/battle-item-card.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))

const {w,root}=bootSlice(page,{search:'?play='+LUMBERJACK}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const row=id=>rows().find(r=>r.dataset.act===id)
const cells=r=>r.querySelectorAll('.acCell').map(c=>[c.querySelector('.k').textContent.trim(),c.querySelector('.v').textContent.trim()])
const cellOf=(r,k)=>(cells(r).find(c=>c[0]===k)||[])[1]
const name=id=>ctx().actions[id]?.name??id
const endActivation=()=>{V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
const acting=()=>ctx().battleCursor?.at==='acting'?ctx().battleCursor.actor:null
/** the engine's own figures for `id`'s attacks, asked of this page's own battle */
const figuresOf=id=>{const c=E.restoreSandbox(E.saveSandbox(h.session)).ctx,u=c.state.units[id],out={};for(const a of E.grantedActionIds(c,u))if(c.actions[a]&&E.isAttack(c.actions[a]))out[a]=E.attackFigures(c,u,c.actions[a]);return out}
const PART=/crit\s*[+\-−]\s*\d|ACC\s*[+\-−]\s*\d|Accuracy\s*[+\-−]\s*\d+(?! Accuracy against)|with this attack|Damage [^(|]*\([^)|]*\s[+\-−]\d/i

/** every attack row of the unit acting, held to the engine; returns what was read */
function readBar(id,label){
 const fig=figuresOf(id),seen=[]
 for(const r of rows()){const a=r.dataset.act;if(!fig[a])continue
  assert.deepEqual(cells(r).map(c=>c[0]).slice(0,2),['ACC','CRIT'],`${label}: ${name(a)} shows Accuracy and then Crit`)
  assert.equal(cellOf(r,'ACC'),String(fig[a].accuracy),`${label}: ${name(a)}'s Accuracy is the engine's figure`)
  assert.equal(cellOf(r,'CRIT'),String(fig[a].crit),`${label}: ${name(a)}'s Crit is the engine's figure`)
  assert.doesNotMatch(r.textContent,PART,`${label}: ${name(a)}'s row names no part of a total`);assert.doesNotMatch(r.getAttribute('title'),PART,`${label}: nor its tooltip`)
  assert.match(r.getAttribute('title'),new RegExp(`Accuracy ${fig[a].accuracy} · Crit ${fig[a].crit} · Range`),`${label}: the tooltip says the same totals`)
  for(const c of r.querySelectorAll('.acCell'))assert.equal(c.getAttribute('title'),null,`${label}: a total says nothing of its own on hover`)
  seen.push(`${name(a)} ${fig[a].accuracy}/${fig[a].crit}`)}
 assert.ok(seen.length>0,`${label}: its bar has attacks`)
 return {fig,seen}
}

settle()
const wife=ctx().state.units.find(u=>u.typeId==='hero.fixed.lumberjacks-wife');assert.ok(wife,'battle 2 fields the Lumberjack\'s Wife')
// every unit of the player's, as it acts this Turn
const read=new Map()
for(let i=0;i<12&&acting()!==null&&!read.has(acting());i++){const id=acting();read.set(id,readBar(id,unit(id).name));endActivation()}
assert.ok(read.size>=2,'more than one of the player\'s units acted: '+read.size)
for(const [id,r] of read)say(`${unit(id).name}: ${r.seen.join(' · ')} (Accuracy/Crit, the engine's)`)

// the Dagger: its 5 is in Stab's Crit, and is said nowhere on the row
const mine=read.get(wife.id)??(()=>{for(let i=0;i<12&&acting()!==wife.id&&acting()!==null;i++)endActivation();return readBar(wife.id,wife.name)})()
const stab=mine.fig[STAB];assert.ok(stab,'she holds the Dagger\'s Stab')
assert.equal(ctx().actions[STAB].attack.crit,5,'the Dagger\'s Stab is +5 Crit in the engine\'s row')
const plain=Object.entries(mine.fig).find(([a])=>a!==STAB);assert.ok(plain,'and another attack')
assert.equal(stab.crit-plain[1].crit,Math.min(stab.crit,5-(ctx().actions[plain[0]].attack.crit??0)),'Stab\'s Crit total is over her other attack\'s by what the two rows give')

// knocked down: the engine's figure for a unit on the floor — no line of the log says it
{const s=E.restoreSandbox(E.saveSandbox(h.session)),prone=E.kdbDownStatus(s.ctx),zombie=s.ctx.state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing')
 E.applyStatus(s.ctx,wife.id,prone,1,'viewer.attack-row-shows-totals',zombie.id)
 w.document.getElementById('transferText').value=E.saveSandbox(s)
 root.els.find(e=>e.dataset.act==='import').handlers.click();settle()
 for(let i=0;i<12&&acting()!==null&&acting()!==wife.id;i++)endActivation()
 assert.equal(acting(),wife.id,'the Wife acts, knocked down')
 const down=readBar(wife.id,'the Wife, knocked down'),rule=ctx().statuses[prone].prone
 assert.equal(down.fig[STAB].accuracy,stab.accuracy+rule.accuracy,`on the floor her Stab's Accuracy is ${rule.accuracy} from standing: the engine's figure, shown`)
 say(`the Wife knocked down: Stab ${down.fig[STAB].accuracy}/${down.fig[STAB].crit} where it was ${stab.accuracy}/${stab.crit} standing`)}

// the Dagger's own card still says what the weapon gives
const card=E.battleItemCard('item.dagger');assert.ok(card,'the Dagger has a card')
assert.match(String(card).replace(/<[^>]*>/g,' '),/\+\s*5\s*Crit|Crit\w*\s*\+\s*5/i,'the Dagger\'s card still says +5 Crit')
console.log(`attack-row-shows-totals: on the built sandbox (${LUMBERJACK}), every attack row of the ${read.size} units of the player's that acted showed Accuracy then Crit as the live engine's own figures, with no part of a total on a row or in a tooltip; the Wife's Stab carried the Dagger's 5 in its Crit; knocked down her rows showed the engine's figure for the floor; the Dagger's card still says +5 Crit — passed`)
