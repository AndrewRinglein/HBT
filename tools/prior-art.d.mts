// Types for tools/prior-art.mjs, so a .test.ts can import it under strict tsc.
export interface Token { t: 'id' | 'str' | 'num' | 'tmpl' | 're' | 'p'; v: string; line: number }
export interface Vocab { name: string; line: number; how: string; members: string[] }
export interface FileInventory { vocab: Vocab[]; names: { name: string; line: number; kind: string }[]; calls: Record<string, number>; members: Record<string, number>; literals: Record<string, number> }
export interface Inventory { files: Record<string, FileInventory> }
export interface Funnel { concept: string; owner: string; files: string[]; calls?: string[]; members?: string[]; literalsFrom?: string }
export interface Flag { flag: 'look-alike vocabulary' | 'same name, second home' | 'funnel bypass'; file: string; line?: number; name: string; other?: string; otherLine?: number; otherName?: string; shared?: number; onlyHere?: string[]; onlyThere?: string[]; homes?: number; owner?: string; hits?: string[] }
export interface Fragment { file: string; start: number; end: number }
export interface Clone { a: Fragment; b: Fragment; lines: number; key: string }
export interface Verdict { ok: boolean; review?: boolean; note: string }
export const HERE: string
export const ROOT: string
export const OVERLAP: number
export const MIN_SHARED: number
export const JSCPD: string
export const INVENTORY: string
export function sourceFiles(root?: string): string[]
export function inScope(rel: string): boolean
export function tokenize(src: string): Token[]
export function scanSource(text: string, track?: { calls: Set<string>; members: Set<string> }): FileInventory
export function readFunnels(path?: string): Funnel[]
export function trackOf(rules: Funnel[]): { calls: Set<string>; members: Set<string> }
export function inventoryOf(texts: Record<string, string>, rules: Funnel[]): Inventory
export function readTree(root?: string): Record<string, string>
export function flagsFor(a: { before: Inventory; after: Inventory; whole: Inventory; rules: Funnel[] }): Flag[]
export function describe(f: Flag): string
export function namesPriorArt(item: { spec?: string } | null | undefined): boolean
export function verdict(item: { spec?: string }, flags: Flag[], newClones: Clone[]): Verdict
export function heldVerdict(lines: string[], named: boolean, o: { clean: string; marker: string; named: string; more: string }): Verdict
export function clonesOf(files: string[], root?: string): Clone[]
export function describeClone(c: Clone): string
export function clonesTouching(clones: Clone[], added: Record<string, [number, number][]>): Clone[]
export function changedFiles(root?: string, id?: string | null): { path: string; before: string | null; after: string | null; added: [number, number][] }[]
export function checkItem(item: { spec?: string }, root?: string): Verdict & { flags?: Flag[]; clones?: Clone[] }
export function audit(o?: { root?: string; fresh?: boolean; write?: boolean; inventoryPath?: string }): { flags: Flag[]; clones: Clone[]; newClones: Clone[]; baseline: string }
