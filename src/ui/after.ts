// After the battle — Hell-TCG's three screens, copied. Ruled 2026-09-03/04 (Angela):
// "After a battle, there is a battle recap screen. After the battle recap screen, you go
// to a reward screen. Lots of freaking things happen on the reward screen. We're supposed
// to be exactly … recreating this from Hell-TCG. You get experience points. There are
// sound effects. There is animation. You can level up. You can collect rewards. Level up
// is its own sheet … You can get to it from your roster. You can get to it from rewards."
// And: "the reward screen is doing our methodology, so what is rewarded and the
// probability are based on what is in HoBaT" · "the level-up is only for the non-power
// drafts" · a new, trimmed sound set · blank item frames until HoBaT item art exists.
//
//   RECAP    = the victory ceremony (tools/combat-interstitials-mockup.html; the shipped
//              one in combat-test-harness.html 10771–11122): title by outcome, party row
//              with wound states, MVP spotlight, quote, kills · turns · XP, the report,
//              the button; the [100,400,700,1000,1300,1600,1900] ms ladder; the stinger
//              pitched by outcome; first Enter skips the animation, second dismisses.
//   REWARDS  = rewards.html: hero cards with XP bars that fill to xp-tick and ding at a
//              level; floating XP; the cards land 180 ms apart; face-down with the aura
//              keyed to HoBaT's tier; flip on click (FLIP_CONFIG per tier: delay,
//              duration, particles, darken/shake), reveal all; select, confirm.
//   LEVEL-UP = levelup.html: the ascension chamber — rays, circles, the pedestal, the
//              bonuses preview, the choice overlay (the specialty at the first level-up;
//              the level-5 pick), the transformation (flash, explosion, ring, the badge
//              flipping L1 → L2), the gains floating up 450 ms apart, Continue. The
//              class-power draft is cut. Reached from rewards and from the roster.
//
// Each screen is a render (a string from the read-models) plus a MOUNT that runs the
// ceremony on the DOM once — timers, classes, sounds — and returns a cleanup. slice.ts
// calls mount after it has put the html on the page and re-renders only on a Campaign
// change (a confirm), never on a click inside the ceremony; the ceremony's own state
// (what is flipped, what is selected) lives in the DOM, as it does in Hell-TCG.

import type { CampaignState } from '../core/campaign.js'
import type { EngagementResult } from '../core/seam.js'
import type { Reckoning } from '../core/reckoning.js'
import type { KingdomEvent } from '../core/mutate.js'
import { listRewardOffers, listLevelUps, viewLevelUp, canLevelUp } from '../core/rewards.js'
import { xpForLevel } from '../content/levels.js'
import { woundNameOf } from '../content/wounds.js'
import { itemOf } from '../content/items.js'
import { VICTORY_QUOTES, DEFEAT_QUOTES, type QuoteBank } from '../content/generated/quotes.js'
import { portraitIdOf, portraitOf, cardBackOf } from './art.js'
import { playSound, playMusic, stopMusic, isMuted, setMuted } from './sound.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel)
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)]
/** A small stable hash — a quote is a view choice keyed by the battle, never a Campaign roll (Law 4 is for rules). */
const hashOf = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 } return h >>> 0 }
const muteButton = () => `<button class="mute" data-act="mute">${isMuted() ? 'sound off' : 'sound on'}</button>`

export type LastBattle = { engagementId: string; result: EngagementResult; reckoning: Reckoning }
export type Cleanup = () => void

// ─────────────────────────────────────────────────────────────────────────────
// THE RECAP — the victory ceremony
// ─────────────────────────────────────────────────────────────────────────────

/** Hell-TCG's classification (combat-test-harness.html 10784–10797, 11032–11035), on HoBaT's wound levels. */
export type Outcome = 'decisive' | 'standard' | 'costly' | 'pyrrhic' | 'devastating' | 'overwhelmed' | 'casualties' | 'total_wipe'
export function outcomeOf(won: boolean, heroes: { wound: number; dead: boolean }[], turns: number, maxTurns = 25): Outcome {
  const deaths = heroes.filter((h) => h.dead).length
  if (!won) return deaths >= heroes.length && heroes.length ? 'total_wipe' : deaths > 0 ? 'casualties' : 'overwhelmed'
  if (deaths > 0) return 'devastating'
  if (heroes.some((h) => !h.dead && h.wound >= 2)) return 'pyrrhic'
  if (heroes.some((h) => !h.dead && h.wound === 1)) return 'costly'
  return turns / maxTurns <= 0.5 ? 'decisive' : 'standard'
}
const TITLE: Record<Outcome, string> = { decisive: 'DECISIVE VICTORY', standard: 'VICTORY', costly: 'COSTLY VICTORY', pyrrhic: 'PYRRHIC VICTORY', devastating: 'VICTORY', overwhelmed: 'DEFEAT', casualties: 'DEFEAT', total_wipe: 'DEFEAT' }
const STINGER_PITCH: Record<Outcome, number> = { decisive: 1.0, standard: 0.95, costly: 0.9, pyrrhic: 0.85, devastating: 0.8, overwhelmed: 1.0, casualties: 0.9, total_wipe: 0.8 }

