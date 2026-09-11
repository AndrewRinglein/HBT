import type { CampaignState } from './campaign.js'
import { CITY_ACTIVITIES, stageRowOf } from '../content/stages.js'

/** One authority for when a City activity is open; activities have no ordering. */
export function canUseActivity(c: CampaignState, activity: typeof CITY_ACTIVITIES[number]): boolean {
  return !c.ended && c.cursor.prologue === null && c.cursor.step === 'open'
    && stageRowOf(c.cursor.stage).offers === 'city' && CITY_ACTIVITIES.includes(activity)
}
