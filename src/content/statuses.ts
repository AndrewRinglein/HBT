// The status registry. Explicit object, never decorators — greppability and
// deterministic load order both matter (Law 6).

import type { StatusDef } from '../core/status.js'
import { heal, statusDamage } from '../core/status.js'

export const STATUSES: Readonly<Record<string, StatusDef>> = {
  'status.poison': {
    id: 'status.poison', name: 'Poison', shape: 'counter', stacking: 'add',
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'status.poison'),
  },
}
