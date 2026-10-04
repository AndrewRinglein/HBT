#!/usr/bin/env python3
"""The items' card art for the screens that show an item's card — the reward cards on the
rewards screen and the items on Equip — downscaled into generated/art/ as item-<card>.jpg and
listed in index.json under `items` by item id. Run after prep-art.py and prep-heroes.py (it
extends the same index.json). Pillow, like the others; and node, to ask the kingdom what the
items are.

    python3 tools/prep-items.py [art-root]     default ../

kingdom.opening-reward-card-art, 2026-10-04 (Andrew, engine/DECISIONS.md 2026-10-03 'card art on
the level-up and reward screens; ...': "Card art not showing in the reward screen for the flinging
sword." - the Flaming Longsword).

WHERE THE ART IS. The codex's item rows carry no art field (content/hbt-content.json items: id,
name, itemClass, tier, hands, slots ...). The item card art the project holds is the weapon card
references (engine/DECISIONS.md 2026-10-03 'card art for every weapon at tiers 0 and 1'), and
which game row each card serves is written in their own manifests, which this tool reads and
keeps no second list of:
    <art-root>/assets/characters/oathblade-armor/rebuild/candidates/weapon-card-references/
        cards.json        the 17 first cards: id, image, sha256
        prompts-v2.json   keptV1: for each of those 17, `serves` - the item row it serves, when
                          the text begins with an item id ("item.longsword"); otherwise no row
        cards-v2.json     the tiered set as drawn so far: id, image, sha256, items (the rows)
The pictures themselves are under <art-root>/assets/characters/oathblade-armor/generated/ (not
in git). A card's picture is used only when its bytes are the bytes its manifest names (sha256);
a picture that is another one stops the tool - never a wrong picture.

WHICH ITEM SHOWS WHICH CARD. Every item of the kingdom's registry (src/content/items.ts ITEMS,
asked by node as prep-heroes.py asks for the heroes) shows the card that serves its own row, or
- an enchanted, masterwork or combined row ("item.longsword.flaming") - the card that serves its
BASE row: the Flaming Longsword shows the Longsword's card (the ruling: "we don't need all magical
versions of all things, but we do need card art ... for every weapon type"). An item with neither
is listed in index.json `itemsMissing` by id with its name, and the page shows its plain card.
That list is the report of what art is still owed.

Generated output. Never hand-edit generated/art/.
"""
import hashlib, json, os, re, subprocess, sys
from PIL import Image

HERE = os.path.dirname(__file__)
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..')
CHARACTER = os.path.join(ROOT, 'assets', 'characters', 'oathblade-armor')
CARDS = os.path.join(CHARACTER, 'rebuild', 'candidates', 'weapon-card-references')
OUT = os.path.join(HERE, '..', 'generated', 'art')
INDEX = os.path.join(OUT, 'index.json')
W, H = 320, 480   # the 2:3 card, as a hero's portrait is - about 35 KB a card

ASK = """
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const esbuild=createRequire(pathToFileURL(process.cwd()+'/x').href)('../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:"export {ITEMS} from './src/content/items.ts'",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const I=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
console.log(JSON.stringify(I.ITEMS.map(r=>({id:r.id,name:r.name,base:r.base,itemClass:r.itemClass,tier:r.tier}))))
"""
KINGDOM = os.path.join(HERE, '..')
subprocess.run(['node', os.path.join('..', 'engine', 'tools', 'engine-modules.mjs')], cwd=KINGDOM, check=True, stdout=subprocess.DEVNULL)
items = json.loads(subprocess.run(['node', '--input-type=module', '-e', ASK], cwd=KINGDOM, check=True, capture_output=True, text=True, encoding='utf-8').stdout)
if not items:
    sys.exit("prep-items: the kingdom's registry names no item - nothing to prepare")
known = {r['id'] for r in items}


def manifest(name):
    path = os.path.join(CARDS, name)
    if not os.path.exists(path):
        sys.exit(f"prep-items: {path} is missing - the weapon card manifests say which item each card serves")
    return json.load(open(path, encoding='utf-8'))


