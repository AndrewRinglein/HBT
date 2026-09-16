import { mountBattleViewer } from '../../../viewer/src/viewer.js'
import type { BattleView } from '../view/battle.js'

/** One paused shared component, retained while the outcome controls rerender. */
export function createBattleSurface(shared: Record<string, unknown>, options: Record<string, unknown> = {}) {
  let current: {key:string;outer:HTMLElement;host:HTMLElement;viewer:ReturnType<typeof mountBattleViewer>} | null = null
  let container: HTMLElement | null = null
  let observer: ResizeObserver | null = null
  const fit = () => {
    if (!current || !container) return
    const scale = Math.min(1, container.clientWidth / 1920)
    current.host.style.transform = `scale(${scale})`
    current.outer.style.height = `${1080 * scale}px`
  }
  function dispose() {
    observer?.disconnect(); observer = null
    window.removeEventListener('resize',fit)
    current?.viewer.dispose(); current?.outer.remove(); current = null; container = null
  }
  return {
    get viewer() { return current?.viewer ?? null },
    get host() { return current?.host ?? null },
    dispose,
    mount(slot:HTMLElement,view:BattleView) {
      const key = JSON.stringify([view.engagementId,view.viewerSeed,view.initialEvents,view.atlasScene?.sourceFingerprint])
      if (current?.key !== key) {
        dispose()
        const outer=document.createElement('div'),host=document.createElement('div')
        outer.className='kingdom-battle-fit';host.className='kingdom-battle'
        host.style.cssText='width:1920px;height:1080px;display:flex;position:relative;overflow:hidden;transform-origin:0 0'
        outer.appendChild(host);slot.appendChild(outer)
        const viewer=mountBattleViewer(host,{
          ...shared,initialEvents:view.initialEvents,
          fieldMapId:view.viewerSeed.mapId,
          field:{width:view.width,height:view.height,terrainIds:view.terrain},
          atlasScene:view.atlasScene,
          atlasCatalog:view.atlasScene ? {library:view.atlasScene.catalog} : undefined,
          meta:{seed:view.viewerSeed,label:view.mapName},
        },{...options,autoplay:false})
        viewer.push(view.initialEvents);viewer.seek(view.initialEvents.length)
        current={key,outer,host,viewer};window.addEventListener('resize',fit)
      }
      container=slot;slot.appendChild(current!.outer)
      observer?.disconnect()
      if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(fit);observer.observe(slot)}
      fit();return current!.viewer
    },
  }
}
