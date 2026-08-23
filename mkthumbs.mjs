// mkthumbs.mjs — regenerate art/manifest.json and the thumbnails the Codex inlines.
//
// The manifest had 297 entries, every `src` pointing at a hell-tcg path, and ZERO entries for
// hero.base.* — so the 24 Eve heroes, which have the most complete art in the repo (4 levels,
// 4 afflictions, animation and 24 hex cutouts each), rendered as nothing at all in the Codex.
// It had been generated once and never regenerated, so it could not know about anything that
// arrived afterwards. Written 2026-08-22.
//
//   node mkthumbs.mjs           report what it would build
//   node mkthumbs.mjs --write   build the thumbs and rewrite the manifest
//
// One entry per hero, holding every VARIANT it owns, so the Codex can show a hero at each of
// its four levels and each of its four afflictions rather than one picture and a path.
// Thumbs are deliberately small: they are base64-inlined into a single self-contained file.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import crypto from 'crypto';

const WRITE = process.argv.includes('--write');
// ImageMagick is how thumbs get made. If it is absent this must SKIP rather than break the
// build - the manifest and the thumbs are both checked in, so a machine without convert can
// still build the Codex from what is already there.
try { execFileSync('convert', ['-version'], { stdio:'pipe' }); }
catch { console.log('mkthumbs: ImageMagick not found - skipping. The checked-in manifest and thumbs are used as they are.'); process.exit(0); }
const CARD_W = 150;          // card art in the hero grid
const HEX_W  = 110;          // hex token
const QUALITY = 72;

const D = JSON.parse(fs.readFileSync('hbt-content.json', 'utf8'));
const heroes = D.heroes.heroes;
const OUT = 'art/thumbs/';
if (WRITE) fs.mkdirSync(OUT, { recursive: true });

const AFF_ORDER = ['lycanthropy', 'possession', 'rotting-flesh', 'vampirism'];
const label = p => {
  const b = path.basename(p).replace(/\.[^.]+$/, '');
  const m = b.match(/^l([1-4])(_|$)/);
  if (m) return 'Level ' + m[1];
  return b.replace(/_(256|1024|full)$/, '').replace(/-/g, ' ');
};

// Collect the variants a hero owns, in a stable reading order.
function variantsOf(h) {
  const v = [];
  const seen = new Set();
  const push = (kind, src) => {
    if (!src || seen.has(src) || !fs.existsSync('../' + src)) return;
    seen.add(src); v.push({ kind, label: label(src), src });
  };
  for (const p of (h.levelArt || [])) push('level', p);
  if (!(h.levelArt || []).length) push('level', h.art);
  for (const a of AFF_ORDER) if (h.afflictionArt && h.afflictionArt[a]) push('affliction', h.afflictionArt[a]);
  // hex: one token per variant, at the smallest size — three sizes of the same picture is
  // three copies of one thumbnail, and the Codex only ever needs the small one.
  for (const p of (h.hexArt || [])) if (/_256\./.test(p)) push('hex', p);
  return v;
}

let built = 0, reused = 0, failed = [];
const manifest = {};
const existing = new Set(fs.existsSync(OUT) ? fs.readdirSync(OUT) : []);

for (const h of heroes) {
  const vs = variantsOf(h);
  if (!vs.length) continue;
  const rows = [];
  for (const v of vs) {
    const abs = '../' + v.src;
    const w = v.kind === 'hex' ? HEX_W : CARD_W;
    // name the thumb by what went into it, so a rebuild is a no-op and a changed source
    // produces a new file rather than silently reusing a stale one
    const stat = fs.statSync(abs);
    const key = crypto.createHash('sha1')
      .update(v.src + '|' + stat.size + '|' + w + '|' + QUALITY).digest('hex').slice(0, 12);
    const file = key + '.webp';
    if (!existing.has(file)) {
      if (WRITE) {
        try {
          execFileSync('convert', [abs, '-resize', w + 'x', '-quality', String(QUALITY), OUT + file],
                       { stdio: 'pipe' });
          existing.add(file); built++;
        } catch (e) { failed.push(v.src); continue; }
      } else built++;
    } else reused++;
    rows.push({ kind: v.kind, label: v.label, thumb: file, src: v.src });
  }
  if (rows.length) manifest[h.id] = { thumb: rows[0].thumb, src: rows[0].src, how: 'local art tree', variants: rows };
}

// ---- keep the legacy thumbnails. The old manifest mapped 297 heroes to thumbs generated
// from hell-tcg art long before that art was cut. The SOURCES are gone, but the thumbnail
// FILES are still here, so those heroes can keep their picture in the Codex — dropping them
// would trade one regression (no art) for another (261 heroes lose the one they had).
// A legacy entry is marked, and any hero with local art overrides it completely.
{
  const legacyPath = 'gen/art-manifest-hell-tcg-2026-08-22.json.bak';
  if (fs.existsSync(legacyPath)) {
    const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    let kept = 0, orphaned = 0;
    const live = new Set(heroes.map(h => h.id));
    let dead = 0;
    for (const [id, row] of Object.entries(legacy)) {
      if (manifest[id]) continue;                       // local art wins outright
      // ids for heroes that no longer exist - the 106 duplications of art removed earlier.
      // A manifest entry for a hero that is gone is the same dead reference we just spent a
      // commit cutting.
      if (!live.has(id)) { dead++; continue; }
      if (!row.thumb || !existing.has(row.thumb)) { orphaned++; continue; }
      manifest[id] = { thumb: row.thumb, src: null, how: 'legacy thumbnail — its hell-tcg source was cut 2026-08-22, the picture survives',
                       legacy: true, variants: [{ kind: 'level', label: 'Level 1', thumb: row.thumb, src: null }] };
      kept++;
    }
    console.log('legacy thumbnails kept: ' + kept + (orphaned ? ', ' + orphaned + ' had no thumb file' : '') + (dead ? ', ' + dead + ' named a hero that no longer exists' : ''));
  }
}

if (WRITE) {
  try { fs.rmSync('art/manifest.json', { force: true }); } catch {}
  fs.writeFileSync('art/manifest.json', JSON.stringify(manifest, null, 1) + '\n');
  const bytes = Object.values(manifest).flatMap(m => m.variants).reduce((n, r) => {
    try { return n + fs.statSync(OUT + r.thumb).size; } catch { return n; } }, 0);
  console.log('art/manifest.json rewritten — ' + Object.keys(manifest).length + ' heroes, ' +
              Object.values(manifest).reduce((n, m) => n + m.variants.length, 0) + ' variants, ' +
              (bytes / 1048576).toFixed(2) + ' MB of thumbs');
} else {
  console.log('DRY RUN — nothing written. Re-run with --write\n');
}
const kinds = {};
for (const m of Object.values(manifest)) for (const r of m.variants) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
console.log('heroes with art : ' + Object.keys(manifest).length + ' of ' + heroes.length);
console.log('variants        : ' + JSON.stringify(kinds));
console.log('thumbs          : ' + built + ' to build, ' + reused + ' already present');
if (failed.length) console.log('FAILED to convert ' + failed.length + ': ' + failed.slice(0, 5).join(', '));
