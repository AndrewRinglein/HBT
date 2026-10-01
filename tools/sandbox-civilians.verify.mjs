// kingdom.civilians-played (engine DECISIONS.md 2026-09-30 "the civilians are played; no 2D before the 3D bodies"). Andrew:
// "There's no movement for the child when I click on it, so the civilians, I think, aren't activating properly."
// (2026-08-26: "Civilians are exactly like heroes.") The BUILT sandbox, battle 1: clicking the Orphan Child in the Hero
// Phase starts its activation and lights where it can move; clicking a hex twice walks it there; the End Turn pop-up's
// list of those yet to act names the civilians, as it names the heroes.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),handle=w.__sandbox
const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx,stage=()=>V().dom.stage
const settle=()=>{if(handle.busy)click('skip');assert.equal(handle.busy,false)}
const hexBtn=h=>stage().querySelectorAll('.playHex').find(n=>+n.dataset.hex===h)
const drawn=cls=>stage().querySelectorAll('.'+cls).map(n=>+n.dataset.hex).sort((a,b)=>a-b)
const figure=id=>V().layers.UEL.get(id).img
settle();assert.equal(ctx().battleCursor.at,'selecting')
const civilians=ctx().state.units.filter(u=>u.side==='hero').slice(handle.session.config.heroes.length)
assert.deepEqual(civilians.map(u=>u.typeId).sort(),['hero.fixed.orphans','hero.fixed.school-teacher'],'battle 1 fields its two civilians')
const yet=V().play.endTurn.yetToAct
for(const c of civilians)assert.ok(yet.includes(c.id),c.name+' is among those yet to act (End Turn names it)')
const child=civilians.find(u=>u.typeId==='hero.fixed.orphans')
figure(child.id).handlers.click({detail:1});settle()
assert.equal(ctx().battleCursor.at,'acting');assert.equal(ctx().battleCursor.actor,child.id,'clicking the Orphan Child started its activation')
const reach=drawn('playReach');assert.ok(reach.length>0,'where the child can move is lit')
const dest=reach.find(h=>!ctx().state.units.some(u=>u.hex===h&&u.lifeState!=='dead'))
hexBtn(dest).handlers.pointerenter({});hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:1});settle()
assert.equal(ctx().state.units[child.id].hex,dest,'click, click: the child walked there')
console.log(`sandbox civilians: battle 1's Orphan Child and School Teacher are the player's - named among those yet to act; clicking the child started its activation, lit ${reach.length} hexes and walked it to hex ${dest} passed`)