/** getQuote (combatQuotes.js 407–417): 70% personality with the outcome bucket, else the class pool, else the fallback. HoBaT heroes carry no personality yet, so the class pool is the path taken. */
export function quoteOf(bank: QuoteBank, hero: { classes: string[]; personality?: string }, outcome: string, key: string): string {
  const r = hashOf(key)
  const pool = hero.personality ? bank.personality[hero.personality]?.[outcome] : undefined
  if (pool?.length && (r % 100) < 70) return pool[(r >>> 8) % pool.length]!
  const cls = bank.class[hero.classes[0] ?? '']
  if (cls?.length) return cls[(r >>> 8) % cls.length]!
  return bank.fallback
}

const woundClass = (h: { wound: number; lifeState: string }) => h.lifeState === 'dead' ? 'dead' : h.wound >= 2 ? 'badly-wounded' : h.wound === 1 ? 'wounded' : 'healthy'
const woundGlyph = (c: string) => c === 'dead' ? '💀' : c === 'badly-wounded' ? '☠' : c === 'wounded' ? '⚠' : ''
const face = (heroId: string) => { const a = portraitOf(heroId); return a ? `<img src="${a}" alt="">` : '' }

export function recapScreen(c: CampaignState, events: readonly KingdomEvent[], last: LastBattle | null): string {
  const e = c.cursor.engagement
  const saved = c.cursor.battle
  const mine = last && last.engagementId === e?.id ? last : saved?.result && saved.reckoning && e ? { engagementId: e.id, result: saved.result, reckoning: saved.reckoning } : null
  const written = events.filter((ev) => ev.causeId === e?.id)
  const won = mine ? mine.reckoning.won : written.some((ev) => ev.type === 'engagement.resolved' && ev['won'] === true)
  const heroes = (e?.deployed ?? []).map((id) => c.roster[id]!)
  const fates = heroes.map((h) => ({ wound: h.wound, dead: h.lifeState === 'dead' }))
  const outcome = outcomeOf(won, fates, mine?.result.turns ?? 25)
  const mvpId = mine?.reckoning.heroes.find((h) => h.mvp)?.heroId ?? (won ? heroes[0]?.id : heroes.find((h) => h.lifeState !== 'dead')?.id ?? heroes[0]?.id)
  const spot = mvpId ? c.roster[mvpId]! : null
  const xp = mine ? mine.reckoning.heroes.reduce((sum, h) => sum + h.xp, 0) : written.filter((ev) => ev.type === 'xp.gained').reduce((s, ev) => s + (ev['amount'] as number), 0)
  const questReward = saved?.questReward
  const questGains = questReward ? [...questReward.fixedXp.map(g => `${c.roster[g.heroId]!.name}: +${g.amount} quest XP`), ...questReward.grants.map(g => `${g.amount} ${g.currency.replace('currency.', '')}`)] : []
  const kills = mine ? mine.result.units.filter((u) => u.side === 'hero').reduce((s, u) => s + u.kills, 0) : 0
  const quote = spot ? quoteOf(won ? VICTORY_QUOTES : DEFEAT_QUOTES, spot, outcome, `${e?.id}:${spot.id}`) : ''
  const report = heroes.length === 0 ? [] : won && fates.every((f) => !f.dead && f.wound === 0)
    ? [`<div class="report-line decisive"><span class="report-icon">✦</span><span>Decisive Victory — No wounds sustained</span></div>`]
    : heroes.filter((h) => h.lifeState === 'dead' || h.wound > 0).map((h) => { const k = woundClass(h); return `<div class="report-line ${k === 'dead' ? 'dead-report' : k}"><span class="report-icon">${woundGlyph(k)}</span><span>${esc(h.name)} — ${k === 'dead' ? 'fell in battle' : esc(woundNameOf(h.wound))}</span></div>` })
  if (questGains.length) report.push(`<div class="report-line">Quest reward — ${esc(questGains.join(' · '))}</div>`)
  const party = heroes.map((h) => { const k = woundClass(h); return `<div class="party-member"><div class="party-portrait ${k}">${face(portraitIdOf(h))}${woundGlyph(k) ? `<span class="wound-badge">${woundGlyph(k)}</span>` : ''}</div><div class="party-name">${esc(h.name)}</div></div>` }).join('')
  return `<div class="hx recap ${won ? '' : 'defeat'}" data-outcome="${outcome}" data-won="${won}">${muteButton()}
    <div class="interstitial-overlay ${won ? 'victory-bg' : 'defeat-bg'}"><div class="interstitial-card ${won ? '' : 'defeat'}">
      <div class="result-title ${won ? 'victory-' + outcome : 'defeat'}" id="rc-title">${TITLE[outcome]}</div>
      ${won ? `<div class="party-row" id="rc-party">${party}</div>` : ''}
      <div class="spotlight-container" id="rc-spot"><div class="spotlight-frame ${won ? 'victory' : 'defeat'}${outcome === 'decisive' ? ' decisive-glow' : ''}">${spot ? face(portraitIdOf(spot)) : ''}</div></div>
      <div class="hero-quote" id="rc-quote"><div class="quote-text">"${esc(quote)}"</div><div class="quote-attribution">— ${esc(spot?.name ?? '')}${spot ? ', ' + esc(spot.classes[0]?.replace('class.', '') ?? '') : ''}${!won && spot?.lifeState === 'dead' ? ' (last words)' : ''}</div></div>
      ${won ? `<div class="stats-block" id="rc-stats">
        <div class="stats-line"><span class="stat-label">Slain:</span> <span class="stat-value">${kills}</span></div>
        <div class="stats-line"><span class="stat-label">Turns:</span> <span class="stat-value">${mine?.result.turns ?? '—'}</span><span class="stat-sep" style="margin:0 16px">|</span><span class="stat-label">XP Earned:</span> <span class="xp-value">${xp}</span></div>
      </div>
      <div class="report-section" id="rc-report">${report.join('')}</div>` : `<div class="defeat-xp-line" id="rc-stats">XP earned: <b>${xp}</b> — the fight continues</div>`}
      <div class="action-btn-container" id="rc-btn"><button class="action-btn ${won ? 'victory-btn' : 'defeat-btn'}" data-act="exit">${won && c.cursor.rewardOffer ? 'Claim Rewards →' : 'Continue →'}</button></div>
    </div></div>
    <div class="skip-hint">Enter — skip · Enter again — continue</div>
  </div>`
}

