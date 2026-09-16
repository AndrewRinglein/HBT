import {El,makeWindow} from '../../viewer/tools/fakedom.mjs'
import {readFileSync} from 'node:fs'
// Extend the shared tree DOM with the attributes used by Kingdom controls.
const originalMatches=El.prototype.matches
const attr=(el,key)=>key.startsWith('data-') ? el.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] : el.getAttribute(key)
function matches(el,selector){
 const m=selector.match(/^(?:([a-z]+))?\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]$/)
 if(m)return(!m[1]||el.tag===m[1])&&attr(el,m[2])!==undefined&&attr(el,m[2])!==null&&(m[3]===undefined||String(attr(el,m[2]))===m[3])
 return originalMatches.call(el,selector)
}
El.prototype.matches=function(selector){return matches(this,selector)}
El.prototype.querySelectorAll=function(selector){const out=[];const walk=node=>{for(const child of node.children){if(selector.split(',').some(s=>matches(child,s.trim())))out.push(child);walk(child)}};walk(this);return out}
El.prototype.removeAttribute=function(key){delete this.attrs[key]}
Object.defineProperties(El.prototype,{
 els:{get(){return this.querySelectorAll('[data-act]')},configurable:true},
 handlers:{get(){return Object.fromEntries(Object.entries(this.listeners).map(([key,list])=>[key,(event={})=>list.forEach(f=>f({target:this,preventDefault(){},stopPropagation(){},...event}))]))},configurable:true},
 disabled:{get(){return this.hasAttribute('disabled')},configurable:true},
})
export function dom(){const w=makeWindow();w.removeEventListener=()=>{};const store=new Map();w.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};return{w,store}}
export function bootSlice(file='SLICE.html'){
 const {w,store}=dom(),root=w.document.createElement('div');root.id='app';w.document.body.appendChild(root)
 const html=readFileSync(file,'utf8'),script=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'))
 const names=['window','document','globalThis','self','localStorage','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','getComputedStyle','performance','HTMLElement','Element']
 new Function(...names,script)(...names.map(n=>['window','globalThis','self'].includes(n)?w:['HTMLElement','Element'].includes(n)?El:w[n]))
 const click=(act,id)=>{const el=root.els.find(e=>e.dataset.act===act&&(id===undefined||e.dataset.id===id));if(!el||el.disabled)throw Error('Missing/disabled action '+act);el.handlers.click()}
 return{w,store,root,click}
}
