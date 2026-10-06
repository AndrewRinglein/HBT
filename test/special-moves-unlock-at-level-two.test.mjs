// engine rule.special-moves-unlock-at-level-two (2026-10-06). Ruled 2026-10-06 (engine DECISIONS.md 'a hero's special moves
// unlock at level 2, ruled: all of them, every hero, enemies and civilians unchanged, named on the level-up screen'): "the
// special moves that the starting heroes get should be unlocked instead at level 2". The level is on the GRANT, in the Codex:
// a movement power a class grants says `grantedAtLevel`, and a row that gets its movements by its class carries each one's
// level into the engine as `moveLevels`. A later special move names its own level with no code change; a level on a power no
// class grants, or one that is not a whole number of 2 or more, fails the build.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { copyRuntime } from './workspace.mjs';
const source=path.resolve(import.meta.dirname,'..');
function candidate(change){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-move-levels-')),work=path.join(root,'content');
 const live=path.resolve(source,'../engine/src/content/generated/pack.ts'),before=fs.readFileSync(live);
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});fs.mkdirSync(path.join(root,'engine/generated'),{recursive:true});fs.copyFileSync(path.join(source,'../engine/generated/vocabulary.json'),path.join(root,'engine/generated/vocabulary.json'));
  copyRuntime(source,work,['assemble.mjs','mkenginepack.mjs'],['hbt-content.json','settled.json']);
  for(const dir of ['gen','test'])fs.cpSync(path.join(source,dir),path.join(work,dir),{recursive:true,filter:p=>!fs.statSync(p).isFile()||p.endsWith('.json')});
  const edit=(file,fn)=>{const p=path.join(work,file),data=JSON.parse(fs.readFileSync(p,'utf8'));fn(data);fs.writeFileSync(p,JSON.stringify(data))};
  change(edit);
  const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});if(assembled.status!==0)return {...assembled,pack:null};
  const run=spawnSync(process.execPath,['mkenginepack.mjs'],{cwd:work,encoding:'utf8'}),file=path.join(root,'engine/src/content/generated/pack.ts');
  return {...run,pack:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,'')):null};
 }finally{
  assert.deepEqual(fs.readFileSync(live),before);
  fs.rmSync(root,{recursive:true,force:true});
 }
}
const live=candidate(()=>{});
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const SPECIAL={'class.warrior':'power.leap','class.ranger':'power.side-roll','class.rogue':'power.side-roll','class.mage':'power.focus','class.priest':'power.devotion','class.paladin':'power.sidestep'};
const classOf=r=>(r.tags||[]).find(t=>t.startsWith('class.'));
const power=(d,id)=>d.powers.find(p=>p.id===id);

test('the five movement powers a class grants say the level of the grant: 2; no other movement power says one',()=>{
 const withLevel=D.powers.filter(p=>p.grantedAtLevel!==undefined).map(p=>[p.id,p.grantedAtLevel,p.movementAction===true,(p.grantedToClasses||[]).length>0]).sort();
 assert.deepEqual(withLevel,[['power.devotion',2,true,true],['power.focus',2,true,true],['power.leap',2,true,true],['power.side-roll',2,true,true],['power.sidestep',2,true,true]]);
 // every class's bonus move is one of them: the Codex's class row and the power's grant say the same hero
 for(const c of D.classes.filter(c=>typeof c.bonusMove==='string'))assert.equal(power(D,c.bonusMove).grantedAtLevel,2,c.id);
});

test('the pack: every hero that gets its movements by its class carries the level of its special move; a civilian, an enemy and the test party carry none',()=>{
 assert.equal(live.status,0,live.stderr);
 const P=live.pack;
 const byClass=P.prologueParty.filter(r=>SPECIAL[classOf(r)]);
 assert.equal(byClass.length,24);
 for(const r of byClass){assert.deepEqual(r.moves,['power.move',SPECIAL[classOf(r)]],r.typeId);assert.deepEqual(r.moveLevels,{[SPECIAL[classOf(r)]]:2},r.typeId);}
 for(const r of [...P.prologueParty.filter(r=>classOf(r)==='class.civilian'),...P.enemies,...P.authoredEnemies,...P.heroes,...P.alphaTeam,...Object.values(P.test.units)])assert.equal(r.moveLevels,undefined,r.typeId);
});

test('a later special move names another level with no code change; a level on a power no class grants, or below 2, fails the build',()=>{
 const sett=(fn)=>candidate(edit=>edit('settled.json',d=>fn(d)));
 const later=sett(d=>{power(d,'power.leap').grantedAtLevel=4});
 assert.equal(later.status,0,later.stderr);
 assert.deepEqual(later.pack.prologueParty.find(r=>r.typeId==='hero.base.warrior-iron').moveLevels,{'power.leap':4});
 assert.deepEqual(later.pack.prologueParty.find(r=>r.typeId==='hero.base.priest-robes').moveLevels,{'power.devotion':2});
 const none=sett(d=>{delete power(d,'power.leap').grantedAtLevel});
 assert.equal(none.status,0,none.stderr);
 assert.equal(none.pack.prologueParty.find(r=>r.typeId==='hero.base.warrior-iron').moveLevels,undefined);          // from level 1, as it was
 const one=sett(d=>{power(d,'power.leap').grantedAtLevel=1});
 assert.notEqual(one.status,0);assert.match(one.stdout+one.stderr,/power\.leap grantedAtLevel is '1' — a whole number, 2 or more/);
 const stray=sett(d=>{power(d,'power.flight').grantedAtLevel=2});
 assert.notEqual(stray.status,0);assert.match(stray.stdout+stray.stderr,/power\.flight says grantedAtLevel and is not a movement power a class grants/);
});
