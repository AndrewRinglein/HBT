// mkevepack.mjs — bring EVERY variation of the 24 Eve base heroes into the local art tree.
//
// The problem it fixes: content/gen/heroes.json declared art paths like `New Art/warrior-iron1.png`,
// which is a HELL-TCG path. Nothing in this repo resolves it — 187 base paths and 140 levelArt
// paths, none of which pointed at a file that exists here. Meanwhile the local tree
// art/heroes/<slug>/{card,hex,anim}/ held only l1 plus some afflictions, so the level-ups looked
// present in the data and were absent on disk. Found 2026-08-22.
//
//   node mkevepack.mjs           report what is missing, copy nothing
//   node mkevepack.mjs --copy    copy the missing files in
//
// Source naming (hell-tcg New Art flat root, per gen/art-conventions.json):
//   <slug>1..4          the four levels
//   <slug>l|p|r|v       lycanthropy | possession | rotting-flesh | vampirism
// Local naming:
//   art/heroes/<slug>/card/l1..l4.<ext> and card/<affliction>.<ext>
//   art/heroes/<slug>/anim/l1.mp4 etc.
//
// NEVER writes to the hell-tcg mount. It is a read-only source.

import fs from 'fs';
import path from 'path';

const SRC = (process.env.HELL_TCG || '../../hell-tcg').replace(/\/?$/, '/');
const NEW_ART = SRC + 'New Art/';
const ANIMS   = SRC + 'assets/animations/';
const DEST    = '../art/heroes/';
const COPY    = process.argv.includes('--copy');

const SLUGS = [
  'warrior-iron','warrior-fearsome','warrior-barbarian','warrior-brawler',
  'mage-fire','mage-fireaura','mage-thinking','mage-sexy',
  'priest-armored','priest-pauper','priest-robes','priest-scantily',
  'paladin-dark','paladin-hunk','paladin-shiney','paladin-smug',
  'ranger-aggressive','ranger-nature','ranger-ranger','ranger-scantily',
  'rogue-raven','rogue-rose','rogue-skull','rogue-snake',
];
const AFF = { l:'lycanthropy', p:'possession', r:'rotting-flesh', v:'vampirism' };

if (!fs.existsSync(NEW_ART)) { console.error('no New Art at ' + NEW_ART); process.exit(2); }
const flat = fs.readdirSync(NEW_ART).filter(f => /\.(png|jpe?g)$/i.test(f));
const anims = fs.existsSync(ANIMS) ? fs.readdirSync(ANIMS).filter(f => /\.mp4$/i.test(f)) : [];

const findFlat = stem => flat.find(f => new RegExp('^' + stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\.(png|jpe?g)$', 'i').test(f));
const ensure = d => { if (COPY) fs.mkdirSync(d, { recursive: true }); };

let want = 0, have = 0, copied = 0, absent = [];
const rows = [];

for (const slug of SLUGS) {
  const cardDir = path.join(DEST, slug, 'card');
  const animDir = path.join(DEST, slug, 'anim');
  const existing = fs.existsSync(cardDir) ? fs.readdirSync(cardDir) : [];
  const existingAnim = fs.existsSync(animDir) ? fs.readdirSync(animDir) : [];
  const row = { slug, levels: 0, affl: 0, anim: 0, added: [] };

  // four levels
  for (const n of [1, 2, 3, 4]) {
    want++;
    const src = findFlat(slug + n);
    if (!src) { absent.push(`${slug} level ${n} — not in New Art`); continue; }
    const ext = path.extname(src);
    const target = path.join(cardDir, `l${n}${ext}`);
    const already = existing.some(f => new RegExp(`^l${n}\\.`).test(f));
    if (already) { have++; row.levels++; continue; }
    ensure(cardDir);
    if (COPY) { fs.copyFileSync(path.join(NEW_ART, src), target); copied++; }
    row.added.push(`l${n}`); row.levels++;
  }

  // four afflictions
  for (const [k, name] of Object.entries(AFF)) {
    want++;
    const src = findFlat(slug + k);
    if (!src) { absent.push(`${slug} ${name} — not in New Art`); continue; }
    const ext = path.extname(src);
    const target = path.join(cardDir, `${name}${ext}`);
    const already = existing.some(f => f.startsWith(name + '.'));
    if (already) { have++; row.affl++; continue; }
    ensure(cardDir);
    if (COPY) { fs.copyFileSync(path.join(NEW_ART, src), target); copied++; }
    row.added.push(name); row.affl++;
  }

  // the level-1 animation, where one exists
  const a = anims.find(f => new RegExp('^' + slug + '1\\.mp4$', 'i').test(f));
  if (a) {
    want++;
    if (existingAnim.some(f => /^l1\.mp4$/i.test(f))) { have++; row.anim++; }
    else { ensure(animDir); if (COPY) { fs.copyFileSync(path.join(ANIMS, a), path.join(animDir, 'l1.mp4')); copied++; }
           row.added.push('anim l1'); row.anim++; }
  }
  rows.push(row);
}

console.log(COPY ? 'COPYING\n' : 'DRY RUN — nothing written. Re-run with --copy\n');
console.log('slug                 levels  afflictions  anim   added');
for (const r of rows)
  console.log('  ' + r.slug.padEnd(20) + `${r.levels}/4     ${r.affl}/4          ${r.anim}/1    ` +
              (r.added.length ? r.added.join(' ') : '—'));

console.log(`\nwanted ${want} files · already present ${have} · ${COPY ? 'copied' : 'to copy'} ${COPY ? copied : want - have}`);
if (absent.length) { console.log(`\nNOT IN THE SOURCE (${absent.length}):`); absent.forEach(a => console.log('  ! ' + a)); }
