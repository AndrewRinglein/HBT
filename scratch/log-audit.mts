// Log-invariant audit — written 2026-09-04 during the bug hunt (FINDINGS 38–43).
// Run from engine/: npx tsx scratch/log-audit.mts <seeds>. Every map × {8,16} enemies × seeds, every scenario × seeds.
// Flags: non-integers, missing causeId, hp/stamina bounds and log-vs-state agreement, non-standing actors,
// double occupancy, cooldown re-use, roll/hitChance disagreement, 0-damage and 0-chance declarations.
// Invariant audit over event logs.
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAPS } from '../src/content/maps.js'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

type Ev = Record<string, any>
const hits = new Map<string, { n: number; ex: string[] }>()
function flag(kind: string, ex: string) {
  const h = hits.get(kind) ?? { n: 0, ex: [] }
  h.n++
  if (h.ex.length < 3) h.ex.push(ex)
  hits.set(kind, h)
}

function audit(label: string, ctx: any) {
  const ev: Ev[] = ctx.events
  const geo = ctx.geo
  const life = new Map<number, string>()
  const hp = new Map<number, number>()
  const maxHp = new Map<number, number>()
  const stam = new Map<number, number>()
  const maxStam = new Map<number, number>()
  const hex = new Map<number, number>()
  const side = new Map<number, string>()
  const cooldownReady = new Map<string, number>()
  const activations = new Map<string, number>()
  let provokedThisActivation = new Set<string>()
  const where = (e: Ev) => `${label} T${e.turn}/${e.phase} #${e.seq} ${e.type} actor=${e.actor} target=${e.target}`

  for (const e of ev) {
    if (!e.causeId) flag('missing causeId', where(e))
    for (const [k, v] of Object.entries(e)) {
      if (typeof v === 'number' && !Number.isInteger(v)) flag(`non-integer field ${k}`, `${where(e)} ${k}=${v}`)
    }
    switch (e.type) {
      case 'unit.enter':
        life.set(e.actor, 'standing'); hp.set(e.actor, e.hp); maxHp.set(e.actor, e.maxHp)
        stam.set(e.actor, e.stamina); maxStam.set(e.actor, e.maxStamina); side.set(e.actor, e.side)
        for (const [id, h] of hex) if (h === e.hex && life.get(id) === 'standing' && id !== e.actor) flag('two standing units on one hex (enter)', `${where(e)} hex=${e.hex} also unit ${id}`)
        hex.set(e.actor, e.hex)
        if (e.hp > e.maxHp) flag('enter hp > maxHp', where(e))
        break
      case 'activation.begin': {
        provokedThisActivation = new Set()
        const k = `${e.turn}:${e.phase}:${e.actor}`
        activations.set(k, (activations.get(k) ?? 0) + 1)
        if (life.get(e.actor) !== 'standing') flag('activation of non-standing unit', `${where(e)} life=${life.get(e.actor)}`)
        if (hp.has(e.actor) && e.hp !== hp.get(e.actor)) flag('activation.begin hp disagrees with tracked hp', `${where(e)} log=${e.hp} tracked=${hp.get(e.actor)}`)
        if (stam.has(e.actor) && e.stamina !== stam.get(e.actor)) flag('activation.begin stamina disagrees with tracked', `${where(e)} log=${e.stamina} tracked=${stam.get(e.actor)}`)
        if (e.hex !== hex.get(e.actor)) flag('activation.begin hex disagrees with tracked', `${where(e)} log=${e.hex} tracked=${hex.get(e.actor)}`)
        break
      }
      case 'moved': {
        const from = hex.get(e.actor)
        if (from !== e.from) flag('moved.from disagrees with tracked hex', `${where(e)} from=${e.from} tracked=${from}`)
        if (geo.distance(e.from, e.to) !== 1) flag('moved more than one hex in a step', `${where(e)} d=${geo.distance(e.from, e.to)}`)
        for (const [id, h] of hex) if (h === e.to && life.get(id) === 'standing' && id !== e.actor) flag('moved onto a standing unit', `${where(e)} hex=${e.to} occupant=${id}`)
        if (life.get(e.actor) !== 'standing') flag('non-standing unit moved', where(e))
        if (e.movePointsLeft < 0) flag('movePointsLeft negative', `${where(e)} ${e.movePointsLeft}`)
        hex.set(e.actor, e.to)
        break
      }
      case 'knocked':
        for (const [id, h] of hex) if (h === e.to && life.get(id) === 'standing' && id !== e.target) flag('knocked onto a standing unit', `${where(e)} hex=${e.to} occupant=${id}`)
        hex.set(e.target, e.to)
        break
      case 'unit.shunted':
        hex.set(e.actor, e.hex)
        break
      case 'attack.declared':
        if (life.get(e.actor) !== 'standing') flag('attack by non-standing unit', where(e))
        if (life.get(e.target) === 'dead') flag('attack on a dead unit', where(e))
        if (e.damageOnHit === 0 && e.causeId !== 'movement.aoo') flag('AI declared an attack previewing 0 damage', `${where(e)} ${e.attackId} dist=${e.distance}`)
        if (e.hitChance <= 0) flag('attack declared at 0 hit chance', `${where(e)} ${e.attackId} hc=${e.hitChance}`)
        if (side.get(e.actor) === side.get(e.target) && !e.area) flag('attack on own side', `${where(e)} ${e.attackId}`)
                break
      case 'attack.hit':
        if (e.roll > e.hitChance) flag('hit with roll > hitChance', `${where(e)} roll=${e.roll} hc=${e.hitChance}`)
        break
      case 'attack.miss':
        if (e.roll <= e.hitChance) flag('miss with roll <= hitChance', `${where(e)} roll=${e.roll} hc=${e.hitChance}`)
        break
      case 'cooldown.set': {
        const k = `${e.actor}:${e.actionId}`; const prev = cooldownReady.get(k)
        if (prev !== undefined && e.turn < prev) flag('action re-used before its cooldown', `${where(e)} ${e.actionId} prevReadyOn=${prev}`)
        cooldownReady.set(k, e.readyOnTurn)
        break }
      case 'power.used':
        if (life.get(e.actor) !== 'standing') flag('power by non-standing unit', where(e))
                break
      case 'move.begin':
        if (life.get(e.actor) !== 'standing') flag('move by non-standing unit', where(e))
                break
      case 'aoo.provoked': {
        const k = `${e.actor}:${e.target}`
        if (provokedThisActivation.has(k)) flag('same holder provoked twice in one activation', where(e))
        provokedThisActivation.add(k)
        if (life.get(e.actor) !== 'standing') flag('aoo by non-standing holder', where(e))
        if (geo.distance(hex.get(e.actor), hex.get(e.target)) !== 1) flag('aoo at distance != 1', `${where(e)} d=${geo.distance(hex.get(e.actor), hex.get(e.target))}`)
        break
      }
      case 'damage.applied': {
        const t = e.target
        if (hp.has(t) && e.hpBefore !== hp.get(t)) flag('damage.hpBefore disagrees with tracked hp', `${where(e)} before=${e.hpBefore} tracked=${hp.get(t)}`)
        if (e.hpAfter < 0) flag('hp below 0', where(e))
        if (e.hpBefore - e.amount !== e.hpAfter) flag('damage arithmetic', `${where(e)} ${e.hpBefore}-${e.amount}!=${e.hpAfter}`)
        if (life.get(t) === 'dead') flag('damage to a dead unit', where(e))
        if (e.amount < 0) flag('negative damage', where(e))
        hp.set(t, e.hpAfter)
        break
      }
      case 'heal.applied': {
        const t = e.target
        if (hp.has(t) && e.hpBefore !== hp.get(t)) flag('heal.hpBefore disagrees with tracked hp', `${where(e)} before=${e.hpBefore} tracked=${hp.get(t)}`)
        if (e.hpAfter > (maxHp.get(t) ?? Infinity)) flag('heal over maxHp', `${where(e)} after=${e.hpAfter} max=${maxHp.get(t)}`)
        if (life.get(t) !== 'standing') flag('heal on a non-standing unit', `${where(e)} life=${life.get(t)}`)
        hp.set(t, e.hpAfter)
        break
      }
      case 'maxHp.gained': case 'maxHp.lost':
        maxHp.set(e.target, e.maxHp); hp.set(e.target, e.hp)
        if (e.hp > e.maxHp) flag('hp > maxHp after max change', where(e))
        break
      case 'hp.reset':
        maxHp.set(e.target, e.maxHp); hp.set(e.target, e.hp)
        break
      case 'stamina.spent': case 'stamina.regen': case 'stamina.gained': case 'stamina.drained':
        { const id = e.actor ?? e.target
          if (e.stamina > (maxStam.get(id) ?? Infinity)) flag('stamina over max', `${where(e)} st=${e.stamina} max=${maxStam.get(id)}`)
          if (e.stamina < 0) flag('stamina negative', where(e))
          stam.set(id, e.stamina) }
        break
      case 'staminaMax.lost':
        maxStam.set(e.actor, e.maxStamina); stam.set(e.actor, e.stamina)
        break
      case 'maxstamina.gained':
        maxStam.set(e.target, e.maxStamina)
        break
      case 'life.dead': case 'life.downed': case 'life.stood':
        life.set(e.target, e.to)
        break
      case 'deathbed.stood':
        life.set(e.target, 'standing')
        break
      case 'status.applied':
        if (life.get(e.target) !== 'standing') flag('status applied to a non-standing unit', `${where(e)} ${e.statusId} life=${life.get(e.target)}`)
        break
    }
  }
  for (const [k, n] of activations) if (n > 1) flag('unit activated more than once in a phase', `${label} ${k} ×${n}`)
  for (const u of ctx.state.units) {
    if (u.hp > u.maxHp) flag('final hp > maxHp', `${label} unit ${u.id} ${u.hp}/${u.maxHp}`)
    if (u.stamina > u.maxStamina) flag('final stamina > max', `${label} unit ${u.id} ${u.stamina}/${u.maxStamina}`)
    if (hp.has(u.id) && hp.get(u.id) !== u.hp) flag('final hp disagrees with log', `${label} unit ${u.id} log=${hp.get(u.id)} state=${u.hp}`)
    if (hex.get(u.id) !== u.hex) flag('final hex disagrees with log', `${label} unit ${u.id} log=${hex.get(u.id)} state=${u.hex}`)
    if (life.get(u.id) !== u.lifeState) flag('final lifeState disagrees with log', `${label} unit ${u.id} log=${life.get(u.id)} state=${u.lifeState}`)
    if (u.lifeState === 'standing' && u.hp <= 0) flag('standing at 0 hp', `${label} unit ${u.id}`)
    if (u.lifeState === 'dead' && u.hp > 0) flag('dead with hp > 0', `${label} unit ${u.id} hp=${u.hp}`)
    for (const s of u.statuses) if (s.value <= 0) flag('status at value <= 0 still held', `${label} unit ${u.id} ${s.id}=${s.value}`)
  }
  const standing = ctx.state.units.filter((u: any) => u.lifeState === 'standing')
  const seen = new Map<number, number>()
  for (const u of standing) { if (seen.has(u.hex)) flag('final: two standing on one hex', `${label} hex ${u.hex} units ${seen.get(u.hex)},${u.id}`); seen.set(u.hex, u.id) }
  const end = ev.find((e) => e.type === 'battle.end')
  if (!end) flag('no battle.end', label)
  const heroesStanding = standing.filter((u: any) => u.side === 'hero').length
  const enemiesStanding = standing.filter((u: any) => u.side === 'enemy').length
  if (end?.outcome === 'wipe' && heroesStanding > 0) flag('wipe with heroes standing', `${label} heroes=${heroesStanding}`)
  if (end?.outcome === 'heroClear' && enemiesStanding > 0) flag('heroClear with enemies standing', `${label} enemies=${enemiesStanding}`)
  if (end?.outcome === 'capped' && (heroesStanding === 0 || enemiesStanding === 0)) flag('capped with a side empty', `${label} h=${heroesStanding} e=${enemiesStanding}`)
  return end?.outcome
}

