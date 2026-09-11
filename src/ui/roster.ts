// The roster screen — ruled 2026-09-03 (Angela): "The roster screen needs to show way
// more than that. It shows the card art. It should show all of the stats and all of the
// things that are equipped." (THIN-SLICE-IMPLEMENTATION.md ISC-049, rewritten.)
//
// One card per hero, the Equip card's shape — the battle viewer's stat block above,
// the portrait full-width with the name on it, then what is worn (hands · armor ·
// slots), then the campaign facts: level and the XP bar, the wound, what each slot is
// doing this Week, whether the Week's roll kept them home. Level up when they can;
// Fit gear opens the equip session between battles. Everything is read through the
// read-models; nothing here writes. Renders as a string; slice.ts wires the buttons.

import type { CampaignState } from '../core/campaign.js'
import { loadoutOf } from '../core/loadout.js'
import { commitmentOf } from '../core/assignments.js'
import { absenceOf } from '../core/absence.js'
import { canLevelUp } from '../core/rewards.js'
import { isEquipOpen, equipWhere } from '../core/equip-session.js'
import { xpForLevel } from '../content/levels.js'
import { woundNameOf } from '../content/wounds.js'
import { itemOf } from '../content/items.js'
import { specialtyOf } from '../content/progress.js'
import { statBlock } from './equip.js'
import { portraitOf } from './art.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Where the hero stands toward the next level, as a bar — the rewards screen's bar, at rest. */
function xpBar(c: CampaignState, heroId: string): string {
  const h = c.roster[heroId]!
  const need = xpForLevel(h.level + 1)
  const floor = xpForLevel(h.level) ?? 0
  const pct = need === null ? 100 : Math.max(0, Math.min(100, Math.round((100 * (h.xp - floor)) / Math.max(1, need - floor))))
  return `<div class="xpbar" title="${esc(need === null ? `${h.xp} XP — past the ruled curve` : `${h.xp} of ${need} XP to level ${h.level + 1}`)}"><div class="fill${canLevelUp(c, heroId) ? ' ready' : ''}" style="width:${pct}%"></div><span>${need === null ? `${h.xp} XP` : `${h.xp} / ${need} XP`}</span></div>`
}

export function heroRosterCard(c: CampaignState, heroId: string): string {
  const h = c.roster[heroId]!
  const l = loadoutOf(c, heroId)
  const art = portraitOf(heroId)
  const dead = h.lifeState === 'dead'
  const gear = (label: string, ids: readonly string[], empty: string) => `<div class="gear"><span class="k">${esc(label)}</span><span class="v">${ids.length ? ids.map((id) => esc(itemOf(id).name)).join(' · ') : `<i>${esc(empty)}</i>`}</span></div>`
  const slot = (s: 'field' | 'city') => {
    const k = commitmentOf(c, heroId, s)
    const a = c.assignments[heroId]
    return a ? `${k} — ${esc(a!.kind)} ${esc(a!.target.replace(/^[a-z]+\./, ''))}${a!.weeks > 1 ? `, ${a!.weeks} Weeks` : ''}` : (k === 'committed' ? 'fought this Week' : k)
  }
  const absence = absenceOf(c, heroId)
  const specialty = h.specialty ? specialtyOf(h.specialty) : null
  return `<div class="herocard rostercard${dead ? ' dead' : ''}" data-hero="${esc(heroId)}">
    ${statBlock(c, heroId)}
    <div class="art">${art ? `<img src="${art}" alt="">` : '<div class="noart"></div>'}<div class="plate"><b>${esc(h.name)}</b><span>${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · L${h.level}${specialty ? ' · ' + esc(specialty.name) : ''}</span></div>${dead ? '<div class="fallen">FALLEN</div>' : h.wound ? `<div class="woundtag w${h.wound}">${esc(woundNameOf(h.wound))}</div>` : ''}</div>
    <div class="gearlist">
      ${gear(l.hands.length === 1 && Math.max(1, itemOf(l.hands[0]!).hands) === 2 ? 'both hands' : 'hands', l.hands, 'empty')}
      ${gear('armor', l.armor ? [l.armor] : [], 'none')}
      ${gear(`slots ${l.itemSlots.used}/${l.itemSlots.max}`, l.items, 'empty')}
    </div>
    ${xpBar(c, heroId)}
    <div class="facts">
      <div><span class="k">field</span><span class="v">${slot('field')}</span></div>
      <div><span class="k">city</span><span class="v">${slot('city')}</span></div>
      ${absence ? `<div class="absent"><span class="k">this Week</span><span class="v">${esc(absence)}</span></div>` : ''}
    </div>
    ${!dead && c.cursor.step === 'open' && canLevelUp(c, heroId) ? `<button class="primary" data-act="level-hero" data-id="${esc(heroId)}">Level up</button>` : ''}
  </div>`
}

export function rosterScreen(c: CampaignState, equipPanel: string): string {
  const heroes = Object.values(c.roster).sort((a, b) => a.id.localeCompare(b.id))
  const alive = heroes.filter((h) => h.lifeState === 'alive').length
  const fitting = equipWhere(c) === 'roster'
  return `<div class="roster-screen">
    <div class="bar"><h2 style="margin:0;border:0;padding:0">The roster — ${alive} of ${heroes.length} standing · Week ${c.week}</h2><span class="sp"></span>
      ${fitting ? '' : c.cursor.step === 'open' && !isEquipOpen(c) ? '<button data-act="open-equip">Fit gear</button>' : ''}
      ${c.stash.length ? `<span class="tag">stash ${c.stash.length}</span>` : ''}
    </div>
    ${fitting ? `<h2>Fitting gear</h2>${equipPanel}<div class="bar"><span class="meta">Idols are fitted at prep only — they are paid for when the battle is about to happen.</span><span class="sp"></span><button class="primary" data-act="close-equip">Done — keep it</button></div>` : ''}
    <div class="equip"><div class="heroes rosterrow">${heroes.map((h) => heroRosterCard(c, h.id)).join('') || '<p class="meta">nobody yet</p>'}</div></div>
    <p class="meta">A hero may fight in successive Field battles or take one City assignment. A quest holds its party until its due Field resolution.</p>
  </div>`
}
