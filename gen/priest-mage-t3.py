#!/usr/bin/env python3
"""Three tier-3 priest weapons and two tier-3 mage weapons — the class gap, 2026-09-02.

    python3 gen/priest-mage-t3.py        from content/

Ruled 2026-09-02: "Mages and paladins need specific mage and paladin weapons. Other
classes don't — when it's warrior-limited, that just means only a warrior can use it."
· "A priest basically stays a ranged true-damage caster, and a mage stays a magic-damage
caster at range." · "The lack of mage and [priest] relative items at tier 3 means that
tier 3 just helps all the other classes, because most things like bows and swords aren't
class-limited. Let's add three tier-3 priest items and two tier-3 mage items." · "Let's
stay along in the same theme."

Before: priest t3 ×1 (Sceptre of Salvation), mage t3 ×2 (Void Staff, Orb of the Soul
Stealer). After: priest ×4, mage ×4. Every row keeps its class's theme — the priest's
damage is TRUE and Spirit-scaled at range, the mage's is MAGIC and Magic-scaled at range —
and every one grants two attacks that are a CHOICE, not a strict upgrade
(AUTHORING-GUIDE.md §5: "cheap-and-reliable versus expensive-and-heavy").

Tier 3 buys "two attacks + a power" or about six points (§4). These carry their weight in
the second attack rather than in flat stats, which is what the existing t3s do
(Void Staff: Magic +2, Resist +1, and Unmaking).
"""
import json, os

HERE = os.path.dirname(__file__)
S = 'Ruled 2026-09-02: tier 3 had one priest weapon and two mage weapons, so a tier-3 reward mostly helped the classes whose weapons are unrestricted. Three priest and two mage rows close that, keeping each class\'s theme — the priest ranged and true, the mage ranged and magic.'

ITEMS = [
    # ── priest: ranged, true damage, Spirit-scaled
    dict(id='item.martyrs-censer', name="Martyr's Censer", cls='class.priest', tags=['holy'], hands=1, slots=1,
         stats={'spirit': 1, 'health': -2},
         intent="It burns something of yours to make the light. Every swing of it costs a little blood and buys a little more reach into the dark.",
         attacks=[
             dict(id='attack.martyrs-censer.swing-of-ash', name='Swing of Ash', rng=4, damage=1, stamina=1,
                  desc='The censer swings and the smoke goes where it likes.'),
             dict(id='attack.martyrs-censer.offering', name='Offering', rng=4, damage=4, stamina=2, crit=0,
                  triggers=[{'hook': 'onDamage', 'effect': 'you take 2 true damage'}],
                  desc='Four to them and two to you, every time, and the arithmetic only works while you are standing.'),
         ]),
    dict(id='item.reliquary-of-the-nine-tears', name='Reliquary of the Nine Tears', cls='class.priest', tags=['holy'], hands=1, slots=1,
         stats={'spirit': 1, 'resist': 1},
         intent='Nine saints wept into one jar. What comes out is not comfort — it is a very specific kind of attention.',
         attacks=[
             dict(id='attack.reliquary-of-the-nine-tears.rebuke', name='Lesser Rebuke', rng=5, damage=1, stamina=1,
                  desc='A word said at range, and something in them gives.'),
             dict(id='attack.reliquary-of-the-nine-tears.intercession', name='Intercession', rng=5, damage=2, stamina=2,
                  triggers=[{'hook': 'onDamage', 'effect': "heal the ally nearest the target for half the damage dealt, rounded down"}],
                  desc='Half of what you take out of them goes into whoever is closest to them on your side. It is a bad heal and a fine reason to stand somewhere particular.'),
         ]),
    dict(id='item.chorus-of-the-drowned-choir', name='Chorus of the Drowned Choir', cls='class.priest', tags=['holy'], hands=2, slots=2,
         stats={'spirit': 2, 'movement': -1},
         intent='Two hands, because the singing needs both, and the choir it answers has been underwater for a long time.',
         attacks=[
             dict(id='attack.chorus-of-the-drowned-choir.verse', name='Drowned Verse', rng=6, damage=2, stamina=1,
                  desc='The longest reach a priest has, and it costs one Stamina.'),
             dict(id='attack.chorus-of-the-drowned-choir.antiphon', name='Antiphon', rng=4, damage=3, stamina=3,
                  triggers=[{'hook': 'onHit', 'effect': 'every enemy within 1 hex of the target takes 2 true damage'}],
                  desc='Three to the one you named and two to everything leaning on it. Expensive, and the only thing in a priest\'s hands that hits a crowd.'),
         ]),

    # ── mage: ranged, magic damage, Magic-scaled
    dict(id='item.emberglass-focus', name='Emberglass Focus', cls='class.mage', tags=['wand', 'magic'], hands=1, slots=1,
         stats={'magic': 1, 'crit': 5},
         intent='A lens of cooled fire. One hand, because the other is usually busy holding something that keeps you alive.',
         attacks=[
             dict(id='attack.emberglass-focus.ember', name='Ember', rng=5, damage=2, stamina=1, dmgtype='magic',
                  triggers=[{'hook': 'onCrit', 'effect': 'apply 2 Burn'}],
                  desc='Cheap, quick, and it sets things alight when it goes well.'),
             dict(id='attack.emberglass-focus.bank-the-fire', name='Bank the Fire', rng=5, damage=3, stamina=2, dmgtype='magic',
                  triggers=[{'hook': 'onHit', 'effect': 'apply 1 Burn'}, {'hook': 'onCrit', 'effect': 'apply 2 more Burn'}],
                  desc='Slower and surer: the Burn lands whether or not the dice are kind.'),
         ]),
    dict(id='item.staff-of-the-still-air', name='Staff of the Still Air', cls='class.mage', tags=['staff'], hands=2, slots=2,
         stats={'magic': 2, 'reach': 1, 'health': -2},
         intent='Nothing moves near it that it has not agreed to. The air is still and so, shortly, is everything else.',
         attacks=[
             dict(id='attack.staff-of-the-still-air.hush', name='Hush', rng=6, damage=2, stamina=1, dmgtype='magic',
                  triggers=[{'hook': 'onHit', 'effect': 'the target gains 1 Slow'}],
                  desc='Two damage and a step taken off them, every turn, for one Stamina.'),
             dict(id='attack.staff-of-the-still-air.stillness', name='Stillness', rng=6, damage=4, stamina=3, dmgtype='magic',
                  triggers=[{'hook': 'onHit', 'effect': 'the target gains 3 Slow'}],
                  desc='The whole turn, spent making one thing very late.'),
         ]),
]


