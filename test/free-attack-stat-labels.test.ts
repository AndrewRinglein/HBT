// capability.free-attack-accuracy (engine item, 2026-10-04; engine DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10
// counterattack' on a weapon is +10 Accuracy on your counterattacks." / "Bonuses 'to special attacks' and 'Dodge against special
// attacks' apply to all three."): the Longsword's and the Great Sword's rows carry Counterattack Accuracy now, so Equip's line for
// either sword names a stat the label table did not hold — it would have read "+10 counterattackaccuracy". The four stats of the
// special free attacks have their words (kingdom SWITCHES.md freeAttackStatLabels).
import { describe, expect, it } from 'vitest'
import { ITEMS } from '../src/engine.js'
import { STAT_LABEL, statLabelOf } from '../src/content/stat-labels.js'

describe('the special free attacks\' stats have words', () => {
  it('a kind\'s own Accuracy, the Accuracy on every special free attack, and the Dodge against them', () => {
    expect(statLabelOf('counterattackAccuracy')).toBe('Counterattack Accuracy')
    expect(statLabelOf('fendAccuracy')).toBe('Fend Accuracy')
    expect(statLabelOf('freeAttackAccuracy')).toBe('Special Free Attack Accuracy')
    expect(statLabelOf('freeAttackDodge')).toBe('Dodge against Special Free Attacks')
  })

  it('the two swords that carry one: every stat on the Longsword\'s and the Great Sword\'s rows reads as words, not as its id', () => {
    for (const sword of ['item.longsword', 'item.greatsword']) {
      const stats = Object.keys(ITEMS[sword]!.statModifiers)
      expect(stats, sword).toContain('counterattackAccuracy')
      // a one-word stat's id IS its word (block reads "block"); a stat of several words needs its label
      for (const k of stats) expect(/[A-Z]/.test(k) ? STAT_LABEL[k] : k, `${sword} ${k}`).toBeTruthy()
    }
  })
})
