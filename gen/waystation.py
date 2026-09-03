#!/usr/bin/env python3
"""The Waystation's common items — GEAR-DESIGN.md §4, dictated 2026-09-02.

    python3 gen/waystation.py        from content/

Writes the 22 rows into gen/gear.json (trinkets and weapons where they belong),
deletes the 28 consumables and the four rows the dictation replaced, and puts the
Waystation's catalog band on each row. Idempotent: run it twice, get the same file.

Andrew's rulings this encodes, verbatim where they are numbers:
  · "These are common items … all tier 0 items." · "There are no more consumable
    types" — the consumable class is deleted, its rows with it.
  · "We can remove those existing rows" — item.torch (t1), item.bandages (t1),
    item.bear-trap (t1), item.backpack (relic t1).
  · "Everything here takes a slot, with the exception of [the pickaxe], which takes two."
  · "The net is one-time use … the pickaxe and the burning torch are not. They're weapons."
  · "Waystation stock is a fixed catalog … let's have items unlock with the Waystation
    levels. Torch, Pickaxe, Cure poison, Rations at the lowest level."
  · "For all the first three traps you get to place 2 when you activate it."
  · Poison Coating: "just 60% +1 poison … we can remove the timed trigger."

`uses` is the count per Battle, restocked after (the kingdom's G7). `band` is the
Waystation level that opens the row. Statuses and stats several rows name — Root,
Confusion, Frost immunity, Vision, trap placement, hex burning, stabilize — are
COMBAT-DESIGN vocabulary the ENGINE does not have yet; the rows say what they do and
the pack will name each as a gap. That is the ruled order: content leads, the engine
follows or the gap is named.
"""
import json, os

HERE = os.path.dirname(__file__)
S = 'Ruled 2026-09-02 (GEAR-DESIGN.md §4): the Waystation\'s common items — a fixed catalog, tier 0, unlocked by the building\'s bands, bought for Supplies or Mana Crystals, restocked after each Battle.'

