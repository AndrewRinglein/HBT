// Types for tools/code-stamp.mjs, so a .test.ts can import it under strict tsc.
export const ENGINE_DIR: string
export const ROOT_DIR: string
export const CODE_PATHS: string[]
export function codeStamp(dir?: string): { stamp: string; dirty: boolean }
export const PACKAGES: string[]
export const PACKAGE_CODE: Record<string, { code: string[]; not: string[] }>
export function stampOf(name: string, dir?: string): string
export function allStamps(root?: string): Record<string, string>
