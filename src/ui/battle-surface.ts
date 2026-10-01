import { mountBattleViewer } from '../../../viewer/src/viewer.js'
import type { BattleView } from '../view/battle.js'

/** One paused shared component, retained while the outcome controls rerender.
    layout.fill (viewer.battle-full-screen, engine DECISIONS.md 2026-09-30 "the battle is its own full screen"): while it
    answers true the battle fills the window — the 1920x1080 screen scaled to the largest size that fits it whole (up or
    down) and centred, the rest the screen's own black; false, it fits the slot's width as before (never above 1). */
export function createBattleSurface(shared: Record<string, unknown>, options: Record<string, unknown> = {}, layout: {fill?: () => boolean} = {}) {
  let current: {key:string;outer:HTMLElement;host:HTMLElement;viewer:ReturnType<typeof mountBattleViewer>} | null = null
  let container: HTMLElement | null = null
  let observer: ResizeObserver | null = null
  const FILL = {position:'fixed',left:'0',top:'0',width:'100vw',height:'100vh',margin:'0',zIndex:'10',background:'#08090b'} as const
  const fit = () => {
    if (!current || !container) return
    const o = current.outer.style as unknown as Record<string, string>
    if (layout.fill?.()) {
      const vw = window.innerWidth, vh = window.innerHeight, scale = Math.min(vw / 1920, vh / 1080)
      for (const [k, v] of Object.entries(FILL)) o[k] = v
      current.host.style.transform = `translate(${(vw - 1920 * scale) / 2}px,${(vh - 1080 * scale) / 2}px) scale(${scale})`
      return
    }
    for (const k of Object.keys(FILL)) o[k] = ''
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
    get outer() { return current?.outer ?? null },
    /** fit again — the host changed what layout.fill answers */
    refit() { fit() },
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
