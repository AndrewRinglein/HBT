/* Supplied presentation facts only. No range, floor, occupancy or shield rules. */
export function targetingFacts(value, positions) {
  const fail = () => { throw new Error('invalid targeting facts') }
  const object = (v, keys) => {
    if (!v || Object.getPrototypeOf(v) !== Object.prototype) fail()
    const names = Reflect.ownKeys(v)
    if (names.length !== keys.length || keys.some(k => !names.includes(k))) fail()
    if (names.some(k => !Object.hasOwn(Object.getOwnPropertyDescriptor(v, k), 'value'))) fail()
  }
  const array = v => {
    if (!Array.isArray(v) || Reflect.ownKeys(v).length !== v.length + 1) fail()
    for (let i = 0; i < v.length; i++) {
      const d = Object.getOwnPropertyDescriptor(v, String(i))
      if (!d || !Object.hasOwn(d, 'value')) fail()
    }
    return v
  }
  const hex = h => { if (!Number.isInteger(h) || h < 0 || !Object.hasOwn(positions, h)) fail(); return h }
  const hexes = a => { const out = array(a).map(hex); if (new Set(out).size !== out.length) fail(); return out }
  if (value === null) return null
  object(value, ['legalHexes', 'centre', 'hexes', 'shielded'])
  return { legalHexes: hexes(value.legalHexes), centre: value.centre === null ? null : hex(value.centre), hexes: hexes(value.hexes),
    shielded: array(value.shielded).map(row => {
      object(row, ['hex', 'props'])
      return { hex: hex(row.hex), props: array(row.props).map(p => { if (typeof p !== 'string' || !p.length) fail(); return p }) }
    }) }
}
