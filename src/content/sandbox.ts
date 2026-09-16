import {HERO_POOL} from './heroes.js'
import {atlasFieldings} from './atlas.js'
import {UNITS} from '../engine.js'

export const SANDBOX_MAPS=atlasFieldings().map(r=>({id:r.id,name:r.name}))
export const SANDBOX_HEROES=HERO_POOL.filter(h=>UNITS[h.unitType])
// Standard published enemy bodies; this roster is content, not a rule.
export const SANDBOX_ENEMIES=['unit.zombie','unit.skeleton','unit.skeletal-archer','unit.fast-zombie','unit.imp','unit.fire-imp','unit.ghoul','unit.hellhound'].map(id=>({id,name:UNITS[id]!.name??id.replace('unit.','').replaceAll('-',' ')}))
export const SANDBOX_DEFAULT={mapId:'showcase.atlas-priory',heroes:['hero.base.warrior-iron','hero.base.ranger-aggressive','hero.base.priest-armored'],enemies:['unit.zombie','unit.zombie','unit.skeleton','unit.skeleton'],seed:1}
