// map.opening-six (engine backlog, 2026-09-28): the opening's six battle maps, compiled from
// their per-hex ground letters into shipping map rows. ONE compile path for all six — the
// letter grid in assets/battle-atlas/opening-ground-proposal-2026-09-28.json, as checked by
// Andrew on the Abbotown Ground Check with the same night's corrections (engine DECISIONS.md
// 2026-09-28: "the opening's maps: whole size, the painted gate, ground types by letter";
// "cursed ground gives Weak; the cave mouth; bank boulders; which rivers are deep"; no
// cut-off passable hex). Writes gen/opening-maps.json; assemble.mjs appends its maps to the
// shipping lane (gen/maps.json) and mkenginepack ships them like every other map row.
//
//   node mkopeningmaps.mjs            write gen/opening-maps.json
//   node mkopeningmaps.mjs --check    exit 1 if gen/opening-maps.json is stale
//
// Letter → engine (the letters the engine already has pass through unchanged):
//   . f u w r n H W T x   the same glyph (open, woodland, undergrowth, water, rocky, ruins,
//                         house, wall, tower, cliff/obstacle)
//   F X                   'x' — a high obstacle (the engine's x shorthand: open ground plus a
//                         high material-3 prop). Dense forest and high obstacles alike.
//   B                     '.' — the bridge deck is open ground (atlasBridgeOpen)
//   c                     '.' plus a LOW prop on that hex (low cover)
//   ~                     'w' with no floor — deep water: nobody stands in it or paths through
//                         it (the V2 floor mask); it is still water, so it blocks no sight
//   *                     '.' — cursed ground is the painted layer.weak (DECISIONS.md
//                         2026-09-28 "cursed ground is layer.weak"); a map carries no layers,
//                         so the hexes are listed under `cursed` for the encounter to paint
//                         at setup, as Rime paints frost (engine SWITCHES.md openingCursedPaint)
import fs from 'node:fs';
import { compileMaps } from './map-schema.mjs';

const SOURCE = '../assets/battle-atlas/opening-ground-proposal-2026-09-28.json';
const OUT = 'gen/opening-maps.json';
// The proposal's keys are its own; the ids are the backlog item's (map.opening.<key>).
const ID = { orphanage: 'map.opening.orphanage', lumberjack: 'map.opening.lumberjack', bridge: 'map.opening.bridge',
  cave: 'map.opening.cavern-trail', gates: 'map.opening.gates', cathedral: 'map.opening.cathedral' };
const PASS = new Set(['.', 'f', 'u', 'w', 'r', 'n', 'H', 'W', 'T', 'x']);
const HIGH = new Set(['F', 'X']);
// engine SWITCHES.md openingPanelDeploy: the edges a ROLLED battle on the map (the map panel,
// the control battles, the probe) deploys on. The encounters place their own heroes and enemies
// (the backlog note: "hero start hexes are the encounters', not the map's"). Absent = the ruled
// default, heroes west and enemies east. Gates and Cathedral are walked south to north; the
// Lumberjack House's west edge has five passable hexes and the standard six heroes need six.
const DEPLOY = { lumberjack: { hero: 'south', enemy: 'east' }, gates: { hero: 'south', enemy: 'north' }, cathedral: { hero: 'south', enemy: 'north' } };
// engine SWITCHES.md openingCoverMaterial: the letter grid does not say what each low cover is
// made of (a fence, a boulder, a pew all read 'c'), so every one is the middle tier.
const COVER_MATERIAL = 2;

export function compileLetterGrid(m) {
  const id = ID[m.key];
  if (!id) throw new Error(`opening maps: no id for proposal key '${m.key}'`);
  const rows = m.rows_letters;
  if (!Array.isArray(rows) || rows.length !== m.rows || rows.some((r) => r.length !== m.cols)) throw new Error(`${id}: the letter grid is not ${m.cols}x${m.rows}`);
  const out = [], props = [], floor = [], cursed = [];
  let deep = 0;
  rows.forEach((line, r) => {
    let row = '';
    [...line].forEach((ch, c) => {
      const hex = r * m.cols + c;
      let glyph;
      if (PASS.has(ch)) glyph = ch;
      else if (HIGH.has(ch)) glyph = 'x';
      else if (ch === 'B') glyph = '.';
      else if (ch === 'c') { glyph = '.'; props.push({ id: `prop.cover.${hex}`, footprint: { kind: 'hex', hexes: [hex] }, height: 'low', material: COVER_MATERIAL }); }
      else if (ch === '~') { glyph = 'w'; deep++; }
      else if (ch === '*') { glyph = '.'; cursed.push(hex); }
      else throw new Error(`${id}: letter '${ch}' at (${c},${r}) is not in the proposal's legend`);
      row += glyph; floor.push(ch !== '~');
    });
    out.push(row);
  });
  const note = `The opening, battle ${m.battle}: ${m.name}, ${m.cols}x${m.rows}. Compiled by content/mkopeningmaps.mjs from the per-hex ground letters in assets/battle-atlas/opening-ground-proposal-2026-09-28.json (checked by Andrew on the Abbotown Ground Check, engine DECISIONS.md 2026-09-28). Scene: ${m.file}.`;
  return { row: { id, name: m.name, note, rows: out, ...(DEPLOY[m.key] ? { deploy: DEPLOY[m.key] } : {}), ...(props.length ? { props } : {}), ...(deep ? { floor } : {}) }, cursed };
}

export function buildOpeningMaps(source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))) {
  const maps = [], cursed = {};
  for (const m of source.maps) {
    const { row, cursed: hexes } = compileLetterGrid(m);
    maps.push(row);
    if (hexes.length) cursed[row.id] = hexes;
  }
  compileMaps(maps); // the same schema the pack compiles with — refuse here, not later
  return {
    _note: 'GENERATED by content/mkopeningmaps.mjs from assets/battle-atlas/opening-ground-proposal-2026-09-28.json — never hand-edit; re-run it. assemble.mjs appends `maps` to the shipping lane. `cursed` is each map\'s cursed ground (the letter *), hex ids row x width + col, for the encounter to paint as layer.weak at setup.',
    maps, cursed,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('mkopeningmaps.mjs')) {
  const text = JSON.stringify(buildOpeningMaps(), null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== text) { console.error(`${OUT} is stale — run node mkopeningmaps.mjs`); process.exit(1); }
    console.log(`${OUT} current`);
  } else { fs.writeFileSync(OUT, text); console.log(`wrote ${OUT}`); }
}
