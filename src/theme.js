/* One hue per status, everywhere; one swatch per terrain. Pure tables. */
// terrain.woodland (engine v2.retire-forest-hills, Andrew 2026-09-24: "trees are supposed to be
// woodland") paints as forest did; terrain.forest stays for exports made before it.
export const TSWATCH = { 'terrain.open': 'hexPlains', 'terrain.forest': 'hexForest', 'terrain.woodland': 'hexForest',
  'terrain.hills': 'hexHills', 'terrain.rocky': 'hexScrub', 'terrain.rocky-hills': 'hexScrub',
  'terrain.water': 'hexOcean', 'terrain.impassable': 'hexMountain',
  // terrain.burning / terrain.poisoned: retired in the engine 2026-09-28 (fix.ground-one-funnel —
  // painted layers now); kept for exports made before it, as terrain.forest is
  'terrain.burning': 'hexDirt', 'terrain.poisoned': 'hexMarsh',
  /* PROVISIONAL swatches (2026-09-28, fix.ground-one-funnel, review V9 — Angela/Andrew to judge):
     the V2 grounds and the structures fell back to plains in silence. Each borrows the nearest
     existing tile; tools/vocabulary.test.mjs fails when the engine adds a ground with none. */
  'terrain.undergrowth': 'hexScrub', 'terrain.lava': 'hexDirt', 'terrain.marsh': 'hexMarsh',
  'terrain.desert': 'hexDirt', 'terrain.ruins': 'hexScrub',
  'terrain.wall': 'hexMountain', 'terrain.tower': 'hexMountain', 'terrain.house': 'hexDirt' }

/* ONE status → style map (viewer.reads-engine, review V5): each status's hue, its glyph and `vfx` — the canvas effect
   hexvfx.js plays when it is applied or ticks, ringed in the status's OWN hue. There were three disagreeing tables
   (this one, board.js's VSTYLE and VFX_STATUS below it), so real Weak played Protection's gold and Frost Slow's blue. */
