#!/usr/bin/env python3
"""The priest/mage gear pass of 2026-09-02b — cuts, edits and eleven new rows.

    python3 gen/priest-mage-2026-09-02.py        from content/

Supersedes gen/priest-mage-t3.py, whose five rows were CUT in the same pass that
authored them. Idempotent: run it twice, get the same files.

WHAT WAS RULED, from the marked-up workbook and the dictation of 2026-09-02b:

  "I deleted a whole bunch of items that shouldn't be in there, that had stat
   modifiers, and weren't fitting, so I deleted a bunch."

  The eight cut rows are exactly the priest and mage WEAPONS carrying flat stat
  modifiers. Every weapon that survives carries none. Read with the earlier ruling
  -- "shields don't give stat modifiers innately. Armor does." -- the rule is:

      A WEAPON CARRIES NO FLAT STAT MODIFIERS. Armor does. A weapon buys its
      tier in attacks, powers, triggers and set bonuses.

  So the Scepter of Salvation loses its spirit +1 and keeps everything else, and
  none of the eleven rows below carries a statModifiers block.

THE ELEVEN NEW ROWS, dictated. Numbers are his; names are mine where he left the
thing unnamed, and are marked in each row's source note so they can be overruled
cheaply.

  mage   t3  Fire Gauntlet             one hand -- fire + gauntlet
  mage   t3  Staff of Summoning        summons a wolf; hunts other summons
  mage   t4  Staff of the Magi         RING set; Power Ward, Vortex
  mage   t5  Staff of the Destroyer    DESTROYER set; eats corpses
  mage   t6  Staff of the Ultimate Destroyer   DESTROYER set
  priest t3  Chains of the Wrathful    CHAIN set
  priest t3  Benevolent Rod            two heals, one of them free
  priest t3  Book of Karma             BOOK set; the second source of Karma
  priest t4  Rod of Imprisonment       Imprison, Sanctuary

SIX TAGS ARE NEW -- book, fire, gauntlet, summon, ring, destroyer -- and four of
them are SET tags: a set is a tag plus a per-item bonus written on the item that
cares. That keeps sets inside the vocabulary that exists instead of opening a
`set.*` kind. tag.tome is retired: it had exactly one holder, the Ancient Tome,
and the workbook retags it `book`.

WHAT THE ENGINE CANNOT DO YET is listed at the end of the run, not hidden.
"""
import json, os

HERE = os.path.dirname(__file__)
D = 'Ruled 2026-09-02b (marked-up gear workbook): a weapon carries no flat stat modifiers -- armor does. Every priest and mage weapon holding one was cut, and the survivors were stripped.'
S = 'Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.'

# ---------------------------------------------------------------- 1. the cuts
CUT_ITEMS = [
    'item.void-staff', 'item.orb-of-the-soul-stealer', 'item.wraith-touched-staff',
    'item.emberglass-focus', 'item.staff-of-the-still-air',
    'item.martyrs-censer', 'item.reliquary-of-the-nine-tears', 'item.chorus-of-the-drowned-choir',
]

