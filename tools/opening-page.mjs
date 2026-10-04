// The opening's page, driven — the steps tools/opening-loop-three.verify.mjs and tools/opening-run-six.verify.mjs take on
// the BUILT sandbox opened with ?map, through the page's own controls: the map, the draft, who goes, Equip, the battle settled by a
// pasted engine save, the reckoning, the rewards and the level-ups. One copy for both (kingdom.opening-run-six).
//
// A battle is settled by the engine and its save pasted back into the page ("Resume pasted save") — the page takes it as
// the campaign's battle only when it is that battle with that party. How it is played — the run's own party made
// overpowered for a win, held idle for a loss, no seed sought — is playedOut's, below (kingdom.page-test-strong-party).
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'

export const TAKERS=['class.warrior','class.paladin']
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {createSandbox,saveSandbox,sandboxResult,advanceSandbox,sandboxActivationChoices,commandSandbox,playerPolicy} from './src/core/sandbox.ts';export {runBattle,createBattle,BADGES,draftScoreOf} from './src/engine.ts';export * as HEROES from './src/content/heroes.ts';export * as OPENING from './src/core/opening.ts';export * as SEAM from './src/core/seam.ts';export * as PREP from './src/core/prep.ts';export {WOUND_UNAVAILABLE} from './src/content/wounds.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
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
const DESCRIPTION=Object.fromEntries(JSON.parse(readFileSync(new URL('../../content/hbt-content.json',import.meta.url),'utf8')).heroes.heroes.map(h=>[h.id,h.backstory]))
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
       four damage stats, Accuracy) and the engine's AI plays both sides; the first and only battle played is won, with
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
export const STRONG_PARTY={source:'test.strong-party',stats:{maxHp:500,armor:50,resist:50,strength:30,precision:30,magic:30,spirit:30,accuracy:100}}
export const HELD_PARTY={source:'test.strong-party',stats:{maxHp:500,armor:50,resist:50},turnCap:1}
/* the sandbox the page fields for `config`, its party's heroes given `as`'s stat mods (and its turn cap) */
function fieldedAs(config,as){
 const base=E.createSandbox(structuredClone(config)),add=Object.entries(as.stats).map(([stat,n])=>({stat,add:n,source:as.source}))
 const heroMods=base.setup.heroes.map((_,i)=>{const own=base.setup.heroMods?.[i];return {...(own??{}),stats:[...(own?.stats??[]),...add]}})
 const setup={...base.setup,heroMods,...(as.turnCap?{cfg:{...(base.setup.cfg??{}),turnCap:as.turnCap}}:{})},ctx=E.createBattle(setup)
 return {...base,setup,ctx,policy:E.playerPolicy(ctx)}
}
/* the player's side, played out: 'ai', the engine's AI plays everyone; 'idle', every activation of the player's side
   begun and ended (the heroes and the civilians stand still), the enemies the engine's AI */
function playOut(s,how){
 if(how==='ai'){E.runBattle(s.ctx);return}
 E.advanceSandbox(s)
 for(let i=0;i<50000&&!s.ctx.state.outcome;i++){const ctx=s.ctx,at=ctx.battleCursor?.at,seq=ctx.state.seq
  let r=null
  if(at==='selecting')r=E.commandSandbox(s,{kind:'select-activation',unitUid:E.sandboxActivationChoices(s)[0].uid,expectedSeq:seq})
  else if(at==='acting')r=E.commandSandbox(s,{kind:'end-cycle',actor:ctx.battleCursor.actor,expectedSeq:seq})
  if(!r?.ok)throw Error('the player\'s side could not go on: '+(r?.reason??at))}
}

/* one battle settled as the test means it to end — won (the strong party, the engine's AI) or lost (the party held idle,
   cut at Turn 1) — and the save a person would have made at that moment. One battle, on the Engagement's own seed; a
   battle that does not end as meant, or that hurts the party, is not searched around: the driver stops (Law 9) */
export function playedOut(config,won){
 const how=won?'ai':'idle',s=fieldedAs(config,won?STRONG_PARTY:HELD_PARTY);playOut(s,how)
 const r=E.sandboxResult(s),party=r.units.filter(u=>u.side==='hero'&&u.role===undefined)
 if((r.outcome==='heroClear')!==won)throw Error(`${config.encounterId} on seed ${config.seed}: meant to be ${won?'won by the strong party':'lost by the party held idle'}, it ended '${r.outcome}' on Turn ${r.turns} — the driver settles one battle and searches for none (kingdom.page-test-strong-party)`)
 const hurt=party.filter(u=>u.lifeState!=='standing'||u.downed||u.stood)
 if(hurt.length)throw Error(`${config.encounterId} on seed ${config.seed}: the ${won?'strong':'held'} party was hurt (${hurt.map(u=>config.heroes[u.index]+' '+u.lifeState).join(', ')}) — it is meant to end ${won?'won':'lost'} with nobody dead, down or wounded`)
 return {save:E.saveSandbox(s),result:r,how,seed:config.seed,turns:r.turns}
}

