#!/usr/bin/env python3
"""Prepare the kingdom art for SLICE.html — downscaled copies under generated/art/,
plus index.json with the geometry the page needs. Source: Autobattler/kingdom-art
(USE-THIS-ART.md is the contract; every number below is taken from it or from its
index.json files, never invented). The art pipeline is Python + Pillow already
(kingdom-art/pipeline/), so this is too.

    python3 tools/prep-art.py [path-to-kingdom-art]      default ../../Autobattler/kingdom-art

Generated output. Never hand-edit generated/art/. The page's build
(tools/build-slice.mjs) inlines whatever is here; it does not need the source art.
"""
import json, sys, os
from PIL import Image

ART = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Autobattler', 'kingdom-art')
OUT = os.path.join(os.path.dirname(__file__), '..', 'generated', 'art')
os.makedirs(OUT, exist_ok=True)
index = {'source': 'Autobattler/kingdom-art — USE-THIS-ART.md', 'files': {}}

def save(name, im, quality=None):
    path = os.path.join(OUT, name)
    if quality: im.convert('RGB').save(path, quality=quality, optimize=True)
    else: im.save(path, optimize=True)
    index['files'][name] = {'w': im.width, 'h': im.height, 'bytes': os.path.getsize(path)}
    return path

# 1 · the world map — delivered 3840×2160, native 7424×4176; the tile centres in
# territories/index.json are native px, so "scale the hex geometry by 3840/7424 = 0.5172"
# (USE-THIS-ART.md §1). The page shows the REALM, not the whole map: a crop around
# the slice's tiles, at the delivered scale, so a tile is 265 px wide on the page.
NATIVE_W = 7424
m = Image.open(f'{ART}/world-map/kingdom-big-plain.png')
S = m.width / NATIVE_W                       # 0.5172
tiles = json.load(open(f'{ART}/territories/index.json'))
hexg = tiles['hex']
by_qr = {(t['q'], t['r']): t for t in tiles['territories']}
WANTED = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'generated', 'art-wanted.json')))
wanted = [by_qr[tuple(qr)] for qr in WANTED['tiles']]
tw, th = 512 * S, 768 * S
pad = 120 * S
xs = [t['px'][0] * S for t in wanted]; ys = [t['px'][1] * S for t in wanted]
crop = (int(min(xs) - tw / 2 - pad), int(min(ys) - th / 2 - pad - 250 * S), int(max(xs) + tw / 2 + pad) + 1, int(max(ys) + th / 2 + pad) + 1)
crop = (max(0, crop[0]), max(0, crop[1]), min(m.width, crop[2]), min(m.height, crop[3]))
save('map.jpg', m.crop(crop), quality=82)
index['map'] = {'w': crop[2] - crop[0], 'h': crop[3] - crop[1], 'originX': crop[0], 'originY': crop[1], 'nativeScale': S}

# 2 · Territory tiles — 512×768 pointy-top, at the map's scale
TILE_SCALE = S
index['hex'] = {'tileW': round(512 * S, 2), 'tileH': round(768 * S, 2), 'topVertex': round(hexg['top_vertex'] * S, 2), 'bottomVertex': round(hexg['bottom_vertex'] * S, 2),
                'sides': [round(v * S, 2) for v in hexg['sides']], 'rowStep': round(hexg['row_step'] * S, 2), 'scale': S}
index['tiles'] = {}
for t in wanted:
    im = Image.open(f"{ART}/territories/{t['id']}.png").convert('RGBA')
    name = f"{t['id']}.png"
    im = im.resize((round(512 * S), round(768 * S)), Image.LANCZOS)
    save(name, im)
    index['tiles'][t['id']] = {'q': t['q'], 'r': t['r'], 'px': t['px'], 'terrain': t['terrain'], 'file': name}

