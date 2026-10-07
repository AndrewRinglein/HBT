// Types for tools/suites.mjs, so a .test.ts can import it under strict tsc.
export interface Failing { name: string; timedOut: boolean }
export interface Pass { suite: string; stamp: string; at: string; by?: string; in?: string; failed?: boolean; with?: Record<string, string> | null; pack?: string; golden?: string; moved?: string | null; scheduled?: string; failing?: Failing[] }
export interface ScheduledRun { id: string; at: string; in: string | null; rows: Record<string, Pass>; complete: boolean; ok: boolean }
export interface TimeoutRow { suite: string; test: string; times?: string[]; at?: string; fixed?: string }
export interface PlanRow { suite: string; why: string; stamp: string; run: boolean; reason: string }
export interface ControlResult { ok?: boolean; skipped?: boolean; note?: string; golden?: string; moved?: string }
export const PASSES_FILE: string
export const KINGDOM_QUARTERS: number
export const KINGDOM_WORKERS: string
export const SUITES: Array<{ suite: string; why: string; cmds: string[][]; env?: Record<string, string> }>
export function parsePasses(text: unknown): Pass[]
export function hasPass(passes: Pass[] | undefined, suite: string, stamp: string): Pass | null
export function runsOn(passes: Pass[] | undefined, suite: string, stamp: string): Pass[]
export function appendFail(dir: string, run: { suite: string; stamp: string; by?: string; in?: string; scheduled?: string; failing?: Failing[]; with?: Record<string, string>; at?: string }): boolean
export function recordSuiteFail(root: string, suite: string, before: Record<string, string>, by: string, extra?: Record<string, unknown>): boolean
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
export function runSuites(root?: string, a?: { full?: boolean; only?: string | null }): Promise<{ ok: boolean; rows: unknown[]; scheduled: string | null }>
// landing on the quick check (tool.landing-on-the-quick-check, 2026-10-06)
export const SCHEDULED_MAX_AGE_HOURS: number
export const TIMEOUTS_FILE: string
export const SCHEDULED_COMMAND: string
export const TYPECHECKS: Array<{ pkg: string; cmd: string[]; reads: string[] }>
export function failingTests(output: unknown): Failing[]
export function failingSaid(failing: Failing[] | undefined, most?: number): string
export function scheduledRuns(passes: Record<string, Pass[]>): ScheduledRun[]
export function scheduledRunSaid(run: ScheduledRun): string
export function scheduledStatus(passes: Record<string, Pass[]>, now?: number): { run: ScheduledRun | null; newer: ScheduledRun | null; due: boolean; ageHours: number; said: string }
export function suiteLastScheduled(passes: Record<string, Pass[]>, suite: string, now?: number): string
export function suiteLastScheduledNow(root: string, suite: string, now?: number): string
export function scheduledNow(root?: string, now?: number): { run: ScheduledRun | null; newer: ScheduledRun | null; due: boolean; ageHours: number; said: string }
export function landedSince(logText: unknown, since?: string | null): Array<{ id: string; sha: string | null; at: string }>
export function lastPassBefore(passes: Pass[] | undefined, suite: string, before?: string): { pass: Pass | null; called: string }
export function landedSaid(items: Array<{ id: string; sha: string | null }>, most?: number): string
export function timeoutsListed(text: unknown): TimeoutRow[]
export function timeoutsOf(a: { suite: string; failing: Failing[]; passes: Pass[]; listText: string; at: string }): { first: string[]; twice: Array<{ suite: string; test: string; times: string[] }>; listed: string[] }
export function timeoutsNow(root?: string): TimeoutRow[]
export function timeoutFixed(root: string, suite: string, test: string, item: string): void
export function typecheckPass(passes: Pass[] | undefined, check: { pkg: string; reads: string[] }, stamps: Record<string, string>): Pass | null
export function quickControl(a: { golden: string | null; baseline: () => string; declared?: string[] }): { state: 'PASS' | 'FAIL' | 'SKIPPED' | 'MOVED'; said: string }
export function runQuick(root?: string): { ok: boolean; rows: unknown[] }
export function commitRecords(root?: string, message?: string): string[]
