// The files a test's temporary workspace needs to RUN content scripts — one helper instead of a
// fixed list per test file. Added 2026-10-01: encounter.caravan-aftermath (be770ee/cb9a2fc) gave
// mkenginepack.mjs and assemble.mjs an import of ./mkpaintedmaps.mjs, and every workspace whose
// list named only the modules they imported before (action-slots, block, bursts, damage-packets,
// elemental-resists) failed at module load — 34 tests red, none for what they test.
//
// copyRuntime copies the entry scripts, every local module they import (followed, so a new import
// can never be left out again) and the data files named. A module reads its data from gen/, which
// the tests copy whole as before; mkpaintedmaps.mjs reads gen/painted-maps.json at runtime and
// ../assets only when re-measuring a scene, which no test does.
import fs from 'node:fs';
import path from 'node:path';

const LOCAL_IMPORT = /(?:from\s+|import\s*\(\s*)['"]\.\/([^'"]+\.m?js)['"]/g;

/** The entry scripts and every local module they reach, in first-seen order. */
export function localModules(source, entries) {
  const seen = [];
  const visit = (name) => {
    if (seen.includes(name)) return;
    seen.push(name);
    const text = fs.readFileSync(path.join(source, name), 'utf8');
    for (const m of text.matchAll(LOCAL_IMPORT)) visit(m[1]);
  };
  for (const e of entries) visit(e);
  return seen;
}

/** Copy the entries, their local modules and the named data files from source into work. */
export function copyRuntime(source, work, entries, data = []) {
  for (const name of [...localModules(source, entries), ...data]) fs.copyFileSync(path.join(source, name), path.join(work, name));
}
