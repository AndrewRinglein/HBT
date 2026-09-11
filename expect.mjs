// expect.mjs — turn the expected audit count into something that can actually fail.
//
// audit.mjs prints its findings and exits 0 either way, so a regression from 4 findings to 5
// slid past `npm run check` silently. This asserts the number and exits non-zero if it moves.
// A green check is only evidence if it could have gone red.
//
// The four expected findings are open BY DESIGN, not bugs:
//   gear-grants-a-movement-power-to-anyone (3) — Gale Shroud, Wind Dancer's Cloak,
//     Aegis of the Fleet each grant a flight power with no classRestriction, letting a Mage
//     or Priest buy the escape the movement ruling denies them.
//   specialty-not-four-powers (1) — Wild Shaper carries 3 powers; Bear Form was removed and
//     the slot was left deliberately empty.
//
// ART IS NOT COUNTED HERE. Ruled 2026-09-04 (engine/DECISIONS.md, "Missing art never breaks a
// ship"): "We will eventually have four paintings, but it's fine to have one. Things shouldn't
// break if we are missing art." audit.mjs still PRINTS hero-has-a-partial-level-set,
// declared-art-file-does-not-exist and art-path-does-not-resolve — that list is the art queue —
// but reports them under their own ART GAPS count and leaves them out of TOTAL FINDINGS, which
// is the number this file gates on. A painting that has not been made yet never holds a pack.
//
// If you resolve one, lower EXPECTED. If you add content, this is what tells you that you
// added a finding as well.

import { execFileSync } from 'node:child_process';

const EXPECTED = 4;

const out = execFileSync(process.execPath, ['audit.mjs'], { encoding: 'utf8' });
const m = out.match(/TOTAL FINDINGS:\s*(\d+)/);

if (!m) {
  console.error('expect.mjs: audit.mjs printed no TOTAL FINDINGS line. Did it crash?\n');
  console.error(out.slice(-800));
  process.exit(1);
}

const actual = Number(m[1]);
if (actual === EXPECTED) {
  console.log(`\nexpect: audit findings = ${actual}, as expected.`);
  process.exit(0);
}

console.error(out);
console.error(`\nEXPECTED ${EXPECTED} audit findings, GOT ${actual}.`);
console.error(actual > EXPECTED
  ? 'Something new broke a ruling. Read the findings above — do not raise EXPECTED to make this pass.'
  : 'A known finding was resolved. If that was deliberate, lower EXPECTED in expect.mjs and say why.');
process.exit(1);
