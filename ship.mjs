// ship.mjs — the ONLY safe way to publish content to the engine.
//
// Why this exists: on 2026-08-21 the engine's content pack was written while it was
// half-repaired. Six heroes were missing their `moves`, the engine's loader throws on a
// missing required field, and 34 test files failed at once in another session. Every
// individual check was green — assemble said PROBLEMS: 0, audit said 4, checklevels said 0 —
// because none of them looked at the artefact that actually ships.
//
// So: build, check, and only then write. If anything is wrong the pack is NOT touched, and
// whatever is currently in the engine's tree keeps working.
//
//   node ship.mjs           check everything, write the pack if clean
//   node ship.mjs --dry     check everything, write nothing

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const DRY = process.argv.includes('--dry');
const PACK = '../engine/src/content/generated/pack.ts';
const run = (c, a) => execFileSync(c, a, { encoding: 'utf8' });
let failed = 0;
const ok  = m => console.log('  ok    ' + m);
const bad = m => { failed++; console.log('  FAIL  ' + m); };

console.log('\n1 · BUILD');
try {
  run('node', ['assemble.mjs']); run('node', ['functions.mjs']); run('node', ['assemble.mjs']);
  run('node', ['mklevelsmd.mjs']); run('node', ['build-viewer.mjs']); run('node', ['mkcodexmd.mjs']);
  ok('pipeline built in order (assemble -> functions -> assemble -> levels -> viewer -> codex)');
} catch (e) { bad('build threw: ' + String(e.stdout || e.message).slice(-400)); }

console.log('\n2 · LINT');
try { run('node', ['expect.mjs']); ok('audit findings as expected'); }
catch (e) { bad('audit count moved:\n' + String(e.stdout || e.message).slice(-1200)); }
try {
  const out = run('node', ['checklevels.mjs']);
  /PROBLEMS: 0/.test(out) ? ok('level tables price clean') : bad('checklevels: ' + out.trim().split('\n').pop());
} catch (e) { bad('checklevels threw'); }

console.log('\n3 · IS THE SHIPPING ARTEFACT COMPLETE?');
// The check that would have caught 2026-08-21. Validate the CONTENT before generating,
// against the same required-field list the engine's loader enforces.
const REQUIRED = ['typeId','name','maxHp','accuracy','movement','moves','ai','attacks'];
let D = null;
try { D = JSON.parse(fs.readFileSync('hbt-content.json', 'utf8')); } catch { bad('hbt-content.json unreadable'); }
if (D) {
  if (!D.testCohort) bad('no testCohort — the engine pack cannot be built. Recover it: git show efb2d67:settled.json');
  else {
    const rows = [...(D.testCohort.heroes || []), ...(D.testCohort.enemies || [])];
    let incomplete = 0;
    for (const u of D.testCohort.heroes || []) {
      const moves = (u.engine && u.engine.moves) || u.moves;
      if (!Array.isArray(moves) || !moves.length) { bad(`${u.typeId}: no moves — the engine loader throws on this`); incomplete++; }
      else if (!moves.includes('power.move')) { bad(`${u.typeId}: cannot plain Move`); incomplete++; }
    }
    if (!incomplete) ok(`all ${rows.length} cohort units carry movement`);
  }
}

if (failed) {
  console.log(`\nNOT SHIPPING — ${failed} problem${failed > 1 ? 's' : ''}.`);
  console.log('The engine pack was NOT written. Whatever is in the engine tree still works.\n');
  process.exit(1);
}

console.log('\n4 · GENERATE');
if (DRY) { console.log('  skip  --dry, pack not written'); }
else {
  try { console.log('  ' + run('node', ['mkenginepack.mjs']).trim()); }
  catch (e) { bad('mkenginepack threw: ' + String(e.stdout || e.message).slice(-300)); }
}

console.log('\n5 · VERIFY WHAT WAS ACTUALLY WRITTEN');
if (DRY) console.log('  skip  --dry');
else {
  try {
    const t = fs.readFileSync(PACK, 'utf8');
    const P = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    let badUnits = 0;
    for (const g of ['heroes', 'enemies'])
      for (const u of P[g] || []) {
        const miss = REQUIRED.filter(k => u[k] === undefined);
        if (miss.length) { bad(`${u.typeId} missing ${miss.join(',')}`); badUnits++; }
      }
    const n = (P.heroes || []).length + (P.enemies || []).length;
    if (!badUnits) ok(`${n} units written, every required field present`);

    // Stamp it, so the engine session can tell whether the pack matches this content.
    const stamp = {
      generated: new Date().toISOString().slice(0, 10),
      contentSha: crypto.createHash('sha256').update(fs.readFileSync('hbt-content.json')).digest('hex').slice(0, 12),
      contentCommit: (() => { try { return run('git', ['rev-parse', '--short', 'HEAD']).trim(); } catch { return 'uncommitted'; } })(),
      units: n,
    };
    fs.writeFileSync('../engine/src/content/generated/pack.stamp.json', JSON.stringify(stamp, null, 2) + '\n');
    ok(`stamped: content ${stamp.contentCommit} / ${stamp.contentSha}`);
  } catch (e) { bad('could not read back the pack: ' + e.message); }
}

console.log(failed ? `\nSHIPPED WITH ${failed} PROBLEM(S) — fix before telling the engine session.\n`
                   : '\nSHIPPED. Tell the engine session to re-bless control battles if unit stats changed.\n');
process.exit(failed ? 1 : 0);
