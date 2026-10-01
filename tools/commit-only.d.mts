// Types for tools/commit-only.mjs.
export function changedPaths(cwd?: string): string[]
export function commitOnly(paths: string[], opts?: { message?: string; amend?: boolean; author?: { email: string; name: string } | null; cwd?: string; timeout?: number }): string[]
