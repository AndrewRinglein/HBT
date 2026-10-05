// The items Andrew authored — the list the reward draw deals from (kingdom.rewards-only-authored, 2026-10-04).
//
// Ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'reported on the Item Ledger: items that do things the game has no mechanic
// for, authored by a chat and not by him'): "I guess we could just ignore all the items not authored by me to start with."
// and, asked whether the set-aside items should also stop appearing as battle rewards, "One yes. Stop appearing as battle
// rewards." — only items he authored are offered as rewards until he says otherwise.
//
// THIS IS THE REVIEW'S READING OF WHO AUTHORED EACH ROW, NOT ANDREW'S MARKING. It was copied on 2026-10-04 from the item
// review of that day (CONTENT-DRAFTS/2026-10-04-item-review/authorship.json — a draft folder, not in git): the rows the
// review classed as in the game and his, 98 of the 316 it read as in the game, each with the review's own 'why' line beside
// it. Since then, by his word: +6 on 2026-10-04 (the six Hell-TCG items, the last group of the list) — 104 ids.
// He marks rows on the Item Ledger (https://claude.ai/artifact/MD6dZGa5TDCv9YxTWfdc5q), and ANDREW'S WORD MOVES A ROW ON
// OR OFF THIS LIST — a row is added or taken out here, by hand, with the date and his words in its 'why'. Nothing
// regenerates this file.
//
// Who reads it: src/content/rewards.ts, and nothing else — the reward pool is filtered by it. What a hero or an enemy is
// fielded with, what the Forge or the Waystation sells, the items themselves and what a save already holds do not read it.
// The ids are item ids and, for the Forge's Enchantments and the tier-3 attributes, the engine's 'enchant.' ids (an
// attribute is not an item; the items that carry it are — kingdom SWITCHES.md rewards.derivedRowsOffered, ruled on
// 2026-10-04: a row made of a base on this list carrying an attribute on this list is his too, and is dealt).
// test/rewards-only-authored.test.ts names any id here that is not in the game.

export type AuthoredRow = { readonly id: string; readonly why: string }

/** The day the list was copied from the review. */
export const AUTHORED_ITEMS_DATED = '2026-10-04'

