import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
it('built sandbox drives real controls and the shared viewer through lifecycle/save/export',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-test.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox.verify.mjs','scratch/sandbox-test.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},60000)
