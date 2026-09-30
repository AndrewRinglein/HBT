// viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8): the built sandbox plays battle 1 with the battle screen's End Turn
// and its pop-up, End activation, 2x and the log; the dropdowns are retired for it (tools/sandbox-chrome.verify.mjs).
import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
it('the built sandbox: battle 1 on the board alone — End Turn asks on the page, the Enemy Phase plays, 2x, the log',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-chrome.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-chrome.verify.mjs','scratch/sandbox-chrome.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},120000)
