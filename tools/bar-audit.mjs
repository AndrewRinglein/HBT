// viewer.bar-shows-every-effect (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once
// the move is done, nothing else greys; every action shows all it does; the Soldier holds no sword'). Andrew: "some of the
// information and some of the actions are missing. For example, a dagger giving you one protection is not shown in the dagger
// attack." THE AUDIT — the gaps as a list, not a hunt. For every unit of a roster the ENGINE fielded
// (tools/fixtures/bar-audit-roster.json: the 24 base heroes with their kits, the Flaming Longsword on its takers, and the six
// opening battles as they are set up — their drafted party, placed civilians and enemies; each unit with the engine's own list
// of its actions and its triggers) it mounts the battle on the page, looks at the unit, and reads the action bar as drawn:
//
//   1 · sheet actions vs bar buttons — every action id the engine's unit holds is a button (#actionbar .acRow[data-act]);
//   2 · sheet effects vs shown text  — everything the action's row carries (static.json actions: its limits, its attack, move
//       and burst profiles, its target, its effects) and every trigger of the unit that rides it is said on the button or in
//       its tooltip. What must be said is read off the engine's rows field by field, in this file's own words for a field
//       (a status by its name, a number by its digits) — never through the viewer's namer, which is the thing audited.
//
//   node tools/bar-audit.mjs [page.html] [roster.json]     prints, per unit, what is missing; exit 1 when anything is
//
// The page test (tools/bar-shows-every-effect.test.mjs) runs `auditPage` and wants an empty list.
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'

const text = x => String(x ?? '').replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&times;/g, '×').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
/** the engine's attacker hooks (core/trigger.ts ATTACKER_HOOKS): a trigger on one of these rides the unit's attacks */
export const ATTACKER_HOOKS = ['onAttack', 'onBlock', 'onMiss', 'onHit', 'onCrit', 'onDamage', 'onKill']
const HOOK_WORDS = { onAttack: 'on attack', onBlock: 'on block', onMiss: 'on miss', onHit: 'on hit', onCrit: 'on crit', onDamage: 'on damage', onKill: 'on kill' }
const UNTIL_WORDS = { endOfTurn: 'this turn', endOfNextTurn: 'end of the next turn', endOfActivation: 'end of the activation', endOfNextActivation: 'end of the next activation', battle: 'rest of the battle' }
const SIDE_WORDS = { ally: 'ally', enemy: 'enemy', any: 'unit' }
const SCALE_WORDS = { partyMagic: 'party magic', partySpirit: 'party spirit', power: 'power' }
const STAT_WORDS = { strength: 'str', precision: 'pre', magic: 'mag', spirit: 'spi', accuracy: 'acc', dodge: 'dodge', armor: 'armor', resist: 'magic resist', movement: 'move', reach: 'reach',
  maxHp: 'max health', maxStamina: 'max stamina', staminaRegen: 'stamina regen', rangedBlock: 'ranged block', fireResist: 'fire resist', poisonResist: 'poison resist', shadowResist: 'shadow resist', coldResist: 'cold resist' }
const statWord = k => STAT_WORDS[k] || String(k).replace(/([A-Z])/g, ' $1').toLowerCase()
const num = n => ({ num: String(Math.abs(n)) })
const word = w => ({ word: String(w).toLowerCase() })

