#!/usr/bin/env python3
"""The heroes' card art for every screen that shows a hero's card or face — the draft,
the Who-goes page, Equip, the victory screen, the rewards screen and its carrier, the
level-up screen (SLICE.html's Equip screen first, G11) — the codex's `heroes[].art` (a
2:3 card portrait, ART-INVENTORY.md) downscaled into generated/art/ as hero-<slug>.jpg,
and listed in index.json under `heroes` by hero id. Run after prep-art.py (it extends
the same index.json). Pillow, like the other two; and node, to ask the kingdom who the
heroes are.

    python3 tools/prep-heroes.py [codex] [art-root]     default ../content/hbt-content.json  ../

Generated output. Never hand-edit generated/art/. A hero whose art is missing on disk
is listed in index.json `heroesMissing` and the page shows a blank card, never a wrong one.
"""
import json, sys, os, subprocess
from PIL import Image

HERE = os.path.dirname(__file__)
CODEX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'content', 'hbt-content.json')
ROOT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..')
OUT = os.path.join(HERE, '..', 'generated', 'art')
INDEX = os.path.join(OUT, 'index.json')
W, H = 320, 480   # the 2:3 card, full-size on the Equip screen — ~35 KB a hero

# Who gets a portrait is the kingdom's own answer, asked of its registry (src/content/heroes.ts) the way the kingdom
# reads it, so this tool never keeps a second list: every base hero the engine pack holds (baseHeroIdsOf - the draft
# pool, all 24), and the civilians the kingdom rescues (CIVILIANS, RESCUABLE_CIVILIANS).
# kingdom.opening-hero-card-art, 2026-10-03 (Andrew, engine/DECISIONS.md 'every draft card shows the hero's card art':
# "Card art for heroes 2 and 3 didn't come through when I was selecting heroes for the battle."): until then the ids
# were read off hero('...') literals in that file - which kingdom.opening-draft-pool replaced, for the pool, with the
# pack's rows - so only the old five-hero pool had portraits. The registry is TypeScript over the engine's pack, so it
# is bundled and asked by node (esbuild from engine/node_modules, as tools/opening-page.mjs does). No fallback: if the
# registry cannot be asked, this tool stops (GBH SWITCHES.md prepHeroes.asksTheRegistry).
ASK = """
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const esbuild=createRequire(pathToFileURL(process.cwd()+'/x').href)('../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:"export {baseHeroIdsOf,CIVILIANS,RESCUABLE_CIVILIANS} from './src/content/heroes.ts'",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const H=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
console.log(JSON.stringify({base:H.baseHeroIdsOf(),civilians:[...H.CIVILIANS,...H.RESCUABLE_CIVILIANS].map(h=>h.id)}))
"""
KINGDOM = os.path.join(HERE, '..')
subprocess.run(['node', os.path.join('..', 'engine', 'tools', 'engine-modules.mjs')], cwd=KINGDOM, check=True, stdout=subprocess.DEVNULL)
asked = json.loads(subprocess.run(['node', '--input-type=module', '-e', ASK], cwd=KINGDOM, check=True, capture_output=True, text=True).stdout)
if not asked['base']:
    sys.exit("prep-heroes: the kingdom's registry names no base hero - nothing to prepare")
ids = sorted(set(asked['base'] + asked['civilians']))

# read and written as UTF-8 with LF line ends whatever the machine (on Windows the default is cp1252 and CRLF; the codex is UTF-8)
codex = json.load(open(CODEX, encoding='utf-8'))
art_of = {h['id']: h.get('art') for h in codex['heroes']['heroes']}
index = json.load(open(INDEX, encoding='utf-8'))
# the index names exactly the heroes asked for: an entry from an earlier run for a hero no longer in the registry goes
was = index.get('heroes', {})
for hid, name in was.items():
    if hid not in ids:
        index['files'].pop(name, None)
index['heroes'] = {}
missing = []
for hid in ids:
    rel = art_of.get(hid)
    src = os.path.join(ROOT, rel) if rel else None
    if not src or not os.path.exists(src):
        missing.append(hid); continue
    im = Image.open(src).convert('RGB')
    # centre-crop to 2:3 then downscale — off-ratio art (ART-INVENTORY.md) is cropped, never stretched
    w, h = im.size
    if w / h > W / H:
        nw = int(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((W, H), Image.LANCZOS)
    name = 'hero-' + hid.split('.')[-1] + '.jpg'
    path = os.path.join(OUT, name)
    im.save(path, quality=82, optimize=True)
    index['files'][name] = {'w': W, 'h': H, 'bytes': os.path.getsize(path)}
    index['heroes'][hid] = name
index['heroesMissing'] = missing
json.dump(index, open(INDEX, 'w', encoding='utf-8', newline='\n'), indent=1)
base = asked['base']
print(f"generated/art: {len(index['heroes'])} hero portraits ({sum(1 for h in base if h in index['heroes'])} of {len(base)} base heroes, {sum(1 for h in index['heroes'] if h not in base)} civilians); missing art for {missing or 'nobody'}")
