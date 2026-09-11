// verify-codex.mjs — is hbt-codex.html actually current, and does every tab render?
// Run AFTER: node functions.mjs && node assemble.mjs && node build-viewer.mjs
//
// Three questions, because "it built" answers none of them:
//   1. Is the HTML newer than every source that feeds it?
//   2. Does every tab render, with no page errors?
//   3. Do the rulings actually appear in the rendered text — and are the cut ones gone?
//
// NOTE ON READING THE PAGE: use document.body.textContent, NOT innerText. innerText
// returns only the VISIBLE tab, so a naive check reads one pane of twenty and reports
// sixteen false failures. Ask me how I know.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'node:url';
// Was hardcoded to /tmp/node_modules in the authoring sandbox, which does not exist on any
// other machine. Resolve normally, and say so plainly when playwright is not installed.
let chromium;
try {
  const requested = process.env.PLAYWRIGHT || 'playwright';
  const module = await import(path.isAbsolute(requested) ? pathToFileURL(requested).href : requested);
  chromium = module.chromium ?? module.default?.chromium;
  if (!chromium) throw new Error('Playwright module has no chromium export');
}
catch { console.error("verify-codex needs playwright:  npm i -D playwright && npx playwright install chromium\n(or PLAYWRIGHT=/path/to/playwright/index.mjs node verify-codex.mjs)"); process.exit(2); }

const HTML='hbt-codex.html';
let fails=0; const bad=m=>{console.log('  FAIL  '+m);fails++;};
const ok=m=>console.log('  ok    '+m);

// ---- 1. staleness -----------------------------------------------------------
const htmlAge=fs.statSync(HTML).mtimeMs;
// Only files the HTML actually EMBEDS or is BUILT FROM. LEVEL-TABLES.md and FUNCTIONS.md
// are companion docs written alongside it, not inputs — listing them made a fresh codex
// report as stale purely because mklevelsmd.mjs happened to run last.
const srcs=[...fs.readdirSync('gen').filter(f=>f.endsWith('.json')).map(f=>'gen/'+f),
            'settled.json','AUTHORING-GUIDE.md',
            'build-viewer.mjs','assemble.mjs','functions.mjs','hbt-content.json'].filter(f=>fs.existsSync(f));
const stale=srcs.filter(f=>fs.statSync(f).mtimeMs>htmlAge);
console.log('\n1 · FRESHNESS');
if(stale.length) bad('codex is older than: '+stale.join(', ')+'  — rerun the build order in README.md');
else ok(HTML+' is newer than all '+srcs.length+' sources');

// ---- 2 + 3. render every tab, then read the WHOLE document ------------------
const b = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
  : await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' })).catch(() => chromium.launch({ channel: 'msedge' }));