# ------------------------------------------------------- 2. edits in place
# (file, collection, id) -> {field: value}. A value of None DELETES the field.
EDITS = {
    ('weapons.json', 'items', 'item.ancient-tome'): {
        'tags': ['book', 'magic'],
        '+source': ' | 2026-09-02b workbook: tag tome -> book. The BOOK set needs one tag, and tome had exactly one holder.',
    },
    ('settled-items.json', 'items', 'item.holy-symbol'): {
        'tags': ['holy'],
        '+source': ' | 2026-09-02b workbook: tagged staff, which it is not. It is a holy symbol.',
    },
    ('settled-items.json', 'items', 'item.priest-chain'): {
        'tags': ['holy', 'chain'],
        '+source': ' | 2026-09-02b workbook: joins the CHAIN set.',
    },
    ('weapons.json', 'items', 'item.book-of-exorcisms'): {
        'tier': 3, 'tags': ['holy', 'book'],
        '+source': ' | 2026-09-02b workbook: tier 2 -> 3, and tagged holy + book (was staff). Joins the BOOK set.',
    },
    ('weapons.json', 'items', 'item.scepter-of-salvation'): {
        'tags': ['holy'], 'statModifiers': {},
        '+source': ' | 2026-09-02b workbook: spirit +1 removed -- a weapon carries no flat stat modifiers. Tagged holy (was staff).',
    },
    ('armor-enchants.json', 'items', 'item.chains-of-the-faithful'): {
        'tier': 3, 'tags': ['armor', 'medium', 'chain'],
        'triggers': [{'hook': 'aura', 'effect': 'AURA radius 2 -- allies inside have Immunity to Burn 1'}],
        '+source': ' | 2026-09-02b workbook: tier 2 -> 3; joins the CHAIN set; the onAttack self-Burn is cut -- the armor no longer charges you for swinging.',
    },
    ('armor-enchants.json', 'items', 'item.skypriests-vestments'): {
        'statModifiers': {'spirit': 1, 'resist': 1, 'dodge': 5, 'health': -1},
        'intent': 'Spirit is a party-wide sum, so this is a point for everyone and one fewer Health for exactly one person.',
        '+source': ' | 2026-09-02b workbook: spirit +2 / health -4 -> spirit +1 / health -1. Two party-wide Spirit for four Health was the wrong trade at the tier.',
    },
    # the damage lines, rewritten in the fields that already exist
    ('weapons.json', 'attacks', 'attack.book-of-exorcisms.reading'): {
        'stat': 'precision', 'halfStatBonus': 'spirit', 'damage': 0, 'tags': ['holy', 'ranged'],
        'description': "Damage equals your Precision plus half the party's Spirit.",
        '+source': ' | 2026-09-02b workbook: spirit+2 -> precision + 1/2 spirit, the blend the guide names.',
    },
    ('weapons.json', 'attacks', 'attack.book-of-exorcisms.rite-of-expulsion'): {
        'stat': 'precision', 'halfStatBonus': 'spirit', 'damage': 0, 'tags': ['holy', 'ranged', 'area'],
        'description': "Damage equals your Precision plus half the party's Spirit plus your own Resist: you push with the same wards that keep it off you. As an area effect it does not roll and cannot crit.",
        '+source': ' | 2026-09-02b workbook: spirit + resist -> precision + 1/2 spirit + resist.',
    },
    ('weapons.json', 'attacks', 'attack.scepter-of-salvation.rebuke'): {
        'stat': 'precision', 'halfStatBonus': 'spirit', 'addsStat': None, 'damage': 0, 'tags': ['holy', 'ranged'],
        'description': "Damage equals your Precision plus half the party's Spirit.",
        '+source': " | 2026-09-02b workbook: spirit + magic -> precision + 1/2 spirit. A priest weapon should not be paying out on the party's Magic.",
    },
}

# Two rows change SHAPE -- an attack on an ally becomes a power. Powers and attacks
# live in different collections, so these are a delete-and-write, not an edit.
ATTACKS_BECOMING_POWERS = ['attack.holy-texts.mercy', 'attack.scepter-of-salvation.salvation']
REGRANT = {  # item id -> old attack id -> new power id
    'item.holy-texts': {'attack.holy-texts.mercy': 'power.holy-texts.mercy'},
    'item.scepter-of-salvation': {'attack.scepter-of-salvation.salvation': 'power.scepter-of-salvation.salvation'},
}

NEW_POWERS_FROM_ATTACKS = [
    dict(id='power.holy-texts.mercy', name='Mercy', owner='item.holy-texts', stamina=2, cooldown=0, warmup=0,
         free=False, targets='one ally within 4 hexes', tags=['heal'],
         description='Heal the target for 2 + half your Spirit.',
         intent='The same book either way -- you are choosing which of two people it is aimed at.',
         source='2026-09-02b workbook: Mercy was written as an ATTACK aimed at an ally, which is not a thing the engine can be asked to do. It is a power. ' + S),
    dict(id='power.scepter-of-salvation.salvation', name='Salvation', owner='item.scepter-of-salvation', stamina=2,
         cooldown=0, warmup=0, free=False, targets='one ally within 5 hexes', tags=['heal'],
         description='Heal the target for 4 + your Spirit.',
         intent='The mercy you were going to spend anyway, aimed on purpose for once.',
         source='2026-09-02b workbook: was an attack aimed at an ally; rewritten as a power, healing 4 + Spirit. ' + S),
]

