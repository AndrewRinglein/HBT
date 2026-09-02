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
import numpy as np

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

# ---------------------------------------------------------------------------
# THE STATURE LADDER. scale = how many hexes tall the creature stands.
#
# A first pass put every creature between 0.6 and 1.6, which is not a size system -
# a wolf came out nearly as tall as a man and a bone dragon barely taller. Real
# creature size spans a much wider range and the board should show it. Assign a
# creature to a rung by what it IS, not by how its card art happens to be cropped.
#
# Anchored on human = 1.00.
# ---------------------------------------------------------------------------
SIZES = {
    'tiny':     0.30,   # mites, wisps, familiars - ankle height
    'small':    0.45,   # wolf, hound, hyena - a four-legged animal
    'child':    0.60,   # children, halflings
    'lesser':   0.75,   # imp, goblin, gremlin - small humanoid
    'human':    1.00,   # the anchor. soldiers, cultists, skeletons, ghosts
    'large':    1.50,   # werewolf, ogre, troll, brute - looms over a man
    'huge':     2.20,   # golem, colossus, hulk - twice a man and more
    'colossal': 2.50,   # dragons, world-enders. spans several hexes.
}

# A one-tile creature is one whose FEET fit the tile. Its silhouette may overhang into
# neighbouring hexes - that is correct and desirable for a winged or long-limbed unit.
# Capping on silhouette WIDTH is wrong: a bone dragon's stance is only ~38% of its own
# width, so a width cap either clips the wings or shrinks the creature to nothing.
FOOT_CAP = 0.72          # max ground footprint, in hex-widths


def footprint_fraction(im):
    """How much of the token's width the creature actually plants on, measured from
    the bottom 12% of the alpha. This is the ground contact, not the silhouette."""
    a = np.array(im)[:, :, 3] > 128
    band = a[int(a.shape[0] * 0.88):, :]
    cols = band.any(0).nonzero()[0]
    return float((cols.max() - cols.min() + 1) / im.width) if len(cols) else 0.0


def main():
    bm = json.load(open(os.path.join(ART, 'bestiary-manifest.json')))
    hexmap = json.load(open(os.path.join(HERE, 'bestiary-hex-map.json')))
    os.makedirs(OUTDIR, exist_ok=True)

    out, missing, wide = {}, [], []
    for uuid, ent in hexmap.items():
        slug = ent['slug']
        # `src` is used for exactly one thing below: md5'd to name the output webp. It
        # normally comes from bestiary-manifest.json, which build-bestiary-art.py fills by
        # copying art OUT OF hell-tcg. A creature whose art was made HERE can never appear
        # there, so the map entry may name its own source path instead. Added 2026-09-02
        # for unit.eyeblight, the first HoBaT-original enemy painting.
        src = ent.get('src')
        if src:
            origin = 'hexmap'
        elif uuid in bm:
            origin = 'manifest'
            srcs = bm[uuid].get('src') or []
            if not srcs:
                missing.append((uuid, 'no src art')); continue
            src = srcs[0]                   # variant 0 is the token source
        else:
            missing.append((uuid, 'not in bestiary-manifest.json and no src in the hex map'))
            continue
        full = os.path.join(UNITS, f'{slug}_full.png')
        if not os.path.exists(full):
            missing.append((uuid, f'no token at {slug}_full.png')); continue

        key = hashlib.md5(src.encode()).hexdigest()[:12] + '.webp'
        im = Image.open(full).convert('RGBA')
        h = round(im.height * WIDTH / im.width)
        im.resize((WIDTH, h), Image.LANCZOS).save(
            os.path.join(OUTDIR, key), 'WEBP', quality=90)

        # Overflow guard. Scale is set from stature ("a rank-3 dragon should tower"),
        # but a WIDE creature scaled by HEIGHT can run off the sides of the tile. The
        # bone-dragon at 1.60 measured 200px across a 190px hex. Catch it here rather
        # than discovering it on the board, because the bestiary has plenty of wide
        # silhouettes still to come.
        # Size category is the normal way to set this. An explicit `scale` overrides
        # the rung when a creature genuinely does not fit a category.
        size = ent.get('size')
        if size and size not in SIZES:
            missing.append((uuid, f'unknown size "{size}"')); continue
        stature = ent.get('scale', SIZES.get(size, 1.0))
        aspect = im.width / im.height
        ff = footprint_fraction(im)
        foot_per_scale = aspect * ff * 0.98
        scale, capped = stature, False
        if foot_per_scale > 0 and foot_per_scale * stature > FOOT_CAP:
            scale = FOOT_CAP / foot_per_scale
            capped = True
            wide.append((uuid, stature, scale))
        width_at_scale = aspect * 0.98 * scale

        out[uuid] = {
            'hex': key, 'src': src, 'slug': slug,
            'size': size or 'human',
            'stature': stature,                      # ladder value before the foot cap
            'scale': round(scale, 3),                # advisory, applied at render time
            'footprintCapped': capped,
            'footprint': round(foot_per_scale * scale, 3),   # hex-widths of ground contact
            'render': ent.get('render', 'solid'),    # solid | incorporeal
            'srcOrigin': origin,                     # manifest = ported | hexmap = HoBaT-original
            'aspect': round(aspect, 4),
            'hexWidthAtScale': round(width_at_scale, 3),
            'tiers': {t: f'{slug}_{t}.png' for t in ('full', '1024', '256')},
        }

    json.dump(out, open(os.path.join(ART, 'bestiary-hex-manifest.json'), 'w'), indent=1)
    total = len(bm)
    print(f'bestiary hex art: {len(out)} of {total} creatures '
          f'-> art/bestiary-hex/ + art/bestiary-hex-manifest.json')
    for uuid, why in missing:
        print(f'  SKIP {uuid}: {why}')
    for uuid, stat, sc in wide:
        print(f'  CAPPED {uuid}: stature {stat:.2f} -> {sc:.2f} so its feet fit the tile '
              f'(silhouette still overhangs, which is fine)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