/** The ladder (harness 10951–10963 / 11088–11092), the stinger, the two-stage skip (10965–10997). */
export function mountRecap(root: HTMLElement, onDismiss: () => void): Cleanup {
  const won = root.dataset['won'] === 'true'
  const outcome = root.dataset['outcome'] as Outcome
  const timers: number[] = []
  const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
  const show = (id: string, cls: string) => { const el = q(root, '#' + id); if (el) el.classList.add(cls) }
  if (won) {
    if (outcome !== 'devastating') playSound('victory-stinger', { playbackRate: STINGER_PITCH[outcome], pitchVariance: 0 })
    at(100, () => show('rc-title', 'anim-victory-title'))
    at(400, () => { show('rc-party', 'anim-fade-in'); qa(root, '.party-member').forEach((m, i) => at(i * 80, () => m.classList.add('anim-party'))) })
    at(700, () => show('rc-spot', 'anim-spotlight'))
    at(1000, () => show('rc-quote', 'anim-fade-in-up'))
    at(1300, () => show('rc-stats', 'anim-fade-in'))
    at(1600, () => show('rc-report', 'anim-fade-in-up'))
    at(1900, () => show('rc-btn', 'anim-fade-in'))
  } else {
    playSound('defeat-stinger', { playbackRate: STINGER_PITCH[outcome], pitchVariance: 0 })
    at(300, () => show('rc-title', 'anim-defeat-title'))
    at(700, () => show('rc-spot', 'anim-spotlight'))
    at(1100, () => show('rc-quote', 'anim-fade-in-up'))
    at(1500, () => show('rc-stats', 'anim-fade-in'))
    at(1800, () => show('rc-btn', 'anim-fade-in'))
  }
  let skipUsed = false
  const skipToEnd = () => { timers.forEach(clearTimeout); qa(root, '.result-title,.party-row,.party-member,.spotlight-container,.hero-quote,.stats-block,.report-section,.action-btn-container,.defeat-xp-line').forEach((el) => { el.style.opacity = '1' }) }
  const key = (ev: KeyboardEvent) => { if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); if (!skipUsed) { skipUsed = true; skipToEnd() } else onDismiss() }
  document.addEventListener('keydown', key)
  return () => { timers.forEach(clearTimeout); document.removeEventListener('keydown', key) }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE REWARDS — rewards.html
// ─────────────────────────────────────────────────────────────────────────────

/** rewards.html FLIP_CONFIG (3063–3071), keyed to HoBaT's tier: 0 basic · 1 common · 2 uncommon · 3 rare · 4 legendary · 5 legendary+ · 6 legendary++. */
const FLIP: Record<number, { delay: number; duration: number; particles: number; screen: 'none' | 'darken' | 'darkenShake'; pitch: number; colour: string }> = {
  0: { delay: 0, duration: 300, particles: 0, screen: 'none', pitch: 0.8, colour: '#999' },
  1: { delay: 0, duration: 350, particles: 0, screen: 'none', pitch: 0.85, colour: '#999' },
  2: { delay: 50, duration: 400, particles: 4, screen: 'none', pitch: 0.95, colour: '#3a8a3a' },
  3: { delay: 150, duration: 450, particles: 8, screen: 'none', pitch: 1.05, colour: '#0070DD' },
  4: { delay: 300, duration: 500, particles: 14, screen: 'darken', pitch: 1.15, colour: '#FF8000' },
  5: { delay: 400, duration: 550, particles: 20, screen: 'darkenShake', pitch: 1.2, colour: '#FF8000' },
  6: { delay: 500, duration: 600, particles: 28, screen: 'darkenShake', pitch: 1.3, colour: '#FF8000' },
}
const TIER_WORD = ['basic', 'common', 'uncommon', 'rare', 'legendary', 'legendary+', 'legendary++']