const p=await b.newPage(); const errs=[];
p.on('pageerror',e=>errs.push(String(e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(pathToFileURL(path.resolve(HTML)).href,{waitUntil:'load'});
const tabs=await p.$$('.tab,[data-tab],nav button');
let all='';
for(const t of tabs){ await t.click(); await p.waitForTimeout(50);
  all+='\n'+await p.evaluate(()=>document.body.textContent); }
console.log('\n2 · RENDER');
if(!tabs.length) bad('no tabs found at all');
else ok(tabs.length+' tabs clicked and read');
if(errs.length){ bad(errs.length+' page errors'); errs.slice(0,5).forEach(e=>console.log('        '+e)); }
else ok('0 page errors');

// ---- 3. the rulings ---------------------------------------------------------
// PRESENT: a ruling that must be visible somewhere in the Codex.
// ABSENT:  a phrase that must not appear in any LIVE RULE. It is allowed to survive in
//          a `source` note (that is the history) or in the Authoring Guide (which quotes
//          the bad wording on purpose), so ABSENT is checked against the DATA, not the page.
const PRESENT=[
 // Sept 2 ruling replaced the old wording; assert replacement and its exception.
 ['ground-layer rule',            'A hex carries at most one status'],
 ['ground replacement',           'applying a new one removes and replaces whatever was there'],
 ['ground cancellation exception','Burn and Frost, which cancel one for one instead of replacing'],
 ['summon-order rule',            'summon number when it arrives'],
 ['Spirit Link is Protection',    'each gain 3 Protection'],
 ['Uncorrupted flat cost',        'You gain 5 Burn'],
 ['Oblation flat cost',           'take 4 true damage'],
 ['ground: become burning',       'seven hexes become burning'],
 ['ground: become frost',         'become frost'],
 ['ground: become poisoned',      'become poisoned'],
 ['Slow is in use',               'gains 1 Slow'],
 ['rename: Red Harvest',          'Red Harvest'],
 ['rename: Range Finder',         'Range Finder'],
 ['rename: The Verdict',          'The Verdict'],
 ['rename: Stagger',              'Stagger'],
 ['Shadow Step retargeted',       'Move up to 6 hexes and gain +10 Dodge'],
 ['Magical Friend is a summon',   'summoned ally with its own stat block'],
 ['guide: Toughness',             'Toughness does not reduce damage'],
 ['guide: a cost is a number',    'A cost is a number, not a formula'],
 ['guide: ground layers',         'Ground layers are persistent'],
];
const ABSENT=[
 ['ground layer with a number',   'burning 2 for two Turns'],
 ['ground layer with a clock',    'for two Turns'],
 ['Bear Form as a power',         'Bear Form'],
 ['terrain-gated targeting',      'any hex of darkness'],
 ['stacking limit',               'stacks up to three times'],
 ['stacking limit',               'may stack to +2'],
 ['cost scaled by a count',       'for each ally you healed'],
 ['cost scaled by a count',       'for each stack removed'],
 ['lowercase status',             'gain 2 protection'],
 ['lowercase status',             'apply weak 4'],
 ['one-Turn Movement loss',       'loses 1 Movement on its next Turn'],
 ['restated universal floor',     'to a floor of 0'],
 ['short-form duration',          'gains +1 Armor for the Battle'],
];
console.log('\n3 · RULINGS PRESENT');
for(const [label,needle] of PRESENT) all.includes(needle)?ok(label):bad(label+'  -> "'+needle+'"');

const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const entries=[...D.items,...D.enchants,...D.specialties,...D.attacks,...D.powers];
const live=e=>[e.description,...(e.triggers||[]).map(g=>g.effect||g.description||'')].filter(Boolean).join(' | ');
console.log('\n4 · CUTS STAYED CUT  (live rules only — source notes and the guide may still quote them)');
for(const [label,needle] of ABSENT){
  const hits=entries.filter(e=>live(e).includes(needle));
  hits.length ? bad(label+': '+needle+'  -> '+hits.map(h=>h.id).join(' ')) : ok(label+': "'+needle+'"');
}
// every hero has a class — no outliers. Ruled 2026-08-20.
{ const un=D.heroes.heroes.filter(h=>!h.class);
  console.log('\n5 · NO CLASSLESS HEROES');
  un.length ? bad(un.length+' heroes with class:null -> '+un.map(h=>h.id).join(' ')) : ok('all '+D.heroes.heroes.length+' heroes have a class');
  const seen={}; for(const h of D.heroes.heroes) seen[h.class]=(seen[h.class]||0)+1;
  const known=new Set(D.classes.map(c=>c.id));
  const unknown=Object.keys(seen).filter(c=>!known.has(c));
  unknown.length ? bad('heroes point at classes that do not exist: '+unknown.join(' ')) : ok(D.classes.length+' classes, every hero pointing at a real one');
  const tiny=Object.entries(seen).filter(([,n])=>n<2);
  tiny.length ? bad('a class of one is an outlier: '+tiny.map(([c,n])=>c+'='+n).join(' ')) : ok('no class has fewer than 2 heroes');
  const noTable=D.classes.filter(c=>!D.levels.classes.find(x=>x.id===c.id));
  noTable.length ? bad('classes with no level table: '+noTable.map(c=>c.id).join(' ')) : ok('all '+D.classes.length+' classes have a level table');
}

await b.close();
console.log('\nVERIFY FAILURES: '+fails);
process.exit(fails?1:0);
