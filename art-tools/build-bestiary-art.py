#!/usr/bin/env python3
"""
build-bestiary-art.py — copy live creature art out of hell-tcg and make thumbnails.

Run this ON THE MACHINE THAT HAS THE ART, after scan-bestiary.mjs. It needs:
  ../../../hell-tcg/**                    (art files listed in gen/bestiary.json)
  ../gen/bestiary.json                    (written by scan-bestiary.mjs)

It writes:
  ../../assets/bestiary/<campaign>/<slug>.png     full-res copies, named by creature
                                                  (variants: <slug>-2.png, <slug>-3.png…)
  ../art/thumbs/<hash>.webp                       280px thumbs, same pool the hero art uses
  ../art/bestiary-manifest.json                   uuid -> {thumbs[], src[], copies[]}

build-viewer.mjs base64-inlines the thumbs so hbt-codex.html stays one file.
Thumbs are content-hashed exactly like build-hero-art.py, so a creature sharing
art with a hero costs nothing extra.
"""
import json, os, hashlib, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HELL = os.path.abspath(os.path.join(HERE, '..', '..', '..', 'hell-tcg'))
CONT = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
THUMBS = os.path.join(CONT, 'art', 'thumbs')
DEST = os.path.join(ROOT, 'assets', 'bestiary')
WIDTH = 280
QUALITY = 72

bestiary = json.load(open(os.path.join(CONT, 'gen', 'bestiary.json')))
os.makedirs(THUMBS, exist_ok=True)

manifest, made, copied, reused = {}, 0, 0, 0
for c in bestiary:
    entry = {'thumbs': [], 'src': [], 'copies': []}
    campdir = os.path.join(DEST, c['campaign'])
    os.makedirs(campdir, exist_ok=True)
    for i, rel in enumerate(c['arts']):
        src = os.path.join(HELL, rel)
        # full-res copy, named by creature
        suffix = '' if i == 0 else f'-{i + 1}'
        dst = os.path.join(campdir, f"{c['slug']}{suffix}.png")
        shutil.copy2(src, dst)
        copied += 1
        # content-hashed webp thumb (same scheme as build-hero-art.py)
        h = hashlib.sha1(open(src, 'rb').read()).hexdigest()[:12]
        thumb = f'{h}.webp'
        tpath = os.path.join(THUMBS, thumb)
        if not os.path.exists(tpath):
            im = Image.open(src).convert('RGB')
            im.thumbnail((WIDTH, WIDTH * 4))
            im.save(tpath, 'WEBP', quality=QUALITY)
            made += 1
        else:
            reused += 1
        entry['thumbs'].append(thumb)
        entry['src'].append(rel)
        entry['copies'].append(os.path.relpath(dst, ROOT).replace(os.sep, '/'))
    manifest[c['uuid']] = entry

json.dump(manifest, open(os.path.join(CONT, 'art', 'bestiary-manifest.json'), 'w'), indent=1)
print(f'bestiary art: {len(manifest)} creatures, {copied} full-res copies -> assets/bestiary/, '
      f'{made} new thumbs, {reused} already in pool')
