import fs from 'fs';
const p='gen/gear.json'; const g=JSON.parse(fs.readFileSync(p,'utf8'));
const find=n=>g.relics.find(r=>r.id===n);
const log=[];

// ---- ANGELA'S RULINGS ----
const t=find('item.tandras-empty-cradle');
t.statModifiers={resist:2,accuracy:-20};
t.intent="She mourns the children who will never be born. Two Resist neutralises two burn and two poison at once — and you pay for it every single time you swing.";
log.push('Tandra\'s Empty Cradle: -5 accuracy -> -20 accuracy');

const m=find('item.marching-orders');
m.statModifiers={movement:1,itemSlots:-1};
m.intent="The formations still work against demons, and they work best if you are not carrying anything.";
log.push('Marching Orders: +2 movement -> +1 movement (a relic already costs a slot, so -1 itemSlots is really -2)');

// ---- consequences of those rulings, same bug, same fix ----
const s=find('item.seal-of-the-radiant-order');
if(s){ s.statModifiers={resist:2,accuracy:-20};
  log.push('Seal of the Radiant Order: -10 accuracy -> -20 accuracy (identical case to Tandra)'); }

const u=find('item.unbroken');
if(u){ u.statModifiers={toughness:1,health:-6}; u.name='Ossuary Reliquary';
  u.intent="A finger-bone in a glass tube. It teaches the body to take one more wound than it should, and takes the padding to pay for it.";
  u.source=(u.source||'')+' | 2026-08-17: renamed from "Unbroken" (an attribute, not an object) and re-costed off Item Slots, which double-dips against the slot the relic already occupies.';
  log.push('Unbroken -> Ossuary Reliquary: name was an attribute; -1 itemSlots -> -6 health'); }

// ---- names that are attributes/badges, not objects ----
const moved=[];
for(const id of ['item.plague-survivor','item.skyward-censer','item.hunters-instinct']){
  const i=g.relics.findIndex(r=>r.id===id);
  if(i>=0){ moved.push(g.relics[i]); g.relics.splice(i,1); }
}
fs.writeFileSync('badge-candidates.json', JSON.stringify(moved,null,1));
log.push('MOVED OUT of relics -> badge candidates: '+moved.map(r=>r.name).join(', '));

// ---- replacements so the relic count holds ----
g.relics.push(
 {id:'item.gravediggers-lantern',name:"Gravedigger's Lantern",itemClass:'relic',tier:2,slots:1,hands:0,classRestriction:null,
  statModifiers:{health:4,crit:-5},triggers:[],grants:[],equipCost:{},persists:true,tags:[],
  intent:"He carried it through the plague years and it never went out. The body it hardened stopped being quick.",
  source:'Replaces item.plague-survivor, whose name described a person rather than an object. Same numbers.'},
 {id:'item.censer-of-the-high-choir',name:'Censer of the High Choir',itemClass:'relic',tier:2,slots:1,hands:0,classRestriction:null,
  statModifiers:{spirit:2,health:-4},triggers:[],grants:[],equipCost:{},persists:true,tags:[],
  intent:"Two Spirit into a party-wide sum is enormous, and it is bought out of the one body swinging the censer.",
  source:'Replaces item.skyward-censer. Same numbers, an unambiguously object name.'},
 {id:'item.trackers-eyeglass',name:"Tracker's Eyeglass",itemClass:'relic',tier:1,slots:1,hands:0,classRestriction:null,
  statModifiers:{vision:1,health:-2},triggers:[],grants:[],equipCost:{},persists:true,tags:[],
  intent:"A cracked lens on a thong. You see one hex further and you have spent something to do it.",
  source:"Replaces item.hunters-instinct, whose name described a trait rather than an object. Same numbers."}
);
fs.writeFileSync(p, JSON.stringify(g,null,1));
console.log(log.join('\n'));
console.log('\nrelics now:', g.relics.length);
