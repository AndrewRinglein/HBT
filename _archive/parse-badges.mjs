import fs from 'fs';
const src=fs.readFileSync('/mnt/user-data/uploads/Heroes of Blight and Tragic/4-BADGES-NOTES.md','utf8');
const lines=src.split('\n');
const rows=[]; let cat='', sub='';
for(const L of lines){
  const h3=L.match(/^### (\d+) · (.+?)(?: \(\d+\))?$/); if(h3){cat=h3[2].trim(); sub=''; continue;}
  const b=L.match(/^\*\*(.+?)\*\*\s*$/); if(b && !/^\|/.test(L)) { sub=b[1].replace(/[—–-].*$/,'').trim(); continue; }
  const m=L.match(/^\|\s*`([a-z]+\.[a-z0-9.-]+)`\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/);
  if(m) rows.push({id:m[1].trim(),name:m[2].trim(),rarity:m[3].trim(),payload:m[4].trim(),category:cat,group:sub});
}
// manifest as the authority
const man=src.slice(src.indexOf('## MANIFEST'));
const manIds=[...man.matchAll(/^((?:badge|origin|injury)\.[a-z0-9.-]+)\s*$/gm)].map(m=>m[1]);
const retired=new Set([...man.matchAll(/retired[^\n]*\n([\s\S]{0,600}?)```/gi)].flatMap(m=>[...m[1].matchAll(/((?:badge|injury|origin)\.[a-z0-9.-]+)/g)].map(x=>x[1])));
const byId=new Map(rows.map(r=>[r.id,r]));
const out=manIds.filter(id=>!retired.has(id)).map(id=>byId.get(id)||{id,name:id.split('.')[1].replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),rarity:'',payload:'',category:'',group:''});
const dedup=[...new Map(out.map(r=>[r.id,r])).values()];
console.log('manifest ids:',manIds.length,' parsed table rows:',rows.length,' matched:',dedup.filter(r=>r.payload).length,' unmatched:',dedup.filter(r=>!r.payload).length);
const byPrefix={}; dedup.forEach(r=>{const p=r.id.split('.')[0]; byPrefix[p]=(byPrefix[p]||0)+1;});
console.log('by prefix:',JSON.stringify(byPrefix),' TOTAL',dedup.length);
console.log('retired:',[...retired].join(', ')||'none found');
fs.writeFileSync('gen/badges.json',JSON.stringify({badges:dedup},null,1));
