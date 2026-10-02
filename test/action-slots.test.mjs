import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = path.resolve(import.meta.dirname, '..');
const livePack = path.resolve(source, '../engine/src/content/generated/pack.ts');
function candidate(change) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-slots-'));
  const work = path.join(root, 'content');
  const published = fs.readFileSync(livePack);
  try {
    fs.mkdirSync(work);
    fs.mkdirSync(path.join(root, 'engine/src/content/generated'), { recursive: true }); fs.mkdirSync(path.join(root, 'engine/generated'), { recursive: true }); fs.copyFileSync(path.join(source, '../engine/generated/vocabulary.json'), path.join(root, 'engine/generated/vocabulary.json'));   // the engine's vocabulary the converter reads (plumbing.vocabulary-export)
    for (const name of ['mkenginepack.mjs', 'map-schema.mjs','burst-schema.mjs','mkpaintedmaps.mjs', 'hbt-content.json', 'settled.json']) fs.copyFileSync(path.join(source, name), path.join(work, name));
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
    assert.ok(path.basename(resolved).startsWith('hobat-slots-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

for (const slot of ['movement', 'primary', 'either']) test(`compiler preserves ${slot} through all TEST action families and authored movement`, () => {
  const run = candidate(edit => {
    for (const file of ['attacks', 'abilities', 'moves']) edit(`test/${file}.json`, rows => { rows[0].slot = slot; });
    edit('settled.json', rows => { rows.powers.find(p => p.id === 'power.move').slot = slot; rows.attacks.find(a => a.id === 'attack.punch').slot = slot; });
    edit('gen/warrior.json', rows => { rows.powers[0].slot = slot; });
  });
  assert.equal(run.status, 0, run.stderr);
  for (const family of ['attacks', 'abilities', 'moves']) assert.equal(Object.values(run.pack.test[family])[0].slot, slot);
  assert.equal(run.pack.moves['power.move'].slot, slot);
  assert.equal(run.pack.authoredAttacks['attack.punch'].slot, slot);
  assert.equal(Object.values(run.pack.classPowers)[0].slot, slot);
});
test('authored movement preserves free without weakening slot transport', () => {
  const run = candidate(edit => edit('settled.json', rows => { const p = rows.powers.find(p => p.id === 'power.move'); p.slot = 'primary'; p.free = true; }));
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.pack.moves['power.move'].free, true);
  assert.equal(run.pack.moves['power.move'].slot, 'primary');
});
test('authored movement rejects a nonboolean free flag', () => {
  const run = candidate(edit => edit('settled.json', rows => { rows.powers.find(p => p.id === 'power.move').free = 'yes'; }));
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /free/i);
  assert.equal(run.pack, null);
});
for (const file of ['attacks', 'abilities', 'moves', 'settled']) test(`compiler rejects invalid ${file} slot before producing output`, () => {
  const run = candidate(edit => {
    if (file === 'settled') edit('settled.json', rows => { rows.powers.find(p => p.id === 'power.move').slot = 'reaction'; });
    else edit(`test/${file}.json`, rows => { rows[0].slot = 'reaction'; });
  });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /slot/i);
  assert.equal(run.pack, null);
});
