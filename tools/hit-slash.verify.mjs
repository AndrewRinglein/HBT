// viewer.hit-slash (engine DECISIONS.md 2026-10-03 'an attack's timing … a hit shows a red slash', Andrew: "there's no red slash
// across the target that is part of a hit"; and 'the slash on every damaging hit': "Red slash on every damage"). On the BUILT
// sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage) the heroes stand idle and the page's own End Turn plays each
// Enemy Phase by the board's own clock. Held, per attack of the phase, against the ENGINE's own lines: a Zombie's hit that
// dealt damage draws one slash across the hero it hit — the physical style's red, at the blow (the board's clock), before the
// damage's own line is shown; a miss draws none. What is drawn is read from the board's effects canvas: every layer added
// to it is drawn into a recording context, and a slash is an opaque curved stroke in the style's colour.
// (The bodies, the ranged hits and a hero's hit on a Zombie are ../viewer/tools/hit-slash.test.mjs's; the browser's own
// picture is tools/hit-slash.shot.mjs's.)  Prints one line per Turn and `hit-slash: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,$=id=>V().dom.root.querySelector('#'+id)
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<60000&&(h.busy||i<3);i++)w._flush(16);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
function endTurn(){
 const end=$('playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$('playAsk'),yes=$('playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 settle()
}
/** what a layer strokes at a moment of its time: a slash's body is an opaque curve (moveTo, quadraticCurveTo) */
function bodyOf(draw){
 const strokes=[];let path=[]
 const st={strokeStyle:'',fillStyle:'',lineWidth:1,globalCompositeOperation:'source-over',shadowBlur:0,shadowColor:'',lineCap:'',globalAlpha:1}
 const c=new Proxy(st,{get(t,k){if(k in t)return t[k];if(k==='beginPath')return()=>{path=[]};if(k==='moveTo')return(x,y)=>path.push(['m',x,y]);if(k==='quadraticCurveTo')return(a,b,x,y)=>path.push(['q',x,y])
  if(k==='stroke')return()=>strokes.push({style:t.strokeStyle,blend:t.globalCompositeOperation,width:t.lineWidth,path:[...path]});if(k==='createRadialGradient')return()=>({addColorStop(){}});return()=>{}},set(t,k,v){t[k]=v;return true}})
 try{draw(c,1920,1080,.3,186,[],.016)}catch{return null}
 const b=strokes.filter(s=>s.blend==='source-over'&&s.path.length===2&&s.path[1][0]==='q').sort((p,q)=>q.width-p.width)[0]
 return b?{rgb:/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(b.style).slice(1,4).map(Number),from:b.path[0].slice(1),to:b.path[1].slice(1)}:null
}
settle()
const layers=[],FX=V().fx.FX;assert.ok(FX,'the board has its effects canvas')
const add=FX.add;FX.add=function(dur,draw,sortY){layers.push({dur,draw,clock:V().clock(),hp:Object.fromEntries(Object.values(V().S.U).map(u=>[u.id,u.hp]))});return add.call(this,dur,draw,sortY)}
const dealt=e=>e.packets?e.packets.reduce((s,p)=>s+p.applied,0):e.amount
let hits=0,misses=0,seen=V().impact.log.length
for(let n=0;n<8&&!ctx().state.outcome&&(hits<2||misses<1);n++){
 const turn=ctx().state.turn,l0=layers.length,s0=(V().fx.slashes||[]).length
 endTurn()
 const EV=ctx().events,recs=V().impact.log.slice(seen);seen=V().impact.log.length
 const drawn=layers.slice(l0).map(l=>({...l,body:bodyOf(l.draw)})).filter(l=>l.body),noted=(V().fx.slashes||[]).slice(s0)
 const want=[]
 for(const r of recs){
  const e=EV[r.declared];let dmg=null
  if(r.result==='hit')for(let j=r.outcome+1;j<EV.length&&!['attack.declared','activation.end'].includes(EV[j].type);j++)if(EV[j].type==='damage.applied'&&EV[j].target===e.target&&EV[j].attackId===e.attackId){dmg=EV[j];break}
  if(dmg&&dealt(dmg)>0){want.push({r,e,dmg});hits++}else{misses++;assert.equal(r.slash,false,'a miss (or a hit that dealt nothing): the record says no slash')}
 }
 assert.equal(drawn.length,want.length,`Turn ${turn}: one slash for each hit that dealt damage and no other (${drawn.length} drawn, ${want.length} such hits of ${recs.length} attacks)`)
 assert.equal(noted.length,want.length)
 want.forEach(({r,e,dmg},k)=>{const d=drawn[k],s=noted[k]
  assert.equal(s.id,e.target,'across the unit that was hit');assert.equal(s.type,'phys')
  assert.ok(d.body.rgb[0]>=180&&d.body.rgb[1]<=80&&d.body.rgb[2]<=80,`red: ${d.body.rgb}`)
  const xs=[d.body.from[0],d.body.to[0]].sort((a,b)=>a-b);assert.ok(xs[0]<s.x&&xs[1]>s.x,'from one side of the body to the other')
  assert.ok(Math.abs(d.clock-r.blowAt)<1,`at the blow (the board's clock ${Math.round(d.clock)}, the blow ${Math.round(r.blowAt)})`);assert.equal(r.slash,true)
  assert.equal(d.hp[e.target],dmg.hpAfter+dealt(dmg),'before the damage\'s own line is shown: the slash is part of the hit')})
 say(`Turn ${turn}: ${recs.length} attack${recs.length===1?'':'s'} — ${want.length} hit and dealt damage, ${drawn.length} red slash${drawn.length===1?'':'es'} drawn at the blow${recs.length>want.length?`; ${recs.length-want.length} missed, no slash`:''}`)
}
assert.ok(hits>=2,'Zombies hit heroes in the phases played');assert.ok(misses>=1,'and one missed')
console.log(`hit-slash: ${hits} damaging hits each drew one red slash across its target at the blow, ${misses} misses drew none, on the built sandbox — passed`)
