import { readFileSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export function inspectGLB(bytes) {
  if(bytes.length<20 || bytes.readUInt32LE(0)!==0x46546c67 || bytes.readUInt32LE(4)!==2 || bytes.readUInt32LE(8)!==bytes.length) throw new Error('invalid GLB container')
  const length=bytes.readUInt32LE(12)
  if(bytes.readUInt32LE(16)!==0x4e4f534a || length>bytes.length-20) throw new Error('invalid GLB JSON')
  const doc=JSON.parse(bytes.subarray(20,20+length).toString())
  if(doc.extensionsRequired?.length) throw new Error('terrain asset requires unsupported decoder/extension')
  for(const row of [...(doc.images||[]),...(doc.buffers||[])]) if(row.uri!==undefined) throw new Error('terrain assets must embed all images and buffers')
  if(!doc.meshes?.length) throw new Error('terrain asset has no meshes')
  return doc
}
export function packTerrainAssets() {
  const root=fileURLToPath(new URL('../../assets/terrain-3d/',import.meta.url)), manifest=JSON.parse(readFileSync(new URL('../src/terrain-assets.json',import.meta.url)))
  return Object.fromEntries(Object.entries(manifest).map(([id,path])=>{
    const file=resolve(root,path),rel=relative(root,file)
    if(rel.startsWith('..')||isAbsolute(rel)||!file.endsWith('.glb')) throw new Error('terrain asset outside owned input directory')
    const bytes=readFileSync(file);inspectGLB(bytes)
    return [id,{path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')}]
  }))
}
