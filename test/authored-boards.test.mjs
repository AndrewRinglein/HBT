import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const source = path.resolve(import.meta.dirname, '..');
const livePack = path.resolve(source, '../engine/src/content/generated/pack.ts');
function candidate(change, assemble = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-boards-')), work = path.join(root, 'content');
  const before = fs.readFileSync(livePack);
  try {
    fs.mkdirSync(work); fs.mkdirSync(path.join(root, 'engine/src/content/generated'), { recursive: true });
    for (const file of fs.readdirSync(source)) if (/\.(mjs|json)$/.test(file)) fs.copyFileSync(path.join(source, file), path.join(work, file));
    for (const folder of ['gen', 'test']) fs.cpSync(path.join(source, folder), path.join(work, folder), { recursive: true, filter: p => !fs.statSync(p).isFile() || p.endsWith('.json') });
    const edit = (file, fn) => { const p = path.join(work, file); const data = JSON.parse(fs.readFileSync(p, 'utf8')); fn(data); fs.writeFileSync(p, JSON.stringify(data)); };
    const write = (file, data) => fs.writeFileSync(path.join(work, file), JSON.stringify(data));
    change(edit, write);
    const out = assemble ? path.join(work, 'hbt-content.json') : path.join(root, 'engine/src/content/generated/pack.ts');
    const previous = fs.existsSync(out) ? fs.readFileSync(out) : Buffer.from('previous pack');
    if (!assemble) fs.writeFileSync(out, previous);
    const run = spawnSync(process.execPath, [assemble ? 'assemble.mjs' : 'mkenginepack.mjs'], { cwd: work, encoding: 'utf8' });
    const bytes = fs.readFileSync(out);
    if (run.status !== 0) assert.deepEqual(bytes, previous, 'failed candidate preserved output');
    const pack = !assemble && run.status === 0 ? JSON.parse(bytes.toString().split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/, '')) : null;
    return { ...run, pack };
  } finally {
    assert.deepEqual(fs.readFileSync(livePack), before, 'live pack unchanged');
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('hobat-boards-'));
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const row = (width = 20, height = 10) => ({ id: 'map.dimension-probe', name: 'Dimension probe', note: 'Isolated schema probe', format: `${width}x${height}`, board: { width, height }, rows: Array(height).fill('.'.repeat(width)) });
test('compiler publishes both actual TEST encounters with map dimensions intact', () => {
  const run = candidate(() => {});
  assert.equal(run.status, 0, run.stderr);
  for (const id of ['journey-20x10', 'authored-40x40']) {
    const enc = run.pack.test.encounters?.[`test.encounter.${id}`];
    assert.ok(enc, id);
    assert.deepEqual(enc.board, run.pack.test.maps[`test.map.${id}`].board);
    assert.equal(enc.gaps, undefined);
  }
});
test('actual compiler transports shipping props and both flat TEST prop variants', () => {
  const props = [{ id: 'prop.compiler', height: 'high', material: 2, footprint: { kind: 'hex', hexes: [22, 23] } }];
  const run = candidate(edit => edit('hbt-content.json', d => d.maps.push({ ...row(), props })));
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(run.pack.maps['map.dimension-probe'].props, props);
  const authored = JSON.parse(fs.readFileSync(path.join(source, 'test/maps.json'), 'utf8'));
  for (const id of ['test.map.high-prop-single', 'test.map.high-prop-multi']) {
    const input = authored.find(m => m.id === id);
    assert.deepEqual(run.pack.test.maps[id].props, input.props);
    assert.deepEqual(run.pack.test.maps[id].rows, input.rows);
  }
});
for (const assemble of [true, false]) test(`${assemble ? 'assembler' : 'compiler'} rejects authored reserved prop IDs before replacing outputs`, () => {
  const run = candidate(edit => edit(assemble ? 'gen/maps.json' : 'hbt-content.json', d => d.maps.push({ ...row(), props: [{ id: 'prop.obstacle.1', height: 'high', material: 3, footprint: { kind: 'hex', hexes: [1] } }] })), assemble);
  assert.notEqual(run.status, 0);
  assert.match(run.stdout + run.stderr, /prop/i);
});
for (const [width, height] of [[20,10], [40,40]]) {
  test(`assembler accepts ${width}x${height} map and encounter`, () => {
    const run = candidate(edit => {
      edit('gen/maps.json', d => d.maps.push(row(width, height)));
      edit('gen/encounters.json', d => { const e = d.prologue[0]; e.board = { width, height }; e.map = 'map.dimension-probe'; e.setup = []; e.schedule = []; delete e.heroZone; delete e.paint; });
    }, true);
    assert.equal(run.status, 0, run.stdout + run.stderr);
  });
  test(`compiler transports ${width}x${height} shipping map, TEST map and encounter`, () => {
    const run = candidate((edit, write) => {
      edit('hbt-content.json', d => d.maps.push(row(width, height)));
      edit('test/maps.json', d => d.push({ ...row(width, height), id: 'test.map.dimension-probe' }));
      edit('gen/encounters.json', d => { const e = d.prologue[0]; e.board = { width, height }; e.map = 'map.dimension-probe'; e.setup = []; e.schedule = []; delete e.heroZone; delete e.paint; });
    });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(run.pack.maps['map.dimension-probe']?.board, { width, height });
    assert.deepEqual(run.pack.test.maps['test.map.dimension-probe']?.board, { width, height });
    const encounter = Object.values(run.pack.encounters).find(e => e.mapId === 'map.dimension-probe');
    assert.deepEqual(encounter.board, { width, height });
    assert.ok(!(encounter.gaps || []).some(s => /board.*format/.test(s)));
  });
}
for (const patch of [
  { id: ['map.dimension-probe'] }, { name: '' }, { name: null },
  { rows: [] }, { rows: [''] }, { rows: [null] }, { rows: [5] }, { rows: [{ length: 20 }] }, { rows: ['..', '.'] },
  { board: { width: 2 ** 53, height: 1 } }, { board: null }, { format: '16x16' }, { format: null },
  { rows: Array(101).fill('.'.repeat(100)), board: { width: 100, height: 101 }, format: '100x101' },
  { deploy: { hero: 'top', enemy: 'east' } }, { deploy: { hero: 'west', enemy: 'west' } }, { deploy: { hero: 'west', enemy: 'east' } }, { deploy: null },
]) for (const assemble of [true, false]) test(`${assemble ? 'assembler' : 'compiler'} rejects malformed map ${JSON.stringify(patch).slice(0,65)}`, () => {
  const run = candidate(edit => edit(assemble ? 'gen/maps.json' : 'hbt-content.json', d => d.maps.push({ ...row(), ...patch })), assemble);
  assert.notEqual(run.status, 0, 'malformed maps must not silently ship/drop');
});
test('compiler accepts the exact10000-cell ceiling without allocating battle geometry', () => {
  const run = candidate(edit => edit('hbt-content.json', d => d.maps.push(row(100, 100))));
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(run.pack.maps['map.dimension-probe'].board, { width: 100, height: 100 });
});
for (const assemble of [true, false]) for (const patch of [
  { board: { width: 2 ** 53, height: 1 } }, { board: { width: 10001, height: 1 } },
  { board: { width: 20, height: 10 } }, { setup: [{ unit: 'unit.zombie', at: { col: 0.5, row: 2 } }] },
  { setup: [{ unit: 'unit.zombie', at: { col: '1', row: 2 } }] }, { paint: [{ layer: 'terrain.burning', hexes: [0.5] }] },
]) test(`${assemble ? 'assembler' : 'compiler'} rejects invalid encounter board or coordinates ${JSON.stringify(patch)}`, () => {
  const run = candidate(edit => edit('gen/encounters.json', d => {
    Object.assign(d.prologue[0], { board: { width: 16, height: 16 }, map: 'map.open', setup: [], schedule: [] });
    delete d.prologue[0].heroZone; delete d.prologue[0].paint;
    Object.assign(d.prologue[0], patch);
  }), assemble);
  assert.notEqual(run.status, 0);
});
