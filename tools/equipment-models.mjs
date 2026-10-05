import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const EQUIPMENT_CATALOG = 'assets/characters/equipment-v2/catalog.json'
/** Asset ownership is the art catalog. No name guessing or combat definitions are introduced here. */
export function packEquipmentModels() {
  const catalog = JSON.parse(readFileSync(resolve(ROOT, EQUIPMENT_CATALOG), 'utf8'))
  const assets = {}, items = {}
  for (const [id, ref] of Object.entries(catalog.assets)) {
    if (ref.assetId !== id || !ref.path.startsWith('assets/characters/') || !/^[0-9a-f]{64}$/.test(ref.sha256)) throw new Error(`Invalid equipment record: ${id}`)
    const bytes = readFileSync(resolve(ROOT, ref.path))
    if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new Error(`Equipment bytes differ from ${EQUIPMENT_CATALOG}: ${id}`)
    assets[id] = { assetId: id, path: ref.path, sha256: ref.sha256, family: ref.family, lengthM: ref.lengthM }
  }
  for (const [item, ref] of Object.entries(catalog.items)) {
    const asset = assets[ref.assetId]
    if (!asset) throw new Error(`${item}: unknown equipment asset ${ref.assetId}`)
    items[item] = { ...asset, ...(ref.pair ? { pair: true } : {}) }
  }
  return { assets, items }
}
