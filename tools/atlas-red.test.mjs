import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {packTerrainAssets} from './terrain-assets.mjs'
test('terrain publication carries the actual Atlas catalog instead of four tile skins',()=>{
 const packed=packTerrainAssets(),library=JSON.parse(readFileSync('../assets/battle-atlas/library.json'))
 assert.deepEqual(packed.library,library)
})
test('the player offers visible authored Atlas map and journey area inspection',()=>{
 const source=readFileSync('src/harness.js','utf8')
 assert.match(source,/atlasInspector/)
})
test('unbound battles do not invent a boulders-for-every-obstacle scene',()=>{
 assert.doesNotMatch(readFileSync('src/terrain-scene.js','utf8'),/asset:'boulders'/)
})