# 3 · iso overlays — anchors from index.json, at the same scale as the tile they stand on
iso = json.load(open(f'{ART}/iso-overlays/index.json'))
index['overlays'] = {}
for slug in WANTED['buildings'] + ['keep']:
    sp = iso['sprites'][slug]
    im = Image.open(f'{ART}/iso-overlays/{slug}.png').convert('RGBA')
    im = im.resize((round(im.width * S), round(im.height * S)), Image.LANCZOS)
    name = f'iso-{slug}.png'
    save(name, im)
    index['overlays'][slug] = {'file': name, 'w': im.width, 'h': im.height, 'anchorX': round(sp['anchor_x'] * S, 2), 'anchorY': round(sp['anchor_y'] * S, 2)}
index['overlaySeat'] = round(42 * S, 2)   # "the +42 seats the base slightly forward"

# 4 · the town — plate at native 5504×3072 (delivered 3840×2143); lots are in native px (pipeline/compose-g.py)
PLATE_NATIVE_W = 5504
TOWN_W = 1280
town_scale = TOWN_W / PLATE_NATIVE_W
p = Image.open(f'{ART}/v2-painterly/plate.png')
save('town-plate.jpg', p.resize((TOWN_W, round(p.height * TOWN_W / p.width)), Image.LANCZOS), quality=80)
LOTS = {  # transcribed from kingdom-art/pipeline/compose-g.py — "hard-coded, and carry hand-authored error"
    'academy': ((3096, 1219), 850), 'beacon': ((4573, 1333), 850), 'war-room': ((2408, 1405), 800), 'chapel': ((1706, 1677), 1250),
    'siege-workshop': ((3950, 1760), 700), 'forge': ((717, 1864), 1100), 'waystation': ((2830, 2470), 800), 'mystic-caverns': ((5060, 2330), 1150),
}
BANDS = ['1-ruined', '2-working', '3-established', '4-masterwork', '5-ascendant']
index['town'] = {'w': TOWN_W, 'h': round(p.height * TOWN_W / p.width), 'lots': {}}
for slug in WANTED['buildings']:
    if slug not in LOTS: continue       # the Memorial has no bands: it is painted into the plate
    meta = json.load(open(f'{ART}/v2-painterly/bands/{slug}/index.json'))
    (ax, ay), target = LOTS[slug]
    sc = target / meta['bands']['2-working']['height'] * town_scale     # scale is per BUILDING, from the working band
    lot = {'x': round(ax * town_scale), 'y': round(ay * town_scale), 'anchorX': round(meta['canvas']['anchor_x'] * sc), 'baselineY': round(meta['canvas']['baseline_y'] * sc), 'bands': []}
    for b in BANDS:
        im = Image.open(f'{ART}/v2-painterly/bands/{slug}/{b}.png').convert('RGBA')
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        name = f'band-{slug}-{b}.png'
        save(name, im)
        lot['bands'].append({'file': name, 'w': im.width, 'h': im.height})
    index['town']['lots'][slug] = lot

# 5 · building interiors (clean, no UI) — the Build screen's backdrop
index['interiors'] = {}
for slug in WANTED['buildings']:
    src = f'{ART}/building-screens/interiors/{slug}.png'
    if not os.path.exists(src): continue
    im = Image.open(src)
    name = f'interior-{slug}.jpg'
    save(name, im.resize((960, round(im.height * 960 / im.width)), Image.LANCZOS), quality=72)
    index['interiors'][slug] = name

# 6 · cards — 1696×2528, 2× the hero card; here at 1/8
index['cards'] = {}
for slug in WANTED['buildings']:
    im = Image.open(f'{ART}/cards/{slug}-gwent-1.png')
    name = f'card-{slug}.jpg'
    save(name, im.resize((212, 316), Image.LANCZOS), quality=80)
    index['cards'][slug] = name

json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
total = sum(f['bytes'] for f in index['files'].values())
print(f"generated/art: {len(index['files'])} files, {total/1024:.0f} KB")
