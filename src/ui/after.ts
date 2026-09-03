// After the battle — GEAR-DESIGN.md §7, 7-KINGDOM-SETTLED.md 2026-09-02 (G12),
// shaped on Hell-TCG's three screens as far as a self-contained page can carry
// them: the RESULTS (what happened — outcome, turns, wounded, dead, MVP, kills,
// XP per hero), the REWARD (three face-down cards, reveal all, keep one, with the
// heroes' XP bars filling beside them — rewards.html), and LEVEL-UP (levelup.html:
// the hero's level modifiers listed and applied, no power choice, the specialty
// offered once at the first level-up, the level-5 pick when the row has one).
// Card art: the codex's hero portraits (tools/prep-heroes.py); items have none
// yet, so a card shows its name, class and tier. Sound is out — no audio assets.
//
// Renders from read-models; acts through slice.ts's wiring.

import type { CampaignState } from '../core/campaign.js'
import type { EngagementResult } from '../core/seam.js'
import type { Reckoning } from '../core/reckoning.js'
import type { KingdomEvent } from '../core/mutate.js'
import { listRewardOffers, listLevelUps, viewLevelUp } from '../core/rewards.js'
import { xpForLevel } from '../content/levels.js'
import { woundNameOf } from '../content/wounds.js'
import { itemOf } from '../content/items.js'
import { portraitOf } from './art.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`
const face = (heroId: string) => { const a = portraitOf(heroId); return `<div class="face">${a ? `<img src="${a}" alt="">` : ''}</div>` }

/** The XP bar: where the hero stands toward the next level, and how much of that this battle filled. */
export function xpBar(c: CampaignState, heroId: string, gained = 0): string {
  const h = c.roster[heroId]!
  const need = xpForLevel(h.level + 1)
  const floor = xpForLevel(h.level) ?? 0
  const span = need === null ? 1 : Math.max(1, need - floor)
  const now = need === null ? 100 : Math.min(100, Math.round((100 * (h.xp - floor)) / span))
  const before = need === null ? 100 : Math.max(0, Math.min(100, Math.round((100 * (h.xp - gained - floor)) / span)))
  return `<div class="xp" title="${esc(need === null ? `${h.xp} xp — past the ruled curve` : `${h.xp} / ${need} xp to level ${h.level + 1}`)}">
    <div class="fill" style="width:${now}%;--from:${before}%"></div>
    <span>${need === null ? `L${h.level} · ${h.xp} xp` : `L${h.level} · ${h.xp} / ${need}`}${gained ? ` <b class="won">+${gained}</b>` : ''}</span>
  </div>`
}

export type LastBattle = { engagementId: string; result: EngagementResult; reckoning: Reckoning }

