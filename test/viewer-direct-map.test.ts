import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import gold from './fixtures/field-cli-d872c34.json'
import distanceGold from './fixtures/field-distance-d872c34.json'
// v2.knockback-collisions (2026-09-23), Law 10: the content TEST map test.map.well-shove
// joined the registered maps; the 22 prior bytes stay frozen and the new map's are added.
import addedGold from './fixtures/field-cli-knockback.json'
import { presentationField, prepareBattleField, initialMapId } from '../src/view/field.js'
import { createBattle } from '../src/core/setup.js'
import { MAP_PANEL, decodeMap, mapDef } from '../src/content/maps.js'

const fact = (width=4,height=3) => ({type:'map.loaded',mapId:'test.map.direct',width,height,deploy:{hero:'west',enemy:'east'},terrain:Array(width*height).fill(0),props:[]})
const seed = {mapId:'test.map.direct'}
describe('readonly initial field preparation',()=>{
  it('preserves all 22 registered CLI bytes and control membership, plus the maps added since',()=>{
    expect(MAP_PANEL).toEqual([...Object.keys(gold), ...Object.keys(addedGold)])
    for(const [id,hash] of Object.entries({...gold, ...addedGold})) {
      const bytes=execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','tools/field-geometry.mts',id])
      expect(createHash('sha256').update(bytes).digest('hex'),id).toBe(hash)
    }
  },30_000)
  it.each(['test.map.high-prop-single','test.map.high-prop-multi'])('%s prepares live initial facts without changing source',mapId=>{
    const c=createBattle({replicate:0,mapId}), before=JSON.stringify(c.events)
    const d=decodeMap(mapDef(mapId)), field=presentationField({...d.board,terrain:d.terrain,props:d.props},mapDef(mapId).rows)
    const p=prepareBattleField(c.events,{mapId},{mapId,field})
    expect(p.field).toEqual(field);expect(JSON.stringify(c.events)).toBe(before)
    expect(p.field.props).not.toBe(c.state.props)
  })
  it('prepares 10000 cells linearly and returns exact distances beyond a byte',()=>{
    for(const n of [300,10000]) {
      const p=prepareBattleField([fact(1,n)],seed)
      expect(p.distance(0,n-1)).toBe(n-1)
      expect(p.field.hexes).toHaveLength(n)
      expect(Object.values(p).some(v=>ArrayBuffer.isView(v))).toBe(false)
      expect(JSON.stringify(p.field).length).toBeLessThan(n*240)
    }
  })
  it('preserves every distance from all prior registered-size tables',()=>{
    for(const [key,hash] of Object.entries(distanceGold)) {
      const [width,height]=key.split('x').map(Number) as [number,number]
      const p=prepareBattleField([fact(width,height)],seed), n=width*height
      const historicalBytes=new Uint8Array(n*n)
      for(let a=0;a<n;a++)for(let b=0;b<n;b++) historicalBytes[a*n+b]=p.distance(a,b)
      expect(createHash('sha256').update(historicalBytes).digest('hex'),key).toBe(hash)
    }
  })
  it('detaches every map fact and ignores conflicting registry geometry when exact',()=>{
    const f=fact();f.terrain[2]=5
    const p=prepareBattleField([f],seed,{mapId:'map.other',field:{width:99,height:99}})
    f.terrain[2]=0;f.width=1
    expect(p.field.terrainIds[2]).toBe('terrain.water');expect(p.field.width).toBe(4);expect(p.distance(0,3)).toBe(3)
  })
  it('requires identity-bound fallback and exact terrain on unknown/resized maps',()=>{
    const f:any=fact(), field=presentationField(f);delete f.terrain
    expect(()=>prepareBattleField([f],seed)).toThrow(/registry|terrain/)
    expect(()=>prepareBattleField([f],seed,{mapId:'map.other',field})).toThrow(/identity/)
    expect(()=>prepareBattleField([f],seed,{mapId:seed.mapId,field:{...field,width:2}})).toThrow(/resized/)
    expect(prepareBattleField([f],seed,{mapId:seed.mapId,field}).field).toEqual(field)
  })
  it.each([null,undefined,[],[0],Array(12),Array(12).fill(6),Array(12).fill(99)])('rejects explicit malformed terrain %j',terrain=>{
    expect(()=>prepareBattleField([{...fact(),terrain}],seed)).toThrow(/terrain/)
  })
  it.each([null,undefined,{},[{id:'prop.bad',height:'high',material:1,footprint:{kind:'hex',hexes:[12]}}]])('rejects malformed canonical props %j',props=>{
    expect(()=>prepareBattleField([{...fact(),props}],seed)).toThrow()
  })
  it('accepts generated shorthand props but raw authoring still rejects reserved IDs',()=>{
    const props=[{id:'prop.obstacle.2',height:'high',material:3,footprint:{kind:'hex',hexes:[2]}}]
    expect(prepareBattleField([{...fact(),props}],seed).field.passable[2]).toBe(false)
    expect(()=>createBattle({replicate:0,map:{id:seed.mapId,name:'bad',rows:['....','....','....'],props} as any})).toThrow(/reserved/)
  })
  it('rejects duplicate/late facts and seed identity/deploy/dimension conflicts',()=>{
    for(const events of [[],[fact(),fact()],[{type:'battle.begin'},fact()]]) expect(()=>prepareBattleField(events,seed)).toThrow(/initial|duplicate/)
    for(const patch of [{mapId:'map.other'},{deploy:null},{deploy:{hero:'bad',enemy:'east'}},{width:10001},{width:'4'}]) expect(()=>prepareBattleField([{...fact(),...patch}],seed)).toThrow()
    expect(()=>prepareBattleField([fact()],{...seed,board:{width:3,height:4}})).toThrow(/board/)
    expect(()=>prepareBattleField([fact()],{...seed,deploy:{hero:'east',enemy:'west'}})).toThrow(/deploy/)
    expect(initialMapId({map:seed.mapId})).toBe(seed.mapId)
    expect(()=>initialMapId({...seed,map:'map.other'})).toThrow(/conflicting/)
  })
  it('rejects accessor arrays without executing them and validates before allocation',()=>{
    const terrain=Array(12).fill(0);let read=0
    Object.defineProperty(terrain,'2',{get(){read++;return 0}})
    expect(()=>prepareBattleField([{...fact(),terrain}],seed)).toThrow(/data/);expect(read).toBe(0)
    expect(()=>prepareBattleField([{...fact(),width:1,height:10001,terrain:new Array(10001)}],seed)).toThrow(/dimensions/)
  })
  it('rejects a map cause that contradicts its identity',()=>{
    expect(()=>prepareBattleField([{...fact(),causeId:'map.other'}],seed)).toThrow(/cause|identity/)
  })
  it('matches the authored boundary: nonempty direct IDs and distinct deploy edges',()=>{
    const c=createBattle({replicate:0,heroes:[],enemies:[],map:{id:'custom-map',name:'Custom',rows:['..','..']}})
    expect(prepareBattleField(c.events,{mapId:'custom-map'}).field.width).toBe(2)
    expect(()=>prepareBattleField([{...fact(),deploy:{hero:'west',enemy:'west'}}],seed)).toThrow(/deploy/)
  })
})
