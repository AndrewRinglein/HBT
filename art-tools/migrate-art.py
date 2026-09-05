#!/usr/bin/env python3
"""migrate-art.py — move hero art from hell-tcg's scattered folders into the standard tree.

  python3 migrate-art.py --class class.civilian            report only, writes nothing
  python3 migrate-art.py --class class.civilian --write    do it

THE STANDARD (declared in content/gen/art-conventions.json, implemented in art/heroes/):

    art/heroes/<slug>/card/l1.png          l1..l4          the character at four levels
    art/heroes/<slug>/card/lycanthropy.png                 afflictions, spelled out in full
    art/heroes/<slug>/card/possession.png
    art/heroes/<slug>/card/rotting-flesh.png
    art/heroes/<slug>/card/vampirism.png
    art/heroes/<slug>/hex/l1_256.png       _256, _1024, _full   board token per variant
    art/heroes/<slug>/anim/l1.mp4                          one-shot
    art/heroes/<slug>/anim/l1-loop.mp4                     looping

Paths in the manifest are relative to the PROJECT ROOT, not content/. `mkthumbs.mjs` reads
them as '../' + src from inside content/, so `art/heroes/x` means <root>/art/heroes/x.
Getting this wrong makes every src look dangling when it is fine.

WHY A TABLE OF ALIASES AND NOT A RULE. A hero's row id does not predict its art path, and
every attempt to construct one failed differently: `blacksmith` is stored as
`blacksmith-female`, `survivors` as `ragtag-survivors`, `desperate-villagers` under
`desperate-village-variants` (singular), `wife3` as `wife-3`, the catfolk inside a
`catfolk/` subfolder, and the aspiring heroes under `aspiring/<gender>/style-N/` where the
filenames carry no hero name at all. There is no rule; there is only the mapping. So the
mapping is data, it is checked in, and it is reviewable.
"""
import argparse, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONT = os.path.dirname(HERE)
ROOT = os.path.dirname(CONT)
TREE = os.path.join(ROOT, 'art', 'heroes')
TCG = os.path.join(os.path.dirname(ROOT), 'hell-tcg')

# hell-tcg variant token -> standard name.  Both the bare-letter form used in
# assets/cards/heroes/** and the spelled form used in New Art/*-variants/.
VARIANT = {
    '1': 'l1', '2': 'l2', '3': 'l3', '4': 'l4',
    'level1': 'l1', 'level2': 'l2', 'level3': 'l3', 'level4': 'l4',
    'l': 'lycanthropy', 'p': 'possession', 'r': 'rotting-flesh', 'v': 'vampirism',
    'lycanthropy': 'lycanthropy', 'possessed': 'possession', 'possession': 'possession',
    'rotting': 'rotting-flesh', 'rotting-flesh': 'rotting-flesh',
    'vampire': 'vampirism', 'vampirism': 'vampirism',
}

# slug -> (directory relative to hell-tcg, filename prefix or '' when the whole dir is one
# character). Built by searching, then checked in so the next run does not re-derive it.
ALIASES = {
    'survivors':            ('assets/cards/heroes/civilian', 'ragtag-survivors'),
    'blacksmith':           ('assets/cards/heroes/civilian', 'blacksmith-female'),
    'wife3':                ('assets/cards/heroes/fixed/wife-3', ''),
    'wife5':                ('assets/cards/heroes/fixed/wife-5', ''),
    'desperate-villagers':  ('New Art/desperate-village-variants', 'desperate-village'),
    'julie-supply-master':  ('New Art/julie-supply-master-variants', 'julie-supply-master'),
}


def index_tcg():
    """Every hero image in hell-tcg, grouped by directory."""
    out = {}
    for base in ('assets/cards/heroes', 'New Art'):
        for dp, _, fns in os.walk(os.path.join(TCG, base)):
            if 'worktrees' in dp:
                continue
            imgs = [f for f in fns if f.lower().endswith(('.png', '.jpg'))]
            if imgs:
                out[os.path.relpath(dp, TCG).replace(os.sep, '/')] = sorted(imgs)
    return out


