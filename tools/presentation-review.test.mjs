import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createState,fold,foldTo} from '../src/fold.js'
import {buildLog} from '../src/log.js'

const manifest=JSON.parse(readFileSync('generated/art/manifest.json'))
test('existing exact enemy tokens are attached instead of placeholders or borrowed families',()=>{
  for(const suffix of ['skeleton','fast-zombie','powerful-imp','fire-imp','poison-imp','bruiser-demon','lieutenant-demon','bloodhound','zombie-hound']){
    const row=manifest.artmap['unit.'+suffix]
    assert.equal(row?.token,suffix+'_256.png',suffix)
    assert.ok(existsSync('../battle-tokens/units/'+row.token))
    assert.ok(existsSync('generated/art/'+row.token))
  }
  assert.equal(manifest.artmap['unit.skeleton'].card,'card-skeleton.jpg')
  for(const suffix of ['fast-zombie','powerful-imp','poison-imp','bruiser-demon','lieutenant-demon','zombie-hound']){
    assert.equal(manifest.artmap['unit.'+suffix].card,'card-'+suffix+'.jpg',suffix+' panel')
    assert.ok(existsSync('generated/art/card-'+suffix+'.jpg'))
  }
  // The content fixture is the cohort zombie plus a gash rider, not a new body.
  assert.equal(manifest.artmap['test-gash-zombie']?.token,manifest.artmap['test-zombie'].token)
})
test('every enemy actually fielded across the entire library has a non-placeholder token',()=>{
  const seen=new Set()
  for(const {file} of JSON.parse(readFileSync('battles/library.json')).battles){
    for(const e of JSON.parse(readFileSync('battles/'+file)).events){
      if(e.type!=='unit.enter'||e.side!=='enemy')continue
      seen.add(e.typeId);const row=manifest.artmap[e.typeId]
      assert.ok(row,`${file}: ${e.typeId} lacks an explicit art assignment`)
      assert.ok(!row.token.startsWith('ph-'),`${file}: ${e.typeId} still uses a placeholder`)
      assert.ok(existsSync('generated/art/'+row.token),`${file}: missing ${row.token}`)
    }
  }
  assert.ok(seen.size>20)
})
test('actual Priory reaction explains attempted continuation and hit-stop without inventing movement',()=>{
  const events=JSON.parse(readFileSync('battles/showcase.atlas-priory.json')).events
  const ctx={UD:{},SN:{}},state=createState();let reaction,stop
  for(const event of events){
    const cues=fold(state,event,ctx,0)
    if(event.seq===387){assert.equal(state.U[4].hex,67);assert.ok(!cues.some(c=>c.text?.includes('MOVING')))}
    if(event.seq===388){reaction=cues;assert.equal(state.U[4].hex,67)}
    if(event.seq===393){stop=cues;assert.equal(state.U[4].hex,67);break}
  }
  assert.ok(reaction.some(c=>c.k==='float'&&c.hex===67&&c.text==='TRIES TO KEEP MOVING'))
  assert.ok(stop.some(c=>c.k==='float'&&c.hex===67&&c.text==='STOPPED BY HIT'))
  // Only pump-stamped highlights expire on seeking; durable event state matches.
  state.FIRING=null;state.TRIGFLASH=null
  if(state.AIM){state.AIM.missed=null;state.AIM.expire=null}
  assert.deepEqual(state,foldTo(events,394,ctx))
  assert.match(JSON.stringify(buildLog(events,{},8)),/tries to keep moving/)
})
