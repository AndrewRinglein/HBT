import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
// v2.block-presentation (V2 R2): a real positive-Block sandbox battle, shown as its own fact
it('the sandbox and the shared viewer show Block, hit chance if not blocked and chance to connect from engine facts',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-block.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-block.verify.mjs','scratch/sandbox-block.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},90000)
