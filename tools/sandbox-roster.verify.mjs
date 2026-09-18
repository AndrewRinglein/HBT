import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const units=JSON.parse(readFileSync('../viewer/generated/static.json')).units,art=JSON.parse(readFileSync('../viewer/generated/art/manifest.json')).artmap
const ids=Object.keys(units).filter(id=>id.startsWith('hero.base.')).sort()
assert.equal(ids.length,24)
for(const select of root.querySelectorAll('[data-roster="heroes"]')){
 assert.deepEqual(select.children.map(o=>o.getAttribute('value')),ids)
 for(const option of select.children)assert.equal(option.textContent,units[option.getAttribute('value')].name)
}
assert.equal(root.querySelectorAll('[data-roster="heroes"]').length,3,'default party retained')
click('hero-remove');click('hero-remove')
for(const id of ids){
 const select=root.querySelectorAll('[data-roster="heroes"]')[0];select.value=id;select.handlers.change();click('start')
 assert.equal(handle.session.setup.heroes[0],id)
 const unit=handle.session.ctx.state.units[0],node=handle.viewer._V.layers.UEL.get(unit.id)
 assert.equal(unit.typeId,id);assert.equal(node.a.token,art[id].token,id);assert.equal(node.a.card,art[id].card,id);assert.ok(!node.a.token.startsWith('ph-'))
 assert.equal(node.img.style.backgroundImage,`url("${handle.viewer.assets[art[id].token]}")`)
 handle.viewer.inspect(unit.id);assert.ok(handle.viewer._V.dom.panel.innerHTML.includes(handle.viewer.assets[art[id].card]),id+' exact portrait')
 assert.equal(handle.session.ctx.battleCursor.at,'selecting','roster smoke does not claim burst controls/commands')
}
handle.viewer.dispose()
console.log('sandbox roster built UI: all24 authored dropdown names, canonical engine fielding and exact existing token/card bindings passed')
