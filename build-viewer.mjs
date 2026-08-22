import fs from 'fs';
const DATA = fs.readFileSync('hbt-content.json','utf8');
const GUIDE = fs.readFileSync('AUTHORING-GUIDE.md','utf8');
// hero art: 146 unique thumbnails, base64-inlined so the codex stays one self-contained file
let ART_IMG={}, ART_OF={};
if(fs.existsSync('art/manifest.json')){
  ART_OF=Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('art/manifest.json','utf8')))
    .map(([id,v])=>[id,v.thumb]));
  for(const f of new Set(Object.values(ART_OF)))
    ART_IMG[f]='data:image/webp;base64,'+fs.readFileSync('art/thumbs/'+f).toString('base64');
  const bytes=Object.values(ART_IMG).reduce((n,s)=>n+s.length,0);
  console.log('  art:', Object.keys(ART_IMG).length, 'images inlined,', (bytes/1048576).toFixed(2), 'MB base64');
}
const html = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HoBaT Codex — content browser</title>
<style>
:root{--bg:#14101c;--panel:#1f1830;--panel2:#191426;--border:#3a2f50;--gold:#d4af37;--text:#e8e0d0;--dim:#9a8f7a;--pos:#a5d6a7;--neg:#ef9a9a;--info:#c9dcff;--acc:#9ecbff}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:Georgia,'Iowan Old Style',serif;margin:0;font-size:14px}
header{padding:14px 22px 0;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
header h1{color:var(--gold);font-size:22px;margin:0;letter-spacing:.5px}
header .sub{color:var(--dim);font-size:12px}
nav{display:flex;flex-wrap:wrap;gap:4px;padding:10px 22px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:50}
.tab{padding:5px 12px;border-radius:6px 6px 0 0;border:1px solid var(--border);border-bottom:none;background:var(--panel);color:var(--text);font-family:inherit;font-size:13px;cursor:pointer}
.tab:hover{border-color:var(--gold)}
.tab.active{background:var(--gold);color:#1a1410;font-weight:bold}
.tab .n{font-size:10px;opacity:.7;margin-left:4px}
main{padding:16px 22px 80px}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 16px;align-items:center}
input,select{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:inherit;font-size:12px}
input{width:240px}input:focus,select:focus{outline:none;border-color:var(--gold)}
.count{color:var(--dim);font-size:12px;margin-left:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:10px 12px;transition:border-color .12s}
.card:hover{border-color:var(--gold)}
.card h3{margin:0 0 2px;font-size:15px;color:#f0e6d2;font-weight:600}
.meta{color:var(--dim);font-size:10.5px;margin-bottom:6px;letter-spacing:.3px;text-transform:uppercase}
.desc{color:#cfc6b2;font-size:12.5px;line-height:1.45}
.intent{color:var(--info);font-size:12px;font-style:italic;line-height:1.4;margin-bottom:5px}
.id{color:var(--acc);font-size:10.5px;font-family:ui-monospace,Menlo,monospace;margin-top:6px;word-break:break-all;opacity:.75}
.mods{margin:5px 0;font-size:12px}
.mod{display:inline-block;margin:1px 5px 1px 0}
.mod.p{color:var(--pos)}.mod.n{color:var(--neg)}
.tags{margin-top:6px}
.tag{display:inline-block;padding:1px 7px;border-radius:9px;font-size:10px;margin:1px 3px 1px 0;background:rgba(212,175,55,.1);border:1px solid #5a4a2a;color:#d8c78d}
.tag.creature{background:rgba(239,83,80,.1);border-color:#7a3a38;color:#efb0ae}
.tag.form{background:rgba(92,138,230,.12);border-color:#3d5a8a;color:#b8ccf0}
.tag.manner{background:rgba(95,184,106,.12);border-color:#3a6a44;color:#a8d6ae}
.pill{display:inline-block;padding:1px 8px;border-radius:9px;font-size:10px;border:1px solid var(--border);background:var(--panel2);color:var(--dim);margin-right:4px}
.pill.t0{border-color:#5a5a5a;color:#9a9a9a}.pill.t1{border-color:#4a7a4a;color:#a5d6a7}
.pill.t2{border-color:#4a6a9a;color:#9ecbff}.pill.t3{border-color:#8a6ab0;color:#ce93d8}
.pill.t4{border-color:var(--gold);color:var(--gold)}
.pill.free{border-color:#c98a2a;color:#ffcc80}
.pill.cost{border-color:#4a7a9a;color:#9ecbff}
.shape{color:#9ecbff;font-size:11.5px;line-height:1.4;margin:3px 0 4px}
.shape.multi{color:var(--gold);font-weight:600}
.pill.warn{border-color:#a04a48;color:#ef9a9a}
.meta.act{margin:-2px 0 6px}
.trig{color:var(--info);font-size:11.5px;margin-top:5px;line-height:1.4}
.trig b{color:#7fb3ff;font-weight:600}
.spec-block{margin-bottom:26px}
.spec-head{border-bottom:1px solid var(--border);padding-bottom:5px;margin-bottom:10px}
.spec-head h2{margin:0;color:var(--gold);font-size:17px;display:inline}
.spec-head .cls{color:var(--dim);font-size:12px;margin-left:8px}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin:14px 0 22px}
.stat{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:9px 12px}
.stat .v{color:var(--gold);font-size:22px;font-weight:bold;line-height:1.1}
.stat .l{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.md{max-width:900px;line-height:1.6;color:#d8d0c0;font-size:13.5px}
.md h1{color:var(--gold);font-size:20px;border-bottom:1px solid var(--border);padding-bottom:6px}
.md h2{color:var(--gold);font-size:16px;margin-top:26px}
.md h3{color:#c9b896;font-size:14px}
.md code{background:var(--panel);padding:1px 5px;border-radius:4px;color:var(--acc);font-size:12px}
.md pre{background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:10px;overflow-x:auto;font-size:11.5px;color:#c9c0ae}
.md table{border-collapse:collapse;width:100%;font-size:12.5px;margin:10px 0}
.md th{text-align:left;padding:5px 9px;color:var(--gold);border-bottom:1px solid var(--gold)}
.md td{padding:4px 9px;border-bottom:1px solid #2a2240;vertical-align:top}
.md blockquote{border-left:3px solid var(--border);margin-left:0;padding-left:12px;color:var(--dim)}
.empty{color:var(--dim);padding:40px;text-align:center}
.pill.rar{border-color:#6a5a3a;color:#d8c78d}
.pill.legendary{border-color:var(--gold);color:var(--gold)}
.pill.rare{border-color:#8a6ab0;color:#ce93d8}
.pill.uncommon{border-color:#4a6a9a;color:#9ecbff}
.pill.common{border-color:#4a7a4a;color:#a5d6a7}
.pill.cls{border-color:#c98a2a;color:#ffcc80}
.pill.injury{border-color:#7a3a38;color:#efb0ae}
.payload{color:#e6dcc4;font-size:12.5px;line-height:1.45;margin-top:4px}
.badge-card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:9px 11px}
.badge-card:hover{border-color:var(--gold)}
.badge-card h3{margin:0;font-size:14px;color:#f0e6d2;font-weight:600}
.cls-card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:12px 14px}
.cls-card h3{margin:0 0 4px;color:var(--gold);font-size:16px}
.statbar{display:inline-block;height:7px;background:var(--gold);border-radius:3px;vertical-align:middle}
.artset{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px}
.artgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;margin-top:8px}
.artcell{background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:8px 6px;text-align:center;font-size:11px;color:#cfc6b2}
.artcell.st{border-color:#7a3a38;color:#efb0ae}
.lvl{display:grid;grid-template-columns:52px 1fr;gap:0;border-bottom:1px solid #241d38}
.lvl:last-child{border-bottom:none}
.lvl.spec{background:rgba(212,175,55,.05)}
.lvl.choice{background:rgba(158,203,255,.05)}
.lvl-n{padding:9px 10px;color:var(--gold);font-weight:bold;font-size:14px;border-right:1px solid var(--border);text-align:center}
.lvl-n small{display:block;font-size:9px;color:var(--dim);font-weight:normal;letter-spacing:.4px}
.lvl-b{padding:9px 12px}
.lvl-tbl{background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:8px}
.g{display:inline-block;padding:2px 8px;border-radius:9px;font-size:11.5px;margin:2px 4px 2px 0;background:var(--panel);border:1px solid #3a5a3a;color:var(--pos)}
.g.big{border-color:var(--gold);color:var(--gold)}
.g.off{border-color:#c98a2a;color:#ffcc80}
.opt{display:inline-block;padding:2px 8px;border-radius:9px;font-size:11.5px;margin:2px 4px 2px 0;background:var(--panel);border:1px solid #3d5a8a;color:#b8ccf0}
.lvl-note{color:var(--dim);font-size:11.5px;font-style:italic;margin-top:5px;line-height:1.4}
.rulebox{background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:6px;padding:9px 12px;margin-bottom:8px}
.rulebox b{color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:.4px}
.rulebox div{color:#cfc6b2;font-size:12.5px;line-height:1.45;margin-top:3px}
.srcpill{font-size:10px;padding:2px 8px;border-radius:9px;border:1px solid #4a7a4a;color:#a5d6a7;margin-left:8px}
.srcpill.auth{border-color:#8a6ab0;color:#ce93d8}
.srcpill.mixed{border-color:#c98a2a;color:#ffcc80}
.vchip{font-size:9.5px;padding:1px 6px;border-radius:9px;border:1px solid #4a6a9a;color:#9ecbff;margin-left:7px;vertical-align:2px;font-weight:normal;letter-spacing:.3px}
.hgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}
.hero{background:var(--panel);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.hero:hover{border-color:var(--gold)}
.hero-artbox{position:relative;height:300px;overflow:hidden;background:#0d0a14;border-bottom:1px solid var(--border);background-size:cover;background-position:center}
.hero-artbox::before{content:'';position:absolute;inset:-24px;background-image:inherit;background-size:cover;background-position:center;filter:blur(20px) brightness(.4) saturate(.7)}
.hero-art{position:relative;display:block;width:100%;height:100%;object-fit:contain}
.noart{display:flex;align-items:center;justify-content:center;color:#4a4260;font-size:11px;font-style:italic;height:60px;background:#0d0a14;border-bottom:1px solid var(--border)}
.hero-h{background:var(--panel2);padding:8px 11px;border-bottom:1px solid var(--border)}
.hero-h h3{margin:0;font-size:14.5px;color:#f0e6d2;font-weight:600}
.hero-h .sub{color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
.hero-b{padding:8px 11px}
.sblock{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;margin-bottom:6px}
.s{background:var(--panel2);border:1px solid #2f2748;border-radius:5px;padding:4px 2px;text-align:center;position:relative}
.s .sv{font-size:14px;font-weight:bold;line-height:1.15;color:#e8e0d0}
.s .sl{font-size:8px;color:var(--dim);text-transform:uppercase;letter-spacing:0;white-space:nowrap}
.s.ported{border-color:#3a6a44}.s.ported .sv{color:var(--pos)}
.s.derived{border-color:#8a6ab0}.s.derived .sv{color:#ce93d8}
.s.fromlevel{border-color:var(--gold)}.s.fromlevel .sv{color:var(--gold)}
.s.zero .sv{color:#5a5268}
.s .plus{position:absolute;top:1px;right:3px;font-size:8px;color:var(--gold)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--dim);margin:2px 0 12px}
.legend b{font-weight:normal}
.sw{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px;border:1px solid}
.sw.p{border-color:#3a6a44;background:rgba(165,214,167,.35)}
.sw.d{border-color:#8a6ab0;background:rgba(206,147,216,.35)}
.sw.l{border-color:var(--gold);background:rgba(212,175,55,.35)}
.hnote{color:var(--dim);font-size:11px;font-style:italic;line-height:1.4;margin-top:5px;border-top:1px solid #241d38;padding-top:5px}
.hnote.warn{color:#efb0ae;font-style:normal}
.lvlpick{display:flex;align-items:center;gap:7px;color:var(--dim);font-size:12px}
.lvlpick input{width:150px;padding:0}
.lvlpick b{color:var(--gold);font-size:15px;min-width:20px;text-align:center}
.wpn-list{display:grid;grid-template-columns:1fr;gap:12px}
.wpn{display:grid;grid-template-columns:minmax(280px,340px) 1fr;gap:0;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.wpn:hover{border-color:var(--gold)}
.wpn-head{background:var(--panel);padding:11px 13px;border-right:1px solid var(--border)}
.wpn-head h3{margin:0 0 3px;font-size:15px;color:#f0e6d2}
.atk-rows{display:grid;grid-template-columns:1fr 1fr;gap:0}
.atk{padding:10px 13px;border-left:1px solid var(--border);border-bottom:1px solid #241d38}
.atk:nth-child(odd){border-left:none}
.atk-n{color:var(--gold);font-size:13.5px;font-weight:600;margin-bottom:4px}
.atk-s{margin-bottom:4px;line-height:1.9}
@media(max-width:900px){.wpn{grid-template-columns:1fr}.atk-rows{grid-template-columns:1fr}.wpn-head{border-right:none;border-bottom:1px solid var(--border)}}
</style></head><body>
<header><h1>The HoBaT Codex</h1><span class="sub">Heroes of Blight and Tragic &middot; content browser &middot; generated ${new Date().toISOString().slice(0,10)}</span></header>
<nav id="tabs"></nav><main id="main"></main>
<script>
const D = ${DATA};
const GUIDE_MD = ${JSON.stringify(GUIDE)};
const ART_IMG = ${JSON.stringify(ART_IMG)};
const ART_OF  = ${JSON.stringify(ART_OF)};
const artOf = id => ART_IMG[ART_OF[id]] || null;
function paintArt(root){ root.querySelectorAll('[data-a]').forEach(el=>{
  const u=ART_IMG[el.dataset.a]; if(!u) return;
  if(el.tagName==='IMG') el.src=u; else el.style.backgroundImage='url("'+u+'")'; }); }
const byClass = c => D.items.filter(i=>i.itemClass===c);
const TAG_GROUP = {}; D.tags.forEach(t=>TAG_GROUP[t.id]=t.group);
const tagCls = t => 'tag '+(TAG_GROUP['tag.'+t]||TAG_GROUP[t]||'');
const esc = s => String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

function mods(m){ if(!m||!Object.keys(m).length) return '';
  return '<div class="mods">'+Object.entries(m).map(([k,v])=>
    '<span class="mod '+(v<0?'n':'p')+'">'+(v>0?'+':'')+v+' '+k.replace(/([A-Z])/g,' $1')+'</span>').join('')+'</div>'; }
function trigs(t){ if(!t||!t.length) return '';
  return '<div class="trig">'+t.map(x=>typeof x==='string'?esc(x):'<b>'+esc(x.hook||x.on||'')+'</b> '+esc(x.effect||x.description||JSON.stringify(x))).join('<br>')+'</div>'; }
function tags(a){ if(!a||!a.length) return '';
  return '<div class="tags">'+a.map(t=>'<span class="'+tagCls(t)+'">'+esc(String(t).replace('tag.',''))+'</span>').join('')+'</div>'; }
function tier(t){ return t==null?'':'<span class="pill t'+t+'">T'+t+'</span>'; }
const multiHex = a => a.targets && /and the (two )?hex|adjacent to both you|every enemy adjacent|and every enemy adjacent|up to (two|three)/i.test(a.targets);
// Items with an activated effect carry the same cost fields as a power. The item card
// used to drop them, which made every trinket read as free and usable every Turn.
function act(i){
  if(i.stamina==null && !i.cooldown && !i.warmup && !i.free && !i.targets) return '';
  const p=[];
  p.push('<span class="pill cost">'+(i.stamina||0)+' stam</span>');
  if(i.cooldown) p.push('<span class="pill cost">CD '+i.cooldown+'</span>');
  else if(i.persists!==false) p.push('<span class="pill warn">no cooldown</span>');
  if(i.warmup) p.push('<span class="pill cost">warmup '+i.warmup+'</span>');
  if(i.free) p.push('<span class="pill free">does not use your action</span>');
  if(i.persists===false) p.push('<span class="pill">consumed on use</span>');
  if(i.targets) p.push('<span class="pill">'+esc(i.targets)+'</span>');
  return '<div class="meta act">'+p.join('')+'</div>';
}

const RENDER = {
  item: i => '<div class="card"><h3>'+esc(i.name)+'</h3><div class="meta">'+tier(i.tier)+
    (i.armorWeight?'<span class="pill">'+i.armorWeight+'</span>':'')+
    (i.hands?'<span class="pill">'+i.hands+'H</span>':'')+
    (i.classRestriction?'<span class="pill">'+esc(i.classRestriction.replace('class.',''))+' only</span>':'')+
    '</div>'+act(i)+(i.intent?'<div class="intent">'+esc(i.intent)+'</div>':'')+
    (i.description?'<div class="desc">'+esc(i.description)+'</div>':'')+
    mods(i.statModifiers)+
    (i.immunity?'<div class="trig"><b>immunity</b> '+Object.entries(i.immunity).map(([k,v])=>k+' '+v).join(', ')+'</div>':'')+
    (i.flight?'<div class="trig"><b>FLIGHT</b></div>':'')+(i.airwalk?'<div class="trig"><b>AIRWALK</b></div>':'')+
    trigs(i.triggers)+
    (i.grants&&i.grants.length?'<div class="trig"><b>grants</b> '+i.grants.map(esc).join(', ')+'</div>':'')+
    (i.equipCost&&Object.keys(i.equipCost).length?'<div class="trig"><b>cost</b> '+Object.entries(i.equipCost).map(([k,v])=>v+' '+k).join(', ')+'</div>':'')+
    tags(i.tags)+'<div class="id">'+esc(i.id)+'</div></div>',
  power: p => '<div class="card"><h3>'+esc(p.name)+'</h3><div class="meta">'+
    (p.free?'<span class="pill free">FREE</span>':'')+
    '<span class="pill">'+(p.stamina||0)+' stam</span>'+
    (p.cooldown?'<span class="pill">CD '+p.cooldown+'</span>':'')+
    (p.warmup?'<span class="pill">warmup '+p.warmup+'</span>':'')+
    (p.targets?'<span class="pill">'+esc(p.targets)+'</span>':'')+
    (p.addsStat?'<span class="pill" style="border-color:#8a6ab0;color:#ce93d8">+ '+esc(p.addsStat)+'</span>':'')+
    (p.addsTargetStatus?'<span class="pill" style="border-color:#c98a2a;color:#ffcc80">+ target\u2019s '+esc(p.addsTargetStatus)+'</span>':'')+'</div>'+
    '<div class="desc">'+esc(p.description)+'</div>'+mods(p.statModifiers)+trigs(p.triggers)+tags(p.tags)+
    '<div class="id">'+esc(p.id)+(p.specialty?' &middot; '+esc(p.specialty):'')+'</div></div>',
  attack: a => '<div class="card"><h3>'+esc(a.name)+'</h3><div class="meta">'+
    '<span class="pill">'+(a.range==='melee'||a.range==1?'melee':'r'+a.range)+'</span>'+
    '<span class="pill">'+esc(a.stat||'')+' '+(a.damage>=0?'+':'')+(a.damage==null?'':a.damage)+'</span>'+
    (a.addsStat?'<span class="pill" style="border-color:#8a6ab0;color:#ce93d8">+ '+esc(a.addsStat)+'</span>':'')+
    (a.addsTargetStatus?'<span class="pill" style="border-color:#c98a2a;color:#ffcc80">+ target\u2019s '+esc(a.addsTargetStatus)+'</span>':'')+
    '<span class="pill">'+(a.stamina||0)+' stam</span>'+
    (a.damageType?'<span class="pill">'+esc(a.damageType)+'</span>':'')+
    (a.hits>1?'<span class="pill">'+a.hits+' hits</span>':'')+'</div>'+
    (a.targets?'<div class="shape'+(multiHex(a)?' multi':'')+'">'+esc(a.targets)+'</div>':'')+
    (a.description?'<div class="desc">'+esc(a.description)+'</div>':'')+
    '<div class="mods">'+(a.accuracy?'<span class="mod '+(a.accuracy<0?'n':'p')+'">'+(a.accuracy>0?'+':'')+a.accuracy+' acc</span>':'')+
    (a.crit?'<span class="mod '+(a.crit<0?'n':'p')+'">'+(a.crit>0?'+':'')+a.crit+' crit</span>':'')+'</div>'+
    trigs(a.triggers)+(a.slayer&&Object.keys(a.slayer||{}).length?'<div class="trig"><b>slayer</b> '+Object.entries(a.slayer).map(([k,v])=>k+' +'+v).join(', ')+'</div>':'')+
    tags(a.tags)+'<div class="id">'+esc(a.id)+'</div></div>',
  enchant: e => '<div class="card"><h3>'+esc(e.name)+'</h3><div class="meta">'+tier(e.tier)+
    (e.appliesToTags||[]).map(t=>'<span class="'+tagCls(t)+'">'+esc(t)+'</span>').join('')+
    (e.damageTypeOverride?'<span class="pill cost">deals '+esc(e.damageTypeOverride)+' damage</span>':'')+'</div>'+
    (e.intent?'<div class="intent">'+esc(e.intent)+'</div>':'')+mods(e.statModifiers)+trigs(e.triggers)+
    '<div class="id">'+esc(e.id)+'</div></div>',
  badge: b => '<div class="badge-card"><h3>'+esc(b.name)+'</h3><div class="meta" style="margin:4px 0 0">'+
    '<span class="pill '+rarCls(b.rarity)+'">'+esc(b.rarity||'—')+'</span>'+
    (b.group?'<span class="pill">'+esc(b.group)+'</span>':'')+'</div>'+
    (b.payload?'<div class="payload">'+md(b.payload)+'</div>':'<div class="payload" style="color:var(--dim)">prose-only \u2014 no payload line in the manifest</div>')+
    '<div class="id">'+esc(b.id)+'</div></div>'
};
const RAR=['common','uncommon','rare','legendary'];
const rarCls = r => RAR.includes(r)?r:(r==='minor'||r==='medium'||r==='major'?'injury':'cls');
const md = s => esc(s).replace(/\x60([^\x60]+)\x60/g,'<code style="background:var(--panel2);padding:1px 5px;border-radius:4px;color:var(--acc);font-size:11.5px">$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>');
const kindOf = b => b.id.split('.')[0];

function filterBar(id, opts){
  return '<div class="bar"><input id="q'+id+'" placeholder="search name, text, id…">'+
    opts.map(o=>'<select id="'+o.id+id+'"><option value="">'+o.label+'</option>'+
      o.values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select>').join('')+
    '<span class="count" id="c'+id+'"></span></div><div class="grid" id="g'+id+'"></div>';
}
function wire(id, rows, render, opts){
  const q=document.getElementById('q'+id), g=document.getElementById('g'+id), c=document.getElementById('c'+id);
  const sels=opts.map(o=>({o,el:document.getElementById(o.id+id)}));
  const run=()=>{ const t=(q.value||'').toLowerCase();
    let r=rows.filter(x=>!t||JSON.stringify(x).toLowerCase().includes(t));
    sels.forEach(({o,el})=>{ if(el.value) r=r.filter(x=>o.get(x)===el.value); });
    g.innerHTML = r.length? r.map(render).join('') : '<div class="empty">nothing matches</div>';
    c.textContent = r.length+' of '+rows.length; };
  q.oninput=run; sels.forEach(({el})=>el.onchange=run); run();
}
const uniq = (a,f)=>[...new Set(a.map(f).filter(x=>x!=null&&x!==''))].sort();

const TABS=[
 // The bestiary. 219 creatures ported from hell-tcg data/enemyCards.js 2026-08-21 - the
 // stat blocks were never missing, they lived in a file the extractor did not read.
 // NOTE: no backticks anywhere in a tab. This whole script sits inside a String.raw template.
 {id:'bestiary',label:'Bestiary',n:(D.bestiary||[]).length,render(){
   const U=D.bestiary||[]; if(!U.length) return '<div class="empty">no bestiary</div>';
   const RANK={0:'-',1:'Regular',2:'Elite',3:'Boss'};
   const acc=U.map(u=>(u.derivedBase||{}).accuracy).filter(n=>typeof n==='number');
   const mov=U.map(u=>(u.derivedBase||{}).movement).filter(n=>typeof n==='number');
   const head='<p>'+U.length+' creatures, ported from Hell-TCG. '+U.filter(u=>u.curated).length+
     ' are the curated roster with art and encounters. Accuracy runs '+Math.min.apply(null,acc)+'-'+Math.max.apply(null,acc)+
     ', movement '+Math.min.apply(null,mov)+'-'+Math.max.apply(null,mov)+
     ' - both DERIVED from the creature ARCHETYPE (what kind of thing it is), never from rank:'+
     ' rank only sharpens whatever the archetype already does. Nothing sits above 115 unless its'+
     ' reach is 4+, because hitting from outside your reach is the only thing that earns it.'+
     ' All numbers soft until a sweep prices them.'+
     ' Enemies carry no crit, no luck and no Vision.</p>';
   var byA={}; U.forEach(function(u){ var k=u.archetype||'?'; (byA[k]=byA[k]||[]).push(u); });
   var strip='<div class="md"><table><tr><th>Archetype</th><th>n</th><th>Accuracy</th><th>Move</th><th>Why</th></tr>'+
     Object.keys(byA).sort(function(a,b){
       var f1=byA[a].map(function(u){return (u.derivedBase||{}).accuracy;});
       var f2=byA[b].map(function(u){return (u.derivedBase||{}).accuracy;});
       return Math.max.apply(null,f2)-Math.max.apply(null,f1); }).map(function(k){
       var g=byA[k], A=g.map(function(u){return (u.derivedBase||{}).accuracy;}),
           M=g.map(function(u){return (u.derivedBase||{}).movement;});
       var why=((g[0].derivedWhy||{}).movement||'').split(' - ').slice(1).join(' - ');
       return '<tr><td><b>'+esc(k)+'</b></td><td>'+g.length+'</td><td>'+Math.min.apply(null,A)+'-'+Math.max.apply(null,A)+
         '</td><td>'+Math.min.apply(null,M)+'-'+Math.max.apply(null,M)+'</td><td><small>'+esc(why)+'</small></td></tr>';
     }).join('')+'</table></div>';
   const rows=U.slice().sort(function(a,b){return (b.rank||0)-(a.rank||0)||String(a.name).localeCompare(String(b.name));})
    .map(function(u){
     const d=u.derivedBase||{}, p=u.ported||{};
     const atk=(u.attacks||[]).map(function(a){return esc(a.name);}).join(' &middot; ');
     var trig=(u.triggers||[]).map(function(tr){
       var rng=(tr.range!=null?' r'+tr.range:'');
       var src=(tr.ported?' &middot; ported':(tr.reauthored?' &middot; re-authored':(tr.authored?' &middot; authored':'')));
       return '<span class="tag">['+esc(tr.hook)+(tr.targets?' '+esc(tr.targets):'')+rng+src+'] '+
         (tr.effects||[]).map(function(e){
           return esc(e.effect)+(e.status?' '+esc(e.status):'')+(e.stat?' '+esc(e.stat):'')+
                  (e.value!=null?' '+e.value:''); }).join(' + ')+'</span>';
     }).join(' ');
     const riders=(u.attacks||[]).reduce(function(acc2,a){
       (a.effects||[]).forEach(function(e){
         acc2.push('<span class="tag">'+esc(a.name)+': '+esc(e.status||e.stat||e.effect)+(e.value!=null?' '+e.value:'')+'</span>');
       }); return acc2; },[]).join(' ');
     return '<tr>'+
       '<td>'+(u.art?'<img class="thumb" src="'+esc(u.art)+'" alt="" loading="lazy">':'')+'</td>'+
       '<td><b>'+esc(u.name)+'</b><br><small>'+esc((u.types||[]).join(' / '))+'</small>'+
         (u.curated?'':'<br><span class="tag warn">not in the curated 144</span>')+'</td>'+
       '<td>'+(RANK[u.rank]||u.rank||'-')+'</td>'+
       '<td>'+(p.health!=null?p.health:'-')+'</td>'+
       '<td>'+(p.strength!=null?p.strength:'-')+'</td>'+
       '<td>'+(p.precision!=null?p.precision:'-')+'</td>'+
       '<td>'+(p.armor!=null?p.armor:'-')+'</td>'+
       '<td>'+(p.reach!=null?p.reach:'-')+'</td>'+
       '<td><small>'+esc(u.archetype||'-')+'</small></td>'+
       '<td><b>'+(d.accuracy!=null?d.accuracy:'-')+'</b></td>'+
       '<td><b>'+(d.movement!=null?d.movement:'-')+'</b></td>'+
       '<td>'+(atk||'<small>no attack — it is scenery</small>')+(riders?'<br>'+riders:'')+
         (trig?'<br>'+trig:'')+
         (u.baseline?'<br><span class="tag">bare on purpose — one of the five plain enemies</span>':'')+
         '</td></tr>';
    }).join('');
   return head+strip+'<div class="md"><table><tr><th></th><th>Creature</th><th>Rank</th><th>HP</th><th>Str</th>'+
     '<th>Pre</th><th>Arm</th><th>Rch</th><th>Archetype</th><th>Acc</th><th>Mov</th><th>Abilities</th></tr>'+rows+'</table></div>';
 }},
 // The 193 immediate-cast rows: enemy SPELLS, not units. Ruled 2026-08-21.
 {id:'enemyspells',label:'Enemy Spells',n:(D.enemySpells||[]).length,render(){
   const S=D.enemySpells||[]; if(!S.length) return '<div class="empty">none</div>';
   const head='<p>'+S.length+' rows Hell-TCG filed as enemies which have an all-zero stat block and'+
     ' placement immediate-cast. They are spells the enemy side casts, not creatures placed on the'+
     ' board, so they carry no stats, no movement and no art.</p>';
   const rows=S.slice().sort(function(a,b){return String(a.name).localeCompare(String(b.name));})
    .map(function(s){
     return '<tr><td><b>'+esc(s.name)+'</b></td><td>'+(s.rank!=null?s.rank:'-')+'</td>'+
       '<td><small>'+esc((s.types||[]).join(' / '))+'</small></td>'+
       '<td>'+((s.abilities||[]).map(function(a){return esc(a.name);}).join(' &middot; ')||'-')+'</td></tr>';
    }).join('');
   return head+'<div class="md"><table><tr><th>Spell</th><th>Rank</th><th>Types</th><th>Abilities</th></tr>'+rows+'</table></div>';
 }},
 {id:'overview',label:'Overview',n:null,render(){
   const s=[['heroes',D.heroes.heroes.length],['specialties',D.specialties.length],['powers',D.powers.length],
     ['items',D.items.length],['attacks',D.attacks.length],['enchantments',D.enchants.length],
     ['badges',D.badges.length],['tags',D.tags.length],['classes',D.classes.length]];
   const ic={}; D.items.forEach(i=>ic[i.itemClass]=(ic[i.itemClass]||0)+1);
   const pc={}; D.powers.forEach(p=>{if(p.class)pc[p.class.replace('class.','')]=(pc[p.class.replace('class.','')]||0)+1});
   return '<div class="stats">'+s.map(([l,v])=>'<div class="stat"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>').join('')+'</div>'+
     '<h2 style="color:var(--gold);font-size:16px">Items by class</h2><div class="stats">'+
     Object.entries(ic).map(([k,v])=>'<div class="stat"><div class="v">'+v+'</div><div class="l">'+k+'</div></div>').join('')+'</div>'+
     '<h2 style="color:var(--gold);font-size:16px">Powers by class</h2><div class="stats">'+
     Object.entries(pc).map(([k,v])=>'<div class="stat"><div class="v">'+v+'</div><div class="l">'+k+'</div></div>').join('')+'</div>';
 }},
 {id:'specialties',label:'Specialties',n:D.specialties.length,render(){
   const cls=uniq(D.specialties,s=>s.class);
   let h='<div class="bar"><input id="qs" placeholder="search…"><select id="fs"><option value="">All classes</option>'+
     cls.map(c=>'<option>'+c+'</option>').join('')+'</select><span class="count" id="cs"></span></div><div id="gs"></div>';
   setTimeout(()=>{ const q=document.getElementById('qs'),f=document.getElementById('fs'),g=document.getElementById('gs'),c=document.getElementById('cs');
     const run=()=>{ const t=(q.value||'').toLowerCase();
       let r=D.specialties.filter(s=>(!f.value||s.class===f.value)&&(!t||JSON.stringify(s).toLowerCase().includes(t)));
       g.innerHTML=r.map(s=>{ const pw=D.powers.filter(p=>p.specialty===s.id);
         return '<div class="spec-block"><div class="spec-head"><h2>'+esc(s.name)+'</h2><span class="cls">'+esc((s.class||'').replace('class.',''))+' &middot; '+pw.length+' powers</span></div>'+
           (s.intent?'<div class="intent" style="margin-bottom:8px">'+esc(s.intent)+'</div>':'')+
           mods(s.statModifiers)+trigs(s.triggers)+
           '<div class="grid" style="margin-top:10px">'+pw.map(RENDER.power).join('')+'</div></div>';}).join('')||'<div class="empty">nothing matches</div>';
       c.textContent=r.length+' of '+D.specialties.length; };
     q.oninput=run; f.onchange=run; run(); },0);
   return h; }},
 {id:'powers',label:'Powers',n:D.powers.length,render(){
   const o=[{id:'fc',label:'All classes',values:uniq(D.powers,p=>p.class),get:p=>p.class},
            {id:'ff',label:'Free / not',values:['free','costs your action'],get:p=>p.free?'free':'costs your action'}];
   setTimeout(()=>wire('P',D.powers,RENDER.power,o),0); return filterBar('P',o); }},
 {id:'weapons',label:'Weapons + Attacks',n:byClass('weapon').length,render(){
   const r=byClass('weapon');
   const AT={}; D.attacks.forEach(a=>{AT[a.id]=a});
   const attacksOf=i=>{
     const byGrant=(i.grants||[]).map(g=>AT[g]).filter(Boolean);
     if(byGrant.length) return byGrant;
     const stem=i.id.replace(/^item\./,'');
     return D.attacks.filter(a=>a.id.startsWith('attack.'+stem+'.'));
   };
   const renderWeapon=i=>{
     const as=attacksOf(i);
     return '<div class="wpn"><div class="wpn-head"><h3>'+esc(i.name)+'</h3><div class="meta">'+tier(i.tier)+
       (i.hands?'<span class="pill">'+i.hands+'H</span>':'')+
       (i.classRestriction?'<span class="pill">'+esc(i.classRestriction.replace('class.',''))+' only</span>':'')+
       '<span class="pill">'+as.length+' attack'+(as.length===1?'':'s')+'</span></div>'+
       (i.intent?'<div class="intent">'+esc(i.intent)+'</div>':'')+
       mods(i.statModifiers)+trigs(i.triggers)+tags(i.tags)+
       '<div class="id">'+esc(i.id)+'</div></div>'+
       '<div class="atk-rows">'+(as.length?as.map(a=>
         '<div class="atk"><div class="atk-n">'+esc(a.name)+'</div>'+
         '<div class="atk-s">'+
           '<span class="pill">'+(a.range==='melee'||a.range==1?'melee':'r'+a.range)+'</span>'+
           '<span class="pill">'+esc(a.stat||'-')+' '+(a.damage>0?'+':'')+(a.damage==null?'':a.damage)+'</span>'+
           (a.addsStat?'<span class="pill" style="border-color:#8a6ab0;color:#ce93d8">+ '+esc(a.addsStat)+'</span>':'')+
           (a.addsTargetStatus?'<span class="pill" style="border-color:#c98a2a;color:#ffcc80">+ target\u2019s '+esc(a.addsTargetStatus)+'</span>':'')+
           '<span class="pill">'+(a.stamina||0)+' stam</span>'+
           (a.accuracy?'<span class="mod '+(a.accuracy<0?'n':'p')+'">'+(a.accuracy>0?'+':'')+a.accuracy+' acc</span>':'')+
           (a.crit?'<span class="mod '+(a.crit<0?'n':'p')+'">'+(a.crit>0?'+':'')+a.crit+' crit</span>':'')+
           (a.hits>1?'<span class="pill">'+a.hits+' hits</span>':'')+
           '<span class="pill">'+esc(a.damageType||'')+'</span>'+
         '</div>'+
         (a.targets?'<div class="shape'+(multiHex(a)?' multi':'')+'">'+esc(a.targets)+'</div>':'')+
         (a.description?'<div class="desc" style="font-size:12px">'+esc(a.description)+'</div>':'')+
         trigs(a.triggers)+
         (a.slayer&&Object.keys(a.slayer||{}).length?'<div class="trig"><b>slayer</b> '+Object.entries(a.slayer).map(([k,v])=>k+' +'+v).join(', ')+'</div>':'')+
         tags(a.tags)+'</div>').join('') : '<div class="empty" style="padding:14px">no attacks linked</div>')+'</div></div>';
   };
   const o=[{id:'ft',label:'All tiers',values:uniq(r,i=>i.tier!=null?'T'+i.tier:''),get:i=>i.tier!=null?'T'+i.tier:''},
            {id:'fr',label:'All classes',values:uniq(r,i=>i.classRestriction),get:i=>i.classRestriction},
            {id:'fh',label:'Hands',values:['1','2'],get:i=>String(i.hands)},
            {id:'fm',label:'All forms',values:uniq(r.flatMap(i=>attacksOf(i).flatMap(a=>a.tags||[])),t=>t),
             get:i=>null}];
   o.pop();
   setTimeout(()=>{
     const q=document.getElementById('qW'),g=document.getElementById('gW'),c=document.getElementById('cW');
     const sels=o.map(x=>({o:x,el:document.getElementById(x.id+'W')}));
     const run=()=>{ const t=(q.value||'').toLowerCase();
       let rows=r.filter(i=>{ if(!t) return true;
         const blob=JSON.stringify(i)+JSON.stringify(attacksOf(i));
         return blob.toLowerCase().includes(t); });
       sels.forEach(({o,el})=>{ if(el.value) rows=rows.filter(x=>o.get(x)===el.value); });
       g.innerHTML=rows.length?rows.map(renderWeapon).join(''):'<div class="empty">nothing matches</div>';
       c.textContent=rows.length+' weapons · '+rows.reduce((n,i)=>n+attacksOf(i).length,0)+' attacks'; };
     q.oninput=run; sels.forEach(({el})=>el.onchange=run); run();
   },0);
   return filterBar('W',o).replace('class="grid"','class="wpn-list"'); }},
 {id:'attacks',label:'Attacks',n:D.attacks.length,render(){
   const o=[{id:'fd',label:'All damage types',values:uniq(D.attacks,a=>a.damageType),get:a=>a.damageType},
            {id:'fs',label:'All stats',values:uniq(D.attacks,a=>a.stat),get:a=>a.stat}];
   setTimeout(()=>wire('A',D.attacks,RENDER.attack,o),0); return filterBar('A',o); }},
 {id:'armor',label:'Armor',n:byClass('armor').length,render(){
   const r=byClass('armor');
   const o=[{id:'ft',label:'All tiers',values:uniq(r,i=>i.tier!=null?'T'+i.tier:''),get:i=>i.tier!=null?'T'+i.tier:''},
            {id:'fw',label:'All weights',values:uniq(r,i=>i.armorWeight),get:i=>i.armorWeight}];
   setTimeout(()=>wire('R',r,RENDER.item,o),0); return filterBar('R',o); }},
 {id:'enchants',label:'Enchantments',n:D.enchants.length,render(){
   const o=[{id:'ft',label:'All tiers',values:uniq(D.enchants,e=>e.tier!=null?'T'+e.tier:''),get:e=>e.tier!=null?'T'+e.tier:''}];
   setTimeout(()=>wire('E',D.enchants,RENDER.enchant,o),0); return filterBar('E',o); }},
 ...[['trinket','Trinkets'],['relic','Relics'],['bloodrune','Blood Runes'],['idol','Idols'],['consumable','Consumables']]
   .map(([k,label])=>({id:k,label,n:byClass(k).length,render(){
     const r=byClass(k);
     const o=[{id:'ft',label:'All tiers',values:uniq(r,i=>i.tier!=null?'T'+i.tier:''),get:i=>i.tier!=null?'T'+i.tier:''}];
     setTimeout(()=>wire(k,r,RENDER.item,o),0); return filterBar(k,o); }})),
 {id:'badges',label:'Badges',n:D.badges.length,render(){
   const o=[{id:'fk',label:'All kinds',values:uniq(D.badges,kindOf),get:kindOf},
            {id:'fg',label:'All categories',values:uniq(D.badges,b=>b.category),get:b=>b.category},
            {id:'fr',label:'All rarities',values:uniq(D.badges,b=>b.rarity),get:b=>b.rarity}];
   setTimeout(()=>{
     const q=document.getElementById('qB'),g=document.getElementById('gB'),c=document.getElementById('cB');
     const sels=o.map(x=>({o:x,el:document.getElementById(x.id+'B')}));
     const run=()=>{ const t=(q.value||'').toLowerCase();
       let r=D.badges.filter(x=>!t||JSON.stringify(x).toLowerCase().includes(t));
       sels.forEach(({o,el})=>{ if(el.value) r=r.filter(x=>o.get(x)===el.value); });
       const cats={}; r.forEach(b=>(cats[b.category||'\u2014']=cats[b.category||'\u2014']||[]).push(b));
       g.innerHTML = r.length ? Object.entries(cats).map(([k,bs])=>
         '<div class="spec-block"><div class="spec-head"><h2>'+esc(k)+'</h2><span class="cls">'+bs.length+'</span></div>'+
         '<div class="grid">'+bs.map(RENDER.badge).join('')+'</div></div>').join('')
         : '<div class="empty">nothing matches</div>';
       c.textContent=r.length+' of '+D.badges.length; };
     q.oninput=run; sels.forEach(({el})=>el.onchange=run); run(); },0);
   const kc={}; D.badges.forEach(b=>kc[kindOf(b)]=(kc[kindOf(b)]||0)+1);
   return '<div class="stats">'+Object.entries(kc).map(([k,v])=>
       '<div class="stat"><div class="v">'+v+'</div><div class="l">'+k+'</div></div>').join('')+
     '<div class="stat"><div class="v">'+D.badges.length+'</div><div class="l">total</div></div></div>'+
     filterBar('B',o).replace('<div class="grid"','<div'); }},
 {id:'classes',label:'Classes + Stats',n:D.classes.length,render(){
   const cards=D.classes.map(c=>{
     const sp=D.specialties.filter(s=>s.class===c.id);
     const pw=D.powers.filter(p=>p.class===c.id);
     const bd=D.badges.filter(b=>b.rarity===c.name.toLowerCase());
     return '<div class="cls-card"><h3>'+esc(c.name)+'</h3>'+
       '<div class="meta">'+(c.primary.length?c.primary.map(s=>'<span class="pill cls">'+esc(s)+'</span>').join(''):'<span class="pill">no primaries</span>')+'</div>'+
       '<div class="intent">'+esc(c.intent)+'</div>'+
       '<div class="mods"><span class="mod p">'+sp.length+' specialties</span><span class="mod p">'+pw.length+' powers</span>'+
       (bd.length?'<span class="mod p">'+bd.length+' class badges</span>':'')+'</div>'+
       '<div class="desc" style="color:var(--dim);font-size:12px">level table: '+esc(c.levelTable)+'</div>'+
       '<div class="id">'+esc(c.id)+'</div></div>';
   }).join('');
   const maxv=Math.max(...D.stats.map(s=>s.value||0));
   const rows=D.stats.map(s=>'<tr><td style="color:#f0e6d2;white-space:nowrap">'+esc(s.name)+'</td>'+
     '<td>'+esc(s.does)+'</td>'+
     '<td style="white-space:nowrap">'+(s.value==null?'<span style="color:var(--dim)">not on the ladder</span>'
       :'<b style="color:var(--gold)">'+s.value.toFixed(2)+'</b> <span class="statbar" style="width:'+Math.round((s.value/maxv)*70)+'px"></span>')+'</td>'+
     '<td style="color:var(--info);font-style:italic">'+esc(s.note||'')+'</td></tr>').join('');
   return '<h2 style="color:var(--gold);font-size:16px;margin-top:4px">The seven classes</h2>'+
     '<div class="grid">'+cards+'</div>'+
     '<h2 style="color:var(--gold);font-size:16px;margin-top:26px">The stat ladder</h2>'+
     '<div class="intent" style="margin-bottom:8px">Strength and Precision are 1.0 \u2014 the unit everything else is priced against. Off-primary, a stat is worth far less to a class that does not use it, and has to be doubled to matter.</div>'+
     '<div class="md"><table><tr><th>Stat</th><th>What it does</th><th>Value</th><th>Note</th></tr>'+rows+'</table></div>'; }},
 {id:'heroes',label:'Heroes',n:D.heroes.heroes.length,render(){
   const H=D.heroes, LV=D.levels;
   const ORDER=['strength','precision','accuracy','crit','luck','reach','dodge','vision','armor',
     'resist','health','magic','spirit','toughness','movement','staminaMax','staminaRegen','surge','itemSlots'];
   const SHORT={strength:'Str',precision:'Prec',accuracy:'Acc',crit:'Crit',luck:'Luck',reach:'Reach',
     dodge:'Dodge',vision:'Vision',armor:'Armor',resist:'Resist',health:'Health',magic:'Magic',
     spirit:'Spirit',toughness:'Tough',movement:'Move',staminaMax:'Stam',staminaRegen:'Regen',
     surge:'Surge',itemSlots:'Slots'};
   const tableFor=c=>(LV.classes.find(x=>x.id===c)||null);
   // ported + derived baseline + every level row from 2 up to the chosen level
   function statsAt(h,L){
     const v={},src={};
     for(const [k,n] of Object.entries(h.derivedBase||{})){ v[k]=n; src[k]='derived'; }
     for(const [k,n] of Object.entries(h.ported||{})){ v[k]=n; src[k]='ported'; }
     const t=tableFor(h.class); let gained=0;
     if(t) for(const r of t.rows){ if(r.level<2||r.level>L) continue;
       for(const [k,n] of Object.entries(r.grants||{})){ v[k]=(v[k]||0)+n; src[k]='fromlevel'; gained++; }
       for(const [k,n] of Object.entries(t.freebie||{})){ v[k]=(v[k]||0)+n; src[k]='fromlevel'; gained++; } }
     v.surge=L; src.surge='derived';
     for(const k of ORDER) if(v[k]==null){ v[k]=0; src[k]=src[k]||'derived'; }
     return {v,src,gained,hasTable:!!t};
   }
   const card=(h,L)=>{
     const {v,src,hasTable}=statsAt(h,L);
     const db=20+5*(v.toughness||0);
     const key=ART_OF[h.id];
     return '<div class="hero">'+
       (key?'<div class="hero-artbox" data-a="'+key+'"><img class="hero-art" data-a="'+key+'" alt="'+esc(h.name)+'" loading="lazy"></div>'
           :'<div class="noart">no art matched</div>')+
       '<div class="hero-h"><h3>'+esc(h.name)+
       (h.variantsOf>1?'<span class="vchip">'+h.variant+' of '+h.variantsOf+'</span>':'')+
       '</h3><div class="sub">'+
       esc(h.sourceClass)+(h.class?'':' <span style="color:#ef9a9a">· no HoBaT class</span>')+
       (h.tier!=null?' · T'+h.tier:'')+(h.campaign&&h.campaign!==h.path?' · '+esc(h.campaign):'')+' · '+esc(h.path)+
       (h.gender?' · '+esc(h.gender):'')+'</div></div><div class="hero-b">'+
       '<div class="sblock">'+ORDER.map(k=>'<div class="s '+src[k]+(v[k]?'':' zero')+'">'+
         '<div class="sv">'+v[k]+'</div><div class="sl">'+SHORT[k]+'</div></div>').join('')+'</div>'+
       '<div style="font-size:11px;color:var(--dim)">Deathbed Fighting <b style="color:var(--gold)">'+db+
       '</b> <span style="opacity:.7">(20 + 5 x Toughness)</span>'+
       (hasTable?'':' &middot; <span style="color:#ef9a9a">no level table — nothing scales</span>')+'</div>'+
       (h.damageType?'<div style="margin-top:5px"><span class="pill">'+esc(h.damageType)+' damage</span></div>':'')+
       (h.templateName&&h.variantsOf>1?'<div class="trig"><b>template</b> '+esc(h.templateName)+' &middot; shared with '+(h.variantsOf-1)+' other'+(h.variantsOf===2?'':'s')+'</div>':'')+
       (h.specialty?'<div class="trig"><b>specialty</b> '+esc(h.specialty.name)+'</div>':'')+
       ((h.namedSpecials||[]).length?'<div class="trig">'+h.namedSpecials.map(n=>'<b>'+esc(n.name)+'</b> '+esc(n.description||'')).join('<br>')+'</div>':'')+
       ((h.originBadges||[]).length?'<div class="tags">'+h.originBadges.map(b=>'<span class="tag">'+esc(b)+'</span>').join('')+'</div>':'')+
       (h.passiveDescription?'<div class="desc" style="font-size:11.5px;margin-top:5px">'+esc(h.passiveDescription)+'</div>':'')+
       (h.quote?'<div class="intent" style="font-size:11.5px;margin-top:5px">&ldquo;'+esc(h.quote)+'&rdquo;</div>':'')+
       (h.notes||[]).map(n=>'<div class="hnote'+(/DROPPED|SAMPLE|no HoBaT/.test(n)?' warn':'')+'">'+esc(n)+'</div>').join('')+
       '<div class="id">'+esc(h.id)+(h.art?' &middot; art: '+esc(h.art):'')+'</div></div></div>';
   };
   const opts=[
     {id:'hp',label:'All paths',values:uniq(H.heroes,h=>h.path),get:h=>h.path},
     {id:'hc',label:'All classes',values:uniq(H.heroes,h=>h.sourceClass),get:h=>h.sourceClass},
     {id:'ht',label:'All tiers',values:uniq(H.heroes,h=>h.tier!=null?'T'+h.tier:''),get:h=>h.tier!=null?'T'+h.tier:''},
     {id:'hm',label:'All campaigns',values:uniq(H.heroes,h=>h.campaign),get:h=>h.campaign},
     {id:'hg',label:'All templates',values:uniq(H.heroes,h=>h.templateName),get:h=>h.templateName}];
   setTimeout(()=>{
     const q=document.getElementById('qH'),g=document.getElementById('gH'),c=document.getElementById('cH'),
           lv=document.getElementById('lvH'),lvn=document.getElementById('lvnH');
     const sels=opts.map(o=>({o,el:document.getElementById(o.id+'H')}));
     const run=()=>{ const t=(q.value||'').toLowerCase(), L=+lv.value; lvn.textContent=L;
       let r=H.heroes.filter(h=>!t||JSON.stringify(h).toLowerCase().includes(t));
       sels.forEach(({o,el})=>{ if(el.value) r=r.filter(h=>o.get(h)===el.value); });
       g.innerHTML=r.length?r.map(h=>card(h,L)).join(''):'<div class="empty">nothing matches</div>';
       paintArt(g);
       c.textContent=r.length+' of '+H.heroes.length+' at level '+L; };
     q.oninput=run; lv.oninput=run; sels.forEach(({el})=>el.onchange=run); run(); },0);
   const pathRows=H.paths.map(p=>'<tr><td><b>'+esc(p.path)+'</b></td><td><code>'+esc(p.file)+'</code></td>'+
     '<td>'+H.heroes.filter(h=>h.path===p.path).length+'</td><td>'+esc(p.note)+'</td></tr>').join('');
   const derivRows=Object.entries(H.derivation).map(([k,v])=>
     '<tr><td style="white-space:nowrap;color:#f0e6d2">'+esc(SHORT[k]||k)+'</td><td>'+esc(v)+'</td></tr>').join('');
   const unmapped=H.heroes.filter(h=>!h.class);
   const tmpl=new Set(H.heroes.filter(h=>h.templateId).map(h=>h.templateId));
   const shared={}; H.heroes.forEach(h=>{ if(h.art) (shared[h.art]=shared[h.art]||[]).push(h); });
   const dupArt=Object.entries(shared).filter(([,v])=>v.length>1);
   return '<div class="rulebox" style="border-left-color:#9ecbff"><b>One piece of art, one unique hero</b><div>'+esc(H.rule||'')+'</div></div>'+
     '<div class="stats"><div class="stat"><div class="v">'+H.heroes.length+'</div><div class="l">heroes</div></div>'+
     '<div class="stat"><div class="v">'+tmpl.size+'</div><div class="l">generative templates</div></div>'+
     '<div class="stat"><div class="v">'+H.heroes.filter(h=>h.path==='fixed').length+'</div><div class="l">named cast</div></div>'+
     '<div class="stat"><div class="v">'+new Set(H.heroes.map(h=>h.art)).size+'</div><div class="l">distinct art files</div></div></div>'+
     '<div class="rulebox"><b>Where these come from</b><div>Hell-TCG defines heroes in five different places and they do not agree with each other. All five are pulled in mechanically here — nothing was retyped.</div></div>'+
     (dupArt.length?'<div class="rulebox" style="border-left-color:#c98a2a"><b>'+dupArt.length+' pieces of art are claimed twice</b><div>'+
       dupArt.map(([f,v])=>'<code>'+esc(f.split('/').pop())+'</code> &mdash; '+v.map(x=>esc(x.name)+' ('+esc(x.path)+')').join(' and ')).join('<br>')+
       '<br>These are not variants of each other: hell-tcg defines the same character once in <code>heroData.js</code> as a fixed hero and again in <code>skyshipHeroes.js</code> as a generative subtype. One of the two is redundant and it is not mine to say which.</div></div>':'')+
     '<div class="md"><table><tr><th>Path</th><th>Source</th><th>Rows</th><th>Note</th></tr>'+pathRows+'</table></div>'+
     (unmapped.length?'<div class="rulebox" style="border-left-color:#ef5350"><b>'+unmapped.length+' heroes have no HoBaT class</b><div>'+
       unmapped.map(h=>esc(h.name)+' ('+esc(h.sourceClass)+')').join(' &middot; ')+
       ' — Beast and Spirit are hell-tcg classes with no counterpart in the seven. Not guessed at; left blank so the decision stays yours.</div></div>':'')+
     '<div class="rulebox"><b>The eleven stats that ported, and the one that did not</b><div>'+
       Object.entries(H.portMap).map(([a,b])=>esc(a)+' &rarr; '+esc(SHORT[b]||b)).join(' &middot; ')+
       ' &middot; dodge &rarr; Dodge (scaled &times;'+H.dodgeScale+') &middot; <span style="color:#ef9a9a">resolute &rarr; nothing, the stat was deleted</span></div></div>'+
     '<div class="rulebox"><b>How the missing stats were derived</b><div style="margin-top:5px">'+
       '<table style="width:100%;border-collapse:collapse;font-size:12px">'+derivRows+'</table></div></div>'+
     '<div class="legend"><b><span class="sw p"></span>ported from hell-tcg</b>'+
       '<b><span class="sw d"></span>derived — no source data</b>'+
       '<b><span class="sw l"></span>added by the class level table</b></div>'+
     '<div class="bar"><input id="qH" placeholder="search name, badge, quote, id…">'+
       opts.map(o=>'<select id="'+o.id+'H"><option value="">'+o.label+'</option>'+
         o.values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select>').join('')+
       '<span class="lvlpick">Level <input type="range" id="lvH" min="1" max="10" value="1"><b id="lvnH">1</b></span>'+
       '<span class="count" id="cH"></span></div><div class="hgrid" id="gH"></div>'; }},
 {id:'levels',label:'Level Tables',n:(D.levels&&D.levels.classes?D.levels.classes.length:0),render(){
   const L=D.levels, BIG=new Set(['armor','resist','magic','spirit']),
         OFF=new Set([]),
         V={strength:1,precision:1,accuracy:.2,crit:.2,luck:.2,reach:.5,dodge:.3,vision:.2,
            armor:2,resist:2,health:.5,magic:1.5,spirit:1.5,itemSlots:.67,deathbedFighting:.1,
            movement:.7,staminaMax:.3,staminaRegen:2,surge:.15,toughness:.4};
   const nice=k=>k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
   const price=g=>Object.entries(g||{}).reduce((n,[k,v])=>n+(OFF.has(k)?0:(V[k]||0)*v),0);
   const gp=(k,v)=>'<span class="g '+(OFF.has(k)?'off':BIG.has(k)?'big':'')+'">+'+v+' '+esc(nice(k))+'</span>';
   const srcCls=s=>/DICTATED.*AUTHORED/.test(s)?'mixed':/DICTATED/.test(s)?'':'auth';
   const body=cls=>{
     let cum={},tot=0;
     const rows=cls.rows.map(r=>{
       const best=r.choice?Math.max(...r.choice.options.map(price)):0;
       tot+=price(r.grants)+best;
       for(const [k,v] of Object.entries(r.grants||{})) cum[k]=(cum[k]||0)+v;
       const gs=Object.entries(r.grants||{}).map(([k,v])=>gp(k,v)).join('');
       const ch=r.choice?'<div style="margin-top:5px"><span style="color:var(--acc);font-size:11px;text-transform:uppercase;letter-spacing:.4px">choose one</span><br>'+
         r.choice.options.map(o=>'<span class="opt">'+Object.entries(o).map(([k,v])=>'+'+v+' '+nice(k)).join(', ')+'</span>').join('')+'</div>':'';
       return '<div class="lvl'+(r.specialty?' spec':'')+(r.choice?' choice':'')+'">'+
         '<div class="lvl-n">'+r.level+(r.level>1?'<small>'+(price(r.grants)+best).toFixed(1)+'</small>':'')+'</div>'+
         '<div class="lvl-b">'+(r.specialty?'<div style="color:var(--gold);font-size:12px;font-weight:bold;margin-bottom:4px">CHOOSE YOUR SPECIALTY</div>':'')+
         (gs||(r.level===1?'<span style="color:var(--dim);font-size:12px">the starting line \u2014 no level-up happens here</span>':''))+ch+
         (r.note?'<div class="lvl-note">'+esc(r.note)+'</div>':'')+
         (r.authored?'<div class="lvl-note" style="color:#ce93d8">authored \u2014 not dictated</div>':'')+'</div></div>';
     }).join('');
     const sm=cum.staminaMax||0, sr=cum.staminaRegen||0, tg=cum.toughness||0;
     const cumline=Object.entries(cum).filter(([k])=>!OFF.has(k))
       .sort((a,b)=>(V[b[0]]||0)*b[1]-(V[a[0]]||0)*a[1]).map(([k,v])=>gp(k,v)).join('');
     return '<div class="spec-block"><div class="spec-head"><h2>'+esc(cls.name)+
       '</h2><span class="srcpill '+srcCls(cls.source)+'">'+esc(cls.source)+'</span>'+
       '<span class="cls">ladder total '+tot.toFixed(1)+'</span></div>'+
       (cls.freebie?'<div class="rulebox"><b>Per-level freebie</b><div>'+
         Object.entries(cls.freebie).map(([k,v])=>'+'+v+' '+nice(k)).join(', ')+' at every level, in addition to what each row lists.</div></div>':'')+
       '<div class="intent" style="margin-bottom:8px">'+esc(cls.note)+'</div>'+
       '<div class="lvl-tbl">'+rows+'</div>'+
       '<div class="rulebox"><b>Where it lands at level 10</b><div style="margin-top:5px">'+cumline+
       '<br><span class="g off">+'+sm+' Stamina Max</span><span class="g off">+'+sr+' Stamina Regen</span>'+
       (tg?'<span class="g off">+'+tg+' Toughness</span>':'')+
       '<div style="color:var(--dim);font-size:11.5px;margin-top:6px">Before the level-5 pick, and before any badge, origin, item or specialty.</div></div></div></div>';
   };
   setTimeout(()=>{
     const f=document.getElementById('fL'), g=document.getElementById('gL'), c=document.getElementById('cL');
     const run=()=>{ const r=L.classes.filter(x=>!f.value||x.name===f.value);
       g.innerHTML=r.map(body).join(''); c.textContent=r.length+' of '+L.classes.length; };
     f.onchange=run; run(); },0);
   const ruleboxes=Object.entries(L.rules).filter(([k])=>k!=='cap')
     .map(([k,v])=>'<div class="rulebox"><b>'+esc(nice(k))+'</b><div>'+esc(v)+'</div></div>').join('');
   return '<div class="bar"><select id="fL"><option value="">All seven classes</option>'+
     L.classes.map(c=>'<option>'+esc(c.name)+'</option>').join('')+'</select>'+
     '<span class="count" id="cL"></span></div>'+ruleboxes+'<div id="gL" style="margin-top:16px"></div>'; }},
 {id:'art',label:'Hero Art',n:null,render(){
   const A=D.art; const total=A.sets.reduce((n,s)=>n+s.total,0);
   const sets=A.sets.map(s=>{
     const lv=s.level>1?A.levelBands:['all levels'];
     return '<div class="artset"><h3 style="margin:0;color:var(--gold);font-size:15px">'+esc(s.set)+
       '</h3><div class="meta">'+s.level+' level \u00d7 '+s.status+' status &middot; <b style="color:var(--gold)">'+s.total+' assets</b></div>'+
       '<div class="artgrid">'+lv.map(b=>'<div class="artcell">'+esc(b)+'</div>').join('')+
       A.statuses.map(st=>'<div class="artcell st">'+esc(st)+'</div>').join('')+'</div></div>';
   }).join('');
   return '<div class="stats"><div class="stat"><div class="v">'+total+'</div><div class="l">assets per template</div></div>'+
     '<div class="stat"><div class="v">'+A.sets.length+'</div><div class="l">art sets</div></div>'+
     '<div class="stat"><div class="v">'+A.levelBands.length+'</div><div class="l">level bands</div></div>'+
     '<div class="stat"><div class="v">'+A.statuses.length+'</div><div class="l">statuses</div></div></div>'+
     '<div class="intent">'+esc(A.note)+'</div>'+sets+
     '<div class="artset" style="border-color:var(--gold)"><b style="color:var(--gold)">The override rule</b><div class="desc" style="margin-top:4px">'+esc(A.rule)+'</div></div>'; }},
 {id:'functions',label:'Functions',n:null,render(){
   const F=D.functions; if(!F) return '<div class="empty">run functions.mjs</div>';
   const NOTE=F.hookNotes||{};
   const table=(title,blurb,rows,notes)=>{
     const max=Math.max(...rows.map(r=>r.uses),1);
     return '<div class="spec-block"><div class="spec-head"><h2>'+esc(title)+'</h2>'+
       '<span class="cls">'+rows.length+' in the vocabulary</span></div>'+
       (blurb?'<div class="intent" style="margin-bottom:8px">'+blurb+'</div>':'')+
       '<div class="md"><table><tr><th>Function</th><th style="width:74px">Uses</th><th>What it means</th></tr>'+
       rows.map(r=>'<tr><td><code>'+esc(r.name)+'</code></td>'+
         '<td><b style="color:'+(r.uses===1?'var(--neg)':'var(--gold)')+'">'+r.uses+'</b> '+
         '<span class="statbar" style="width:'+Math.max(2,Math.round(r.uses/max*54))+'px"></span></td>'+
         '<td style="color:var(--dim)">'+esc((notes&&notes[r.name])||'')+
         (r.uses===1?' <b style="color:var(--neg)">used once</b>':'')+'</td></tr>').join('')+
       '</table></div></div>'; };
   return '<div class="rulebox" style="border-left-color:#9ecbff"><b>The complete vocabulary</b><div>'+
     'Everything content is allowed to say. If a rule needs something that is not on one of these lists, '+
     'it is a NEW MECHANIC and has to be built before anything is authored against it. The counts are how '+
     'many entries use each one — a <b style="color:var(--neg)">1</b> is a candidate for cutting, because '+
     'it is a rule the player learns for exactly one card.</div></div>'+
     table('1 · Trigger hooks','When a rule fires. <code>aura</code> and <code>passive</code> are standing properties rather than events: an aura has a radius and is checked continuously, a passive has no radius and is simply always true about you.',F.hooks,NOTE)+
     table('2 · Targeting shapes','<b>N</b> stands in for the radius. Nothing outside this list is legal and the wording is locked — this field used to be free prose with 18 ways of writing <i>one ally</i>.',F.shapes)+
     table('3 · Conditions','<b>Three.</b> A condition GATES an effect. A targeting shape that names adjacency is not a condition, and there is deliberately no <i>the attack killed</i> condition — that is the <code>onKill</code> HOOK. What a rule may ask: what the thing you hit IS, what it is CARRYING, and whether you are in stealth. That is the whole list.',F.conditions)+
     table('4 · Effects','What a rule may DO.',F.effects)+
     table('5 · Statuses',null,F.statuses)+
     table('6 · Stats a modifier may name',null,F.stats)+
     table('7 · Durations','A stat modifier lasts the rest of the Battle unless the row says otherwise.',F.durations)+
     '<div class="spec-block"><div class="spec-head"><h2>What is explicitly NOT available</h2>'+
     '<span class="cls">'+F.notAvailable.length+' cut, and audit.mjs fails on each</span></div>'+
     '<div class="grid">'+F.notAvailable.map(([k,v])=>
       '<div class="card" style="border-color:#7a3a38"><h3 style="color:#efb0ae">'+esc(k)+'</h3>'+
       '<div class="desc">'+esc(v)+'</div></div>').join('')+'</div></div>'; }},
 {id:'tags',label:'Tags',n:D.tags.length,render(){
   const g={}; D.tags.forEach(t=>(g[t.group]=g[t.group]||[]).push(t));
   return Object.entries(g).map(([grp,ts])=>'<div class="spec-block"><div class="spec-head"><h2>'+grp+'</h2>'+
     '<span class="cls">'+ts.length+(grp==='creature'?' &middot; visible to the player':' &middot; invisible')+'</span></div>'+
     '<div>'+ts.map(t=>'<span class="'+tagCls(t.id)+'" style="font-size:12px;padding:3px 10px;margin:3px">'+esc(t.id.replace('tag.',''))+'</span>').join('')+'</div></div>').join(''); }},
 {id:'bestiary',label:'Test Bestiary',n:(D.bestiaryTest?D.bestiaryTest.units.length:0),render(){
   if(!D.bestiaryTest) return '<div class="spec-block">No test bestiary in this build.</div>';
   const B=D.bestiaryTest;
   const S=u=>u.stats;
   const sel=t=>typeof t.select==='string' ? t.select
     : 'area &middot; '+t.select.side+(t.select.radius===undefined?' &middot; unbounded':' &middot; r'+t.select.radius)
       +(t.select.origin?' &middot; from '+t.select.origin:'')
       +(t.select.requireTags?' &middot; only ['+t.select.requireTags.join(' ')+']':'');
   const eff=e=>e.kind==='damage'
     ? 'deal '+(typeof e.amount==='object'?JSON.stringify(e.amount):e.amount)+' '+e.damageType
     : e.kind==='status.remove' ? 'remove '+e.statusId.replace('status.','')
     : 'apply '+(typeof e.value==='object'?JSON.stringify(e.value):e.value)+' '+e.statusId.replace('status.','');
   let h='<div class="spec-block"><div class="spec-head"><h2>Throwaway by design</h2>'+
     '<span class="cls">'+B.units.length+' runnable &middot; '+B.blocked.length+' blocked</span></div>'+
     '<p>'+esc(B.note)+'</p></div>';
   h+=B.units.map(u=>'<div class="card"><div class="cardhead"><b>'+esc(u.name)+'</b>'+
     '<span class="shape">'+esc(u.role)+' &middot; '+esc(u.ai)+' &middot; art: '+esc(u.art)+'</span></div>'+
     '<div class="s fromlevel" style="margin:6px 0">'+
       ['maxHp','armor','resist','accuracy','dodge','strength','precision','magic','movement','reach']
         .filter(k=>S(u)[k]).map(k=>'<span class="tag" style="margin:2px">'+k+' '+S(u)[k]+'</span>').join('')+
       (u.tags||[]).map(t=>'<span class="tag creature" style="margin:2px">'+esc(t)+'</span>').join('')+
     '</div>'+
     '<div style="font-size:13px;opacity:.85;margin:4px 0"><b>Tests:</b> '+esc(u.tests)+'</div>'+
     (u.triggers||[]).map(t=>'<div class="shape">['+esc(t.hook)+'] '+t.chance+'% &rarr; '+
        esc(sel(t))+' &rarr; '+esc(eff(t.effect))+'</div>').join('')+
     '<div class="shape" style="opacity:.6">'+esc(u.id)+'</div></div>').join('');
   h+='<div class="spec-block"><div class="spec-head"><h2>Blocked on engine work</h2>'+
     '<span class="cls">'+B.blocked.length+'</span></div>'+
     B.blocked.map(b=>'<div class="card"><b>'+esc(b.name)+'</b>'+
       '<div class="shape">needs: '+esc(b.needs)+'</div>'+
       '<div style="font-size:13px;opacity:.85;margin-top:4px">'+esc(b.why)+'</div></div>').join('')+'</div>';
   return h; }},
 {id:'guide',label:'Authoring Guide',n:null,render(){
   let h=esc(GUIDE_MD);
   h=h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>');
   h=h.replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>');
   h=h.replace(/\x60\x60\x60([\s\S]*?)\x60\x60\x60/g,(m,c)=>'<pre>'+c+'</pre>');
   h=h.replace(/\x60([^\x60\n]+)\x60/g,'<code>$1</code>');
   h=h.replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/\*([^*\n]+)\*/g,'<i>$1</i>');
   const lines=h.split('\n'); let o=[],tbl=null;
   for(const L of lines){
     if(/^\|/.test(L)){ const cells=L.split('|').slice(1,-1);
       if(/^[\s:|-]+$/.test(L)){continue;}
       if(!tbl){tbl=1;o.push('<table><tr>'+cells.map(c=>'<th>'+c.trim()+'</th>').join('')+'</tr>');}
       else o.push('<tr>'+cells.map(c=>'<td>'+c.trim()+'</td>').join('')+'</tr>');
     } else { if(tbl){o.push('</table>');tbl=null;} o.push(L); }
   }
   if(tbl)o.push('</table>');
   return '<div class="md">'+o.join('\n').replace(/\n\n+/g,'<br><br>')+'</div>'; }}
];

const nav=document.getElementById('tabs'), main=document.getElementById('main');
function show(id){ const t=TABS.find(x=>x.id===id);
  [...nav.children].forEach(b=>b.classList.toggle('active',b.dataset.id===id));
  main.innerHTML=t.render(); location.hash=id; }
nav.innerHTML=TABS.map(t=>'<button class="tab" data-id="'+t.id+'">'+t.label+(t.n!=null?'<span class="n">'+t.n+'</span>':'')+'</button>').join('');
[...nav.children].forEach(b=>b.onclick=()=>show(b.dataset.id));
show(TABS.find(t=>t.id===location.hash.slice(1))?location.hash.slice(1):'overview');
</script></body></html>`;
fs.writeFileSync('hbt-codex.html', html);
console.log('hbt-codex.html', fs.statSync('hbt-codex.html').size, 'bytes');
