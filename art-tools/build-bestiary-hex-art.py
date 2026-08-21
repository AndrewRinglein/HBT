#!/usr/bin/env python3
"""build-bestiary-hex-art.py — hex battle-token art for bestiary creatures.

Sibling of build-hex-art.py (heroes) and build-bestiary-art.py (creature thumbs).
Same conventions: md5(src)[:12].webp keys, generated manifest, regenerable.

  reads   ../art/bestiary-manifest.json   uuid -> {thumbs[], src[], copies[]}  (generated)
          bestiary-hex-map.json           uuid -> {slug, scale, render}        (authored)
          ../../battle-tokens/units/      <slug>_{full,1024,256}.png

  writes  ../art/bestiary-hex/<hash>.webp   280px, ALPHA PRESERVED
          ../art/bestiary-hex-manifest.json uuid -> {hex, src, slug, scale, render, tiers}

`render` carries a hint the pixels cannot: "incorporeal" means the creature should be
drawn at reduced opacity by the board. The generator produces a SOLID cutout even for
ghosts, because a clean opaque matte composited at runtime opacity looks better and stays
controllable, whereas baked semi-transparency fights every effect layered on top of it.
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONT = os.path.dirname(HERE)
ART = os.path.join(CONT, 'art')
OUTDIR = os.path.join(ART, 'bestiary-hex')
UNITS = os.path.abspath(os.path.join(CONT, '..', 'battle-tokens', 'units'))
WIDTH = 280

try:
    from PIL import Image
except ImportError:
    sys.exit('pillow required: pip install pillow')


def main():
    bm = json.load(open(os.path.join(ART, 'bestiary-manifest.json')))
    hexmap = json.load(open(os.path.join(HERE, 'bestiary-hex-map.json')))
    os.makedirs(OUTDIR, exist_ok=True)

    out, missing = {}, []
    for uuid, ent in hexmap.items():
        slug = ent['slug']
        if uuid not in bm:
            missing.append((uuid, 'not in bestiary-manifest.json')); continue
        srcs = bm[uuid].get('src') or []
        if not srcs:
            missing.append((uuid, 'no src art')); continue
        src = srcs[0]                       # variant 0 is the token source
        full = os.path.join(UNITS, f'{slug}_full.png')
        if not os.path.exists(full):
            missing.append((uuid, f'no token at {slug}_full.png')); continue

        key = hashlib.md5(src.encode()).hexdigest()[:12] + '.webp'
        im = Image.open(full).convert('RGBA')
        h = round(im.height * WIDTH / im.width)
        im.resize((WIDTH, h), Image.LANCZOS).save(
            os.path.join(OUTDIR, key), 'WEBP', quality=90)

        out[uuid] = {
            'hex': key, 'src': src, 'slug': slug,
            'scale': ent.get('scale', 1.0),          # advisory stature, not baked in
            'render': ent.get('render', 'solid'),    # solid | incorporeal
            'tiers': {t: f'{slug}_{t}.png' for t in ('full', '1024', '256')},
        }

    json.dump(out, open(os.path.join(ART, 'bestiary-hex-manifest.json'), 'w'), indent=1)
    total = len(bm)
    print(f'bestiary hex art: {len(out)} of {total} creatures '
          f'-> art/bestiary-hex/ + art/bestiary-hex-manifest.json')
    for uuid, why in missing:
        print(f'  SKIP {uuid}: {why}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
