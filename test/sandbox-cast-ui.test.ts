// viewer.opening-cast (PLAYABLE-OPENING-PLAN.md item 10): the built sandbox fields battles 2 and 3 with every enemy and
// drafted hero a model, every civilian its token, a Skeleton Archer shooting and the Imps flying on the board
// (tools/sandbox-cast.verify.mjs; red against the page built before the cast: hero.base.warrior-iron is not a model).
import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
it('the built sandbox: battles 2 and 3 as models or their tokens, the archers shooting and the imps flying',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-cast.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-cast.verify.mjs','scratch/sandbox-cast.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},120000)
