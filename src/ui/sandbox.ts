import {createSandbox,advanceSandbox,sandboxActivationChoices,sandboxChoices,sandboxSwapChoices,previewSandboxChoice,commandSandbox,saveSandbox,restoreSandbox,exportSandbox,type Sandbox,type SandboxConfig,type SandboxChoice,type SandboxSwapOffer} from '../core/sandbox.js'
import {SANDBOX_MAPS,SANDBOX_HEROES,SANDBOX_ENEMIES,SANDBOX_DEFAULT} from '../content/sandbox.js'
import {viewSandbox} from '../view/sandbox.js'
import {createBattleSurface} from './battle-surface.js'
import {burstForecast} from './burst-forecast.js'
import {sandboxTargetingOf} from './sandbox-targeting.js'
import {controllerOf,validateBattleCommand} from '../engine.js'

declare const __BATTLE_VIEW_DATA__:Record<string,unknown>
declare const __BUILD_SHA__:string
declare const __ENGINE_PROVENANCE__:{engineCommit:string;engineDirty:boolean}
const root=document.getElementById('app')!
const escape=(x:unknown)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
let session:Sandbox|null=null,surface:ReturnType<typeof createBattleSurface>|null=null,generation=0,busy=false,fault='',error='',choices:SandboxChoice[]=[],swap:SandboxSwapOffer|null=null,selectedSwap='',selectedAction='',selectedAim='',selectedActor=''
const config:SandboxConfig=structuredClone(SANDBOX_DEFAULT)
root.innerHTML=`<header><h1>Battle Sandbox</h1><p>Command the heroes against AI enemies on an authored battlefield.</p><a href="SLICE.html">Kingdom</a> · <a href="../viewer/BATTLE-VIEWER.html">Battle Viewer</a> · <a href="../assets/battle-atlas/index.html">Battle Atlas</a></header><section id="setup"></section><section id="commands" aria-live="polite"></section><div id="battle"></div><section id="transfer"><h2>Save and replay</h2><p>Save keeps the full battle for resuming. Replay JSON opens in the Battle Viewer.</p><button data-act="save">Save battle</button> <button data-act="resume">Resume saved battle</button> <button data-act="export">Export replay JSON</button> <button data-act="import">Resume pasted save</button><label for="transferText">Battle save / replay JSON</label><textarea id="transferText" rows="5" spellcheck="false"></textarea></section><footer>Kingdom ${escape(__BUILD_SHA__)} · engine ${escape(__ENGINE_PROVENANCE__.engineCommit)}${__ENGINE_PROVENANCE__.engineDirty?' (dirty source)':''}</footer>`
const q=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const options=(rows:readonly {id:string;name:string}[],selected:string)=>rows.map(r=>`<option value="${escape(r.id)}"${r.id===selected?' selected':''}>${escape(r.name)}</option>`).join('')
const attached=(host:HTMLElement,el:HTMLElement)=>root.contains(host)&&host.contains(el)
function changeListener(host:HTMLElement,el:HTMLSelectElement|HTMLInputElement|null,fn:()=>void,phase?:'acting'|'selecting'){
 if(!el)return
 el.addEventListener('change',()=>{if(!attached(host,el)||el.hasAttribute('disabled')||(phase&&(busy||!!fault||session?.ctx.battleCursor?.at!==phase)))return;fn()})
}
function setup(){
 q('setup').innerHTML=`<h2>Field a battle</h2><label>Battlefield <select id="map">${options(SANDBOX_MAPS,config.mapId)}</select></label><label>Seed <input id="seed" type="number" min="0" max="2147483647" value="${config.seed}"></label><div class="rosters"><div><h3>Heroes · standard kits</h3>${config.heroes.map((id,i)=>`<label>Hero ${i+1}<select data-roster="heroes" data-index="${i}">${options(SANDBOX_HEROES,id)}</select></label>`).join('')}<button data-act="hero-add">Add hero</button> <button data-act="hero-remove">Remove last</button></div><div><h3>Enemies</h3>${config.enemies.map((id,i)=>`<label>Enemy ${i+1}<select data-roster="enemies" data-index="${i}">${options(SANDBOX_ENEMIES,id)}</select></label>`).join('')}<button data-act="enemy-add">Add enemy</button> <button data-act="enemy-remove">Remove last</button></div></div><button data-act="start">Start configured battle</button> <button data-act="reset">Reset current battle</button><p>1–6 heroes, 1–15 enemies. Changing this form affects the next Start. Choose each remaining hero before their activation.</p>`
 changeListener(q('setup'),q<HTMLSelectElement>('map'),()=>{config.mapId=q<HTMLSelectElement>('map').value})
 changeListener(q('setup'),q<HTMLInputElement>('seed'),()=>{config.seed=Number(q<HTMLInputElement>('seed').value)})
 root.querySelectorAll<HTMLSelectElement>('[data-roster]').forEach(el=>changeListener(q('setup'),el,()=>{config[el.dataset.roster as 'heroes'|'enemies'][Number(el.dataset.index)]=el.value}))
 bind(q('setup'))
}
const actionKey=(c:SandboxChoice)=>c.command.actionId+'|'+c.command.slot
// V2 R2 (2026-09-23): the engine's hitChance is conditional accuracy; Block and the overall
// connection are its own preview fields (V2-HANDOFF.md). Labels: SWITCHES.md blockForecastWording.
const previewLabels:Record<string,string>={blockChance:'Block chance',hitChance:'Hit chance if not blocked',connectionChanceBps:'Chance to connect',damageOnHit:'Damage on hit',damageOnCrit:'Damage on critical hit',damageOnCritChart:'Damage on chart-only critical',critChance:'Critical chance',damage:'Damage',heal:'Healing',healingApplied:'Healing applied',protection:'Protection',selfDamage:'Damage to self',selfDamageApplied:'Self HP loss',thornsOnHit:'Thorns back to the attacker on hit'}
// v2.thorns (engine 88064ac): preview().thornsOnHit is 0 on every unthorned target; said only when it bites.
const QUIET_ZERO=new Set(['thornsOnHit'])
const PERCENT=new Set(['blockChance','hitChance','critChance'])
/** basis points as a percent, by moving the decimal point in the engine's own digits — no arithmetic */
const bpsPct=(bps:number)=>{const s=String(bps).padStart(3,'0'),f=s.slice(-2).replace(/0+$/,'');return s.slice(0,-2)+(f?'.'+f:'')}
const shown=(key:string,v:number)=>key==='connectionChanceBps'?bpsPct(v)+'%':PERCENT.has(key)?v+'%':String(v)
function forecast(p:Record<string,unknown>){
 return 'Current-state forecast: '+Object.keys(previewLabels).filter(key=>typeof p[key]==='number'&&!(QUIET_ZERO.has(key)&&p[key]===0)).map(key=>previewLabels[key]+': '+shown(key,p[key] as number)).join(' · ')
}
function packetDetails(p:Record<string,unknown>){
 const parts:string[]=[]
 for(const [key,label] of [['packetsOnHit','On hit packets'],['packetsOnCrit','On critical packets'],['packetsOnCritChart','On chart-only critical packets']]){
  const rows=p[key!];if(!Array.isArray(rows)||!rows.length)continue
  parts.push('<p>'+escape(label+': '+rows.map(row=>`${row.id} · ${row.damageType} · raw ${row.raw} · absorbed ${row.absorbed} · defense ${row.defense} · resolved ${row.resolved} · HP ${row.applied} · overkill ${row.overkill}`).join('; '))+'</p>')
 }
 return parts.length?'<details id="packetDetails"><summary>Damage breakdown</summary><p>Current state, before triggered effects. HP and overkill describe that forecast.</p>'+parts.join('')+'</details>':''
}
// V2 R6 (2026-09-24): the engine's swap — the hands to hold afterwards, its cost, and when
// there is none to make, the engine's reason (SWITCHES.md sandboxSwapControl). Hidden for a
// hero that carries nothing to swap, while choosing a hero, and for anyone not human-controlled.
function swapControl(selecting:boolean){
 if(!swap||selecting||(!swap.choices.length&&!swap.why))return ''
 const off=busy||!!fault
 return `<label>Swap — hold afterwards <select id="swap"${off||!swap.choices.length?' disabled':''}>${swap.choices.map(c=>`<option value="${escape(JSON.stringify(c.command))}"${JSON.stringify(c.command)===selectedSwap?' selected':''}>${escape(c.label)}</option>`).join('')}</select></label><button data-act="swap"${off||!swap.choices.length?' disabled':''}>Swap (${swap.cost} stamina)</button>${swap.why?`<p id="swapWhy">Swap unavailable: ${escape(swap.why)}</p>`:''} `
}
function controls(){
 surface?.viewer?.setTargeting(null)
 try{choices=session&&!fault?sandboxChoices(session):[];swap=session&&!fault?sandboxSwapChoices(session):null}catch(e){fault=(e as Error).message;error=fault;busy=false;choices=[];swap=null}
 if(!swap?.choices.some(c=>JSON.stringify(c.command)===selectedSwap))selectedSwap=swap?.choices[0]?JSON.stringify(swap.choices[0].command):''
 const available=session&&!fault?sandboxActivationChoices(session):[],selecting=session?.ctx.battleCursor?.at==='selecting'
 if(!available.some(u=>String(u.uid)===selectedActor))selectedActor=available[0]?String(available[0].uid):''
 const actor=session?.ctx.battleCursor?.actor,u=actor==null?null:session!.ctx.state.units[actor]
 const actions=[...new Map(choices.map(c=>[actionKey(c),c])).values()]
 if(!actions.some(c=>actionKey(c)===selectedAction))selectedAction=actions[0]?actionKey(actions[0]):''
 const aims=choices.filter(c=>actionKey(c)===selectedAction)
 if(!aims.some(c=>JSON.stringify(c.command)===selectedAim))selectedAim=aims[0]?JSON.stringify(aims[0].command):''
 const choice=aims.find(c=>JSON.stringify(c.command)===selectedAim)
 let burst:ReturnType<typeof burstForecast>|null=null,targeting:ReturnType<typeof sandboxTargetingOf>|null=null
 if(choice&&'centre' in choice.command&&!busy&&!fault&&!selecting&&!session!.ctx.state.outcome){
  try{const preview=previewSandboxChoice(session!,choice.command);burst=burstForecast(preview,session!.ctx.state.units);targeting=sandboxTargetingOf(aims,preview)}catch(e){fault=(e as Error).message;error=fault;busy=false}
 }
 const label=(c:SandboxChoice)=>'destination' in c.command?`Hex ${c.command.destination} (${session!.ctx.geo.colOf(c.command.destination)}, ${session!.ctx.geo.rowOf(c.command.destination)})`:'centre' in c.command?`Centre hex ${c.command.centre} (${session!.ctx.geo.colOf(c.command.centre)}, ${session!.ctx.geo.rowOf(c.command.centre)})`:session!.ctx.state.units[c.command.target]!.name+' · hex '+session!.ctx.state.units[c.command.target]!.hex
 q('commands').innerHTML=`<h2>${session?.ctx.state.outcome?'Battle complete: '+escape(session.ctx.state.outcome):session?`Turn ${session.ctx.state.turn} · ${escape(selecting?'Choose a hero':u?.name??'Resolving battle')}`:'Start a battle to play'}</h2>${error?`<p role="alert">${escape(error)}</p>`:''}${fault?'<p>Battle stopped after an error. Reset or resume a saved battle to continue.</p>':''}${busy&&!fault?'<p>Playing the resolved actions…</p><button data-act="skip">Show current state</button>':''}${session&&!session.ctx.state.outcome?`${selecting?`<label>Remaining heroes <select id="actor"${busy||fault?' disabled':''}>${available.map(u=>`<option value="${u.uid}"${String(u.uid)===selectedActor?' selected':''}>${escape(u.name)} · hex ${u.hex}</option>`).join('')}</select></label><button data-act="select"${busy||fault||!available.length?' disabled':''}>Activate hero</button>`:''}<label>Action <select id="action"${busy||fault||selecting?' disabled':''}>${actions.map(c=>`<option value="${escape(actionKey(c))}"${actionKey(c)===selectedAction?' selected':''}>${escape(c.name)} · ${c.command.slot} · ${c.cost} stamina</option>`).join('')}</select></label><label>Legal destination / target <select id="aim"${busy||fault||selecting?' disabled':''}>${aims.map(c=>`<option value="${escape(JSON.stringify(c.command))}"${JSON.stringify(c.command)===selectedAim?' selected':''}>${escape(label(c))}</option>`).join('')}</select></label>${targeting&&!fault?'<p>Choose a hex, then Execute.</p>':''}<p id="preview">${busy||fault?'Forecast unavailable while resolving or stopped.':burst?escape(burst.headline):choice?.preview?escape(forecast(choice.preview)):choice&&'destination' in choice.command?'Move along engine path: '+choice.path.join(' → '):selecting?'Choose a remaining hero to begin their activation.':'No legal action available. End this activation to continue.'}</p>${busy||fault?'':burst?burst.details:choice?.preview?packetDetails(choice.preview):''}${swapControl(selecting)}<button data-act="execute"${busy||fault||!choice?' disabled':''}>Execute action</button> <button data-act="end"${busy||fault||selecting?' disabled':''}>End activation</button>`:''}`
 changeListener(q('commands'),q<HTMLSelectElement>('actor'),()=>{selectedActor=q<HTMLSelectElement>('actor').value;controls()},'selecting')
 changeListener(q('commands'),q<HTMLSelectElement>('action'),()=>{selectedAction=q<HTMLSelectElement>('action').value;selectedAim='';controls()},'acting')
 changeListener(q('commands'),q<HTMLSelectElement>('aim'),()=>{selectedAim=q<HTMLSelectElement>('aim').value;controls()},'acting')
 changeListener(q('commands'),q<HTMLSelectElement>('swap'),()=>{selectedSwap=q<HTMLSelectElement>('swap').value;controls()},'acting')
 bind(q('commands'))
 surface?.viewer?.setTargeting(fault?null:targeting)
}
function install(next:Sandbox){
 const epoch=generation+1
 advanceSandbox(next)
 const candidate=createBattleSurface(__BATTLE_VIEW_DATA__,{onHexClick:(hex:number)=>{
  if(epoch!==generation||!session||busy||fault||session.ctx.state.outcome||session.ctx.battleCursor?.at!=='acting')return false
  const actor=session.ctx.battleCursor.actor
  if(actor==null||controllerOf(session.ctx,actor,session.policy)!=='human')return false
  const choice=choices.find(c=>actionKey(c)===selectedAction&&'centre' in c.command&&c.command.centre===hex)
  if(!choice||!validateBattleCommand(session.ctx,session.policy,choice.command).ok)return false
  selectedAim=JSON.stringify(choice.command);controls();return true
 },onDrain:()=>{if(epoch!==generation)return;busy=false;controls()},onError:(e:Error)=>{if(epoch!==generation)return;fault=e.message;error=fault;busy=false;controls()}})
 const staging=document.createElement('div'),view=viewSandbox(next)
 try{candidate.mount(staging,view)}catch(e){candidate.dispose();throw e}
 generation=epoch;surface?.dispose();surface=candidate;session=next;busy=false;fault='';error='';selectedAction='';selectedAim='';selectedActor='';selectedSwap=''
 surface.mount(q('battle'),view);controls()
}
function action(act:string){let mayHaveMutated=false;try{
 error=''
 if(fault&&['select','execute','end','swap','skip','save','export'].includes(act))throw Error('Battle is stopped. Reset or resume a saved battle to continue.')
 if(act==='start')install(createSandbox(config))
 else if(act==='reset'){if(!session)throw Error('Start a battle first');install(createSandbox(session.config))}
 else if(act==='hero-add'||act==='enemy-add'){const key=act==='hero-add'?'heroes':'enemies',max=key==='heroes'?6:15;if(config[key].length>=max)throw Error('Roster limit reached');config[key].push(key==='heroes'?SANDBOX_HEROES[0]!.id:SANDBOX_ENEMIES[0]!.id);setup()}
 else if(act==='hero-remove'||act==='enemy-remove'){const key=act==='hero-remove'?'heroes':'enemies';if(config[key].length<=1)throw Error('Keep at least one unit');config[key].pop();setup()}
 else if(act==='import'||act==='resume'){const data=act==='import'?q<HTMLTextAreaElement>('transferText').value:localStorage.getItem('hbt-sandbox');if(!data)throw Error('No saved battle');install(restoreSandbox(data))}
 else if(act==='skip'){surface?.viewer?.pause();surface?.viewer?.seek(session!.ctx.events.length);busy=false;controls()}
 else {if(!session)throw Error('Start a battle first')
  if(act==='save'){const save=saveSandbox(session);localStorage.setItem('hbt-sandbox',save);q<HTMLTextAreaElement>('transferText').value=save}
  else if(act==='export')q<HTMLTextAreaElement>('transferText').value=JSON.stringify(exportSandbox(session,__ENGINE_PROVENANCE__),null,2)
  else if(act==='select'||act==='execute'||act==='end'||act==='swap'){
   if(busy)throw Error('Wait for the current actions to finish')
   const command=act==='select'?{kind:'select-activation',unitUid:Number(selectedActor),expectedSeq:session.ctx.state.seq}:act==='execute'?JSON.parse(selectedAim):act==='swap'?JSON.parse(selectedSwap):{kind:'end-cycle',actor:session.ctx.battleCursor?.actor,expectedSeq:session.ctx.state.seq}
   const before=session.ctx.events.length;mayHaveMutated=true
   const result=commandSandbox(session,command);if(!result.ok){mayHaveMutated=false;throw Error(result.reason)}
   busy=true;controls();surface!.viewer!.push(session.ctx.events.slice(before));surface!.viewer!.play()
  }
 }
 controls()
 }catch(e){error=(e as Error).message;if(mayHaveMutated){fault=error;busy=false}controls()}}
function bind(host:HTMLElement){host.querySelectorAll<HTMLElement>('[data-act]').forEach(el=>el.addEventListener('click',()=>{if(!attached(host,el)||el.hasAttribute('disabled'))return;action(el.dataset.act!)}))}
bind(q('transfer'));setup();controls()
// A read-only integration handle for the built-page smoke; commands still use UI listeners.
Object.defineProperty(window,'__sandbox',{value:{get session(){return session},get busy(){return busy},get fault(){return fault},get viewer(){return surface?.viewer},get generation(){return generation}}})
