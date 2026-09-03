#!/usr/bin/env python3
"""prep-art.py — the pixel half of the viewer build (THREE-PACKAGES-PLAN stage 1).

Reads the source art (this repo's battle-tokens/, art/, crucible/, assets/, and
the hell-tcg hex-token cutouts on the same machine), downscales and quantizes,
and writes files into generated/art/ plus generated/art/manifest.json — the
ARTMAP the viewer reads (typeId -> token, card, aspect, height). The code half,
tools/build-viewer.mjs, inlines whatever is in generated/art/; it never touches
a source image. Run this only when the art or the map changes.

    python3 tools/prep-art.py [hell-tcg-root]

Stand-ins (imp for the big demons, wolf for hounds, bone-dragon for the drake)
are art-thread debts recorded in VFX/VIEWER-CHECKPOINT.md. Where NOTHING honest
exists the token is a generated 'ART PENDING' standee, never borrowed art.
"""
import io, json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
VIEWER = os.path.dirname(HERE)
ROOT = os.path.dirname(VIEWER)                       # the project root
HELL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), 'hell-tcg')
OUT = os.path.join(VIEWER, 'generated', 'art')
os.makedirs(OUT, exist_ok=True)
os.chdir(ROOT)

def P(p):
    # sources on the sibling hell-tcg checkout are written as HELL:/... — never a machine path
    return p.replace('HELL:', HELL + '/') if p.startswith('HELL:') else p

