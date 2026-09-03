// The status registry. Explicit object, never decorators — greppability and
// deterministic load order both matter (Law 6).

import { omitDisabled } from './disable.js'
import { packStatuses, packTestStatuses } from './pack.js'

// PUBLISHED SOURCE: `1-EFFECTS-SETTLED.md` § status.*
// Only ids published there may appear in this file. `status.burn` was implemented
// here and removed on 2026-08-14 — that document says outright it "is not yet
// shaped, so do not reference it from another session yet", and it was referenced.
// pack.statuses (2026-09-02) — THE CODEX OWNS THE STATUS ROWS. Andrew, asked
// whether the engine may read its statuses from the Codex: "Yes — Codex owns
// the rows." The ten expressible rows (poison, burn, bleed, regeneration,
// protection, weak, slow, stun, dazed, powers-locked) arrive through the
// generated pack, compiled from each row's one sentence by content/
// mkenginepack.mjs; the six the engine cannot yet behave for (karma, taunt,
// confusion, root, frost, shadow) are NAMED GAPS in gen/enemy-pack-gaps.json,
// not rows. The hand-written rows that lived here since 2026-08-14 are gone —
// the behaviour they declared is now the converter's phrase table and the
// loader's hook, and the numbers were never here anyway. What remains is the
// TESTING LANE: test.* rows that prove each flag is a slot, not a name.
// test.receptacle (2026-09-02): the TESTING LANE moved to content/test/
// statuses.json and arrives through the same loader (packTestStatuses). This
// file no longer types a single row; it is the registry that joins the two
// sections and refuses a collision.
const PACK_STATUSES = packStatuses()
const TEST_STATUSES = packTestStatuses()
for (const id of Object.keys(TEST_STATUSES)) if (PACK_STATUSES[id]) throw new Error(`statuses.ts: '${id}' is in the pack AND the test receptacle — one owner only`)
export const STATUSES = omitDisabled({ ...PACK_STATUSES, ...TEST_STATUSES })
