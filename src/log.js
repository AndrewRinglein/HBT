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
      case 'activation.begin': return b(side(e), `<b>${nmAt(e)}</b> activates <span class="sq">· ${e.hp} hp, ${e.stamina} stamina${e.movePoints != null ? ', ' + e.movePoints + ' move' : ''}${e.movementMods ? ' (' + e.movementMods.map(m => m.source + ' ' + sgn(m.delta)).join(', ') + ')' : ''}</span>`)
      case 'activation.idle': return b('', `&nbsp;&nbsp;${nmAt(e)} idles <span class="sq">· ${e.reason}</span>`)
      case 'move.begin': return b('', `&nbsp;&nbsp;moves ${e.hexes} hex${e.hexes === 1 ? '' : 'es'}`)
      case 'attack.declared': return b(side(e), `&nbsp;&nbsp;attacks <b>${nmT(e)}</b> <span class="sq">· hit ${e.hitChance}%${e.of > 1 ? ' · hit ' + e.hit + ' of ' + e.of : ''}</span>`)
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
      /* ── 2026-09-03 ── */
      case 'unit.equipped': return b('', `&nbsp;&nbsp;${nmAt(e)} wears <span class="sq">${e.itemId}</span>` +
        ((e.grants || []).length ? ` · grants ${e.grants.map(g => g.replace(/^attack\./, '')).join(', ')}` : '') +
        (Object.keys(e.mods || {}).length ? ` · ${Object.entries(e.mods).map(([k, v]) => k + ' ' + sgn(v)).join(', ')}` : ''))
      case 'encounter.begin': return b('turn', `— ${e.name} —`)
      case 'encounter.objective': return b('status', `&nbsp;&nbsp;<b>${nmAt(e)}</b> is an objective <span class="sq">· ${e.kind}</span>`)
      case 'encounter.wave': return b('turn', `— a wave arrives: ${(e.units || []).join(', ')} —`)
      case 'encounter.roll': return b('', `&nbsp;&nbsp;scripted roll — ${e.unit} at hex ${e.chose} <span class="sq">· of ${(e.oneOf || []).join('/')}</span>`)
      case 'unit.shunted': return b('', `&nbsp;&nbsp;${nmAt(e)} shunted to hex ${e.hex} <span class="sq">· wanted ${e.wanted} (${e.wantedCol},${e.wantedRow})</span>`)
      case 'encounter.won': return b('turn', `— objective met: ${e.reason} —`)
      case 'encounter.lost': return b('down', `— objective failed: ${e.reason}${e.actor != null ? ' — ' + nmAt(e) : ''}${e.limit != null ? ' (limit ' + e.limit + ')' : ''} —`)
      case 'move.stopped': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;held at hex ${e.hex} by <b>${NAMES[e.by] ?? '#' + e.by}</b> <span class="sq">· ${e.reason}</span>`)
      case 'aoo.provoked': return b(side(e), `&nbsp;&nbsp;&nbsp;&nbsp;⚔ <b>${nmAt(e)}</b> takes an attack of opportunity on <b>${nmT(e)}</b> <span class="sq">· ${e.attackId}</span>`)
      case 'aoo.skipped': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;no attack of opportunity from ${nmAt(e)} <span class="sq">· ${e.reason}</span>`)
      case 'attack.cancelled': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;hit ${e.hit} of ${e.of} cancelled <span class="sq">· ${e.reason}</span>`)
      case 'corpse.created': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;a corpse lies at hex ${e.hex} <span class="sq">· ${e.typeId}</span>`)
      case 'corpse.removed': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;corpse at hex ${e.hex} ${e.how} <span class="sq">· by ${nmAt(e)}</span>`)
      case 'unit.raised': return b('enemy', `&nbsp;&nbsp;<b>${NAMES[e.raised] ?? '#' + e.raised}</b> rises at hex ${e.hex} <span class="sq">· raised by ${nmAt(e)} from ${e.from}</span>`)
      case 'corpse.eaten': return b('status', `&nbsp;&nbsp;<b>${nmAt(e)}</b> eats a corpse <span class="sq">· ${e.of}</span>`)
      case 'unit.obliterated': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> is OBLITERATED <span class="sq">· shadow ${e.shadow} ≥ max health ${e.maxHp}</span>`)
      case 'deathbed.stood': return b('status', `&nbsp;&nbsp;<b>${nmT(e)}</b> STANDS at the Deathbed <span class="sq">· rolled ${e.roll} vs ${e.chance} · wound level ${e.woundLevel} · stand ${e.ordinal}</span>`)
      case 'deathbed.fell': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> falls at the Deathbed <span class="sq">· rolled ${e.roll} vs ${e.chance}</span>`)
      case 'deathbed.exhausted': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> has no stand left <span class="sq">· ${e.stands} used</span>`)
      case 'hp.reset': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> fights on at ${e.hp} / ${e.maxHp} <span class="sq">· wound level ${e.woundLevel}</span>`)
      case 'bleedout.accelerated': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b>'s bleed-out moved to ${e.bleedOut} <span class="sq">· ${e.steps} step${e.steps === 1 ? '' : 's'}</span>`)
      case 'surge.checked': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;surge check — rolled ${e.roll} vs ${e.chance}${e.hit ? ' — <b>SURGE</b>' : ''}`)
      case 'surge.hit': return b('hero', `&nbsp;&nbsp;<b>${nmAt(e)}</b> SURGES — acts again`)
      case 'power.gained': return b('enemy', `&nbsp;&nbsp;Power ${e.before} → ${e.after} <span class="sq">· ${sgn(e.amount)}${e.kind ? ' · ' + e.kind : ''}</span>`)
      case 'heal.boosted': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;heal on <b>${nmT(e)}</b> boosted by ${e.by} <span class="sq">· ${SN[e.statusId] || e.statusId}</span>`)
      case 'status.cancelled': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${SN[e.statusId] || e.statusId} cancels ${e.amount} ${SN[e.against] || e.against} on <b>${nmT(e)}</b>`)
      case 'maxHp.gained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> gains ${e.amount} max HP <span class="sq">· now ${e.maxHp}</span>`)
      case 'stamina.drained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> loses ${e.amount} stamina`)
      case 'band.advanced': return b('turn', `— the band advances: row ${e.row} ${String(e.layer).replace(/^layer\./, '')} —`)
      case 'night.fell': return b('turn', `— night falls: ${e.hexes} hexes dark —`)
      case 'light.cast': return b('status', `&nbsp;&nbsp;the heroes light ${e.hexes} hexes`)
      case 'ai.hunts': return b(side(e), `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} hunts <b>${nmT(e)}</b>`)
      case 'ai.mode': return e.confusedFrom ? b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} is confused — ${e.mode} <span class="sq">· was ${e.confusedFrom}</span>`) : null
      default: return null
    }
  }
  return events.map((e, i) => { const s = sentence(e); return s ? { i, ...s } : null }).filter(Boolean)
}