# card id -> {image, sha256, items}: the rows each card serves, from the manifests' own words
cards = {}
kept = {k['card']: k.get('serves', '') for k in manifest('prompts-v2.json').get('keptV1', [])}
for c in manifest('cards.json'):
    m = re.match(r'item\.[a-z0-9]+(?:[.-][a-z0-9]+)*', kept.get(c['id'], ''))
    cards[c['id']] = {'image': c['image'], 'sha256': c['sha256'], 'items': [m.group(0)] if m else []}
for c in manifest('cards-v2.json'):
    if c['id'] in cards:
        sys.exit(f"prep-items: card '{c['id']}' is in both cards.json and cards-v2.json")
    cards[c['id']] = {'image': c['image'], 'sha256': c['sha256'], 'items': list(c.get('items', []))}

card_of = {}    # item id -> the card that serves its row
for cid in sorted(cards):
    for iid in cards[cid]['items']:
        if iid not in known:
            continue   # a row the manifests name that the kingdom does not hold (cut, or not yet a row)
        if iid in card_of:
            sys.exit(f"prep-items: {iid} is served by two cards, '{card_of[iid]}' and '{cid}' - one card a row")
        card_of[iid] = cid

index = json.load(open(INDEX, encoding='utf-8'))
for name in set((index.get('items') or {}).values()):
    index['files'].pop(name, None)
    if os.path.exists(os.path.join(OUT, name)):
        os.remove(os.path.join(OUT, name))

made, absent = {}, []   # card id -> file name; cards whose picture is not on disk


def picture(cid):
    """The card's file in generated/art, made once; None when its picture is not on disk."""
    if cid in made:
        return made[cid]
    src = os.path.join(CHARACTER, cards[cid]['image'].lstrip('/'))
    if not os.path.exists(src):
        made[cid] = None
        absent.append(cid)
        return None
    if hashlib.sha256(open(src, 'rb').read()).hexdigest() != cards[cid]['sha256']:
        sys.exit(f"prep-items: {src} is not the picture its manifest names (sha256) - never a wrong picture; re-package the cards or fix the file")
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if w / h > W / H:
        nw = int(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((W, H), Image.LANCZOS)
    name = 'item-' + cid + '.jpg'
    path = os.path.join(OUT, name)
    im.save(path, quality=82, optimize=True)
    index['files'][name] = {'w': W, 'h': H, 'bytes': os.path.getsize(path)}
    made[cid] = name
    return name


have, missing = {}, {}
for r in sorted(items, key=lambda r: r['id']):
    cid = card_of.get(r['id']) or (card_of.get(r['base']) if r['base'] else None)
    name = picture(cid) if cid else None
    if name:
        have[r['id']] = name
    else:
        missing[r['id']] = r['name']
index['items'] = have
index['itemsMissing'] = missing
json.dump(index, open(INDEX, 'w', encoding='utf-8', newline='\n'), indent=1)

rows = [r for r in items if not r['base']]
bare = [r for r in rows if r['id'] in missing]
by_class = {}
for r in bare:
    by_class.setdefault(r['itemClass'], []).append(r['name'])
used = sorted(c for c, n in made.items() if n)
print(f"generated/art: {len(used)} item cards ({', '.join(used)}) shown by {len(have)} of {len(items)} items "
      f"({sum(1 for r in rows if r['id'] in have)} of {len(rows)} codex rows, the rest their enchanted, masterwork and combined rows)")
print(f"no card art for {len(missing)} items - {len(bare)} codex rows and the rows made from them: "
      + '; '.join(f"{k} ({len(v)}): {', '.join(sorted(v))}" for k, v in sorted(by_class.items())))
if absent:
    print(f"cards the manifests name whose picture is not on disk here (their items are listed as missing): {', '.join(sorted(absent))}")
unserved = sorted(c for c in cards if not any(i in known for i in cards[c]['items']))
print(f"cards that serve no item row of the kingdom's: {', '.join(unserved) or 'none'}")
