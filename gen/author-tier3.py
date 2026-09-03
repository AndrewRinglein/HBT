#!/usr/bin/env python3
"""The tier-3 combinations — authored by hand (the picks dict IS the authoring), written
as `+ shaped` entries into 2-ACTIONS-SETTLED.md and as gen/tier3-combinations.json.
Andrew, 2026-09-02: "go and author them." Names are the session's; strike any row.

    python3 content/gen/author-tier3.py        from the project root
"""
import json, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
d = json.load(open(os.path.join(ROOT, 'content/hbt-content.json')))
items = {i['id']: i for i in d['items']}

# base → enchants that fit what the base already is. Never a cross product.
PICKS = {
 'greatsword': ['bloodletting', 'soul-reaper', 'sacrifice', 'demon-slayer', 'destroying', 'the-master'],
 'war-axe': ['bloodletting', 'ironbane', 'bloodthirsty', 'death', 'taunting'],
 'iron-mace': ['ironbane', 'holy-water', 'undead-slayer', 'heavens-edge'],
 'war-hammer': ['ironbane', 'frost', 'recklessness', 'destroying', 'taunting'],
 'hunting-spear': ['hunting', 'giant-slayer', 'dragon-slayer', 'venomous'],
 'glaive': ['bloodletting', 'giant-slayer', 'dragon-slayer', 'death', 'taunting'],
 'crossbow': ['venomous', 'gale', 'hunting', 'abundant', 'magic', 'goading', 'giant-slayer'],
 'hand-crossbow': ['venomous', 'hunting', 'magic', 'abundant'],
 'rapier': ['shadow-touched', 'the-master', 'frost', 'death'],
 'raiders-cutlass': ['bloodletting', 'werewolf-bane', 'bloodthirsty', 'death'],
 'throwing-knives': ['venomous', 'hunting', 'gale', 'werewolf-bane'],
 'poison-stars': ['venomous', 'hunting', 'frost'],
 'obsidian-fang-dagger': ['venomous', 'bloodletting', 'shadow-touched', 'addling', 'hobbling', 'werewolf-bane'],
 'duel-runeblades': ['bloodletting', 'lightning', 'frost', 'sacrifice'],
 'shepherds-sling': ['venomous', 'hunting', 'abundant', 'magic', 'gale'],
 'crippling-whip': ['frost', 'shadow-touched', 'death'],
 'iron-claws': ['venomous', 'bloodletting', 'werewolf-bane', 'bloodthirsty'],
 'grappling-harpoon': ['giant-slayer', 'dragon-slayer', 'hunting', 'frost'],
 'apprentice-wand': ['lightning', 'eternal-ice', 'cursed-skull'],
 'ancient-tome': ['lightning', 'eternal-ice', 'cursed-skull'],
 'holy-texts': ['holy-water', 'undead-slayer', 'heavens-edge', 'demon-slayer'],
 'bane-blade': ['demon-slayer', 'holy-water', 'undead-slayer', 'sacrifice'],
 'sword-of-the-fallen': ['undead-slayer', 'heavens-edge', 'holy-water', 'soul-reaper'],
 'daggers': ['venomous', 'shadow-touched', 'addling', 'hobbling', 'bloodletting', 'death'],
 'longbow': ['rooting', 'gale', 'hunting', 'venomous', 'magic', 'goading', 'dragon-slayer', 'frost'],
 'shortbow': ['rooting', 'abundant', 'venomous', 'goading', 'hunting', 'fire'],
 'elfbow': ['gale', 'magic', 'shadow-touched', 'rooting', 'fire'],
 'barbarian-bow': ['hunting', 'giant-slayer', 'fire', 'recklessness', 'rooting'],
 'javelin': ['giant-slayer', 'hunting', 'venomous', 'frost'],
 'longsword': ['bloodletting', 'the-master', 'demon-slayer', 'undead-slayer', 'werewolf-bane', 'taunting', 'destroying'],
 'halberd': ['giant-slayer', 'bloodletting', 'death', 'taunting', 'destroying'],
 'fire-staff': ['cursed-skull', 'maddening', 'bewildering', 'lightning'],
 'frost-staff': ['eternal-ice', 'bewildering', 'cursed-skull'],
 'earth-staff': ['cursed-skull', 'maddening', 'eternal-ice'],
 'lightning-staff': ['lightning', 'bewildering', 'maddening'],
 'force-staff': ['eternal-ice', 'lightning', 'cursed-skull', 'bewildering'],
 'holy-symbol': ['holy-water', 'undead-slayer', 'bewildering', 'cursed-skull'],
 'priest-chain': ['holy-water', 'undead-slayer', 'heavens-edge', 'demon-slayer'],
 'buckler': ['riposte'], 'knight-shield': ['riposte'], 'tower-shield': ['riposte'],
 'silkweave-armor': ['stormward', 'blessed', 'charmed', 'scalding-ward', 'fire-ward'],
 'barbarian-hide': ['silkweave', 'stormward', 'thorned', 'tainted-blood', 'regeneration'],
 'studded-leather': ['silkweave', 'stormward', 'blessed', 'charmed', 'scalding-ward'],
 'heavy-leather': ['silkweave', 'warded', 'thorned', 'durable', 'fire-ward'],
 'brutes-harness': ['thorned', 'tainted-blood', 'might', 'regeneration', 'stormward'],
 'heavy-chain': ['warded', 'durable', 'enduring', 'might', 'runed'],
 'mismatched-armor': ['thorned', 'tainted-blood', 'damned', 'durable', 'regeneration'],
 'creature-hide': ['tainted-blood', 'regeneration', 'stormward', 'scalding-ward', 'enduring'],
 'guardians-mail': ['runed', 'ancient-ward', 'divine-protection', 'durable', 'white-steel', 'enduring'],
 'plated-armor': ['runed', 'ancient-ward', 'might', 'thorned', 'durable', 'white-steel'],
 'reflective-armor': ['warded', 'fire-ward', 'divine-protection', 'cursed-skull', 'damned'],
 'soaked-plate': ['runed', 'ancient-ward', 'enduring', 'might', 'damned', 'white-steel'],
}
# 'pre' → "<Word> <Base>"; 'of' → "<Base> of <Word>"
NAME = {
 'frost': ('pre', 'Frost'), 'venomous': ('pre', 'Venomous'), 'bloodletting': ('pre', 'Bloodletting'), 'hunting': ('pre', 'Hunting'),
 'lightning': ('pre', 'Lightning'), 'holy-water': ('of', 'Holy Water'), 'shadow-touched': ('pre', 'Shadow-Touched'), 'gale': ('pre', 'Gale'),
 'abundant': ('pre', 'Abundant'), 'magic': ('pre', 'Magic'), 'bloodthirsty': ('pre', 'Bloodthirsty'), 'undead-slayer': ('of', 'Undead-Slaying'),
 'demon-slayer': ('of', 'Demon-Slaying'), 'ironbane': ('pre', 'Ironbane'), 'giant-slayer': ('of', 'Giant-Slaying'), 'werewolf-bane': ('pre', 'Werewolf-Bane'),
 'eternal-ice': ('of', 'Eternal Ice'), 'soul-reaper': ('of', 'the Soul Reaper'), 'dragon-slayer': ('of', 'Dragon-Slaying'), 'sacrifice': ('of', 'Sacrifice'),
 'recklessness': ('of', 'Recklessness'), 'death': ('of', 'Death'), 'heavens-edge': ('of', "Heaven's Edge"), 'the-master': ('of', 'the Master'),
 'destroying': ('of', 'Destroying'), 'rooting': ('of', 'Rooting'), 'hobbling': ('pre', 'Hobbling'), 'addling': ('pre', 'Addling'),
 'taunting': ('pre', 'Taunting'), 'goading': ('pre', 'Goading'), 'bewildering': ('pre', 'Bewildering'), 'maddening': ('pre', 'Maddening'), 'fire': ('pre', 'Fire'),
 'runed': ('pre', 'Runed'), 'warded': ('pre', 'Warded'), 'ancient-ward': ('of', 'the Ancient Ward'), 'fire-ward': ('pre', 'Fire-Warded'),
 'stormward': ('pre', 'Stormward'), 'thorned': ('pre', 'Thorned'), 'silkweave': ('pre', 'Silkweave'), 'blessed': ('pre', 'Blessed'), 'riposte': ('of', 'Riposte'),
 'scalding-ward': ('pre', 'Scalding'), 'cursed-skull': ('of', 'the Cursed Skull'), 'tainted-blood': ('of', 'Tainted Blood'),
 'divine-protection': ('of', 'Divine Protection'), 'white-steel': ('pre', 'White-Steel'), 'charmed': ('pre', 'Charmed'), 'durable': ('pre', 'Durable'),
 'damned': ('pre', 'Damned'), 'might': ('of', 'Might'), 'enduring': ('pre', 'Enduring'), 'regeneration': ('of', 'Regeneration'),
}

