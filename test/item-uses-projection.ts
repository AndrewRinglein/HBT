// v2.item-uses (2026-09-24), Law 10: uses are counted by item instance. For a fielding
// that carries at most one instance per power (every older case) no number moves; the
// new facts are metadata — `itemUses` on a unit, `instanceId`/`itemId`/`instanceLeft` on
// charge.spent, `spent` on unit.enter, `itemUses` on the result. This projection removes
// exactly those and nothing else; the full current streams are frozen separately
// (fixtures/battle-cursor-item-uses.json) so both are checked.
export function projectItemUses<T extends { events: readonly any[]; state: any }, R>(ctx: T, result: R): { events: T['events']; state: T['state']; result: R } {
  const events = ctx.events.map((e) => {
    if (e.type === 'charge.spent' && 'instanceId' in e) { const row = structuredClone(e); delete row.instanceId; delete row.itemId; delete row.instanceLeft; return row }
    if (e.type === 'unit.enter' && 'spent' in e) { const row = structuredClone(e); delete row.spent; return row }
    return e
  })
  const state = structuredClone(ctx.state)
  for (const u of state.units) delete u.itemUses
  const r = structuredClone(result) as any
  if (r && typeof r === 'object') delete r.itemUses
  return { events: events as T['events'], state, result: r as R }
}
