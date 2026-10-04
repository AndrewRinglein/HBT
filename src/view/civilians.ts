// The civilians who fought a battle — the read-model for the victory screen's civilians' row (ui/after.ts recapScreen).
// A view: it reads the battle's result and the roster, and writes nothing. It lives here, not in src/core: the marks it
// gives ('unhurt', 'wounded', 'dead') are what a BATTLE did to a unit, said for a screen — never an answer about whether
// a hero is free to be sent, which one place in core gives (GAME-ARCHITECTURE.md §2.3; ISC-010's scan holds core to it).

import type { CampaignState, HeroId } from '../core/campaign.js'
import type { EngagementResult } from '../core/seam.js'
import { RESCUABLE_CIVILIANS } from '../content/heroes.js'

/**
 * kingdom.opening-recap-civilians — ruled 2026-10-03 (Andrew, engine/DECISIONS.md 'the civilians show on the victory screen;
 * …': "The battle should show in this victory screen too. If they were wounded, if they died, they're in there too." —
 * asked whether he meant the civilians: "2, yes."). The civilians who fought a battle, as it left them, read from the
 * battle's OWN result — every hero-side row that is not a roster hero's (a `role`: the units the encounter placed on the
 * player's side, and any that arrived there) — never from a list of names. In the result's order.
 *   fate    dead; wounded — went down in the battle (still down at its end, or stood again at the Deathbed); else unhurt
 *   heroId  the row the unit joins the roster as when it is rescued (content/heroes.ts RESCUABLE_CIVILIANS, matched by
 *           unit, as rescueSurvivors does), or null — whose portrait the screen shows
 *   name    that row's name (the name it joins under: "Orphan Child"); the battle's own name for the unit ("Orphan
 *           Child 1" — the engine numbers its units) when it has no row, or when two of one kind fought
 *   joins   the run records it joined: it lived, and its row is on the roster (rescueSurvivors wrote it — a won battle)
 * Pure. kingdom SWITCHES.md recapCivilians*.
 */
export type BattleCivilian = { readonly typeId: string; readonly name: string; readonly fate: 'unhurt' | 'wounded' | 'dead'; readonly heroId: HeroId | null; readonly joins: boolean }
export function listBattleCivilians(campaign: CampaignState, result: EngagementResult): BattleCivilian[] {
  const fought = result.units.filter((u) => u.side === 'hero' && u.role !== undefined)
  return fought.map((u) => {
    const fate = u.lifeState === 'dead' ? 'dead' : u.lifeState === 'downed' || u.downed || u.stood ? 'wounded' : 'unhurt'
    const row = RESCUABLE_CIVILIANS.find((h) => h.unitType === u.typeId) ?? null
    const alone = fought.filter((x) => x.typeId === u.typeId).length === 1
    return { typeId: u.typeId, name: row && alone ? row.name : u.name, fate, heroId: row?.id ?? null, joins: fate !== 'dead' && result.outcome === 'heroClear' && row !== null && campaign.roster[row.id] !== undefined }
  })
}
