// Reprove the final integration probes against the committed pre-feature runtime.
// The new derived geometry leaves is supplied only so its mathematical oracle
// tests can load; base setup/props/maps/pipeline never imports it.
import {execFileSync,spawnSync} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import {resolve,dirname,sep} from 'node:path'
const base=resolve('.state'),target=mkdtempSync(resolve(base,'cover-red-'))
const before='f0aff17' // Frozen pre-feature runtime, also reproducible after landing.
if(!target.startsWith(base+sep))throw Error('red fixture escaped owned directory')
try{
 const names=execFileSync('git',['ls-tree','-r','--name-only',before,'src','package.json','vitest.config.ts'],{encoding:'utf8'}).trim().split('\n')
 for(const name of names){const file=resolve(target,name);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,execFileSync('git',['show',before+':'+name],{maxBuffer:32*1024*1024}))}
 for(const name of ['src/core/geometry.ts','src/core/cover.ts','test/low-cover.test.ts']){const file=resolve(target,name);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,readFileSync(name))}
 const r=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','test/low-cover.test.ts','--root',target,'--reporter=verbose'],{encoding:'utf8',maxBuffer:16*1024*1024})
 const output=(r.stdout||'')+(r.stderr||'');writeFileSync('scratch/low-cover-red-final.log',output)
 if(r.status!==1||!output.includes('Tests')||!output.includes('FAIL  test/low-cover.test.ts'))throw Error('Expected assertion failures were not observed: '+output.slice(-2000))
 console.log(output.slice(-1300));console.log('Expected pre-feature failure reproduced; no source file was replaced.')
}finally{if(!target.startsWith(base+sep))throw Error('unsafe cleanup');rmSync(target,{recursive:true,force:true})}
