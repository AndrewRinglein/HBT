import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join, basename, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { assertRuntimeMetadata } from './runtime-metadata.mjs'
const require = createRequire(import.meta.url)
const esbuild = require('../../engine/node_modules/esbuild')
const enginePath = file => ['..','engine','src',file].join('/')

test('actual browser entry emits no catalog loader or gameplay modules', () => {
  const define = Object.fromEntries(['STATIC','FIELDS','ART','BATTLES','GLYPHS','STAMP'].map(k => ['__BUNDLED_'+k+'__', '{}']))
  const result = esbuild.buildSync({entryPoints:['src/main.js'], bundle:true, write:false,
    format:'iife', platform:'browser', metafile:true, define})
  const emitted = Object.values(result.metafile.outputs).flatMap(o => Object.entries(o.inputs)
    .filter(([,v]) => v.bytesInOutput > 0).map(([p]) => p.replaceAll('\\','/')))
  assert.ok(emitted.includes(enginePath('view/field.ts')))
  assert.deepEqual(emitted.filter(p => /engine\/src\/(?:content\/(?:generated\/|pack\.|maps\.|index\.|statuses\.|moves\.)|core\/(?:mutate|trigger|status|pipeline|movement|battle|setup|rng)\.)/.test(p)), [])
  assert.ok(assertRuntimeMetadata(result.metafile).includes(enginePath('view/field.ts')))
})

test('guard distinguishes emitted bytes from parsed or tree-shaken inputs', () => {
  const meta = {inputs:{[enginePath('content/generated/pack.ts')]:{}},outputs:{'out.js':{inputs:{
    [enginePath('view/field.ts')]:{bytesInOutput:100},
    [enginePath('content/generated/pack.ts')]:{bytesInOutput:0},
  }}}}
  assert.deepEqual(assertRuntimeMetadata(meta), [enginePath('view/field.ts')])
  meta.outputs['out.js'].inputs[enginePath('content/generated/pack.ts')].bytesInOutput=1
  assert.throws(()=>assertRuntimeMetadata(meta), /generated\/pack/)
  meta.outputs['out.js'].inputs={[enginePath('core/mutate.ts')]:{bytesInOutput:1}}
  assert.throws(()=>assertRuntimeMetadata(meta), /core\/mutate/)
})

for(const malformed of [false,true]) test(`normal static generator ${malformed?'rejects malformed catalog before writing':'still validates and exports identical data'}`, async () => {
  const root=mkdtempSync(join(tmpdir(),'hbt-runtime-metadata-'))
  try {
    mkdirSync(join(root,'generated')); const output=join(root,'generated/static.json')
    writeFileSync(output,'preserve-output')
    const result=await esbuild.build({entryPoints:['tools/dump-static.mts'],bundle:true,write:false,
      platform:'node',format:'esm',metafile:true,plugins: malformed ? [{name:'malformed-catalog-fixture',setup(build){
        build.onLoad({filter:/content[\\/]generated[\\/]pack\.ts$/},args=>({loader:'ts',contents:readFileSync(args.path,'utf8')+
          '\n;(UNIT_PACK as any).test.attacks[Object.keys(UNIT_PACK.test.attacks)[0]].slot = "not-a-slot";\n'}))
      }}] : []})
    const contributors=Object.keys(Object.values(result.metafile.outputs)[0].inputs)
    assert.ok(contributors.some(p=>p.endsWith('content/pack.ts')))
    const tool=join(root,'dump.mjs');writeFileSync(tool,result.outputFiles[0].text)
    const run=spawnSync(process.execPath,[tool],{cwd:root,encoding:'utf8'})
    if(malformed){
      assert.notEqual(run.status,0);assert.match(run.stderr,/invalid action slot/)
      assert.equal(readFileSync(output,'utf8'),'preserve-output')
    } else {
      assert.equal(run.status,0,run.stderr)
      const actual=JSON.parse(readFileSync(output,'utf8')), expected=JSON.parse(readFileSync('generated/static.json','utf8'))
      for(const value of [actual,expected]){delete value.engineCommit;delete value.engineDirty}
      assert.deepEqual(actual,expected)
    }
  } finally {
    const owned=resolve(root), temp=resolve(tmpdir())
    assert.ok(owned.startsWith(temp+sep)&&basename(owned).startsWith('hbt-runtime-metadata-'))
    rmSync(owned,{recursive:true,force:true})
  }
})
