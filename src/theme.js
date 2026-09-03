/* One hue per status, everywhere; one swatch per terrain. Pure tables. */
export const TSWATCH = { 'terrain.open': 'hexPlains', 'terrain.forest': 'hexForest',
  'terrain.hills': 'hexHills', 'terrain.rocky': 'hexScrub', 'terrain.rocky-hills': 'hexScrub',
  'terrain.water': 'hexOcean', 'terrain.obstacle': 'hexMountain',
  'terrain.burning': 'hexDirt', 'terrain.poisoned': 'hexMarsh' }

export const STYLE = {
  'status.poison': { hue: '#8ed14f', gl: 'circle(50%)' },
  'status.burn': { hue: '#ff9d3c', gl: 'polygon(50% 0,72% 28%,66% 47%,86% 40%,80% 76%,50% 100%,20% 76%,26% 42%,42% 50%)' },
  'status.bleed': { hue: '#e05252', gl: 'polygon(50% 0,86% 56%,74% 92%,26% 92%,14% 56%)' },
  'status.regeneration': { hue: '#3fd0c9', gl: 'polygon(8% 8%,92% 8%,92% 92%,8% 92%)', sq: true },
  'status.stun': { hue: '#f5d442', gl: 'polygon(50% 0,62% 34%,98% 35%,69% 57%,79% 91%,50% 70%,21% 91%,31% 57%,2% 35%,38% 34%)' },
  'status.weak': { hue: '#b48ae0', gl: 'polygon(0 0,100% 0,54% 46%,100% 100%,0 100%,46% 54%)' },
  'status.slow': { hue: '#6fb3df', gl: 'polygon(0 12%,100% 12%,50% 100%)' },
  'status.protection': { hue: '#e8c35a', gl: 'polygon(50% 0,100% 18%,100% 58%,50% 100%,0 58%,0 18%)' },
}
export const stStyle = id => STYLE[String(id).replace(/^test\./, '').replace(/daze$/, 'status.stun')
  .replace(/hobble$/, 'status.slow').replace(/ward$/, 'status.protection')
  .replace(/enfeeble$/, 'status.weak')] || { hue: '#8ed14f', gl: 'circle(50%)' }

export const PROJ_TINT = { burn: '#ff9d3c', poison: '#8ed14f', bleed: '#e05252', heal: '#8fe08a' }
export const SIDE_TINT = { hero: '#e0b95e', enemy: '#a964d8' }
export const SIDE_GLOW = { hero: '224,185,94', enemy: '169,100,216' }
