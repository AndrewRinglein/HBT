// viewer.battle-full-screen (engine DECISIONS.md 2026-09-30 "the battle is its own full screen"): the built sandbox opened
// with ?play= shows the battle alone, filling the window; the launcher is its own view (tools/sandbox-full-screen.verify.mjs).
import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
it('the built sandbox: ?play= is the battle alone, filling the window; the launcher its own view',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-full-screen.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-full-screen.verify.mjs','scratch/sandbox-full-screen.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},120000)
