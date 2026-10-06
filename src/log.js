/* ── the log: one sentence per event — pure text ──────────────────────────
   A development affordance, not a game surface (ruled 9.6). */
import { sgn, freeAttackOf, FREE_ATTACK } from './actions.js'
import { fallWord } from './fold.js'
import { shownName } from './names.js'
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
/** basis points as a percent, by moving the decimal point in the engine's own digits — no arithmetic (Law 0) */
export const bpsPct = bps => { const s = String(bps).padStart(3, '0'), f = s.slice(-2).replace(/0+$/, ''); return s.slice(0, -2) + (f ? '.' + f : '') }

/** an id as words: 'badge.lycanthropy' -> 'Lycanthropy', 'unit.werewolf' -> 'Werewolf' */
const wordsOf = (id, prefix) => String(id).replace(prefix, '').split(/[-.]/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
/* ── WHAT DEALT THE DAMAGE (viewer.log-names-damage-cause, 2026-10-05) ───────────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-05 'playtest post: …' (Andrew: "The priest was attacking the skeleton archer, and it was taking
   damage. I don't know why that was."): a status's tick lands at the end of its bearer's own Activation, right after its own
   attack, and the line said only "takes 2 poison". Every damage line now says what dealt it, read off the engine's own line
   and worked out nowhere:
     statusId            a status's tick                    "from Poison"            (the status's name, the dump's)
     thorns              the struck unit's Thorns           "from <unit>'s Thorns"
     collision           a shove that met something         "from the collision"     (what it met follows, as before)
     hazard              the ground under it                "from <ground>"          (the ground's name, the dump's)
     aoo.provoked before it, the same attacker, target and attack — a free attack, said by its kind (`as`):
                                                            "from an attack of opportunity by <unit>" · "a counterattack" · "a fend"
     attackId/abilityId  an attack, a burst, a power        "from <unit>'s <action>" · "from its own <action>" (a cost to its caster)
     causeId trigger.*   a trigger's own damage             "from <unit>'s <what brought the trigger>" (an item's or a badge's name)
     any other causeId   (a fall from above, …)             the engine's id for it, as words
   `D` is the page's tables (V.data: ACT, ITEMS, BADGES, UD, TERRAIN_NAMES) for the names; a host that hands none still
   gets the cause, named by the engine's ids as words. */
const lastWords = id => wordsOf(String(id ?? '').split('.').pop(), '')
function triggerSource(id, D) {
  for (const table of [D.ITEMS, D.BADGES, D.UD]) for (const row of Object.values(table || {})) if ((row.triggers || []).some(t => t.id === id)) return row.name
  return null
}
export function buildLog(events, SN, turns, D = {}) {
  const NAMES = {}, SIDES = {}
  /* the free attack the engine has just said is being made (aoo.provoked): its damage line, if it lands, is that attack's */
  let free = null
  const actionName = id => (D.ACT && D.ACT[id] && D.ACT[id].name) || lastWords(id)
  const dealtBy = e => {
    const by = e.actor != null ? escape(NAMES[e.actor] ?? ('#' + e.actor)) : null
    if (e.statusId) return escape((SN && SN[e.statusId]) || lastWords(e.statusId))
    if (e.thorns) return (by ? by + '\'s ' : '') + 'Thorns'
    if (e.collision) return 'the collision'
    if (e.hazard) return escape((D.TERRAIN_NAMES && D.TERRAIN_NAMES[e.causeId]) || lastWords(e.causeId))
    const id = e.attackId || e.abilityId
    if (free && id && free.actor === e.actor && free.target === e.target && free.attackId === id) { const kind = freeAttackOf(free.as).word.toLowerCase(); return `${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind} by ${by}` }
    if (id) return e.actor === e.target ? 'its own ' + escape(actionName(id)) : (by ? by + '\'s ' : '') + escape(actionName(id))
    if (String(e.causeId).startsWith('trigger.')) return (by ? by + '\'s ' : '') + escape(triggerSource(e.causeId, D) || lastWords(e.causeId))
    return escape(e.causeId == null ? 'an unnamed cause' : lastWords(e.causeId))
  }
  /* viewer.unit-names-no-letters-or-numbers: a line names a unit as the board does - the engine's name, less its mark */
  for (const e of events) if (e.type === 'unit.enter') { NAMES[e.actor] = shownName(e.name); SIDES[e.actor] = e.side }
  const nmAt = e => NAMES[e.actor] ?? ('#' + e.actor), nmT = e => NAMES[e.target] ?? ('#' + e.target)
  const side = e => SIDES[e.actor] === 'enemy' ? 'enemy' : 'hero'
  const b = (cls, t) => ({ cls, t })
  /* R4 (2026-09-23): what a stopped push struck — the engine's collidedWith, blocker, collisionValue, remaining */
  const collided = e => e.collidedWith ? ` <span class="sq">· struck ${escape(e.collidedWith)}${e.blocker != null ? ' ' + escape(NAMES[e.blocker] ?? e.blocker) : ''} · collision ${e.collisionValue} · ${e.remaining} remaining</span>` : ''
  /* viewer.lost-counterattack-line (2026-10-05; engine rule.counterattack-replaced-and-lost — DECISIONS.md 2026-09-28: "A new
     counterattack replaces the old one. Knocked down, knocked back or moved by an enemy's power: it is lost."): a special free
     attack that is TAKEN — not run out — says so. The engine's line carries which one went (`lost`) and why (`reason`:
     replaced, knocked-down, knocked-back), and both are said in the engine's own words, worked out nowhere: the kind by the
     page's one table of free attacks, the reason with its hyphens as spaces — so a reason the engine adds later is still
     said. A loss is one line per modifier that went: the kind's own "up" stat says the loss; what went with it (its
     Accuracy, and on a replacement the older power's other modifiers) says "ends with it". A kind the table does not hold
     has no stat the page knows as its own, so every line of it says the loss and names the stat that went. */
  const taken = e => {
    const row = FREE_ATTACK[e.lost], kind = escape(row ? row.word.toLowerCase() : lastWords(e.lost).toLowerCase()), what = `${escape(e.stat)} ${sgn(e.value)}`
    const src = `<span class="sq">· ${row ? '' : what + ' · '}${escape(e.source)}</span>`, name = escape(nmAt(e))
    if (row && e.stat !== row.stat) return `&nbsp;&nbsp;&nbsp;&nbsp;${name} — ${what} ends with it <span class="sq">· ${escape(e.source)}</span>`
    return e.reason === 'replaced' ? `&nbsp;&nbsp;&nbsp;&nbsp;<b>${name}</b>'s ${kind} is replaced by a newer one ${src}`
      : `&nbsp;&nbsp;&nbsp;&nbsp;<b>${name}</b> loses its ${kind} — ${escape(String(e.reason ?? 'no reason given').replace(/-/g, ' '))} ${src}`
  }
  const sentence = e => {
    switch (e.type) {
      case 'turn.begin': return b('turn', `— Turn ${e.turn} —`)   // e.turn is already 1-based
      case 'phase.end.begin': return b('turn', `— end of ${e.side} phase —`)
      case 'activation.begin': return b(side(e), `<b>${nmAt(e)}</b> activates <span class="sq">· ${e.hp} hp, ${e.stamina} stamina${e.movePoints != null ? ', ' + e.movePoints + ' move' : ''}${e.movementMods ? ' (' + e.movementMods.map(m => m.source + ' ' + sgn(m.delta)).join(', ') + ')' : ''}</span>`)
      case 'activation.idle': return b('', `&nbsp;&nbsp;${nmAt(e)} idles <span class="sq">· ${e.reason}</span>`)
      case 'move.begin': return b('', `&nbsp;&nbsp;moves ${e.hexes} hex${e.hexes === 1 ? '' : 'es'}`)
      case 'burst.declared': return b(side(e), '&nbsp;&nbsp;' + escape(`${nmAt(e)} uses burst ${e.causeId} at hex ${e.centre} · ${e.shape.kind}${e.shape.radius != null ? ' ' + e.shape.radius : ''} · ${e.side}${e.tags?.length ? ' · tags ' + e.tags.join(', ') : ''} · ` + e.packets.map(p => `${p.id}: ${p.value} ${p.damageType}`).join(' → ') + ` · heal ${e.heal}`))
      case 'burst.shielded': return b('', '&nbsp;&nbsp;' + escape(`Terrain shielding: ${nmT(e)} at hex ${e.hex} · ${e.props.join(', ')}`))
      case 'burst.struck': return b('', '&nbsp;&nbsp;' + escape(`Burst result: ${nmT(e)} · damage ${e.damage} · applied ${e.applied} · healed ${e.heal} · terrain reduction ${e.coverDamage}`))
      // V2 R2 (2026-09-23): hitChance is conditional accuracy; Block and the overall
      // connection are the engine's own fields on this event. Older exports lack them.
      case 'attack.declared': return b(side(e), `&nbsp;&nbsp;attacks <b>${nmT(e)}</b> <span class="sq">· ${typeof e.blockChance === 'number' ? `block ${e.blockChance}% · hit ${e.hitChance}% if not blocked · connects ${bpsPct(e.connectionChanceBps)}%` : `hit ${e.hitChance}%`}${e.of > 1 ? ' · hit ' + e.hit + ' of ' + e.of : ''}</span>`)
      case 'attack.hit': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;rolled ${e.roll} vs ${e.hitChance} — HIT${e.crit ? ' <b>CRIT</b>' : ''}`)
      case 'attack.miss': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;rolled ${e.roll} vs ${e.hitChance} — miss`)
      /* viewer.log-names-damage-cause: what dealt it, then (for damage no packet itemises) its type */
      case 'damage.applied': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> takes ${e.amount}${e.packets ? ' damage' : ''} from ${dealtBy(e)}` + (e.packets || !e.damageType ? '' : ` <span class="sq">· ${escape(e.damageType)}</span>`) +
        (e.collision ? ` <span class="sq">· collision (${escape(e.collidedWith)}${e.blocker != null ? ' ' + escape(NAMES[e.blocker] ?? e.blocker) : ''} ${e.collisionValue} × ${e.remaining} remaining)${e.consumedBy ? ' · consumed by ' + escape(e.consumedBy) : ''}</span>` : '') +
        (e.resisted ? ` <span class="sq">· ${e.resisted} resisted</span>` : '') + (e.absorbed ? ` <span class="sq">· ${e.absorbed} absorbed</span>` : '') +
        (e.overkill ? ` <span class="sq">· ${e.overkill} overkill</span>` : '') +
        (e.packets ? e.packets.map(p => `<br>&nbsp;&nbsp;&nbsp;&nbsp;<span class="sq">${escape(p.source)} / ${escape(p.id)}</span>: ${escape(`${p.applied} ${p.damageType} · raw ${p.raw} · ${p.absorbed} absorbed · defense ${p.defense} · ${p.resisted} resisted · mitigation ${p.mitigationDelta} · floor ${p.floorAdjustment} · resolved ${p.resolved} · ${p.overkill} overkill`)}`).join('') : ''))
      case 'heal.applied': return b('status', `&nbsp;&nbsp;<b>${nmT(e)}</b> heals ${e.amount}` + (e.halvedBy ? ` <span class="sq">· halved by ${String(e.halvedBy).replace('status.', '')}</span>` : ''))
      case 'status.applied': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> — ${SN[e.statusId] || e.statusId} ${e.before} → ${e.after}`)
      case 'status.expired': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${SN[e.statusId] || e.statusId} fades from <b>${nmT(e)}</b>`)
      // v2.prone (2026-09-23): the going-down and the getting-up, as the engine states them
      case 'unit.proned': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> is knocked prone <span class="sq">· ${SN[e.statusId] || e.statusId}</span>`)
      case 'unit.stood': return b(side(e), `&nbsp;&nbsp;<b>${nmAt(e)}</b> stands up`)
      case 'life.downed': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> GOES DOWN`)
      case 'life.dead': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> dies <span class="sq">· ${e.reason}${e.by ? ' by ' + escape(e.by) : ''}${e.corpse === false ? ' · no corpse' : ''}</span>`)
      case 'bleedout.tick': return b('down', `&nbsp;&nbsp;bleed-out ${e.bleedOut} — <b>${nmT(e)}</b>`)
      case 'trigger.fired': return e.effect === 'status.apply'
        ? b('status', `&nbsp;&nbsp;&nbsp;&nbsp;⚡ <span class="sq">${e.causeId}</span> — ${SN[e.statusId] || e.statusId}${e.value ? ' ' + sgn(e.value) : ''} on <b>${nmT(e)}</b>`)
        : null
      case 'power.used': return b(side(e), `&nbsp;&nbsp;uses <b>${e.name}</b>`)
      case 'knocked': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> is knocked back ${e.hexes ?? 1} hex${(e.hexes ?? 1) === 1 ? '' : 'es'}` +
        (e.asked != null && e.hexes !== e.asked ? ` <span class="sq">· asked ${e.asked}, stopped by ${e.stoppedBy}</span>` : '') + collided(e))
      // R4 (2026-09-23): a blocked push names what it struck, or the badges that held it
      case 'knockback.blocked': return b(e.collidedWith ? 'dmg' : '', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> cannot be pushed${e.asked != null ? ' ' + e.asked + ' hex' + (e.asked === 1 ? '' : 'es') : ''} <span class="sq">· ${escape(e.reason)}${e.by ? ' · ' + escape(e.by.join(', ')) : ''}</span>` + collided(e))
      // R4 (2026-09-23): one KDB check — the engine's margin, chance and roll, and what it did
      case 'kdb.rolled': return b(e.fired ? 'dmg' : '', `&nbsp;&nbsp;&nbsp;&nbsp;KDB on <b>${nmT(e)}</b> <span class="sq">· margin ${e.margin} (physical ${e.physical} + impact ${e.impact} − strength ${e.strength}) · chance ${e.chance}%` +
        (e.immune ? ` · immune: ${e.immune}${e.immuneBy ? ' (' + escape(e.immuneBy.join(', ')) + ')' : ''}` : '') +
        (e.roll == null ? ' · no roll' : ` · rolled ${e.roll}`) + '</span>' +
        (e.fired ? ` — <b>${String(e.kdbType).toUpperCase()}</b> <span class="sq">· type roll ${e.typeRoll}${e.applied !== e.kdbType ? ' · applied ' + e.applied : ''}${e.suppressedBy ? ' · suppressed by ' + escape(e.suppressedBy.join(', ')) : ''}${e.gap ? ' · ' + escape(e.gap) : ''}</span>` : (e.roll == null ? '' : ' — does not fire')))
      // R5 (2026-09-24): Thorns — the spikes answer a connecting melee hit; the damage line follows
      /* R7 (2026-09-24): prop destruction, in the engine's own fields */
      case 'prop.struck': return b(side(e), '&nbsp;&nbsp;' + escape(`strikes hex ${e.hex} · ${e.attackId} · Destroy ${e.destroy} · ${(e.props || []).join(', ')}`))
      case 'prop.damaged': return b('', '&nbsp;&nbsp;&nbsp;&nbsp;' + escape(`${e.prop} (${e.height}, tier ${e.tier}) · steps ${e.stepsBefore} → ${e.stepsAfter}`))
      case 'prop.destroyed': return b('', '&nbsp;&nbsp;&nbsp;&nbsp;' + escape(`${e.prop} is destroyed · ${e.leaves === 'low' ? 'leaves low cover' : 'leaves nothing'}`))
      case 'thorns.reflected': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmAt(e)}</b>'s Thorns ${e.thorns} prick <b>${nmT(e)}</b> <span class="sq">· ${e.amount} true${e.absorbed ? ' · ' + e.absorbed + ' absorbed' : ''}</span>`)
      case 'crit.branch': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;CRIT branch — rolled ${e.roll} vs ${e.chartShare} → <b>${e.arm}</b>`)
      case 'crit.effect': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;✶ <b>${e.name}</b> on ${nmT(e)} <span class="sq">· rolled ${e.roll}</span>`)
      case 'maxHp.lost': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> loses ${e.amount} max HP <span class="sq">· now ${e.maxHp}</span>`)
      case 'staminaMax.lost': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} loses ${e.amount} max stamina`)
      case 'stamina.gained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} regains ${e.amount} stamina`)
      case 'statmod.added': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} — ${e.stat} ${sgn(e.value)} <span class="sq">· ${e.source}</span>`)
      case 'statmod.expired': return e.lost !== undefined || e.reason !== undefined ? b('status', taken(e))
        : b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} — ${e.stat} ${sgn(e.value)} ends <span class="sq">· ${e.source}</span>`)
      case 'ai.denied': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;wanted <span class="sq">${e.wanted}</span>, took <span class="sq">${e.took}</span> — ${e.reason}`)
      case 'ai.tookHighGround': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;takes the high ground`)
      case 'power.hit': return b('dmg', `&nbsp;&nbsp;&nbsp;&nbsp;strikes <b>${nmT(e)}</b>`)
      case 'battle.end': return b('turn', `— ${String(e.outcome).toUpperCase()} in ${turns} turns —`)
      /* ── 2026-09-03 ── */
      case 'unit.equipped': return b('', `&nbsp;&nbsp;${nmAt(e)} wears <span class="sq">${e.itemId}</span>` +
        ((e.grants || []).length ? ` · grants ${e.grants.map(g => g.replace(/^attack\./, '')).join(', ')}` : '') +
        (Object.keys(e.mods || {}).length ? ` · ${Object.entries(e.mods).map(([k, v]) => k + ' ' + sgn(v)).join(', ')}` : ''))
      // V2 R6 (2026-09-24): the swap — the hands before and after, as instances, and the stamina it cost
      case 'loadout.swapped': { const hands = list => (list || []).length ? list.map(i => escape(i.itemId) + ' <span class="sq">' + escape(i.instanceId) + '</span>').join(' + ') : 'empty hands'
        return b(side(e), `&nbsp;&nbsp;<b>${nmAt(e)}</b> swaps ${hands(e.handsBefore)} → ${hands(e.handsAfter)} <span class="sq">· ${e.stamina} stamina</span>`) }
      case 'map.loaded': return b('turn', `— ${e.mapId}${e.width ? ` · ${e.width}×${e.height}` : ''}${e.deploy ? ` · heroes ${e.deploy.hero}, enemies ${e.deploy.enemy}` : ''} —`)
      case 'unit.grown': return b('', `&nbsp;&nbsp;${nmAt(e)} grown — ${e.table} level ${e.level}${e.specialtyId ? ' · ' + e.specialtyId : ''} <span class="sq">· ${Object.entries(e.mods || {}).map(([k, v]) => k + ' ' + sgn(v)).join(', ')}</span>`)
      case 'encounter.begin': return b('turn', `— ${e.name} —`)
      case 'encounter.objective': return b('status', `&nbsp;&nbsp;<b>${nmAt(e)}</b> is an objective <span class="sq">· ${e.kind}</span>`)
      case 'encounter.wave': return b('turn', `— a wave arrives: ${(e.units || []).join(', ')} —`)
      case 'encounter.roll': return b('', `&nbsp;&nbsp;scripted roll — ${e.unit} at hex ${e.chose} <span class="sq">· of ${(e.oneOf || []).join('/')}</span>`)
      case 'unit.shunted': return b('', `&nbsp;&nbsp;${nmAt(e)} shunted to hex ${e.hex} <span class="sq">· wanted ${e.wanted} (${e.wantedCol},${e.wantedRow})</span>`)
      case 'encounter.won': return b('turn', `— objective met: ${e.reason} —`)
      case 'encounter.lost': return b('down', `— objective failed: ${e.reason}${e.actor != null ? ' — ' + nmAt(e) : ''}${e.limit != null ? ' (limit ' + e.limit + ')' : ''} —`)
      case 'move.stopped': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;stops at hex ${e.hex} <span class="sq">· ${e.reason === 'hit' ? 'the attack of opportunity connected' : e.reason}</span>`)
      /* viewer.free-attack-kind-words: the line's own kind (`as`) — a counterattack, a fend, else an attack of opportunity (as it read) */
      case 'aoo.provoked': return e.as === 'counterattack' ? b(side(e), `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> attacked; ⚔ <b>${nmAt(e)}</b> counterattacks <span class="sq">· ${e.attackId}</span>`)
        : e.as === 'fend' ? b(side(e), `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> comes within reach; ⚔ <b>${nmAt(e)}</b> fends it off <span class="sq">· ${e.attackId}</span>`)
        : b(side(e), `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> tries to keep moving; ⚔ <b>${nmAt(e)}</b> takes an attack of opportunity <span class="sq">· ${e.attackId}</span>`)
      case 'aoo.skipped': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;no ${freeAttackOf(e.as).word.toLowerCase()} from ${nmAt(e)} <span class="sq">· ${e.reason}</span>`)
      case 'block.rolled': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${escape(NAMES[e.defender] ?? '#' + e.defender)}</b> ${e.blocked ? 'BLOCKS' : 'does not block'} <span class="sq">· ${escape(e.chance)}%${e.roll == null ? '' : ' · rolled ' + escape(e.roll)}${e.suppressed ? ' · suppressed' : ''}</span>`)
      case 'attack.cancelled': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;hit ${e.hit} of ${e.of} cancelled <span class="sq">· ${e.reason}</span>`)
      case 'corpse.created': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;a corpse lies at hex ${e.hex} <span class="sq">· ${e.typeId}</span>`)
      case 'corpse.removed': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;corpse at hex ${e.hex} ${e.how} <span class="sq">· by ${nmAt(e)}</span>`)
      case 'unit.raised': return b('enemy', `&nbsp;&nbsp;<b>${NAMES[e.raised] ?? '#' + e.raised}</b> rises at hex ${e.hex} <span class="sq">· raised by ${nmAt(e)} from ${e.from}</span>`)
      case 'unit.summoned': return b(e.side === 'hero' ? 'hero' : 'enemy', `&nbsp;&nbsp;<b>${NAMES[e.summoned] ?? '#' + e.summoned}</b> is summoned at hex ${e.hex} <span class="sq">· by ${nmAt(e)} · it acts by its own AI</span>`)
      case 'unit.dismissed': return b('status', `&nbsp;&nbsp;<b>${nmAt(e)}</b> leaves — the battle is over <span class="sq">· summoned</span>`)
      case 'corpse.eaten': return b('status', `&nbsp;&nbsp;<b>${nmAt(e)}</b> eats a corpse <span class="sq">· ${e.of}</span>`)
      case 'unit.obliterated': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> is OBLITERATED <span class="sq">· shadow ${e.shadow} ≥ max health ${e.maxHp}</span>`)
      case 'deathbed.stood': return b('status', `&nbsp;&nbsp;<b>${nmT(e)}</b> downed — Deathbed Fighting: <b>fights on</b> <span class="sq">· rolled ${e.roll} vs ${e.chance} · roll ${e.ordinal}</span>`)
      case 'deathbed.fell': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> downed — Deathbed Fighting: falls <span class="sq">· rolled ${e.roll} vs ${e.chance}${e.bleedsOut ? ' · bleeds out' : ' · dies'}</span>`)
      case 'deathbed.none': return b('down', `&nbsp;&nbsp;<b>${nmT(e)}</b> downed — already Wounded, no roll <span class="sq">· ${e.reason}</span>`)
      case 'hp.reset': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> fights on at ${e.hp} / ${e.maxHp}`)
      case 'unit.badged': return b('', `&nbsp;&nbsp;${nmAt(e)} carries <span class="sq">${e.badgeId}</span>` + (Object.keys(e.mods || {}).length ? ` · ${Object.entries(e.mods).map(([k, v]) => k + ' ' + sgn(v)).join(', ')}` : ''))
      case 'unit.modified': return b('', `&nbsp;&nbsp;${nmAt(e)} built with <span class="sq">${e.source}</span>` + (Object.keys(e.stats || {}).length ? ` · ${Object.entries(e.stats).map(([k, v]) => k + ' ' + sgn(v)).join(', ')}` : '') + ((e.attacks || []).length ? ` · ${e.attacks.map(a => a.itemId + ' damage ' + sgn(a.damage)).join(', ')}` : ''))
      case 'badge.gained': return b('down', `&nbsp;&nbsp;<b>${nmAt(e)}</b> gains <b>${e.name || e.badgeId}</b>` + (Object.keys(e.mods || {}).length ? ` <span class="sq">· ${Object.entries(e.mods).map(([k, v]) => k + ' ' + sgn(v)).join(', ')}</span>` : ''))
      case 'badge.held': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} already had ${e.badgeId}`)
      case 'power.exhausted': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} — <span class="sq">${e.abilityId}</span> has no uses left`)
      /* v2.item-uses: the item instance that paid is named; instanceLeft 0 = that instance is spent */
      case 'charge.spent': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} — <span class="sq">${e.abilityId}</span>, ${e.left} use${e.left === 1 ? '' : 's'} left` +
        (e.instanceId != null ? ` <span class="sq">· ${escape(String(e.itemId).replace(/^item\./, ''))} ${escape(e.instanceId)} ${e.instanceLeft === 0 ? 'spent' : e.instanceLeft + ' left'}</span>` : ''))
      case 'maxstamina.gained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> gains ${e.amount} max stamina <span class="sq">· now ${e.maxStamina}</span>`)
      case 'bleedout.accelerated': return b('down', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b>'s bleed-out moved to ${e.bleedOut} <span class="sq">· ${e.steps} step${e.steps === 1 ? '' : 's'}</span>`)
      case 'surge.checked': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;surge check — rolled ${e.roll} vs ${e.chance}${e.hit ? ' — <b>SURGE</b>' : ''}`)
      case 'surge.hit': return b('hero', `&nbsp;&nbsp;<b>${nmAt(e)}</b> SURGES — acts again`)
      case 'side.stat.changed': return b(e.side === 'hero' ? 'hero' : 'enemy', `&nbsp;&nbsp;${e.stat === 'power' ? "the enemy side's Power" : (e.side === 'hero' ? "the party's " : "the enemy side's ") + (e.stat === 'magic' ? 'Magic' : 'Spirit')} ${e.before} → ${e.after} <span class="sq">· ${sgn(e.by)}${e.asked != null ? ' of ' + sgn(e.asked) : ''} · ${String(e.causeId || '').replace(/^[a-z]+\./, '')} · ${e.until === 'battle' ? 'for the rest of the Battle' : 'through Turn ' + (e.expiresAtTurn - 1)}</span>`)
      case 'side.stat.restored': return b('status', `&nbsp;&nbsp;${e.stat === 'power' ? "the enemy side's Power" : (e.side === 'hero' ? "the party's " : "the enemy side's ") + (e.stat === 'magic' ? 'Magic' : 'Spirit')} returns: ${e.before} → ${e.after} <span class="sq">· ${String(e.source || '').replace(/^[a-z]+\./, '')} has ended</span>`)
      case 'power.gained': return b('enemy', `&nbsp;&nbsp;Power ${e.before} → ${e.after} <span class="sq">· ${sgn(e.amount)}${e.kind ? ' · ' + e.kind : ''}</span>`)
      case 'heal.boosted': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;heal on <b>${nmT(e)}</b> boosted by ${e.by} <span class="sq">· ${SN[e.statusId] || e.statusId}</span>`)
      /* capability.planted-banners (engine item, 2026-10-05) */
      case 'object.planted': return b(e.side === 'hero' ? 'hero' : 'enemy', `&nbsp;&nbsp;<b>${nmAt(e)}</b> plants a banner at hex ${e.hex} <span class="sq">· ${String(e.causeId || '').replace(/^[a-z]+\./, '')} · reach ${e.radius} from that hex · for the rest of the Battle</span>`)
      case 'status.warded': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${e.amount} of ${e.of} ${SN[e.statusId] || e.statusId} does not land on <b>${nmT(e)}</b> <span class="sq">· ${String(e.causeId || '').replace(/^[a-z]+\./, '')}</span>`)
      case 'surge.gained': return b('', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> gains ${e.amount} Surge Chance <span class="sq">· ${e.before} → ${e.after} · ${String(e.causeId || '').replace(/^[a-z]+\./, '')}</span>`)
      case 'status.cancelled': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${SN[e.statusId] || e.statusId} cancels ${e.amount} ${SN[e.against] || e.against} on <b>${nmT(e)}</b>`)
      case 'maxHp.gained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> gains ${e.amount} max HP <span class="sq">· now ${e.maxHp}</span>`)
      case 'stamina.drained': return b('status', `&nbsp;&nbsp;&nbsp;&nbsp;<b>${nmT(e)}</b> loses ${e.amount} stamina`)
      case 'band.advanced': return b('turn', `— the band advances: row ${e.row} ${String(e.layer).replace(/^layer\./, '')} —`)
      /* viewer.area-fall-warning: the mark and the landing, one sentence each — the fall's own word, the engine's count of
         areas, the Turn the event says it lands after, and whom the event says it struck */
      case 'area.marked': return b('turn', `— ${escape(fallWord(e.fall))}: ${(e.areas || []).length} areas are marked · they are struck after the Hero Phase of Turn ${e.lands} —`)
      case 'area.landed': return b('turn', `— ${escape(fallWord(e.fall))} lands on ${(e.areas || []).length} areas · ${(e.hit || []).length ? 'strikes ' + e.hit.map(id => `<b>${escape(NAMES[id] ?? ('#' + id))}</b>`).join(', ') : 'strikes no one'} —`)
      /* viewer.plays-turned-units: the turn and the revert, one sentence each — the engine's own names for the affliction's badge
         (its id as words), the form's type and the side */
      case 'unit.transformed': return b('turn', `— <b>${escape(NAMES[e.actor] ?? ('#' + e.actor))}</b> is taken by ${escape(wordsOf(e.badgeId, 'badge.'))} and becomes a ${escape(wordsOf(e.into, 'unit.'))} · it fights for the ${e.side === 'hero' ? 'heroes' : 'enemy'} —`)
      case 'unit.reverted': return b('turn', `— <b>${escape(NAMES[e.actor] ?? ('#' + e.actor))}</b> is ${e.reason === 'fell' ? 'beaten as a ' + escape(wordsOf(e.from, 'unit.')) + ' and is' : ''} itself again${e.reason === 'battleEnd' ? ' as the battle ends' : ''} · ${e.hp} hp —`)
      case 'night.fell': return b('turn', `— night falls: ${e.hexes} hexes dark —`)
      case 'light.cast': return b('status', `&nbsp;&nbsp;the heroes light ${e.hexes} hexes`)
      case 'ai.override': return b('status', `&nbsp;&nbsp;${nmAt(e)} — ${e.mode} until Turn ${e.untilTurn} <span class="sq">· ${e.causeId}</span>`)
      case 'ai.hunts': return b(side(e), `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} hunts <b>${nmT(e)}</b>`)
      case 'ai.mode': return e.confusedFrom ? b('status', `&nbsp;&nbsp;&nbsp;&nbsp;${nmAt(e)} is confused — ${e.mode} <span class="sq">· was ${e.confusedFrom}</span>`) : null
      default: return null
    }
  }
  /* a turned unit's lines are its side's at that line (viewer.plays-turned-units): the side changes as the log says */
  /* the free attack in hand: named by aoo.provoked, over at the next line that is not part of it (another attack's declaration, an Activation's end or start) */
  const track = e => { if (e.type === 'aoo.provoked') free = { actor: e.actor, target: e.target, attackId: e.attackId, as: e.as }
    else if (free && ((e.type === 'attack.declared' && !(e.actor === free.actor && e.target === free.target && e.attackId === free.attackId)) || e.type === 'activation.begin' || e.type === 'activation.end' || e.type === 'aoo.skipped' || (e.type === 'damage.applied' && e.actor === free.actor && e.target === free.target && (e.attackId || e.abilityId) === free.attackId))) free = null }
  return events.map((e, i) => { const s = sentence(e); track(e); if (e.type === 'unit.transformed' || e.type === 'unit.reverted') SIDES[e.actor] = e.side; return s ? { i, ...s } : null }).filter(Boolean)
}
