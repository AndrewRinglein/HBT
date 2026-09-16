/* One hue per status, everywhere; one swatch per terrain. Pure tables. */
export const TSWATCH = { 'terrain.open': 'hexPlains', 'terrain.forest': 'hexForest',
  'terrain.hills': 'hexHills', 'terrain.rocky': 'hexScrub', 'terrain.rocky-hills': 'hexScrub',
  'terrain.water': 'hexOcean', 'terrain.obstacle': 'hexMountain',
  'terrain.burning': 'hexDirt', 'terrain.poisoned': 'hexMarsh' }

export const STYLE = {   // one hue per status, everywhere — pips, VFX, chips, panel (Law 6)
  'status.poison': { hue: '#8ed14f', gl: 'circle(50%)' },
  'status.burn': { hue: '#ff9d3c', gl: 'polygon(50% 0,72% 28%,66% 47%,86% 40%,80% 76%,50% 100%,20% 76%,26% 42%,42% 50%)' },
  'status.bleed': { hue: '#e05252', gl: 'polygon(50% 0,86% 56%,74% 92%,26% 92%,14% 56%)' },
  'status.regeneration': { hue: '#3fd0c9', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true },
  'status.stun': { hue: '#f5d442', gl: 'polygon(50% 0,62% 34%,98% 35%,69% 57%,79% 91%,50% 70%,21% 91%,31% 57%,2% 35%,38% 34%)' },
  'status.weak': { hue: '#b48ae0', gl: 'polygon(0 0,100% 0,54% 46%,100% 100%,0 100%,46% 54%)' },
  'status.slow': { hue: '#6fb3df', gl: 'polygon(0 12%,100% 12%,50% 100%)' },
  'status.protection': { hue: '#e8c35a', gl: 'polygon(50% 0,100% 18%,100% 58%,50% 100%,0 58%,0 18%)' },
  /* PROVISIONAL hues (2026-09-03, Angela: assign now, flag for Andrew) for the
     seven Codex statuses the engine landed that day — before this they fell
     back to Poison's green, which Law 6 forbids. Re-rule freely. */
  'status.frost': { hue: '#bfe6ff', gl: 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)', provisional: true },
  'status.karma': { hue: '#f6e7c1', gl: 'circle(50%)', provisional: true },
  'status.taunt': { hue: '#ff7ab3', gl: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', provisional: true },
  'status.shadow': { hue: '#6e5bd9', gl: 'circle(50%)', provisional: true },
  'status.confusion': { hue: '#d98cff', gl: 'polygon(20% 0,80% 0,100% 50%,80% 100%,20% 100%,0 50%)', provisional: true },
  'status.root': { hue: '#9c6b3f', gl: 'polygon(50% 0,100% 100%,0 100%)', provisional: true },
  'status.dazed': { hue: '#d9d26e', gl: 'circle(50%)', provisional: true },
  'status.powers-locked': { hue: '#8f9bb3', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true, provisional: true },
}
/* THE GROUND LAYERS (2026-09-03): a painted layer wears the hue of the status
   it applies — burning is Burn's orange, frost is Frost's ice, poisoned is
   Poison's green, weak is Weak's purple — so one hue per status holds on the
   ground too (Law 6). Darkness applies nothing and has its own. Keyed by the
   engine's layer NAME (generated/static.json .layers), never by number. */
export const LAYER_STATUS = { 'layer.burning': 'status.burn', 'layer.frost': 'status.frost', 'layer.poisoned': 'status.poison', 'layer.weak': 'status.weak' }
export const DARK_HUE = '#0b0a14'
export const layerHue = name => LAYER_STATUS[name] ? STYLE[LAYER_STATUS[name]].hue : name === 'layer.darkness' ? DARK_HUE : '#cbb9a0'
/* THE DEATHBED SKULL's red (Angela 2026-09-04: "Use a very small skull for
   what goes overhead, and make it red"). Was the wound-level blood, which the
   engine's deathbed reversal deleted — same slot, new owner. */
export const BLOOD_HUE = '#c62828'
export const stStyle = id => STYLE[String(id).replace(/^test\./, '').replace(/daze$/, 'status.stun')
  .replace(/hobble$/, 'status.slow').replace(/ward$/, 'status.protection')
  .replace(/enfeeble$/, 'status.weak')] || { hue: '#8ed14f', gl: 'circle(50%)' }

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
  note: '#cbb9a0', aoo: '#ffb070', bleed: '#ff3226', badge: BADGE_HUE,
  raised: '#b48ae0', eaten: '#8ed14f', obliterated: '#6e5bd9', surge: '#ffe2a0' }
/* the protection bar's spent segment; its live segment is the status hue */
export const PROT_SPENT = '#2f5b78'
/** theme hue as an "r,g,b" triplet, for the canvas VFX */
export const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}` }
export const SIDE_TINT = { hero: '#e0b95e', enemy: '#a964d8' }
export const SIDE_GLOW = { hero: '224,185,94', enemy: '169,100,216' }

/** the status a VFX style name stands for, so the canvas palette can be
    patched from this file — hexvfx.js ships its own colours, and Law 6 says
    they must be these */
export const VFX_STATUS = { poison: 'status.poison', burn: 'status.burn', bleed: 'status.bleed',
  regen: 'status.regeneration', shadow: 'status.stun', frost: 'status.slow', affliction: 'status.weak', weak: 'status.protection' }

// Visual terrain tint only; status effects retain their existing recipes.
export const TERRAIN_3D_TINT = { 'terrain.forest': '#72825a', 'terrain.rocky': '#aaa095', 'terrain.rocky-hills': '#aaa095' }
