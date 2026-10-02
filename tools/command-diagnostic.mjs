import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Observational only: failed commands retain their original verdict and bytes.
// A storage failure must never hide the process failure or turn it into success.
export function runDiagnosticCommand(command, label, options = {}) {
  try {
    return { ok: true, out: execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options }) }
  } catch (error) {
    const stdout = String(error.stdout ?? '')
    const stderr = String(error.stderr ?? '')
    const out = stdout + stderr
    const exception = {
      name: error.name, message: error.message, stack: error.stack,
      code: error.code ?? null, signal: error.signal ?? null,
    }
    const lines = out.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    const excerpt = lines.find(line => /(?:Error:|AssertionError|timed out|ENOBUFS)/i.test(line))
      ?? lines.find(line => /FAIL|×/.test(line)) ?? error.message
    const result = { ok: false, status: error.status, out, error: exception }
    const directory = resolve(options.diagnostics ?? options.cwd ?? process.cwd(), 'runs/diagnostics')
    const name = String(label).replace(/[^a-z0-9-]+/gi, '-').slice(0, 80)
    const diagnosticPath = resolve(directory, `${name}-${Date.now()}-${randomUUID()}.json`)
    try {
      mkdirSync(directory, { recursive: true })
      writeFileSync(diagnosticPath, JSON.stringify({
        at: new Date().toISOString(), command, label, cwd: options.cwd ?? process.cwd(),
        status: error.status ?? null, stdout, stderr, error: exception,
      }, null, 2) + '\n', { flag: 'wx' })
      return { ...result, diagnosticPath, note: `${String(excerpt).slice(0, 300)} — diagnostic: ${diagnosticPath}` }
    } catch (writeError) {
      return { ...result, note: `${String(excerpt).slice(0, 300)} — diagnostic write failed: ${writeError.message}` }
    }
  }
}
