import fs from 'node:fs';
import crypto from 'node:crypto';
import { OUTPUTS } from '../../content/publish.mjs';
import assert from 'node:assert/strict';
const hashes = Object.fromEntries(OUTPUTS.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync('../' + file)).digest('hex')]));
if (process.argv.includes('--before')) fs.writeFileSync('scratch/authored-boards-publication-before.json', JSON.stringify(hashes, null, 2) + '\n');
else {
  const before = JSON.parse(fs.readFileSync('scratch/authored-boards-publication-before.json'));
  const changed = OUTPUTS.filter(file => before[file] !== hashes[file]);
  console.log(JSON.stringify({ changed }, null, 2));
  assert.deepEqual(changed, ['engine/src/content/generated/pack.ts', 'engine/src/content/generated/pack.stamp.json']);
}
