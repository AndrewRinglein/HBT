import {createSandbox,advanceSandbox,sandboxMarkedAreas,sandboxActivationChoices,sandboxChoices,sandboxSwapChoices,previewSandboxChoice,commandSandbox,saveSandbox,restoreSandbox,exportSandbox,type Sandbox,type SandboxConfig,type SandboxChoice,type SandboxSwapOffer} from '../core/sandbox.js'
import {SANDBOX_MAPS,SANDBOX_HEROES,SANDBOX_ENEMIES,SANDBOX_ENCOUNTERS,SANDBOX_DEFAULT} from '../content/sandbox.js'
import {viewSandbox} from '../view/sandbox.js'
import {createBattleSurface} from './battle-surface.js'
import {burstForecast} from './burst-forecast.js'
import {sandboxTargetingOf} from './sandbox-targeting.js'
import {controllerOf,validateBattleCommand,type BattleCommand} from '../engine.js'
import {createPlayInput,NO_ACTIONS_LEFT,type PlayEvent} from './play-input.js'
import {refusalLine} from './refusals.js'
import {ABBOTOWN_MAP} from '../content/conquest.js'
import {conquestProgress,takeSection,nextSection} from '../core/conquest.js'
import {conquestMapHTML} from './conquest-map.js'
import {makeNewCampaign,performAdvanceOpening,performDraft,performFieldOpeningBattle,performOpeningDeploy,draftsOwedOf,openingBattlesWonOf} from '../core/opening.js'
import {readRun,writeRun} from './opening-run.js'
import {canReveal,performReveal} from '../core/reveal.js'
import {LESSON_INTRODUCES,enemyRevealOf,enemiesToAnnounce} from '../content/reveals.js'
import {makeCtx,setBattleOutcome,type Ctx} from '../core/mutate.js'
import {performAdvancePrep,performDeploy,performUndeploy} from '../core/prep.js'
import {resolveReckoning,applyBattleResult,performExitBattle} from '../core/reckoning.js'
import {performTakeReward,listRewardTakers,performLevelUp,performLeaveLevelUp,listWaitingOffers,listWaitingItems,performTakeWaiting} from '../core/rewards.js'
import {performEquip,performUnequip} from '../core/shop.js'
import {sandboxResult} from '../core/sandbox.js'
import {encounterDef} from '../engine.js'
import {equipPage} from './equip.js'
import {draftScreen} from './draft.js'
import {deployPage} from './deploy.js'
import {recapScreen,mountRecap,rewardsScreen,mountRewards,carrierChoice,whoseOf,levelUpScreen,mountLevelUp,toggleMute,type LastBattle,type Cleanup} from './after.js'
import {itemOf as itemRowOf} from '../content/items.js'
const itemName=(id:string)=>itemRowOf(id).name
import {fontFaces} from './art.js'

declare const __BATTLE_VIEW_DATA__:Record<string,unknown>
declare const __BUILD_SHA__:string
declare const __ENGINE_PROVENANCE__:{engineCommit:string;engineDirty:boolean}
const root=document.getElementById('app')!
const escape=(x:unknown)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
let session:Sandbox|null=null,surface:ReturnType<typeof createBattleSurface>|null=null,generation=0,busy=false,fault='',error='',choices:SandboxChoice[]=[],swap:SandboxSwapOffer|null=null,selectedSwap='',selectedAction='',selectedAim='',selectedActor=''
const config:SandboxConfig=structuredClone(SANDBOX_DEFAULT)
// viewer.characters-stand-out (engine DECISIONS.md 2026-10-03 'the characters must stand out from the board'): &look=<name>,…
// hands the battle screen exactly the viewer's looks it names (viewer src/stand-out.js LOOKS — size, shadows, ground, rim,
// disc). The names are the viewer's: it refuses one that is none of its own, and the page says so (kingdom SWITCHES.md
// standOutLink). viewer.size-and-shadows-default (engine DECISIONS.md 2026-10-03 'size and shadows are the default'): with no
// look parameter the page hands the viewer nothing and the viewer shows its default pair; &look= (empty) is the board as it
// was before, for comparison. CHARACTERS-STAND-OUT.html links the Orphanage with each.
const LOOK:string[]|null=(()=>{const p=typeof location!=='undefined'&&location.search?new URLSearchParams(location.search):null;return p?.has('look')?p.get('look')!.split(',').filter(Boolean):null})()
// viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7): the mouse on the battle screen. The play input asks the engine and
// runs each command it makes through the same host path the Execute button uses; the viewer draws its facts.
// viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the battle screen's turn-taking, ruled', point 4): the play input's undo
// for an Activation that did nothing — the battle saved before a hero is begun (the sandbox's own save, the engine's
// snapshot) with the count of events the board then held; restored, the session is that battle again and the board's log is
// cut back to it (viewer rewind). The engine has no command to take a begun Activation back (kingdom SWITCHES turnSwitchUndo).
const play=createPlayInput(()=>session,runPlay,{
 save:()=>session?{text:saveSandbox(session),events:session.ctx.events.length}:null,
 restore:(saved)=>{const m=saved as {text:string;events:number}|null;if(!m||!session||!surface?.viewer||busy||fault)return false
  const back=restoreSandbox(m.text) as Sandbox,atlas=session.atlasScene
  if(back.ctx.events.length!==m.events)throw Error('The restored battle does not hold the events saved with it')
  session=atlas&&!back.atlasScene?{...back,atlasScene:atlas}:back
  surface.viewer.rewind(m.events);return true},
})
function runPlay(command:BattleCommand){
 if(!session||!surface?.viewer)return {ok:false as const,reason:'Start a battle first'}
 const before=session.ctx.events.length
 let result:ReturnType<typeof commandSandbox>
 try{result=commandSandbox(session,command)}catch(e){fault=(e as Error).message;error=fault;busy=false;throw e}
 /* viewer.turn-taking point 5: a refusal is one plain line — on the board (the play input's note); a free battle's launcher
    says it too, in words, never the engine's code */
 if(!result.ok){if(!boardOnly())error=refusalLine(result.reason);return result}
 error='';busy=true;surface.viewer.push(session.ctx.events.slice(before));surface.viewer.play()
 return result
}
/** the plan facts while a human can act; none while the resolved actions play, after a fault or at the outcome.
    viewer.play-chrome: with them the ending — End Turn (and who has not acted, for its pop-up) and End activation */
