// Types for tools/suites.mjs, so a .test.ts can import it under strict tsc.
export interface Pass { suite: string; stamp: string; at: string; by?: string; in?: string; failed?: boolean; with?: Record<string, string> | null; pack?: string; golden?: string; moved?: string | null }
export interface PlanRow { suite: string; why: string; stamp: string; run: boolean; reason: string }
export interface ControlResult { ok?: boolean; skipped?: boolean; note?: string; golden?: string; moved?: string }
export const PASSES_FILE: string
export const KINGDOM_QUARTERS: number
export const KINGDOM_WORKERS: string
export const SUITES: Array<{ suite: string; why: string; cmds: string[][]; env?: Record<string, string> }>
export function parsePasses(text: unknown): Pass[]
export function hasPass(passes: Pass[] | undefined, suite: string, stamp: string): Pass | null
export function runsOn(passes: Pass[] | undefined, suite: string, stamp: string): Pass[]
export function appendFail(dir: string, run: { suite: string; stamp: string; by?: string; in?: string }): boolean
export function recordSuiteFail(root: string, suite: string, before: Record<string, string>, by: string): void
export function stampsLine(stamps: Record<string, string>): string
export function copyName(root: string): string
export function planSuites(a: { stamps: Record<string, string>; passes: Record<string, Pass[]>; full?: boolean }): PlanRow[]
export function fullGreen(a: { stamps: Record<string, string>; passes: Record<string, Pass[]> }): { green: boolean; missing: Array<{ suite: string; why: string }> }
export function controlAction(a: { stamp: string; pack: string; golden: string; passes: Pass[] }): { action: 'skip' | 're-record' | 'run'; reason: string; line?: Pass }
export function shardsFor(raw: unknown, stamp: string): { tree: string; sets: Record<string, number[]> } | null
export function logCheck(c: { name: string; ok?: boolean; warn?: boolean; skipped?: boolean; note?: string }): Record<string, unknown>
export function readPasses(dir: string): Pass[]
export function appendPass(dir: string, pass: Partial<Pass> & { suite: string; stamp: string }): boolean
export function recordSuitePass(root: string, suite: string, before: Record<string, string>, by: string, extra?: Record<string, unknown>): { recorded: boolean; why?: string }
export function packSha(engineDir: string): string
export function goldenSha(engineDir: string): string
export function recordControl(engineDir: string, a: { by: string; moved?: string | null }): boolean
export function controlCheck(a: { engineDir: string; item: { changesBaseline?: boolean }; baseline: () => string }): ControlResult
export function packGolden(a: { engineDir: string; baseline: () => string }): { action: 'skip' | 're-record' | 'run' | 'error'; moved?: string | null; said: string }
export function planNow(root?: string, a?: { full?: boolean }): { stamps: Record<string, string>; suites: PlanRow[]; golden: { action: string; reason: string } }
export function fullGreenNow(root?: string): { green: boolean; missing: Array<{ suite: string; why: string }>; stamps: Record<string, string>; said: string }
export function runSuites(root?: string, a?: { full?: boolean; only?: string | null }): { ok: boolean; rows: unknown[] }
export function commitRecords(root?: string, message?: string): string[]
