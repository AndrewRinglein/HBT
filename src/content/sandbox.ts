import type {Hero} from '../core/campaign.js'
import {HERO_ITEM_SLOTS} from './generated/kits.js'
import {heroOfRow} from './heroes.js'
import {atlasFieldings} from './atlas.js'
import {UNITS,ENCOUNTERS,type UnitDef} from '../engine.js'

export const SANDBOX_MAPS=atlasFieldings().map(r=>({id:r.id,name:r.name}))
/**
 * Authored standalone presets; campaign drafting keeps its own explicit pool. kingdom.reads-engine (review finding K9):
 * built by the one builder the campaign pool uses (heroes.ts heroOfRow) — engine row, its defaultItems kit, the codex's
 * item slots — so the sandbox and the campaign cannot field one hero two ways.
 */
export function sandboxHeroesOf(units:Readonly<Record<string,UnitDef>>=UNITS,slots:Readonly<Record<string,number>>=HERO_ITEM_SLOTS):Hero[]{
 return Object.keys(units).filter(id=>id.startsWith('hero.base.')).sort().map(id=>heroOfRow(id,units,slots))
}
export const SANDBOX_HEROES=sandboxHeroesOf()
// Standard published enemy bodies; this roster is content, not a rule.
export const SANDBOX_ENEMIES=['unit.zombie','unit.skeleton','unit.skeletal-archer','unit.fast-zombie','unit.imp','unit.fire-imp','unit.ghoul','unit.hellhound'].map(id=>({id,name:UNITS[id]!.name??id.replace('unit.','').replaceAll('-',' ')}))
/**
 * kingdom.encounter-battles (engine, 2026-09-28): the encounters a person may play here — the opening's
 * battles, in the engine's own registry, by the engine's names. An encounter fields its own map, units,
 * schedule and civilians; the player brings the heroes. Content, not a rule: which ones is this list.
 */
// viewer.caravan-scene (2026-10-01; engine DECISIONS.md 2026-10-01 'the caravan's fight', provisional): the caravan aftermath
// is played here too — not one of the opening's battles, so it is named (kingdom SWITCHES sandboxCaravan)
export const SANDBOX_EXTRA_ENCOUNTERS=['encounter.caravan-aftermath']
export const SANDBOX_ENCOUNTERS=Object.values(ENCOUNTERS).filter(e=>e.id.startsWith('encounter.opening.')||SANDBOX_EXTRA_ENCOUNTERS.includes(e.id)).map(e=>({id:e.id,name:e.name??e.id}))
export const SANDBOX_DEFAULT={mapId:'showcase.atlas-priory',heroes:['hero.base.warrior-iron','hero.base.ranger-aggressive','hero.base.priest-armored'],enemies:['unit.zombie','unit.zombie','unit.skeleton','unit.skeleton'],seed:1}