export const STYLE = {   // one hue per status, everywhere — pips, VFX, chips, panel (Law 6)
  'status.poison': { hue: '#8ed14f', gl: 'circle(50%)', vfx: 'poison' },
  'status.burn': { hue: '#ff9d3c', gl: 'polygon(50% 0,72% 28%,66% 47%,86% 40%,80% 76%,50% 100%,20% 76%,26% 42%,42% 50%)', vfx: 'burn' },
  'status.bleed': { hue: '#e05252', gl: 'polygon(50% 0,86% 56%,74% 92%,26% 92%,14% 56%)', vfx: 'bleed' },
  'status.regeneration': { hue: '#3fd0c9', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true, vfx: 'regen' },
  'status.stun': { hue: '#f5d442', gl: 'polygon(50% 0,62% 34%,98% 35%,69% 57%,79% 91%,50% 70%,21% 91%,31% 57%,2% 35%,38% 34%)', vfx: 'shadow' },
  'status.weak': { hue: '#b48ae0', gl: 'polygon(0 0,100% 0,54% 46%,100% 100%,0 100%,46% 54%)', vfx: 'affliction' },
  'status.slow': { hue: '#6fb3df', gl: 'polygon(0 12%,100% 12%,50% 100%)', vfx: 'frost' },
  'status.protection': { hue: '#e8c35a', gl: 'polygon(50% 0,100% 18%,100% 58%,50% 100%,0 58%,0 18%)', vfx: 'weak' },
  /* PROVISIONAL hues (2026-09-03, Angela: assign now, flag for Andrew) for the
     seven Codex statuses the engine landed that day — before this they fell
     back to Poison's green, which Law 6 forbids. Re-rule freely. */
  'status.frost': { hue: '#bfe6ff', gl: 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)', vfx: 'frost', provisional: true },
  'status.karma': { hue: '#f6e7c1', gl: 'circle(50%)', vfx: 'karma', provisional: true },
  'status.taunt': { hue: '#ff7ab3', gl: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', provisional: true },
  'status.shadow': { hue: '#6e5bd9', gl: 'circle(50%)', vfx: 'shadow', provisional: true },
  'status.confusion': { hue: '#d98cff', gl: 'polygon(20% 0,80% 0,100% 50%,80% 100%,20% 100%,0 50%)', provisional: true },
  'status.root': { hue: '#9c6b3f', gl: 'polygon(50% 0,100% 100%,0 100%)', provisional: true },
  'status.dazed': { hue: '#d9d26e', gl: 'circle(50%)', provisional: true },
  /* PROVISIONAL (2026-09-23, v2.prone — Angela to judge): Prone, a dusty
     earth-grey — the colour of the ground the unit is lying on. The test
     instance test.status.floored reads as Prone (stStyle, below). */
  'status.prone': { hue: '#a8977c', gl: 'polygon(0 62%,100% 62%,100% 88%,0 88%)', provisional: true },
  'status.powers-locked': { hue: '#8f9bb3', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true, provisional: true },
  /* viewer.timed-effect-status-marks (2026-10-05; engine capability.effect-lasts-activations): the timed effects a power puts
     on its user — statuses that GIVE. Each wore the fallback, a green dot in Poison's hue, so a hero under Stoke read as
     poisoned. A status that gives is marked as Regeneration always was (VFX/PLAYBACK-DESIGN.md: "the one helpful status —
     shape cue on top of hue so it can never be misread as poison"): the square pip, and with it a frame (`buff`) and, where
     the icon set the page ships has one that fits, its `glyph` in place of a flat shape — a flame for the one that adds Burn
     to hits, a drop for the coating. `gl` stays as the shape where a glyph cannot be drawn (the float over a tick).
     PROVISIONAL hues, Andrew to judge; neither is Poison's nor any other status's. Perfect Sight has no row here: the shipped
     set holds no eye, so it wears the neutral buff mark below (an art need, named in the item's switch). */
  'status.fire-gauntlet.stoke': { hue: '#ff7847', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true, buff: true, glyph: 'fire', provisional: true },
  'status.poison-coating': { hue: '#5fbf8f', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true, buff: true, glyph: 'droplet', provisional: true },
}
/* A STATUS THE TABLE HAS NO MARK FOR (viewer.timed-effect-status-marks): it never borrows Poison's green dot again (Law 6: one
   hue per status). One that gives — its engine row lends its holder something (D.STATUS_ROWS, static.json statusRows) —
   wears the NEUTRAL BUFF MARK: the square pip and frame of a buff, in a warm white no status owns. Any other wears a plain
   grey dot. Both are listed by the page test (tools/timed-effect-status-marks.test.mjs prints every status wearing one), so
   a timed effect added later is seen, not missed. */
export const BUFF_MARK = { hue: '#d8d2c0', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true, buff: true, neutral: true }
export const PLAIN_MARK = { hue: '#9a958a', gl: 'circle(50%)', neutral: true }
/* THE GROUND LAYERS (2026-09-03): a painted layer wears the hue of the status
   it applies — burning is Burn's orange, frost is Frost's ice, poisoned is
   Poison's green, weak is Weak's purple — so one hue per status holds on the
   ground too (Law 6). Darkness applies nothing and has its own. Keyed by the
   engine's layer NAME (generated/static.json .layers), never by number. Which status each layer
   applies is the ENGINE's (static.json .layerStatus, from its exported vocabulary — fix.ground-one-
   funnel 2026-09-28, review V3: this file kept its own copy). */
export const DARK_HUE = '#0b0a14'
export const layerHue = (name, layerStatus = {}) => layerStatus[name] && STYLE[layerStatus[name]] ? STYLE[layerStatus[name]].hue : name === 'layer.darkness' ? DARK_HUE : '#cbb9a0'
/* THE DEATHBED SKULL's red (Angela 2026-09-04: "Use a very small skull for
   what goes overhead, and make it red"). Was the wound-level blood, which the
   engine's deathbed reversal deleted — same slot, new owner. */
export const BLOOD_HUE = '#c62828'
/* A status with no row of its own wears the look of the one it IS (viewer.reads-engine, review V5) — never a
   string rewrite (the old unanchored /daze$/ made test.status.daze "status.status.stun", which fell back to Poison's
   green). Anchored first: test.status.X is status.X where that exists. Then DERIVED from the engine: of the rows in
   STYLE, the one whose behaviour — its true flags and the damage type it ticks (D.STATUS_ROWS, static.json statusRows,
   copied from the engine's status rows) — holds ALL of this status's, with the fewest besides; a tie names none. The
   testing lane's Daze blocks action as Stun does, its Hobble slows as Slow does, its Ward absorbs as Protection does,
   its Enfeeble weakens as Weak does, its Gash bleeds as Bleed does, its Floored floors as Prone does — read, not typed. */
const traits = r => r ? [...(r.flags || []), ...(r.tickDamageType ? ['tick:' + r.tickDamageType] : [])] : null
export function styleIdOf(id, D) {
  const sid = String(id)
  if (STYLE[sid]) return sid
  const anchored = /^test.(status..+)$/.exec(sid)
  if (anchored && STYLE[anchored[1]]) return anchored[1]
  const ROWS = (D && D.STATUS_ROWS) || {}, mine = traits(ROWS[sid])
  if (!mine || !mine.length) return null
  const like = Object.keys(STYLE).map(k => [k, traits(ROWS[k])]).filter(([, t]) => t && mine.every(x => t.includes(x)))
    .map(([k, t]) => [k, t.length - mine.length]).sort((x, y) => x[1] - y[1])
  return like.length && (like.length === 1 || like[0][1] < like[1][1]) ? like[0][0] : null
}
/* was: … || { hue: '#8ed14f', gl: 'circle(50%)' } — Poison's own look, for every status with no row (viewer.timed-effect-status-marks) */
export const stStyle = (id, D) => STYLE[styleIdOf(id, D)] || ((((D && D.STATUS_ROWS) || {})[String(id)] || {}).lends ? BUFF_MARK : PLAIN_MARK)
/* viewer.area-trigger-burst (engine DECISIONS.md 2026-10-03 'an end-of-Activation area burn shows an explosion of fire', Andrew:
   "that should be an explosion of fire. We have the VFX for that."): the burst an AREA plays, by the effect its status already
   has in the table above (`vfx`) — burn: the effects library's explosion of fire. A status whose effect has no burst here
   plays none (it is listed by name: tools/area-trigger-burst.test.mjs) — never another status's. */
export const AREA_BURST = { burn: 'fire' }
export const areaBurstOf = (statusId, D) => AREA_BURST[stStyle(statusId, D).vfx] || null

/* UNDER THE UNIT (viewer.under-unit, engine DECISIONS.md 2026-09-29 "the playable battle screen"): "we don't need
   poison or burn icons on the units because we can display that on the unit directly" · "Slow does not need
   representation on the character. It can just change the number that shows how much movement that character
   has" · "Stun should be shown on a character". Each list names the engine's statuses that behave so — the testing
   lane's Daze blocks action as Stun does, its Hobble reduces movement as Slow does — and engine
   test/under-unit.test.ts asserts every list is exactly the engine's (blocksAction · tickDamageType fire ·
   tickDamageType poison · reducesMovement), so a new or renamed status shows up there. */
export const UNDER_UNIT = { body: { stun: ['status.stun', 'test.status.daze'], burn: ['status.burn'], poison: ['status.poison'] },
  movementOnly: ['status.slow', 'test.status.hobble'] }
/** the body effect a status is drawn as (stun · burn · poison), or null when it is an icon */
export const onBodyAs = id => { for (const [k, ids] of Object.entries(UNDER_UNIT.body)) if (ids.includes(id)) return k; return null }
/** a status that only changes the movement number — no icon, nothing on the body */
export const movementOnly = id => UNDER_UNIT.movementOnly.includes(id)

export const PROJ_TINT = { burn: '#ff9d3c', poison: '#8ed14f', bleed: '#e05252', heal: '#8fe08a' }
/* result colours (ruled 2026-08-27): red physical, blue magic, white true; heals green */
export const DMG_HUE = { physical: '#ff5346', magic: '#6fb3ff', fire: STYLE['status.burn'].hue, poison: STYLE['status.poison'].hue, shadow: STYLE['status.shadow'].hue, 'true': '#ffffff', other: '#ffd9a0' }
export const HEAL_HUE = '#8fe08a'
/* the buff/debuff layer — the stat block's green and red, used by the chevron,
   the stat rows and the move-rider chips (ruled 2026-09-01) */
export const MOD_UP = '#7ec45f', MOD_DOWN = '#d1665c'
/* the aura tints (2026-09-03) — a hostile aura is the debuff red, a friendly
   one the buff green: the buff/debuff layer's own pair, nothing new */
export const AURA_HUE = { enemy: MOD_DOWN, ally: MOD_UP, any: '#cbb9a0' }
/* a BADGE — the permanent per-unit thing (Rotting Flesh, Wounded). One hue
   wherever a badge is named: the trigger chip, the panel's trigger row, the
   float when one is gained (2026-09-04). */
export const BADGE_HUE = '#c9a8ff'
/* the emphasis ladder's gold (CRIT!, the crit numeral rim, the injury star) */
export const CRIT_HUE = '#ffcf6a'
/* note floats — knocked, resisted, absorbed, max-hp lost; and the 2026-09-03
   beats: held (a zone of control), the attack of opportunity, the Deathbed's
   stood/fell, a bleed-out moved, the rise, the feed, the obliteration, Surge */
export const NOTE_HUE = { knocked: '#cbb9a0', resisted: '#9fb6c8', absorbed: '#8fd0ff', maxhp: '#d1665c', maxhpUp: '#7ec45f',
  note: '#cbb9a0', aoo: '#ffb070', block: '#9fb6c8', bleed: '#ff3226', badge: BADGE_HUE,
  raised: '#b48ae0', eaten: '#8ed14f', obliterated: '#6e5bd9', surge: '#ffe2a0',
  /* PROVISIONAL (2026-09-23, R4 knockback/KDB — Angela to judge): a fired KDB's
     word (sandstone), a push's collision (hot amber), a body the well consumed
     (deep-water teal) */
  kdb: '#e6c07a', collision: '#ff9a4a', consumed: '#3f8f9a',
  /* PROVISIONAL (2026-09-24, R5 Thorns — Angela to judge): the word over a pricked attacker (bramble green) */
  thorns: '#8fbf5a' }
/* the protection bar's spent segment; its live segment is the status hue */
export const PROT_SPENT = '#2f5b78'
/** theme hue as an "r,g,b" triplet, for the canvas VFX */
export const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}` }
export const SIDE_TINT = { hero: '#e0b95e', enemy: '#a964d8' }
export const SIDE_GLOW = { hero: '224,185,94', enemy: '169,100,216' }


// Visual terrain tint only; status effects retain their existing recipes.
export const TERRAIN_3D_TINT = { 'terrain.forest': '#72825a', 'terrain.woodland': '#72825a', 'terrain.rocky': '#aaa095', 'terrain.rocky-hills': '#aaa095' }

/* viewer.play-input (2026-09-30): the planning overlay's colours — COOL IS A FORECAST (ruled 2026-09-01), so the reach,
   the path, the ghost and the forecast's arrow share the aim's cool blue; the zone of control is hatched in the attack
   of opportunity's own note hue; an enemy's reach is violet (walk) and red (hit); the notch eats the Health bar in the
   damage red and the skull is blood. Look choices (viewer SWITCHES playLook).
   viewer.battle-full-screen (engine DECISIONS.md 2026-09-30, Andrew: "The arrow for targeting should be red, not blue."):
   the targeting arrow and the forecast numbers beside its head are red — aim, aimHit, aimDmg; the walk's path stays cool.
   viewer.no-target-ring (engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes; ...'): `target`,
   the yellow of the ring on every hex the chosen action could hit (rgba 255,215,100 at .9), is gone with the ring; the mark
   on a unit that can be hit is the arrow's own red (aim). */
export const PLAY_HUE = { reach: 'rgba(120,190,240,.20)', reachEdge: 'rgba(150,205,245,.55)', path: 'rgba(140,178,208,.96)',
  aim: 'rgba(222,52,46,.96)', aimHit: '#ff9d92', aimDmg: '#ff6a5c',
  /* viewer.friend-line-green-heal-glows (engine DECISIONS.md 2026-10-05, Andrew: "They should be green."): the line and the
     mark of an action that HELPS its target — a heal, a buff — where an attack's are the red above */
  aid: 'rgba(84,204,104,.96)', aidHit: '#a9eeb0', aidDmg: '#7fe08c',
  /* … and the glow on the hexes of an area that is healed: the heal's own colour (HEAL_HUE), see-through */
  healArea: 'rgba(143,224,138,.42)',
  zoc: 'rgba(255,176,112,.50)', provoke: NOTE_HUE.aoo, ghost: 'rgba(191,242,255,.9)',
  threatMove: 'rgba(170,120,240,.24)', threatHit: 'rgba(235,80,80,.85)', loss: 'rgba(235,80,70,.8)', lethal: 'rgba(198,40,40,.95)',
  notch: 'rgba(255,255,255,.95)', skull: BLOOD_HUE, note: 'rgba(8,9,11,.82)' }