# id, name, class, band, cost {currency: n}, uses (None = permanent), extra fields
COMMON = [
    # ── band 1: "Torch, Pickaxe, Cure poison, Rations at the lowest level"
    dict(id='item.pickaxe', name='Pickaxe', cls='weapon', band=1, cost={'supplies': 5}, hands=2, slots=2,
         tags=['improvised', 'melee'], grants=['attack.pickaxe.pick'],
         intent='A mining tool with a spike on it. It is bad at killing and very good at ruining armour.'),
    dict(id='item.torch', name='Torch', cls='trinket', band=1, cost={'supplies': 3}, slots=1,
         statModifiers={'vision': 4},
         intent='Four Vision for three Supplies. In the dark that is the difference between a fight and an ambush.'),
    dict(id='item.cure-poison', name='Cure Poison', cls='trinket', band=1, cost={'manaCrystals': 9}, slots=1, uses=1,
         free=True, stamina=0, targets='yourself or one ally within 1 hex',
         description='Free, 0 Stamina: remove 2 Poison.',
         intent='Cheap, and it does nothing at all in a fight with no poison in it. That is the trinket bargain.'),
    dict(id='item.rations', name='Rations', cls='trinket', band=1, cost={'supplies': 5}, slots=1, uses=1,
         free=False, stamina=0, targets='self',
         description='Costs your primary action, 0 Stamina: regain 2 Stamina.',
         intent='An action for two Stamina — worth it only when the Stamina buys back more than the action cost.'),

    # ── band 2: "then one of the healing potions and a bunch more items"
    dict(id='item.burning-torch', name='Burning Torch', cls='weapon', band=2, cost={'supplies': 6}, hands=1, slots=1,
         tags=['improvised', 'melee'], grants=['attack.burning-torch.swing'], statModifiers={'vision': 3},
         intent='A weapon that is mostly a light source, and a light source that sets people on fire.'),
    dict(id='item.healing-potion', name='Healing Potion', cls='trinket', band=2, cost={'manaCrystals': 12}, slots=1, uses=1,
         free=True, stamina=0, targets='yourself or one ally within 1 hex',
         description='Free, 0 Stamina: heal 3.',
         intent='Twelve Mana and a slot: the cheapest heal the Waystation sells, and the reason slots fill up early.'),
    dict(id='item.bandages', name='Bandages', cls='trinket', band=2, cost={'supplies': 5}, slots=1, uses=1,
         free=True, stamina=0, targets='one downed ally within 1 hex',
         description='Free, 0 Stamina: stabilize a downed ally — their bleed-out counter stops.',
         intent='It does not stand them up. It stops the clock, which is the part you cannot buy back.'),
    dict(id='item.backpack', name='Backpack', cls='trinket', band=2, cost={'supplies': 8}, slots=1,
         statModifiers={'itemSlots': 2, 'movement': -1, 'staminaMax': -1},
         intent='One slot in, two slots out, and you feel every pound of it.'),
    dict(id='item.poison-flask', name='Poison Flask', cls='trinket', band=2, cost={'manaCrystals': 10}, slots=1, uses=1,
         free=False, stamina=1, targets='one enemy within 4 hexes',
         description='Once per Battle: apply 2 Poison to a target within 4.',
         intent='Poison from four hexes away, on the turn you cannot close.'),
    dict(id='item.burning-oil', name='Burning Oil', cls='trinket', band=2, cost={'manaCrystals': 10}, slots=1, uses=1,
         free=False, stamina=1, targets='one enemy within 3 hexes',
         description='Once per Battle: apply 2 Burn to a target within 3, and the hex it stands on gains Burning.',
         intent='The hex keeps burning after the target moves, which is half of what you paid for.'),
    dict(id='item.net', name='Net', cls='weapon', band=2, cost={'supplies': 7}, hands=0, slots=1, uses=1,
         tags=['thrown'], grants=['attack.net.cast'],
         intent='No hands, one throw, and the biggest thing on the field stops moving.'),

    # ── band 3
    dict(id='item.greater-healing-potion', name='Greater Healing Potion', cls='trinket', band=3, cost={'manaCrystals': 20}, slots=1, uses=1,
         free=False, stamina=1, targets='yourself or one ally within 1 hex',
         description='Once per Battle, costs your primary action and 1 Stamina: heal 6.',
         intent='Twice the healing for the whole action — the emergency, not the economy.'),
    dict(id='item.frenzy-potion', name='Frenzy Potion', cls='trinket', band=3, cost={'manaCrystals': 15}, slots=1, uses=1,
         free=True, stamina=0, targets='self',
         description='Free: until the end of your Activation, gain +2 Strength and +20 Crit, and lose 20 Accuracy.',
         intent='You will hit less often and much harder. Drink it on the turn you were going to swing anyway.'),
    dict(id='item.strength-potion', name='Strength Potion', cls='trinket', band=3, cost={'manaCrystals': 15}, slots=1, uses=1,
         free=False, stamina=2, targets='self',
         description='Once per Battle, 2 Stamina: gain +1 Strength and lose 5 Accuracy for the rest of the Battle.',
         intent='A point of Strength for two Stamina and a little aim, and it lasts the fight.'),
    dict(id='item.poison-coating', name='Poison Coating', cls='trinket', band=3, cost={'manaCrystals': 10}, slots=1, uses=1,
         free=False, stamina=1, targets='yourself or one ally within 1 hex',
         description='Once per Battle, 1 Stamina: for the rest of the Battle, the target\'s hits have a 60% chance to apply 1 Poison.',
         intent='Put it on the hero who swings most, not the one who swings hardest.'),
    dict(id='item.winter-cloak', name='Winter Cloak', cls='trinket', band=3, cost={'supplies': 6}, slots=1, uses=1,
         free=False, stamina=1, targets='self',
         description='Once per Battle, 1 Stamina: gain Immunity to Frost 1 for the rest of the Battle.',
         intent='Useless in most fights, and the reason you survive the one on the ice.'),
    dict(id='item.brilliant-torch', name='Brilliant Torch', cls='trinket', band=3, cost={'manaCrystals': 10}, slots=1, uses=1,
         statModifiers={'vision': 5}, free=False, stamina=1, targets='every hex within 4',
         description='+5 Vision. Once per Battle, 1 Stamina: reveal every stealthed unit within 4.',
         intent='Five Vision all fight, and one moment where nothing is hidden.'),
    dict(id='item.bear-trap', name='Bear Traps', cls='trinket', band=3, cost={'supplies': 12}, slots=1, uses=1,
         free=False, stamina=1, targets='two empty hexes within 3',
         description='Once per Battle: place two traps on empty hexes within 3. The first unit to enter one takes 4 physical damage and gains Root 1.',
         intent='Two hexes the enemy would rather not walk through, which is how you choose where the fight happens.'),

    # ── band 4
    dict(id='item.magic-trap', name='Magic Trap', cls='trinket', band=4, cost={'manaCrystals': 20}, slots=1, uses=1,
         free=False, stamina=1, targets='two empty hexes within 3',
         description='Once per Battle: place two traps on empty hexes within 3. The first unit to enter one takes magic damage equal to twice your Magic and gains Slow 3.',
         intent='It scales off you, so the mage who places it is the mage who should.'),
    dict(id='item.fire-trap', name='Fire Trap', cls='trinket', band=4, cost={'manaCrystals': 20}, slots=1, uses=1,
         free=False, stamina=1, targets='two empty hexes within 3',
         description='Once per Battle: place two traps on empty hexes within 3. The first unit to enter one takes magic damage equal to your Magic, gains Burn 1, and the hex gains Burning.',
         intent='The hex is still burning when the second one walks in.'),
    dict(id='item.explosive-trap', name='Explosive Trap', cls='trinket', band=4, cost={'manaCrystals': 25}, slots=1, uses=1,
         free=False, stamina=1, targets='one empty hex within 3',
         description='Once per Battle: place one trap on an empty hex within 3. The first unit to enter it, and every unit within 1 hex, takes magic damage equal to your Magic plus 2.',
         intent='One trap instead of two, and everyone standing near it regrets the crowd.'),
    dict(id='item.free-movement-potion', name='Potion of Free Movement', cls='trinket', band=4, cost={'manaCrystals': 20}, slots=1, uses=1,
         free=False, stamina=1, targets='yourself or one ally within 1 hex',
         description='Once per Battle, 1 Stamina: the target gains +1 Movement for the rest of the Battle and loses 2 Root and 2 Slow.',
         intent='The answer to being held, bought before you knew you would be.'),
]

