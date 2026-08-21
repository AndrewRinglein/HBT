#!/usr/bin/env python3
"""
scan-variants.py — one piece of art, one hero.

Run this ON THE MACHINE THAT HAS THE ART, before build-heroes.mjs.
Writes ../art/variants.json: for every generative template, the list of DISTINCT
art files that belong to it. build-heroes.mjs then emits one hero per file.

THE RULE (Angela, 2026-08-20). One piece of art is one unique hero.
  -v1 -v2 -v3 -v4        four separate designs   -> four heroes
  {style}1..4            four separate designs   -> four heroes   (Eve tutorial)
  1 2 3 4 l p r v        one hero, four levels plus four statuses -> ONE hero
Byte-identical files are collapsed, so a template whose fourth slot duplicates
another gets three heroes and is reported.
"""
import os, re, json, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', 'hell-tcg'))
OUT  = os.path.abspath(os.path.join(HERE, '..', 'art', 'variants.json'))

SHADOWS = ['priestess-of-ire','priestess-of-solace','servant-of-omen','shadow-sorceress',
           'sand-knight','rider-of-ire','bodani','oathblade','soul-reaver','nightblade',
           'dusk-hawk','runebow']
SKYSHIP  = ['brute','phantom-striker','troll-pirate','open-hand','sky-captain','windwalker',
            'sky-pirate','air-mage','spellblade','aeronissa-priest','mirran-priest',
            'vigil-of-the-fallen']
TUTORIAL = ['warrior-iron','warrior-fearsome','warrior-barbarian','warrior-brawler',
            'mage-fire','mage-fireaura','mage-thinking','mage-sexy',
            'priest-armored','priest-pauper','priest-robes','priest-scantily',
            'paladin-dark','paladin-hunk','paladin-shiney','paladin-smug',
            'ranger-aggressive','ranger-nature','ranger-ranger','ranger-scantily',
            'rogue-raven','rogue-rose','rogue-skull','rogue-snake']
STYLE_ALIAS = {'mage-scantily': 'mage-sexy'}

md5 = lambda p: hashlib.md5(open(p, 'rb').read()).hexdigest()

def dedupe(paths):
    """keep first occurrence of each distinct image, preserving order"""
    seen, out = set(), []
    for p in paths:
        full = os.path.join(ROOT, p)
        if not os.path.isfile(full):
            continue
        h = md5(full)
        if h in seen:
            continue
        seen.add(h)
        out.append(p)
    return out

def main():
    v = {'shadows': {}, 'skyship': {}, 'tutorial': {}, 'aspiring': {}}
    notes = []

    for s in SHADOWS:
        v['shadows'][s] = dedupe(['New Art/avtair-approved/%s-v%d.png' % (s, i) for i in (1, 2, 3, 4)])
    for s in SKYSHIP:
        v['skyship'][s] = dedupe(['New Art/aeronissa-concepts/%s.png' % s] +
                                 ['New Art/aeronissa-concepts/%s-v%d.png' % (s, i) for i in (2, 3, 4)])
    for s in TUTORIAL:
        base = STYLE_ALIAS.get(s, s)
        got = []
        for i in (1, 2, 3, 4):
            for e in ('png', 'jpg'):
                p = 'New Art/%s%d.%s' % (base, i, e)
                if os.path.isfile(os.path.join(ROOT, p)):
                    got.append(p); break
        v['tutorial'][s] = dedupe(got)
    # aspiring: {gender}/style-N is ONE hero — 1..4 are its levels, l/p/r/v its statuses
    for g in ('male', 'female'):
        for n in (1, 2, 3, 4):
            p = 'assets/cards/heroes/aspiring/%s/style-%d/1.png' % (g, n)
            if os.path.isfile(os.path.join(ROOT, p)):
                v['aspiring']['%s-style-%d' % (g, n)] = [p]

    for src in ('shadows', 'skyship', 'tutorial'):
        for slug, fs in v[src].items():
            if len(fs) != 4:
                notes.append('%s/%s has %d distinct pieces of art, not 4' % (src, slug, len(fs)))
    v['_notes'] = notes
    json.dump(v, open(OUT, 'w'), indent=1)
    for src in ('shadows', 'skyship', 'tutorial', 'aspiring'):
        print('%-9s %2d templates -> %3d heroes' % (src, len(v[src]), sum(len(f) for f in v[src].values())))
    for n in notes:
        print('  ! ' + n)

if __name__ == '__main__':
    main()
