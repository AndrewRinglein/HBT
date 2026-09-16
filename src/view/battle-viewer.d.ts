// The shared viewer is JavaScript. Declare only the component surface consumed
// here; engine facts stay typed by Kingdom's own engine door.
declare module '*viewer/src/viewer.js' {
  export function mountBattleViewer(root: HTMLElement, data: unknown, opts?: Record<string, unknown>): {
    push(events: readonly unknown[]): void
    seek(cursor: number): void
    dispose(): void
  }
}
