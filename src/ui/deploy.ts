// The Deploy page — who goes into the opening battle. kingdom.opening-deploy-choice, ruled 2026-10-03 (Andrew,
// engine/DECISIONS.md 'the opening run, audited', question 3: "Should the player choose which four heroes go into each
// battle?" — "3 yes"; his post: "Hero selection.").
//
// The mechanism is Combat Prep's own Deploy step (core/prep.ts canDeploy / performDeploy / performUndeploy /
// performAdvancePrep) — the one SLICE.html's prep screen walks; nothing here is a second way to send a hero. The acts are
// the slice's too: a card carries data-act="deploy" or "undeploy" with data-id, the way on is data-act="advance"; the
// host binds them. What is the run's own is the page: the slice shows Deploy as a list of names under its four-step bar
// (Reveal · War Council · Deploy · Equip), and the run has no such bar (tactics are out) — so here Deploy is its own page
// in the Equip page's shape, each hero shown as the roster shows them (the stat block the battle would field, the card
// art, what they carry, their wound), so the choice can be made by what is seen (kingdom SWITCHES.md openingDeployScreen).
//
// Shown only when the choice is owed (core/opening.ts isDeployChoiceOwed: more heroes free to fight than the deploy
// limit); with the limit or fewer, all go and Equip opens with no question asked. Renders from read-models; writes nothing.

import type { CampaignState } from '../core/campaign.js'
import { listOpeningParty } from '../core/opening.js'
import { canDeploy, canUndeploy, canAdvancePrep, deployLimitOf } from '../core/prep.js'
import { engagementOf } from '../core/mutate.js'
import { commitmentOf } from '../core/assignments.js'
import { loadoutOf } from '../core/loadout.js'
import { itemOf } from '../content/items.js'
import { groupOf } from '../content/classes.js'
import { woundNameOf } from '../content/wounds.js'
import { specialtyOf } from '../content/progress.js'
import { statBlock } from './equip.js'
import { portraitIdOf, portraitOf } from './art.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** One hero who may go: going (a click brings them home), free to be sent (a click sends them), or — the limit reached — neither. */
function deployCard(c: CampaignState, heroId: string, going: boolean): string {
  const h = c.roster[heroId]!
  const l = loadoutOf(c, heroId)
  const art = portraitOf(portraitIdOf(h))
  const can = going ? canUndeploy(c, heroId) : canDeploy(c, heroId)
  const specialty = h.specialty ? specialtyOf(h.specialty) : null
  const gear = (label: string, ids: readonly string[], empty: string) => `<div class="gear"><span class="k">${esc(label)}</span><span class="v">${ids.length ? ids.map((id) => esc(itemOf(id).name)).join(' · ') : `<i>${esc(empty)}</i>`}</span></div>`
  return `<div class="deploycard${going ? ' on' : ''}${can ? '' : ' off'}"${can ? ` data-act="${going ? 'undeploy' : 'deploy'}" data-id="${esc(heroId)}"` : ''} data-hero="${esc(heroId)}" title="${esc(going ? `${h.name} goes — click to bring them home` : can ? `click to send ${h.name}` : `the party is full — bring someone home to send ${h.name}`)}">
    <div class="going">${going ? 'Goes' : 'Stays home'}</div>
    <div class="herocard rostercard">
      ${statBlock(c, heroId)}
      <div class="art">${art ? `<img src="${art}" alt="">` : '<div class="noart"></div>'}<div class="plate"><b>${esc(h.name)}</b><span>${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · L${h.level}${specialty ? ' · ' + esc(specialty.name) : ''}</span></div>${h.wound ? `<div class="woundtag w${h.wound}">${esc(woundNameOf(h.wound))}</div>` : ''}</div>
      <div class="gearlist">
        ${gear(l.hands.length === 1 && Math.max(1, itemOf(l.hands[0]!).hands) === 2 ? 'both hands' : 'hands', l.hands, 'empty')}
        ${gear('armor', l.armor ? [l.armor] : [], 'none')}
        ${gear(`slots ${l.itemSlots.used}/${l.itemSlots.max}`, l.items, 'empty')}
      </div>
    </div>
  </div>`
}

/** Why a hero of the party is not on the page: the one availability question's own answer (core/assignments.ts), in words. */
function whyHome(c: CampaignState, heroId: string): string {
  const k = commitmentOf(c, heroId, 'field')
  return k === 'dead' ? 'fallen' : k === 'wounded' ? `${woundNameOf(c.roster[heroId]!.wound)} wound` : k
}

/**
 * The Deploy page, whole: the count and the way on in the bar, a card per hero who may go (core/opening.ts
 * listOpeningParty, by id), and under them who cannot go and why. `engagementId` is the battle's name, as Equip shows it.
 */
export function deployPage(c: CampaignState, o: { engagementId?: string } = {}): string {
  const e = engagementOf(c), party = listOpeningParty(c), limit = deployLimitOf(c)
  const out = Object.values(c.roster).filter((h) => groupOf(h.classes) === 'hero' && !party.includes(h.id)).sort((a, b) => a.id.localeCompare(b.id))
  const sent = e.deployed.length
  return `<div class="deploy-page">
    <div class="bar"><h2 style="margin:0;border:0;padding:0">Who goes — choose up to ${limit} of your ${party.length}</h2>
      <span class="meta">${o.engagementId ? esc(o.engagementId) + ' · ' : ''}<b class="count">${sent} of ${limit} chosen</b> · click a hero to send them, click again to bring them home</span>
      <span class="sp"></span>
      <button class="primary" data-act="advance"${canAdvancePrep(c) ? '' : ' disabled'}>To Equip →</button>
    </div>
    <div class="equip roster-screen"><div class="heroes rosterrow">${party.map((h) => deployCard(c, h, e.deployed.includes(h))).join('')}</div></div>
    <p class="meta">The heroes you send are the heroes you equip and fight with. Whoever stays home is not harmed and earns nothing.${out.length ? ` Cannot go: ${out.map((h) => `${esc(h.name)} (${esc(whyHome(c, h.id))})`).join(' · ')}.` : ''}</p>
  </div>`
}