# ---------------------------------------------------------- 3. the new tags
NEW_TAGS = [
    dict(id='tag.book', group='form'),        # BOOK set
    dict(id='tag.fire', group='theme'),
    dict(id='tag.gauntlet', group='form'),
    dict(id='tag.summon', group='kind'),      # what a summoned unit is, so slayers can name it
    dict(id='tag.ring', group='form'),        # RING set
    dict(id='tag.destroyer', group='theme'),  # DESTROYER set
]
RETIRE_TAGS = ['tag.tome']

# --------------------------------------------------------- 4. the new items
# Every one is a weapon, so NONE carries statModifiers (the rule above).
ITEMS = [
    # ---------------------------------------------------------------- mage
    dict(id='item.fire-gauntlet', name='Fire Gauntlet', cls='class.mage', tier=3, hands=1, slots=1,
         tags=['gauntlet', 'fire', 'magic'],
         intent='The one mage weapon that wants you in reach. Strength swings it and Magic is what actually burns.',
         powers=[
             dict(id='power.fire-gauntlet.stoke', name='Stoke', stamina=1, cooldown=0, targets='self', tags=['fire'],
                  description='For your next 3 Activations, every hit you land applies Burn equal to half your Magic, rounded nearest, 0.5 up.',
                  intent='A mage buying three Activations of burn onto whatever else they were already doing.'),
         ],
         attacks=[
             dict(id='attack.fire-gauntlet.fire-punch', name='Fire Punch', rng='melee', stat='strength', damage=0,
                  stamina=1, dmgtype='magic', tags=['melee', 'fire', 'brawl'],
                  targets='one enemy in melee reach',
                  triggers=[{'hook': 'onHit', 'effect': 'apply Burn equal to half your Magic, rounded nearest, 0.5 up'}],
                  desc='Damage equals your Strength, dealt as magic, and it leaves half your Magic burning on them.'),
         ]),
    dict(id='item.staff-of-summoning', name='Staff of Summoning', cls='class.mage', tier=3, hands=2, slots=2,
         tags=['staff', 'magic'],
         intent='It calls one thing up and it is unusually good at putting other people\'s things back down.',
         powers=[
             dict(id='power.staff-of-summoning.call-the-wolf', name='Call the Wolf', stamina=2, cooldown=5,
                  targets='an empty hex adjacent to you', tags=['summon'],
                  description='Summon one Wolf on a hex adjacent to you. It is a summoned ally with its own stat block and its own AI.',
                  intent='Two Stamina and a five-Turn wait for a body that is not yours.'),
         ],
         attacks=[
             dict(id='attack.staff-of-summoning.unbinding', name='Unbinding', rng=5, stat='precision', damage=0,
                  stamina=2, dmgtype='magic', halfStatBonus='magic', tags=['ranged'],
                  accuracyVs={'summon': 15},
                  targets='one enemy within 5 hexes',
                  desc="Damage equals your Precision plus half the party's Magic, and you are 15 Accuracy better against anything summoned."),
         ]),
    dict(id='item.staff-of-the-magi', name='Staff of the Magi', cls='class.mage', tier=4, hands=2, slots=2,
         tags=['staff', 'magic'],
         setBonus={'tag': 'ring', 'each': {'magic': 1}},
         setBonusText='+1 Magic for every RING you are wearing.',
         intent='The staff is the smaller half. What it really is, is a reason to fill every slot you own with rings.',
         powers=[
             dict(id='power.staff-of-the-magi.power-ward', name='Power Ward', stamina=2, cooldown=10, warmup=3,
                  targets='self', tags=['defence-power'],
                  description='You gain 8 + (Magic x 2) Protection.',
                  intent='Three Turns of warning and ten of waiting, for the largest single block in the game.'),
             dict(id='power.staff-of-the-magi.vortex', name='Vortex', stamina=3, cooldown=0,
                  targets='a hex within 5 hexes and every hex adjacent to it', tags=['area'],
                  description="Deal magic damage equal to Magic x 3 to every unit in the blast. It does not roll to hit, so it cannot crit. Using it lowers the party's Magic by 1 AND the enemy side's Power by 1 for the rest of the Battle.",
                  intent='It eats the magic out of the field -- yours and theirs, one point each. The blast is enormous and every spell cast after it, on either side, is smaller.'),
         ],
         attacks=[]),
    dict(id='item.staff-of-the-destroyer', name='Staff of the Destroyer', cls='class.mage', tier=5, hands=2, slots=2,
         tags=['staff', 'magic', 'destroyer'],
         setBonus={'tag': 'destroyer', 'each': {'attackDamage': 1}},
         setBonusText='+1 damage for every DESTROYER item you carry.',
         intent='Nothing it kills gets to be raised, walked past, or mourned. There is no corpse.',
         powers=[],
         attacks=[
             dict(id='attack.staff-of-the-destroyer.ruin', name='Ruin', rng=8, stat='precision', damage=0, stamina=3,
                  dmgtype='magic', doubleStatBonus='magic', cooldown=3, tags=['ranged', 'destroyer'],
                  targets='one enemy within 8 hexes',
                  triggers=[{'hook': 'onKill', 'effect': 'the corpse is destroyed'}],
                  desc="Damage equals your Precision plus twice the party's Magic. Anything it kills leaves nothing behind."),
             dict(id='attack.staff-of-the-destroyer.sundering', name='Sundering', rng=10, stat='precision', damage=0,
                  stamina=3, dmgtype='magic', doubleStatBonus='magic', cooldown=3, tags=['ranged', 'destroyer', 'stun'],
                  targets='one enemy within 10 hexes',
                  triggers=[{'hook': 'onHit', 'effect': 'apply 2 Stun'},
                            {'hook': 'onKill', 'effect': 'the corpse is destroyed'}],
                  desc='The same damage two hexes further out, and it takes two Activations off whatever survives it.'),
         ]),
    dict(id='item.staff-of-the-ultimate-destroyer', name='Staff of the Ultimate Destroyer', cls='class.mage', tier=6,
         hands=2, slots=2, tags=['staff', 'magic', 'destroyer'],
         setBonus={'tag': 'destroyer', 'each': {'attackDamage': 1}},
         setBonusText='+1 damage for every DESTROYER item you carry.',
         intent='The last staff. It doubles the stat it scales on and then scales on it.',
         powers=[
             dict(id='power.staff-of-the-ultimate-destroyer.perfect-sight', name='Perfect Sight', stamina=2, cooldown=0,
                  targets='self', tags=[],
                  description='Until the end of your third Activation from now, your Precision is doubled (Precision added to Precision).',
                  intent='Two Stamina to make the next three Activations count twice.',
                  src=' | CONFIRMED 2026-09-03: "add precision to precision" -- the dictation\'s "perception" was Precision, and the effect is doubling, not a flat bonus.'),
         ],
         attacks=[
             dict(id='attack.staff-of-the-ultimate-destroyer.annihilation', name='Annihilation', rng=8, stat='precision',
                  damage=0, stamina=4, dmgtype='magic', doubleStatBonus='magic', doubleStat=True, cooldown=5,
                  tags=['ranged', 'destroyer'],
                  targets='one enemy within 8 hexes',
                  desc="Damage equals twice your Precision plus twice the party's Magic. Once every five Turns, and it costs most of a Turn's Stamina."),
         ]),

    # -------------------------------------------------------------- priest
    dict(id='item.chains-of-the-wrathful', name='Chains of the Wrathful', cls='class.priest', tier=3, hands=2, slots=2,
         tags=['holy', 'chain'],
         setBonus={'tag': 'chain', 'each': {'precision': 1}},
         setBonusText='+1 Precision for every CHAIN item you carry.',
         intent='Both hands, swung wide. It is the only priest weapon that does not care which one of them it hits.',
         powers=[
             dict(id='power.chains-of-the-wrathful.weight-of-sin', name='Weight of Sin', stamina=2, cooldown=0,
                  targets='every enemy within 3 hexes', tags=['area'],
                  description='Every enemy within 3 hexes gains Weak equal to half your Spirit, rounded nearest, 0.5 up, and 2 Slow.',
                  intent='No damage at all -- it just makes the next three things everyone else does land harder.'),
         ],
         attacks=[
             dict(id='attack.chains-of-the-wrathful.wrathful-sweep', name='Wrathful Sweep', rng=3, stat='spirit',
                  damage=1, stamina=3, dmgtype='true', tags=['area', 'holy'],
                  targets='every enemy within 3 hexes',
                  src=' | The dictated line is "1+spirit" with no Precision term, which makes this the ONLY attack in the codex still scaling on Spirit alone -- every other priest attack was moved to precision + 1/2 spirit in the same pass. Kept as dictated; it is the two-handed area weapon, so paying entirely in the party stat is the trade.',
                  desc="Damage equals 1 plus the party's Spirit, to everything within 3 hexes. As an area effect it does not roll and cannot crit."),
         ]),
    dict(id='item.benevolent-rod', name='Benevolent Rod', cls='class.priest', tier=3, hands=1, slots=1, tags=['holy'],
         intent='One good heal on a clock and one small one you can spend every single Turn.',
         powers=[
             dict(id='power.benevolent-rod.restoration', name='Mending Light', stamina=2, cooldown=2,
                  targets='one ally within 4 hexes', tags=['heal'],
                  description='Heal the target for (Spirit x 2) + 2, give it Protection equal to your Spirit, and remove Weak equal to your Spirit.',
                  intent='Three things at once, which is why it waits two Turns between castings.'),
             dict(id='power.benevolent-rod.small-mercy', name='Small Mercy', stamina=0, cooldown=0, free=True,
                  targets='one ally within 7 hexes', tags=['heal'],
                  description='Free, 0 Stamina: heal the target for your Spirit.',
                  intent='Costs nothing and reaches seven hexes, so there is never a Turn it is wrong to use.'),
         ],
         attacks=[]),
    dict(id='item.book-of-karma', name='Book of Karma', cls='class.priest', tier=3, hands=1, slots=1,
         tags=['holy', 'book'],
         setBonus={'tag': 'book', 'each': {'resist': 1}},
         setBonusText='+1 Resist for every BOOK you carry.',
         intent='The ledger is kept whether or not you read it aloud. Reading it aloud is how someone else gets paid.',
         powers=[
             dict(id='power.book-of-karma.balance-the-ledger', name='Balance the Ledger', stamina=1, cooldown=0,
                  targets='one ally within 6 hexes', tags=['heal'],
                  description='Heal the target for 3 + half your Spirit, rounded nearest, 0.5 up, and give it 2 Karma.',
                  intent='The heal is the smaller half. Karma makes every heal after it bigger and every hit it lands harder.'),
         ],
         attacks=[]),
    dict(id='item.rod-of-imprisonment', name='Rod of Imprisonment', cls='class.priest', tier=4, hands=1, slots=1,
         tags=['holy'],
         intent='It does not hurt anything. It takes one thing off the board for a Turn -- theirs, or, when it has to be, yours.',
         powers=[
             dict(id='power.rod-of-imprisonment.imprison', name='Imprison', stamina=1, cooldown=0,
                  targets='one enemy within 8 hexes', tags=['stun'],
                  description='Until the end of its next Activation the target has +10 Armor and +10 Resist. It also gains 1 Stun and 2 Root.',
                  intent='You pay for the Stun by making it briefly very hard to kill. Use it on the thing you were never going to kill this Turn.'),
             # DICTATED NAME "Sanctuary" -- power.protector.sanctuary already owns it, and one
             # display name has one owner. Renamed HALLOW; overrule this cheaply if you want the
             # Protector's power renamed instead.
             dict(id='power.rod-of-imprisonment.sanctuary', name='Hallow', stamina=2, cooldown=0, free=True,
                  targets='self', tags=['defence-power'],
                  description='Free: until the end of your next Activation you have +10 Armor, +10 Resist, 2 Root and -100 Accuracy.',
                  intent='You stop being a threat and you stop being a target. It is the button you press when the answer is to survive the Turn.'),
         ],
         attacks=[]),
]

