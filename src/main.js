/* The standalone page's entry. tools/build-viewer.mjs defines the five
   __BUNDLED_*__ constants from generated/ and battles/; nothing here reads a
   file. The kingdom's bundle imports viewer.js directly and never this. */
import { startHarness } from './harness.js'
import { mountBattleViewer } from './viewer.js'

const LIB = {
  static: __BUNDLED_STATIC__,
  fields: __BUNDLED_FIELDS__,
  art: __BUNDLED_ART__,
  glyphs: __BUNDLED_GLYPHS__,
  battles: __BUNDLED_BATTLES__,
  stamp: __BUNDLED_STAMP__,
}
const H = startHarness(document.getElementById('screen'), LIB)
/* the verifier and the console reach the running viewer here */
window.__battleView = { lib: LIB, harness: H, mount: mountBattleViewer, get viewer() { return H.viewer } }
