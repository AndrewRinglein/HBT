// Build and validate in isolation before replacing live outputs.
//
// A new content pack does not start the engine's suite, the viewer's gate or kingdom's suite (Andrew,
// 2026-10-04, engine/DECISIONS.md 'the same for content and kingdom changes: each kind of change runs
// its own tests') — content's own suite does. But a pack can move the engine's control battles, so a
// ship that changed the pack re-records the control-battle golden and says whether the fights moved
// (the engine's `node tools/gate.mjs --pack-golden`); otherwise the next engine item would fail on a
// difference it did not make. That step never fails the ship: the pack is already published.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publishContent, goldenCommand } from './publish.mjs';
try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dry')) throw new Error('Usage: node ship.mjs [--dry]');
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dry = args.includes('--dry');
  const { changed } = publishContent({ projectRoot, dry, tsxCli: process.env.HOBAT_TSX_CLI });
  const golden = goldenCommand(changed, projectRoot);
  if (golden && !dry) {
    const failed = why => console.error(`NOTE: the pack is shipped; the control-battle golden was NOT re-recorded (${why}). From engine/: node tools/gate.mjs --pack-golden`);
    if (!fs.existsSync(path.join(golden.cwd, golden.args[0]))) failed('no engine gate beside this content folder');
    else {
      console.log('The pack changed: re-recording the engine\'s control-battle golden (engine/tools/gate.mjs --pack-golden)…');
      const run = spawnSync(process.execPath, golden.args, { cwd: golden.cwd, stdio: 'inherit' });
      if (run.status !== 0) failed(`gate.mjs --pack-golden exited ${run.status}`);
    }
  }
} catch (error) {
  console.error(`NOT SHIPPING: ${error.message}`);
  process.exitCode = 1;
}
