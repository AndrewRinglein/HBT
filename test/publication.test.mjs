import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { OUTPUTS, commitOutputs } from '../publish.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-publish-test-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('hobat-publish-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const content = path.join(root, 'content');
  fs.mkdirSync(content);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isFile() && /\.(mjs|mts|json|md)$/.test(entry.name)) fs.copyFileSync(path.join(source, entry.name), path.join(content, entry.name));
  }
  for (const name of ['gen', 'test', 'art/thumbs']) fs.cpSync(path.join(source, name), path.join(content, name), { recursive: true });
  fs.copyFileSync(path.join(source, 'art/manifest.json'), path.join(content, 'art/manifest.json'));
  fs.cpSync(path.join(source, '../engine/src'), path.join(root, 'engine/src'), { recursive: true });
  fs.copyFileSync(path.join(source, '../engine/package.json'), path.join(root, 'engine/package.json'));
  fs.mkdirSync(path.join(root, 'engine/generated'), { recursive: true }); fs.copyFileSync(path.join(source, '../engine/generated/vocabulary.json'), path.join(root, 'engine/generated/vocabulary.json'));   // the engine's vocabulary the converter reads (plumbing.vocabulary-export)
  return { root, content };
}

test('invalid assembly fails and preserves the last assembled content', t => {
  const { content } = fixture(t);
  const previous = fs.readFileSync(path.join(content, 'hbt-content.json'));
  const file = path.join(content, 'gen/warrior.json');
  const data = JSON.parse(fs.readFileSync(file));
  data.powers[0].id = 'invalid id';
  fs.writeFileSync(file, JSON.stringify(data));
  const result = spawnSync(process.execPath, ['assemble.mjs'], { cwd: content, encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout);
  assert.deepEqual(fs.readFileSync(path.join(content, 'hbt-content.json')), previous);
});

export { fixture, source };

function ship(content, args = []) {
  return spawnSync(process.execPath, ['ship.mjs', ...args], {
    cwd: content, encoding: 'utf8',
    env: { ...process.env, HOBAT_TSX_CLI: path.resolve(source, '../engine/node_modules/tsx/dist/cli.mjs') },
  });
}
test('dry publication builds and validates without changing live outputs', t => {
  const { root, content } = fixture(t);
  fs.writeFileSync(path.join(content, 'FUNCTIONS.md'), 'previous functions');
  const outputs = new Map(OUTPUTS.map(relative => {
    const file = path.join(root, relative);
    return [relative, fs.existsSync(file) ? { bytes: fs.readFileSync(file), mtime: fs.statSync(file).mtimeMs } : null];
  }));
  const before = fs.readFileSync(path.join(content, 'FUNCTIONS.md'));
  const pack = fs.readFileSync(path.join(root, 'engine/src/content/generated/pack.ts'));
  const result = ship(content, ['--dry']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(fs.readFileSync(path.join(content, 'FUNCTIONS.md')).equals(before), 'dry run rewrote functions');
  assert.ok(fs.readFileSync(path.join(root, 'engine/src/content/generated/pack.ts')).equals(pack), 'dry run rewrote pack');
  for (const [relative, previous] of outputs) {
    const file = path.join(root, relative);
    if (!previous) assert.equal(fs.existsSync(file), false, relative);
    else {
      assert.ok(fs.readFileSync(file).equals(previous.bytes), relative);
      assert.equal(fs.statSync(file).mtimeMs, previous.mtime, relative);
    }
  }
});
test('dry publication rejects an artifact that the actual engine cannot load', t => {
  const { content } = fixture(t);
  // Valid TS, malformed unit in a lane the old publisher never checked for required fields.
  fs.appendFileSync(path.join(content, 'mkenginepack.mjs'), `
const candidatePath = '../engine/src/content/generated/pack.ts';
const candidateText = fs.readFileSync(candidatePath, 'utf8');
const candidatePack = JSON.parse(candidateText.slice(candidateText.indexOf('{'), candidateText.lastIndexOf('}') + 1));
delete candidatePack.alphaTeam[0].moves;
fs.writeFileSync(candidatePath, 'export const UNIT_PACK = ' + JSON.stringify(candidatePack) + ' as const');
`);
  const result = ship(content, ['--dry']);
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /moves/);
});

test('failed publication preserves every output, including the stamp', t => {
  const { root, content } = fixture(t);
  const before = new Map(OUTPUTS.map(relative => [relative, fs.existsSync(path.join(root, relative)) ? fs.readFileSync(path.join(root, relative)) : null]));
  fs.appendFileSync(path.join(content, 'mkenginepack.mjs'), '\nthrow new Error("compiler failure after writing candidate");\n');
  const result = ship(content);
  assert.notEqual(result.status, 0);
  for (const [relative, bytes] of before) {
    if (bytes === null) assert.equal(fs.existsSync(path.join(root, relative)), false, relative);
    else assert.ok(fs.readFileSync(path.join(root, relative)).equals(bytes), relative);
  }
});

for (const script of ['mkenginepack.mjs', 'mkcodexmd.mjs']) test(`dry publication rejects a successful no-op ${script}`, t => {
  const { content } = fixture(t);
  fs.writeFileSync(path.join(content, script), '// Deliberate successful no-op\n');
  const result = ship(content, ['--dry']);
  assert.notEqual(result.status, 0, result.stdout);
});

for (const [label, mutation, message] of [
  ['cohort hero without plain movement', 'candidatePack.heroes[0].moves = []', /requires plain power.move/],
  ['unknown badge on a non-default unit', "candidatePack.alphaTeam[0].badges = ['badge.missing']", /badge.missing/],
]) test(`candidate rejects ${label}`, t => {
  const { content } = fixture(t);
  fs.appendFileSync(path.join(content, 'mkenginepack.mjs'), `
const candidatePath = '../engine/src/content/generated/pack.ts';
const candidateText = fs.readFileSync(candidatePath, 'utf8');
const candidatePack = JSON.parse(candidateText.slice(candidateText.indexOf('{'), candidateText.lastIndexOf('}') + 1));
${mutation};
fs.writeFileSync(candidatePath, 'export const UNIT_PACK = ' + JSON.stringify(candidatePack) + ' as const');
`);
  const result = ship(content, ['--dry']);
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, message);
});

test('late replacement failure restores old bytes and removes newly created outputs', t => {
  const { root } = fixture(t);
  const candidate = path.join(root, 'candidate');
  for (const relative of OUTPUTS) {
    const file = path.join(candidate, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'new ' + relative);
  }
  const before = new Map(OUTPUTS.map(relative => [relative, fs.existsSync(path.join(root, relative)) ? fs.readFileSync(path.join(root, relative)) : null]));
  assert.throws(() => commitOutputs(candidate, root, { beforeReplace(relative) {
    if (relative === OUTPUTS.at(-1)) throw new Error('injected late I/O failure');
  } }), /injected late I\/O failure/);
  for (const [relative, bytes] of before) {
    if (bytes === null) assert.equal(fs.existsSync(path.join(root, relative)), false, relative);
    else assert.ok(fs.readFileSync(path.join(root, relative)).equals(bytes), relative);
    assert.ok(!fs.readdirSync(path.dirname(path.join(root, relative))).some(name => name.includes('.publish-')));
  }
});

test('successful publication writes a candidate that can itself pass another dry run', t => {
  const { root, content } = fixture(t);
  const result = ship(content);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const relative of OUTPUTS) assert.ok(fs.statSync(path.join(root, relative)).size > 0, relative);
  const again = ship(content, ['--dry']);
  assert.equal(again.status, 0, again.stdout + again.stderr);
});
