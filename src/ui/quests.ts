// Quest screens read the same staffing and prepared outcomes as simulation.
import type { CampaignState } from '../core/campaign.js'
import { whyNotSendQuest, viewQuestReport } from '../core/quests.js'
import { questRowOf } from '../content/quests.js'
import { groupOf } from '../content/classes.js'
import { heroRowOf } from '../content/heroes.js'
const esc = (s: string) => s.replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
export function questCards(c: CampaignState, offers: readonly string[], free: readonly string[], party: readonly string[], lead: string | null): string {
  return offers.map(id => {
    const q = questRowOf(id), heroLed = q.staffing.kind === 'hero-led'
    const why = whyNotSendQuest(c, id, party, heroLed ? lead : null)
    const leadPick = heroLed ? `<p>Required hero lead: ${free.filter(h => groupOf(c.roster[h]!.classes) === 'hero').map(h => `<button class="${h === lead ? 'primary' : 'quiet'}" data-act="quest-lead" data-id="${esc(h)}">${esc(c.roster[h]!.name)}</button>`).join(' ') || 'no eligible hero'}</p><p class="meta">Select the lead, then optional escorts below. Escorts receive no fixed quest XP; battle XP is separate.</p>` : ''
    return `<div class="card" style="margin-bottom:8px"><b>${esc(q.name)}</b><p class="meta">${esc(q.does)} · ${q.weeks} Week${q.weeks === 1 ? '' : 's'}</p>${leadPick}
      <p>${free.map(h => `<button class="${party.includes(h) ? 'primary' : 'quiet'}" data-act="party" data-id="${esc(h)}">${esc(c.roster[h]!.name)}${heroLed && h === lead ? ' (lead)' : ''}</button>`).join(' ') || 'nobody is free'}</p>
      <div class="bar"><span class="meta">${why ? esc(why) : `${party.length} will go`}</span><span class="sp"></span><button class="primary" data-act="send-quest" data-id="${esc(id)}" ${why ? 'disabled' : ''}>Send</button></div></div>`
  }).join('') || '<p class="meta">Every posted quest is in flight.</p>'
}
export function questReportScreen(c: CampaignState): string {
  const q = viewQuestReport(c), row = questRowOf(q.id), out = q.outcome
  const recipients = row.xp.recipient === 'lead' ? [q.leadHeroId!] : q.heroes
  const gains = out.won ? [...Object.entries(row.reward).map(([id, n]) => `${n} ${id.replace('currency.', '')}`), ...recipients.filter(() => row.xp.amount > 0).map(id => `${c.roster[id]!.name}: +${row.xp.amount} quest XP`), ...(out.rescued ? [`${heroRowOf(out.rescued.templateId).name} joins the roster`] : [])] : []
  return `<h2>Quest report — ${esc(row.name)}</h2><div class="card"><h3>${out.won ? 'The party returns successfully' : 'The party returns without the reward'}</h3><p>${esc(q.heroes.map(id => c.roster[id]!.name).join(', '))}</p><p>${esc(gains.join(' · ') || 'No reward')}</p><p class="meta">Complete this report to receive the result and release the party. Remaining due quests follow before City.</p><button class="primary" data-act="quest-report">Complete quest</button></div>`
}