/** how much: a number, or the engine's scaling rule (core/trigger.ts ValueSpec) — its figures and what it scales off */
function amountNeeds(v) {
  if (v == null) return []
  if (typeof v === 'number') return v === 0 ? [] : [num(v)]
  const out = [word(v.scale === 'stat' ? statWord(v.stat) : SCALE_WORDS[v.scale] ?? v.scale)]
  if (v.base) out.push(num(v.base)); if (v.mult != null && v.mult !== 1) out.push(num(v.mult)); if (v.div != null && v.div !== 1) out.push(num(v.div))
  if (v.round) out.push(word('rounded ' + v.round))
  return out
}
/** who: a Targeting row (core/target.ts) — its side, its radius, its tags, whether the owner is left out */
const SELF = { anyOf: ['self', 'gain', 'regain', 'lose', 'stand'] }      // on its owner: 'self', or a verb whose subject is the owner
function targetNeeds(t) {
  if (!t || typeof t !== 'object') return t === 'self' ? [SELF] : []
  if (t.select === 'self') return [SELF]
  /* capability.summons (engine item, 2026-10-05): a power aimed at an empty hex - no unit and no side to say, the hex and that it is empty */
  if (t.select === 'hex') return [word('empty'), word('hex')]
  const out = [word(SIDE_WORDS[t.side] ?? t.side)]
  for (const tag of t.requireTags ?? []) out.push(word(tag))
  if (t.select === 'area') { out.push(word('every')); if (t.radius != null) out.push(num(t.radius)); if (t.excludeSelf) out.push(word('other')); if (t.origin === 'target') out.push(word('of the target')) }
  return out
}
/** capability.raise-lower-magic (engine item): a change to a side's party stat, field by field */
const sideStatNeeds = c => [word(c.value < 0 ? 'lowers' : 'raises'), word(c.stat === 'power' ? 'Power' : c.stat === 'magic' ? 'Magic' : 'Spirit'), num(Math.abs(c.value)), word(c.until === 'battle' ? 'rest of the Battle' : 'Turn')]
/** one effect (core/types.ts Effect), field by field */
function effectNeeds(e, S) {
  const out = []
  if (e.statusId) out.push(word(S.statuses[e.statusId] ?? e.statusId))
  if (e.badgeId) out.push(word(S.badges[e.badgeId]?.name ?? e.badgeId))
  for (const b of e.withBadgeIds ?? []) out.push(word(S.badges[b]?.name ?? b))
  for (const k of ['value', 'amount']) if (e[k] !== undefined) out.push(...amountNeeds(e[k]))
  for (const k of ['bonus', 'radius', 'percent', 'count', 'healPer', 'heal', 'maxHp', 'floor']) if (typeof e[k] === 'number' && e[k] !== 0) out.push(num(e[k]))
  if (e.stat) out.push(word(statWord(e.stat)))
  if (e.damageType) out.push(word(e.damageType))
  if (e.until) out.push(word(UNTIL_WORDS[e.until] ?? e.until))
  if (e.layer) out.push(word(String(S.layers[e.layer] ?? e.layer).replace(/^layer\./, '')))
  if (e.unit) out.push(word(S.units[e.unit]?.name ?? e.unit))
  for (const [k, v] of Object.entries(e.mods ?? {})) out.push(word(statWord(k)), num(v))
  if (e.kind === 'stand') out.push(word('stand'))
  if (e.kind === 'reveal') out.push(word('reveal'))
  if (e.kind === 'knockback') out.push(word('push'))
  if (e.kind === 'heal') out.push(word('heal'))
  if (e.kind === 'stamina.gain' || e.kind === 'stamina.drain') out.push(word('stamina'))
  if (e.kind === 'power.gain') out.push(word('power'))
  /* capability.summons (engine item, 2026-10-05): what is summoned, by the engine row's own name */
  if (e.kind === 'side.stat') out.push(...sideStatNeeds(e))
  /* capability.his-weapons-small-clauses (engine item, 2026-10-05): an on-kill that leaves no body */
  if (e.kind === 'corpse.destroy') out.push(word('corpse'), word('destroyed'))
  if (e.kind === 'summon') out.push(word('summon'), word(((S && S.units && S.units[e.unit]) || {}).name ?? e.unit))
  if (e.who === 'self') out.push(SELF)
  return out
}
/** everything one action's row carries, plus the unit's triggers that ride it: [{what, needs: [{word}|{num}]}] */
export function actionNeeds(a, triggers, S) {
  const out = [], need = (what, needs) => { if (needs.length) out.push({ what, needs }) }
  need('its name', [word(a.name)])
  need('stamina cost ' + a.staminaCost, [num(a.staminaCost)])
  if (a.cooldown) need('cooldown ' + a.cooldown, [word('cooldown'), num(a.cooldown)])
  if (a.warmup) need('warm-up ' + a.warmup, [word('warm-up'), num(a.warmup)])
  if (a.uses != null) need(a.uses + ' uses per battle', [num(a.uses), word('use')])
  if (a.free) need('free', [word('free')])
  if (a.slot) need('slot ' + a.slot, [word(a.slot === 'either' ? 'move or the primary' : a.slot === 'movement' ? 'move' : 'primary')])
  if (a.target) need('target ' + JSON.stringify(a.target), targetNeeds(a.target))
  const p = a.attack
  if (p) {
    need('attack kind ' + p.kind, [word(p.kind)]); need('damage type ' + p.damageType, [word(p.damageType)])
    need('damage ' + p.stat + ' ' + p.bonus, [word(statWord(p.stat)), ...(p.bonus ? [num(p.bonus)] : [])])
    need('range ' + a.range, [num(a.range)])
    if (p.applies) need('applies ' + p.applies.statusId + ' ' + p.applies.value, [word(S.statuses[p.applies.statusId] ?? p.applies.statusId), num(p.applies.value)])
    if (p.crit) need('crit ' + p.crit, [word('crit'), num(p.crit)])
    if (p.hits > 1) need(p.hits + ' hits', [num(p.hits), word('hits')])
    if (p.critCount > 1) need(p.critCount + ' criticals', [num(p.critCount), word('criticals')])
    if (p.powerScale != null) need('power scale ' + p.powerScale, [word('power'), num(p.powerScale)])
    if (p.accuracy) need('accuracy modifier ' + p.accuracy, [word('acc'), num(p.accuracy)])
    if (p.impact) need('impact ' + p.impact, [word('impact'), num(p.impact)])
    if (p.destroy) need('destroy ' + p.destroy, [word('destroy'), num(p.destroy)])
    if (p.armorPenetration != null) need('armor penetration ' + p.armorPenetration, [word('armor penetration'), num(p.armorPenetration)])
    for (const s of p.secondaryDamage ?? []) need('secondary damage ' + s.id, [word('on ' + s.when), num(s.amount), word(s.damageType)])
  } else if (!a.move && !a.burst && a.range) need('range ' + a.range, [num(a.range)])
  const m = a.move
  if (m) {
    if (!(m.shape === 'sidestep' && m.stepRange === 0)) need('move shape ' + m.shape, [word({ path: 'walk', sidestep: 'step', flight: 'no steps' }[m.shape] ?? m.shape)])
    if (m.budgetMod) need('move budget ' + m.budgetMod, [num(m.budgetMod), word('move')])
    if (m.hexes != null) need('at most ' + m.hexes + ' hexes', [num(m.hexes), word('hex')])
    if (m.stepRange != null) need('step range ' + m.stepRange, m.stepRange === 0 ? [word('stands still')] : [num(m.stepRange), word('hex')])
    if (m.ignoresZoc) need('ignores Zones of Control', [word('zoc')])
  }
  const b = a.burst
  if (b) {
    need('burst shape', b.shape.kind === 'radius' ? [word('radius'), num(b.shape.radius)] : [word(b.shape.kind)])
    need('burst side ' + b.side, [word(b.side)])
    for (const t of b.requireTags ?? []) need('burst tag ' + t, [word(t)])
    for (const k of b.packets) need('burst packet ' + k.id, [num(k.amount), word(k.damageType), ...(k.stat ? [word(statWord(k.stat))] : []), ...(k.statMult != null ? [num(k.statMult)] : []), ...(k.powerScale != null ? [word('power'), num(k.powerScale)] : [])])
    /* capability.raise-lower-magic (engine item, 2026-10-05): what using the burst does to a side's party stats — which way, which stat, by how much, how long */
    for (const c of b.sideStats ?? []) need('burst side stat ' + c.stat, sideStatNeeds(c))
    if (b.heal != null) need('burst heal ' + b.heal, [word('heal'), num(b.heal)])
    if (b.impact) need('burst impact ' + b.impact, [word('impact'), num(b.impact)])
    if (b.destroy) need('burst destroy ' + b.destroy, [word('destroy'), num(b.destroy)])
  }
  for (const [i, e] of (a.effects ?? []).entries()) need(`effect ${i + 1} ${e.kind}`, effectNeeds(e, S))
  /* the unit's triggers that ride this action: an attacker hook, on an attack (or a charge), unscoped or scoped to this one,
     and with a tag requirement only when the attack carries the tag */
  if (p) for (const t of triggers ?? []) {
    if (!ATTACKER_HOOKS.includes(t.hook) || (t.onlyWithAttack && t.onlyWithAttack !== a.id) || t.role === 'defender') continue
    /* viewer.bar-shows-tag-requirement: a trigger with a tag requirement rides only an attack that carries the tag — the
       engine's answer (static.json tagCarriers: its carriesTag, action by action), read here as on the page, never worked
       out; with no answer the audit stops (the bar must not be asked for an effect on a guess) */
    if (t.onlyWithTag !== undefined) { const carriers = (S.tagCarriers || {})[t.onlyWithTag]
      if (!Array.isArray(carriers)) throw new Error(`bar-audit: static.json holds no answer for the tag '${t.onlyWithTag}' (tagCarriers) — npm run static`)
      if (!carriers.includes(a.id)) continue }
    need(`trigger ${t.id} (${t.hook})`, [word(HOOK_WORDS[t.hook]), ...effectNeeds(t.effect, S), ...targetNeeds(t.select), ...(t.chance < 100 ? [num(t.chance), word('%')] : [])])
  }
  return out
}
/** is the need said in the shown text? a word anywhere (case-blind); a number as a whole figure, not inside another */
export function said(shown, n) {
  const low = shown.toLowerCase()
  if (n.anyOf) return n.anyOf.some(w => low.includes(w))
  if (n.word !== undefined) return low.includes(n.word)
  return new RegExp('(^|[^0-9.])' + n.num.replace('.', '\\.') + '($|[^0-9]|\\.(?![0-9]))').test(low)
}
/** what one drawn row shows: the text of every element in it (each apart, so "Bleed" "2" "20%" stay three), and every tooltip */
export function shownOf(row) {
  const words = [], titles = []
  const walk = n => { const t = n.getAttribute && n.getAttribute('title'); if (t) titles.push(t)
    const kids = n.children || []
    if (kids.length) { if (n._text) words.push(n._text); for (const c of kids) walk(c) } else words.push(n.textContent) }
  walk(row)
  return text(words.join(' ')) + ' | ' + text(titles.join(' | '))
}

