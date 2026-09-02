#!/usr/bin/env python3
"""Pull what the slice's front screen uses out of the Load Game mock — the three
campaign banners and the two faces (Cinzel, IM Fell English; both Google Fonts,
OFL) — into generated/art/. The mock is research/mocks/Load Game.html (Andrew,
2026-09-01, ruled the load game screen 2026-09-02); it is a bundle: a JSON map of
uuid → gzip+base64 asset, and a page that references the uuids.

    python3 tools/prep-mock.py [path-to-mock]

Generated output. Never hand-edit generated/art/. Run after tools/prep-art.py
(which rewrites index.json; this one adds to it).
"""
import json, re, base64, gzip, io, os, sys
from PIL import Image

MOCK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'research', 'mocks', 'Load Game.html')
OUT = os.path.join(os.path.dirname(__file__), '..', 'generated', 'art')
index = json.load(open(os.path.join(OUT, 'index.json')))
s = open(MOCK, encoding='utf8', errors='ignore').read()
scripts = re.findall(r'<script[^>]*>(.*?)</script>', s, flags=re.S)
bundle = json.loads(scripts[1])
page = json.loads(scripts[4])

def asset(uuid):
    v = bundle[uuid]
    data = base64.b64decode(v['data'])
    return gzip.decompress(data) if v.get('compressed') else data

def save(name, blob):
    open(os.path.join(OUT, name), 'wb').write(blob)
    index['files'][name] = {'bytes': len(blob)}

# the banners: the first background image inside each campaign column
index['banners'] = {}
for label, slug in [('Eve of Ruin', 'eve-of-ruin'), ('Shadows in the Sand', 'shadows-in-the-sand'), ('Skyship', 'skyship')]:
    col = page[page.index(f'data-screen-label="Campaign · {label}"'):]
    uuid = re.search(r'url\(&quot;([0-9a-f-]{36})&quot;\) center/cover', col).group(1)
    im = Image.open(io.BytesIO(asset(uuid))).convert('RGB')
    im = im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=80, optimize=True)
    save(f'banner-{slug}.jpg', buf.getvalue())
    index['banners'][slug] = f'banner-{slug}.jpg'

# the faces: latin subsets only
index['fonts'] = {}
style = re.findall(r'<style>(.*?)</style>', page, flags=re.S)[0]
seen = set()
for m in re.finditer(r"/\* latin \*/\s*@font-face \{([^}]*)\}", style):
    fam = re.search(r"font-family: '([^']+)'", m.group(1)).group(1)
    sty = re.search(r"font-style: (\w+)", m.group(1)).group(1)
    uuid = re.search(r'url\("([^"]+)"\)', m.group(1)).group(1)
    if uuid in seen: continue
    seen.add(uuid)
    name = f"font-{fam.lower().replace(' ', '-')}-{sty}.woff2"
    save(name, asset(uuid))
    index['fonts'][name] = {'family': fam, 'style': sty}

json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
print(f"generated/art: + {len(index['banners'])} banners, {len(index['fonts'])} fonts")