ARTMAP = {
 'test-oathblade':    {'token':'oathblade_256.png',  'card':'card-oathblade', 'src':'battle-tokens/units/oathblade_256.png',  'cardsrc':'crucible/art/avtair/oathblade-v1.png'},
 'test-sky-pirate':   {'token':'sky-pirate_256.png', 'card':'card-skypirate', 'src':'battle-tokens/units/sky-pirate_256.png', 'cardsrc':'crucible/art/aeronissa/sky-pirate.png'},
 'test-dusk-hawk':    {'token':'dusk-hawk_256.png',  'card':'card-duskhawk',  'src':'battle-tokens/units/dusk-hawk_256.png',  'cardsrc':'crucible/art/avtair/dusk-hawk-v1.png'},
 'test-air-mage':     {'token':'air-mage_256.png',   'card':'card-airmage',   'src':'battle-tokens/units/air-mage_256.png',   'cardsrc':'crucible/art/aeronissa/air-mage.png'},
 'test-lucius':       {'token':'lucius_256.png',     'card':'card-lucius',    'src':'battle-tokens/units/lucius_256.png',     'cardsrc':'crucible/art/base/priest-scantily1.png'},
 'test-osric':        {'token':'osric_256.png',      'card':'card-osric',     'src':'battle-tokens/units/osric_256.png',      'cardsrc':'crucible/art/base/paladin-shiney1.png'},
 'test-zombie':       {'token':'zombie_256.png',     'card':'card-zombie',    'src':'battle-tokens/units/zombie_256.png',     'cardsrc':'assets/bestiary/eve/zombie.png'},
 'test-zombie-burning':{'token':'zombie_256.png',    'card':'card-zombie',    'src':'battle-tokens/units/zombie_256.png',     'cardsrc':'assets/bestiary/eve/zombie.png'},
 # ── scenario typeIds (2026-08-27) ─────────────────────────────────────────
 # Tokens from the battle-tokens cutout library where the family matches;
 # bestiary paintings for the panel card. Where NOTHING honest exists the token
 # is a generated 'ART PENDING' standee (ph:), never borrowed wrong art.
 # Stand-ins (imp for the big demons, wolf for hounds, bone-dragon for the
 # drake) are flagged in VIEWER-CHECKPOINT.md for the art thread.
 'hero.base.ranger-aggressive':{'token':'ranger-aggressive_256.png','card':'card-hunter','src':'battle-tokens/units/ranger-aggressive_256.png','cardsrc':'crucible/art/base/ranger-aggressive1.png'},
 'hero.fixed.orphans':          {'token':'orphan-child_256.png','card':'card-orphan','src':'art/heroes/orphan-child/hex/l1_256.png','cardsrc':'art/heroes/orphan-child/card/l1.png','height':1.0},
 'hero.fixed.lumberjack-and-wife':{'token':'lumberjack_256.png','card':'card-lumberjack','src':'art/heroes/lumberjack/hex/l1_256.png','cardsrc':'art/heroes/lumberjack/card/l1.png','height':1.6},
 'hero.fixed.farmer':           {'token':'farmer_256.png','card':'card-farmer','src':'art/heroes/farmer/hex/l1_256.png','cardsrc':'art/heroes/farmer/card/l1.png','height':1.5},
 'unit.zombie':      {'token':'zombie_256.png','card':'card-zombie','src':'battle-tokens/units/zombie_256.png','cardsrc':'assets/bestiary/eve/zombie.png'},
 'unit.fast-zombie': {'token':'zombie_256.png','card':'card-zombie','src':'battle-tokens/units/zombie_256.png','cardsrc':'assets/bestiary/eve/zombie.png'},
 'unit.skeletal-archer':{'token':'skeletal-archer_256.png','card':'card-skelarcher','src':'battle-tokens/units/skeletal-archer_256.png','cardsrc':'assets/bestiary/eve/skeletal-archer.png'},
 'unit.necromancer': {'token':'necromancer_256.png','card':'card-necro','src':'battle-tokens/units/necromancer_256.png','cardsrc':'assets/bestiary/eve/lesser-necromancer.png'},
 'unit.imp':         {'token':'imp_256.png','card':'card-imp','src':'battle-tokens/units/imp_256.png','cardsrc':'assets/bestiary/eve/imp.png','height':1.2},
 'unit.powerful-imp':{'token':'imp_256.png','card':'card-bloodyimp','src':'battle-tokens/units/imp_256.png','cardsrc':'assets/bestiary/eve/bloody-imp.png','height':1.55},
 'unit.fire-imp':    {'token':'imp_256.png','card':'card-fireimp','src':'battle-tokens/units/imp_256.png','cardsrc':'assets/bestiary/eve/fire-imp.png','height':1.2},
 'unit.poison-imp':  {'token':'imp_256.png','card':'card-basicimp','src':'battle-tokens/units/imp_256.png','cardsrc':'assets/bestiary/eve/basic-imp.png','height':1.2},
 'unit.bruiser-demon':{'token':'imp_256.png','card':'card-firedemon','src':'battle-tokens/units/imp_256.png','cardsrc':'assets/bestiary/eve/fire-demon.png','height':2.0},
 'unit.lieutenant-demon':{'token':'imp_256.png','card':'card-demoncmd','src':'battle-tokens/units/imp_256.png','cardsrc':'assets/bestiary/eve/demon-commander.png','height':2.1},
 'unit.bloodhound':  {'token':'wolf_256.png','card':'card-bloodhound','src':'battle-tokens/units/wolf_256.png','cardsrc':'assets/bestiary/eve/bloodhound.png','height':1.0},
 'unit.hellhound':   {'token':'hellhound_256.png','card':'card-hellhound','src':'HELL:assets/hex-tokens/hellhound_256.png','cardsrc':'assets/bestiary/eve/hellhound.png','height':1.1},
 'unit.zombie-hound':{'token':'wolf_256.png','card':'card-wolf','src':'battle-tokens/units/wolf_256.png','cardsrc':'assets/bestiary/eve/wolf.png','height':1.0},
 'unit.werewolf':    {'token':'werewolf_256.png','card':'card-werewolf','src':'battle-tokens/units/werewolf_256.png','cardsrc':'assets/bestiary/eve/werewolf.png','height':1.85},
 'spirit-snake':     {'ph':'Spirit Snake','card':'card-spiritsnake','cardsrc':'HELL:assets/cards/heroes/fixed/spirit-snake/1.png','height':1.0},
 'green-drake':      {'token':'bone-dragon_256.png','card':'card-greendrake','src':'battle-tokens/units/bone-dragon_256.png','cardsrc':'crucible/art/variants/green-drake-level1.png','height':2.1},
 'shadow-hound-puppy':{'token':'wolf_256.png','card':'card-desertwolf','src':'battle-tokens/units/wolf_256.png','cardsrc':'assets/bestiary/shadows/desert-wolf.png','height':0.8},
 # ── engine HEAD 745922d: the S31 ALPHA TEAM and friends (2026-09-01) ───────
 # The alpha cohort is the test cohort rebuilt on real kits — same characters,
 # so the same tokens and cards. arc-golem and the two base heroes had exact
 # cutouts waiting in battle-tokens / hell-tcg hex-tokens.
 'alpha-oathblade': {'token':'oathblade_256.png', 'card':'card-oathblade','src':'battle-tokens/units/oathblade_256.png', 'cardsrc':'crucible/art/avtair/oathblade-v1.png'},
 'alpha-sky-pirate':{'token':'sky-pirate_256.png','card':'card-skypirate','src':'battle-tokens/units/sky-pirate_256.png','cardsrc':'crucible/art/aeronissa/sky-pirate.png'},
 'alpha-dusk-hawk': {'token':'dusk-hawk_256.png', 'card':'card-duskhawk', 'src':'battle-tokens/units/dusk-hawk_256.png', 'cardsrc':'crucible/art/avtair/dusk-hawk-v1.png'},
 'alpha-air-mage':  {'token':'air-mage_256.png',  'card':'card-airmage',  'src':'battle-tokens/units/air-mage_256.png',  'cardsrc':'crucible/art/aeronissa/air-mage.png'},
 'alpha-lucius':    {'token':'lucius_256.png',    'card':'card-lucius',   'src':'battle-tokens/units/lucius_256.png',    'cardsrc':'crucible/art/base/priest-scantily1.png'},
 'alpha-osric':     {'token':'osric_256.png',     'card':'card-osric',    'src':'battle-tokens/units/osric_256.png',     'cardsrc':'crucible/art/base/paladin-shiney1.png'},
 'arc-golem':       {'token':'stone-golem_256.png','card':'card-golem',   'src':'HELL:assets/hex-tokens/stone-golem_256.png','cardsrc':'assets/bestiary/eve/stone-golem.png','height':2.0},
 'hero.base.priest-armored':{'token':'priest-armored_256.png','card':'card-priestarm','src':'battle-tokens/units/priest-armored_256.png','cardsrc':'crucible/art/base/priest-armored1.png'},
 'hero.base.warrior-iron':  {'token':'warrior-iron_256.png',  'card':'card-warriron', 'src':'battle-tokens/units/warrior-iron_256.png',  'cardsrc':'crucible/art/base/warrior-iron1.png'},
}

