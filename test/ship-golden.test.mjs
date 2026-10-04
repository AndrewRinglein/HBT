// tool.tests-follow-what-changed (engine queue; Andrew, 2026-10-04, engine/DECISIONS.md 'the same for
// content and kingdom changes: each kind of change runs its own tests'). A new content pack does not
// start the engine's suite — but it can move the engine's control battles, so shipping one re-records
// the control-battle golden and says whether the fights moved (the engine's `gate.mjs --pack-golden`);
// otherwise the next engine item fails on a difference it did not make. It never fails the ship.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as publish from '../publish.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('a ship that changed the pack names the engine command that re-records the golden', () => {
  assert.equal(typeof publish.goldenCommand, 'function');
  assert.ok(publish.OUTPUTS.includes(publish.PACK), 'the pack is one of the published outputs');
  const root = path.join(here, 'no-such-folder');
  const command = publish.goldenCommand([publish.PACK, 'CODEX.md'], root);
  assert.deepEqual(command, { args: ['tools/gate.mjs', '--pack-golden'], cwd: path.join(root, 'engine') });
});

test('a ship that did not change the pack re-records nothing', () => {
  assert.equal(publish.goldenCommand(['content/hbt-content.json', 'CODEX.md'], here), null);
  assert.equal(publish.goldenCommand([], here), null);
});

test('ship.mjs runs it after a real ship, and a failure there does not fail the ship', () => {
  const ship = fs.readFileSync(path.join(here, '..', 'ship.mjs'), 'utf8');
  assert.match(ship, /goldenCommand\(changed, projectRoot\)/);
  assert.match(ship, /if \(golden && !dry\)/, 'never on a dry run');
  assert.match(ship, /the pack is shipped; the control-battle golden was NOT re-recorded/, 'a failed golden step is said, and the ship stands');
});