function xpOf(c: CampaignState, heroId: string, gained: number) {
  const h = c.roster[heroId]!
  const need = xpForLevel(h.level + 1)
  const floor = xpForLevel(h.level) ?? 0
  const span = need === null ? 1 : Math.max(1, need - floor)
  const pct = (xp: number) => need === null ? 100 : Math.max(0, Math.min(100, Math.round((100 * (xp - floor)) / span)))
  return { need, start: pct(h.xp - gained), end: pct(h.xp), text: need === null ? `${h.xp} XP` : `${h.xp} / ${need} XP` }
}

export function rewardsScreen(c: CampaignState, events: readonly KingdomEvent[], last: LastBattle | null): string {
  const e = c.cursor.engagement
  const saved = c.cursor.battle
  const mine = last && last.engagementId === e?.id ? last : saved?.result && saved.reckoning && e ? { engagementId: e.id, result: saved.result, reckoning: saved.reckoning } : null
  const written = events.filter((ev) => ev.causeId === e?.id)
  const gained = (id: string) => mine ? (mine.reckoning.heroes.find(h => h.heroId === id)?.xp ?? 0) + (saved?.questReward?.fixedXp.find(h => h.heroId === id)?.amount ?? 0) : written.filter((ev) => ev.type === 'xp.gained' && ev['heroId'] === id).reduce((s, ev) => s + (ev['amount'] as number), 0)
  const won = !e || (mine ? mine.reckoning.won : written.some((ev) => ev.type === 'engagement.resolved' && ev['won'] === true))
  const offers = listRewardOffers(c)
  const heroes = (e?.deployed ?? listLevelUps(c)).map((id) => c.roster[id]!)
  const back = cardBackOf()
  const heroCards = heroes.map((h) => {
    const k = woundClass(h)
    const g = gained(h.id)
    const t = mine?.result.units.find((u) => u.side === 'hero' && e!.deployed[u.index] === h.id)
    const r = mine?.reckoning.heroes.find((x) => x.heroId === h.id)
    const x = xpOf(c, h.id, g)
    const art = portraitOf(portraitIdOf(h))
    return `<div class="hero-card ${k === 'healthy' ? '' : k}" data-hero="${esc(h.id)}" data-gained="${g}" data-kills="${t?.kills ?? 0}" data-mvp="${r?.mvp ? 1 : 0}">
      <div class="hero-portrait" ${art ? `style="background-image:url(${art})"` : ''}></div>
      <div class="hero-name">${esc(h.name)}</div><div class="hero-class">${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))} · L${h.level}</div>
      <div class="hero-stats-row"><span class="hero-xp-earned ${r?.mvp ? 'mvp' : ''}">+${g} XP</span>${r?.mvp ? '<span class="mvp-badge">MVP</span>' : ''}<span class="hero-kills">${t?.kills ?? 0} kills</span></div>
      <div class="hero-xp-bar-container"><div class="hero-xp-bar"><div class="hero-xp-bar-fill" data-start-percent="${x.start}" data-end-percent="${x.end}" style="width:${x.start}%"></div></div><div class="hero-xp-text ${canLevelUp(c, h.id) ? 'ready' : ''}">${x.text}</div></div>
      ${k !== 'healthy' ? `<span class="hero-status-badge ${k}">${k === 'dead' ? 'FALLEN' : esc(woundNameOf(h.wound)).toUpperCase()}</span>` : ''}
      ${canLevelUp(c, h.id) ? `<button class="levelup-btn" data-act="level-hero" data-id="${esc(h.id)}">LEVEL UP</button>` : ''}
    </div>`
  }).join('')
  const cards = offers.map((o, i) => {
    const r = itemOf(o.id)
    const tier = Math.max(0, Math.min(6, r.tier))
    const facts = [r.itemClass === 'weapon' ? `${Math.max(1, r.hands)}-hand` : null, r.classRestriction ? r.classRestriction.replace('class.', '') + ' only' : null, Object.entries(r.statModifiers).map(([k, n]) => `${sign(n)} ${k}`).join(' ') || null, r.grants.length ? `${r.grants.length} attack${r.grants.length === 1 ? '' : 's'}/power${r.grants.length === 1 ? '' : 's'}` : null, r.setBonus ? `${r.setBonus.tag} set` : null].filter(Boolean).join(' · ')
    return `<div class="reward-card-wrapper" data-index="${i}">
      <div class="reward-card face-down" data-index="${i}" data-id="${esc(o.id)}" data-tier="${tier}" ${back ? `style="--card-back:url(${back})"` : ''}>
        <div class="reward-card-art">no art yet</div>
        <div class="reward-card-content"><div class="reward-type">${esc(r.itemClass)} · tier ${r.tier}</div><div class="reward-name">${esc(r.name)}</div><div class="reward-description">${esc(facts)}</div></div>
      </div>
      <div class="reward-modifier-line">${esc(TIER_WORD[tier] ?? '')}</div>
    </div>`
  }).join('')
  return `<div class="hx rewards" data-won="${won}" data-ceremony="${esc(e?.id ?? '')}">${muteButton()}
    <div class="rewards-container ${won ? '' : 'defeat'}" id="rw-container">
      <h1 class="${won ? 'victory' : 'defeat'}">${!e ? 'Experience earned' : won ? 'Victory!' : 'Defeat'}</h1>
      <div class="subtitle">${!e ? 'Choose earned levels, or continue to the remaining Field activities.' : won ? 'The spoils of battle' : 'The survivors regroup'}</div>
      <div class="heroes-section"><h3>Your Heroes</h3><div class="hero-cards-row" id="rw-heroes">${heroCards || '<div class="subtitle">nobody was deployed</div>'}</div></div>
      ${offers.length ? `<div class="rewards-section" id="rw-section"><h3>Rewards</h3><div class="reward-subtitle">Pick one of three. The two you leave are burned.</div>
        <div class="reveal-all-link" id="rw-reveal"><a data-act="reveal-all">Reveal all</a></div>
        <div class="rewards-row" id="rw-row">${cards}</div>
        <div class="actions-row"><button class="confirm-btn" id="rw-confirm" data-act="confirm-reward">Take it</button></div>
      </div>` : `<div class="actions-row"><button class="continue-btn pulsing-glow" data-act="exit">Continue →</button></div>`}
      <div class="debug-info">${esc(e?.id ?? '')} · the draw is HoBaT's (25/25/20/10/10/10 at tiers); the ceremony is Hell-TCG's</div>
    </div>
  </div>`
}

