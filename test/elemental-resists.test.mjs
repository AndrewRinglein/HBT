import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = path.resolve(import.meta.dirname, '..');
const livePack = path.resolve(source, '../engine/src/content/generated/pack.ts');
function candidate(change) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-elements-'));
  const work = path.join(root, 'content');
  const published = fs.readFileSync(livePack);
  try {
    fs.mkdirSync(work);
    fs.mkdirSync(path.join(root, 'engine/src/content/generated'), { recursive: true });
    for (const name of ['mkenginepack.mjs', 'map-schema.mjs', 'hbt-content.json', 'settled.json']) fs.copyFileSync(path.join(source, name), path.join(work, name));
    for (const name of ['gen', 'test']) fs.cpSync(path.join(source, name), path.join(work, name), { recursive: true, filter: p => !fs.statSync(p).isFile() || p.endsWith('.json') });
    const edit = (name, fn) => { const p = path.join(work, name); const row = JSON.parse(fs.readFileSync(p, 'utf8')); fn(row); fs.writeFileSync(p, JSON.stringify(row)); };
    change(edit);
    const run = spawnSync(process.execPath, ['mkenginepack.mjs'], { cwd: work, encoding: 'utf8' });
    const file = path.join(root, 'engine/src/content/generated/pack.ts');
    const pack = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/, '')) : null;
    return { ...run, pack };
  } finally {
    assert.deepEqual(fs.readFileSync(livePack), published, 'candidate compiler must never touch live pack');
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()), 'cleanup must remain inside owned temporary directory');
    assert.ok(path.basename(resolved).startsWith('hobat-elements-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}


for(const stat of ['fireResist','poisonResist','shadowResist'])test('compiler transports '+stat+' in real and TEST units and items',()=>{
 const run=candidate(edit=>{
  edit('gen/enemies-authored.json',rows=>{rows.units[0].stats[stat]=3});
  edit('settled.json',rows=>{rows.items.find(i=>i.id==='item.necklace-of-fire-immunity').statModifiers[stat]=2});
  edit('test/units.json',rows=>{rows[0].set={...rows[0].set,[stat]:4}});
 });
 assert.equal(run.status,0,run.stderr);
 assert.equal(run.pack.authoredEnemies[0][stat],3);
 assert.equal(run.pack.items['item.necklace-of-fire-immunity'].statModifiers[stat],2);
 assert.equal(run.pack.test.units[0][stat],4);
});
test('compiler refuses an unknown damaging-status type',()=>{
 const run=candidate(edit=>edit('settled.json',rows=>{rows.statuses.find(s=>s.id==='status.burn').damageType='holy'}));
 assert.notEqual(run.status,0);assert.match(run.stderr,/damage type/i);assert.equal(run.pack,null);
});

