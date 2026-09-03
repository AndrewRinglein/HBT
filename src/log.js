/* ── the log: one sentence per event — pure text ──────────────────────────
   A development affordance, not a game surface (ruled 9.6). */
import { sgn } from './actions.js'

export function buildLog(events, SN, turns) {
  const NAMES = {}, SIDES = {}
  for (const e of events) if (e.type === 'unit.enter') { NAMES[e.actor] = e.name; SIDES[e.actor] = e.side }
  const nmAt = e => NAMES[e.actor] ?? ('#' + e.actor), nmT = e => NAMES[e.target] ?? ('#' + e.target)
  const side = e => SIDES[e.actor] === 'enemy' ? 'enemy' : 'hero'
  const b = (cls, t) => ({ cls, t })
  const sentence = e => {
    switch (e.type) {
      case 'turn.begin': return b('turn', `— Turn ${e.turn} —`)   // e.turn is already 1-based
      case 'phase.end.begin': return b('turn', `— end of ${e.side} phase —`)
      case 'activation.begin': return b(side(e), `<b>${nmAt(e)}</b> activates <span class="sq">· ${e.hp} hp, ${e.stamina} stamina</span>`)
      case 'activation.idle': return b('', `&nbsp;&nbsp;${nmAt(e)} idles <span class="sq">· ${e.reason}</span>`)
      case 'move.begin': return b('', `&nbsp;&nbsp;moves ${e.hexes} hex${e.hexes === 1 ? '' : 'es'}`)
      case 'attack.declared': return b(side(e), `&nbsp;&nbsp;attacks <b>${nmT(e)}</b> <span class="sq">· hit ${e.hitChance}%</span>`)
      case 'attack.hit': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;rolled ${e.roll} vs ${e.hitChance} — HIT${e.crit ? ' <b>CRIT</b>' : ''}`)
      case 'attack.miss': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;rolled ${e.roll} vs ${e.hitChance} — miss`)
      case 'damage.applied': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> takes ${e.amount} ${e.damageType}` +
        (e.resisted ? ` <span class="sq">· ${e.resisted} resisted</span>` : '') + (e.absorbed ? ` <span class="sq">· ${e.absorbed} absorbed</span>` : '') +
        (e.overkill ? ` <span class="sq">· ${e.overkill} overkill</span>` : ''))
      case 'heal.applied': return b('status', `&nbsp;&nbsp;<b>${nmT(e)}</b> heals ${e.amount}` + (e.halvedBy ? ` <span class="sq">· halved by ${String(e.halvedBy).replace('status.', '')}</span>` : ''))
      case 'status.applied': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> — ${SN[e.statusId] || e.statusId} ${e.before} → ${e.after}`)
      case 'status.expired': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${SN[e.statusId] || e.statusId} fades from <b>${nmT(e)}</b>`)
      case 'life.downed': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> GOES DOWN`)
      case 'life.dead': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> dies <span class="sq">· ${e.reason}</span>`)
      case 'bleedout.tick': return b('down', `&nbsp;&nbsp;bleed-out ${e.bleedOut} — <b>${nmT(e)}</b>`)
      case 'trigger.fired': return e.effect === 'status.apply'
        ? b('status', `&nbsp;&nbsp;&nbsp;&nbsp;⚡ <span class="sq">${e.causeId}</span> — ${SN[e.statusId] || e.statusId}${e.value ? ' ' + sgn(e.value) : ''} on <b>${nmT(e)}</b>`)
        : null
      case 'power.used': return b(side(e), `&nbsp;&nbsp;uses <b>${e.name}</b>`)
      case 'knocked': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> is knocked back`)
      case 'knockback.blocked': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;knockback stopped <span class="sq">· ${e.reason}</span>`)
      case 'crit.branch': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;CRIT branch — rolled ${e.roll} vs ${e.chartShare} → <b>${e.arm}</b>`)
      case 'crit.effect': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;✶ <b>${e.name}</b> on ${nmT(e)} <span class="sq">· rolled ${e.roll}</span>`)
      case 'maxHp.lost': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> loses ${e.amount} max HP <span class="sq">· now ${e.maxHp}</span>`)
      case 'staminaMax.lost': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} loses ${e.amount} max stamina`)
      case 'stamina.gained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} regains ${e.amount} stamina`)
      case 'statmod.added': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} — ${e.stat} ${sgn(e.value)} <span class="sq">· ${e.source}</span>`)
      case 'ai.denied': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;wanted <span class="sq">${e.wanted}</span>, took <span class="sq">${e.took}</span> — ${e.reason}`)
      case 'ai.tookHighGround': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;takes the high ground`)
      case 'power.hit': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;strikes <b>${nmT(e)}</b>`)
      case 'battle.end': return b('turn', `— ${String(e.outcome).toUpperCase()} in ${turns} turns —`)
      default: return null
    }
  }
  return events.map((e, i) => { const s = sentence(e); return s ? { i, ...s } : null }).filter(Boolean)
}
