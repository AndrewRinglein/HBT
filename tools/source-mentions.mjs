import { readFileSync } from 'node:fs'

/** Literal source lookup, portable across hosts; never turns missing grep into a missing row. */
export function filesMentioningId(files, id) {
  return files.filter((file) => readFileSync(file, 'utf8').includes(id))
}