function bootPage(html) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView; B.harness.dispose()
  return { w, B, L: B.lib }
}
/**
 * The audit over one page: { units: [{battle, id, typeId, name, actions, drawn, missingActions: [id], missingEffects: [{action, what, lacks}], rows: {id: shown}}], gaps }.
 * `gaps` is the flat list of sentences, empty when the bar shows everything.
 */
export function auditPage(html, roster) {
  const { w, B, L } = bootPage(html), S = L.static, units = [], gaps = []
  for (const b of roster.battles) {
    const EV = b.events, mapId = EV.find(e => e.type === 'map.loaded').mapId
    const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: S.units, statuses: S.statuses, absorbingStatuses: S.absorbingStatuses, actions: S.actions, badges: S.badges,
      layers: S.layers, actionKinds: S.actionKinds, statusRows: S.statusRows, itemClasses: S.itemClasses, items: S.items, hands: S.hands, tagCarriers: S.tagCarriers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: { mapId } } }
    const el = w.document.createElement('div'); w.document.body.appendChild(el)
    const v = B.mount(el, data, { autoplay: false }); v.push(EV); v.seek(EV.length)
    for (const u of b.units) {
      v.inspect(u.id)
      const rows = Object.fromEntries(v._V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act).map(r => [r.dataset.act, shownOf(r)]))
      const rec = { battle: b.label, id: u.id, typeId: u.typeId, name: u.name, actions: u.actions, triggers: u.triggers, drawn: Object.keys(rows), missingActions: [], missingEffects: [], rows }
      for (const id of u.actions) {
        const a = S.actions[id]
        if (!a) { rec.missingActions.push(id); gaps.push(`${b.label} · ${u.name} (${u.typeId}): ${id} is on the engine's sheet and static.json has no row for it`); continue }
        if (!(id in rows)) { rec.missingActions.push(id); gaps.push(`${b.label} · ${u.name} (${u.typeId}): the bar draws no button for ${a.name} (${id})`); continue }
        for (const n of actionNeeds({ id, ...a }, u.triggers, S)) {
          const lacks = n.needs.filter(x => !said(rows[id], x)).map(x => x.word ?? x.num ?? x.anyOf.join('|'))
          if (lacks.length) { rec.missingEffects.push({ action: id, what: n.what, lacks }); gaps.push(`${b.label} · ${u.name} (${u.typeId}) · ${a.name} (${id}): ${n.what} — not shown: ${lacks.join(', ')}`) }
        }
      }
      units.push(rec)
    }
    v.dispose()
  }
  return { units, gaps }
}

