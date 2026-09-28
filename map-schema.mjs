// V2 authored boards. Presets are labels, not the list of legal dimensions.
export const MAX_BOARD_CELLS = 10000;
export const FORMAT_OF = Object.freeze({ '8x8': 'duel', '16x8': 'dungeon', '16x16': 'standard', '24x24': 'horde' });
export function validateProps(value, cells) {
  const record = (v, keys) => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) throw new Error('props: expected plain record');
    for (const key of Reflect.ownKeys(v)) if (typeof key !== 'string' || !keys.includes(key) || !('value' in Object.getOwnPropertyDescriptor(v, key))) throw new Error('props: unsupported field or accessor');
  };
  const dense = (v, max) => {
    if (!Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype || v.length > max || Reflect.ownKeys(v).length !== v.length + 1) throw new Error('props: expected bounded dense array');
    for (let i = 0; i < v.length; i++) if (!Object.getOwnPropertyDescriptor(v, String(i))?.hasOwnProperty('value')) throw new Error('props: array accessors or holes');
  };
  dense(value, MAX_BOARD_CELLS);
  const ids = new Set(), out = []; let references = 0;
  for (const p of value) {
    record(p, ['id', 'footprint', 'height', 'material', 'collisionValue', 'consumes']);
    if (typeof p.id !== 'string' || !/^prop\.[a-z0-9.-]+$/.test(p.id) || p.id.startsWith('prop.obstacle.') || ids.has(p.id)) throw new Error('props: invalid, duplicate or reserved ID');
    ids.add(p.id);
    // map.opening-six (2026-09-28): a LOW prop on a full hex is low cover (the riverbank
    // boulders, ruled 2026-09-28; the engine has read low props since v2.low-cover). Only a
    // high prop takes collisionValue or consumes — the engine's own rule (core/props.ts).
    if (!['high', 'low'].includes(p.height) || ![1, 2, 3].includes(p.material)) throw new Error('props: unsupported height or material');
    if (p.height === 'low' && ('collisionValue' in p || 'consumes' in p)) throw new Error('props: collisionValue and consumes belong to a high prop');
    // v2.knockback-collisions (COMBAT-V2-DESIGN-2026-09-07 section 9.3, ruled 2026-09-07):
    // what a push stopped by this prop costs the mover per remaining point (absent = a
    // basic obstruction's 2, the engine's), and whether it consumes a unit the collision kills.
    if ('collisionValue' in p && (!Number.isSafeInteger(p.collisionValue) || p.collisionValue < 0 || p.collisionValue > 100)) throw new Error('props: collisionValue must be an integer 0..100');
    if ('consumes' in p && p.consumes !== true) throw new Error('props: consumes is true or absent');
    record(p.footprint, ['kind', 'hexes']);
    if (p.footprint.kind !== 'hex') throw new Error('props: only full hex footprints are built');
    dense(p.footprint.hexes, cells);
    if (!p.footprint.hexes.length || (references += p.footprint.hexes.length) > MAX_BOARD_CELLS) throw new Error('props: empty or excessive footprint');
    const seen = new Set();
    for (const h of p.footprint.hexes) {
      if (!Number.isSafeInteger(h) || h < 0 || h >= cells || seen.has(h)) throw new Error('props: invalid or repeated footprint hex');
      seen.add(h);
    }
    out.push({ id: p.id, footprint: { kind: 'hex', hexes: [...p.footprint.hexes] }, height: p.height, material: p.material, ...('collisionValue' in p ? { collisionValue: p.collisionValue } : {}), ...(p.consumes === true ? { consumes: true } : {}) });
  }
  return out;
}
/** The V2 floor mask (engine AuthoredMap.floor): one boolean per cell, true where a unit may stand. */
export function validateFloor(value, cells, id) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== cells || Reflect.ownKeys(value).length !== cells + 1 || value.some(x => typeof x !== 'boolean')) throw new Error(`maps ${id}: floor must be one boolean per cell`);
  if (!value.includes(false)) throw new Error(`maps ${id}: a floor with no gap says nothing — leave it off`);
  return [...value];
}
export function validBoard(board) {
  return board !== null && typeof board === 'object' && !Array.isArray(board)
    && Number.isSafeInteger(board.width) && board.width > 0 && board.width <= MAX_BOARD_CELLS
    && Number.isSafeInteger(board.height) && board.height > 0 && board.height <= MAX_BOARD_CELLS
    && board.width * board.height <= MAX_BOARD_CELLS;
}
export function validateMap(row, testing = false) {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !new RegExp(testing ? '^test\\.map\\.[a-z0-9.-]+$' : '^map\\.[a-z0-9.-]+$').test(row.id)) throw new Error(`maps: invalid ${testing ? 'TEST' : 'shipping'} id ${row?.id}`);
  if (typeof row.name !== 'string' || !row.name.trim()) throw new Error(`maps ${row.id}: missing name`);
  if (!Array.isArray(row.rows) || !row.rows.length || row.rows.some(r => typeof r !== 'string')) throw new Error(`maps ${row.id}: rows must be nonempty strings`);
  const board = { width: row.rows[0].length, height: row.rows.length };
  if (!validBoard(board)) throw new Error(`maps ${row.id}: board dimensions require positive safe integers and at most ${MAX_BOARD_CELLS} cells`);
  if (row.rows.some(r => r.length !== board.width)) throw new Error(`maps ${row.id}: rows are not rectangular`);
  if ('board' in row && (!validBoard(row.board) || row.board.width !== board.width || row.board.height !== board.height)) throw new Error(`maps ${row.id}: declared board differs from rows`);
  const size = `${board.width}x${board.height}`;
  if ('format' in row && row.format !== size) throw new Error(`maps ${row.id}: format must match rows ${size}`);
  // map.opening-six (2026-09-28): u n H W T — undergrowth, ruins, house, wall, tower — are
  // glyphs the engine already decodes (engine/src/content/terrain.ts GLYPH).
  if (row.rows.some(r => !/^[.hfrRwxbpunHWT]+$/.test(r))) throw new Error(`maps ${row.id}: glyph outside the map legend`);
  if ('floor' in row) validateFloor(row.floor, board.width * board.height, row.id);
  if (row.props !== undefined) {
    const props = validateProps(row.props, board.width * board.height);
    if (props.reduce((n, p) => n + p.footprint.hexes.length, 0) + row.rows.join('').split('x').length - 1 > MAX_BOARD_CELLS) throw new Error('props: total footprint references exceed limit');
  }
  if ('deploy' in row) {
    const edges = ['west', 'east', 'north', 'south'];
    if (!row.deploy || !edges.includes(row.deploy.hero) || !edges.includes(row.deploy.enemy) || row.deploy.hero === row.deploy.enemy) throw new Error(`maps ${row.id}: deploy requires two distinct edges`);
    if (!testing && row.deploy.hero === 'west' && row.deploy.enemy === 'east') throw new Error(`maps ${row.id}: declares DEFAULT deploy — leave it off`);
  }
  if (typeof row.note !== 'string' || !row.note.trim()) throw new Error(`maps ${row.id}: missing authoring note`);
  return board;
}
export function compileMaps(rows, testing = false) {
  if (!Array.isArray(rows)) throw new Error('maps: expected an array');
  const out = {};
  for (const row of rows) {
    const board = validateMap(row, testing);
    if (out[row.id]) throw new Error(`maps: duplicate ${row.id}`);
    out[row.id] = { id: row.id, name: row.name, board, format: FORMAT_OF[`${board.width}x${board.height}`] ?? `${board.width}x${board.height}`, rows: row.rows, ...(row.deploy ? { deploy: row.deploy } : {}), ...(row.props !== undefined ? { props: validateProps(row.props, board.width * board.height) } : {}), ...(row.floor !== undefined ? { floor: validateFloor(row.floor, board.width * board.height, row.id) } : {}) };
  }
  return out;
}
export function validateEncounterBoard(row, maps) {
  const board = row.board;
  if (!validBoard(board)) throw new Error(`encounters ${row.id}: invalid board dimensions (maximum ${MAX_BOARD_CELLS} cells)`);
  if (typeof row.map === 'string' && row.map !== 'none') {
    const linked = maps instanceof Map ? maps.get(row.map) : maps[row.map]?.board;
    if (!linked || linked.width !== board.width || linked.height !== board.height) throw new Error(`encounters ${row.id}: board differs from map ${row.map}`);
  }
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if ('col' in value && 'row' in value && (!Number.isSafeInteger(value.col) || !Number.isSafeInteger(value.row) || value.col < 0 || value.col >= board.width || value.row < 0 || value.row >= board.height)) throw new Error(`encounters ${row.id}: invalid board coordinate`);
    for (const [key, child] of Object.entries(value)) if (key !== 'col' && key !== 'row') walk(child);
  };
  walk(row.setup); walk(row.schedule); walk(row.heroZone);
  for (const paint of row.paint || []) for (const id of paint.hexes || []) if (!Number.isSafeInteger(id) || id < 0 || id >= board.width * board.height) throw new Error(`encounters ${row.id}: invalid paint hex`);
  return { width: board.width, height: board.height };
}