function refreshPlay(){if(!surface?.viewer)return;surface.viewer.setPlay(!session||busy||fault||session.ctx.state.outcome?null:{...play.facts(),...play.ending()})}
/** viewer.turn-taking (engine DECISIONS.md 2026-10-03, points 2 and 6): whenever the engine waits for a choice in a battle
    played on the board — the Hero Phase's start, an Activation ended — and nothing is playing, the next hero yet to act is
    begun with its basic move armed; the board centres on it as its Activation begins (viewer board.js). A free battle keeps
    its launcher's hero dropdown (kingdom SWITCHES turnAutoBeginBoardOnly). */
function beginNext(){
 if(!session||!surface?.viewer||busy||fault||session.ctx.state.outcome||!boardOnly()||session.ctx.battleCursor?.at!=='selecting')return
 try{play.next()}catch(e){fault=(e as Error).message;error=fault;busy=false}
}
/** viewer.auto-end-no-actions (engine DECISIONS.md 2026-10-03 'a player unit with nothing left it can do ends its Activation by
    itself', Andrew: "You should just auto-end its turn and put a notification on the screen: 'No remaining actions
    possible.'"): whenever the board is still in a battle played on the board and a player unit is acting, the play input is
    asked whether the engine would take anything more from it; when not, it has ended the Activation with the engine's own
    end-cycle and the battle screen shows the notice (viewer notice(): an element, timed, blocking nothing). The next unit
    begins as after the button — beginNext, when the board is next still (kingdom SWITCHES autoEnd*). */
function restIfDone(){
 if(!session||!surface?.viewer||busy||fault||session.ctx.state.outcome||!boardOnly()||session.ctx.battleCursor?.at!=='acting')return
 let ended=false
 try{ended=play.rest()}catch(e){fault=(e as Error).message;error=fault;busy=false;return}
 if(ended)surface.viewer.notice(NO_ACTIONS_LEFT)
}
/** viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8: "the Sandbox's dropdowns retired for these battles"): an encounter
    battle — every sandbox encounter is an opening battle (content/sandbox.ts SANDBOX_ENCOUNTERS) — is played on the board
    alone: no hero, action, target or swap dropdown, no Execute or End activation button (kingdom SWITCHES.md playChromeBoardOnly) */
const boardOnly=()=>session?.config.encounterId!==undefined
/** viewer.battle-full-screen (engine DECISIONS.md 2026-09-30 "the battle is its own full screen": "How can I experience this
    if you've got one screen that is both your launcher and your battle?"): an encounter battle is its own view, filling the
    window — no header, setup form, Save/Replay or footer, and the sandbox's own text only when something must be said (an
    error, a stopped battle, the outcome). The launcher is the other view, reached by the Launcher button; a free battle
    keeps the launcher page with its controls (kingdom SWITCHES.md battleView*) */
let launcher=false
/** kingdom.abbotown-map (PLAYABLE-OPENING-PLAN.md item 11; engine DECISIONS.md 2026-09-29 "the playable opening"): ?map
    opens the Retaking Abbotown map — a sitting. Taken sections are held in this page's memory for the sitting ("One
    sitting is enough for now": no save); &taken=<encounter ids> seeds it. Only the next section fields a battle, as ?play=
    does; a hero win there takes it, and the outcome offers Back to the map, as a loss does (a lost opening battle is
    replayed). kingdom SWITCHES.md conquestMapPage, conquestTakenSeed */
let mapSitting=false,mapOpen=false,taken:string[]=[]
const mapOrder=ABBOTOWN_MAP.sections.map(s=>s.encounterId)
function drawMap(){
 const host=q('conquest')
 host.innerHTML=conquestMapHTML({map:ABBOTOWN_MAP,progress:conquestProgress(mapOrder,taken),playable:SANDBOX_ENCOUNTERS.map(e=>e.id)})+(sitting?runFooter():'')
 persist()
 host.querySelectorAll<HTMLElement>('[data-act="field"]').forEach(el=>el.addEventListener('keydown',(e:Event)=>{const k=(e as KeyboardEvent).key;if(k==='Enter'||k===' '){e.preventDefault?.();action('field',el.dataset.id)}}))
 bind(host)
}
/** kingdom.opening-run-six: under the map, what the run is — saved, how to come back, the end once Abbotown is retaken */
function runFooter(){
 const done=nextSection(mapOrder,taken)===null
 /* kingdom.opening-sword-waits: an item kept in the stash for its classes is said to wait, for as long as it does */
 const waits=sitting?listWaitingItems(sitting.ctx.campaign).map(id=>`<span data-waits="${escape(id)}">The ${escape(itemName(id))} waits in the stash — for ${escape(whoseOf(id))}, when one joins you with a hand free.</span> `).join(''):''
 return `<p class="runNote" id="runNote">${runNote?`<b>${escape(runNote)}</b> `:''}${waits}${done?'<b>Abbotown is retaken — the opening run is complete.</b> ':''}The run is saved after every step: close the page at any time, and Retaking Abbotown opens where you left it. <a href="PLAY.html" data-run="launcher">Launcher</a> · <a href="BATTLE-SANDBOX.html?map&amp;new" data-run="new">Start a new run</a></p>`
}
/** kingdom.opening-loop-three (PLAYABLE-OPENING-PLAN.md item 12; engine DECISIONS.md 2026-09-29 "the playable opening": "one
    page, one sitting, local server: map -> first hero / draft -> equip -> battle -> rewards -> map"): the ?map sitting is a
    Campaign held in this page's memory — no save ("One sitting is enough for now"). The next section begins the chain: the
    draft owed (core/opening.ts, the ruled cadence), Combat Prep walked to Equip — who goes chosen on the way when more are
    held than may deploy (kingdom.opening-deploy-choice, 2026-10-03; until then the whole party was sent) — no tactics, the
    encounter's battle fielded with the campaign's own Hero rows, then the one writer, the recap, the rewards and the
    level-ups (the copied Hell-TCG screens, ui/after.ts), and the map again. A lost battle is offered again with the same
    party, wounds kept. Every step is a perform* call; the page decides nothing. kingdom SWITCHES.md opening* */
