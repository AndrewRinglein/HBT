// The status registry. Explicit object, never decorators — greppability and
// deterministic load order both matter (Law 6).

import type { StatusDef } from '../core/status.js'
import { heal, statusDamage } from '../core/status.js'

export const STATUSES: Readonly<Record<string, StatusDef>> = {
  'status.burn': {
    id: 'status.burn', name: 'Burn', shape: 'counter', stacking: 'add',
    halvesHealing: true,
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'status.burn'),
  },
  'status.poison': {
    id: 'status.poison', name: 'Poison', shape: 'counter', stacking: 'add',
    onPhaseEnd: (ctx, unitId, value) => statusDamage(ctx, unitId, value, 'status.poison'),
  },
}
