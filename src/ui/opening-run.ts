// The opening run's save — kingdom.opening-run-six (engine DECISIONS.md 2026-10-01 'one continuous run through the first
// six battles, saved, never the kingdom map': "It does have to save correctly" · "Yes, you can continue from the next
// battle."). BATTLE-SANDBOX.html?map plays one run of the opening — a Campaign — on the Retaking Abbotown map; the page
// writes it here after every step it takes (a battle written, a reward kept, a level taken, a hero drafted or equipped),
// and opening ?map again reads it back and goes on from where it stood (kingdom SWITCHES.md openingRunSave*).
//
// One browser save, one key: the run is the Campaign's own save (core/campaign.ts saveOf / campaignOf — the slice's
// format, Law 5b plain data) with the last battle's fold beside it, so the recap and the rewards page read the same
// battle after a reopen. The launcher (tools/build-launcher.mjs) reads the same key to offer "Continue the run".

import { saveOf, campaignOf, type CampaignState } from '../core/campaign.js'
import type { LastBattle } from './after.js'

export const RUN_SAVE_KEY = 'hbt-opening-run'
const FORMAT = 'hbt-opening-run'

export type RunSave = { campaign: CampaignState; lastBattle: LastBattle | null }
export type RunStore = { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** The run as the text the page keeps. */
export function runSaveOf(campaign: CampaignState, lastBattle: LastBattle | null): string {
  return JSON.stringify({ format: FORMAT, version: 1, campaign: JSON.parse(saveOf(campaign)), lastBattle })
}

/** The run back from its text — refused loudly (Law 9) when it is not one: another format, a broken Campaign, or a
    Campaign past the opening (the run never reaches the kingdom map). */
export function runOf(text: string): RunSave {
  const saved = JSON.parse(text) as { format?: unknown; version?: unknown; campaign?: unknown; lastBattle?: LastBattle | null }
  if (saved?.format !== FORMAT || saved.version !== 1) throw new Error('not an opening run save')
  const campaign = campaignOf(JSON.stringify(saved.campaign))
  if (campaign.cursor.prologue === null) throw new Error('the saved Campaign is past the opening — not an opening run')
  return { campaign, lastBattle: saved.lastBattle ?? null }
}

/** The run kept in the store, or none — and why a kept one could not be read. */
export function readRun(store: RunStore | null): { run: RunSave | null; why: string } {
  let text: string | null = null
  try { text = store?.getItem(RUN_SAVE_KEY) ?? null } catch { return { run: null, why: '' } }
  if (!text) return { run: null, why: '' }
  try { return { run: runOf(text), why: '' } } catch (e) { return { run: null, why: (e as Error).message } }
}

/** Keep the run. A store that refuses (a private window) keeps nothing; the run goes on in the page. */
export function writeRun(store: RunStore | null, campaign: CampaignState, lastBattle: LastBattle | null): void {
  try { store?.setItem(RUN_SAVE_KEY, runSaveOf(campaign, lastBattle)) } catch { /* nothing kept */ }
}
