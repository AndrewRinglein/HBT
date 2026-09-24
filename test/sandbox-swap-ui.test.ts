import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
// V2 R6 swap UI: the built sandbox offers the engine's swap to a human-controlled hero
it('the built sandbox offers, issues and then disables the engine swap, and the shared viewer folds it',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-swap.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-swap.verify.mjs','scratch/sandbox-swap.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},90000)