# What the ENGINE cannot express yet. Named, not hidden (CLAUDE.md content intake, rule 4).
GAPS = [
    ('accuracyVs', 'attack.staff-of-summoning.unbinding', 'Accuracy that is conditional on a target TAG. `slayer` scales damage, not the roll; there is no accuracy-versus-tag field.'),
    ('tag.summon on a unit', 'rule.summon-order', 'Slaying/accuracy against summoned units needs summoned units to CARRY the tag. rule.summon-order gives them a number, not a tag.'),
    ('doubleStatBonus', 'attack.staff-of-the-destroyer.ruin +3', 'Damage = stat + 2x another stat. `addsStat` adds one, `halfStatBonus` adds a half; there is no doubling field.'),
    ('doubleStat', 'attack.staff-of-the-ultimate-destroyer.annihilation', 'The attack\'s OWN stat doubled.'),
    ('cooldown on an attack', 'attack.staff-of-the-destroyer.ruin +2', 'Cooldown is a POWER field. Three of these attacks carry one.'),
    ('lowering a global scalar for the Battle', 'power.staff-of-the-magi.vortex', "Vortex takes 1 off the party-wide Magic sum AND 1 off the enemy side's POWER (COMBAT-DESIGN.md line 647: \"Power is the enemy's Magic ... a single global scalar for the whole enemy side\"). Nothing writes to either global mid-Battle today, and Power is not in the codex's 20-stat ladder because it is not a hero stat."),
    ('stat doubling for a duration', 'power.staff-of-the-ultimate-destroyer.perfect-sight', 'Precision doubled for 3 Activations -- a multiplier, not a flat modifier.'),
    ('on-hit rider granted for a duration', 'power.fire-gauntlet.stoke', 'A power that adds an onHit effect to every attack for 3 Activations.'),
    ('corpse destruction on kill', 'attack.staff-of-the-destroyer.ruin +1', 'rule.corpses defines the corpse; an onKill that DESTROYS it needs the hook.'),
    ('setBonus', '6 items', 'A per-item-carrying-a-tag bonus, resolved when the party is built and shipped to combat (GEAR-DESIGN.md: "set bonuses should be looked up when the players are being built").'),
    ('status removal scaled by a stat', 'power.benevolent-rod.restoration', 'Remove Weak equal to Spirit.'),
    ('Karma from a second source', 'power.book-of-karma.balance-the-ledger', 'COMBAT-DESIGN.md line 985 says "Karma has exactly one source -- the Beast\'s Carrion specialty". That is now false and the line is owed a rewrite.'),
]


