import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Literal content-id scan. I/O errors propagate; a failed scan is never empty. */
export function filesContaining(directory, literal) {
  if (typeof literal !== 'string' || !literal.length) throw new Error('source scan requires a nonempty literal')
  const found = []
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...filesContaining(path, literal))
    else if (entry.isFile()) {
      if (readFileSync(path, 'utf8').includes(literal)) found.push(path)
    } else throw new Error(`cannot scan non-regular source entry: ${path}`)
  }
  return found
}
