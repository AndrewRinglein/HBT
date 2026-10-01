// Types for tools/backlog.mjs, so a .test.ts can import it under strict tsc.
export type Area = 'engine' | 'viewer-kingdom' | 'content' | 'art'
export const AREAS: Area[]
export function areaOf(item: { id?: string; kind?: string; area?: string }): Area
export function backlogFile(area: Area, state?: string): string
export function progressFile(area: Area, state?: string): string
export function backlogFiles(state?: string): string[]
export function readBacklog(state?: string): Array<Record<string, unknown> & { id: string }>
export function saveArea(all: Array<Record<string, unknown>>, area: Area, state?: string): string
export function saveItem(all: Array<Record<string, unknown>>, item: Record<string, unknown>, state?: string): string
export function progressFor(item: Record<string, unknown>, state?: string): string
