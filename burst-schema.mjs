// Authored JSON burst validation. The publication gate also loads every row
// through the engine's strict runtime decoder; neither layer drops fields.
export function validateBurst(b) {
  const object = (x, keys) => {
    if (!x || typeof x !== 'object' || Array.isArray(x) || Object.keys(x).some(k => !keys.includes(k))) throw Error('Invalid burst object');
  };
  const integer = (x, min = 0, max = 1000000) => Number.isSafeInteger(x) && x >= min && x <= max;
  object(b, ['shape', 'side', 'requireTags', 'packets', 'heal', 'destroy', 'paints', 'sideStats']);
  object(b.shape, ['kind', 'radius']);
  if (b.shape.kind === 'arc') { if ('radius' in b.shape) throw Error('Invalid burst arc radius'); }
  else if (b.shape.kind !== 'radius' || !integer(b.shape.radius, 0, 100)) throw Error('Invalid burst shape');
  if (!['ally', 'enemy', 'any'].includes(b.side)) throw Error('Invalid burst side');
  if (b.requireTags !== undefined && (!Array.isArray(b.requireTags) || b.requireTags.length > 32 || b.requireTags.some(t => typeof t !== 'string' || !t) || new Set(b.requireTags).size !== b.requireTags.length)) throw Error('Invalid burst tags');
  if (!Array.isArray(b.packets) || b.packets.length > 32) throw Error('Invalid burst packets');
  const ids = new Set();
  for (const p of b.packets) {
    object(p, ['id', 'damageType', 'amount', 'stat', 'statMult', 'powerScale']);
    // engine capability.raise-lower-magic (2026-10-05): the packet's stat counted a whole number of times ("Magic x 3")
    if (p.statMult !== undefined && (!integer(p.statMult, 2, 100) || p.stat === undefined)) throw Error('Invalid burst stat multiple');
    if (typeof p.id !== 'string' || !/^[a-z][a-z0-9.-]*$/.test(p.id) || ids.has(p.id)) throw Error('Invalid burst packet ID');
    ids.add(p.id);
    if (!['physical', 'magic', 'fire', 'poison', 'shadow', 'true'].includes(p.damageType) || !integer(p.amount, -1000000)) throw Error('Invalid burst damage');
    if (p.stat !== undefined && !['strength', 'precision', 'magic', 'spirit'].includes(p.stat)) throw Error('Invalid burst stat');
    if (p.powerScale !== undefined && (!Number.isFinite(p.powerScale) || p.powerScale < 0 || p.powerScale > 1)) throw Error('Invalid burst Power share');
  }
  if (b.heal !== undefined && !integer(b.heal)) throw Error('Invalid burst healing');
  // v2.prop-destroy (COMBAT-V2-DESIGN section 12.2): steps to every prop touching the shape.
  if (b.destroy !== undefined && !integer(b.destroy, 0, 1000)) throw Error('Invalid burst Destroy');
  // engine capability.burst-paints-ground (2026-10-04): the ground layer the burst leaves on the hexes of its shape.
  // A layer id here; which layers exist is the engine's vocabulary, checked where the pack is compiled (mkenginepack.mjs).
  if (b.paints !== undefined && (typeof b.paints !== 'string' || !/^layer\.[a-z][a-z-]*$/.test(b.paints))) throw Error('Invalid burst ground layer');
  // engine capability.raise-lower-magic (2026-10-05): what using the burst does to a side's party stats — the Magic or Spirit of
  // the caster's own side or the other, or the enemy side's Power (which names no side) — by a whole number, for the rest of
  // the Battle or until a Turn ends.
  if (b.sideStats !== undefined) {
    if (!Array.isArray(b.sideStats) || !b.sideStats.length || b.sideStats.length > 8) throw Error('Invalid burst side stats');
    for (const c of b.sideStats) {
      object(c, ['stat', 'side', 'value', 'until']);
      if (!['magic', 'spirit', 'power'].includes(c.stat) || (c.stat === 'power' ? c.side !== undefined : !['own', 'enemy'].includes(c.side))) throw Error('Invalid burst side stat');
      if (!Number.isSafeInteger(c.value) || c.value === 0 || !['battle', 'endOfTurn', 'endOfNextTurn'].includes(c.until)) throw Error('Invalid burst side stat change');
    }
  }
  if (!b.packets.length && b.heal === undefined) throw Error('Burst has no payload');
  return structuredClone(b);
}