def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def resolve(slug, name, path_kind, idx):
    """Where does this hero's art live? Returns (dir, prefix) or (None, None)."""
    if slug in ALIASES:
        d, pre = ALIASES[slug]
        return (d, norm(pre))      # alias prefixes are written readably; matcher wants normalised
    if path_kind == 'aspiring':
        m = re.match(r'(male|female)-style-(\d)', slug)
        if m:
            return ('assets/cards/heroes/aspiring/%s/style-%s' % m.groups(), '')
    keys = [k for k in (norm(slug), norm(name), norm(slug).rstrip('s')) if k]
    # a directory that IS this character - every file in it is a variant of them
    for d in idx:
        leaf = norm(d.split('/')[-1])
        for k in keys:
            if leaf in (k, k + 'variants'):
                return (d, '' if leaf == k else d.split('/')[-1].replace('-variants', ''))
    # a set of files inside a SHARED directory, distinguished by filename prefix.
    # The prefix is the matched key itself. Deriving it from a filename instead was the
    # bug that made militia-commander.png resolve as variant "r" -> rotting-flesh: the
    # trailing letters of the NAME were being read as a variant token.
    best = None
    for d, fns in idx.items():
        for k in keys:
            hits = [f for f in fns if norm(f) == k or norm(f).startswith(k)]
            if not hits:
                continue
            exact = [f for f in fns if norm(os.path.splitext(f)[0]) == k]
            cand = (d, k)
            if exact:
                return cand
            if best is None:
                best = cand
    return best if best else (None, None)


def variants_in(d, prefix, idx):
    """{standard name: filename} for one character.

    prefix is a NORMALISED key ('militiacommander') or '' when the whole directory is one
    character. A file whose stem is exactly the prefix has no variant token and is l1 -
    most New Art characters are a single picture, which is level 1, not "no art".
    """
    out = {}
    for f in sorted(idx.get(d, [])):
        stem = os.path.splitext(f)[0]
        n = norm(stem)
        if prefix:
            if not n.startswith(prefix):
                continue
            tok = stem
            for cut in range(len(stem), 0, -1):      # strip the prefix in ORIGINAL casing
                if norm(stem[:cut]) == prefix:
                    tok = stem[cut:]; break
        else:
            tok = stem
        tok = tok.strip('-_ ').lower()
        if tok == '':
            std = 'l1'                                # one file = level 1
        else:
            std = VARIANT.get(tok)
            if std is None and re.fullmatch(r'v\d+', tok):
                continue                              # -v2 etc are retries, not variants
        if std and std not in out:
            out[std] = f
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--class', dest='klass', default='class.civilian')
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()

    heroes = json.load(open(os.path.join(CONT, 'gen', 'heroes.json'), encoding='utf-8'))
    heroes = heroes['heroes'] if isinstance(heroes, dict) else heroes
    rows = [h for h in heroes if h.get('class') == a.klass
            and not str(h.get('art') or '').startswith('art/heroes/')]
    idx = index_tcg()

    print(f'{len(rows)} rows of {a.klass} not yet in the tree\n')
    print('%-24s %-42s %s' % ('slug', 'resolved from', 'variants'))
    print('-' * 96)
    copied = unresolved = 0
    for h in sorted(rows, key=lambda x: x['id']):
        slug = h['id'].split('.')[-1]
        d, prefix = resolve(slug, h.get('name'), h.get('path'), idx)
        if not d:
            print('%-24s %-42s --' % (slug, 'UNRESOLVED')); unresolved += 1; continue
        vs = variants_in(d, prefix, idx)
        if not vs:
            print('%-24s %-42s (no recognised variants)' % (slug, d[:42])); unresolved += 1; continue
        print('%-24s %-42s %s' % (slug, d[:42], ','.join(sorted(vs))))
        if a.write:
            cd = os.path.join(TREE, slug, 'card')
            os.makedirs(cd, exist_ok=True)
            for std, fn in vs.items():
                shutil.copy(os.path.join(TCG, d, fn), os.path.join(cd, std + '.png'))
                copied += 1

    print()
    print(f'resolved {len(rows) - unresolved} / {len(rows)}   unresolved {unresolved}')
    if a.write:
        print(f'copied {copied} card files into art/heroes/')
    else:
        print('report only — nothing written. re-run with --write')
    return 1 if unresolved else 0


if __name__ == '__main__':
    sys.exit(main())
