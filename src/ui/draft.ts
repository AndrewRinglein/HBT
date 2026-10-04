// The draft screen — the opening's draft (GAME-ARCHITECTURE.md §2.5: "a stat-less draft of one hero from three"): who
// comes to the fire, never their numbers. Moved here from slice.ts (kingdom.opening-loop-three) so SLICE.html and the
// sandbox's Retaking Abbotown sitting show the one screen. Renders from read-models; each offer carries data-act="draft"
// data-id, and data-classes for its classes; the host binds them.
import type { CampaignState } from '../core/campaign.js'
import { listDraftOffers, draftsOwedOf, draftedCountOf } from '../core/opening.js'
import { fieldedPreviewOf } from '../core/seam.js'
import { UNKITTED_HEROES, type HeroRow, type UnkittedHero } from '../content/heroes.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/**
 * kingdom.opening-draft-pool (2026-10-03): the pool is the 24 base heroes, so three do come to the fire at every draft and
 * the party does end at six. `leftOut` — a base hero whose row has no kit — is not drafted and is named here, each under
 * data-unkitted (none today; kingdom SWITCHES.md openingUnkittedNamed).
 */
export function draftScreen(c: CampaignState, leftOut: readonly UnkittedHero[] = UNKITTED_HEROES): string {
  const offers = listDraftOffers(c)
  // kingdom.reads-engine (review finding K14): what the hero carries is the fielded kit's attacks — the engine's own
  // fielded unit (fieldedPreviewOf) — not the bare row's (a Hunter who enters with a longbow showed "carries punch")
  const kit = (h: HeroRow) => fieldedPreviewOf(h).now.attacks.map((a) => a.replace(/^attack\./, '').replace(/\./g, ' ')).join(', ')
  return `<h2>The draft — ${draftedCountOf(c) === 0 ? 'your first hero' : `hero ${draftedCountOf(c) + 1} of six`}</h2>
    <p class="meta">Three come to the fire. You see who they are — never their numbers. ${draftsOwedOf(c) > 1 ? `${draftsOwedOf(c)} to draft before the next battle.` : ''}</p>
    <div class="card"><div class="pick">${offers.map((h) => `<div class="opt" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}"><b>${esc(h.name)}</b><small>${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · carries ${esc(kit(h) || 'nothing yet')}</small></div>`).join('')}</div></div>${leftOut.length ? `<p class="meta">Not at the fire — no kit in the content: ${leftOut.map((h) => `<span data-unkitted="${esc(h.id)}">${esc(h.name)}</span>`).join(', ')}.</p>` : ''}`
}
