// Atlas uses the host's Three dependency. Browser builds resolve through
// nodePaths; native verifier imports need the same narrowly scoped mapping.
// No package layout change and no validation/module execution is skipped.
import {registerHooks} from 'node:module'
const atlasURL=new URL('../../assets/battle-atlas/',import.meta.url).href
const characterURL=new URL('../../assets/characters/hero-transformations/',import.meta.url).href
export function registerAtlasDependency(){
 const three=import.meta.resolve('three')
 return registerHooks({resolve(specifier,context,next){
  if(specifier==='three'&&[atlasURL,characterURL].some(prefix=>context.parentURL?.startsWith(prefix)))return next(three,context)
  return next(specifier,context)
 }})
}
