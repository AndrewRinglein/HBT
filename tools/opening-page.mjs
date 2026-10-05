// The opening's page, driven — the steps tools/opening-loop-three.verify.mjs and tools/opening-run-six.verify.mjs take on
// the BUILT sandbox opened with ?map, through the page's own controls: the map, the draft, who goes, Equip, the battle settled by a
// pasted engine save, the reckoning, the rewards and the level-ups. One copy for both (kingdom.opening-run-six).
//
// 2026-10-04, kingdom.opening-starts-in-battle: battle 1 has no map before it and no Equip — the first draft is the run's
// first screen and its pick puts the Orphanage on the board (straightIn); what the page drew is kept (drawn).
//
// A battle is settled by the engine and its save pasted back into the page ("Resume pasted save") — the page takes it as
// the campaign's battle only when it is that battle with that party. How it is played — the run's own party made
// overpowered for a win, held idle for a loss, no seed sought — is playedOut's, below (kingdom.page-test-strong-party).
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
import {El} from '../../viewer/tools/fakedom.mjs'

export const TAKERS=['class.warrior','class.paladin']
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {createSandbox,saveSandbox,sandboxResult,advanceSandbox,sandboxActivationChoices,commandSandbox,playerPolicy} from './src/core/sandbox.ts';export {runBattle,createBattle,BADGES,draftScoreOf} from './src/engine.ts';export * as HEROES from './src/content/heroes.ts';export * as OPENING from './src/core/opening.ts';export * as SEAM from './src/core/seam.ts';export * as PREP from './src/core/prep.ts';export * as REWARDS from './src/core/rewards.ts';export * as REWARD_ROWS from './src/content/encounter-rewards.ts';export * as STANDARD from './src/content/class-standard.ts';export * as STAT_WORDS from './src/content/stat-labels.ts';export * as REWARD_POOL from './src/content/rewards.ts';export * as AUTHORED from './src/content/authored-items.ts';export * as ITEMS from './src/content/items.ts';export * as PROGRESS from './src/content/progress.ts';export {WOUND_UNAVAILABLE} from './src/content/wounds.ts';export * as RUN from './src/ui/opening-run.ts';export * as PROLOGUE from './src/content/prologue.ts';export * as MUTATE from './src/core/mutate.ts';export * as CONQUEST from './src/content/conquest.ts';export * as LESSONS from './src/content/lessons.ts';export {encounterDef} from './src/engine.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
/* kingdom.opening-starts-in-battle (engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, no map
   before battle 1, …': "We don't start by showing you going to the orphanage on the map … We're just going straight into
   the battle after you get your hero."): WHAT THE PAGE DREW, from its opening — every write of the map's (#conquest) and
   the campaign screen's (#campaign) markup, as the page made it, each said for what it holds: the map's sections, the
   Equip page, the Who-goes page, a draft. So "the map was never drawn before battle 1" is held of every screen the page
   put up in between, not only of the one standing at the end. Each page has its own log: the two hosts carry it once
   the page has booted (openingPage), and while it boots the log is the one openingPage just started. */
