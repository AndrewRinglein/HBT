# Ordered attack packets — 2026-09-16

COMBAT-V2-DESIGN sections 8, 15 and 18 own the capability. Authored attacks may carry
`armorPenetration` (integer 0–1,000,000) and `secondaryDamage`, an ordered list of at
most 32 `{id, when, damageType, amount}` rows. IDs are unique local lowercase names;
`base` is reserved. `when` is `hit` or `crit`; a confirmed critical includes both
hit and crit riders, including an injury-only critical. Amounts are flat integers
0–1,000,000; all six existing damage types are accepted. Unknown fields and invalid
types are rejected by compiler and engine loader. The plain schema is identical in
weapon, enemy and TEST attack rows. Physical penetration affects only positive Armor;
it cannot create vulnerability and does not erase existing negative Armor.

The scalar base attack remains packet zero. Secondary amounts do not add source
stats, Power, source damage modifiers, critical multiplication or cover again.
Protection is shared in packet order; each packet uses its own defense. Engine
SWITCHES.md records the one-Frost-contribution and pre-onHit reservation policies.

Two existing authored critical riders are now explicit rows:

* Hand Axe / `attack.hand-axe.chop`: original trigger **`onCrit`, `+4 damage`**.
  Source wording remains: “2026-08-20: Strength +2, -5 Accuracy, 2 stamina, and +4
  damage on a crit.” The original longer source note remains untouched.
* Bane Blade / `attack.bane-blade.banishing-blow`: original trigger **`onCrit`,
  chance 100, `deal 6 more damage`**. Source wording remains: “2026-08-27 review:
  crit +3 replaced with onCrit: +6 damage.”

**Both interpretations are provisional:** their unspecified type inherits physical,
and their extra damage is a separate mitigated packet rather than a bonus merged
into base damage. This means Armor may reduce both base and rider. These are
implementation/balance choices, not new user rulings. Each source row and both
Codex presentations expose that caveat. No penetration amount was invented for a
shipping weapon. Two clearly labeled TEST variants exercise the parameterization.

Conditional Slayer, adjacent-target riders, badge/enchant riders and other unparsed
hooks remain separate gaps. This item does not implement block, bursts, prone,
Impact or knockback from physical damage.

**2026-10-03 — the Hand Axe row was cut.** `item.hand-axe` and its `attack.hand-axe.chop` left the game with ten other tier 0 weapons nobody fields (engine `DECISIONS.md`, 'eleven tier 0 weapons nobody fields are cut', Andrew: “Yeah, remove all of those 11.”). Its critical rider went with it; the Bane Blade's is the one authored critical rider left. Everything above is the 2026-09-16 record and is not rewritten.