/** The results screen — what the writer wrote, restated as Hell-TCG's post-battle sheet. */
export function resultsScreen(c: CampaignState, events: readonly KingdomEvent[], last: LastBattle | null, difficulty: number): string {
  const e = c.cursor.engagement
  const mine = last && last.engagementId === e?.id ? last : null
  const written = events.filter((ev) => ev.causeId === e?.id && ev.type !== 'cursor.moved')
  const gained = (id: string) => written.filter((ev) => ev.type === 'xp.gained' && ev['heroId'] === id).reduce((s, ev) => s + (ev['amount'] as number), 0)
  const won = mine ? mine.reckoning.won : written.some((ev) => ev.type === 'engagement.resolved' && ev['won'] === true)
  const heroes = e?.deployed ?? []
  const tally = (id: string) => mine?.result.units.find((u) => u.side === 'hero' && heroes[u.index] === id)
  const reck = (id: string) => mine?.reckoning.heroes.find((h) => h.heroId === id)
  const rows = heroes.map((id) => {
    const h = c.roster[id]!, t = tally(id), r = reck(id)
    const fate = h.lifeState === 'dead' ? '<span class="lost">fell</span>' : t?.lifeState === 'downed' ? '<span class="lost">went down</span>' : t ? 'stood' : ''
    return `<div class="hcard${h.lifeState === 'dead' ? ' dead' : ''}">${face(id)}<b>${esc(h.name)}${r?.mvp ? ' <span class="mvp" title="MVP">★</span>' : ''}</b>
      <small>${fate}${t ? ` · ${t.kills} kill${t.kills === 1 ? '' : 's'} · dealt ${t.damageDealt} · took ${t.damageTaken}` : ''}</small>
      <small>${h.wound ? `<span class="lost">${esc(woundNameOf(h.wound))}</span>` : 'whole'}</small>
      ${xpBar(c, id, gained(id))}</div>`
  }).join('')
  const lines = written.filter((ev) => !['xp.gained', 'hero.wounded', 'hero.died', 'reward.offered'].includes(ev.type)).map((ev) => {
    switch (ev.type) {
      case 'renown.gained': return `Renown +${ev['amount']} → ${ev['renown']}`
      case 'engagement.resolved': return `${ev['won'] ? 'won' : 'lost'} — losses ${ev['losses']}`
      case 'territory.claimed': return `claimed ${String(ev['territoryId']).replace('territory.', '')}${(ev['buildings'] as string[]).length ? ' with ' + (ev['buildings'] as string[]).join(', ') : ''}`
      case 'territory.lost': return `lost ${String(ev['territoryId']).replace('territory.', '')}`
      case 'resource.gained': return `+${ev['amount']} ${String(ev['currencyId']).replace('currency.', '')} → ${ev['balance']}`
      default: return ev.type
    }
  })
  return `<div class="after">
    <h2 class="${won ? 'won' : 'lost'}">${won ? 'Victory' : 'Defeat'}${mine ? ` <span class="meta">— ${esc(mine.result.outcome)} in ${mine.result.turns} turns, ${mine.result.enemyPhases} enemy phases</span>` : ''}</h2>
    <p class="meta"><code>${esc(e?.id ?? '')}</code> — written to the Campaign; the save already holds it.</p>
    <div class="hcards">${rows || '<p class="meta">nobody was deployed</p>'}</div>
    <div class="card"><table>${lines.map((l) => `<tr><td>${esc(l)}</td></tr>`).join('') || '<tr><td class="meta">nothing else was written this session (loaded after the apply)</td></tr>'}</table>
      <p class="meta">difficulty now ${difficulty} · Renown ${c.renown} · losses ${c.losses} · purse ${Object.entries(c.purse).map(([k, v]) => `${k.replace('currency.', '')} ${v}`).join(' · ')}</p></div>
    <div class="bar"><span class="sp"></span><button class="primary" data-act="exit">${c.cursor.rewardOffer ? 'On to the spoils →' : 'Back to the Week'}</button></div>
  </div>`
}

/** The reward screen — three face-down cards; Reveal turns them all; then keep one. The XP bars sit beside, filled by this battle. */
export function rewardsScreen(c: CampaignState, events: readonly KingdomEvent[], revealed: boolean): string {
  const offers = listRewardOffers(c)
  const e = c.cursor.engagement
  const gained = (id: string) => events.filter((ev) => ev.causeId === e?.id && ev.type === 'xp.gained' && ev['heroId'] === id).reduce((s, ev) => s + (ev['amount'] as number), 0)
  const card = (id: string, i: number) => {
    const r = itemOf(id)
    return revealed
      ? `<div class="rcard up" data-act="take-reward" data-id="${esc(id)}" style="--i:${i}"><div class="art"><span class="cls">${esc(r.itemClass)}</span><span class="tier">tier ${r.tier}</span></div><b>${esc(r.name)}</b><small>${esc([r.itemClass === 'weapon' ? `${Math.max(1, r.hands)}-hand` : null, r.classRestriction ? r.classRestriction.replace('class.', '') + ' only' : null, Object.entries(r.statModifiers).map(([k, n]) => `${sign(n)} ${k}`).join(' ') || null, r.grants.length ? `${r.grants.length} attack${r.grants.length === 1 ? '' : 's'}/power${r.grants.length === 1 ? '' : 's'}` : null, r.setBonus ? `${r.setBonus.tag} set` : null].filter(Boolean).join(' · '))}</small><span class="keep">Keep</span></div>`
      : `<div class="rcard down" data-act="reveal" style="--i:${i}"><div class="back"></div></div>`
  }
  return `<div class="after">
    <h2>The spoils</h2>
    <p class="meta">Three cards, face down. ${revealed ? 'Keep one — the two you leave are burned.' : 'Turn them over.'}</p>
    <div class="cols">
      <div><div class="rcards">${offers.map((o, i) => card(o.id, i)).join('')}</div>
        ${revealed ? '' : '<div class="bar"><span class="sp"></span><button class="primary" data-act="reveal">Reveal all three</button></div>'}</div>
      <div class="card"><h3>Experience</h3>${(e?.deployed ?? []).map((id) => `<div class="xprow">${face(id)}<div><b>${esc(c.roster[id]!.name)}</b>${xpBar(c, id, gained(id))}</div></div>`).join('') || '<p class="meta">nobody fought</p>'}</div>
    </div>
  </div>`
}

