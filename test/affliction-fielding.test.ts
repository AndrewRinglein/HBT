import {it,expect} from 'vitest'
import {makeBattleState,battleOptionsOf} from '../src/core/seam.js'
import {createBattle} from '../src/engine.js'

it('carried afflictions enter the next battle in deployment order without sharing roster arrays',()=>{
 const roster={a:{unitType:'hero.base.paladin-hunk',badges:['badge.responsible','badge.vampirism']},b:{unitType:'hero.base.mage-thinking',badges:['badge.possession']}}
 const spec=makeBattleState(roster,{id:'affliction-fielding',mapId:'map.open',enemies:['unit.zombie'],deployed:['b','a'],seed:5})
 const options=battleOptionsOf(spec)
 expect(options.heroBadges).toEqual([['badge.possession'],['badge.vampirism']])
 roster.a.badges.push('badge.rotting-flesh')
 expect(options.heroBadges?.[1]).toEqual(['badge.vampirism'])
 const battle=createBattle(options)
 const heroes=battle.state.units.filter(u=>u.side==='hero')
 expect(heroes[0]?.badges).toContain('badge.possession')
 expect(heroes[1]?.badges).toContain('badge.vampirism')
 expect(roster.a.badges).toContain('badge.responsible')
 const restored=battleOptionsOf({...spec,heroBadges:[['badge.responsible','badge.possession'],['badge.vampirism']]})
 expect(restored.heroBadges).toEqual([['badge.possession'],['badge.vampirism']])
 const campaignOnly=makeBattleState({a:{unitType:'hero.base.paladin-hunk',badges:['badge.responsible']}},{id:'story-only',mapId:'map.open',enemies:['unit.zombie'],deployed:['a'],seed:6})
 expect(battleOptionsOf(campaignOnly).heroBadges).toBeUndefined()
})
