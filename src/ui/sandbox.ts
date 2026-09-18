import {createSandbox,advanceSandbox,sandboxActivationChoices,sandboxChoices,commandSandbox,saveSandbox,restoreSandbox,exportSandbox,type Sandbox,type SandboxConfig,type SandboxChoice} from '../core/sandbox.js'
import {SANDBOX_MAPS,SANDBOX_HEROES,SANDBOX_ENEMIES,SANDBOX_DEFAULT} from '../content/sandbox.js'
import {viewSandbox} from '../view/sandbox.js'
import {createBattleSurface} from './battle-surface.js'

declare const __BATTLE_VIEW_DATA__:Record<string,unknown>
declare const __BUILD_SHA__:string
declare const __ENGINE_PROVENANCE__:{engineCommit:string;engineDirty:boolean}
const root=document.getElementById('app')!
const escape=(x:unknown)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
let session:Sandbox|null=null,surface:ReturnType<typeof createBattleSurface>|null=null,generation=0,busy=false,fault='',error='',choices:SandboxChoice[]=[],selectedAction='',selectedAim='',selectedActor=''
const config:SandboxConfig=structuredClone(SANDBOX_DEFAULT)
root.innerHTML=`<header><h1>Battle Sandbox</h1><p>Command the heroes against AI enemies on an authored battlefield.</p><a href="SLICE.html">Kingdom</a> · <a href="../viewer/BATTLE-VIEWER.html">Battle Viewer</a> · <a href="../assets/battle-atlas/index.html">Battle Atlas</a></header><section id="setup"></section><section id="commands" aria-live="polite"></section><div id="battle"></div><section id="transfer"><h2>Save and replay</h2><p>Save keeps the full battle for resuming. Replay JSON opens in the Battle Viewer.</p><button data-act="save">Save battle</button> <button data-act="resume">Resume saved battle</button> <button data-act="export">Export replay JSON</button> <button data-act="import">Resume pasted save</button><label for="transferText">Battle save / replay JSON</label><textarea id="transferText" rows="5" spellcheck="false"></textarea></section><footer>Kingdom ${escape(__BUILD_SHA__)} · engine ${escape(__ENGINE_PROVENANCE__.engineCommit)}${__ENGINE_PROVENANCE__.engineDirty?' (dirty source)':''}</footer>`
const q=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const options=(rows:readonly {id:string;name:string}[],selected:string)=>rows.map(r=>`<option value="${escape(r.id)}"${r.id===selected?' selected':''}>${escape(r.name)}</option>`).join('')
function setup(){
 q('setup').innerHTML=`<h2>Field a battle</h2><label>Battlefield <select id="map">${options(SANDBOX_MAPS,config.mapId)}</select></label><label>Seed <input id="seed" type="number" min="0" max="2147483647" value="${config.seed}"></label><div class="rosters"><div><h3>Heroes · standard kits</h3>${config.heroes.map((id,i)=>`<label>Hero ${i+1}<select data-roster="heroes" data-index="${i}">${options(SANDBOX_HEROES,id)}</select></label>`).join('')}<button data-act="hero-add">Add hero</button> <button data-act="hero-remove">Remove last</button></div><div><h3>Enemies</h3>${config.enemies.map((id,i)=>`<label>Enemy ${i+1}<select data-roster="enemies" data-index="${i}">${options(SANDBOX_ENEMIES,id)}</select></label>`).join('')}<button data-act="enemy-add">Add enemy</button> <button data-act="enemy-remove">Remove last</button></div></div><button data-act="start">Start configured battle</button> <button data-act="reset">Reset current battle</button><p>1–6 heroes, 1–15 enemies. Changing this form affects the next Start. Choose each remaining hero before their activation.</p>`
 q<HTMLSelectElement>('map').addEventListener('change',e=>{config.mapId=(e.target as HTMLSelectElement).value})
 q<HTMLInputElement>('seed').addEventListener('change',e=>{config.seed=Number((e.target as HTMLInputElement).value)})
 root.querySelectorAll<HTMLSelectElement>('[data-roster]').forEach(el=>el.addEventListener('change',()=>{config[el.dataset.roster as 'heroes'|'enemies'][Number(el.dataset.index)]=el.value}))
 bind(q('setup'))
}
const actionKey=(c:SandboxChoice)=>c.command.actionId+'|'+c.command.slot
const previewLabels:Record<string,string>={hitChance:'Hit chance',damageOnHit:'Damage on hit',damageOnCrit:'Damage on critical hit',damageOnCritChart:'Damage on chart-only critical',critChance:'Critical chance',damage:'Damage',heal:'Healing',healingApplied:'Healing applied',protection:'Protection',selfDamage:'Damage to self',selfDamageApplied:'Self HP loss'}
function forecast(p:Record<string,unknown>){
 return 'Current-state forecast: '+Object.entries(p).filter(([key,v])=>typeof v==='number'&&key in previewLabels).map(([key,v])=>previewLabels[key]+': '+v).join(' · ')
}
function packetDetails(p:Record<string,unknown>){
 const parts:string[]=[]
 for(const [key,label] of [['packetsOnHit','On hit packets'],['packetsOnCrit','On critical packets'],['packetsOnCritChart','On chart-only critical packets']]){
  const rows=p[key!];if(!Array.isArray(rows)||!rows.length)continue
  parts.push('<p>'+escape(label+': '+rows.map(row=>`${row.id} · ${row.damageType} · raw ${row.raw} · absorbed ${row.absorbed} · defense ${row.defense} · resolved ${row.resolved} · HP ${row.applied} · overkill ${row.overkill}`).join('; '))+'</p>')
 }
 return parts.length?'<details id="packetDetails"><summary>Damage breakdown</summary><p>Current state, before triggered effects. HP and overkill describe that forecast.</p>'+parts.join('')+'</details>':''
}
function controls(){
 try{choices=session&&!fault?sandboxChoices(session):[]}catch(e){fault=(e as Error).message;error=fault;busy=false;choices=[]}
 const available=session&&!fault?sandboxActivationChoices(session):[],selecting=session?.ctx.battleCursor?.at==='selecting'
 if(!available.some(u=>String(u.uid)===selectedActor))selectedActor=available[0]?String(available[0].uid):''
 const actor=session?.ctx.battleCursor?.actor,u=actor==null?null:session!.ctx.state.units[actor]
 const actions=[...new Map(choices.map(c=>[actionKey(c),c])).values()]
 if(!actions.some(c=>actionKey(c)===selectedAction))selectedAction=actions[0]?actionKey(actions[0]):''
 const aims=choices.filter(c=>actionKey(c)===selectedAction)
 if(!aims.some(c=>JSON.stringify(c.command)===selectedAim))selectedAim=aims[0]?JSON.stringify(aims[0].command):''
 const choice=aims.find(c=>JSON.stringify(c.command)===selectedAim)
 const label=(c:SandboxChoice)=>'destination' in c.command?`Hex ${c.command.destination} (${session!.ctx.geo.colOf(c.command.destination)}, ${session!.ctx.geo.rowOf(c.command.destination)})`:'centre' in c.command?`Centre hex ${c.command.centre}`:session!.ctx.state.units[c.command.target]!.name+' · hex '+session!.ctx.state.units[c.command.target]!.hex
 q('commands').innerHTML=`<h2>${session?.ctx.state.outcome?'Battle complete: '+escape(session.ctx.state.outcome):session?`Turn ${session.ctx.state.turn} · ${escape(selecting?'Choose a hero':u?.name??'Resolving battle')}`:'Start a battle to play'}</h2>${error?`<p role="alert">${escape(error)}</p>`:''}${fault?'<p>Battle stopped after an error. Reset or resume a saved battle to continue.</p>':''}${busy&&!fault?'<p>Playing the resolved actions…</p><button data-act="skip">Show current state</button>':''}${session&&!session.ctx.state.outcome?`${selecting?`<label>Remaining heroes <select id="actor"${busy||fault?' disabled':''}>${available.map(u=>`<option value="${u.uid}"${String(u.uid)===selectedActor?' selected':''}>${escape(u.name)} · hex ${u.hex}</option>`).join('')}</select></label><button data-act="select"${busy||fault||!available.length?' disabled':''}>Activate hero</button>`:''}<label>Action <select id="action"${busy||fault||selecting?' disabled':''}>${actions.map(c=>`<option value="${escape(actionKey(c))}"${actionKey(c)===selectedAction?' selected':''}>${escape(c.name)} · ${c.command.slot} · ${c.cost} stamina</option>`).join('')}</select></label><label>Legal destination / target <select id="aim"${busy||fault||selecting?' disabled':''}>${aims.map(c=>`<option value="${escape(JSON.stringify(c.command))}"${JSON.stringify(c.command)===selectedAim?' selected':''}>${escape(label(c))}</option>`).join('')}</select></label><p id="preview">${choice?.preview?escape(forecast(choice.preview)):choice?'Move along engine path: '+choice.path.join(' → '):selecting?'Choose a remaining hero to begin their activation.':'No legal action available. End this activation to continue.'}</p>${choice?.preview?packetDetails(choice.preview):''}<button data-act="execute"${busy||fault||!choice?' disabled':''}>Execute action</button> <button data-act="end"${busy||fault||selecting?' disabled':''}>End activation</button>`:''}`
 q<HTMLSelectElement>('actor')?.addEventListener('change',e=>{selectedActor=(e.target as HTMLSelectElement).value;controls()})
 q<HTMLSelectElement>('action')?.addEventListener('change',e=>{selectedAction=(e.target as HTMLSelectElement).value;selectedAim='';controls()})
 q<HTMLSelectElement>('aim')?.addEventListener('change',e=>{selectedAim=(e.target as HTMLSelectElement).value;controls()})
 bind(q('commands'))
}
function install(next:Sandbox){
 const epoch=generation+1
 advanceSandbox(next)
 const candidate=createBattleSurface(__BATTLE_VIEW_DATA__,{onDrain:()=>{if(epoch!==generation)return;busy=false;controls()},onError:(e:Error)=>{if(epoch!==generation)return;fault=e.message;error=fault;busy=false;controls()}})
 const staging=document.createElement('div'),view=viewSandbox(next)
 try{candidate.mount(staging,view)}catch(e){candidate.dispose();throw e}
 generation=epoch;surface?.dispose();surface=candidate;session=next;busy=false;fault='';error='';selectedAction='';selectedAim='';selectedActor=''
 surface.mount(q('battle'),view);controls()
}
function action(act:string){let mayHaveMutated=false;try{
 error=''
 if(fault&&['select','execute','end','skip','save','export'].includes(act))throw Error('Battle is stopped. Reset or resume a saved battle to continue.')
 if(act==='start')install(createSandbox(config))
 else if(act==='reset'){if(!session)throw Error('Start a battle first');install(createSandbox(session.config))}
 else if(act==='hero-add'||act==='enemy-add'){const key=act==='hero-add'?'heroes':'enemies',max=key==='heroes'?6:15;if(config[key].length>=max)throw Error('Roster limit reached');config[key].push(key==='heroes'?SANDBOX_HEROES[0]!.id:SANDBOX_ENEMIES[0]!.id);setup()}
 else if(act==='hero-remove'||act==='enemy-remove'){const key=act==='hero-remove'?'heroes':'enemies';if(config[key].length<=1)throw Error('Keep at least one unit');config[key].pop();setup()}
 else if(act==='import'||act==='resume'){const data=act==='import'?q<HTMLTextAreaElement>('transferText').value:localStorage.getItem('hbt-sandbox');if(!data)throw Error('No saved battle');install(restoreSandbox(data))}
 else if(act==='skip'){surface?.viewer?.pause();surface?.viewer?.seek(session!.ctx.events.length);busy=false;controls()}
 else {if(!session)throw Error('Start a battle first')
  if(act==='save'){const save=saveSandbox(session);localStorage.setItem('hbt-sandbox',save);q<HTMLTextAreaElement>('transferText').value=save}
  else if(act==='export')q<HTMLTextAreaElement>('transferText').value=JSON.stringify(exportSandbox(session,__ENGINE_PROVENANCE__),null,2)
  else if(act==='select'||act==='execute'||act==='end'){
   if(busy)throw Error('Wait for the current actions to finish')
   const command=act==='select'?{kind:'select-activation',unitUid:Number(selectedActor),expectedSeq:session.ctx.state.seq}:act==='execute'?JSON.parse(selectedAim):{kind:'end-cycle',actor:session.ctx.battleCursor?.actor,expectedSeq:session.ctx.state.seq}
   const before=session.ctx.events.length;mayHaveMutated=true
   const result=commandSandbox(session,command);if(!result.ok){mayHaveMutated=false;throw Error(result.reason)}
   busy=true;controls();surface!.viewer!.push(session.ctx.events.slice(before));surface!.viewer!.play()
  }
 }
 controls()
 }catch(e){error=(e as Error).message;if(mayHaveMutated){fault=error;busy=false}controls()}}
function bind(host:HTMLElement){host.querySelectorAll<HTMLElement>('[data-act]').forEach(el=>el.addEventListener('click',()=>action(el.dataset.act!)))}
bind(q('transfer'));setup();controls()
// A read-only integration handle for the built-page smoke; commands still use UI listeners.
Object.defineProperty(window,'__sandbox',{value:{get session(){return session},get busy(){return busy},get fault(){return fault},get viewer(){return surface?.viewer},get generation(){return generation}}})
