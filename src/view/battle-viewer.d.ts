// The shared viewer is JavaScript. Declare only the component surface consumed
// here; engine facts stay typed by Kingdom's own engine door.
declare module '*viewer/src/viewer.js' {
  export function mountBattleViewer(root: HTMLElement, data: unknown, opts?: Record<string, unknown>): {
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
