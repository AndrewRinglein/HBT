// The status registry. Explicit object, never decorators — greppability and
// deterministic load order both matter (Law 6).

import type { StatusDef } from '../core/status.js'
import { statusDamage } from '../core/status.js'
import { omitDisabled } from './disable.js'
import { packStatuses } from './pack.js'

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
const RAW_TEST_STATUSES: Readonly<Record<string, StatusDef>> = {
  'test.status.ward': {
    // TESTING LANE — the second reducesIncomingDamage pool, proving the station
    // consumes data, not a name (and the second shield SWITCHES.md says makes
    // absorbSpendOrder observable: 'status.protection' < 'test.status.ward', so
    // Protection pays first). Never ships.
    id: 'test.status.ward', name: 'Ward (testing)', shape: 'pool', stacking: 'add',
    reducesIncomingDamage: true,
  },
  'test.status.enfeeble': {
    // TESTING LANE — the second reducesOutgoingDamage instance, proving the
    // station consumes data, not a name. Never ships.
    id: 'test.status.enfeeble', name: 'Enfeeble (testing)', shape: 'modifier', stacking: 'add',
    reducesOutgoingDamage: true,
  },
  'test.status.hobble': {
    // TESTING LANE — the second reducesMovement instance, proving the slot is
    // pure data. Never ships.
    id: 'test.status.hobble', name: 'Hobble (testing)', shape: 'counter', stacking: 'add',
    reducesMovement: true,
  },
  'test.status.gash': {
    // TESTING LANE — the second shedByHealing instance (fix.bleed-magnitude,
    // 2026-09-02): proves the heal-sheds-half mechanism is a row flag, not a
    // Bleed special case. True tick by value like Bleed; applied by the
    // fixture zombie's test.zombie.gash, healed off by Lucius in
    // showcase.gash-variant.
    id: 'test.status.gash', name: 'Gash (testing)', shape: 'counter', stacking: 'add',
    tickDamageType: 'true',
    shedByHealing: 'half',
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'test.status.gash'),
  },
  'test.status.daze': {
    // TESTING LANE (ruled 2026-08-20) — the second blocksAction instance, proving
    // the slot is pure data (the generalization gate's variant). Never ships;
    // retire when a published second stunner (Dazed, crit chart) arrives.
    id: 'test.status.daze', name: 'Daze (testing)', shape: 'counter', stacking: 'add',
    blocksAction: true,
  },
}

// Kill-switch seam — identical object when CF_DISABLE_IDS is unset.
// One owner per id: a test row may never shadow a Codex row.
for (const id of Object.keys(RAW_TEST_STATUSES)) {
  if (!id.startsWith('test.')) throw new Error(`statuses.ts: '${id}' is not a test.* row — status rows are Codex content, authored in content/settled.json`)
}
const PACK_STATUSES = packStatuses()
for (const id of Object.keys(RAW_TEST_STATUSES)) if (PACK_STATUSES[id]) throw new Error(`statuses.ts: '${id}' is in the pack AND hand-typed — one owner only`)
export const STATUSES = omitDisabled({ ...PACK_STATUSES, ...RAW_TEST_STATUSES })
