// The gate must search literal ids without an OS grep dependency or regex wildcards.
import { it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { filesMentioningId } from '../tools/source-mentions.mjs'

it('gate lookup handles paths with spaces and dotted ids literally, reading current files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kingdom gate lookup '))
  try {
    const wanted = join(dir, 'field row.ts'), other = join(dir, 'other.ts')
    writeFileSync(wanted, "export const row = { id: 'stage.field' }")
    writeFileSync(other, "export const row = { id: 'stageXfield' }")
    expect(filesMentioningId([other, wanted], 'stage.field')).toEqual([wanted])
    expect(filesMentioningId([other, wanted], 'stage.city')).toEqual([])
    writeFileSync(wanted, "export const row = { id: 'stage.city' }")
    expect(filesMentioningId([other, wanted], 'stage.field')).toEqual([])
    expect(filesMentioningId([other, wanted], 'stage.city')).toEqual([wanted])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