def placeholder_token(label):
    W, H = 256, 400
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([48, 352, 208, 396], fill=(20, 18, 14, 140))            # base shadow
    d.rounded_rectangle([78, 120, 178, 370], 34, fill=(58, 54, 46, 235),
                        outline=(122, 112, 92, 255), width=4)          # body
    d.ellipse([92, 44, 164, 116], fill=(58, 54, 46, 235),
              outline=(122, 112, 92, 255), width=4)                    # head
    try:
        f1 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 56)
        f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    init = ''.join(w[0] for w in label.split()[:2]).upper()
    d.text((128, 210), init, font=f1, fill=(232, 222, 190, 255), anchor='mm')
    d.text((128, 300), 'ART', font=f2, fill=(180, 168, 140, 255), anchor='mm')
    d.text((128, 326), 'PENDING', font=f2, fill=(180, 168, 140, 255), anchor='mm')
    return im

written = {}
def save_png(name, im):
    if name in written: return
    if im.mode == 'RGBA': im = im.quantize(256)   # flat-shaded art loses nothing visible, file drops ~60%
    im.save(os.path.join(OUT, name), 'PNG', optimize=True); written[name] = True
def save_jpg(name, im):
    if name in written: return
    im.save(os.path.join(OUT, name), 'JPEG', quality=82, optimize=True); written[name] = True

manifest = {}
for tid, m in ARTMAP.items():
    if 'ph' in m:
        token = 'ph-' + m['ph'].lower().replace(' ', '-') + '.png'
        im = placeholder_token(m['ph'])
    else:
        token = m['token']
        im = Image.open(P(m['src']))
    save_png(token, im.convert('RGBA'))
    card = m.get('card')
    if card:
        cim = Image.open(P(m['cardsrc'])).convert('RGB'); cim.thumbnail((496, 744), Image.LANCZOS)
        save_jpg(card + '.jpg', cim)
    manifest[tid] = {'token': token, 'card': (card + '.jpg') if card else None,
                     'aspect': round(im.width / im.height, 4), 'height': m.get('height', 1.55)}
# the honest standee for a typeId with no art entry at all — Law 1: never borrowed art
save_png('ph-art-pending.png', placeholder_token('Art Pending'))
manifest['_pending'] = {'token': 'ph-art-pending.png', 'card': None, 'aspect': round(256 / 400, 4), 'height': 1.55}
# the parchment surround: a hand-placed SOURCE in art-src/, copied here so generated/ is whole
import shutil
shutil.copyfile(os.path.join(VIEWER, 'art-src', 'parchment.jpg'), os.path.join(OUT, 'parchment.jpg')); written['parchment.jpg'] = True
# swatches stay PNG — their transparent corners went black as JPEG
for sw in ['hexPlains','hexForest','hexHills','hexScrub','hexOcean','hexMountain','hexDirt','hexMarsh']:
    save_png(sw + '.png', Image.open('VFX/battle-screen-mocks/art/%s.png' % sw).convert('RGBA'))
# clear anything this run did not write — a stale token must not ship forever
for f in os.listdir(OUT):
    if f != 'manifest.json' and f not in written:
        os.remove(os.path.join(OUT, f))
json.dump({'_about': 'Generated by tools/prep-art.py — never hand-edit. typeId -> token/card file in this folder, aspect, height. _pending is the ART PENDING standee for any typeId with no entry.',
           'files': sorted(written), 'artmap': manifest}, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('prep-art: %d typeIds · %d files -> generated/art/' % (len(manifest), len(written)))
