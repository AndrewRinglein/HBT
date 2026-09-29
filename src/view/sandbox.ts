import type {Sandbox} from '../core/sandbox.js'
import type {BattleView} from './battle.js'
import {exportSandbox} from '../core/sandbox.js'
import {terrainIdOf} from '../engine.js'
export function viewSandbox(s:Sandbox):BattleView{
 const data=exportSandbox(s)
 return {engagementId:s.config.encounterId??s.config.mapId,kind:'sandbox',mapId:data.seed.mapId,mapName:s.config.encounterId??s.config.mapId,width:s.ctx.state.board.width,height:s.ctx.state.board.height,terrain:s.ctx.state.terrain.map(terrainIdOf),props:structuredClone(s.ctx.state.props),initialEvents:structuredClone(s.ctx.events),viewerSeed:{...data.seed,scenarioId:s.setup.scenarioId!},...(s.atlasScene?{atlasScene:s.atlasScene}:{}),units:[]}
}
