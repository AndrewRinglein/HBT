// Authored JSON burst validation. The publication gate also loads every row
// through the engine's strict runtime decoder; neither layer drops fields.
export function validateBurst(b) {
  const object = (x, keys) => {
    if (!x || typeof x !== 'object' || Array.isArray(x) || Object.keys(x).some(k => !keys.includes(k))) throw Error('Invalid burst object');
  };
  const integer = (x, min = 0, max = 1000000) => Number.isSafeInteger(x) && x >= min && x <= max;
  object(b, ['shape', 'side', 'requireTags', 'packets', 'heal']);
  object(b.shape, ['kind', 'radius']);
  if (b.shape.kind === 'arc') { if ('radius' in b.shape) throw Error('Invalid burst arc radius'); }
  else if (b.shape.kind !== 'radius' || !integer(b.shape.radius, 0, 100)) throw Error('Invalid burst shape');
  if (!['ally', 'enemy', 'any'].includes(b.side)) throw Error('Invalid burst side');
  if (b.requireTags !== undefined && (!Array.isArray(b.requireTags) || b.requireTags.length > 32 || b.requireTags.some(t => typeof t !== 'string' || !t) || new Set(b.requireTags).size !== b.requireTags.length)) throw Error('Invalid burst tags');
  if (!Array.isArray(b.packets) || b.packets.length > 32) throw Error('Invalid burst packets');
  const ids = new Set();
  for (const p of b.packets) {
    object(p, ['id', 'damageType', 'amount', 'stat', 'powerScale']);
    if (typeof p.id !== 'string' || !/^[a-z][a-z0-9.-]*$/.test(p.id) || ids.has(p.id)) throw Error('Invalid burst packet ID');
    ids.add(p.id);
    if (!['physical', 'magic', 'fire', 'poison', 'shadow', 'true'].includes(p.damageType) || !integer(p.amount, -1000000)) throw Error('Invalid burst damage');
    if (p.stat !== undefined && !['strength', 'precision', 'magic', 'spirit'].includes(p.stat)) throw Error('Invalid burst stat');
    if (p.powerScale !== undefined && (!Number.isFinite(p.powerScale) || p.powerScale < 0 || p.powerScale > 1)) throw Error('Invalid burst Power share');
  }
  if (b.heal !== undefined && !integer(b.heal)) throw Error('Invalid burst healing');
  if (!b.packets.length && b.heal === undefined) throw Error('Burst has no payload');
  return structuredClone(b);
}
