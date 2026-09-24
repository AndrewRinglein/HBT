// v2.loadout (2026-09-24), Law 10: fielding now names item instances — `instanceId` on
// unit.equipped, `stowed` on unit.enter, `loadout` on a hero. Metadata only: it draws no
// cup and changes no number. Historical fixtures stay immutable; this projection removes
// exactly those three fields and nothing else, and the full current streams are frozen
// separately (fixtures/battle-cursor-loadout.json) so both are checked.
export function projectLoadout<T extends { events: readonly any[]; state: any }>(ctx: T): { events: T['events']; state: T['state'] } {
  const events = ctx.events.map((e) => {
    if (e.type !== 'unit.equipped' && e.type !== 'unit.enter') return e
    const row = structuredClone(e)
    delete row.instanceId
    delete row.stowed
    return row
  })
  const state = structuredClone(ctx.state)
  for (const u of state.units) delete u.loadout
  return { events: events as T['events'], state }
}