/** The built sandbox opened at `search`, in a browser whose storage is `store` (a Map; a fresh one when absent). */
export function openingPage(page,search,store){
 const v=bootSlice(page,{search,store}),w=v.w,root=v.root,handle=w.__sandbox
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
  ART_SEEN[screen]++
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
  assert.equal(opts.length,3,label+': three offered')
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
   if(first){
    /* the first hero: chosen from three by description only — no stats, no badges, no kit */
    assert.ok(DESCRIPTION[id]&&o.textContent.includes(DESCRIPTION[id]),who+' is shown by its description')
    assert.doesNotMatch(o.textContent,/\d/,who+': stat-less — no number at all')
    assert.doesNotMatch(o.textContent,/carries/i,who+': no kit')
    /* (a hero may be NAMED as a badge is — the Hunter — so its own name is set aside first) */
    for(const name of BADGE_NAMES)assert.ok(!o.textContent.replace(POOL.find(h=>h.id===id).name,'').includes(name),`${who}: no badge (${name})`)
    assert.ok(o.dataset.stats===undefined&&o.dataset.badges===undefined&&o.dataset.rolls===undefined,who+' carries no stats, badges or rolls')
    continue
   }
   /* a later draft: the hero as the sources' rule rolls it on this run's own stream, shown — its stats are the numbers the
      battle would field, and they differ from its row by exactly its rolled modifiers */
   assert.ok(o.dataset.stats!==undefined&&o.dataset.badges!==undefined&&o.dataset.rolls!==undefined,who+' is shown with its stats, its rolled points and its badges')
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
  lastOffer={label,first,ids:opts.map(o=>o.dataset.id),classes:opts.flatMap(o=>(o.dataset.classes??'').split(',')),took:pick.dataset.id,leftOut,shown:seen,drafted:structuredClone(offered.drafted)}
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
  for(const x of equipCards)showsArt(x.el,x.id,label+': Equip','equip')
  v.click('advance');settle()
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
 function fightOut(won,label){
  const e=camp().cursor.engagement,{save,result,how:played,seed}=playedOut(handle.session.config,won)
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
  const spot=recap.querySelectorAll('.spotlight-frame')[0],spotSrc=spot?.querySelectorAll('img').map(i=>i.getAttribute('src'))??[]
  const spotOf=e.deployed.filter(id=>{const p=portraitFor(id,label+': the spotlight');return p&&spotSrc[0]===p})
  assert.ok(spotSrc.length<=1&&(spotSrc.length===1?spotOf.length>=1:e.deployed.some(id=>!portraitFor(id,label))),label+': the spotlight shows the card art of a hero who fought')
  v.click('exit');wait(100)
  /* … and the rewards screen, when the battle leads to it: every hero card there is its hero's card art. The portrait is
     a background there (rewards.html's own markup), so it is read off the page's HTML, the card's own block */
  if(byId('campaign').querySelector('.rewards')){
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
   if(over){const card=over.querySelectorAll('.choice-card')[0];fire(over,'click',card);fire(byId('lu-specialty-confirm'),'click');wait(500)}
   if(pick){const card=pick.querySelectorAll('.choice-card')[0];fire(pick,'click',card);fire(byId('lu-pick-confirm'),'click')}
   if(!over&&!pick)fire(byId('lu-card'),'click')
   wait(4000)
   assert.equal(camp().roster[id].level,before+1,`${label}: ${id} levels`)
   if(over)assert.ok(camp().roster[id].specialty,`${label}: ${id} holds a specialty`)
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
  fire(row,'click',card);wait(1500);fire(row,'click',card);fire(byId('rw-confirm'),'click');wait(300)
  return card.dataset.id
 }

 /* kingdom.opening-hero-card-art: who may carry a reward that names its takers — the heroes offered, each shown with its
    own card art (the rewards screen's carrier); [] when the reward goes to the stash */
 function carriers(label){
  const buttons=byId('campaign').querySelectorAll('[data-act=give]')
  for(const b of buttons)showsArt(b,b.dataset.id,label+': who carries it','carrier')
  return buttons.map(b=>b.dataset.id)
 }

 return {get lastOffer(){return lastOffer},v,w,root,handle,store:v.store,camp,byId,shown,heroIds,civilianIds,settle,wait,readMap,draft,freeToFight,whoGoes,deployStands,send,bringHome,toEquip,equipThenFight,onTheBattle,fightOut,levelUps,takeReward,carriers}
}
