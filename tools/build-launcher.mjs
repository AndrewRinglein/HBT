#!/usr/bin/env node
// kingdom.play-launcher (engine DECISIONS.md 2026-09-30 "the game plays from a link"). Andrew: "I don't want to have to
// go dig for bat files. I want a way to play this game out of a link." · "Make me a game launcher where I can play the
// various battles." Builds PLAY.html — the launcher the server answers at http://127.0.0.1:4230/play — from the facts
// that own them: which battles may be played is the sandbox's list (SANDBOX_ENCOUNTERS, the engine's encounters); each
// one's place in the opening is its engine scenario's openingPosition; what it fields is the engine's encounter (setup
// and schedule), named by the engine's units; its picture is its 3D map's review render (the scene the opening ground
// proposal names for it); whether it stands on that 3D map in the battle screen is the viewer's painted pack. Nothing
// here is typed by hand. Each card opens BATTLE-SANDBOX.html?play=<encounter id>.
//
//   node tools/build-launcher.mjs [out]      (default PLAY.html) — generated, never hand-edit
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {resolve,dirname,basename} from 'node:path'
import {pathToFileURL} from 'node:url'
const require=createRequire(import.meta.url),esbuild=require('../../engine/node_modules/esbuild')
const ROOT=resolve('..'),sha=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim()
const engine=execFileSync('git',['-C','../engine','rev-parse','--short','HEAD'],{encoding:'utf8'}).trim()
/* the kingdom's own content, through its one door to the engine */
const entry=`export {SANDBOX_ENCOUNTERS} from './src/content/sandbox.ts';export {ENCOUNTERS,SCENARIOS,UNITS} from './src/engine.ts'`
const built=esbuild.buildSync({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
mkdirSync('scratch',{recursive:true});writeFileSync('scratch/launcher-facts.mjs',built.outputFiles[0].text)
const {SANDBOX_ENCOUNTERS,ENCOUNTERS,SCENARIOS,UNITS}=await import(pathToFileURL(resolve('scratch/launcher-facts.mjs')).href+'?'+Date.now())
const {SCENES}=await import('../../viewer/tools/painted-scenes.mjs')
const proposal=JSON.parse(readFileSync(resolve(ROOT,'assets/battle-atlas/opening-ground-proposal-2026-09-28.json'),'utf8'))
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c])
const nameOf=id=>{const u=UNITS[id];if(!u?.name)throw Error(`launcher: unit ${id} has no name`);return u.name}
/** a battle's 3D map render: <scene>/review.png, else the scene family's review/<scene>.png; null when it has none */
/* viewer.caravan-scene (2026-10-01): a map compiled from a painted scene's navigation (content/gen/painted-maps.json) has no
   ground-proposal row; its picture is its scene's review render — the caravan's accepted presentation render, which its
   production.json presentationRevision records (kingdom SWITCHES launcherCaravanPicture) */
