// The words a screen shows for a stat — kingdom.reads-engine (2026-10-02; engine DECISIONS.md "the duplication review,
// ruled", finding K11: "a ninth stat-name map, in the kingdom's UI"). ONE label table, keyed by the ENGINE's stat
// names: the level rows, the specialties, the item rows and the set payloads are all the engine's, in its names
// (itemSlots is the campaign's own quantity). Display words only — no rule reads this.

export const STAT_LABEL: Readonly<Record<string, string>> = { maxHp: 'Health', maxStamina: 'Max Stamina', staminaRegen: 'Stamina Regen', itemSlots: 'Item Slot', accuracy: 'Accuracy', crit: 'Crit', strength: 'Strength', precision: 'Precision', magic: 'Magic', spirit: 'Spirit', armor: 'Armor', resist: 'Resist', dodge: 'Dodge', reach: 'Reach', movement: 'Movement', luck: 'Luck', vision: 'Vision', toughness: 'Toughness', surge: 'Surge', thorns: 'Thorns',
  // capability.free-attack-accuracy (engine item, 2026-10-04): the special free attacks' four stats - the Longsword and the Great Sword carry the first
  counterattackAccuracy: 'Counterattack Accuracy', fendAccuracy: 'Fend Accuracy', freeAttackAccuracy: 'Special Free Attack Accuracy', freeAttackDodge: 'Dodge against Special Free Attacks' }

/** The label for a stat — the engine's name itself when the table has none. */
export const statLabelOf = (k: string): string => STAT_LABEL[k] ?? k
