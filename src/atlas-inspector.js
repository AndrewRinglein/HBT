import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {bundledAtlas,prepareAtlasBinding,readAtlasCatalog,readAtlasLayout,atlasSourceURL} from './atlas.js'
import {loadAtlasAssembly,atlasEnvironment} from './atlas-renderer.js'
import {center} from '../../tools/terrain-workshop/layout-adapter.mjs'

function picker(host,id,title,choose){
 const wrap=document.createElement('div');wrap.className='atlas-picker'
 const label=document.createElement('label');label.id=id+'Label';label.textContent=title
 const button=document.createElement('button');button.id=id+'Button';button.setAttribute('role','combobox');button.setAttribute('aria-labelledby',label.id);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',id+'Menu')
 const menu=document.createElement('div');menu.id=id+'Menu';menu.className='atlas-menu';menu.setAttribute('role','listbox');menu.style.display='none'
 wrap.appendChild(label);wrap.appendChild(button);wrap.appendChild(menu);host.appendChild(wrap)
 let rows=[],selected=-1,focus=0,nodes=[]
 const close=()=>{menu.style.display='none';button.setAttribute('aria-expanded','false');button.removeAttribute?.('aria-activedescendant')}
 const point=n=>{focus=Math.max(0,Math.min(rows.length-1,n));nodes.forEach((o,i)=>o.classList.toggle('focused',i===focus));if(nodes[focus]){button.setAttribute('aria-activedescendant',nodes[focus].id);nodes[focus].scrollIntoView({block:'nearest'})}}
 const open=n=>{if(!rows.length)return;menu.style.display='block';button.setAttribute('aria-expanded','true');point(n??Math.max(selected,0))}
 const select=n=>{close();choose(rows[n].value);button.focus()}
 button.addEventListener('click',()=>menu.style.display==='none'?open():close())
 button.addEventListener('keydown',e=>{if(e.key==='Tab'){close();return}if(!['ArrowUp','ArrowDown','Home','End','Enter',' ','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();const active=menu.style.display!=='none';if(e.key==='Escape')close();else if(e.key==='Home')open(0);else if(e.key==='End')open(rows.length-1);else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(active)point(focus+(e.key==='ArrowDown'?1:-1));else open()}else if(active)select(focus);else open()})
 const outside=e=>{if(!wrap.contains(e.target))close()};document.addEventListener('click',outside)
 return{set(items,value){rows=items;menu.innerHTML='';selected=items.findIndex(r=>r.value===value);nodes=items.map((r,i)=>{const node=document.createElement('div');node.id=id+'Option'+i;node.className='ddOpt';node.setAttribute('role','option');node.setAttribute('aria-selected',String(i===selected));node.textContent=r.label;node.addEventListener('click',()=>select(i));menu.appendChild(node);return node});button.textContent=(rows[selected]?.label||title)+' ▾';close()},dispose(){document.removeEventListener('click',outside);wrap.remove()}}
}

export function atlasInspector(host,snapshot=bundledAtlas,options={}){
 const section=document.createElement('section');section.id='atlasInspector'
 const title=document.createElement('h2');title.textContent='Battle Atlas · authored 3D maps'
 const controls=document.createElement('div');controls.className='atlas-controls'
 const status=document.createElement('p');status.id='atlasStatus';status.setAttribute('role','status')
 const viewport=document.createElement('div');viewport.id='atlasViewport';viewport.setAttribute('aria-label','Authored battlefield: drag to orbit, scroll to zoom');viewport.tabIndex=0
 const note=document.createElement('p');note.className='atlas-note';note.textContent='Inspect the authored terrain. Battle playback below uses Atlas only when its scene is explicitly linked.'
 const link=document.createElement('a');link.href='http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html';link.textContent='Open served 3D player';link.className='atlas-link'
 const retry=document.createElement('button');retry.textContent='Reload map';retry.id='atlasReload'
 const reset=document.createElement('button');reset.textContent='Reset camera';reset.id='atlasReset'
 section.appendChild(title);section.appendChild(controls);section.appendChild(status);section.appendChild(link);section.appendChild(viewport);section.appendChild(note);host.appendChild(section)
 let catalog=snapshot,driver=null,version=0,disposed=false,mapId=null,areaIndex=0,currentLayout=null,pending=Promise.resolve()
 const location=options.location||globalThis.location,served=!!location&&['http:','https:'].includes(location.protocol)
 const report=message=>{status.textContent=message;link.style.display=served?'none':''}
 const mapPicker=picker(controls,'atlasMap','Atlas map',id=>{pending=show(id,0)}),areaPicker=picker(controls,'atlasArea','Area',area=>{pending=show(mapId,area,currentLayout)})
 controls.appendChild(retry);controls.appendChild(reset)
 const list=()=>mapPicker.set((catalog?.index||[]).map(r=>({value:r.id,label:r.name})),mapId)
 async function show(id,area=0,layout){
  const turn=++version;driver?.dispose();driver=null;mapId=id;areaIndex=area;report('Loading '+id+'…');list()
  try{
   const input=layout||(served?await readAtlasLayout(id,options.fetcher,location):catalog?.maps?.[id]);if(disposed||turn!==version)return
   const binding=prepareAtlasBinding({mapId:id,areaIndex:area,layout:input},catalog);currentLayout=binding.plan.map
   const areas=binding.plan.map.dungeonJourney?binding.plan.map.segments.map((s,i)=>({value:i,label:s.name||'Area '+(i+1)})):[{value:0,label:'Whole map'}];areaPicker.set(areas,area)
   if(!served&&!options.driverFactory){atlasSourceURL('assets/battle-atlas/library.json',location)}
   driver=(options.driverFactory||inspectDriver)(viewport,binding,{...options,location,onError:error=>{if(disposed||turn!==version)return;driver?.dispose();driver=null;report('3D unavailable · '+error.message)}})
   await driver.ready;if(disposed||turn!==version)return
   report(binding.plan.map.name+' · '+binding.width+' × '+binding.height+(binding.plan.map.dungeonJourney?' · '+areas[area].label:'')+(served?' · current editable layout':' · packaged layout snapshot'))
  }catch(error){if(disposed||turn!==version)return;driver?.dispose();driver=null;report('3D unavailable · '+error.message)}
 }
 retry.addEventListener('click',()=>{pending=show(mapId,areaIndex)});reset.addEventListener('click',()=>driver?.reset())
 pending=(async()=>{try{if(served)catalog=await readAtlasCatalog(options.fetcher,location);if(disposed)return;if(!catalog?.index?.length)throw Error('Atlas catalog unavailable');list();await show(catalog.index.find(r=>r.id==='sunken-priory-study')?.id||catalog.index[0].id)}catch(error){if(!disposed)report('Atlas unavailable · '+error.message)}})()
 return{show(id,area=0){pending=show(id,area);return pending},get ready(){return pending},get selection(){return {mapId,areaIndex}},dispose(){if(disposed)return;disposed=true;version++;driver?.dispose();mapPicker.dispose();areaPicker.dispose();section.remove()}}
}

export function inspectDriver(host,binding,options={}){
 if(!options.Renderer&&typeof window.WebGL2RenderingContext==='undefined')throw Error('WebGL 2 unavailable')
 const renderer=new(options.Renderer||THREE.WebGLRenderer)({antialias:true}),canvas=renderer.domElement;host.appendChild(canvas)
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.05,1200),controls=new(options.Controls||OrbitControls)(camera,canvas)
 controls.enableDamping=true;controls.maxPolarAngle=1.43;controls.minDistance=2;controls.maxDistance=600
 let disposed=false,built,environment,raf=null,size='',dirty=true
 const reset=()=>{const b=binding,p=b.plan.shift(center(b.origin.col+9,b.origin.row+4));p[0]+=1.3;p[2]+=1.125
  if(!b.plan.map.dungeonJourney){p[0]=0;p[2]=0}
  const d=Math.max(Math.sqrt(3)*1.5*(b.width+.5)/camera.aspect,2.25*(b.height-1)+3)/(2*Math.tan(camera.fov*Math.PI/360))*1.18
  controls.target.set(p[0],0,p[2]);camera.position.set(p[0]-d*.12,d*.78,p[2]+d*.74);controls.update();dirty=true}
 const change=()=>dirty=true;controls.addEventListener('change',change)
 const lost=e=>{e.preventDefault();options.onError?.(Error('WebGL context lost'))};canvas.addEventListener('webglcontextlost',lost)
 const ready=(options.loadAssembly||loadAtlasAssembly)(binding,{...options,cancelled:()=>disposed}).then(result=>{if(disposed){result.dispose();return}built=result;scene.add(built.group);environment=atlasEnvironment(scene,built);renderer.shadowMap.needsUpdate=true;reset();frame()})
 function frame(){if(disposed)return;try{const w=host.clientWidth,h=host.clientHeight;if(w>0&&h>0&&size!==w+'x'+h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(!size)reset();size=w+'x'+h;dirty=true}controls.update();if(dirty&&w>0&&h>0){renderer.render(scene,camera);dirty=false}raf=requestAnimationFrame(frame)}catch(error){options.onError?.(error)}}
 return{ready,reset,dispose(){if(disposed)return;disposed=true;if(raf!==null)window.cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',lost);controls.removeEventListener('change',change);controls.dispose();built?.dispose();environment?.();renderer.dispose();renderer.forceContextLoss();canvas.remove()}}
}