const innerHTML=Object.getOwnPropertyDescriptor(El.prototype,'innerHTML')
let drawing=null
Object.defineProperty(El.prototype,'innerHTML',{configurable:true,get:innerHTML.get,set(v){
 const log=this._drawn??drawing
 if(log&&(this.id==='conquest'||this.id==='campaign')){const html=String(v);log.push({host:this.id,map:this.id==='conquest'&&html.includes('data-section='),equip:html.includes('equip-page'),deploy:html.includes('deploy-page'),draft:html.includes('data-act="draft"'),
  /* kingdom.tutorial-after-battle-lines: which screen between battles the write is, and the gold line it carries (the row's id and words) */
  recap:/class="hx recap/.test(html),won:/data-won="true"/.test(html),rewards:/class="hx rewards/.test(html),levelup:/class="hx levelup/.test(html),
  lesson:(html.match(/class="lessonLine" data-lesson="([^"]+)"/)??[])[1]??null,line:(html.match(/class="lessonLine"[^>]*>([^<]*)</)??[])[1]??null})}
 innerHTML.set.call(this,v)}})
/* … and a run as a page kept it BEFORE battle 1 was fought, for a save the page of today never takes: 'new' — nobody
   drafted, the open step (the older page's first screen, the map); 'drafted' — the first hero drafted (the first offer),
   the open step; 'equip' — and the battle fielded, resting at Equip (the older page's stop before To the battle). Made
   by the sources' own calls, kept as the page keeps it (ui/opening-run.ts runSaveOf) */
export function campaignAt(seed,at,encounterId){
 const ctx=E.MUTATE.makeCtx(E.OPENING.makeNewCampaign(seed))
 if(at==='new')return ctx.campaign
 E.OPENING.performAdvanceOpening(ctx,'test');E.OPENING.performDraft(ctx,E.OPENING.listDraftOffers(ctx.campaign)[0].id,'test')
 if(at==='drafted')return ctx.campaign
 E.OPENING.performFieldOpeningBattle(ctx,{id:encounterId,mapId:E.encounterDef(encounterId).mapId,kind:E.CONQUEST.ABBOTOWN_MAP.engagementKind},'test');E.OPENING.performOpeningDeploy(ctx,'test')
 if(at==='equip')return ctx.campaign
 throw Error('campaignAt: new, drafted or equip')
}
export const runSaveText=campaign=>E.RUN.runSaveOf(campaign,null)
/* kingdom.opening-draft-pool: the sources' draft pool, and the base heroes left out of it for want of a kit — what the
   page's draft is held against */
export const POOL=E.HEROES.HERO_POOL.map(h=>({id:h.id,name:h.name,classes:[...h.classes]}))
export const LEFT_OUT=(E.HEROES.UNKITTED_HEROES??[]).map(h=>({id:h.id,name:h.name}))
export const HERO_CLASSES=['class.mage','class.paladin','class.priest','class.ranger','class.rogue','class.warrior']
/* kingdom.opening-draft-modifiers: the published numbers and words the page's draft is held against — the first hero's
   rule and the Crucible's rollable badges (progression/OPENING-PARTY.json, the file the engine's own opening party reads),
   and each base hero's description (the codex's backstory) */
const PARTY=JSON.parse(readFileSync(new URL('../../progression/OPENING-PARTY.json',import.meta.url),'utf8'))
export const FIRST_HERO=PARTY.firstHero,ROLL_SOURCE=PARTY.draftScore.rollSource
export const POSITIVE_BADGES=PARTY.crucible.badges.favourable.map(b=>b.id),FLAWED_BADGES=PARTY.crucible.badges.flawed.map(b=>b.id)
const BADGE_NAMES=[...FIRST_HERO.badges,...POSITIVE_BADGES,...FLAWED_BADGES].map(id=>E.BADGES[id].name)
const CODEX=JSON.parse(readFileSync(new URL('../../content/hbt-content.json',import.meta.url),'utf8'))
const DESCRIPTION=Object.fromEntries(CODEX.heroes.heroes.map(h=>[h.id,h.backstory]))
/* kingdom.opening-first-hero-class-line (engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, …':
   "When you pick your first hero there should be a description (a line that describes the class) and then some simple way
   we can describe the changes to this hero." — its badges and bonus Health in plain words, like "Born leader" and "Tougher
   than most": "3 correct."): the published content's own words the page's draft is held against — each class's
   player-facing sentence, each badge's plain words, and each stat's plain words for a hero given more of it (the rows'
   playerLine, content/hbt-content.json). LINES_SEEN counts, over a run, the draft cards held to their class line and the
   first draft's cards held to what the hero joins with */
const lineRows=rows=>Object.fromEntries(rows.filter(r=>typeof r.playerLine==='string').map(r=>[r.id,r.playerLine]))
export const CLASS_LINE=lineRows(CODEX.classes),BADGE_LINE=lineRows(CODEX.badges),STAT_LINE=lineRows(CODEX.stats)
export const LINES_SEEN={classLine:0,joins:0,badgeLines:0,own:0,ownLines:0,standard:0,gifts:0}
/* kingdom.opening-draft-class-message (engine DECISIONS.md 2026-10-04 'the opening's tutorial: …': "The second time you are
   drafting a hero, there should be a message that says, "Until you get additional upgrades you may only deploy one hero
   of each class.""): the sources' rows of what a draft says above its offers (content/prologue.ts DRAFT_MESSAGES) — what
   the page's draft is held against; DRAFT_NOTICES keeps, for every draft a run held, its ordinal and what it said (null:
   nothing) */
/* kingdom.tutorial-orphanage-first-move: the opening's lesson table (src/content/lessons.ts), row by row, and the reveal a row's
   showing is remembered by */
export const LESSON_ROWS=E.LESSONS.LESSONS.map(r=>({...r})),lessonReveal=id=>E.LESSONS.lessonRevealOf(id)
export const DRAFT_MESSAGES=E.PROLOGUE.DRAFT_MESSAGES.map(m=>({...m})),DRAFT_NOTICES=[]
/* kingdom.opening-hero-card-art (engine DECISIONS.md 2026-10-03 'every draft card shows the hero's card art …': "Card art
   should be present when you're drafting, both the first time and the next ones."; 'card art on the level-up and reward
   screens …': "Card art not showing in the level-up screen."): the portraits the page is held against — generated/art, as
   tools/prep-heroes.py made them and the build inlines them (a data: URI of the file's own bytes). A hero whose art is
   missing on disk is named in index.json heroesMissing and shows a blank card, never another's. ART_SEEN counts the hero
   cards held on each screen over a run. */
const ART_INDEX=JSON.parse(readFileSync(new URL('../generated/art/index.json',import.meta.url),'utf8'))
export const HEROES_MISSING=[...(ART_INDEX.heroesMissing??[])]
const portraitCache={}
const portraitUri=id=>portraitCache[id]??=(f=>f?'data:image/jpeg;base64,'+readFileSync(new URL('../generated/art/'+f,import.meta.url)).toString('base64'):null)(ART_INDEX.heroes?.[id])
export const ART_SEEN={draft:0,whoGoes:0,equip:0,victory:0,rewards:0,carrier:0,levelUp:0}
/* kingdom.opening-reward-card-art (engine DECISIONS.md 2026-10-03 'card art on the level-up and reward screens; …': "Card art
   not showing in the reward screen for the flinging sword." — the Flaming Longsword): the items' card art the page is
   held against — generated/art, as tools/prep-items.py made it and the build inlines it. An item has art (index.json
   items: its own row's card, or its base row's) or is named in itemsMissing and shows its plain card, never another's.
   ITEM_ART_SEEN counts, over a run, the reward cards and the Equip items held each way; `sword` says whether the Flaming
   Longsword's reward card was on the screen (it is offered only with a Warrior or a Paladin in the party) */
export const ITEMS_ART={...(ART_INDEX.items??{})},ITEMS_MISSING={...(ART_INDEX.itemsMissing??{})}
const itemUri=id=>portraitCache['item:'+id]??=(f=>f?'data:image/jpeg;base64,'+readFileSync(new URL('../generated/art/'+f,import.meta.url)).toString('base64'):null)(ITEMS_ART[id])
/* kingdom.opening-free-equip (engine DECISIONS.md 2026-10-03 'the opening run, audited', question 4: "Should idols and
   bloodrunes be free to equip during the opening …?" — "4 free"): the sources' row for an item — its class, its name and
   what its row costs to equip (outside the opening) */
export const itemRow=id=>{const r=E.ITEMS.itemOf(id);return {id:r.id,name:r.name,itemClass:r.itemClass,equipCost:{...r.equipCost}}}
/* kingdom.opening-recap-civilians: every victory screen of a run, as it showed the civilians who fought — the battle, and
   each civilian's unit, name, mark and whether it joined (fightOut) */
export const CIVILIANS_SEEN=[]
export const ITEM_ART_SEEN={rewardArt:0,rewardPlain:0,equipArt:0,equipPlain:0,sword:false}
/* kingdom.rewards-only-authored (engine DECISIONS.md 2026-10-04, Andrew: "I guess we could just ignore all the items not
   authored by me to start with." — "One yes. Stop appearing as battle rewards."): every card a reward screen of a run
   showed, counted as on the list of the rows he authored (the sources' src/content/authored-items.ts) or as the battle's
   own named reward (its row's item — left as it is); a card that is neither fails where it is shown (takeReward).
   POOL_COSTS_TO_EQUIP: the rows of the sources' reward pool that cost Faith or Mana to equip — idols, bloodrunes */
/* Law 10, 2026-10-04 (kingdom.rewards-derived-rows-offered; engine DECISIONS.md 2026-10-04 'rewards: one of his bases carrying
   one of his attributes is his; …' — Andrew, asked "should a row made of one of your bases carrying one of your attributes
   count as yours": "1 yes"): a card was held to an id on the list alone, which pinned his bases carrying his attributes as
   set aside. As the rule now stands a card is his when its id is on the list (`listed`) or its base and its attribute are
   both on it (`made`); a card that is neither, and is not the battle's own named reward, still fails where it is shown */
export const REWARD_CARDS_SEEN={listed:0,made:0,named:[]}
/* kingdom.equip-item-card (engine DECISIONS.md 2026-10-05 'playtest post: …, item cards, …': "You need to be able to click on
   them, and then they pop up somewhere on the screen, to the right or somewhere, as a card with a description."): every reward
   card a run chose, and the item card it opened beside the cards (takeReward) */
export const ITEM_CARDS_SEEN=[]
const AUTHORED_IDS=new Set(E.AUTHORED.AUTHORED_ITEMS.map(r=>r.id))
const madeOfHis=id=>{const r=E.ITEMS.itemOf(id);return r.base!==null&&AUTHORED_IDS.has(r.base)&&r.enchant!==null&&AUTHORED_IDS.has(r.enchant)}
export const POOL_COSTS_TO_EQUIP=E.REWARD_POOL.REWARDS.filter(r=>Object.keys(E.ITEMS.itemOf(r.id).equipCost).length>0).map(r=>r.id)
const FLAMING_LONGSWORD='item.longsword.flaming'
/* kingdom.opening-specialty-three (engine DECISIONS.md 2026-10-03 'card art on the level-up and reward screens; the specialty
   choice offers three, not nine': "you're supposed to only get a choice of three different specialty classes, not nine." ·
   '… the specialty three are random; …': "It's random: 3 of the 9."): every specialty choice a run reached, as the page
   showed it — the hero, the three offered and the one taken (levelUps). SPECIALTY_OFFER is the sources' row */
export const SPECIALTY_CHOICES=[],SPECIALTY_OFFER=E.PROGRESS.SPECIALTY_OFFER
/* what a draft should move each engine stat by: its rolled points (and the first hero's Health), and its badges' own rows */
const movedBy=d=>{const out={};for(const m of d.mods)out[m.stat]=(out[m.stat]??0)+m.add;for(const b of d.badges)for(const [k,n] of Object.entries(E.BADGES[b].statModifiers??{}))out[k]=(out[k]??0)+n;return out}
const numbersOf=text=>Object.fromEntries(text.split(',').map(p=>{const [k,n]=p.split(':');return [k,Number(n)]}))

/* kingdom.page-test-strong-party — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'no testing that the battles can be won
   until these items are done; the page tests play an overpowered party; faster landing': "I'm okay forgoing all testing
   battle until we're done with all these items … we can just skip all testing battles that aren't just done from a quality
   standpoint." · "Go ahead, overpowered power party.").
   HOW A BATTLE IS SETTLED, deliberately, with no seed sought. The battle is the run's own — the sandbox the page fields
   for that Engagement (createSandbox(config): the same encounter, the run's own heroes with their items, levels, badges
   and drafted points, on the Engagement's own seed) — and the party is changed FOR THE TEST ONLY, where the driver fields
   the engine's battle, through the engine's own per-hero seam (BattleOptions.heroMods, seam.unit-mods: stat mods naming
   their source, here 'test.strong-party'), and its turn cap (BattleOptions.cfg.turnCap):
     · a battle the test means to WIN: every hero of the party is OVERPOWERED (STRONG_PARTY: Health, Armor, Resist, the
       four damage stats, Accuracy — and, since kingdom.opening-draft-cadence, Movement and Reach, below) and the engine's
       AI plays both sides; the first and only battle played is won, with
       nobody of the party dead, down or wounded — or the driver stops and says so (Law 9);
     · a battle the test means to LOSE: the party is made unkillable but stands IDLE (every activation begun and ended),
       and the battle is cut at the end of Turn 1 by the turn cap (HELD_PARTY) — the engine's own 'capped' outcome, a loss
       to the kingdom — with nobody of the party hurt. (A weakened party left to be beaten was measured first: at the
       Lumberjack House the civilians fight on while the heroes bleed out, and a hero died on about half the seeds; a
       loss that may or may not kill is not deliberate.) Fewer than the whole party goes to a lost battle when the test
       sends one hero alone — the page's own Deploy choice, not this driver's.
   Never a content row, never the built page's play, never a player's run: the page under test fields the battle as it
   always does (asserted on its own session, onTheBattle), and only the SAVE pasted back into it was played this way.
   THE PAGE STILL TAKES IT AS THAT BATTLE: the page's import (core/sandbox.ts restoreSandbox) holds a save to its config
   — the encounter, the heroes and their Hero rows, and the setup's heroes, enemies, replicate, items and encounter — and
   replays the save's own setup to check its first lines; and the sitting takes a finished battle as the Campaign's only
   when its heroes and Hero rows are the Engagement's (ui/sandbox.ts isCampaignBattle). The config is untouched here: the
   run's own heroes, items and levels, the save's shape unchanged. The setup's per-hero mods and turn cap are not among
   the things the import compares, for a player or for a test — no check is weakened to let this in (GBH SWITCHES.md
   verify.openingRunSettle).
   Until 2026-10-04 a battle was played with the run's real party on seed after seed (the engine's AI, then scripted
   'hold' and 'press' play) until one ended as wanted, the seeds found kept in tables; every item that moved a battle
   searched again. The search, its seed tables and the 'hold' and 'press' play are gone. */
/* 2026-10-04, kingdom.opening-draft-cadence (GBH SWITCHES.md verify.strongPartyReach): Movement +6 and Reach +12 joined the
   strong party's mods. Under the cadence ruled 2026-10-03 (one draft after every battle) three heroes go to the Bridge,
   not four; on run seed 3 those three (a Paladin, a Ranger, a Warrior), unkillable, killed six of the seven and then
   stood for twenty turns while the last Fire Imp burned them from a hex the engine's AI would not walk them to
   ("could not reach an enemy", "no target in range") — the battle ended 'capped' on Turn 25, not won. That is the
   computer's play, which nothing tests now (2026-10-04, above); the test party is made strong enough to end the battle
   whatever three heroes it is — with either mod alone seeds 3, 11 and 15 win, with both every run seed tried (1 to 16)
   does. Still one battle, on the Engagement's own seed, nothing sought.
   2026-10-04, kingdom.opening-specialty-three: raised to Movement +20 and Reach +40 — the whole board. Three specialties
   offered instead of nine moved the specialty this driver takes (the first shown), and with +6 and +12 the same three
   heroes at the Bridge on run seed 3 again left one Imp unreached (capped, Turn 25). With +20 and +40 every run seed
   tried (1 to 20) wins every battle. */
export const STRONG_PARTY={source:'test.strong-party',stats:{maxHp:500,armor:50,resist:50,strength:30,precision:30,magic:30,spirit:30,accuracy:100,movement:20,reach:40}}
export const HELD_PARTY={source:'test.strong-party',stats:{maxHp:500,armor:50,resist:50},turnCap:1}
/* the sandbox the page fields for `config`, its party's heroes given `as`'s stat mods (and its turn cap) */
/* `weak` (kingdom.opening-hero-death-replays): the party's heroes at these places are given, instead, ONE mod — Health down
   to 1 (the same seam, the same source) — so the battle kills them; never a content row */
function fieldedAs(config,as,weak=[]){
 const base=E.createSandbox(structuredClone(config)),add=Object.entries(as.stats).map(([stat,n])=>({stat,add:n,source:as.source}))
 const frail=i=>{const u=base.ctx.state.units.find(x=>x.uid===base.setup.heroUids[i]);return [{stat:'maxHp',add:1-u.maxHp,source:as.source}]}
 const heroMods=base.setup.heroes.map((_,i)=>{const own=base.setup.heroMods?.[i];return {...(own??{}),stats:[...(own?.stats??[]),...(weak.includes(i)?frail(i):add)]}})
 const setup={...base.setup,heroMods,...(as.turnCap?{cfg:{...(base.setup.cfg??{}),turnCap:as.turnCap}}:{})},ctx=E.createBattle(setup)
 return {...base,setup,ctx,policy:E.playerPolicy(ctx)}
}
/* the player's side, played out: 'ai', the engine's AI plays everyone; 'idle', every activation of the player's side
   begun and ended (the heroes and the civilians stand still), the enemies the engine's AI; 'civilian-falls'
   (kingdom.opening-recap-civilians, 2026-10-04) — a battle the test means to WIN WITH A CIVILIAN DEAD, so the victory
   screen has a dead civilian to mark: the player's side stands idle, as 'idle', until one of the encounter's own
   hero-side units has died (the strong party, unkillable, only watches), and from the next choice of who activates the
   engine's AI plays everyone, as 'ai' — the strong party then ends it. Deliberate, one battle, the Engagement's own
   seed; if no civilian has died by Turn 12 the driver stops (playedOut) */
const CIVILIAN_FALLS_BY_TURN=12
const civilianDead=s=>s.ctx.state.units.some(u=>u.side==='hero'&&!s.setup.heroUids.includes(u.uid)&&u.lifeState==='dead')
/* 'hero-falls' (kingdom.opening-hero-death-replays, 2026-10-04) — a battle the test means to end WITH HEROES DEAD: the
   heroes at `fall` are fielded frail (Health 1, fieldedAs) and the rest strong; the player's side stands idle until every
   frail hero has died, and then the engine's AI plays everyone — the strong heroes win it (a WON battle a hero died
   in), or, every hero sent being frail, nobody is left and the battle is lost. One battle, the Engagement's own seed;
   if the frail heroes are not dead by Turn 25 the driver stops (settledAs) */
const HERO_FALLS_BY_TURN=25
const heroesDead=(s,fall)=>fall.every(i=>s.ctx.state.units.find(u=>u.uid===s.setup.heroUids[i])?.lifeState==='dead')
/* (when EVERY hero sent is to fall the battle ends itself the moment the last of them is down — the engine's wipe — with
   those already bled out dead and the last ones down: that is what "a battle that kills the party" is, and the driver
   holds it to at least one dead and nobody standing) */
function playOut(s,how,fall=[]){
 if(how==='ai'){E.runBattle(s.ctx);return}
 E.advanceSandbox(s)
 for(let i=0;i<50000&&!s.ctx.state.outcome;i++){const ctx=s.ctx,at=ctx.battleCursor?.at,seq=ctx.state.seq
  if(how==='civilian-falls'&&at==='selecting'&&(civilianDead(s)||ctx.state.turn>CIVILIAN_FALLS_BY_TURN)){s.policy={humanUnitUids:[]};E.advanceSandbox(s);if(!s.ctx.state.outcome)E.runBattle(s.ctx);return}
  if(how==='hero-falls'&&at==='selecting'&&(heroesDead(s,fall)||ctx.state.turn>HERO_FALLS_BY_TURN)){s.policy={humanUnitUids:[]};E.advanceSandbox(s);if(!s.ctx.state.outcome)E.runBattle(s.ctx);return}
  let r=null
  if(at==='selecting')r=E.commandSandbox(s,{kind:'select-activation',unitUid:E.sandboxActivationChoices(s)[0].uid,expectedSeq:seq})
  else if(at==='acting')r=E.commandSandbox(s,{kind:'end-cycle',actor:ctx.battleCursor.actor,expectedSeq:seq})
  if(!r?.ok)throw Error('the player\'s side could not go on: '+(r?.reason??at))}
}

/* one battle settled as the test means it to end — won (the strong party, the engine's AI) or lost (the party held idle,
   cut at Turn 1) — and the save a person would have made at that moment. One battle, on the Engagement's own seed; a
   battle that does not end as meant, or that hurts the party, is not searched around: the driver stops (Law 9) */
export function playedOut(config,won){return settledAs(config,won,{})}
/* kingdom.opening-recap-civilians: … or WON WITH A CIVILIAN DEAD (playOut 'civilian-falls'): the strong party stands idle
   until one of the encounter's own hero-side units has died, then the engine's AI plays everyone. The same one battle,
   on the Engagement's own seed; if no civilian dies the driver stops */
export function playedOutCivilianFalls(config){return settledAs(config,true,{civilianFalls:true})}
/* kingdom.opening-hero-death-replays: … or ended WITH THE HEROES AT `fall` DEAD (playOut 'hero-falls'; their places in the
   party sent): won by the rest of the party when anybody is left, lost when every hero sent was to fall. The same one
   battle, on the Engagement's own seed; if they do not die, or the battle does not end as meant, the driver stops */
export function playedOutHeroFalls(config,fall){
 if(!fall.length||fall.some(i=>!(i in config.heroes)))throw Error('playedOutHeroFalls: name the places, in the party sent, of the heroes who are to fall')
 return settledAs(config,fall.length<config.heroes.length,{heroFalls:[...fall]})
}
function settledAs(config,won,o){
 const fall=o.heroFalls??[]
 const how=fall.length?'hero-falls':won?(o.civilianFalls?'civilian-falls':'ai'):'idle',s=fieldedAs(config,won||fall.length?STRONG_PARTY:HELD_PARTY,fall);playOut(s,how,fall)
 const r=E.sandboxResult(s),party=r.units.filter(u=>u.side==='hero'&&u.role===undefined&&!fall.includes(u.index))
 const everyone=fall.length===config.heroes.length,fell=r.units.filter(u=>u.side==='hero'&&u.role===undefined&&fall.includes(u.index))
 const alive=everyone?(fell.some(u=>u.lifeState==='dead')?fell.filter(u=>u.lifeState==='standing'):fell):fell.filter(u=>u.lifeState!=='dead')
 if(alive.length)throw Error(`${config.encounterId} on seed ${config.seed}: meant to end with ${fall.map(i=>config.heroes[i]).join(', ')} dead — ${alive.map(u=>config.heroes[u.index]+' is '+u.lifeState).join(', ')} at the end (Turn ${r.turns}); the driver settles one battle and searches for none`)
 if((r.outcome==='heroClear')!==won)throw Error(`${config.encounterId} on seed ${config.seed}: meant to be ${won?'won by the strong party':'lost by the party held idle'}, it ended '${r.outcome}' on Turn ${r.turns} — the driver settles one battle and searches for none (kingdom.page-test-strong-party)`)
 if(o.civilianFalls&&!r.units.some(u=>u.side==='hero'&&u.role!==undefined&&u.lifeState==='dead'))throw Error(`${config.encounterId} on seed ${config.seed}: meant to be won with a civilian dead — none had died by Turn ${CIVILIAN_FALLS_BY_TURN} with the player's side standing idle; the driver settles one battle and searches for none`)
 const hurt=party.filter(u=>u.lifeState!=='standing'||u.downed||u.stood)
 if(hurt.length)throw Error(`${config.encounterId} on seed ${config.seed}: the ${won?'strong':'held'} party was hurt (${hurt.map(u=>config.heroes[u.index]+' '+u.lifeState).join(', ')}) — it is meant to end ${won?'won':'lost'} with nobody dead, down or wounded`)
 return {save:E.saveSandbox(s),result:r,how,seed:config.seed,turns:r.turns}
}

/** The built sandbox opened at `search`, in a browser whose storage is `store` (a Map; a fresh one when absent). */
export function openingPage(page,search,store){
 const drawn=[];drawing=drawn
 const v=bootSlice(page,{search,store}),w=v.w,root=v.root,handle=w.__sandbox
 for(const id of ['conquest','campaign'])root.querySelector('#'+id)._drawn=drawn
 drawing=null
 const camp=()=>handle.campaign
 const byId=id=>root.querySelector('#'+id)
 const shown=id=>{const el=byId(id);return !!el&&!el.hasAttribute('hidden')}
 const fire=(el,type,target)=>{assert.ok(el,'an element to '+type);for(const f of el.listeners[type]??[])f({target:target??el,preventDefault(){},stopPropagation(){}})}
 const heroIds=()=>Object.values(camp().roster).filter(h=>!h.classes.includes('class.civilian')).map(h=>h.id).sort()
 const civilianIds=()=>Object.values(camp().roster).filter(h=>h.classes.includes('class.civilian')).map(h=>h.id).sort()
 const settle=()=>{if(handle.busy)v.click('skip')}
 /* the page's clock, run forward in small steps: a timer a timer sets comes due on a later step, as in a browser */
 const wait=ms=>{for(let t=0;t<ms;t+=50)w._flush(50)}
 /* kingdom.opening-hero-card-art: whose portrait a hero shows — its own (a rescued civilian's is its template's, ui/art.ts
    portraitIdOf) — and that portrait, or null when the hero is named in heroesMissing; a hero in neither fails */
 const artKey=id=>camp().roster[id]?.templateId??id
 function portraitFor(id,label){
  const key=artKey(id),want=portraitUri(key)
  assert.ok(want||HEROES_MISSING.includes(key),`${label}: ${key} has a portrait, or is named in heroesMissing`)
  return want
 }
 /* the images inside `el` are exactly `n` of that hero's own card art — or, for a hero with none on disk, no image at all
    (a blank card). The URIs are not printed: a portrait is ~45,000 characters */
 function showsArt(el,id,label,screen,n=1){
  assert.ok(el,label+': the card');const want=portraitFor(id,label),got=el.querySelectorAll('img').map(i=>i.getAttribute('src'))
  assert.equal(got.length,want?n:0,`${label}: ${id}'s card shows ${want?'its card art':'a blank card (its art is missing on disk)'} — ${got.length} image(s) found`)
  for(const src of got)assert.ok(src===want,`${label}: the image on ${id}'s card is its own card art, not another's`)
  if(screen)ART_SEEN[screen]++
 }
 /* kingdom.opening-reward-card-art: the images inside `el` are exactly one of that ITEM's own card art — or, for an item
    with none, no image at all and the item named in itemsMissing (its plain card). An item in neither list fails */
 function showsItemArt(el,id,label,kind){
  assert.ok(el,label+': the item');const want=itemUri(id),got=el.querySelectorAll('img').map(i=>i.getAttribute('src'))
  assert.ok(want||id in ITEMS_MISSING,`${label}: ${id} has card art, or is named in itemsMissing`)
  assert.ok(!(want&&id in ITEMS_MISSING),`${label}: ${id} is not both`)
  assert.equal(got.length,want?1:0,`${label}: ${id} shows ${want?'its card art':'its plain card (it is named in itemsMissing: '+ITEMS_MISSING[id]+')'} — ${got.length} image(s) found`)
  for(const src of got)assert.ok(src===want,`${label}: the image on ${id} is its own card art, not another's`)
  ITEM_ART_SEEN[kind+(want?'Art':'Plain')]++
  return !!want
 }

 function readMap(taken,label){
  assert.ok(shown('conquest'),label+': the map is shown');assert.ok(!shown('campaign'),label+': no campaign screen over it')
  const s=byId('conquest').querySelectorAll('[data-section]').map(g=>({id:g.dataset.section,state:g.dataset.state}))
  const next=s.find(x=>!taken.includes(x.id))
  for(const x of s)assert.equal(x.state,taken.includes(x.id)?'taken':x===next?'next':'locked',`${label}: ${x.id}`)
  return next?.id??null
 }

 /* the draft: three offered, none of a class already drafted until all six are; a Warrior or a Paladin is taken first
    when offered, so the party can carry the Flaming Longsword. The FIRST draft is stat-less — a description only; every
    later draft shows each hero's stats as the battle would field them, with the Crucible's rolled points and badges. A base hero left out of the pool for want of
    a kit is named on the screen (data-unkitted), and nobody else is.
    Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
    Rogues and Mages included'): the two lines below were
      assert.ok(opts.length>=1&&opts.length<=3,label+': one to three offered')
      … ||drafted.size>=4 …   (the class rule excused once four classes were drafted)
    — true only of the five-hero pool of four classes, where the offers shrank to two then one. The rule, as ruled: three
    at every draft, and no class twice until all SIX are drafted (2026-09-28).
    Law 10, 2026-10-03 (kingdom.opening-draft-modifiers; engine DECISIONS.md 2026-10-03 'the opening run, audited': "the
    first hero is chosen from 3, but no stats or badges shown, just a description"; 2026-09-28 'the first hero: Leadership
    …; the draft offers three with the Crucible's modifiers': "Those heroes had randomized modifiers applied to them, and
    typically you would pick the best one"): every draft asserted
      assert.doesNotMatch(o.textContent,/\d+\s*(health|accuracy|strength)/i,label+': stat-less')
    — true now of the FIRST draft only, where it is held harder (no number at all, no badge, no kit line, the hero's
    description shown). A later draft is held to the opposite, as ruled: the stats are shown, they are the numbers the
    battle would field, and they differ from the hero's row by exactly its rolled modifiers. */
 let lastOffer=null
 function draft(label){
  assert.ok(shown('campaign'),label+': the draft is shown');assert.equal(camp().cursor.step,'draft',label+': the cursor is at the draft')
  const opts=byId('campaign').querySelectorAll('[data-act=draft]')
  /* kingdom.opening-draft-cadence (2026-10-03, "One, yes."): the screen counts the heroes — 'your first hero', then
     'hero N of six' for the Nth — and never says more than one is owed before the next battle */
  const heading=byId('campaign').innerHTML.match(/<h2>([^<]*)<\/h2>/)?.[1]??'',nth=heroIds().length+1
  assert.equal(heading,nth===1?'The draft — your first hero':`The draft — hero ${nth} of six`,label+': the draft screen counts the heroes')
  assert.doesNotMatch(byId('campaign').textContent,/to draft before the next battle/,label+': one draft stands between two battles — never "2 to draft"')
  assert.equal(E.OPENING.draftsOwedOf(camp()),1,label+': exactly one draft is owed')
  assert.equal(opts.length,3,label+': three offered')
  /* kingdom.opening-draft-class-message: the draft says what its content row gives it, and only then — one line of the
     page above the three offers, in gold (its class; the colour is the stylesheet's), nothing to press; a draft with no
     row says nothing. Held on every draft of every page test, and again on a draft reopened from its save */
  {const row=DRAFT_MESSAGES.find(m=>m.draft===nth)??null,notices=byId('campaign').querySelectorAll('.draftNotice'),html=byId('campaign').innerHTML
   assert.equal(notices.length,row?1:0,`${label}: draft ${nth} ${row?'says its sentence, once':'says nothing above its offers'}`)
   if(row){
    assert.equal(notices[0].textContent,row.text,label+': the sentence is the content\'s row, word for word');assert.equal(notices[0].dataset.draftNotice,String(nth))
    assert.ok(html.indexOf('class="draftNotice"')<html.indexOf('data-act="draft"'),label+': above the offers')
    assert.equal(notices[0].querySelectorAll('[data-act]').length,0,label+': a line of the page — nothing to press')
   }else assert.ok(!/additional upgrades/i.test(byId('campaign').textContent),label+': no such sentence on this draft')
   DRAFT_NOTICES.push({label,nth,text:row?notices[0].textContent:null})}
  assert.equal(new Set(opts.map(o=>o.dataset.id)).size,3,label+': three different heroes')
  for(const o of opts)assert.ok(POOL.some(h=>h.id===o.dataset.id),`${label}: ${o.dataset.id} is a base hero of the pool`)
  const leftOut=byId('campaign').querySelectorAll('[data-unkitted]').map(el=>el.dataset.unkitted)
  assert.deepEqual(leftOut,LEFT_OUT.map(h=>h.id),label+': the base heroes with no kit are named on the draft, and nobody else')
  for(const h of LEFT_OUT)assert.ok(byId('campaign').textContent.includes(h.name),`${label}: ${h.name} is named as left out`)
  const drafted=new Set(Object.values(camp().roster).flatMap(h=>h.classes).filter(c=>c!=='class.civilian'))
  for(const o of opts)assert.ok(!(o.dataset.classes??'').split(',').some(c=>drafted.has(c))||HERO_CLASSES.every(c=>drafted.has(c)),`${label}: ${o.dataset.id} is of a class not yet drafted`)
  const first=heroIds().length===0,seen={}
  for(const o of opts){
   const id=o.dataset.id,who=`${label}: ${id}`
   /* kingdom.opening-hero-card-art: every draft card — the first draft's and every later one's — shows its hero's card art */
   showsArt(o,id,who,'draft')
   /* kingdom.opening-first-hero-class-line: every draft card — the first draft's and every later one's — shows, under the
      class word, the one sentence of its own class: the content's row, word for word */
   const lines=o.querySelectorAll('.classline'),ownClass=(o.dataset.classes??'').split(',').find(c=>HERO_CLASSES.includes(c))
   assert.equal(lines.length,1,who+': one class line');assert.equal(lines[0].dataset.classLine,ownClass,who+': the line of its own class')
   assert.ok(CLASS_LINE[ownClass],`${who}: the content holds a player-facing sentence for ${ownClass}`)
   assert.equal(lines[0].textContent,CLASS_LINE[ownClass],who+': the class line is the content\'s row')
   LINES_SEEN.classLine++
   if(first){
    /* Law 10, 2026-10-05 (kingdom.first-hero-own-positives-negatives; engine DECISIONS.md 2026-10-05 'playtest post: …, the
       first hero's positives' — Andrew: "I weirdly got a list of like six positive things for each person. It seemed like
       maybe all of the positives for all of them were showing under each of them …" — and 'the playtest post answered':
       "It should show its positives and negatives compared to a standard hero of that type. It should say one line about what
       it is, like a ranger, and then … just about the positives and negatives it has, stats, and badges."). Here each card of
       the FIRST draft was held to a list of what the hero joins with (`.joins` under the card) and to showing "no number at
       all" and "no badge by name". That list is what the FIRST HERO is given, the same for all three — the fault he reported —
       so those lines pinned it and are stale by the ruling. As the rule now stands: the same lines, held as hard, are said
       ONCE, for the pick, above the three cards (the block below reads them there instead of under the card); and the card is
       held to one line of what it is and to ITS OWN differences from its class's standard hero, which are numbers — so the
       card's only numbers, and its only badge named, are those. Everything else the card was held to stands as written.
       was: const joined=…,said=o.querySelectorAll('[data-joins]')…; assert.equal(o.querySelectorAll('.joins').length,1,who+': the list of what it joins with')
            assert.doesNotMatch(o.textContent,/\d/,who+': stat-less — no number at all')
            for(const name of BADGE_NAMES)assert.ok(!o.textContent.replace(<its name>,'').includes(name),…) */
    const gifts=byId('campaign').querySelectorAll('.firstGifts')
    assert.equal(gifts.length,1,label+': what the first hero is given is said once, for the pick')
    {const html=byId('campaign').innerHTML;assert.ok(html.indexOf('class="firstGifts"')<html.indexOf('data-act="draft"'),label+': above the three cards')}
    assert.equal(o.querySelectorAll('.joins').length+o.querySelectorAll('[data-joins]').length,0,who+': none of it is listed under the card')
    const joined=E.OPENING.draftedHeroOf(camp(),id).drafted,said=gifts[0].querySelectorAll('[data-joins]').map(li=>({of:li.dataset.joins.split(' '),words:li.textContent}))
    for(const x of said)assert.ok(!o.textContent.includes(x.words),`${who}: "${x.words}" is the pick's, not this card's`)
    /* (1) one line of what it is — its class in plain words, the content's name for it */
    {const what=o.querySelectorAll('.whatitis'),name=CODEX.classes.find(c=>c.id===ownClass).name.toLowerCase()
     assert.equal(what.length,1,who+': one line of what it is');assert.equal(what[0].dataset.what,ownClass,who+': its own class')
     assert.equal(what[0].textContent,`${/^[aeiou]/.test(name)?'An':'A'} ${name}.`,who+': "A <class>."')}
    /* (2) its OWN differences from the standard hero of its class — the sources' reading of this hero's row (content/class-
       standard.ts), stat by stat and badge by badge, and nothing else; a positive before a negative; a hero equal to the
       standard says so in a line */
    {const row=E.HEROES.HERO_POOL.find(h=>h.id===id),own=E.STANDARD.ownDifferencesOf(row),standard=E.STANDARD.classStandardOf(own.classId)
     const lines=o.querySelectorAll('[data-own]').filter(li=>li.dataset.own!=='same').map(li=>({of:li.dataset.own,words:li.textContent,pos:li.className.split(/\s+/).includes('pos')}))
     assert.deepEqual(lines.filter(x=>x.of.startsWith('stat:')).map(x=>x.of.slice(5)).sort(),own.stats.map(d=>d.stat).sort(),who+': exactly its own stats that are not the standard\'s')
     for(const d of own.stats){const mine=lines.find(x=>x.of==='stat:'+d.stat)
      assert.notEqual(d.amount,0,`${who}: ${d.stat} equals the standard and is not listed`)
      assert.equal(mine.words,`${d.amount>0?'+':''}${d.amount} ${E.STAT_WORDS.statLabelOf(d.stat)}`,`${who}: ${d.stat} against the standard's ${standard[d.stat]}`);assert.equal(mine.pos,d.amount>0,`${who}: ${mine.words} on the right side`)}
     assert.deepEqual(lines.filter(x=>x.of.startsWith('badge:')).map(x=>x.of.slice(6)).sort(),[...own.badges].sort(),who+': exactly its own badges')
     assert.match(lines.map(x=>x.pos?'p':'n').join(''),/^p*n*$/,who+': positives, then negatives')
     const same=o.querySelectorAll('.own').filter(n=>n.dataset.own==='same')
     assert.equal(same.length,lines.length?0:1,who+(lines.length?': it differs, and does not say it is the standard':': equal to the standard in everything — it says so in a line'))
     LINES_SEEN.own++;LINES_SEEN.ownLines+=lines.length;if(!lines.length)LINES_SEEN.standard++}
    /* (3) what the first hero is given, said once above the cards: one plain line for each badge (the content's words for
       it — Leadership is "Born leader"), the Health the first hero's rule gives ("Tougher than most"), and each point it
       rolled; every thing once, no line twice; never a stat table — the same for each of the three */
    for(const b of joined.badges){const mine=said.filter(x=>x.of.includes('badge:'+b));assert.equal(mine.length,1,`${who}: one plain line for ${b}`);assert.ok(BADGE_LINE[b],`${who}: the content holds plain words for ${b}`);assert.equal(mine[0].words,BADGE_LINE[b],`${who}: ${b} in the content's plain words`);LINES_SEEN.badgeLines++}
    assert.equal(said.filter(x=>x.of.some(k=>k.startsWith('badge:'))).length,joined.badges.length,who+': one line per badge it joins with, no more')
    assert.equal(said[0].words,BADGE_LINE[FIRST_HERO.badges[0]],who+': Leadership first');assert.equal(said[0].words,'Born leader')
    assert.deepEqual(said.filter(x=>x.of.includes('health')).map(x=>x.words),[STAT_LINE.health],who+': the Health, as words');assert.equal(STAT_LINE.health,'Tougher than most')
    for(const r of joined.rolls)assert.deepEqual(said.filter(x=>x.of.includes('point:'+r.stat)).map(x=>x.words),[STAT_LINE[r.stat]],`${who}: its rolled point of ${r.stat}, as words`)
    assert.deepEqual(said.flatMap(x=>x.of).sort(),[...joined.badges.map(b=>'badge:'+b),'health',...joined.rolls.map(r=>'point:'+r.stat)].sort(),who+': every thing it joins with is said, each once')
    assert.equal(new Set(said.map(x=>x.words)).size,said.length,who+': no line twice')
    assert.equal(o.querySelectorAll('.stats').length+o.querySelectorAll('.stRow').length+o.querySelectorAll('.badge').length,0,who+': no stat table and no badge block')
    LINES_SEEN.joins++;LINES_SEEN.gifts=said.length
    /* Law 10, 2026-10-04 (kingdom.opening-first-hero-class-line): the comment below read "chosen from three by description
       only — no stats, no badges, no kit" (2026-10-03 "no stats or badges shown, just a description"). The ruling of
       2026-10-04 replaces it only as far as the plain lines go, so every assertion below STANDS as written: the card
       still shows no number at all, no kit, no badge BY NAME (a badge is said as what it makes the hero) and carries no
       stats, badges or rolls as data */
    /* the first hero: chosen from three by who it is — its description, no kit, and (since 2026-10-05) its own differences */
    assert.ok(DESCRIPTION[id]&&o.textContent.includes(DESCRIPTION[id]),who+' is shown by its description')
    /* the card's words apart from its own differences (the Law 10 note above): no number at all, no kit, no badge named */
    const apart=o.querySelectorAll('[data-own]').reduce((t,n)=>t.replace(n.textContent,''),o.textContent)
    assert.doesNotMatch(apart,/\d/,who+': no number but its own differences')
    assert.doesNotMatch(o.textContent,/carries/i,who+': no kit')
    /* (a hero may be NAMED as a badge is — the Hunter — so its own name is set aside first) */
    for(const name of BADGE_NAMES)assert.ok(!apart.replace(POOL.find(h=>h.id===id).name,'').includes(name),`${who}: no badge (${name}) but its own`)
    assert.ok(o.dataset.stats===undefined&&o.dataset.badges===undefined&&o.dataset.rolls===undefined,who+' carries no stats, badges or rolls')
    continue
   }
   /* a later draft: the hero as the sources' rule rolls it on this run's own stream, shown — its stats are the numbers the
      battle would field, and they differ from its row by exactly its rolled modifiers */
   assert.ok(o.dataset.stats!==undefined&&o.dataset.badges!==undefined&&o.dataset.rolls!==undefined,who+' is shown with its stats, its rolled points and its badges')
   assert.equal(o.querySelectorAll('.joins').length,0,who+': the plain lines are the first draft\'s alone — a later draft shows the numbers')
   const want=E.OPENING.draftedHeroOf(camp(),id),d=want.drafted
   assert.equal(o.dataset.badges,d.badges.join(','),who+': its rolled badges');assert.equal(o.dataset.rolls,d.rolls.map(r=>r.stat+':'+r.amount).join(','),who+': its rolled points')
   assert.ok(d.badges.length>=1&&d.badges.every(b=>POSITIVE_BADGES.includes(b)||FLAWED_BADGES.includes(b)),who+': one to three of the Crucible\'s badges')
   for(const b of d.badges)assert.ok(o.textContent.includes(E.BADGES[b].name),`${who}: ${E.BADGES[b].name} is named`)
   const stats=numbersOf(o.dataset.stats),now=E.SEAM.fieldedPreviewOf(want).now,row=E.SEAM.fieldedPreviewOf(E.HEROES.heroRowOf(id)).now,moved=movedBy(d)
   for(const k of ['maxHp','strength','precision','armor','resist','accuracy','dodge','movement','itemSlots'])assert.ok(k in stats,`${who}: ${k} is shown`)
   for(const [k,n] of Object.entries(stats)){
    if(k==='itemSlots'){assert.equal(n,want.itemSlots,who+': its item slots');continue}
    assert.equal(n,now[k]??0,`${who}: ${k} as the battle would field it`)
    assert.equal(n-(row[k]??0),moved[k]??0,`${who}: ${k} differs from its row by its rolled modifiers`)
   }
   for(const k of Object.keys(moved))assert.ok(k in stats,`${who}: ${k}, which its modifiers move, is shown`)
   seen[id]={stats,moved:Object.values(moved).some(n=>n!==0)||want.itemSlots!==E.HEROES.heroRowOf(id).itemSlots}
  }
  /* the pick, as a player makes it: a Warrior or a Paladin while the party has none (so the Flaming Longsword has a taker);
     at the first draft, where nothing is shown to choose by, the first of them; at a later draft the best of them by the
     engine's own weighted score of what each rolled (engine DECISIONS.md 2026-09-28 'the draft pick is weighted': "typically
     you would pick the best one" — draftScoreOf, read through the kingdom's door), a tie to the earlier offer.
     Until kingdom.opening-draft-modifiers the offers were bare rows and the first taker, else the first offer, was taken. */
  const party=heroIds(),isTaker=o=>(o.dataset.classes??'').split(',').some(c=>TAKERS.includes(c))
  const takers=party.some(id=>camp().roster[id].classes.some(c=>TAKERS.includes(c)))?[]:opts.filter(isTaker),among=takers.length?takers:opts
  const scoreOf=o=>{const d=E.OPENING.draftedHeroOf(camp(),o.dataset.id).drafted;return E.draftScoreOf(o.dataset.id,d.rolls,d.badges,party)}
  const pick=first?among[0]:among.reduce((best,o)=>scoreOf(o)>scoreOf(best)?o:best,among[0])
  const offered=E.OPENING.draftedHeroOf(camp(),pick.dataset.id)
  lastOffer={label,first,heading,ids:opts.map(o=>o.dataset.id),classes:opts.flatMap(o=>(o.dataset.classes??'').split(',')),took:pick.dataset.id,leftOut,shown:seen,drafted:structuredClone(offered.drafted)}
  v.click('draft',pick.dataset.id)
  /* the one picked joins as it was offered: its badges, its points and its item slots are on the hero */
  assert.deepEqual(camp().roster[pick.dataset.id],offered,label+': the hero picked joins with the modifiers it was offered with')
  if(first){
   const d=camp().roster[pick.dataset.id].drafted
   assert.equal(d.badges[0],FIRST_HERO.badges[0],label+': the first hero gets the Leadership badge')
   assert.ok(d.badges.length>=2&&d.badges.slice(1).every(b=>POSITIVE_BADGES.includes(b)),label+': and at least one more positive badge')
   assert.deepEqual(d.mods[0],{stat:'maxHp',add:FIRST_HERO.health,source:FIRST_HERO.healthSource},label+': and +2 Health')
   assert.ok(d.rolls.length>=1&&d.rolls.every(r=>r.amount>0),label+': and a stat point, or two')
  }
  return pick.dataset.id
 }

 /* kingdom.opening-deploy-choice (engine DECISIONS.md 2026-10-03 'the opening run, audited', question 3: "Should the player
    choose which four heroes go into each battle?" — "3 yes"): who goes. The heroes free to fight are the living heroes not
    Severely wounded (civilians stay home). With the deploy limit or fewer of them the run asks nothing: Equip is on the
    screen and all of them are sent. With more, the Deploy page is on the screen — a card for each of them, nobody sent, no
    way on until somebody is — and the player sends up to the limit (send / bringHome), then goes on (toEquip). */
 const LIMIT=()=>E.PREP.deployLimitOf(camp())
 const freeToFight=()=>heroIds().filter(id=>{const h=camp().roster[id];return h.lifeState==='alive'&&h.wound<E.WOUND_UNAVAILABLE})
 const deployCards=()=>byId('campaign').querySelectorAll('.deploycard').map(el=>({id:el.dataset.hero,act:el.dataset.act,actId:el.dataset.id,going:el.classList.contains('on'),off:el.classList.contains('off'),text:el.textContent}))
 const sentNow=()=>[...camp().cursor.engagement.deployed]
 function whoGoes(label){
  const free=freeToFight(),limit=LIMIT()
  assert.ok(shown('campaign'),label+': the campaign screen is shown');assert.equal(camp().cursor.step,'prep',label+': the battle is fielded, in Combat Prep')
  if(free.length<=limit){
   /* four or fewer: no choice is asked */
   assert.equal(camp().cursor.prepStep,'equip',`${label}: ${free.length} free to fight — no choice is asked, Equip is on the screen`)
   assert.equal(byId('campaign').querySelectorAll('.deploy-page').length,0,label+': no Deploy page');assert.equal(byId('campaign').querySelectorAll('.deploycard').length,0,label+': no hero to choose')
   assert.deepEqual(sentNow().sort(),free,label+': everyone free to fight is sent')
   return {asked:false,free,limit}
  }
  /* more than four: the run asks who goes, before Equip */
  assert.equal(camp().cursor.prepStep,'deploy',`${label}: ${free.length} free to fight — the run asks which ${limit} go`)
  assert.equal(byId('campaign').querySelectorAll('.deploy-page').length,1,label+': the Deploy page is on the screen');assert.equal(byId('campaign').querySelectorAll('.equip-page').length,0,label+': and not Equip yet')
  assert.match(byId('campaign').textContent,/Who goes/,label+': it asks who goes')
  const cards=deployCards()
  assert.deepEqual(cards.map(x=>x.id),free,label+': a card for each hero free to fight, and nobody else — no civilian, nobody dead')
  for(const x of cards)assert.ok(x.text.includes(camp().roster[x.id].name),`${label}: ${x.id} is named`)
  /* kingdom.opening-hero-card-art: the Who-goes page shows the card art of every hero who may go */
  for(const el of byId('campaign').querySelectorAll('.deploycard'))showsArt(el,el.dataset.hero,`${label}: who goes`,'whoGoes')
  return {asked:true,free,limit}
 }
 /* the Deploy page as it stands against the Campaign: the cards going are the heroes sent, the count says how many, and
    with the party full the rest cannot be sent; the way on is open only once somebody is sent */
 function deployStands(label){
  const sent=sentNow(),limit=LIMIT(),cards=deployCards()
  assert.deepEqual(cards.filter(x=>x.going).map(x=>x.id),[...sent].sort(),label+': the cards marked going are the heroes sent')
  assert.match(byId('campaign').textContent,new RegExp(`${sent.length} of ${limit} chosen`),label+': the count')
  for(const x of cards){
   if(x.going)assert.deepEqual([x.act,x.actId,x.off],['undeploy',x.id,false],`${label}: ${x.id} goes — a click brings them home`)
   else if(sent.length<limit)assert.deepEqual([x.act,x.actId,x.off],['deploy',x.id,false],`${label}: ${x.id} may be sent`)
   else assert.deepEqual([x.act,x.off],[undefined,true],`${label}: ${x.id} cannot be sent — the party is full`)
  }
  const on=byId('campaign').querySelectorAll('[data-act=advance]')[0];assert.ok(on,label+': the way on to Equip')
  assert.equal(on.disabled,sent.length===0,label+': the way on is shut until somebody is sent')
  if(!sent.length){assert.throws(()=>v.click('advance'),/Missing\/disabled/,label+': nobody sent — no way on');assert.equal(camp().cursor.prepStep,'deploy')}
  return sent
 }
 function send(id,label){
  const before=sentNow();v.click('deploy',id)
  assert.deepEqual(sentNow(),[...before,id],`${label}: ${id} is sent`);deployStands(label)
 }
 function bringHome(id,label){
  const before=sentNow();v.click('undeploy',id)
  assert.deepEqual(sentNow(),before.filter(x=>x!==id),`${label}: ${id} comes home`);deployStands(label)
 }
 function toEquip(label){
  const sent=sentNow();v.click('advance')
  assert.equal(camp().cursor.prepStep,'equip',label+': on to Equip');assert.deepEqual(sentNow(),sent,label+': with the heroes chosen')
  return sent
 }

 /* the Equip step: the heroes sent, fitted, then To the battle.
    Law 10, 2026-10-03 (kingdom.opening-deploy-choice; engine DECISIONS.md 2026-10-03 'the opening run, audited': "Should the
    player choose which four heroes go into each battle?" — "3 yes"): the first assertion read
      assert.deepEqual([...camp().cursor.engagement.deployed].sort(),party,label+': the whole party is sent')
    — true while the page sent everyone it could, the first four by id. The rule now: the heroes sent are the ones the
    player chose (or everyone free to fight, when no choice was owed — whoGoes), and Equip shows exactly those: a card and
    slots for each of them, and none for a hero left home. */
 function equipThenFight(party,label){
  assert.ok(shown('campaign'),label+': Equip is shown');assert.equal(camp().cursor.prepStep,'equip',label+': the cursor is at Equip')
  assert.deepEqual([...camp().cursor.engagement.deployed].sort(),party,label+': the heroes sent are the heroes chosen')
  assert.equal(byId('campaign').querySelectorAll('.herocard').length,party.length,label+': a card per hero sent')
  const fitted=new Set(byId('campaign').querySelectorAll('[data-slot]').map(el=>el.dataset.hero))
  assert.deepEqual([...fitted].sort(),party,label+': Equip shows the heroes sent, and nobody left home')
  for(const id of party)assert.ok(byId('campaign').textContent.includes(camp().roster[id].name),`${label}: ${id} is named on Equip`)
  /* kingdom.opening-hero-card-art: every hero card at Equip shows its hero's card art (the card's hero is its slots') */
  const equipCards=byId('campaign').querySelectorAll('.herocard').map(el=>({el,id:el.querySelectorAll('[data-slot]')[0]?.dataset.hero}))
  assert.deepEqual(equipCards.map(x=>x.id).sort(),party,label+': the hero cards at Equip are the heroes sent')
  /* Law 10, 2026-10-04 (kingdom.opening-reward-card-art): this read
       for(const x of equipCards)showsArt(x.el,x.id,label+': Equip','equip')
     — every image inside the hero's card was held to be the hero's portrait, while the card held no other picture. The
     card's slots now show the art of the items they hold, so the hero's portrait is held where it is drawn — the card's
     art frame (.art): exactly one image, the hero's own — and the items' pictures are held beside it, each to its own item */
  for(const x of equipCards)showsArt(x.el.querySelectorAll('.art')[0],x.id,label+': Equip','equip')
  /* kingdom.opening-reward-card-art: every item Equip shows — each slot that holds one (data-holds) and each item in the
     stash — shows its own card art, or its plain line when it has none and is named in itemsMissing */
  for(const el of byId('campaign').querySelectorAll('[data-holds]'))showsItemArt(el,el.dataset.holds,`${label}: Equip, on ${el.dataset.hero}`,'equip')
  for(const el of byId('campaign').querySelectorAll('.item'))showsItemArt(el,el.dataset.id,label+': Equip, in the stash','equip')
  const wornShown=byId('campaign').querySelectorAll('[data-holds]').map(el=>el.dataset.hero+' '+el.dataset.holds).sort()
  assert.deepEqual(wornShown,party.flatMap(id=>camp().roster[id].equipped.map(item=>id+' '+item)).sort(),label+': Equip shows every item the heroes sent wear, each in a slot')
  v.click('advance');settle()
  return onTheBattle(label)
 }
 /* kingdom.opening-starts-in-battle: is the battle the run stands at entered straight from the draft (the sources' rule,
    core/opening.ts isOpeningStraightIn — the first battle, until it is won)? */
 const straight=()=>E.OPENING.isOpeningStraightIn(camp())
 /* … and such a battle, on the board: the pick (or a lost attempt's way on, or a run reopened before the battle was
    fought) put the battle up at once — the cursor at the battle, no campaign screen and no map over it, the Equip page
    not on the screen, exactly `party` sent — fielded as every battle is (onTheBattle) */
 function straightIn(party,label){
  settle()
  assert.ok(straight(),label+': the sources say this battle is entered straight from the draft')
  assert.equal(camp().cursor.step,'battle',label+': straight into the battle — the cursor is at the battle, not at Equip')
  assert.ok(!shown('campaign')&&!shown('conquest'),label+': the battle is on the screen — no map, no campaign screen')
  assert.equal(byId('campaign').querySelectorAll('.equip-page').length+byId('campaign').querySelectorAll('.deploy-page').length,0,label+': neither Equip nor Who-goes is on the screen')
  assert.deepEqual([...camp().cursor.engagement.deployed].sort(),[...party].sort(),label+': everyone of the party is sent')
  return onTheBattle(label)
 }
 /* the battle on its own screen, fielded as the cursor's encounter with the campaign's own Hero rows */
 function onTheBattle(label){
  assert.ok(!shown('campaign')&&!shown('conquest'),label+': the battle is its own screen')
  const s=handle.session,e=camp().cursor.engagement
  assert.equal(s.config.encounterId,e.id,label+': the encounter is fielded');assert.deepEqual(s.config.heroes,e.deployed,label+': with the deployed heroes')
  assert.deepEqual(s.config.heroRows,e.deployed.map(id=>camp().roster[id]),label+': as the campaign\'s own Hero rows')
  /* kingdom.opening-deploy-choice: the heroes on the board are the heroes sent — nobody left home is fielded */
  assert.equal(s.setup.heroUids.length,e.deployed.length,label+': one unit on the board per hero sent')
  for(const id of heroIds().filter(id=>!e.deployed.includes(id)))assert.ok(!s.ctx.state.units.some(u=>u.side==='hero'&&u.typeId===camp().roster[id].unitType),`${label}: ${id}, left home, is not on the board`)
  /* kingdom.opening-draft-modifiers: what a hero was drafted with is on it in the battle — its badges on the unit, its
     Health the fielded number, and each source's points said by the engine as it fields them (unit.modified) */
  for(const [i,id] of e.deployed.entries()){
   const h=camp().roster[id],d=h.drafted
   assert.ok(d,`${label}: ${id} holds what it was drafted with`)
   const u=s.ctx.state.units.find(x=>x.uid===s.setup.heroUids[i]);assert.ok(u,`${label}: ${id} is on the board`)
   for(const b of d.badges)assert.ok(u.badges.includes(b),`${label}: ${id} carries ${b} in the battle`)
   assert.equal(u.maxHp,E.SEAM.fieldedPreviewOf(h).now.maxHp,`${label}: ${id}'s Health in the battle`)
   for(const source of new Set(d.mods.map(m=>m.source))){
    const want={};for(const m of d.mods)if(m.source===source)want[m.stat]=(want[m.stat]??0)+m.add
    const said=s.ctx.events.find(x=>x.type==='unit.modified'&&x.actor===u.id&&x.source===source)
    assert.deepEqual(said?.stats,want,`${label}: ${id}'s points from ${source} are fielded`)
   }
   if(d.badges.includes(FIRST_HERO.badges[0])){
    assert.ok(u.badges.some(b=>POSITIVE_BADGES.includes(b)),`${label}: the first hero carries a positive badge beside Leadership`)
    const {drafted:_d,...undrafted}=h
    assert.ok(u.maxHp>=E.SEAM.fieldedPreviewOf({...undrafted,badges:h.badges.filter(b=>!d.badges.includes(b))}).now.maxHp+FIRST_HERO.health,`${label}: the first hero has +2 Health or more over the same hero undrafted`)
   }
  }
  return s
 }

 /* settle the battle on the page — won or lost as the test means it (playedOut) — then the reckoning: the recap, its
    Continue */
 function fightOut(won,label,o={}){
  if(o.civilianFalls&&!won)throw Error('a civilian is made to fall in a battle the test means to win')
  const e=camp().cursor.engagement,{save,result,how:played,seed}=(o.civilianFalls?playedOutCivilianFalls(handle.session.config):playedOut(handle.session.config,won))
  w.document.getElementById('transferText').value=save;v.click('import');settle()
  assert.equal(handle.session.ctx.state.outcome==='heroClear',won,label+': the battle ends '+(won?'won':'lost'))
  assert.ok(!shown('conquest'),label+': the outcome stands on the battle');assert.equal(byId('commands').querySelectorAll('[data-act=reckon]').length,1,label+': the outcome offers the reckoning')
  v.click('reckon');wait(2500)
  assert.ok(shown('campaign'),label+': the recap is shown');const recap=byId('campaign').querySelector('.recap')
  assert.ok(recap,label+': the recap');assert.equal(recap.dataset.won,String(won),label+': the recap says '+(won?'won':'lost'))
  /* kingdom.opening-hero-card-art: the victory screen shows the card art of every hero who fought (its party row, in the
     order they were sent) and of the hero in its spotlight; a lost battle's recap has the spotlight alone */
  const faces=recap.querySelectorAll('.party-portrait')
  if(won){assert.equal(faces.length,e.deployed.length,label+': the victory screen shows a face per hero who fought');for(const [i,id] of e.deployed.entries())showsArt(faces[i],id,label+': the victory screen','victory')}
  /* kingdom.opening-recap-civilians (engine DECISIONS.md 2026-10-03 'the civilians show on the victory screen; …': "The
     battle should show in this victory screen too. If they were wounded, if they died, they're in there too."): the
     victory screen shows a card for EVERY player-side unit of the battle — the heroes in their row, as above, and, set
     apart in a row of their own (#rc-civilians), every hero-side unit of the result that is not a roster hero — each
     with its name, its own portrait (or none, when it has none on disk), and its mark, in words and on the card:
     unhurt, wounded (it went down and lives) or dead, as the pasted battle's own tallies left it; one that lived
     through a won battle and joined the roster is marked as joining; and the report names each one wounded or dead as
     a hero is named — "No wounds sustained" is said only when no hero and no civilian was. A lost battle shows none. */
  const fought=result.units.filter(u=>u.side==='hero'&&u.role!==undefined),civs=recap.querySelectorAll('.civilian-member')
  /* kingdom.opening-replay-rules (engine DECISIONS.md 2026-10-03 '… a lost battle pays no XP; a replay rolls new dice'): a
     lost battle's screen says no XP was earned */
  if(!won)assert.match(byId('campaign').innerHTML,/XP earned: <b>0<\/b>/,label+': the lost battle\'s screen says no XP was earned')
  if(!won)assert.equal(civs.length,0,label+': a lost battle\'s screen shows no civilians')
  else{
   assert.equal(civs.length,fought.length,label+': a card for every civilian who fought')
   assert.equal(faces.length+civs.length,result.units.filter(u=>u.side==='hero').length,label+': a card for every player-side unit of the battle')
   if(fought.length){
    const row=byId('rc-civilians');assert.ok(row,label+': the civilians have a row of their own')
    assert.deepEqual(row.querySelectorAll('.civilian-member').map(c=>c.dataset.unit),fought.map(u=>u.typeId),label+': the civilians\' row holds every civilian who fought, in the battle\'s order')
    assert.equal(byId('rc-party').querySelectorAll('.civilian-member').length,0,label+': no civilian among the heroes');assert.equal(row.querySelectorAll('.party-portrait').length,0,label+': no hero among the civilians')
    assert.match(row.textContent,/Civilians/,label+': the row says who they are')
   }
   const reportText=byId('rc-report').textContent,seen=[]
   for(const [i,u] of fought.entries()){
    const card=civs[i],fate=u.lifeState==='dead'?'dead':u.lifeState==='downed'||u.downed||u.stood?'wounded':'unhurt'
    const rescued=E.HEROES.RESCUABLE_CIVILIANS.find(h=>h.unitType===u.typeId),name=rescued&&fought.filter(x=>x.typeId===u.typeId).length===1?rescued.name:u.name
    assert.equal(card.dataset.fate,fate,`${label}: ${u.typeId} is marked ${fate}, as the battle left it`)
    assert.ok(card.textContent.includes(name),`${label}: ${name} is named`)
    assert.ok(card.textContent.includes({unhurt:'Unhurt',wounded:'Wounded',dead:'Dead'}[fate]),`${label}: ${name}'s mark is said in words`)
    assert.ok(card.querySelectorAll('.civilian-portrait')[0].classList.contains(fate),`${label}: ${name}'s card wears its mark`)
    if(rescued)showsArt(card.querySelectorAll('.civilian-portrait')[0],rescued.id,label+': the victory screen, '+name,null)
    else assert.equal(card.querySelectorAll('img').length,0,`${label}: ${name} has no row and no portrait`)
    const joins=fate!=='dead'&&!!rescued&&!!camp().roster[rescued.id]
    assert.equal(card.dataset.joins,joins?'1':'0',`${label}: ${name} ${joins?'is marked as joining':'is not marked as joining'}`)
    if(fate!=='dead'&&rescued)assert.ok(camp().roster[rescued.id],`${label}: ${name} lived through a won battle and joined the roster`)
    if(fate==='dead'&&rescued)assert.ok(!camp().roster[rescued.id],`${label}: ${name} died and did not join`)
    if(fate!=='unhurt')assert.ok(reportText.includes(`${name} — ${fate==='dead'?'fell in battle':'Wounded'}`),`${label}: the report names ${name}`)
    else assert.ok(!reportText.includes(name+' —'),`${label}: the report does not name ${name}, who was unhurt`)
    seen.push({typeId:u.typeId,name,fate,joins})
   }
   const heroesHurt=e.deployed.some(id=>camp().roster[id].lifeState==='dead'||camp().roster[id].wound>0)
   assert.equal(/No wounds sustained/.test(reportText),!heroesHurt&&seen.every(x=>x.fate==='unhurt'),label+': "No wounds sustained" is said only when no hero and no civilian was wounded or killed')
   CIVILIANS_SEEN.push({label,encounterId:e.id,civilians:seen})
  }
  const spot=recap.querySelectorAll('.spotlight-frame')[0],spotSrc=spot?.querySelectorAll('img').map(i=>i.getAttribute('src'))??[]
  const spotOf=e.deployed.filter(id=>{const p=portraitFor(id,label+': the spotlight');return p&&spotSrc[0]===p})
  assert.ok(spotSrc.length<=1&&(spotSrc.length===1?spotOf.length>=1:e.deployed.some(id=>!portraitFor(id,label))),label+': the spotlight shows the card art of a hero who fought')
  v.click('exit');wait(100)
  /* … and the rewards screen, when the battle leads to it: every hero card there is its hero's card art. The portrait is
     a background there (rewards.html's own markup), so it is read off the page's HTML, the card's own block */
  if(byId('campaign').querySelector('.rewards')){
   /* kingdom.opening-reward-card-art: every reward card on the rewards screen shows its item's own card art, or its
      plain face when the item has none and is named in itemsMissing; the Flaming Longsword's shows its card art */
   const offered=[...(camp().cursor.rewardOffer??[])],rewardCards=byId('campaign').querySelectorAll('.reward-card')
   assert.deepEqual(rewardCards.map(c=>c.dataset.id),camp().cursor.step==='rewards'?offered:[],label+': a reward card for each item offered')
   for(const c of rewardCards){
    const has=showsItemArt(c,c.dataset.id,label+': the reward card','reward')
    assert.equal(c.dataset.art,has?'1':'0',`${label}: ${c.dataset.id}'s card says whether it has art`)
    if(!has)assert.match(c.textContent,/no art yet/,`${label}: ${c.dataset.id}: the plain card`)
    if(c.dataset.id===FLAMING_LONGSWORD){assert.ok(has,label+': the Flaming Longsword\'s reward card shows its card art');ITEM_ART_SEEN.sword=true}
   }
   const html=byId('campaign').innerHTML,cards=byId('campaign').querySelectorAll('.hero-card')
   assert.deepEqual(cards.map(c=>c.dataset.hero),[...e.deployed],label+': the rewards screen shows a card per hero who fought')
   for(const id of e.deployed){
    const from=html.indexOf(`data-hero="${id}"`),block=html.slice(from,html.indexOf('hero-name',from)),want=portraitFor(id,label+': the rewards screen')
    assert.ok(from>=0&&block.includes('class="hero-portrait"'),`${label}: the rewards screen: ${id}'s card`)
    assert.ok(want?block.includes(`style="background-image:url(${want})"`):!block.includes('url('),`${label}: the rewards screen: ${id}'s card shows ${want?'its own card art':'a blank card'}`)
    ART_SEEN.rewards++
   }
  }
  return {e,result,played,seed}
 }

 /* kingdom.opening-specialty-three: the specialty choice on the level-up sheet (#lu-specialty) — exactly three cards, three
    different specialties, each of the hero's own class (one of the class's nine), and they are the three the sources' rule
    draws for that hero on this run (core/rewards.ts specialtyOfferOf); no way to take the level without one; nothing can
    be confirmed until one is chosen. Returns the three ids, in the order shown */
 function threeOffered(over,id,label){
  const cards=over.querySelectorAll('.choice-card'),ids=cards.map(c=>c.dataset.id)
  assert.equal(ids.length,SPECIALTY_OFFER,`${label}: ${id} is offered exactly three specialties — ${ids.length} shown`);assert.equal(SPECIALTY_OFFER,3)
  assert.equal(new Set(ids).size,3,`${label}: ${id}: three different specialties`)
  const classId=E.REWARDS.levelTableOfHero(camp(),id).classId,nine=E.PROGRESS.specialtiesOf(classId).map(s=>s.id)
  for(const s of ids)assert.ok(nine.includes(s),`${label}: ${id}: ${s} is a ${classId} specialty`)
  assert.deepEqual(ids,E.REWARDS.specialtyOfferOf(camp(),id).map(s=>s.id),`${label}: ${id}: the three are the run's own draw for this hero`)
  for(const c of cards)assert.ok(c.textContent.includes(E.PROGRESS.specialtyOf(c.dataset.id).name),`${label}: ${id}: ${c.dataset.id} is named`)
  assert.equal(over.querySelectorAll('[data-act=lu-decline-specialty]').length,0,`${label}: ${id}: the choice cannot be skipped`)
  assert.ok(byId('lu-specialty-confirm').disabled,`${label}: ${id}: nothing to confirm until one is chosen`)
  return ids
 }
 /* the level-up sheet opened for the first hero who may level, up to its specialty choice: who, and the three offered.
    The sheet is left open — the test closes the page on it (and opens it again: the same three) */
 function specialtyOffer(label){
  const b=byId('campaign').querySelectorAll('[data-act=level-hero]')[0];assert.ok(b,label+': a hero may level')
  const id=b.dataset.id;v.click('level-hero',id);wait(1600)
  const over=byId('lu-specialty');assert.ok(over,`${label}: ${id}'s level-up sheet asks for its specialty`)
  return {id,offered:threeOffered(over,id,label)}
 }
 /* kingdom.opening-hero-death-replays (engine DECISIONS.md 2026-10-03 'the opening run: a battle in which a hero dies is
    replayed': "If a hero dies, it should be replayed." · "6 offer replay"): the battle on the board settled WITH THE
    HEROES AT `fall` DEAD (playedOutHeroFalls — won by the others, or lost when everyone sent falls), then its reckoning:
    the screen that follows names who fell and says the battle is not kept and is fought again; NOTHING of the attempt
    is written — the roster (every hero alive, with the XP, wounds, levels and items it had), the stash, the purse, the
    losses counted, the battle owed — only the replay is counted; no reward, no rescue; and its one way on goes back to
    the map. Returns who fell */
 function fallOut(fall,label){
  const e=camp().cursor.engagement,replays=camp().cursor.replays??0,battle=camp().cursor.prologue
  const held=()=>JSON.stringify({roster:camp().roster,stash:camp().stash,purse:camp().purse,renown:camp().renown,losses:camp().losses})
  const before=held(),all=fall.length===e.deployed.length
  const {save,result,seed}=playedOutHeroFalls(handle.session.config,fall)
  /* who fell: the heroes the battle left dead — every one named when some of the party is to fall; when everyone sent is
     to fall, those dead when the last of them went down (the rest are down, and the battle is lost) */
  const sent=result.units.filter(u=>u.side==='hero'&&u.role===undefined),fallen=sent.filter(u=>u.lifeState==='dead').map(u=>e.deployed[u.index])
  assert.ok(fallen.length>=1,label+': a hero died');if(!all)assert.deepEqual(fallen,fall.map(i=>e.deployed[i]),label+': the heroes meant to fall are the dead')
  else assert.ok(sent.every(u=>u.lifeState!=='standing'),label+': nobody sent is left standing')
  w.document.getElementById('transferText').value=save;v.click('import');settle()
  assert.equal(handle.session.ctx.state.outcome==='heroClear',!all,`${label}: the battle ends ${all?'lost, everyone sent dead or down':'WON, with a hero dead'}`)
  v.click('reckon');wait(2500)
  assert.ok(shown('campaign'),label+': the screen after the battle is shown');const recap=byId('campaign').querySelector('.recap')
  assert.ok(recap,label+': the screen');assert.equal(recap.dataset.voided,'1',label+': it is the screen of a battle not kept');assert.equal(recap.dataset.won,'false')
  assert.equal(recap.dataset.fallen,fallen.join(','),label+': it names who fell')
  for(const id of fallen)assert.ok(recap.textContent.includes(camp().roster[id].name),`${label}: ${camp().roster[id].name} is named`)
  assert.match(recap.textContent,/ fell/,label+': it says they fell');assert.match(recap.textContent,/not kept/,label+': it says the battle is not kept');assert.match(recap.textContent,/fought again/,label+': and that it is fought again')
  const cards=recap.querySelectorAll('.fell-member')
  assert.deepEqual(cards.map(c=>c.dataset.hero),[...e.deployed],label+': the party who went is shown');assert.deepEqual(cards.filter(c=>c.dataset.fell==='1').map(c=>c.dataset.hero),fallen,label+': the fallen are marked')
  for(const c of cards)showsArt(c.querySelectorAll('.party-portrait')[0],c.dataset.hero,label+': who fell',null)
  assert.equal(recap.querySelectorAll('.civilian-member').length,0);assert.doesNotMatch(recap.textContent,/Claim Rewards|XP Earned/,label+': nothing is claimed, nothing earned')
  const on=recap.querySelectorAll('[data-act=exit]');assert.equal(on.length,1,label+': one way on');assert.match(on[0].textContent,/again/i,label+': it offers the battle again')
  /* nothing of that attempt is kept */
  assert.equal(held(),before,label+': the roster, the stash, the purse and the losses are what they were before the battle')
  for(const id of e.deployed)assert.equal(camp().roster[id].lifeState,'alive',`${label}: ${id} is alive on the roster`)
  assert.equal(camp().cursor.rewardOffer,null,label+': no reward is offered');assert.equal(camp().ended,null,label+': the run goes on')
  assert.deepEqual([camp().cursor.prologue,camp().cursor.replays],[battle,replays+1],label+': the same battle is owed, and the replay is counted')
  v.click('exit');wait(100)
  /* kingdom.opening-starts-in-battle (2026-10-04): a battle entered straight from the draft (the first, until it is won) is
     offered again the same way — straight back onto the board; every other goes back to the map, as before */
  if(straight()){settle();assert.equal(camp().cursor.step,'battle',label+': straight back into the battle — never left with nothing to click');assert.ok(!shown('conquest'),label+': no map')}
  else{assert.equal(camp().cursor.step,'open',label+': back to the map — never left with nothing to click');assert.ok(shown('conquest'),label+': the map is shown')}
  return {e,result,seed,fallen,all}
 }
 /* every LEVEL UP the rewards page offers, through the level-up sheet; the specialty chosen where one is owed */
 function levelUps(label){
  for(let guard=0;guard<12;guard++){
   const b=byId('campaign').querySelectorAll('[data-act=level-hero]')[0];if(!b)break
   const id=b.dataset.id,before=camp().roster[id].level
   v.click('level-hero',id);wait(1600)
   const sheet=byId('campaign').querySelector('.levelup');assert.ok(sheet,`${label}: ${id}'s level-up sheet`)
   /* kingdom.opening-hero-card-art: the level-up screen shows the hero's card art (its card, before and after) */
   showsArt(sheet.querySelectorAll('.lu-portrait')[0],id,`${label}: the level-up screen`,'levelUp',2)
   assert.equal(sheet.querySelectorAll('[data-act=lu-decline-specialty]').length,0,`${label}: no level without a specialty here — the engine fields no level-2 hero without one`)
   const over=byId('lu-specialty'),pick=byId('lu-pick')
   /* the specialty owed at the first level-up, then a level's pick, each chosen and confirmed; else the hero is clicked */
   /* Law 10, 2026-10-04 (kingdom.opening-specialty-three): this took the first of the cards shown — the first of the class's
      nine. The same click now takes one of the three offered (the first shown), after the three are held (threeOffered) */
   let chose=null
   if(over){const offered=threeOffered(over,id,label),card=over.querySelectorAll('.choice-card')[0];chose={label,id,offered,took:card.dataset.id};fire(over,'click',card);fire(byId('lu-specialty-confirm'),'click');wait(500)}
   if(pick){const card=pick.querySelectorAll('.choice-card')[0];fire(pick,'click',card);fire(byId('lu-pick-confirm'),'click')}
   if(!over&&!pick)fire(byId('lu-card'),'click')
   wait(4000)
   assert.equal(camp().roster[id].level,before+1,`${label}: ${id} levels`)
   if(over)assert.ok(camp().roster[id].specialty,`${label}: ${id} holds a specialty`)
   if(chose){assert.equal(camp().roster[id].specialty,chose.took,`${label}: ${id} has the specialty it took — one of its three`);SPECIALTY_CHOICES.push(chose)}
   fire(byId('lu-continue'),'click');wait(300)
   assert.ok(byId('campaign').querySelector('.rewards'),`${label}: back on the rewards page`)
  }
  assert.equal(camp().cursor.step==='levelUp'||camp().cursor.step==='open',true,label+': nothing left but to go on')
  if(camp().cursor.step==='levelUp')v.click('exit')
  wait(100)
 }

 /* take a reward card: flip it, choose it, confirm; a named-class item asks who carries it */
 function takeReward(index,label){
  const row=byId('rw-row'),card=row.querySelectorAll('.reward-card')[index]
  assert.ok(card,label+': a reward card to take')
  /* kingdom.rewards-only-authored, kingdom.rewards-derived-rows-offered: the screen shows only his items — on the list of
     the rows Andrew authored, or one of his bases carrying one of his attributes — or the one item the battle's own row names */
  const own=(o=>o?.kind==='item'?o.itemId:null)(E.REWARD_ROWS.encounterRewardOf(camp().cursor.engagement?.id??'')?.offer)
  for(const shownCard of row.querySelectorAll('.reward-card')){
   const id=shownCard.dataset.id
   if(id===own){REWARD_CARDS_SEEN.named.push(id);continue}
   assert.ok(AUTHORED_IDS.has(id)||madeOfHis(id),`${label}: the reward screen shows ${id} (${E.ITEMS.itemOf(id).name}), which is not on the list of the items Andrew authored, is not one of his bases carrying one of his attributes, and is not this battle's named reward`)
   if(AUTHORED_IDS.has(id))REWARD_CARDS_SEEN.listed++;else REWARD_CARDS_SEEN.made++
  }
  fire(row,'click',card);wait(1500)
  /* kingdom.equip-item-card: a card face down opens nothing; turned and clicked, it opens its item's card — the same card
     Equip opens — beside the reward cards; one card, this item's, with its name; clicking away closes it and the reward
     stays chosen */
  assert.equal(byId('campaign').querySelectorAll('.itemcard').length,0,label+': no item card before a reward card is chosen')
  fire(row,'click',card)
  {const open=byId('campaign').querySelectorAll('.itemcard'),id=card.dataset.id,name=E.ITEMS.itemOf(id).name
   assert.equal(open.length,1,label+': the reward card chosen opens one item card');assert.equal(open[0].dataset.itemCard,id,label+': the card of that item')
   assert.ok(open[0].textContent.includes(name),`${label}: the item card names ${name}`)
   assert.equal(open[0].dataset.art,ITEMS_ART[id]?'1':'0',`${label}: ${name}'s item card shows its art when it has any`)
   const hx=byId('campaign').querySelectorAll('.hx')[0];fire(hx,'click',hx)
   assert.equal(byId('campaign').querySelectorAll('.itemcard').length,0,label+': a click away closes the item card')
   assert.ok(card.classList.contains('selected'),label+': and the reward stays chosen')
   ITEM_CARDS_SEEN.push(name)}
  fire(byId('rw-confirm'),'click');wait(300)
  return card.dataset.id
 }

 /* kingdom.opening-hero-card-art: who may carry a reward that names its takers — the heroes offered, each shown with its
    own card art (the rewards screen's carrier); [] when the reward goes to the stash */
 /* kingdom.opening-sword-waits (engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword waits for its taker;
    …' — "One, yes."): the offer of an item that has waited in the stash, made between battles once a hero of its
    classes has room for it — the screen names the item and whose it is, and offers exactly the heroes who may carry it,
    each with its own card art; null when no such offer is on the screen */
 function waitingOffer(label){
  const box=byId('campaign').querySelectorAll('.waitingOffer')[0];if(!box)return null
  const item=box.dataset.waiting
  assert.equal(camp().cursor.step,'open',label+': the waiting item is offered between battles');assert.ok(camp().stash.includes(item),`${label}: ${item} is in the stash`)
  const whose=E.REWARD_ROWS.rewardTakersOf(item);assert.ok(whose,`${label}: ${item} is an item its row gives to named classes`)
  assert.ok(box.textContent.includes(E.ITEMS.itemOf(item).name)&&/has waited in the stash/.test(box.textContent),label+': the screen says the item has waited')
  const may=heroIds().filter(id=>{const h=camp().roster[id];return h.lifeState==='alive'&&h.classes.some(c=>whose.includes(c))})
  const offered=carriers(label+', the waiting item')
  assert.ok(offered.length>=1&&offered.every(id=>may.includes(id)),`${label}: only a living hero of ${whose.join(' or ')} is offered it`)
  assert.deepEqual(offered,E.REWARDS.listWaitingOffers(camp()).find(o=>o.itemId===item).takers,label+': the heroes offered are the ones who may take it')
  return {item,offered,whose}
 }
 function carriers(label){
  const buttons=byId('campaign').querySelectorAll('[data-act=give]')
  for(const b of buttons)showsArt(b,b.dataset.id,label+': who carries it','carrier')
  return buttons.map(b=>b.dataset.id)
 }

 return {get lastOffer(){return lastOffer},drawn,straight,straightIn,v,w,root,handle,store:v.store,camp,byId,shown,heroIds,civilianIds,settle,wait,readMap,draft,freeToFight,whoGoes,deployStands,send,bringHome,toEquip,equipThenFight,onTheBattle,fightOut,fallOut,levelUps,specialtyOffer,takeReward,carriers,waitingOffer}
}
