// engine content.impersonation-badge (2026-10-06). Ruled 2026-10-06 (Andrew, engine DECISIONS.md 'the one-use rules: most are
// cut or reworded onto rules the engine already has; a handful are built'): "Impersonation is something we want. However,
// this also needs the class power. I think it gives you a badge, so I think we turn this into a badge, and this class power
// gives that badge." badge.impersonation is a Codex row and a pack row; the Trickster's power grants it; the two things the
// badge does are named, each with whose it is, and built by nobody here.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { copyRuntime } from './workspace.mjs';
const source=path.resolve(import.meta.dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
const PACK=JSON.parse(fs.readFileSync(path.resolve(source,'../engine/src/content/generated/pack.ts'),'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,''));

test('badge.impersonation is a Codex row that says the two things, and whose each is',()=>{
 const row=D.badges.find(b=>b.id==='badge.impersonation');
 assert.equal(row.name,'Impersonation');
 assert.equal(row.payload,'satisfies every class restriction on the items carried · enemies choose targets as though this were a hero, not a civilian');
 assert.match(row.source,/the class restrictions are the kingdom's Equip/);
 assert.match(row.source,/how enemies choose targets waits on the design of the enemy's thinking/);
});

test('it is a pack row: no stat, no flag, and both of its lines named as unbuilt',()=>{
 const b=PACK.badges['badge.impersonation'];
 assert.deepEqual([b.name,b.statModifiers,b.grants,b.flags],['Impersonation',{},[],{}]);
 assert.deepEqual(b.gaps,['satisfies every class restriction on the items carried','enemies choose targets as though this were a hero','not a civilian']);
});

test('the Trickster\'s Impersonation grants it: the engine\'s badge.grant on the one who uses the power, and nothing left unread',()=>{
 const row=D.powers.find(p=>p.id==='power.trickster.impersonation');
 assert.equal(row.description,'Stance: gain badge.impersonation for the rest of the Battle.');assert.equal(row.targets,'self');
 const p=PACK.classPowers['power.trickster.impersonation'];
 assert.deepEqual(p.effects,[{kind:'badge.grant',badgeId:'badge.impersonation',who:'self'}]);
 assert.deepEqual(p.target,{select:'self',side:'any'});assert.equal(p.gaps,undefined);
 assert.ok(D.specialties.find(s=>s.id==='specialty.trickster').powers.includes('power.trickster.impersonation'));
});

test('a power may not grant a badge the Codex has no row for: the build fails and names it',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-impersonation-')),work=path.join(root,'content');
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});fs.mkdirSync(path.join(root,'engine/generated'),{recursive:true});
  fs.copyFileSync(path.join(source,'../engine/generated/vocabulary.json'),path.join(root,'engine/generated/vocabulary.json'));
  copyRuntime(source,work,['assemble.mjs','mkenginepack.mjs'],['hbt-content.json','settled.json']);
  for(const dir of ['gen','test'])fs.cpSync(path.join(source,dir),path.join(work,dir),{recursive:true,filter:p=>!fs.statSync(p).isFile()||p.endsWith('.json')});
  const file=path.join(work,'gen/civilian.json'),text=fs.readFileSync(file,'utf8');
  assert.ok(text.includes('Stance: gain badge.impersonation for the rest of the Battle.'));
  fs.writeFileSync(file,text.replace('Stance: gain badge.impersonation for the rest of the Battle.','Stance: gain badge.no-such-badge for the rest of the Battle.'));
  const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});
  assert.equal(assembled.status,0,assembled.stderr);
  const run=spawnSync(process.execPath,['mkenginepack.mjs'],{cwd:work,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/a class power grants 'badge\.no-such-badge', which is not a badge row of the Codex/);
 }finally{
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hobat-impersonation-'));
  fs.rmSync(root,{recursive:true,force:true});
 }
});