const seeds = Number(process.argv[2] ?? 5)
const outcomes = new Map<string, Record<string, number>>()
const bump = (k: string, o: string) => { const r = outcomes.get(k) ?? {}; r[o] = (r[o] ?? 0) + 1; outcomes.set(k, r) }
let battles = 0
for (const m of MAPS) {
  for (const n of [8, 16]) for (let r = 0; r < seeds; r++) {
    const label = `${m.id}×${n} s${r}`
    try {
      const ctx = createBattle({ replicate: r, enemyCount: n, mapId: m.id })
      runBattle(ctx)
      bump(`${m.id}×${n}`, audit(label, ctx) ?? 'none'); battles++
    } catch (err: any) { flag('THREW', `${label}: ${String(err?.message ?? err).slice(0, 200)}`) }
  }
}
for (const id of Object.keys(SCENARIOS)) {
  for (let r = 0; r < seeds; r++) {
    const label = `${id} s${r}`
    try {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(id)), replicate: r })
      runBattle(ctx)
      bump(id, audit(label, ctx) ?? 'none'); battles++
    } catch (err: any) { flag('THREW', `${label}: ${String(err?.message ?? err).slice(0, 200)}`) }
  }
}
console.log(`${battles} battles audited`)
for (const [k, r] of outcomes) console.log('  ', k, JSON.stringify(r))
console.log('\n=== violations ===')
for (const [k, h] of [...hits].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`\n${h.n}× ${k}`)
  for (const x of h.ex) console.log('    ', x)
}