/* run as a tool (not imported by the page test): print the report */
if ((process.argv[1] ?? '').replace(/\\/g, '/').endsWith('tools/bar-audit.mjs')) {
  const page = process.argv[2] || process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', roster = JSON.parse(readFileSync(process.argv[3] || 'tools/fixtures/bar-audit-roster.json', 'utf8'))
  const { units, gaps } = auditPage(readFileSync(page, 'utf8'), roster)
  for (const u of units) {
    console.log(`${u.battle} · ${u.name} (${u.typeId}) — sheet ${u.actions.length} action(s), bar ${u.drawn.length} button(s)` + (u.missingActions.length || u.missingEffects.length ? '' : ' — all shown'))
    for (const id of u.missingActions) console.log(`    NO BUTTON  ${id}`)
    for (const m of u.missingEffects) console.log(`    NOT SHOWN  ${m.action}: ${m.what} — ${m.lacks.join(', ')}`)
  }
  const kinds = new Map(); for (const u of units) for (const m of u.missingEffects) { const k = m.what.replace(/[-0-9.]+/g, 'N').replace(/trigger \S+/, 'trigger').replace(/target \{.*/, 'target'); kinds.set(k, (kinds.get(k) || 0) + 1) }
  console.log(`\nbar-audit: ${units.length} units · ${units.reduce((n, u) => n + u.actions.length, 0)} actions · ${units.reduce((n, u) => n + u.missingActions.length, 0)} with no button · ${units.reduce((n, u) => n + u.missingEffects.length, 0)} things not shown`)
  for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(4)} × ${k}`)
  process.exit(gaps.length ? 1 : 0)
}
