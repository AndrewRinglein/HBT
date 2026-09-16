import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync} from 'node:fs'
import {makeWindow} from './fakedom.mjs'
import * as THREE from 'three'
export {THREE}
const require=createRequire(import.meta.url),esbuild=require('../../engine/node_modules/esbuild')
export async function modules(){
 const entry=`export * from './src/atlas.js';export * from './src/atlas-renderer.js';export * from './src/atlas-inspector.js';export * from './src/terrain-scene.js';export * from './src/terrain3d.js';export * from '../assets/battle-atlas/scene.mjs';export {heightOf,syncUnits,syncCorpses,traverse,buildGround,syncProps,drawAim} from './src/board.js';`
 const result=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',nodePaths:[resolve('node_modules')],plugins:[{name:'one-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:pathToFileURL(resolve('node_modules/three/build/three.module.js')).href,external:true}))}}]})
 mkdirSync('.build',{recursive:true});const path=resolve('.build/atlas-source-test.mjs');writeFileSync(path,result.outputFiles[0].text);return import(pathToFileURL(path).href)
}
export function canvas(){const c={width:1,height:1,cloneNode:()=>canvas()};c.getContext=()=>new Proxy({canvas:c,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});return c}
export function environment(){const w=makeWindow();globalThis.document=w.document;globalThis.window=w;globalThis.requestAnimationFrame=w.requestAnimationFrame;return w}
