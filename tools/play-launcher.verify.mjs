// kingdom.play-launcher (engine DECISIONS.md 2026-09-30 "the game plays from a link"). Andrew: "I don't want to have to
// go dig for bat files. I want a way to play this game out of a link." · "Make me a game launcher where I can play the
// various battles." The COMMITTED launcher (PLAY.html) has one card for every battle the sandbox may play, in the
// opening's order, each opening BATTLE-SANDBOX.html?play=<its encounter>; a free battle and the recorded battles; and the
// server (tools/battle-atlas/serve.mjs) answers http://127.0.0.1:<port>/play with it.
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {resolve} from 'node:path'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const page=process.argv[2]??'PLAY.html',html=readFileSync(page,'utf8')
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {SANDBOX_ENCOUNTERS} from './src/content/sandbox.ts';export {SCENARIOS} from './src/engine.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {SANDBOX_ENCOUNTERS,SCENARIOS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const cards=[...html.matchAll(/<a class="card" href="([^"]+)" data-encounter="([^"]+)">[\s\S]*?<h2>([^<]+)<\/h2>/g)].map(m=>({href:m[1],id:m[2],name:m[3]}))
const position=id=>Object.values(SCENARIOS).find(s=>s.encounterId===id&&s.openingPosition)?.openingPosition??99
assert.deepEqual(cards.map(c=>c.id),SANDBOX_ENCOUNTERS.map(e=>e.id).sort((a,b)=>position(a)-position(b)),'one card per playable battle, in the opening\'s order')
assert.ok(cards.length>=4,'the Orphanage, the Lumberjack House, the Bridge and the Cavern Trail at least')
for(const c of cards){assert.equal(c.href,`../kingdom/BATTLE-SANDBOX.html?play=${c.id}`,'straight into the battle');assert.equal(c.name,SANDBOX_ENCOUNTERS.find(e=>e.id===c.id).name)}
assert.ok(existsSync('BATTLE-SANDBOX.html'),'the battle screen is there to open')
for(const [more,href] of [['free','../kingdom/BATTLE-SANDBOX.html'],['replays','../viewer/BATTLE-VIEWER.html']]){assert.ok(html.includes(`<a href="${href}" data-more="${more}">`),more);assert.ok(existsSync(resolve('..',href.replace('../',''))),href+' exists')}
/* the link: the server answers /play with this page */
const port=4300+Math.floor(Math.random()*500),server=spawn(process.execPath,['../tools/battle-atlas/serve.mjs',String(port)],{stdio:['ignore','pipe','inherit']})
try{
 await new Promise((ok,fail)=>{server.stdout.on('data',ok);server.on('exit',fail);setTimeout(()=>fail(Error('server did not start')),15000)})
 for(const path of ['/play','/play/']){const r=await fetch(`http://127.0.0.1:${port}${path}`);assert.equal(r.status,200,path);assert.equal(await r.text(),readFileSync('PLAY.html','utf8'),path+' is the launcher')}
}finally{server.kill()}
console.log(`play launcher: ${cards.length} battles (${cards.map(c=>c.name).join(', ')}), each straight into the battle screen; a free battle and the recorded battles; /play serves it passed`)
