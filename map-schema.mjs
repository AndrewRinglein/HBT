// V2 authored boards. Presets are labels, not the list of legal dimensions.
export const MAX_BOARD_CELLS = 10000;
export const FORMAT_OF = Object.freeze({ '8x8': 'duel', '16x8': 'dungeon', '16x16': 'standard', '24x24': 'horde' });
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
  if (row.rows.some(r => !/^[.hfrRwxbp]+$/.test(r))) throw new Error(`maps ${row.id}: glyph outside MAP-01 legend`);
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
    out[row.id] = { id: row.id, name: row.name, board, format: FORMAT_OF[`${board.width}x${board.height}`] ?? `${board.width}x${board.height}`, rows: row.rows, ...(row.deploy ? { deploy: row.deploy } : {}) };
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
