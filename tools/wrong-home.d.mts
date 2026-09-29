// Types for tools/wrong-home.mjs, so a .test.ts can import it under strict tsc.
export interface Finding { what: string; file: string; line: number; id: string; owner: string; detail?: string }
export interface Rules { ruledEngine: { path: string; ruling: string; ids?: string[] }[]; kingdomKeys: Set<string> }
export interface Context { codex: { ids: Map<string, string>; families: Set<string> }; engine: { names: Set<string>; stats: Set<string> }; rules: Rules }
export const LIST_JSON: string
export const LIST_MD: string
export function readRules(path?: string): Rules
export function codexIndex(sources: Record<string, unknown>): { ids: Map<string, string>; families: Set<string> }
export function engineNames(vocabulary: Record<string, unknown>): { names: Set<string>; stats: Set<string> }
export function loadContext(root?: string): Context
export function scanEngineFile(path: string, text: string, ctx: Context): Finding[]
export function removalList(root?: string, ctx?: Context): Finding[]
export function newFindings(before: Finding[], after: Finding[]): Finding[]
export function describeFinding(x: Finding): string
export function namesEngineRule(item: { spec?: string } | null | undefined): boolean
export function wrongHomeVerdict(item: { spec?: string }, fresh: Finding[]): { ok: boolean; review?: boolean; note: string }
export function checkWrongHome(item: { spec?: string }, root?: string): { ok: boolean; review?: boolean; note: string; findings: Finding[] }
export function markdown(findings: Finding[]): string
