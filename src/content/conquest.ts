// The conquest maps — rows. kingdom.abbotown-map (PLAYABLE-OPENING-PLAN.md item 11; engine DECISIONS.md 2026-09-29 "the
// playable opening": "The Retaking Abbotown campaign map is built from Andrew's sketch (IMG_5078)").
//
// Retaking Abbotown: the six sections in the order ruled 2026-09-28 (engine DECISIONS.md "the opening's six battles, in
// order": orphanage, lumberjack, bridge, cavern-and-trail, gates, cathedral — Lumberjack House replaces the sketch's
// Village Outskirts; there is no Town battle). Each section is keyed by its encounter id — no new id kind — and named by
// the engine's encounter where the engine has one; the Cathedral has no engine encounter yet (the Gates joined the
// engine with encounter.opening.gates, engine 817b21d) (kingdom SWITCHES.md conquestSectionKeys).
//
// The geometry is traced from the photograph (C:/Users/aring/Downloads/IMG_5078.jpeg), turned upright so the title
// reads across the top: a 640 × 480 frame, x to the right, y down. `outline` is the section's border, `label` where its
// name was written, `arrow` the hand-drawn arrow INTO the section (from → to; the Orphanage's is the "start" mark's).
// The sketch runs off the bottom of the photograph; the bottom edge is closed just below it (kingdom SWITCHES.md
// conquestMapTrace).
import { ENCOUNTERS } from '../engine.js'

export type Point = readonly [number, number]
export interface ConquestSection {
  readonly encounterId: string
  readonly name: string
  readonly outline: readonly Point[]
  readonly label: Point
  readonly arrow: { readonly from: Point; readonly to: Point }
}
export interface ConquestMap {
  readonly title: string
  /** the frame the sketch is drawn in: [x, y, width, height] */
  readonly frame: readonly [number, number, number, number]
  readonly start: { readonly text: string; readonly at: Point }
  readonly sections: readonly ConquestSection[]
}

const named = (encounterId: string, otherwise: string) => (ENCOUNTERS as Record<string, { name?: string }>)[encounterId]?.name ?? otherwise

export const ABBOTOWN_MAP: ConquestMap = {
  title: 'Retaking Abbotown',
  frame: [24, 178, 512, 318],
  start: { text: 'start', at: [112, 214] },
  sections: [
    {
      encounterId: 'encounter.opening.orphanage', name: named('encounter.opening.orphanage', 'Orphanage'),
      outline: [[145, 247], [120, 253], [95, 268], [70, 290], [50, 315], [43, 340], [50, 357], [75, 367], [100, 377], [125, 395], [137, 415], [150, 385], [170, 365], [197, 349], [202, 340], [202, 325], [197, 315], [185, 311], [172, 300], [170, 275], [168, 250]],
      label: [110, 322], arrow: { from: [110, 226], to: [114, 284] },
    },
    {
      encounterId: 'encounter.opening.lumberjack', name: named('encounter.opening.lumberjack', 'Lumberjack House'),
      outline: [[145, 247], [168, 250], [170, 275], [172, 300], [185, 311], [197, 315], [220, 300], [250, 295], [270, 294], [288, 285], [300, 277], [310, 245], [320, 212], [280, 197], [235, 195], [200, 205], [170, 225]],
      label: [238, 258], arrow: { from: [155, 273], to: [188, 255] },
    },
    {
      encounterId: 'encounter.opening.bridge', name: named('encounter.opening.bridge', 'Bridge'),
      outline: [[197, 315], [220, 300], [250, 295], [270, 294], [288, 285], [310, 295], [335, 307], [320, 330], [300, 350], [280, 357], [250, 355], [220, 352], [197, 349], [202, 340], [202, 325]],
      label: [262, 328], arrow: { from: [252, 277], to: [253, 308] },
    },
    {
      encounterId: 'encounter.opening.cavern-trail', name: named('encounter.opening.cavern-trail', 'Cavern Trail'),
      outline: [[197, 349], [220, 352], [250, 355], [280, 357], [287, 390], [289, 430], [287, 486], [220, 490], [158, 486], [150, 460], [145, 440], [137, 415], [150, 385], [170, 365]],
      label: [222, 414], arrow: { from: [233, 344], to: [227, 378] },
    },
    {
      encounterId: 'encounter.opening.gates', name: named('encounter.opening.gates', 'Gates'),
      outline: [[280, 357], [300, 350], [320, 330], [335, 307], [360, 317], [400, 340], [450, 350], [497, 355], [480, 380], [460, 415], [440, 450], [425, 478], [360, 488], [287, 486], [289, 430], [287, 390]],
      label: [352, 398], arrow: { from: [282, 428], to: [312, 424] },
    },
    {
      encounterId: 'encounter.opening.cathedral', name: named('encounter.opening.cathedral', 'Cathedral'),
      outline: [[288, 285], [300, 277], [310, 245], [320, 212], [360, 215], [420, 217], [470, 220], [505, 235], [520, 262], [520, 300], [510, 330], [497, 355], [450, 350], [400, 340], [360, 317], [335, 307], [310, 295]],
      label: [405, 285], arrow: { from: [394, 368], to: [410, 330] },
    },
  ],
}
