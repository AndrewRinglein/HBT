// Types for tools/gate-progress.mjs, so a .test.ts can import it under strict tsc.
export interface CheckResult { ok?: boolean; warn?: boolean; note?: string; skipPrint?: boolean; golden?: string; review?: boolean; invented?: number; skipped?: boolean; moved?: string }
export interface Progress { id: string; tree: string; ctx: string; results: Record<string, CheckResult>; durations: Record<string, number>; discarded: boolean }
export interface ShardRecord { tree: string; sets: Record<string, number[]> }
export interface ShardStatus { green: boolean; n: number; passed: number[]; todo: number[] }
export function treeHash(cwd?: string): string
export function contextHash(item: Record<string, unknown>, backlog: Array<Record<string, unknown>>, golden: string | null): string
export function openProgress(raw: unknown, key: { id: string; tree: string; ctx: string }): Progress
export function recall(progress: Progress, name: string): CheckResult | null
export function record(progress: Progress, name: string, result: CheckResult, ms?: number): Progress
export function clearResults(progress: Progress): Progress
export function serialize(progress: Progress): string
export function stopBefore(a: { elapsedMs: number; budgetMs: number; estimateMs: number | undefined; ranFresh: number }): boolean
export function isCowork(env?: Record<string, string | undefined>, cwd?: string): boolean
export const COWORK_BUDGET_S: number
export const COWORK_TEST_TIMEOUT_MS: number
export function testTimeoutFor(env?: Record<string, string | undefined>, cwd?: string): number | undefined
export const VITEST_WORKERS: number
export function vitestWorkersFor(cpus?: number): number
export function budgetFrom(argv: string[], env?: Record<string, string | undefined>, cwd?: string): number
export function parseShard(arg: unknown): { k: number; n: number } | null
export function normalizeShards(raw: unknown, tree: string): ShardRecord
export function recordShard(raw: unknown, tree: string, k: number, n: number, ok: boolean): ShardRecord
export function shardStatus(raw: unknown, tree: string, defaultN: number): ShardStatus
export function testFilesIn(porcelain: string): string[]
export function killSwitchFiles(porcelain: string, full?: boolean): string[]
