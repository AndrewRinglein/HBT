#!/usr/bin/env python3
"""The pool heroes' card art for SLICE.html's Equip screen (G11) — the codex's
`heroes[].art` (a 2:3 card portrait, ART-INVENTORY.md) downscaled into generated/art/
as hero-<slug>.jpg, and listed in index.json under `heroes` by hero id. Run after
prep-art.py (it extends the same index.json). Pillow, like the other two.

    python3 tools/prep-heroes.py [codex] [art-root]     default ../content/hbt-content.json  ../

Generated output. Never hand-edit generated/art/. A hero whose art is missing on disk
is listed in index.json `heroesMissing` and the page shows a blank card, never a wrong one.
"""
import json, sys, os
from PIL import Image

HERE = os.path.dirname(__file__)
CODEX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'content', 'hbt-content.json')
ROOT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..')
OUT = os.path.join(HERE, '..', 'generated', 'art')
INDEX = os.path.join(OUT, 'index.json')
W, H = 160, 240   # the 2:3 card at thumbnail size — ~10 KB a hero

# the pool is the kingdom's registry; read its ids off the source so this tool never keeps a second list
POOL_SRC = open(os.path.join(HERE, '..', 'src', 'content', 'heroes.ts')).read()
import re
ids = sorted(set(re.findall(r"hero\('(hero\.[a-z0-9.-]+)'", POOL_SRC)))

codex = json.load(open(CODEX))
art_of = {h['id']: h.get('art') for h in codex['heroes']['heroes']}
index = json.load(open(INDEX))
index.setdefault('heroes', {})
missing = []
for hid in ids:
    rel = art_of.get(hid)
    src = os.path.join(ROOT, rel) if rel else None
    if not src or not os.path.exists(src):
        missing.append(hid); index['heroes'].pop(hid, None); continue
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
json.dump(index, open(INDEX, 'w'), indent=1)
print(f"generated/art: {len(index['heroes'])} hero portraits; missing art for {missing or 'nobody'}")
