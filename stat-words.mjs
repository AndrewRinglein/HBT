// stat-words.mjs — a Codex stat word (any case, any spacing) as the engine's stat name. THE ONE MAP.
//
// Moved here from mkenginepack.mjs (kingdom.reads-engine, 2026-10-02; engine DECISIONS.md "the duplication review,
// ruled", finding K11 — "a ninth stat-name map, in the kingdom's UI") so the engine pack and the kingdom's item rows
// (kingdom/tools/mk-items.mjs: its set payloads and the Codex words the engine has no stat for) read one map.
// mkenginepack.mjs checks every value against the engine's vocabulary export, so a stat the engine renames or drops
// fails the build, loudly.
export const STAT_OF = {
  str: 'strength', strength: 'strength', pre: 'precision', precision: 'precision', magic: 'magic', spirit: 'spirit',
  acc: 'accuracy', accuracy: 'accuracy', dodge: 'dodge', armor: 'armor', armour: 'armor', resist: 'resist',
  fireresist: 'fireResist', poisonresist: 'poisonResist', shadowresist: 'shadowResist', coldresist: 'coldResist', 'cold resist': 'coldResist', block: 'block',
  rangedblock: 'rangedBlock', 'ranged block': 'rangedBlock', move: 'movement', movement: 'movement', reach: 'reach',
  health: 'maxHp', h: 'maxHp', hp: 'maxHp', 'max hp': 'maxHp', 'max health': 'maxHp',
  staminamax: 'maxStamina', 'stamina max': 'maxStamina', 'max stamina': 'maxStamina', stamina: 'maxStamina',
  staminaregen: 'staminaRegen', 'stamina regen': 'staminaRegen', regen: 'staminaRegen',
  crit: 'crit', luck: 'luck', toughness: 'toughness', surge: 'surge', vision: 'vision', thorns: 'thorns',
  // fix.codex-numbers (2026-10-01, finding C9): the bleed-out and Deathbed stats fold like any other
  bleedoutturns: 'bleedOutTurns', 'bleed-out turns': 'bleedOutTurns', 'turns to bleed out': 'bleedOutTurns',
  deathbedfighting: 'deathbedFighting', 'deathbed fighting': 'deathbedFighting',
  // engine capability.free-attack-accuracy (2026-10-04; engine DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10
  // counterattack' on a weapon is +10 Accuracy on your counterattacks." / "Bonuses 'to special attacks' and 'Dodge against
  // special attacks' apply to all three."): a kind's own Accuracy, the Accuracy on every special free attack, and the Dodge
  // against them fold like any other stat — an item row may carry them
  counterattackaccuracy: 'counterattackAccuracy', 'counterattack accuracy': 'counterattackAccuracy',
  fendaccuracy: 'fendAccuracy', 'fend accuracy': 'fendAccuracy',
  freeattackaccuracy: 'freeAttackAccuracy', 'free attack accuracy': 'freeAttackAccuracy', 'special free attack accuracy': 'freeAttackAccuracy',
  freeattackdodge: 'freeAttackDodge', 'free attack dodge': 'freeAttackDodge', 'dodge against special free attacks': 'freeAttackDodge',
};
/** A Codex stat word as the engine stat a fold (item, badge, level, specialty, aura) may carry, else undefined. */
export const statOf = (w) => w == null ? undefined : STAT_OF[String(w).toLowerCase().replace(/\s+/g, ' ')];