# ============================================================== the machinery
def load(f):
    return json.load(open(os.path.join(HERE, f), encoding='utf-8'))


def save(f, d):
    json.dump(d, open(os.path.join(HERE, f), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


def power_row(p, item):
    return {
        'id': p['id'], 'name': p['name'], 'specialty': None, 'owner': item['id'],
        'stamina': p['stamina'], 'cooldown': p.get('cooldown', 0), 'warmup': p.get('warmup', 0),
        'free': p.get('free', False), 'targets': p['targets'], 'tags': p.get('tags', []),
        'description': p['description'], 'source': S + p.get('src', ''), 'triggers': p.get('triggers', []),
        'intent': p.get('intent', ''),
    }


def attack_row(a, item):
    r = {
        'id': a['id'], 'name': a['name'], 'range': a['rng'], 'stat': a['stat'],
        'damage': a.get('damage', 0), 'stamina': a['stamina'],
        'accuracy': a.get('accuracy', 0), 'crit': a.get('crit', 0), 'hits': 1,
        'targets': a['targets'], 'damageType': a['dmgtype'], 'tags': a.get('tags', []),
        'triggers': a.get('triggers', []), 'slayer': None,
        'description': a['desc'], 'source': S + a.get('src', ''),
    }
    for k in ('halfStatBonus', 'addsStat', 'doubleStatBonus', 'doubleStat', 'accuracyVs', 'cooldown'):
        if k in a:
            r[k] = a[k]
    return r


def item_row(i):
    r = {
        'id': i['id'], 'name': i['name'], 'itemClass': 'weapon', 'tier': i['tier'],
        'hands': i['hands'], 'slots': i['slots'], 'classRestriction': i['cls'],
        'tags': i['tags'],
        'grants': [p['id'] for p in i['powers']] + [a['id'] for a in i['attacks']],
        'statModifiers': {}, 'triggers': [],
        'intent': i['intent'], 'source': S,
    }
    if 'setBonus' in i:
        r['setBonus'] = i['setBonus']
        r['setBonusText'] = i['setBonusText']
    return r


weapons = load('weapons.json')
settled_items = load('settled-items.json')
armor = load('armor-enchants.json')
settled = load('../settled.json') if os.path.exists(os.path.join(HERE, '../settled.json')) else None
FILES = {'weapons.json': weapons, 'settled-items.json': settled_items, 'armor-enchants.json': armor}

# ---- 1. cuts: the items, and every attack and power they owned
cut_ids = set(CUT_ITEMS)
owned = set()
for f, d in FILES.items():
    for i in d.get('items', []):
        if i['id'] in cut_ids:
            owned.update(i.get('grants', []))
owned.update(ATTACKS_BECOMING_POWERS)
removed = {'items': 0, 'attacks': 0, 'powers': 0}
for f, d in FILES.items():
    for coll, drop in (('items', cut_ids), ('attacks', cut_ids | owned), ('powers', cut_ids | owned)):
        if coll not in d:
            continue
        before = len(d[coll])
        d[coll] = [x for x in d[coll] if x['id'] not in drop]
        removed[coll] += before - len(d[coll])

# ---- 2. edits
missed = []
for (f, coll, iid), fields in EDITS.items():
    row = next((x for x in FILES[f][coll] if x['id'] == iid), None)
    if row is None:
        missed.append(iid)
        continue
    for k, v in fields.items():
        if k.startswith('+'):
            k2 = k[1:]
            if v not in (row.get(k2) or ''):
                row[k2] = (row.get(k2) or '') + v
        elif v is None:
            row.pop(k, None)
        else:
            row[k] = v
if missed:
    raise SystemExit('priest-mage pass: these rows were not found and could not be edited: ' + ', '.join(missed))

# ---- 3. regrant: the two ally-attacks become powers on their items
for iid, mapping in REGRANT.items():
    row = next((x for d in FILES.values() for x in d.get('items', []) if x['id'] == iid), None)
    if row is None:
        raise SystemExit(f'priest-mage pass: {iid} not found for regrant')
    row['grants'] = [mapping.get(g, g) for g in row['grants']]
settled_items.setdefault('powers', [])
have_p = {p['id'] for p in settled_items['powers']}
for p in NEW_POWERS_FROM_ATTACKS:
    if p['id'] not in have_p:
        settled_items['powers'].append({
            'id': p['id'], 'name': p['name'], 'specialty': None, 'owner': p['owner'],
            'stamina': p['stamina'], 'cooldown': p['cooldown'], 'warmup': p['warmup'],
            'free': p['free'], 'targets': p['targets'], 'tags': p['tags'],
            'description': p['description'], 'source': p['source'], 'triggers': [], 'intent': p['intent'],
        })

# ---- 4. the new rows
have_i = {x['id'] for d in FILES.values() for x in d.get('items', [])}
have_a = {x['id'] for d in FILES.values() for x in d.get('attacks', [])}
have_p = {p['id'] for p in settled_items['powers']}
added = []
for i in ITEMS:
    if i['id'] not in have_i:
        settled_items['items'].append(item_row(i))
        added.append(i['id'])
    for p in i['powers']:
        if p['id'] not in have_p:
            settled_items['powers'].append(power_row(p, i))
    for a in i['attacks']:
        if a['id'] not in have_a:
            settled_items['attacks'].append(attack_row(a, i))

# ---- 4b. the enchant lists follow the tags. tome -> book everywhere, and the broad
# melee enchants pick up `gauntlet`, so the new forms are not forms nothing can enchant.
for e in armor.get('enchants', []) + settled_items.get('enchants', []):
    t = e.get('appliesToTags')
    if not t:
        continue
    if 'tome' in t:
        t[:] = ['book' if x == 'tome' else x for x in t]
    if ('brawl' in t or 'hammer' in t) and 'gauntlet' not in t:
        t.append('gauntlet')

save('weapons.json', weapons)
save('settled-items.json', settled_items)
save('armor-enchants.json', armor)

# ---- 5. tags
if settled is not None:
    tags = settled.setdefault('tags', [])
    have_t = {t['id'] for t in tags}
    for t in NEW_TAGS:
        if t['id'] not in have_t:
            tags.append(t)
    tags[:] = [t for t in tags if t['id'] not in RETIRE_TAGS]
    json.dump(settled, open(os.path.join(HERE, '../settled.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

print(f"cut: {removed['items']} items, {removed['attacks']} attacks, {removed['powers']} powers")
print(f"edited: {len(EDITS)} rows; regranted: 2 ally-attacks -> powers")
print(f"added: {len(added)} items")
for x in added:
    print('  ', x)
print(f"tags: +{len(NEW_TAGS)} ({', '.join(t['id'] for t in NEW_TAGS)}), retired {RETIRE_TAGS}")
print('\nENGINE GAPS this pass names (' + str(len(GAPS)) + '):')
for name, where, why in GAPS:
    print(f'  - {name}  [{where}]\n      {why}')
