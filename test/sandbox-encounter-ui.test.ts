// kingdom.encounter-battles (engine, 2026-09-28): the built sandbox page plays an engine encounter
// from its battle screen (tools/sandbox-encounter.verify.mjs drives the real controls).
import {it} from 'vitest'
import {mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
it('the built sandbox plays an engine encounter: its map, schedule, civilians, marked falls and outcome',()=>{
 mkdirSync('scratch',{recursive:true})
 execFileSync('node',['tools/build-sandbox.mjs','scratch/sandbox-encounter.html'],{stdio:'pipe'})
 execFileSync('node',['tools/sandbox-encounter.verify.mjs','scratch/sandbox-encounter.html'],{stdio:'pipe',maxBuffer:4*1024*1024})
},120000)