type Sitting={ctx:Ctx;lastBattle:LastBattle|null;levelHero:string|null;picked:string|null;giving:string|null;mounted:Cleanup|null}
let sitting:Sitting|null=null,campaignOpen=false
const sitCause='sitting'
/** kingdom.opening-run-six (engine DECISIONS.md 2026-10-01 'one continuous run through the first six battles, saved'): the
    run is kept after every step the page takes — a battle written, a reward kept, a level taken, a draft, an equip — and
    ?map reopened goes on from there (ui/opening-run.ts; kingdom SWITCHES.md openingRunSave*) */
const runStore=()=>typeof localStorage!=='undefined'?localStorage:null
function persist(){if(sitting)writeRun(runStore(),sitting.ctx.campaign,sitting.lastBattle)}
let runNote=''
const sectionOf=(id:string)=>ABBOTOWN_MAP.sections.find(s=>s.encounterId===id)
/** a battle on the board is the campaign's when it is the cursor's battle, with exactly the party and rows it was fielded with */
function isCampaignBattle(s:Sandbox){
 const c=sitting?.ctx.campaign,e=c?.cursor.engagement
 if(!c||!e||c.cursor.step!=='battle'||c.cursor.battle?.resultSet||s.config.encounterId!==e.id)return false
 return JSON.stringify(s.config.heroes)===JSON.stringify(e.deployed)&&JSON.stringify(s.config.heroRows)===JSON.stringify(e.deployed.map(id=>c.roster[id]))
}
/** the next section: the drafts owed first, then its battle */
function beginSection(id:string){
 const ctx=sitting!.ctx
 if(draftsOwedOf(ctx.campaign)>0)performAdvanceOpening(ctx,sitCause);else toBattle(id)
 mapOpen=false;campaignOpen=true;drawCampaign()
}
/** kingdom.opening-sword-waits (engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword waits for its taker; …'
    — "One, yes."): before the next battle is fielded, an item waiting in the stash for its classes is offered as soon
    as a living hero of them has room for it — after the draft that brings one — and the player names the carrier
    (ui/after.ts carrierChoice, as at the battle that gave it); then the battle is fielded. Nothing is stored for the
    offer: a run closed on it and reopened is asked again when the section is clicked. */
function toBattle(id:string){
 const waiting=listWaitingOffers(sitting!.ctx.campaign)[0]
 if(waiting){sitting!.giving=waiting.itemId;return}
 fieldBattle(id)
}
/** the opening battle as its encounter, Combat Prep walked to who goes: Reveal and the War Council passed (no tactics), and
    at Deploy — kingdom.opening-deploy-choice (engine DECISIONS.md 2026-10-03 'the opening run, audited': "Should the player
    choose which four heroes go into each battle?" — "3 yes") — with more heroes free to fight than the deploy limit the
    cursor stays there and the Deploy page asks who goes (ui/deploy.ts; the choice is Combat Prep's own performDeploy /
    performUndeploy); with the limit or fewer, all go and Equip opens (core/opening.ts performOpeningDeploy). Civilians stay
    home. Until 2026-10-03 the page sent the first four living heroes by id and asked nothing (kingdom SWITCHES.md
    openingDeployAll, openingPoolWhoDeploys — both settled by the ruling). */
