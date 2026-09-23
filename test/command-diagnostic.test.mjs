import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runDiagnosticCommand } from '../tools/command-diagnostic.mjs'

describe('gate command failure evidence', () => {
  // Rewritten 2026-09-22 (Law 10, written reason): this asserted two gate suite
  // runs, one of them the post-land committed-tree re-run. Andrew cut that re-run
  // and split the suite into four shard commands (DECISIONS.md, 2026-09-22). The
  // rule it guards still holds: every gate suite run keeps retained diagnostics.
  it('uses retained diagnostics in the gate shard suite and the independent audit suite', () => {
    const gate = readFileSync(new URL('../tools/gate.mjs', import.meta.url), 'utf8')
    const audit = readFileSync(new URL('../tools/audit-all.mjs', import.meta.url), 'utf8')
    expect(gate.match(/runDiagnosticCommand\(`npx vitest run --shard=/g)).toHaveLength(1)
    expect(gate).not.toMatch(/execSync\([`'"]npx vitest run --reporter=dot/)
    expect(audit.match(/runDiagnosticCommand\('npx vitest run --reporter=dot'/g)).toHaveLength(1)
    expect(gate).toContain('(r.ok ? \'\' : ` — ${r.note}`)')
    expect(audit).toContain('FAILED — ${r.note}')
  })
  it('retains exact stdout, stderr, exit, command and exception in distinct attempt files', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hbt-diagnostic-'))
    writeFileSync(join(cwd, 'failure.cjs'), 'process.stdout.write("suite output\\n"); process.stderr.write("Error: specific assertion failed\\n"); process.exit(7)')
    const command = 'node failure.cjs'
    const first = runDiagnosticCommand(command, 'full suite', { cwd })
    const second = runDiagnosticCommand(command, 'full suite', { cwd })
    expect(first.ok).toBe(false)
    expect(first.status).toBe(7)
    expect(first.out).toBe('suite output\nError: specific assertion failed\n')
    expect(first.diagnosticPath).toBeTypeOf('string')
    expect(second.diagnosticPath).not.toBe(first.diagnosticPath)
    const evidence = JSON.parse(readFileSync(first.diagnosticPath, 'utf8'))
    expect(evidence).toMatchObject({ command, label: 'full suite', status: 7, stdout: 'suite output\n', stderr: 'Error: specific assertion failed\n' })
    expect(evidence.error.message).toContain('Command failed: node failure.cjs')
    expect(evidence.error.stack).toContain('Error: specific assertion failed')
    expect(first.note).toContain('specific assertion failed')
    expect(first.note).toContain(first.diagnosticPath)
  })

  it('does not create a failure artifact on success or change its output', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hbt-diagnostic-'))
    writeFileSync(join(cwd, 'success.cjs'), 'process.stdout.write("all passed")')
    const result = runDiagnosticCommand('node success.cjs', 'full suite', { cwd })
    expect(result).toMatchObject({ ok: true, out: 'all passed' })
    expect(result.diagnosticPath).toBeUndefined()
    expect(readdirSync(cwd)).toEqual(['success.cjs'])
  })

  it('keeps the original failure and exception when diagnostic storage fails', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hbt-diagnostic-'))
    writeFileSync(join(cwd, 'runs'), 'block creation of the diagnostic directory')
    writeFileSync(join(cwd, 'failure.cjs'), 'process.stderr.write("Error: original fault\\n"); process.exit(9)')
    const result = runDiagnosticCommand('node failure.cjs', 'audit', { cwd })
    expect(result).toMatchObject({ ok: false, status: 9, out: 'Error: original fault\n' })
    expect(result.note).toContain('original fault')
    expect(result.note).toContain('diagnostic write failed')
    expect(result.error.message).toContain('Command failed')
  })
})
