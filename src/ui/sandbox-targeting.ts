import type {SandboxChoice} from '../core/sandbox.js'
import type {previewBurst} from '../engine.js'
// Copy engine-supplied facts; no shape, cover, visibility or legality calculation.
export function sandboxTargetingOf(choices:readonly SandboxChoice[],preview:ReturnType<typeof previewBurst>){return {legalHexes:choices.flatMap(c=>'centre' in c.command?[c.command.centre]:[]),centre:preview.centre,hexes:[...preview.hexes],shielded:preview.targets.filter(t=>t.shielded.length).map(t=>({hex:t.hex,props:[...t.shielded]}))}}
