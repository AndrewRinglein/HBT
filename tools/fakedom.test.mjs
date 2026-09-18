import {test} from 'node:test'
import assert from 'node:assert/strict'
import {El} from './fakedom.mjs'

for(const property of ['innerHTML','textContent'])test(`${property} replacement detaches the old subtree and permits reattachment`,()=>{
 const root=new El('div'),host=new El('section');root.appendChild(host)
 host.innerHTML='<div><button id="old">Old</button></div>'
 const old=host.firstChild,button=old.firstChild
 assert.equal(root.contains(button),true)
 host[property]=property==='innerHTML'?'<button id="new">New</button>':'Replacement'
 assert.equal(old.parentNode,null,'removed subtree root must detach')
 assert.equal(button.parentNode,old,'descendants retain their own subtree')
 assert.equal(host.contains(old),false);assert.equal(root.contains(button),false)
 assert.equal(old.contains(button),true);assert.equal(root.querySelector('#old'),null)
 if(property==='innerHTML')assert.equal(root.querySelector('#new').parentNode,host)
 else assert.equal(host.textContent,'Replacement')
 root.appendChild(old);assert.equal(root.contains(button),true);assert.equal(host.contains(button),false)
 old.remove();assert.equal(root.contains(button),false)
})
