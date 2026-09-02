// Writes fixtures/slice-prep.json — a Campaign positioned at Combat Prep, so the
// next items have a save to load (ruling 2026-09-01: "load combat state").
//
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/make-fixture.mts
//
// The AUTHORED values are here; the JSON is generated from them through
// makeCampaign and the mutators, so the fixture can never drift from the type.
// Never hand-edit the JSON — change this file and regenerate.
//
// Every id below has an owner: the six alpha heroes and their classes come from
// content/settled.json (alphaTeam, dictated 2026-08-27); the orphan is
// hero.fixed.orphans; realm and the ridge are GLOSSARY.md's own examples; the
// Sanctuary is KINGDOM-DESIGN.md §1's centre; the other two Territories take the
// engine's existing map names; the Forge is the only building id the glossary
// carries. The enemies are engine pack rows.

import { writeFileSync, mkdirSync } from 'node:fs'
import { makeCampaign, saveOf, type Hero, type Territory } from '../src/core/campaign.js'
import { makeCtx, setCursor } from '../src/core/mutate.js'
import { CURRENCIES } from '../src/content/currencies.js'
import { CUPS } from '../src/content/cups.js'

const hero = (id: string, name: string, cls: string, unitType: string, level = 1): Hero => ({
  id, name, classes: [cls], level, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType, corruption: 0,
})

const roster: Hero[] = [
  hero('hero.shadows.oathblade.v1', 'Oathblade', 'class.warrior', 'alpha-oathblade'),
  hero('hero.skyship.sky-pirate.v1', 'Sky Pirate', 'class.rogue', 'alpha-sky-pirate'),
  hero('hero.shadows.dusk-hawk.v1', 'Dusk Hawk', 'class.ranger', 'alpha-dusk-hawk'),
  hero('hero.fixed.air-mage', 'Air Mage', 'class.mage', 'alpha-air-mage'),
  hero('hero.base.priest-scantily', 'Lucius', 'class.priest', 'alpha-lucius'),
  hero('hero.base.paladin-shiney', 'Osric', 'class.paladin', 'alpha-osric'),
  hero('hero.fixed.orphans', 'Orphan Child', 'class.civilian', 'hero.fixed.orphans'),
]

const territory = (id: string, name: string, mapId: string, extra: Partial<Territory> = {}): Territory => ({
  id, name, mapId, owned: false, kingdom: false, claimedOnce: false, buildings: [], adjacent: [], enemies: [], ...extra,
})

const territories: Territory[] = [
  territory('territory.ruined-kingdom.sanctuary', 'Sanctuary', 'map.open', { owned: true, kingdom: true, claimedOnce: true, adjacent: ['territory.ruined-kingdom.ridge', 'territory.ruined-kingdom.highlands'], enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.fast-zombie'] }),
  territory('territory.ruined-kingdom.ridge', 'The Ridge', 'map.ridge', { buildings: [{ id: 'building.forge', level: 0, damaged: true }], adjacent: ['territory.ruined-kingdom.sanctuary', 'territory.ruined-kingdom.thicket'], enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie-hound', 'unit.skeletal-archer'] }),
  territory('territory.ruined-kingdom.highlands', 'The Highlands', 'map.highlands', { adjacent: ['territory.ruined-kingdom.sanctuary'], enemies: ['unit.imp', 'unit.imp', 'unit.fire-imp', 'unit.poison-imp'] }),
  territory('territory.ruined-kingdom.thicket', 'The Thicket', 'map.thicket', { adjacent: ['territory.ruined-kingdom.ridge'], enemies: ['unit.bloodhound', 'unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound'] }),
]

const campaign = makeCampaign(1, {
  realm: 'realm.ruined-kingdom',
  stage: 'stage.conquer',
  currencies: CURRENCIES.map((c) => c.id),
  cups: CUPS.map((c) => c.id),
  territories,
  roster,
  week: 3,
  purse: { 'currency.supplies': 12, 'currency.faith': 6, 'currency.mana': 4 },
  renown: 2,
})

const ctx = makeCtx(campaign)
setCursor(ctx, {
  step: 'prep',
  prepStep: 'reveal',
  engagement: {
    id: 'engagement.conquer.ridge.week-3',
    kind: 'engagement.conquer',
    territoryId: 'territory.ruined-kingdom.ridge',
    mapId: 'map.ridge',
    enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie-hound', 'unit.skeletal-archer'],
    condition: null,
    councilOffer: [],
    tactic: null,
    deployed: [],
    seed: 1,
  },
}, 'make-fixture')

mkdirSync('fixtures', { recursive: true })
const json = JSON.stringify(JSON.parse(saveOf(campaign)), null, 1) + '\n'
writeFileSync('fixtures/slice-prep.json', json)
console.log(`fixtures/slice-prep.json — ${roster.length} heroes, ${territories.length} Territories, cursor ${campaign.cursor.step}/${campaign.cursor.prepStep}, ${json.length} bytes`)
