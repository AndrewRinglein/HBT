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
import { TERRITORIES } from '../src/content/territories.js'
import { heroRowOf } from '../src/content/heroes.js'

// the rows come from the content, kits on (G3, 2026-09-02); the fixture only picks which
const hero = (id: string, _name: string, _cls: string, _unitType: string, level = 1): Hero => ({ ...heroRowOf(id), classes: [...heroRowOf(id).classes], badges: [], equipped: [...heroRowOf(id).equipped], level })

const roster: Hero[] = [
  hero('hero.base.ranger-aggressive', 'Hunter', 'class.ranger', 'hero.base.ranger-aggressive'),
  hero('hero.base.warrior-iron', 'Iron Dwarf', 'class.warrior', 'hero.base.warrior-iron'),
  hero('hero.base.priest-armored', 'Battle Chaplain', 'class.priest', 'hero.base.priest-armored'),
  hero('hero.base.priest-scantily', 'Lucius', 'class.priest', 'alpha-lucius'),
  hero('hero.base.paladin-shiney', 'Osric', 'class.paladin', 'alpha-osric'),
  hero('hero.fixed.orphans', 'Orphan Child', 'class.civilian', 'hero.fixed.orphans'),
]

// The map is content: the four rows come from the realm registry, not from here.
const territories: Territory[] = TERRITORIES.map(({ hex: _hex, ...t }) => ({ ...t }))

const campaign = makeCampaign(1, {
  realm: 'realm.ruined-kingdom',
  stage: 'stage.conquer',
  currencies: CURRENCIES.map((c) => c.id),
  cups: CUPS.map((c) => c.id),
  territories,
  roster,
  week: 3,
  // 20 Salvage banked: the prologue's two conquests (the Sanctuary square and its approach), never spent — the Forge's repair is 10
  purse: { 'currency.supplies': 12, 'currency.faith': 6, 'currency.mana': 4, 'currency.salvage': 20 },
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
