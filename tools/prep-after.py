#!/usr/bin/env python3
"""The after-battle screens' assets, taken from Hell-TCG — ruled 2026-09-04 (Angela):
"exactly recreating this from Hell-TCG … there are sound effects, there is animation …
Yes, go make a new sound file."

    python3 tools/prep-after.py [hell-tcg root]     default ../../hell-tcg

Copies into generated/art/ (the one folder tools/build-slice.mjs inlines):
  · the SOUNDS the three copied screens play — only those, not Hell-TCG's 162 MB library —
    with the id → file, volume and pitch-shift table from src/shared/audioManager.js,
    written to index.json `audio` so src/ui/sound.ts plays them by Hell-TCG's own ids;
  · the reward card BACK (arsenal-blue-tome-v1.png, 645 KB) downscaled to the card's size;
  · the music the reward and level-up screens fade in (New_Dawn.mp3), as `music`.
Generated output. Never hand-edit generated/art/.
"""
import json, os, shutil, sys
from PIL import Image

HERE = os.path.dirname(__file__)
HELL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '..', 'hell-tcg')
OUT = os.path.join(HERE, '..', 'generated', 'art')
INDEX = os.path.join(OUT, 'index.json')
SFX = os.path.join(HELL, 'assets', 'audio', 'sfx')

# id → (folder/file, volume, pitchShift) — the rows of audioManager.js the copied screens use, verbatim
SOUNDS = {
    'click-primary':     ('ui/click-primary-2', 1.5, None),
    'click-secondary':   ('ui/click-secondary', 0.6, None),
    'confirm':           ('ui/confirm', 0.5, None),
    'page-transition':   ('ui/page-transition', 0.5, None),
    'reward-select':     ('rewards/reward-select', 0.5, None),
    'reward-claim':      ('rewards/reward-claim', 0.7, None),
    'reward-reveal':     ('rewards/reward-reveal', 0.6, None),
    'card-land':         ('rewards/reward-select', 0.3, 0.7),
    # audioManager.js points reward-purchase at transitions/elevenlabs/victory-subtle-2, which is not in
    # Hell-TCG's tree (one of the broken references its SOUND-TODO lists); reward-claim is the sound it
    # would have played for the same moment, so it stands in.
    'reward-purchase':   ('rewards/reward-claim', 0.6, None),
    'xp-tick':           ('turns/xp-gain', 0.3, None),
    'levelup-ding':      ('levelup/levelup-confirm', 0.8, None),
    'levelup-confirm':   ('levelup/levelup-confirm', 0.7, None),
    'levelup-promotion': ('levelup/levelup-promotion', 0.8, None),
    'victory-stinger':   ('turns/combat-victory', 0.7, None),
    'defeat-stinger':    ('turns/combat-defeat', 0.6, None),
}
MUSIC = ('music-new-dawn', os.path.join(HELL, 'assets', 'audio', 'music', 'fantasy_ambience', 'FantasyAmbience', 'New_Dawn.mp3'), 0.28)
CARD_BACK = os.path.join(HELL, 'assets', 'cards', 'backdrops-generated', 'arsenal-blue-tome-v1.png')

index = json.load(open(INDEX))
index['audio'] = {}
copied = set()
for sid, (rel, vol, shift) in SOUNDS.items():
    src = os.path.join(SFX, rel + '.mp3')
    if not os.path.exists(src):
        print(f'missing sound: {src}'); sys.exit(1)
    name = 'sfx-' + rel.replace('/', '-') + '.mp3'
    if name not in copied:
        shutil.copyfile(src, os.path.join(OUT, name)); copied.add(name)
        index['files'][name] = {'bytes': os.path.getsize(src)}
    index['audio'][sid] = {'file': name, 'volume': vol, **({'pitchShift': shift} if shift else {})}

mid, mpath, mvol = MUSIC
if os.path.exists(mpath):
    name = 'music-new-dawn.mp3'
    shutil.copyfile(mpath, os.path.join(OUT, name))
    index['files'][name] = {'bytes': os.path.getsize(mpath)}
    index['audio'][mid] = {'file': name, 'volume': mvol, 'music': True}

im = Image.open(CARD_BACK).convert('RGB')
W, H = 320, 440
w, h = im.size
if w / h > W / H:
    nw = int(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
else:
    nh = int(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
im = im.resize((W, H), Image.LANCZOS)
im.save(os.path.join(OUT, 'card-back.jpg'), quality=82, optimize=True)
index['files']['card-back.jpg'] = {'w': W, 'h': H, 'bytes': os.path.getsize(os.path.join(OUT, 'card-back.jpg'))}
index['cardBack'] = 'card-back.jpg'
json.dump(index, open(INDEX, 'w'), indent=1)
total = sum(index['files'][n]['bytes'] for n in index['files'] if n.endswith('.mp3'))
print(f"generated/art: {len(index['audio'])} sounds ({total // 1024} KB), the card back")
