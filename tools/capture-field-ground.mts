// fix.ground-goldens (2026-09-24): the field CLI bytes of every registered map whose bytes the
// re-ruled ground table moved (forest → woodland, hills ranged-only). Only moved maps are
// written; the 22 frozen bytes (field-cli-d872c34.json) and field-cli-knockback.json stay.
// Refuses to overwrite (flag wx).
// node node_modules/tsx/dist/cli.mjs tools/capture-field-ground.mts --out test/fixtures/field-cli-ground.json
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh historical expectations implicitly')
const frozen: Record<string, string> = {
  ...JSON.parse(readFileSync('test/fixtures/field-cli-d872c34.json', 'utf8')),
  ...JSON.parse(readFileSync('test/fixtures/field-cli-knockback.json', 'utf8')),
}
const moved: Record<string, string> = {}
for (const [id, was] of Object.entries(frozen)) {
  const bytes = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/field-geometry.mts', id])
  const now = createHash('sha256').update(bytes).digest('hex')
  if (now !== was) moved[id] = now
}
writeFileSync(process.argv[outAt + 1]!, JSON.stringify(moved, null, 2) + '\n', { flag: 'wx' })
console.log(`Moved: ${Object.keys(moved).join(', ') || 'none'}`)