/** The level-up screen — the hero's row: every modifier the level grants, the specialty offered once, the level-5 pick. No power is chosen here. */
export function levelUpScreen(c: CampaignState, chosen: { specialtyId: string | null; pick: number | null }): string {
  const ready = listLevelUps(c)
  const panels = ready.map((id) => {
    const v = viewLevelUp(c, id)
    const h = c.roster[id]!
    const grants = Object.entries(v.row.grants).map(([k, n]) => `<span class="delta ${n > 0 ? 'won' : 'lost'}">${sign(n)} ${esc(k)}</span>`).join(' ')
    const canTake = !v.pickOptions || chosen.pick !== null
    return `<div class="card lvl">
      <div class="lvlhead">${face(id)}<div><b>${esc(h.name)}</b> <span class="meta">${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))}</span><div class="big">L${v.from} <span class="arrow">→</span> L${v.to}</div>${xpBar(c, id)}</div></div>
      <h3>This level grants</h3><p>${grants || '<span class="meta">nothing but the level</span>'}</p>
      ${v.specialty ? `<p class="meta">Specialty: <b>${esc(v.specialty.name)}</b> — ${esc(v.specialty.intent)}</p>` : ''}
      ${v.needsSpecialty ? `<h3>Choose a specialty — once, now</h3><div class="specs">${v.specialtyOffers.map((s) => `<div class="opt${chosen.specialtyId === s.id ? ' on' : ''}" data-act="choose-specialty" data-id="${esc(s.id)}"><b>${esc(s.name)}</b><small>${esc(s.intent)}</small><small>${esc(Object.entries(s.statModifiers).map(([k, n]) => `${sign(n)} ${k}`).join(' '))}</small></div>`).join('')}</div>
        <p class="meta">${chosen.specialtyId ? `Taking the level as a ${esc(v.specialtyOffers.find((s) => s.id === chosen.specialtyId)?.name ?? chosen.specialtyId)}.` : 'Take the level without one and the offer is gone for good.'}</p>` : ''}
      ${v.pickOptions ? `<h3>Pick one</h3><div class="specs">${v.pickOptions.map((o, i) => `<div class="opt${chosen.pick === i ? ' on' : ''}" data-act="choose-pick" data-id="${i}"><b>${esc(Object.entries(o).map(([k, n]) => `${sign(n)} ${k}`).join(', '))}</b></div>`).join('')}</div>` : ''}
      <p class="meta">No power is chosen here — powers are drafted in battle. The modifiers above are folded onto the unit when it is fielded.</p>
      <div class="bar"><span class="sp"></span><button class="primary" data-act="level-up" data-id="${esc(id)}" ${canTake ? '' : 'disabled'}>Take level ${v.to}${v.needsSpecialty && !chosen.specialtyId ? ' without a specialty' : ''}</button></div>
    </div>`
  }).join('')
  return `<div class="after">
    <h2>Level up</h2>
    ${panels || '<div class="card"><p class="meta">nobody is ready — XP is never lost; a level not taken waits</p></div>'}
    <div class="bar"><span class="sp"></span><button class="quiet" data-act="leave-level-up">${ready.length ? 'Leave the rest for later' : 'Back to the Week'}</button></div>
  </div>`
}