# the attacks the three weapons grant
ATTACKS = [
    dict(id='attack.pickaxe.pick', name='Pick', range='melee', stat='strength', damage=-3, stamina=1, accuracy=0, crit=0,
         hits=1, targets='one enemy in melee reach', damageType='physical', tags=['improvised', 'melee'],
         triggers=[{'hook': 'onHit', 'chance': 90, 'effect': 'the target loses 1 Armor for the rest of the Battle'}], slayer=None,
         source=S + ' The Pickaxe: "a strength attack at -3 damage, costs 1 stamina, and on hit there\'s a 90% chance of -1 armor."'),
    dict(id='attack.burning-torch.swing', name='Swing', range='melee', stat='strength', damage=-2, stamina=1, accuracy=0, crit=0,
         hits=1, targets='one enemy in melee reach', damageType='physical', tags=['improvised', 'melee'],
         triggers=[{'hook': 'onHit', 'chance': 80, 'effect': 'apply 1 Burn'}], slayer=None,
         source=S + ' The Burning Torch: "attacked as strength -2. On hit, an 80% chance of inflicting burn 1."'),
    dict(id='attack.net.cast', name='Cast', range=3, stat='precision', damage=0, stamina=1, accuracy=0, crit=0,
         hits=1, targets='one enemy within 3 hexes', damageType='physical', tags=['thrown'],
         triggers=[{'hook': 'onHit', 'chance': 70, 'effect': 'apply 1 Root'}], slayer=None,
         source=S + ' The Net: "an attack that does 0 damage. On hit, a 70% chance of doing root 1, range of 3."'),
]

# rows the dictation replaced or retired
REPLACED = {'item.torch', 'item.bandages', 'item.bear-trap', 'item.backpack'}


def row(c):
    out = {
        'id': c['id'], 'name': c['name'], 'itemClass': c['cls'], 'tier': 0,
        'slots': c.get('slots', 1), 'hands': c.get('hands', 0), 'classRestriction': None,
        'statModifiers': c.get('statModifiers', {}), 'triggers': [], 'grants': c.get('grants', []),
        'equipCost': {}, 'persists': True, 'tags': c.get('tags', []),
        'waystationBand': c['band'], 'price': c['cost'],
        'intent': c['intent'], 'source': S,
    }
    if 'uses' in c: out['uses'] = c['uses']
    for k in ('free', 'stamina', 'targets', 'description'):
        if k in c: out[k] = c[k]
    return out


gear = json.load(open(os.path.join(HERE, 'gear.json')))
weapons = json.load(open(os.path.join(HERE, 'weapons.json')))

# 1. the consumable class goes, and the four replaced rows with it
dropped = [i['id'] for i in gear.get('consumables', [])]
gear['_cutConsumables2026_09_02'] = {
    'why': 'Ruled 2026-09-02: "we\'re going to delete all the items that are consumables … I don\'t think we need consumable as a category unto itself." The Waystation\'s one-use trinkets replace the cost model; a used item restocks after the Battle.',
    'ids': dropped,
}
gear['consumables'] = []
for key in ('trinkets', 'relics', 'bloodrunes', 'idols'):
    gear[key] = [i for i in gear[key] if i['id'] not in REPLACED]
weapons['items'] = [i for i in weapons['items'] if i['id'] not in REPLACED]

# 2. the common items, in their categories
new_trinkets = [row(c) for c in COMMON if c['cls'] == 'trinket']
new_weapons = [row(c) for c in COMMON if c['cls'] == 'weapon']
gear['trinkets'] = [i for i in gear['trinkets'] if not i.get('waystationBand')] + new_trinkets
weapons['items'] = [i for i in weapons['items'] if not i.get('waystationBand')] + new_weapons
have = {a['id'] for a in weapons['attacks']}
weapons['attacks'] = [a for a in weapons['attacks'] if a['id'] not in {x['id'] for x in ATTACKS}] + ATTACKS

json.dump(gear, open(os.path.join(HERE, 'gear.json'), 'w'), indent=1, ensure_ascii=False)
json.dump(weapons, open(os.path.join(HERE, 'weapons.json'), 'w'), indent=1, ensure_ascii=False)
print(f'waystation: {len(new_trinkets)} trinkets + {len(new_weapons)} weapons + {len(ATTACKS)} attacks; '
      f'{len(dropped)} consumables deleted; replaced {sorted(REPLACED)}')
