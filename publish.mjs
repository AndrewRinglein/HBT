import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

export const OUTPUTS = Object.freeze([
  'content/hbt-content.json', 'content/gen/functions.json', 'content/FUNCTIONS.md',
  'content/LEVEL-TABLES.md', 'content/hbt-codex.html', 'CODEX.md', 'HBT-CODEX.html',
  'content/gen/enemy-pack-gaps.json', 'content/gen/class-power-gaps.json',
  'engine/src/content/generated/pack.ts', 'engine/src/content/generated/pack.stamp.json',
]);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/** The engine's content pack — the one published output a battle is made of. */
export const PACK = 'engine/src/content/generated/pack.ts';
/** What a ship that changed the pack runs next, and where: the engine re-records its control-battle
 * golden and says whether the fights moved (Andrew, 2026-10-04). null when the pack did not change. */
export function goldenCommand(changed, projectRoot) {
  if (!changed.includes(PACK)) return null;
  return { args: ['tools/gate.mjs', '--pack-golden'], cwd: path.join(projectRoot, 'engine') };
}

/** Roll back replacements on caught I/O errors. Not crash-atomic across files;
 * requires the project's single generated-file writer rule. */
export function commitOutputs(candidate, projectRoot, { beforeReplace = () => {} } = {}) {
  const rows = OUTPUTS.map(relative => {
    const target = path.join(projectRoot, relative);
    const bytes = fs.readFileSync(path.join(candidate, relative));
    const previous = fs.existsSync(target) ? fs.readFileSync(target) : null;
    return { relative, target, bytes, previous };
  }).filter(row => !row.previous?.equals(row.bytes));
  const token = crypto.randomUUID();
  const committed = [];
  try {
    for (const row of rows) {
      fs.mkdirSync(path.dirname(row.target), { recursive: true });
      row.temporary = row.target + '.publish-' + token;
      fs.writeFileSync(row.temporary, row.bytes, { flag: 'wx' });
    }
    for (const row of rows) {
      beforeReplace(row.relative);
      fs.renameSync(row.temporary, row.target);
      committed.push(row);
    }
  } catch (error) {
    const errors = [error];
    for (const row of committed.reverse()) {
      try {
        if (row.previous === null) fs.unlinkSync(row.target);
        else {
          fs.writeFileSync(row.temporary, row.previous);
          fs.renameSync(row.temporary, row.target);
        }
      } catch (rollbackError) { errors.push(rollbackError); }
    }
    if (errors.length > 1) throw new AggregateError(errors, 'Publication failed and rollback was incomplete');
    throw error;
  } finally {
    for (const row of rows) if (row.temporary && fs.existsSync(row.temporary)) fs.unlinkSync(row.temporary);
  }
  return rows.map(row => row.relative);
}

export function publishContent({ projectRoot, dry = false, tsxCli, log = console.log }) {
  projectRoot = path.resolve(projectRoot);
  const content = path.join(projectRoot, 'content');
  const runtime = tsxCli ?? path.join(projectRoot, 'engine/node_modules/tsx/dist/cli.mjs');
  const requireRuntime = createRequire(runtime);
  let playwright = process.env.PLAYWRIGHT;
  if (!playwright) {
    try { playwright = createRequire(path.join(content, 'package.json')).resolve('playwright'); }
    catch { playwright = requireRuntime.resolve('playwright-core'); }
  }
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-publish-'));
  const stagedContent = path.join(temporaryRoot, 'content');
  const run = args => {
    try { return execFileSync(process.execPath, args, { cwd: stagedContent, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PLAYWRIGHT: playwright } }); }
    catch (error) { throw new Error(`${args[0]} failed:\n${error.stdout || ''}${error.stderr || error.message}`); }
  };
  try {
    fs.mkdirSync(stagedContent);
    for (const entry of fs.readdirSync(content, { withFileTypes: true })) {
      if (entry.isFile() && /\.(mjs|mts|ts|json|md)$/.test(entry.name)) fs.copyFileSync(path.join(content, entry.name), path.join(stagedContent, entry.name));
    }
    for (const relative of ['gen', 'test', 'art/thumbs', 'art/manifest.json']) {
      const from = path.join(content, relative);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(stagedContent, relative), { recursive: true });
    }
    fs.cpSync(path.join(projectRoot, 'engine/src'), path.join(temporaryRoot, 'engine/src'), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, 'engine/package.json'), path.join(temporaryRoot, 'engine/package.json'));
    // the engine's vocabulary, which mkenginepack and audit read (plumbing.vocabulary-export, engine 2026-09-28)
    fs.mkdirSync(path.join(temporaryRoot, 'engine/generated'), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, 'engine/generated/vocabulary.json'), path.join(temporaryRoot, 'engine/generated/vocabulary.json'));
    // No successful no-op builder may validate an old copied output as its candidate.
    for (const relative of OUTPUTS) {
      const file = path.join(temporaryRoot, relative);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    for (const script of ['assemble.mjs', 'functions.mjs', 'assemble.mjs', 'expect.mjs', 'checklevels.mjs', 'mkenginepack.mjs', 'mklevelsmd.mjs', 'build-viewer.mjs', 'mkcodexmd.mjs']) {
      const output = run([script]);
      if (script === 'checklevels.mjs' && !/PROBLEMS:\s*0\b/.test(output)) throw new Error(output);
      log(`Checked ${script}`);
    }
    log(run(['verify-codex.mjs']).trim());
    log(run([runtime, 'validate-candidate.mts']).trim());
    let contentCommit = 'uncommitted';
    try { contentCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: content, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
    const stamp = {
      generated: new Date().toISOString().slice(0, 10), contentCommit,
      contentSha: digest(fs.readFileSync(path.join(stagedContent, 'hbt-content.json'))).slice(0, 12),
      packSha: digest(fs.readFileSync(path.join(temporaryRoot, 'engine/src/content/generated/pack.ts'))),
      units: (() => {
        const data = JSON.parse(fs.readFileSync(path.join(stagedContent, 'hbt-content.json')));
        return data.testCohort.heroes.length + data.testCohort.enemies.length;
      })(),
    };
    fs.writeFileSync(path.join(temporaryRoot, 'engine/src/content/generated/pack.stamp.json'), JSON.stringify(stamp, null, 2) + '\n');
    for (const relative of OUTPUTS) {
      if (!fs.statSync(path.join(temporaryRoot, relative)).isFile()) throw new Error(`Missing generated output: ${relative}`);
    }
    const changed = dry ? [] : commitOutputs(temporaryRoot, projectRoot);
    log(dry ? 'DRY RUN PASSED: candidate loaded; live files unchanged.' : `SHIPPED: ${changed.length} generated files published.`);
    return { changed, stamp };
  } finally {
    if (path.dirname(temporaryRoot) !== path.resolve(os.tmpdir()) || !path.basename(temporaryRoot).startsWith('hobat-publish-')) throw new Error('Unsafe staging cleanup path');
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