const painted=JSON.parse(readFileSync(resolve(ROOT,'content/gen/painted-maps.json'),'utf8'))
const PAINTED_PICTURE={'caravan-aftermath':'review-tactical-surroundings.png'}
function pictureOf(name,mapId){
 const row=proposal.maps.find(m=>m.name===name),scene=painted.scenes?.[mapId]?.scene
 if(!row&&!scene)return null
 const dir=resolve(ROOT,row?row.file:'assets/terrain-3d/'+scene),own=dir+'/review.png',family=resolve(dirname(dir),'review',basename(dir)+'.png'),named=scene&&PAINTED_PICTURE[scene]?dir+'/'+PAINTED_PICTURE[scene]:null
 const file=existsSync(own)?own:existsSync(family)?family:named&&existsSync(named)?named:null;if(!file)return null
 const b64=execFileSync('python3',['-c',`import sys,io,base64
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB');im.thumbnail((720,720));b=io.BytesIO();im.save(b,'JPEG',quality=82);sys.stdout.write(base64.b64encode(b.getvalue()).decode())`,file],{encoding:'utf8',maxBuffer:1<<24})
 return 'data:image/jpeg;base64,'+b64
}
const on3D=new Set([...Object.keys(SCENES),...painted.maps.map(m=>m.id)])
const battles=SANDBOX_ENCOUNTERS.map(({id,name})=>{
 const enc=ENCOUNTERS[id],sc=Object.values(SCENARIOS).find(s=>s.encounterId===id&&s.openingPosition)
 const fielded=[...enc.setup.map(f=>({...f,later:false})),...(enc.schedule??[]).flatMap(s=>(s.spawn??[]).map(f=>({...f,later:true})))]
 const enemies=new Map(),civilians=[]
 for(const f of fielded){if(f.civilian){civilians.push(nameOf(f.unit));continue}const e=enemies.get(f.unit)??{n:0,later:0};e.n++;if(f.later)e.later++;enemies.set(f.unit,e)}
 return{id,name,position:sc?.openingPosition??null,mapId:enc.mapId,enemies:[...enemies].map(([u,e])=>({name:nameOf(u),...e})),civilians,picture:pictureOf(name,enc.mapId),on3D:on3D.has(enc.mapId)}
}).sort((a,b)=>(a.position??99)-(b.position??99))
const card=b=>`<a class="card" href="../kingdom/BATTLE-SANDBOX.html?play=${esc(b.id)}" data-encounter="${esc(b.id)}">
  <div class="pic"${b.picture?` style="background-image:url('${b.picture}')"`:''}>${b.on3D?'':'<span class="tag">flat board for now — its 3D map is not in the battle screen yet</span>'}</div>
  <div class="body">
   <div class="kicker">${b.position?`Battle ${b.position}`:'Encounter'}</div>
   <h2>${esc(b.name)}</h2>
   <p class="foes"><span>Foes</span>${b.enemies.map(e=>`${esc(e.name)}${e.n>1?` ×${e.n}`:""}${e.later?` <i>(${e.later} arrive later)</i>`:''}`).join(' · ')}</p>
   ${b.civilians.length?`<p class="foes"><span>Protect</span>${b.civilians.map(esc).join(' · ')}</p>`:''}
   <span class="go">Play ▸</span>
  </div></a>`
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Heroes of Blight and Tragic — Play</title><!-- Generated by kingdom/tools/build-launcher.mjs; kingdom ${sha}; engine ${engine} — never hand-edit -->
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&family=Spectral:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b0c0e;--panel:#15140f;--line:#3a3020;--gold:#d8b46a;--ink:#e9e1c9;--dim:#9a917a}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:'Barlow Semi Condensed',system-ui,sans-serif}
body{min-height:100vh;background:radial-gradient(ellipse at 50% -10%,#2a2114 0%,var(--bg) 60%)}
main{max-width:1240px;margin:0 auto;padding:48px 28px 64px}
header{margin-bottom:34px}.house{letter-spacing:.32em;text-transform:uppercase;color:var(--gold);font-size:13px;font-weight:600}
h1{font-family:Spectral,serif;font-weight:600;font-size:44px;margin:8px 0 6px}header p{color:var(--dim);font-size:17px;margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:22px}
.card{display:flex;flex-direction:column;text-decoration:none;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:6px;overflow:hidden;transition:transform .15s,border-color .15s,box-shadow .15s}
.card:hover,.card:focus-visible{transform:translateY(-3px);border-color:var(--gold);box-shadow:0 10px 30px rgba(0,0,0,.5);outline:none}
.pic{position:relative;aspect-ratio:16/8;background:#1d1a14 center/cover no-repeat}
.pic::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,transparent 55%,var(--panel))}
.tag{position:absolute;left:12px;top:12px;z-index:1;background:rgba(10,9,7,.82);color:var(--dim);font-size:13px;padding:4px 9px;border:1px solid var(--line);border-radius:3px}
.body{padding:4px 22px 20px;display:flex;flex-direction:column;gap:6px;flex:1}
.kicker{color:var(--gold);letter-spacing:.2em;text-transform:uppercase;font-size:13px;font-weight:600}
h2{font-family:Spectral,serif;font-weight:600;font-size:30px;margin:0 0 4px}
.foes{margin:0;color:var(--ink);font-size:16px;line-height:1.45}.foes span{display:inline-block;width:64px;color:var(--dim);text-transform:uppercase;font-size:12px;letter-spacing:.12em}.foes i{color:var(--dim);font-style:normal}
.go{margin-top:auto;align-self:flex-end;padding-top:12px;color:var(--gold);font-weight:700;font-size:18px;letter-spacing:.06em}
.more{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:22px}
.more a{display:block;text-decoration:none;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:18px 22px;transition:border-color .15s}
.more a:hover,.more a:focus-visible{border-color:var(--gold);outline:none}.more b{font-family:Spectral,serif;font-size:22px;font-weight:600;display:block}.more span{color:var(--dim)}
@media (max-width:640px){.grid{grid-template-columns:1fr}.more{grid-template-columns:1fr}h1{font-size:34px}}
</style></head><body><main>
<header><div class="house">Heroes of Blight and Tragic</div><h1>Choose a battle</h1><p>The opening's battles, in order. Click one to play it.</p></header>
<section class="grid">${battles.map(card).join('\n')}</section>
<section class="more"><a href="../kingdom/BATTLE-SANDBOX.html" data-more="free"><b>Free battle</b><span>Pick the heroes, the foes and the map yourself.</span></a>
<a href="../viewer/BATTLE-VIEWER.html" data-more="replays"><b>Recorded battles</b><span>Watch battles the engine has played, turn by turn.</span></a></section>
</main></body></html>`
const out=process.argv[2]??'PLAY.html';writeFileSync(out,html)
console.log(`${out}: ${Buffer.byteLength(html)} bytes; ${battles.length} battles (${battles.map(b=>b.name).join(', ')}); kingdom ${sha}; engine ${engine}`)
