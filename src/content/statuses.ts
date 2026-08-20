// The status registry. Explicit object, never decorators — greppability and
// deterministic load order both matter (Law 6).

import type { StatusDef } from '../core/status.js'
import { statusDamage } from '../core/status.js'
import { omitDisabled } from './disable.js'

// PUBLISHED SOURCE: `1-EFFECTS-SETTLED.md` § status.*
// Only ids published there may appear in this file. `status.burn` was implemented
// here and removed on 2026-08-14 — that document says outright it "is not yet
// shaped, so do not reference it from another session yet", and it was referenced.
const RAW_STATUSES: Readonly<Record<string, StatusDef>> = {
  // Shapes are a checklist, not a branch — see StatusDef. What differs between
  // these is only which hooks each one declares.
  'status.poison': {
    id: 'status.poison', name: 'Poison', shape: 'pool', stacking: 'add',
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'status.poison'),
  },
}

// Kill-switch seam — identical object when CF_DISABLE_IDS is unset.
export const STATUSES = omitDisabled(RAW_STATUSES)