def attack_row(a, item):
    return {
        'id': a['id'], 'name': a['name'], 'range': a['rng'],
        'stat': 'spirit' if item['cls'] == 'class.priest' else 'magic',
        'damage': a['damage'], 'stamina': a['stamina'], 'accuracy': a.get('accuracy', 0), 'crit': a.get('crit', 0),
        'hits': 1, 'targets': f"one enemy within {a['rng']} hexes",
        'damageType': a.get('dmgtype', 'true' if item['cls'] == 'class.priest' else 'magic'),
        'tags': [*item['tags'], 'ranged'], 'triggers': a.get('triggers', []), 'slayer': None,
        'description': a['desc'], 'source': S,
    }


def item_row(i):
    return {
        'id': i['id'], 'name': i['name'], 'itemClass': 'weapon', 'tier': 3,
        'hands': i['hands'], 'slots': i['slots'], 'classRestriction': i['cls'],
        'tags': i['tags'], 'grants': [a['id'] for a in i['attacks']],
        'statModifiers': i['stats'], 'triggers': [],
        'intent': i['intent'], 'source': S,
    }


p = os.path.join(HERE, 'settled-items.json')
d = json.load(open(p))
have = {x['id'] for x in d['items']}
haveA = {x['id'] for x in d['attacks']}
added, addedA = [], []
for i in ITEMS:
    if i['id'] not in have:
        d['items'].append(item_row(i)); added.append(i['id'])
    for a in i['attacks']:
        if a['id'] not in haveA:
            d['attacks'].append(attack_row(a, i)); addedA.append(a['id'])
json.dump(d, open(p, 'w'), indent=1, ensure_ascii=False)
print(f'priest/mage t3: {len(added)} items, {len(addedA)} attacks')
for x in added: print('  ', x)
