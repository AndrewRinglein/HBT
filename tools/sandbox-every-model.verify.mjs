// viewer.every-model (engine DECISIONS.md 2026-09-30 'the battle is its own full screen; ...; every 3D character': "I want
// all the 3D characters and enemies and motions"; 'a true 3D battle': "Everything in Orphanage has a 3D model" · "No 2D
// assets on the 3D map"; 'a bunch of motions, not every one'). Expect: "In battles 1-3 every hero, enemy and civilian on
// the board is a 3D model that idles, walks (or flies), attacks, flinches and dies; none stands as a 2D token." The
// kingdom's half: the BUILT sandbox opened with ?play= on each of battles 1-3 carries, for every unit on its board — the
// heroes the screen fields, the enemies and the civilians — a model with idle, a walk, a strike and a death, and a flinch
// wherever a selected one fits the body (the Zombies' rig takes none: listed missing, they recoil).
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const seen=new Set()
for(const id of ['encounter.opening.orphanage','encounter.opening.lumberjack','encounter.opening.bridge']){
 const {w}=bootSlice(page,{search:'?play='+id,width:1600,height:900}),handle=w.__sandbox,V=handle.viewer._V,models=V.data.models
 const units=Object.values(handle.session.ctx.state.units)
 assert.ok(units.some(u=>u.typeId.startsWith('hero.base.')),id+': the screen fields its heroes')
 if(id.endsWith('orphanage'))assert.ok(units.some(u=>u.typeId.startsWith('hero.fixed.')),id+': and its civilians')
 for(const u of units){
  const b=models[u.typeId];assert.ok(b?.looks?.length,`${id}: ${u.typeId} is a model`)
  for(const look of b.looks){
   for(const m of ['idle','move','attack','death'])assert.ok(look.motions[m],`${id}: ${u.typeId} ${look.id} ${m}`)
   assert.ok(look.motions.hit||(u.typeId==='unit.zombie'&&look.missing.includes('hit')),`${id}: ${u.typeId} ${look.id} flinches`)
  }
  seen.add(u.typeId)
 }
 handle.viewer.dispose?.()
}
for(const t of ['hero.fixed.orphans','hero.fixed.school-teacher','unit.zombie'])assert.ok(seen.has(t),t+' on battle 1\'s board')
console.log(`sandbox every model: battles 1-3 opened with ?play=, every unit on the board (${[...seen].sort().join(', ')}) a model that idles, walks, strikes, flinches and dies passed`)