export const AUTHORED_ITEMS: readonly AuthoredRow[] = [
  // weapons — 28
  { id: 'item.dagger', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.javelin', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.longbow', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.shortbow', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.elfbow', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.barbarian-bow', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.halberd', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.fire-staff', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.frost-staff', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.earth-staff', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.lightning-staff', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.force-staff', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.staff-of-summoning', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.staff-of-the-magi', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.staff-of-the-destroyer', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.staff-of-the-ultimate-destroyer', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.holy-symbol', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.priest-chain', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.fire-gauntlet', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.chains-of-the-wrathful', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.benevolent-rod', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.book-of-karma', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.rod-of-imprisonment', why: '“Ruled 2026-09-02b, dictated: the priest and mage ladder above tier 3, and the sets it hangs on.”' },
  { id: 'item.pickaxe', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.burning-torch', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.pile-of-rocks', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.pitchfork', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.club', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  // armor — 15
  { id: 'item.basic-armor', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.destroyed-mail', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.flowing-cloak', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.nice-robes', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.ragged-hides', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.rusted-plate', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.barbarian-hide', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.creature-hide', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.heavy-chain', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.heavy-leather', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.mismatched-armor', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.plated-armor', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.reflective-armor', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.soaked-plate', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'item.studded-leather', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  // trinkets — 25
  { id: 'item.backpack', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.bandages', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.bear-trap', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.brilliant-torch', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.burning-oil', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.cure-poison', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.explosive-trap', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.fire-trap', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.frenzy-potion', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.greater-healing-potion', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.healing-potion', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.magic-trap', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.net', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.poison-coating', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.poison-flask', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.free-movement-potion', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.rations', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.strength-potion', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.torch', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.winter-cloak', why: '“Ruled 2026-09-02: the Waystation’s common items — a fixed catalog”; your table of that day names it with its numbers' },
  { id: 'item.banner-mystic-power', why: '“Dictated 2026-09-02.”' },
  { id: 'item.banner-assassin', why: '“Dictated 2026-09-02.”' },
  { id: 'item.banner-vigil', why: '“Dictated 2026-09-02. the name is a chat’s — the priest banner was dictated unnamed 2026-09-02.”' },
  { id: 'item.banner-courage', why: '“Dictated 2026-09-02.”' },
  { id: 'item.banner-heroism', why: '“Dictated 2026-09-02.”' },
  // Enchantments (the tier-2 Forge attribute) — 9
  { id: 'enchant.heavy', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.keen', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.cruel', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.far', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.long', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.hale', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.lucky', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.nimble', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  { id: 'enchant.fleet', why: '“Ruled 2026-09-02 … ‘enchanted basically gives an item an additional stat point’ … Named by the kingdom session”' },
  // attributes (tier 3 and up) — 21
  { id: 'enchant.fire', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.recklessness', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.death', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.heavens-edge', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.the-master', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.destroying', why: '“Ruled 2026-09-02 — a tier-3 ingredient, found on a reward weapon, never sold. Named by the kingdom session the same day.”' },
  { id: 'enchant.rooting', why: '“Ruled 2026-09-02 — a tier-3 ingredient, found on a reward weapon, never sold. Named by the kingdom session the same day.”' },
  { id: 'enchant.hobbling', why: '“Ruled 2026-09-02 — a tier-3 ingredient, found on a reward weapon, never sold. Named by the kingdom session the same day.”' },
  { id: 'enchant.addling', why: '“Ruled 2026-09-02 — a tier-3 ingredient, found on a reward weapon, never sold. Named by the kingdom session the same day.”' },
  { id: 'enchant.taunting', why: '“Ruled 2026-09-02, recovered from "Weapons and enchantments", where it was dictated and never landed. Named by the kingdom session.”' },
  { id: 'enchant.goading', why: '“Ruled 2026-09-02, recovered from "Weapons and enchantments", where it was dictated and never landed. Named by the kingdom session.”' },
  { id: 'enchant.bewildering', why: '“Ruled 2026-09-02, recovered from "Weapons and enchantments", where it was dictated and never landed. Named by the kingdom session.”' },
  { id: 'enchant.maddening', why: '“Ruled 2026-09-02, recovered from "Weapons and enchantments", where it was dictated and never landed. Named by the kingdom session.”' },
  { id: 'enchant.flaming', why: 'Dictated 2026-09-20: “Tier 3. This is a basic attack. On hit, 1 burn and 2 fire damage.”' },
  { id: 'enchant.white-steel', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.charmed', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.durable', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.damned', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.might', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.enduring', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  { id: 'enchant.regeneration', why: '“settled content”: it is listed in your 2026-08-09 content dump (“All stated, none inferred”)' },
  // from Hell-TCG as it was — ruled his 2026-10-04 (kingdom.rewards-hell-tcg-rows-his) — 6: three weapons, three armor.
  // The review had kept these apart as rows it could not class; his word moved them on.
  { id: 'item.shadow-dagger', why: 'from Hell-TCG as it was; ruled his 2026-10-04 (Andrew, asked whether the six Hell-TCG items that came over unchanged count as his: "1. Yes" — "So all of these are in.") — the review: “Hell-TCG name reused (Rogue, Shadow Dagger — on-kill Dodge kept)”' },
  { id: 'item.twin-talon-bow', why: 'from Hell-TCG as it was; ruled his 2026-10-04 (Andrew, asked whether the six Hell-TCG items that came over unchanged count as his: "1. Yes" — "So all of these are in.") — the review: “Hell-TCG name reused (Ranger, Twin Talon Bow — on-damage Bleed kept)”' },
  { id: 'item.pharaohs-gauntlets', why: 'from Hell-TCG as it was; ruled his 2026-10-04 (Andrew, asked whether the six Hell-TCG items that came over unchanged count as his: "1. Yes" — "So all of these are in.") — the review: “Hell-TCG name reused (Pharaoh\'s Gauntlets — on-attack Weak kept)”' },
  { id: 'item.silkweave-armor', why: 'from Hell-TCG as it was; ruled his 2026-10-04 (Andrew, asked whether the six Hell-TCG items that came over unchanged count as his: "1. Yes" — "So all of these are in.") — the review: “Hell-TCG name reused (Ebony Mask, Silkweave Armor — +1 Armor / -2 Health kept almost verbatim)”' },
  { id: 'item.scorpion-carapace', why: 'from Hell-TCG as it was; ruled his 2026-10-04 (Andrew, asked whether the six Hell-TCG items that came over unchanged count as his: "1. Yes" — "So all of these are in.") — the review: “Hell-TCG name reused (Scorpion Carapace — the on-hit thorns-and-poison kept as the trigger)”' },
  { id: 'item.wraithform-cloak', why: 'from Hell-TCG as it was; ruled his 2026-10-04 (Andrew, asked whether the six Hell-TCG items that came over unchanged count as his: "1. Yes" — "So all of these are in.") — the review: “Hell-TCG name reused (Priest, Wraithform Cloak — +2 Resist / +2 Dodge / −2 Ranged kept as the shape)”' },
]

/**
 * Off the list until he says (kingdom SWITCHES.md rewards.unknownAuthorRowsOffered, off): the rows the review could not
 * class as his or a chat's — 3 relics with no known author. The reward draw deals none of them while the switch is off;
 * they are kept here, apart, so that his word is one edit: move the row up, or delete it.
 *
 * Until 2026-10-04 this also held the 6 rows that came from Hell-TCG unchanged, under one switch for both groups
 * (rewards.hellTcgRowsOffered). He ruled the six his the same day ("1. Yes" — "So all of these are in."; engine/DECISIONS.md
 * 'every dead line on his items is a feature that is needed; his items stay in rewards; the six Hell-TCG items are his'), so
 * they are rows of the list above; the relics were not asked about and stay here.
 */
export const AUTHORSHIP_UNDECIDED: readonly AuthoredRow[] = [
  { id: 'item.trackers-eyeglass', why: 'no known author — “Replaces that row, whose name described a trait rather than an object. Same numbers.”' },
  { id: 'item.censer-of-the-high-choir', why: 'no known author — “Replaces that row Same numbers, an unambiguously object name.”' },
  { id: 'item.gravediggers-lantern', why: 'no known author — “Replaces that row, whose name described a person rather than an object. Same numbers.”' },
]
