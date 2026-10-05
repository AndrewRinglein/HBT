// viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a letter').
// Andrew: "None of the player units or enemy units should have numbers or letters. ... It's fine for the zombies just to be
// zombie, zombie, zombie, zombie." Kingdom's half: the screens between battles and the play layer's notes name a unit as the
// battle screen does - the engine's own name less the mark that tells it from another of its kind, through the viewer's one
// function (viewer src/names.js shownName). The victory screen's civilians are the case with marked names in them: two of
// one kind used to keep the engine's numbers.
import { describe, it, expect } from 'vitest'
import { listBattleCivilians } from '../src/view/civilians.js'
import { switchLine } from '../src/ui/refusals.js'
import { shownName } from '../../viewer/src/names.js'
import { RESCUABLE_CIVILIANS } from '../src/content/heroes.js'
import type { CampaignState } from '../src/core/campaign.js'
import type { EngagementResult } from '../src/core/seam.js'

const CHILD = 'hero.fixed.orphans'
const unit = (typeId: string, name: string, more: Record<string, unknown> = {}) => ({ typeId, name, side: 'hero', role: 'civilian', lifeState: 'standing', downed: false, stood: false, ...more })
const result = (units: unknown[]) => ({ outcome: 'heroClear', units }) as unknown as EngagementResult
const campaign = { roster: {} } as unknown as CampaignState

describe('no unit is shown with a number or a letter - kingdom\'s screens', () => {
  it('the victory screen\'s civilians: two of one kind both read by their plain name; one with no roster row reads the engine\'s name less its number', () => {
    const row = RESCUABLE_CIVILIANS.find((h) => h.unitType === CHILD)!
    expect(row.name).toBe('Orphan Child')
    const two = listBattleCivilians(campaign, result([unit(CHILD, 'Orphan Child 1'), unit(CHILD, 'Orphan Child 2', { lifeState: 'dead' })]))
    expect(two.map((v) => [v.name, v.fate])).toEqual([['Orphan Child', 'unhurt'], ['Orphan Child', 'dead']])
    const stranger = listBattleCivilians(campaign, result([unit('unit.villager', 'Villager 3'), unit('unit.villager', 'Villager 4')]))
    expect(stranger.map((v) => v.name)).toEqual(['Villager', 'Villager'])
    for (const v of [...two, ...stranger]) expect(v.name).not.toMatch(/ (?:[A-Z]|\d+)$/)
  })
  it('the play layer\'s notes are worded from the name it is handed, and it is handed the plain one', () => {
    expect(shownName('Forest Elf A')).toBe('Forest Elf'); expect(shownName('Zombie 2')).toBe('Zombie')
    expect(switchLine({ kind: 'not-yours', target: shownName('Zombie 2') })).toBe('Zombie is not yours to command.')
    expect(switchLine({ kind: 'busy', actor: shownName('Forest Elf A'), did: 'moved' })).toBe('Forest Elf has already moved - End Activation first.')
  })
})
