// The shared viewer is JavaScript. Declare only the component surface consumed
// here; engine facts stay typed by Kingdom's own engine door.
declare module '*viewer/src/viewer.js' {
  export function mountBattleViewer(root: HTMLElement, data: unknown, opts?: Record<string, unknown>): {
    setTargeting(facts:{legalHexes:readonly number[];centre:number|null;hexes:readonly number[];shielded:readonly {hex:number;props:readonly string[]}[]}|null):void
    /** viewer.play-input: the plan facts to draw (src/ui/play-input.ts PlayFacts), or null to stop taking the mouse */
    setPlay(facts:object|null):void
    inspect(id:number|null):void
    /** viewer.xcom-camera: the map centred on a unit, at the standard zoom */
    centre(id:number):void
    push(events: readonly unknown[]): void
    seek(cursor: number): void
    play(): void
    pause(): void
    readonly cursor:number
    readonly state:unknown
    dispose(): void
  }
}
declare module '*tools/battle-atlas/combat-compiler.mjs' {
  export function compileAtlasCombat(layout:unknown,catalog:unknown,options:unknown):{compiler:string;sourceFingerprint:string;map:unknown}
  export function canonicalJSON(value:unknown):string
}
