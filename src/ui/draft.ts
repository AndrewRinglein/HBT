// The draft screen — the opening's draft (GAME-ARCHITECTURE.md §2.5: "a stat-less draft of one hero from three"): who
// comes to the fire, never their numbers. Moved here from slice.ts (kingdom.opening-loop-three) so SLICE.html and the
// sandbox's Retaking Abbotown sitting show the one screen. Renders from read-models; each offer carries data-act="draft"
// data-id, and data-classes for its classes; the host binds them.
import type { CampaignState } from '../core/campaign.js'
import { listDraftOffers, draftsOwedOf, draftedCountOf } from '../core/opening.js'
import { UNITS } from '../engine.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export function draftScreen(c: CampaignState): string {
  const offers = listDraftOffers(c)
  const kit = (unitType: string) => (UNITS[unitType]?.attacks ?? []).map((a) => a.replace(/^attack\./, '').replace(/\./g, ' ')).join(', ')
  return `<h2>The draft — ${draftedCountOf(c) === 0 ? 'your first hero' : `hero ${draftedCountOf(c) + 1} of six`}</h2>
    <p class="meta">Three come to the fire. You see who they are — never their numbers. ${draftsOwedOf(c) > 1 ? `${draftsOwedOf(c)} to draft before the next battle.` : ''}</p>
    <div class="card"><div class="pick">${offers.map((h) => `<div class="opt" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}"><b>${esc(h.name)}</b><small>${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · carries ${esc(kit(h.unitType) || 'nothing yet')}</small></div>`).join('')}</div></div>`
}
