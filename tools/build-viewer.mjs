#!/usr/bin/env node
// Builds BATTLE-VIEWER.html — the standalone battle viewer as ONE self-contained
// page (double-click, offline): esbuild over src/main.js, with src/styles.css,
// generated/art/*, generated/static.json, generated/fields.json, the glyph
// sprite and battles/ inlined. The kingdom's pattern (tools/build-slice.mjs).
//
//   node tools/build-viewer.mjs [--out path]
//
// The gate runs verify.mjs on the result BEFORE it is moved into place: a page
// that does not fold every library battle end to end is never written over
// the last one that did. Generated output — never hand-edit BATTLE-VIEWER.html.
import { readFileSync, writeFileSync, readdirSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execSync, execFileSync } from 'node:child_process'
import { resolve, join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const esbuild = require('../../engine/node_modules/esbuild')
const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = resolve(HERE, '..')
process.chdir(PKG)
const outArg = process.argv.indexOf('--out')
if (outArg >= 0 && !process.argv[outArg + 1]) { console.error('build-viewer: --out needs a path'); process.exit(2) }
const OUT = outArg >= 0 ? resolve(process.argv[outArg + 1]) : join(PKG, 'BATTLE-VIEWER.html')

const sha = (dir) => { try { return execSync(`git -C "${dir}" rev-parse --short HEAD`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return 'unknown' } }
const dirty = (dir) => { try { return execSync(`git -C "${dir}" status --porcelain`, { encoding: 'utf8' }).trim().length > 0 } catch { return false } }

/* ── the inputs ──────────────────────────────────────────────────────── */
const statics = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8'))
const glyphs = JSON.parse(readFileSync('generated/ra-glyphs.json', 'utf8'))
const manifest = JSON.parse(readFileSync('generated/art/manifest.json', 'utf8'))
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
/* inline exactly what the manifest lists — a file prep-art did not write this
   run is an orphan and fails the build rather than shipping forever */
const assets = {}
const onDisk = readdirSync('generated/art').filter(f => MIME[extname(f)])
const orphans = onDisk.filter(f => !manifest.files.includes(f))
if (orphans.length) throw new Error(`generated/art holds files the manifest does not list: ${orphans.join(', ')} — rerun tools/prep-art.py`)
for (const f of manifest.files) {
  if (!MIME[extname(f)]) continue
  if (!existsSync(join('generated/art', f))) throw new Error(`manifest lists ${f}, missing from generated/art — rerun tools/prep-art.py`)
  assets[f] = `data:${MIME[extname(f)]};base64,${readFileSync(join('generated/art', f)).toString('base64')}`
}
for (const [tid, a] of Object.entries(manifest.artmap)) {
  if (!assets[a.token]) throw new Error(`artmap ${tid}: token ${a.token} is not an inlined asset`)
  if (a.card && !assets[a.card]) throw new Error(`artmap ${tid}: card ${a.card} is not an inlined asset`)
}
if (!manifest.artmap._pending) throw new Error('artmap has no _pending standee — rerun tools/prep-art.py')
const library = JSON.parse(readFileSync('battles/library.json', 'utf8'))
const battles = library.battles.map(({ file, label }) => ({ label, battle: JSON.parse(readFileSync(join('battles', file), 'utf8')) }))
for (const b of battles) {
  if (!fields[b.battle.seed.mapId]) throw new Error(`${b.label}: no field for ${b.battle.seed.mapId} in generated/fields.json`)
}
/* the stylesheet: url(art/x) → the inlined asset */
let css = readFileSync('src/styles.css', 'utf8').replace(/url\(["']?art\/([^"')]+)["']?\)/g, (m, f) => {
  if (!assets[f]) throw new Error(`styles.css references art/${f}, not in generated/art/`)
  return `url("${assets[f]}")`
})
/* the engine's state is measured NOW, not copied from the dump; the dumps
   carry their own stamps and verify checks they agree with the engine */
const engineNow = { commit: sha(resolve(PKG, '../engine')), dirty: dirty(resolve(PKG, '../engine')) }
const stamp = {
  viewer: sha(PKG), viewerDirty: dirty(PKG),
  engine: engineNow.commit, engineDirty: engineNow.dirty,
  staticEngine: statics.engineCommit, staticDirty: !!statics.engineDirty,
  fieldsEngine: fields._engine ? fields._engine.commit : 'unstamped', fieldsDirty: !!(fields._engine && fields._engine.dirty),
  /* no build timestamp (PLAYBACK-DESIGN §9): the same sources build the same
     bytes, so "is the page current" is `git diff --quiet BATTLE-VIEWER.html` */
  battles: battles.map(b => `${b.label}@${b.battle.engineCommit}`),
}

/* ── the bundle ──────────────────────────────────────────────────────── */
const { outputFiles, warnings } = esbuild.buildSync({
  entryPoints: ['src/main.js'], bundle: true, write: false, format: 'iife', target: 'es2022',
  minify: false, legalComments: 'none', logLevel: 'silent',
  define: {
    __BUNDLED_STATIC__: JSON.stringify({ units: statics.units, statuses: statics.statuses, maps: statics.maps, engineCommit: statics.engineCommit,
      /* `actions` is the ONE registry (§11) — a grant of any kind resolves there — and `badges` the
         badge table (§12). The `attacks`/`abilities` views are a PROVEN SUBSET of `actions` and were
         shipped unread for a day: 155 KB of the page for nothing (REVIEW §D9, 2026-09-04). */
      actions: statics.actions, badges: statics.badges,
      layers: statics.layers, hexDist: statics.hexDist }),
    __BUNDLED_FIELDS__: JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith('_')))),
    __BUNDLED_ART__: JSON.stringify({ artmap: manifest.artmap, assets }),
    __BUNDLED_BATTLES__: JSON.stringify(battles),
    __BUNDLED_GLYPHS__: JSON.stringify(glyphs),
    __BUNDLED_STAMP__: JSON.stringify(stamp),
  },
})
for (const w of warnings) console.warn('esbuild:', w.text)
const bundle = outputFiles[0].text
const stampLine = `viewer ${stamp.viewer}${stamp.viewerDirty ? '*' : ''} · engine ${stamp.engine}${stamp.engineDirty ? '*' : ''}` +
  ` · sheets ${stamp.staticEngine}${stamp.staticDirty ? '*' : ''} · fields ${stamp.fieldsEngine}${stamp.fieldsDirty ? '*' : ''} · ${battles.length} battles` +
  (stamp.viewerDirty || stamp.engineDirty || stamp.staticDirty || stamp.fieldsDirty ? ' · * = from a dirty tree' : '')
const page = `<!-- GENERATED by viewer/tools/build-viewer.mjs — never hand-edit. ${stampLine} -->\n` +
  readFileSync('src/page.html', 'utf8').replace('__CSS__', () => css).replace('__STAMP__', stampLine).replace('__BUNDLE__', () => bundle)

/* ── verify before the page is written into place ─────────────────────── */
mkdirSync('.build', { recursive: true })
const tmp = join(PKG, '.build', 'BATTLE-VIEWER.candidate.html')
writeFileSync(tmp, page)
try {
  execFileSync('node', ['tools/verify.mjs', tmp], { stdio: 'inherit' })
} catch (e) {
  console.error(`build-viewer: verify FAILED — ${OUT} left untouched; the candidate is at ${tmp}`)
  process.exit(1)
}
try { renameSync(tmp, OUT) } catch (e) { if (e.code === 'EXDEV') { writeFileSync(OUT, readFileSync(tmp)); } else throw e }
console.log(`built ${OUT} · ${(page.length / 1048576).toFixed(1)} MB · ${stampLine}`)