/** rewards.html's ceremony on the DOM: card landing (2523–2562), the 500 ms XP kick-off (2329–2350), animateXPBar (2116–2159), spawnFloatingXP (2042–2114), flipCard (3129–3181), select/confirm (3215–3295). */
export function mountRewards(root: HTMLElement, onConfirm: (itemId: string) => void): Cleanup {
  const timers: number[] = []
  const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
  const hasXp = qa(root, '.hero-card').some((h) => Number(h.dataset['gained']) > 0)
  const cardLandBaseDelay = hasXp ? 2700 : 0
  at(hasXp ? 3000 : 0, () => playMusic('music-new-dawn', { fadeIn: true }))
  // the XP bars, 500 ms in — every 5 points a tick, a ding at the threshold
  at(500, () => {
    qa(root, '.hero-xp-bar-fill[data-end-percent]').forEach((fill) => {
      const start = Number(fill.dataset['startPercent']), end = Number(fill.dataset['endPercent'])
      if (end <= start) return
      const t0 = performance.now(); let lastTick = start; let dinged = false
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 2000), eased = 1 - Math.pow(1 - p, 3)
        const cur = start + (end - start) * eased
        fill.style.width = cur + '%'
        if (cur - lastTick >= 5) { lastTick = cur; playSound('xp-tick') }
        if (cur >= 100 && !dinged) { dinged = true; playSound('levelup-ding'); fill.classList.add('leveling') }
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
    qa(root, '.hero-card').forEach((card) => {
      const g = Number(card.dataset['gained']), kills = Number(card.dataset['kills']), mvp = card.dataset['mvp'] === '1'
      if (!g) return
      const w = card.offsetWidth || 180
      let delay = 0
      const spawn = (text: string, cls: string, top: string, life = 1500) => at(delay, () => {
        const el = document.createElement('div'); el.className = 'floating-xp ' + cls; el.textContent = text
        el.style.left = (20 + Math.random() * Math.max(1, w - 40)) + 'px'; el.style.top = top
        card.appendChild(el); at(life, () => el.remove())
      })
      const perKill = 3
      const rounds = Math.max(0, g - kills * perKill - (mvp ? 10 : 0))
      for (let i = 0; i < Math.min(rounds, 15); i++) { spawn('+1', 'round-xp', '40%'); delay += 80 }
      for (let i = 0; i < kills; i++) { spawn('+' + perKill, 'kill-xp', '35%'); delay += 120 }
      if (mvp) { delay += 200; spawn('MVP +10', 'mvp-xp', '30%', 2000) }
    })
  })
  // the cards land, 180 ms apart, after the XP has had its moment
  qa(root, '.reward-card-wrapper').forEach((wrapper, i) => {
    wrapper.style.animationDelay = `${i * 180}ms`
    wrapper.classList.add('card-landing')
    at(cardLandBaseDelay + i * 180 + 200, () => playSound('card-land'))
  })
  // flip — the rarity ceremony, keyed to the tier
  const spawnParticles = (card: HTMLElement, count: number, colour: string) => {
    const r = card.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div'); p.className = 'flip-particle'
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5, dist = 40 + Math.random() * 60, size = 3 + Math.random() * 4
      p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${colour};position:fixed;--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist}px`
      document.body.appendChild(p); at(900, () => p.remove())
    }
  }
  const screenEffect = (kind: string) => {
    if (kind === 'none') return
    const d = document.createElement('div'); d.className = 'screen-darken'; root.appendChild(d); at(1000, () => d.remove())
    if (kind === 'darkenShake') { const cont = q(root, '#rw-container'); cont?.classList.add('screen-shaking'); at(400, () => cont?.classList.remove('screen-shaking')) }
  }
  const checkAllRevealed = () => { if (!qa(root, '.reward-card.face-down').length) q(root, '#rw-reveal')?.style.setProperty('display', 'none') }
  const flipCard = (card: HTMLElement) => {
    if (!card.classList.contains('face-down') || card.classList.contains('flipping')) return
    const cfg = FLIP[Number(card.dataset['tier'])] ?? FLIP[1]!
    at(cfg.delay, () => {
      screenEffect(cfg.screen)
      card.style.animationDuration = cfg.duration + 'ms'; card.classList.add('flipping')
      playSound('reward-reveal', { playbackRate: cfg.pitch, pitchVariance: 0.02 })
      at(cfg.duration / 2, () => card.classList.remove('face-down'))
      at(cfg.duration, () => {
        card.classList.remove('flipping'); card.classList.add('flip-bounce'); card.style.animationDuration = ''
        if (cfg.particles) spawnParticles(card, cfg.particles, cfg.colour)
        card.parentElement?.querySelector('.reward-modifier-line')?.classList.add('visible')
        at(300, () => card.classList.remove('flip-bounce'))
        checkAllRevealed()
      })
    })
  }
  let selected: string | null = null
  const row = q(root, '#rw-row')
  const onRow = (ev: Event) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>('.reward-card')
    if (!card || !row?.contains(card)) return
    if (card.classList.contains('face-down')) { flipCard(card); return }
    qa(root, '.reward-card').forEach((x) => x.classList.remove('selected')); card.classList.add('selected')
    selected = card.dataset['id'] ?? null
    playSound('reward-select')
    q(root, '#rw-confirm')?.classList.add('active')
  }
  row?.addEventListener('click', onRow)
  const onReveal = () => { qa(root, '.reward-card.face-down').forEach((card, i) => at(i * 180, () => flipCard(card))) }
  q(root, '#rw-reveal a')?.addEventListener('click', onReveal)
  const onConfirmClick = () => { if (!selected) return; playSound('reward-purchase'); const id = selected; at(150, () => onConfirm(id)) }
  q(root, '#rw-confirm')?.addEventListener('click', onConfirmClick)
  return () => { timers.forEach(clearTimeout); row?.removeEventListener('click', onRow) }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LEVEL-UP — levelup.html
// ─────────────────────────────────────────────────────────────────────────────

const STAT_LABEL: Record<string, string> = { health: 'Health', staminaMax: 'Max Stamina', staminaRegen: 'Stamina Regen', itemSlots: 'Item Slot', accuracy: 'Accuracy', crit: 'Crit', strength: 'Strength', precision: 'Precision', magic: 'Magic', spirit: 'Spirit', armor: 'Armor', resist: 'Resist', dodge: 'Dodge', reach: 'Reach', movement: 'Movement', luck: 'Luck', vision: 'Vision', toughness: 'Toughness', surge: 'Surge', thorns: 'Thorns' }
const label = (k: string) => STAT_LABEL[k] ?? k

export function levelUpScreen(c: CampaignState, heroId: string, from: 'rewards' | 'roster'): string {
  const h = c.roster[heroId]
  if (!h) return `<div class="hx levelup"><div class="ascension-chamber"><div class="title-area"><h1 class="main-title">No such hero</h1></div></div></div>`
  const v = viewLevelUp(c, heroId)
  const art = portraitOf(portraitIdOf(h))
  const grants = Object.entries(v.row.grants)
  const bonuses = [...grants.map(([k, n]) => `<div class="bonus-item ${k === 'itemSlots' ? 'slot' : ''}"><span class="bonus-text">${sign(n)} ${esc(label(k))}</span></div>`), ...(v.needsSpecialty ? ['<div class="bonus-item specialty"><span class="bonus-text">Choose a specialty</span></div>'] : []), ...(v.pickOptions ? ['<div class="bonus-item"><span class="bonus-text">Pick one of ' + v.pickOptions.length + '</span></div>'] : [])]
  const specialtyCards = v.specialtyOffers.map((s) => `<div class="choice-card" data-act="choose-specialty" data-id="${esc(s.id)}"><div class="choice-name">${esc(s.name)}</div><div class="choice-description">${esc(s.intent)}</div><div class="choice-stats">${Object.entries(s.statModifiers).map(([k, n]) => `<span class="stat-bonus ${n < 0 ? 'neg' : ''}">${sign(n)} ${esc(label(k))}</span>`).join('')}</div></div>`).join('')
  const pickCards = (v.pickOptions ?? []).map((o, i) => `<div class="choice-card" data-act="choose-pick" data-id="${i}"><div class="choice-name">${esc(Object.entries(o).map(([k, n]) => `${sign(n)} ${label(k)}`).join(', '))}</div></div>`).join('')
  return `<div class="hx levelup" data-hero="${esc(heroId)}" data-from="${from}" data-to="${v.to}" data-needs-specialty="${v.needsSpecialty ? 1 : 0}" data-needs-pick="${v.pickOptions ? 1 : 0}" data-can="${canLevelUp(c, heroId) ? 1 : 0}">${muteButton()}
    <div class="ascension-chamber">
      <canvas id="particle-canvas"></canvas>
      <div class="light-rays"><div class="ray"></div><div class="ray"></div><div class="ray"></div><div class="ray"></div><div class="ray"></div><div class="ray"></div><div class="ray"></div></div>
      <div class="power-circle"></div><div class="power-circle"></div><div class="power-circle"></div>
      <div class="title-area"><h1 class="main-title">Level Up!</h1><p class="lu-subtitle">${esc(h.name)} ascends to level ${v.to}</p></div>
      <div class="hero-pedestal"><div class="ascending-hero"><div class="lu-card" id="lu-card" data-act="lu-card">
        <div class="lu-portrait">${art ? `<img class="portrait-image before" id="lu-before" src="${art}" alt=""><img class="portrait-image after" id="lu-after" src="${art}" alt="">` : ''}</div>
        <div class="hero-info"><div class="level-badge" id="lu-badge">LEVEL ${v.from}</div><h2 class="lu-name">${esc(h.name)}</h2><p class="lu-class">${esc(h.classes.map((x) => x.replace('class.', '')).join(', '))}${v.specialty ? ' · ' + esc(v.specialty.name) : ''}</p></div>
      </div></div></div>
      <div class="light-explosion" id="lu-explosion"></div><div class="flash-overlay" id="lu-flash"></div><div class="power-ring" id="lu-ring"></div>
      <div class="stage-text" id="lu-stage">ASCENSION</div>
      <div class="stat-gains-container" id="lu-gains"></div>
      <div class="bonuses-preview" id="lu-preview"><div class="bonuses-preview-title">Level ${v.to} Bonuses</div><div class="bonuses-preview-subtitle">You will gain:</div><div class="bonuses-list">${bonuses.join('')}</div><div class="click-hint">${v.needsSpecialty || v.pickOptions ? 'Choose, then confirm' : 'Click the hero to level up'}</div></div>
      ${v.needsSpecialty ? `<div class="choices-overlay" id="lu-specialty"><div class="section-title">Choose Your Specialty</div><div class="section-description">Offered once, now — the first level-up. Take the level without one and the offer is gone for good.</div><div class="choices-grid">${specialtyCards}</div><button class="lu-confirm" id="lu-specialty-confirm" disabled>Confirm Specialty</button><button class="lu-decline" data-act="lu-decline-specialty">Level up without a specialty</button></div>` : ''}
      ${v.pickOptions ? `<div class="choices-overlay" id="lu-pick"><div class="section-title">Pick One</div><div class="section-description">Level ${v.to} offers a choice alongside its bonuses.</div><div class="choices-grid">${pickCards}</div><button class="lu-confirm" id="lu-pick-confirm" disabled>Confirm</button></div>` : ''}
      <button class="lu-continue" id="lu-continue" data-act="lu-continue">${from === 'rewards' ? 'Back to the Rewards' : 'Continue the Journey'}</button>
      <div class="hint">No power is chosen here — powers are drafted in battle</div>
    </div>
  </div>`
}

/** levelup.html on the DOM: the 1500 ms overlay, the choice cards, the transformation (2421–2477), the gains 450 ms apart (1745–1890), the embers (2748–2834). `onLevel` performs the level with the choice; `onContinue` leaves. */
export function mountLevelUp(root: HTMLElement, onLevel: (choice: { specialtyId?: string; pick?: number }) => void, onContinue: () => void): Cleanup {
  const timers: number[] = []
  const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
  playMusic('music-new-dawn', { fadeIn: true })
  const needsSpecialty = root.dataset['needsSpecialty'] === '1', needsPick = root.dataset['needsPick'] === '1'
  const to = Number(root.dataset['to'])
  const choice: { specialtyId?: string; pick?: number } = {}
  let leveled = false
  const preview = q(root, '#lu-preview')
  if (qa(root, '.bonus-item').length) at(50, () => preview?.classList.add('visible'))
  const showOverlay = (id: string) => q(root, '#' + id)?.classList.add('visible')
  const hideOverlay = (id: string) => q(root, '#' + id)?.classList.remove('visible')
  const wireChoice = (overlayId: string, confirmId: string, act: string, pick: (id: string) => void, then: () => void) => {
    const overlay = q(root, '#' + overlayId); const confirm = q(root, '#' + confirmId) as HTMLButtonElement | null
    if (!overlay || !confirm) return
    overlay.addEventListener('click', (ev) => {
      const card = (ev.target as HTMLElement).closest<HTMLElement>(`[data-act="${act}"]`)
      if (!card) return
      qa(overlay, '.choice-card').forEach((x) => x.classList.remove('selected')); card.classList.add('selected')
      pick(card.dataset['id']!); playSound('click-secondary'); confirm.disabled = false
    })
    confirm.addEventListener('click', () => { playSound('confirm'); hideOverlay(overlayId); at(400, then) })
  }
  const transform = () => {
    if (leveled) return
    leveled = true
    preview?.classList.remove('visible')
    const stage = q(root, '#lu-stage'); stage?.classList.add('show')
    playSound('levelup-confirm')
    at(1000, () => { q(root, '#lu-flash')?.classList.add('flash'); q(root, '#lu-explosion')?.classList.add('explode'); q(root, '#lu-ring')?.classList.add('surge') })
    at(1250, () => { q(root, '#lu-before')?.classList.add('hidden'); q(root, '#lu-after')?.classList.add('revealed'); const b = q(root, '#lu-badge'); if (b) b.textContent = 'LEVEL ' + to })
    at(2050, () => {
      qa(root, '.flash,.explode,.surge').forEach((el) => el.classList.remove('flash', 'explode', 'surge'))
      stage?.classList.remove('show')
      const gains = onLevelGains()
      gains.forEach((g, i) => at(i * 450, () => { const el = document.createElement('div'); el.className = 'stat-gain ' + g.type; el.textContent = g.text; q(root, '#lu-gains')?.appendChild(el); void el.offsetHeight; el.classList.add('show') }))
      at(Math.max(1500, gains.length * 450 + 1000), () => q(root, '#lu-continue')?.classList.add('show'))
    })
  }
  /** The gains float after the level is written — read back off the preview list so the words match. */
  const onLevelGains = (): { text: string; type: string }[] => {
    onLevel(choice)
    const out = qa(root, '.bonus-item').filter((b) => !b.classList.contains('specialty') && !/Pick one/.test(b.textContent ?? '')).map((b) => ({ text: b.textContent ?? '', type: b.classList.contains('slot') ? 'slot' : 'stat' }))
    if (choice.specialtyId) out.push({ text: (q(root, `.choice-card[data-id="${choice.specialtyId}"] .choice-name`)?.textContent ?? choice.specialtyId), type: 'specialty-name' })
    if (choice.pick !== undefined) out.push({ text: q(root, `.choice-card[data-act="choose-pick"][data-id="${choice.pick}"] .choice-name`)?.textContent ?? 'pick', type: 'specialty' })
    return out
  }
  const afterSpecialty = () => { if (needsPick) showOverlay('lu-pick'); else transform() }
  if (needsSpecialty) {
    at(1500, () => showOverlay('lu-specialty'))
    wireChoice('lu-specialty', 'lu-specialty-confirm', 'choose-specialty', (id) => { choice.specialtyId = id }, afterSpecialty)
    q(root, '[data-act="lu-decline-specialty"]')?.addEventListener('click', () => { playSound('click-secondary'); delete choice.specialtyId; hideOverlay('lu-specialty'); at(400, afterSpecialty) })
  } else if (needsPick) {
    at(1500, () => showOverlay('lu-pick'))
  } else {
    q(root, '#lu-card')?.addEventListener('click', transform)
  }
  if (needsPick) wireChoice('lu-pick', 'lu-pick-confirm', 'choose-pick', (id) => { choice.pick = Number(id) }, transform)
  q(root, '#lu-continue')?.addEventListener('click', () => { playSound('page-transition'); at(150, onContinue) })
  // the embers (levelup.html 2748–2834)
  const canvas = q(root, '#particle-canvas') as HTMLCanvasElement | null
  let raf = 0
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d')!
    const fit = () => { canvas.width = root.clientWidth; canvas.height = root.clientHeight }
    fit()
    type P = { x: number; y: number; size: number; vy: number; life: number; maxLife: number; hue: number; op: number }
    const mk = (): P => ({ x: Math.random() * canvas.width, y: canvas.height + 10, size: 1 + Math.random() * 2.5, vy: 0.25 + Math.random() * 0.6, life: 0, maxLife: 200 + Math.random() * 350, hue: 40 + Math.random() * 15, op: 0.3 + Math.random() * 0.5 })
    const ps: P[] = Array.from({ length: 50 }, () => ({ ...mk(), y: Math.random() * canvas.height }))
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]!
        p.life++; p.y -= p.vy; p.x += Math.sin(p.life * 0.02) * 0.15
        if (p.life > p.maxLife || p.y < -10) { ps[i] = mk(); continue }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        g.addColorStop(0, `hsla(${p.hue},70%,60%,${p.op})`); g.addColorStop(1, `rgba(212,175,55,0)`)
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  return () => { timers.forEach(clearTimeout); if (raf) cancelAnimationFrame(raf) }
}

/** Sound on/off, one button on every copied screen. */
export function toggleMute(): void { setMuted(!isMuted()); if (isMuted()) stopMusic() }
export { stopMusic }
export { listLevelUps }
