#!/usr/bin/env python3
"""
build-hero-art.py — match every hero to its art in hell-tcg, and make thumbnails.

Run this ON THE MACHINE THAT HAS THE ART. It needs:
  ../../hell-tcg/assets/cards/heroes/**   and   ../../hell-tcg/New Art/**
  ../gen/heroes.json                      (written by build-heroes.mjs)

It writes:
  ../art/thumbs/<hash>.webp   146 unique images, 280px wide
  ../art/manifest.json        heroId -> {thumb, src}

build-viewer.mjs then base64-inlines those thumbnails so hbt-codex.html stays a single
self-contained file with no external image references.

WHY A MATCHER AND NOT A LOOKUP. Hell-TCG resolves hero art through a pile of special
cases in tools/hero-viewer.html — a NEW_ART_HEROES map, a CIVILIAN_FOLDER_HEROES list,
per-hero folder/prefix overrides, two different variant naming styles, a jpg exception
and a style alias. Rather than reimplement all of that and inherit its bugs, this builds
an index of every image file that actually exists and resolves each hero against it, in
priority order. 230/230 currently match.
"""
import json, os, re, hashlib
from PIL import Image

HERE  = os.path.dirname(os.path.abspath(__file__))
ROOT  = os.path.abspath(os.path.join(HERE, '..', '..', '..', 'hell-tcg'))
CONT  = os.path.abspath(os.path.join(HERE, '..'))
OUT   = os.path.join(CONT, 'art', 'thumbs')
WIDTH = 280
QUALITY = 72

EXT = {'.png', '.jpg', '.jpeg', '.webp'}
norm = lambda s: re.sub(r'[^a-z0-9]+', '-', str(s).lower()).strip('-')

# hell-tcg's own aliases, the only two that cannot be derived from the filenames
STYLE_ALIAS = {'mage-scantily': 'mage-sexy'}   # only mage uses "sexy" files for the scantily style
NAME_ALIAS  = {'desperate-villagers': 'desperate-village'}   # plural hero, singular folder

def build_index():
    index, allfiles = {}, []
    for base in ['assets/cards/heroes', 'New Art']:
        for dp, _, fn in os.walk(os.path.join(ROOT, base)):
            for f in fn:
                if os.path.splitext(f)[1].lower() not in EXT:
                    continue
                rel = os.path.relpath(os.path.join(dp, f), ROOT).replace('\\', '/')
                allfiles.append(rel)
                index.setdefault(norm(os.path.splitext(f)[0]), []).append(rel)
    return index, allfiles

def main():
    heroes = json.load(open(os.path.join(CONT, 'gen', 'heroes.json'), encoding='utf-8'))['heroes']
    index, allfiles = build_index()
    byparent = {}
    for rel in allfiles:
        byparent.setdefault(os.path.dirname(rel), []).append(rel)
    exists = lambda rel: os.path.isfile(os.path.join(ROOT, rel))

    def firstin(d, prefer=('1', 'level1', 'v1')):
        fs = sorted(byparent.get(d, []))
        for p in prefer:
            for f in fs:
                if norm(os.path.splitext(os.path.basename(f))[0]) == p:
                    return f
        return fs[0] if fs else None

    def pick(h):
        art = h.get('art')
        if art and '/' in art and exists(art):
            return art, 'explicit path in heroData'
        slug = norm(art) if art else None
        if h['path'] == 'tutorial':                       # New Art/{class}-{style}{n}.png
            s = STYLE_ALIAS.get(slug, slug)
            for v in '1234':
                for e in ('png', 'jpg'):
                    c = 'New Art/%s%s.%s' % (s, v, e)
                    if exists(c):
                        return c, 'generated convention'
            if s in index:
                return sorted(index[s])[0], 'stem match on art style'
        if h['path'] == 'aspiring':                       # aspiring/{gender}/style-N/1.png
            g = (h.get('gender') or 'female').lower()
            for st in ('style-1', 'style-2', 'style-3', 'style-4'):
                f = firstin('assets/cards/heroes/aspiring/%s/%s' % (g, st))
                if f:
                    return f, 'aspiring %s %s' % (g, st)
        keys = [k for k in (slug, norm(h['name']), norm(h['id'].split('.')[-1])) if k]
        keys += [NAME_ALIAS[k] for k in keys if k in NAME_ALIAS]
        for key in keys:
            for d, why in (('New Art/%s-variants' % key, 'variants folder'),
                           ('assets/cards/heroes/fixed/%s' % key, 'fixed folder')):
                f = firstin(d)
                if f:
                    return f, why
            for c in ('assets/cards/heroes/civilian/%s-1.png' % key,
                      'assets/cards/heroes/%s.png' % key):
                if exists(c):
                    return c, 'direct file'
            if key in index:
                return sorted(index[key])[0], 'exact stem match'
            pref = [r for r in allfiles
                    if norm(os.path.splitext(os.path.basename(r))[0]).startswith(key + '-')]
            if pref:
                for want in ('-1', '-level1', '-v1'):
                    for r in sorted(pref):
                        if norm(os.path.splitext(os.path.basename(r))[0]).endswith(norm(want)):
                            return r, 'prefix match'
                return sorted(pref)[0], 'prefix match'
        return None, 'no art found'

    os.makedirs(OUT, exist_ok=True)
    manifest, uniq, missing = {}, {}, []
    for h in heroes:
        f, why = pick(h)
        if not f:
            missing.append(h['name'])
            continue
        uniq.setdefault(f, []).append((h['id'], why))

    total = 0
    for src, ids in sorted(uniq.items()):
        key = hashlib.md5(src.encode()).hexdigest()[:12] + '.webp'
        dst = os.path.join(OUT, key)
        if not os.path.exists(dst):
            im = Image.open(os.path.join(ROOT, src)).convert('RGB')
            im = im.resize((WIDTH, max(1, round(im.height * WIDTH / im.width))), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=QUALITY, method=6)
        total += os.path.getsize(dst)
        for hid, why in ids:
            manifest[hid] = {'thumb': key, 'src': src, 'how': why}

    json.dump(manifest, open(os.path.join(CONT, 'art', 'manifest.json'), 'w'), indent=1)
    print('indexed %d images' % len(allfiles))
    print('MATCHED %d / %d heroes  ->  %d unique images, %.2f MB'
          % (len(manifest), len(heroes), len(uniq), total / 1048576))
    if missing:
        print('UNMATCHED: ' + ', '.join(missing))

if __name__ == '__main__':
    main()