function fieldBattle(id:string){
 const ctx=sitting!.ctx
 performFieldOpeningBattle(ctx,{id,mapId:encounterDef(id).mapId!,kind:ABBOTOWN_MAP.engagementKind},sitCause)
 performOpeningDeploy(ctx,sitCause)
}
/** Equip's To the battle: the cursor goes to the battle and the encounter is fielded with the campaign's rows */
function startCampaignBattle(){
 const c=sitting!.ctx.campaign,e=c.cursor.engagement!
 campaignOpen=false;clearCampaign();persist()
 install(createSandbox({mapId:e.mapId,heroes:[...e.deployed],heroRows:e.deployed.map(id=>structuredClone(c.roster[id]!)),enemies:[],seed:e.seed,encounterId:e.id}))
}
/** the outcome's Continue: the battle folded (core/sandbox.ts), the Reckoning proposed and written by the one writer */
function reckon(){
 if(!session||!session.ctx.state.outcome||!isCampaignBattle(session))throw Error('There is no finished campaign battle to reckon')
 const ctx=sitting!.ctx,e=ctx.campaign.cursor.engagement!,r=sandboxResult(session),k=resolveReckoning(ctx.campaign,e,r)
 setBattleOutcome(ctx,r,k,sitCause)
 sitting!.lastBattle={engagementId:e.id,result:r,reckoning:k}
 applyBattleResult(ctx,e,r,k)
 if(k.won)taken=takeSection(mapOrder,taken,e.id)
 surface?.dispose();surface=null;session=null;busy=false;generation++
 campaignOpen=true;drawCampaign()
}
/** after a step of the reckoning: the map once the cursor is back at the open step, else the next screen */
function onward(){
 if(sitting!.ctx.campaign.cursor.step==='open'){campaignOpen=false;clearCampaign();mapOpen=true;drawMap();layout()}
 else drawCampaign()
}
function clearCampaign(){if(sitting?.mounted){sitting.mounted();sitting.mounted=null}q('campaign').innerHTML=''}
function campaignAct(act:string,el:HTMLElement){
 const s=sitting!,ctx=s.ctx,c=ctx.campaign,id=el.dataset.id
 if(act==='draft'){performDraft(ctx,id!,sitCause);if(draftsOwedOf(ctx.campaign)>0)performAdvanceOpening(ctx,sitCause);else toBattle(nextSection(mapOrder,taken)!);drawCampaign()}
 else if(act==='deploy'){performDeploy(ctx,id!,sitCause);drawCampaign()}
 else if(act==='undeploy'){performUndeploy(ctx,id!,sitCause);drawCampaign()}
 else if(act==='pick'){s.picked=s.picked===id?null:id!;drawCampaign()}
 else if(act==='drop'){performEquip(ctx,id!,el.dataset.item!,sitCause,el.dataset.displace);s.picked=null;drawCampaign()}
 else if(act==='unequip'){performUnequip(ctx,id!,el.dataset.item!,sitCause);drawCampaign()}
 else if(act==='advance'){performAdvancePrep(ctx,sitCause);if(ctx.campaign.cursor.step==='battle')startCampaignBattle();else drawCampaign()}
 else if(act==='exit'){if(c.cursor.step==='reckoning')performExitBattle(ctx,sitCause);else if(c.cursor.step==='levelUp')performLeaveLevelUp(ctx,sitCause);else return;onward()}
 else if(act==='level-hero'){s.levelHero=id!;drawCampaign()}
 else if(act==='give'){const item=s.giving;if(!item)throw Error('No reward is waiting for its carrier')
  // a waiting item given between battles (kingdom.opening-sword-waits): onto the hero named, then on to the battle
  if(c.cursor.step==='open'){performTakeWaiting(ctx,item,id!,sitCause);s.giving=null;toBattle(nextSection(mapOrder,taken)!);drawCampaign()}
  else{performTakeReward(ctx,item,sitCause,id!);s.giving=null;onward()}}
 else if(act==='mute')toggleMute()
}
/** a reward chosen on the rewards page: into the stash — or, an item that names its takers, to the hero chosen for it */
function takeReward(itemId:string){
 const s=sitting!
 if(listRewardTakers(s.ctx.campaign,itemId).length){s.giving=itemId;drawCampaign();return}
 performTakeReward(s.ctx,itemId,sitCause);onward()
}
/** who carries an item that names its takers — ui/after.ts carrierChoice (each hero who may, with its card art) */
const giveChoice=(itemId:string)=>carrierChoice(sitting!.ctx.campaign,itemId)
function drawCampaign(){
 const s=sitting!,c=s.ctx.campaign,host=q('campaign')
 if(s.mounted){s.mounted();s.mounted=null}
 const say=error?`<p class="sittingError" role="alert">${escape(error)}</p>`:''
 let html='',mount:((hx:HTMLElement)=>Cleanup)|null=null
 if(s.levelHero){const who=s.levelHero
  html=levelUpScreen(c,who,'rewards',{specialtyOwed:true})
  mount=hx=>mountLevelUp(hx,choice=>{try{performLevelUp(s.ctx,who,sitCause,choice);persist()}catch(e){error=(e as Error).message}},()=>{s.levelHero=null;drawCampaign()})}
 else if(c.cursor.step==='draft')html=`<div class="sliceView">${draftScreen(c)}</div>`
 else if(c.cursor.step==='prep'&&c.cursor.prepStep==='deploy'){const e=c.cursor.engagement!;html=`<div class="sliceView">${deployPage(c,{engagementId:sectionOf(e.id)?.name??e.id})}</div>`}
 else if(c.cursor.step==='prep'&&c.cursor.prepStep==='equip'){const e=c.cursor.engagement!;html=`<div class="sliceView">${equipPage(c,e.deployed,{where:'prep',picked:s.picked,engagementId:sectionOf(e.id)?.name??e.id,canAdvance:true})}</div>`}
 else if(c.cursor.step==='reckoning'){html=recapScreen(c,s.ctx.events,s.lastBattle);mount=hx=>mountRecap(hx,()=>act(()=>campaignAct('exit',hx)))}
 else if(c.cursor.step==='rewards'||c.cursor.step==='levelUp'){html=rewardsScreen(c,s.ctx.events,s.lastBattle)+(s.giving?giveChoice(s.giving):'');mount=hx=>mountRewards(hx,id=>act(()=>takeReward(id)))}
 else if(c.cursor.step==='open'&&s.giving)html=`<div class="sliceView waitingOffer" data-waiting="${escape(s.giving)}"><h2>The ${escape(itemName(s.giving))} has waited in the stash</h2><p class="meta">It is for ${escape(whoseOf(s.giving))}. One is with you now, with a hand free for it.</p></div>`+giveChoice(s.giving)
 else html=`<div class="sliceView"><p>The Campaign is at ${escape(c.cursor.step)}.</p></div>`
 host.innerHTML=say+html
 host.querySelectorAll<HTMLElement>('[data-act]').forEach(el=>el.addEventListener('click',(ev:Event)=>{
  // the innermost [data-act] under the pointer acts — a × inside a slot is the ×, not the slot (as slice.ts)
  const t=ev?.target as HTMLElement|undefined;if(t?.closest&&t.closest('[data-act]')!==el)return
  if(!attached(host,el)||el.hasAttribute('disabled'))return
  act(()=>campaignAct(el.dataset.act!,el))
 }))
 const hx=host.querySelector<HTMLElement>('.hx');if(hx&&mount)s.mounted=mount(hx)
 persist();layout()
}
/** a campaign step: a refusal (Law 9) is said on the screen, never swallowed */
function act(f:()=>void){error='';try{f()}catch(e){error=(e as Error).message;if(campaignOpen)drawCampaign();else{if(mapOpen)drawMap();layout()}}}
const battleView=()=>!!session&&boardOnly()&&!launcher&&!mapOpen&&!campaignOpen
const show=(el:Element|null,on:boolean)=>{if(!el)return;if(on)el.removeAttribute('hidden');else el.setAttribute('hidden','')}
function layout(){
 if(mapOpen)document.body.classList.add('map-view');else document.body.classList.remove('map-view')
 if(campaignOpen&&!mapOpen)document.body.classList.add('campaign-view');else document.body.classList.remove('campaign-view')
 show(q('conquest'),mapOpen);show(q('campaign'),campaignOpen&&!mapOpen);show(q('sittingError'),mapOpen&&!!error)
 if(mapOpen||campaignOpen){q('sittingError').textContent=error;document.body.classList.remove('battle-view');for(const el of [root.querySelector('header'),q('setup'),q('commands'),q('battleNav'),q('battle'),q('transfer'),root.querySelector('footer')])show(el,false);return}
 const on=battleView(),say=!!(error||fault||session?.ctx.state.outcome)
 if(on)document.body.classList.add('battle-view');else document.body.classList.remove('battle-view')
 for(const el of [root.querySelector('header'),q('setup'),q('transfer'),root.querySelector('footer')])show(el,!on)
 show(q('commands'),!on||say);show(q('battleNav'),on);show(q('battle'),!(session&&boardOnly()&&launcher))
 surface?.refit()
}
root.innerHTML=`<section id="conquest" hidden></section><section id="campaign" hidden></section><p id="sittingError" class="sittingError" role="alert" hidden></p><header><h1>Battle Sandbox</h1><p>Command the heroes against AI enemies on an authored battlefield.</p><a href="SLICE.html">Kingdom</a> · <a href="BATTLE-SANDBOX.html?map">Retaking Abbotown</a> ·<a href="../viewer/BATTLE-VIEWER.html">Battle Viewer</a> · <a href="../assets/battle-atlas/index.html">Battle Atlas</a></header><section id="setup"></section><section id="commands" aria-live="polite"></section><nav id="battleNav" hidden><button data-act="launcher" title="The launcher: field another battle, save or replay">Launcher</button></nav><div id="battle"></div><section id="transfer"><h2>Save and replay</h2><p>Save keeps the full battle for resuming. Replay JSON opens in the Battle Viewer.</p><button data-act="save">Save battle</button> <button data-act="resume">Resume saved battle</button> <button data-act="export">Export replay JSON</button> <button data-act="import">Resume pasted save</button><label for="transferText">Battle save / replay JSON</label><textarea id="transferText" rows="5" spellcheck="false"></textarea></section><footer>Kingdom ${escape(__BUILD_SHA__)} · engine ${escape(__ENGINE_PROVENANCE__.engineCommit)}${__ENGINE_PROVENANCE__.engineDirty?' (dirty source)':''}</footer>`
const q=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const options=(rows:readonly {id:string;name:string}[],selected:string)=>rows.map(r=>`<option value="${escape(r.id)}"${r.id===selected?' selected':''}>${escape(r.name)}</option>`).join('')
const attached=(host:HTMLElement,el:HTMLElement)=>root.contains(host)&&host.contains(el)
function changeListener(host:HTMLElement,el:HTMLSelectElement|HTMLInputElement|null,fn:()=>void,phase?:'acting'|'selecting'){
 if(!el)return
 el.addEventListener('change',()=>{if(!attached(host,el)||el.hasAttribute('disabled')||(phase&&(busy||!!fault||session?.ctx.battleCursor?.at!==phase)))return;fn()})
}
function setup(){
 // kingdom.encounter-battles: an encounter brings its own battlefield, enemies, schedule and civilians
 const enc=config.encounterId!==undefined
 q('setup').innerHTML=`<h2>Field a battle</h2><label>Encounter <select id="encounter"><option value=""${enc?'':' selected'}>None — a free battle</option>${options(SANDBOX_ENCOUNTERS,config.encounterId??'')}</select></label><label>Battlefield <select id="map"${enc?' disabled':''}>${options(SANDBOX_MAPS,config.mapId)}</select></label><label>Seed <input id="seed" type="number" min="0" max="2147483647" value="${config.seed}"></label><div class="rosters"><div><h3>Heroes · standard kits</h3>${config.heroes.map((id,i)=>`<label>Hero ${i+1}<select data-roster="heroes" data-index="${i}">${options(SANDBOX_HEROES,id)}</select></label>`).join('')}<button data-act="hero-add">Add hero</button> <button data-act="hero-remove">Remove last</button></div><div><h3>Enemies</h3>${enc?'<p>The encounter fields its own enemies, arrivals and civilians; the civilians act on their own.</p>':`${config.enemies.map((id,i)=>`<label>Enemy ${i+1}<select data-roster="enemies" data-index="${i}">${options(SANDBOX_ENEMIES,id)}</select></label>`).join('')}<button data-act="enemy-add">Add enemy</button> <button data-act="enemy-remove">Remove last</button>`}</div></div><button data-act="start">Start configured battle</button> <button data-act="reset">Reset current battle</button><p>1–6 heroes, 1–15 enemies. Changing this form affects the next Start. Choose each remaining hero before their activation.</p>`
 changeListener(q('setup'),q<HTMLSelectElement>('encounter'),()=>{const v=q<HTMLSelectElement>('encounter').value;if(v)config.encounterId=v;else delete config.encounterId;setup()})
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
 beginNext();restIfDone()
 surface?.viewer?.setTargeting(null)
 try{choices=session&&!fault?sandboxChoices(session):[];swap=session&&!fault?sandboxSwapChoices(session):null}catch(e){fault=(e as Error).message;error=fault;busy=false;choices=[];swap=null}
 if(!swap?.choices.some(c=>JSON.stringify(c.command)===selectedSwap))selectedSwap=swap?.choices[0]?JSON.stringify(swap.choices[0].command):''
 const available=session&&!fault?sandboxActivationChoices(session):[],selecting=session?.ctx.battleCursor?.at==='selecting',board=boardOnly()
 if(!available.some(u=>String(u.uid)===selectedActor))selectedActor=available[0]?String(available[0].uid):''
 const actor=session?.ctx.battleCursor?.actor,u=actor==null?null:session!.ctx.state.units[actor]
 const actions=[...new Map(choices.map(c=>[actionKey(c),c])).values()]
 if(!actions.some(c=>actionKey(c)===selectedAction))selectedAction=actions[0]?actionKey(actions[0]):''
 const aims=choices.filter(c=>actionKey(c)===selectedAction)
 if(!aims.some(c=>JSON.stringify(c.command)===selectedAim))selectedAim=aims[0]?JSON.stringify(aims[0].command):''
 const choice=aims.find(c=>JSON.stringify(c.command)===selectedAim)
 let burst:ReturnType<typeof burstForecast>|null=null,targeting:ReturnType<typeof sandboxTargetingOf>|null=null
 if(choice&&'centre' in choice.command&&!board&&!busy&&!fault&&!selecting&&!session!.ctx.state.outcome){
  try{const preview=previewSandboxChoice(session!,choice.command);burst=burstForecast(preview,session!.ctx.state.units);targeting=sandboxTargetingOf(aims,preview)}catch(e){fault=(e as Error).message;error=fault;busy=false}
 }
 const label=(c:SandboxChoice)=>'destination' in c.command?`Hex ${c.command.destination} (${session!.ctx.geo.colOf(c.command.destination)}, ${session!.ctx.geo.rowOf(c.command.destination)})`:'hex' in c.command?`Prop at hex ${c.command.hex} (${session!.ctx.geo.colOf(c.command.hex)}, ${session!.ctx.geo.rowOf(c.command.hex)})`:'centre' in c.command?`Centre hex ${c.command.centre} (${session!.ctx.geo.colOf(c.command.centre)}, ${session!.ctx.geo.rowOf(c.command.centre)})`:session!.ctx.state.units[c.command.target]!.name+' · hex '+session!.ctx.state.units[c.command.target]!.hex
 // encounter.area-fall: the areas marked to fall, shown from their area.marked line until they land
 const marked=session&&!session.ctx.state.outcome?sandboxMarkedAreas(session):[]
 // kingdom.abbotown-map: in a map sitting a hero win takes its section (only the next one — core/conquest.ts takeSection),
 // and every outcome offers the map; the section is named as retaken, or as waiting to be fought again
 // kingdom.opening-loop-three: in the sitting the campaign's battle ends in its reckoning — Continue folds it and writes it
 // (the map comes after the rewards); a won one retakes its section, a lost one waits on the map for the same party
 const ended=session?.ctx.state.outcome,mapBattle=!!session&&!!ended&&isCampaignBattle(session)
 const sectionName=mapBattle?sectionOf(session!.config.encounterId!)!.name:''
 const nav=session&&boardOnly()?launcher?'<p><button data-act="battle">Return to the battle</button></p>':ended?mapBattle?`<p id="mapOutcome">${escape(sectionName)} ${ended==='heroClear'?'is retaken.':'is not taken — it waits on the map to be fought again, by the same party.'}</p><p><button data-act="reckon">Continue to the reckoning →</button></p>`:'<p><button data-act="launcher">Back to the launcher</button></p>':'':''
 const markedNote=marked.map(m=>`<p id="markedAreas" role="status">Marked to fall after Turn ${m.landsAfterTurn}'s Player Phase (${escape(m.fall)}): hexes ${m.hexes.map(h=>`${h} (${session!.ctx.geo.colOf(h)}, ${session!.ctx.geo.rowOf(h)})`).join(', ')}</p>`).join('')
 q('commands').innerHTML=`<h2>${session?.ctx.state.outcome?'Battle complete: '+escape(session.ctx.state.outcome):session?`Turn ${session.ctx.state.turn} · ${escape(selecting?'Choose a hero':u?.name??'Resolving battle')}`:'Start a battle to play'}</h2>${nav}${markedNote}${error?`<p role="alert">${escape(error)}</p>`:''}${fault?'<p>Battle stopped after an error. Reset or resume a saved battle to continue.</p>':''}${busy&&!fault?'<p>Playing the resolved actions…</p><button data-act="skip">Show current state</button>':''}${session&&!session.ctx.state.outcome?`${board?'':`${selecting?`<label>Remaining heroes <select id="actor"${busy||fault?' disabled':''}>${available.map(u=>`<option value="${u.uid}"${String(u.uid)===selectedActor?' selected':''}>${escape(u.name)} · hex ${u.hex}</option>`).join('')}</select></label><button data-act="select"${busy||fault||!available.length?' disabled':''}>Activate hero</button>`:''}<label>Action <select id="action"${busy||fault||selecting?' disabled':''}>${actions.map(c=>`<option value="${escape(actionKey(c))}"${actionKey(c)===selectedAction?' selected':''}>${escape(c.name)} · ${c.command.slot} · ${c.cost} stamina</option>`).join('')}</select></label><label>Legal destination / target <select id="aim"${busy||fault||selecting?' disabled':''}>${aims.map(c=>`<option value="${escape(JSON.stringify(c.command))}"${JSON.stringify(c.command)===selectedAim?' selected':''}>${escape(label(c))}</option>`).join('')}</select></label>${targeting&&!fault?'<p>Choose a hex, then Execute.</p>':''}<p id="preview">${busy||fault?'Forecast unavailable while resolving or stopped.':burst?escape(burst.headline):choice?.preview?escape(forecast(choice.preview)):choice&&'destination' in choice.command?'Move along engine path: '+choice.path.join(' → '):selecting?'Choose a remaining hero to begin their activation.':'No legal action available. End this activation to continue.'}</p>${busy||fault?'':burst?burst.details:choice?.preview?packetDetails(choice.preview):''}`}${busy||fault?'':'<p id="playHelp">On the board: each hero begins in turn, its move chosen · click a hex to see the path and plan attacks from its end, double-click it (or click it again) to move · click an action on the bar, point at an enemy for the forecast, click it, click again to confirm · double-click another hero to switch to it — once this one has moved or acted, the screen asks before its Activation ends · a hero with nothing left it can do ends its Activation by itself · right-click (or Esc) steps back'+(board?' · End activation ends a hero who will not act again; End Turn ends the Player Phase.':'.')+'</p>'}${board?'':`${swapControl(selecting)}<button data-act="execute"${busy||fault||!choice?' disabled':''}>Execute action</button> <button data-act="end"${busy||fault||selecting?' disabled':''}>End activation</button>`}`:''}`
 changeListener(q('commands'),q<HTMLSelectElement>('actor'),()=>{selectedActor=q<HTMLSelectElement>('actor').value;controls()},'selecting')
 changeListener(q('commands'),q<HTMLSelectElement>('action'),()=>{selectedAction=q<HTMLSelectElement>('action').value;selectedAim='';controls()},'acting')
 changeListener(q('commands'),q<HTMLSelectElement>('aim'),()=>{selectedAim=q<HTMLSelectElement>('aim').value;controls()},'acting')
 changeListener(q('commands'),q<HTMLSelectElement>('swap'),()=>{selectedSwap=q<HTMLSelectElement>('swap').value;controls()},'acting')
 bind(q('commands'))
 surface?.viewer?.setTargeting(fault?null:targeting)
 refreshPlay();layout()
}
function install(next:Sandbox){
 const epoch=generation+1
 advanceSandbox(next)
 /* viewer.new-enemy-notice (engine DECISIONS.md 2026-10-04 '… new enemies are named …': "If a new enemy is introduced there is
    going to be a notification: \"New enemy\" and their name." — the first time a kind is met): the host says which kinds
    are new. In the run that is every enemy kind the Campaign has not met (its `revealed` list), less the ones this battle's
    own lesson introduces, which are met as the battle is put on the screen; each kind is written as met — and the run saved
    — when the battle screen says its notice has gone up, so a battle replayed after a loss announces nothing already met.
    A battle outside a run has nothing to remember: every enemy kind is new to it (kingdom SWITCHES newEnemy*). */
 const run=isCampaignBattle(next)?sitting!.ctx:null
 const meet=(typeId:string)=>{const c=sitting?.ctx;if(!c)return;const id=enemyRevealOf(typeId);if(canReveal(c.campaign,id)){performReveal(c,id,sitCause);persist()}}
 if(run)for(const k of LESSON_INTRODUCES[next.config.encounterId??'']??[])meet(k)
 const candidate=createBattleSurface(__BATTLE_VIEW_DATA__,{...(LOOK?{look:LOOK}:{}),newEnemies:enemiesToAnnounce(run?run.campaign.revealed:[],next.config.encounterId),
  onNewEnemy:(typeId:string)=>{if(epoch===generation&&session&&isCampaignBattle(session))meet(typeId)},onHexClick:(hex:number)=>{
  if(epoch!==generation||!session||busy||fault||session.ctx.state.outcome||session.ctx.battleCursor?.at!=='acting')return false
  const actor=session.ctx.battleCursor.actor
  if(actor==null||controllerOf(session.ctx,actor,session.policy)!=='human')return false
  const choice=choices.find(c=>actionKey(c)===selectedAction&&(('centre' in c.command&&c.command.centre===hex)||('hex' in c.command&&c.command.hex===hex)))
  if(!choice||!validateBattleCommand(session.ctx,session.policy,choice.command).ok)return false
  selectedAim=JSON.stringify(choice.command);controls();return true
 },onPlay:(e:PlayEvent)=>{
  if(epoch!==generation||!session||busy||fault||session.ctx.state.outcome)return false
  let took=false
  try{took=play.input(e)}catch(err){fault=(err as Error).message;error=fault;busy=false;controls();return false}
  if(e.kind==='point'){if(took)refreshPlay();return took}
  controls();return took
 },onDrain:()=>{if(epoch!==generation)return;busy=false;controls()},onError:(e:Error)=>{if(epoch!==generation)return;fault=e.message;error=fault;busy=false;controls()}},{fill:battleView})
 const staging=document.createElement('div'),view=viewSandbox(next)
 try{candidate.mount(staging,view)}catch(e){candidate.dispose();throw e}
 generation=epoch;surface?.dispose();surface=candidate;session=next;busy=false;fault='';error='';selectedAction='';selectedAim='';selectedActor='';selectedSwap='';launcher=false;mapOpen=false;campaignOpen=false
 surface.mount(q('battle'),view);controls()
}
function action(act:string,id?:string){let mayHaveMutated=false;try{
 error=''
 if(fault&&['select','execute','end','swap','skip','save','export','reckon'].includes(act))throw Error('Battle is stopped. Reset or resume a saved battle to continue.')
 if(act==='start')install(createSandbox(config))
 else if(act==='reset'){if(!session)throw Error('Start a battle first');install(createSandbox(session.config))}
 else if(act==='hero-add'||act==='enemy-add'){const key=act==='hero-add'?'heroes':'enemies',max=key==='heroes'?6:15;if(config[key].length>=max)throw Error('Roster limit reached');config[key].push(key==='heroes'?SANDBOX_HEROES[0]!.id:SANDBOX_ENEMIES[0]!.id);setup()}
 else if(act==='hero-remove'||act==='enemy-remove'){const key=act==='hero-remove'?'heroes':'enemies';if(config[key].length<=1)throw Error('Keep at least one unit');config[key].pop();setup()}
 else if(act==='import'||act==='resume'){const data=act==='import'?q<HTMLTextAreaElement>('transferText').value:localStorage.getItem('hbt-sandbox');if(!data)throw Error('No saved battle');install(restoreSandbox(data))}
 // kingdom.abbotown-map: the next section fields its encounter exactly as ?play= does; the map comes back after a battle
 else if(act==='field'){const st=conquestProgress(mapOrder,taken).find(p=>p.id===id)?.state;if(!mapSitting||!sitting||st!=='next'||!SANDBOX_ENCOUNTERS.some(e=>e.id===id))throw Error('Only the next section can be fought');beginSection(id!);return}
 else if(act==='reckon'){reckon();return}
 else if(act==='map'){if(!mapSitting)throw Error('Open the map with ?map');mapOpen=true;launcher=false;drawMap()}
 else if(act==='launcher'||act==='battle'){if(!session)throw Error('Start a battle first');launcher=act==='launcher'}
 // viewer.turn-taking: showing the current state includes the next hero begun once the board is still (beginNext in controls)
 else if(act==='skip'){for(let i=0;i<8;i++){surface?.viewer?.pause();surface?.viewer?.seek(session!.ctx.events.length);busy=false;controls();if(!busy)break}}
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
function bind(host:HTMLElement){host.querySelectorAll<HTMLElement>('[data-act]').forEach(el=>el.addEventListener('click',()=>{if(!attached(host,el)||el.hasAttribute('disabled'))return;action(el.dataset.act!,el.dataset.id)}))}
bind(q('transfer'));bind(q('battleNav'));setup();controls()
// viewer.play-input: ?play=<encounter id>[&heroes=<hero id>,…] fields that encounter at once — the playable opening's
// battles open straight onto the board (kingdom SWITCHES.md playInputOpenOn)
{const params=typeof location!=='undefined'&&location.search?new URLSearchParams(location.search):null,want=params?.get('play')
 if(want&&SANDBOX_ENCOUNTERS.some(e=>e.id===want)){config.encounterId=want
  const heroes=(params!.get('heroes')??'').split(',').filter(id=>SANDBOX_HEROES.some(h=>h.id===id)).slice(0,6);if(heroes.length)config.heroes=heroes
  setup();action('start')}
 // kingdom.abbotown-map: ?map[&taken=<encounter id>,…][&heroes=<hero id>,…] opens the Retaking Abbotown map for a sitting
 // kingdom.opening-loop-three: the sitting's Campaign — a new one from nothing, its seed the page's own at opening (as
 // SLICE.html's new Campaign) or &seed=<n> (kingdom SWITCHES.md openingSittingSeed); its heroes are drafted, not chosen
 // kingdom.opening-run-six: the run kept in this browser is read back and goes on where it stood — the map, the screen it
 // was on, or (left mid-battle) that battle from its start; &new, or a named &seed, starts a new run in its place
 // (kingdom SWITCHES.md openingRunResume, openingRunMidBattle, openingRunNew)
 if(!want&&params?.has('map')){mapSitting=true;mapOpen=true
  const seed=Number(params.get('seed')??NaN),fresh=params.has('new')||params.has('seed')
  const kept=fresh?{run:null,why:''}:readRun(runStore())
  if(kept.why)runNote=`The saved run could not be read (${kept.why}); a new run is started.`
  {const ff=fontFaces();if(ff){const st=document.createElement('style');st.textContent=ff;document.head.appendChild(st)}}
  if(kept.run){
   sitting={ctx:makeCtx(kept.run.campaign),lastBattle:kept.run.lastBattle,levelHero:null,picked:null,giving:null,mounted:null}
   taken=mapOrder.slice(0,openingBattlesWonOf(kept.run.campaign))
   const step=kept.run.campaign.cursor.step
   if(step==='battle'){mapOpen=false;startCampaignBattle()}
   else if(step==='open'){drawMap();controls()}
   else{mapOpen=false;campaignOpen=true;controls();drawCampaign()}
  }else{
   taken=mapOrder.filter(id=>(params.get('taken')??'').split(',').includes(id))
   sitting={ctx:makeCtx(makeNewCampaign(Number.isSafeInteger(seed)&&seed>=0?seed:Math.floor(Math.random()*1e9))),lastBattle:null,levelHero:null,picked:null,giving:null,mounted:null}
   drawMap();controls()}}}
// A read-only integration handle for the built-page smoke; commands still use UI listeners.
Object.defineProperty(window,'__sandbox',{value:{get session(){return session},get busy(){return busy},get fault(){return fault},get viewer(){return surface?.viewer},get generation(){return generation},get campaign(){return sitting?structuredClone(sitting.ctx.campaign):null}}})