rows = []
for base, ens in PICKS.items():
    it = items['item.' + base]
    for e in ens:
        kind, word = NAME[e]
        name = f'{word} {it["name"]}' if kind == 'pre' else f'{it["name"]} of {word}'
        rows.append({'id': f'item.{base}.{e}', 'name': name, 'base': 'item.' + base, 'enchant': 'enchant.' + e, 'tier': 3, 'itemClass': it['itemClass']})

weapons = sum(1 for b in PICKS if items['item.' + b]['itemClass'] == 'weapon' and 'shield' not in items['item.' + b].get('tags', []))
out = ['', '---', '', '## 2026-09-02 — the tier-3 combinations, `+ shaped`', '',
 '*Authored by hand on Andrew\'s "go and author them" (2026-09-02); the picks live in',
 '`content/gen/author-tier3.py`, which writes this section and `content/gen/tier3-combinations.json`.*',
 '', '**Shape**, once for every row: a tier-3 `item.*` with id `item.<base>.<enchant>`. `itemClass`,',
 '`hands`, `slots`, `classRestriction`, `tags` and `grants` are the base row\'s; `statModifiers` are the',
 'base\'s plus the enchant\'s; `triggers` are the base\'s then the enchant\'s (source = the enchant);',
 '`slayer{}` is the enchant\'s. Rewards only — never sold. Name: "<Enchant> <Base>" for adjective',
 'enchants, "<Base> of <Enchant>" otherwise. Every enchant is in GEAR-DESIGN.md §3a with its edited',
 'payload. **Intent, per base:** the enchants that fit what the base already is — a paladin\'s blade',
 'slays demons, a bow roots, heavy plate wards, a staff bewilders — never a random cross product.',
 'Strike any row.', '',
 '| id | name | base | enchant |', '|---|---|---|---|']
out += [f"| `{r['id']}` | {r['name']} | `{r['base']}` | `{r['enchant']}` |" for r in rows]
out += ['', f'*{len(rows)} rows across {len(PICKS)} bases: {weapons} weapons, 3 shields (Riposte only), 12 armors.*', '']

settled = os.path.join(ROOT, '2-ACTIONS-SETTLED.md')
text = open(settled, encoding='utf8').read()
marker = '## 2026-09-02 — the tier-3 combinations, `+ shaped`'
if marker in text:
    text = text[:text.index('\n---\n\n' + marker)]
open(settled, 'w', encoding='utf8').write(text.rstrip('\n') + '\n' + '\n'.join(out))
json.dump(rows, open(os.path.join(ROOT, 'content/gen/tier3-combinations.json'), 'w'), indent=1)
print(f'{len(rows)} tier-3 rows written')
