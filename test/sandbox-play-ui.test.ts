// viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7): the built sandbox plays battle 1 with the mouse on the board
// (tools/sandbox-play.verify.mjs drives the viewer's own hex buttons, figures, action-bar rows and right button).
import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
it('the built sandbox: battle 1 with the mouse alone — act, ghost, right-click back, walk, aim, forecast, fire',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-play.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-play.verify.mjs','scratch/sandbox-play.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},120000)
