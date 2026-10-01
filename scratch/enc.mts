import { ENCOUNTERS, UNITS } from '../src/content/index.js'
for (const e of Object.values(ENCOUNTERS) as any[]) if (e.id.startsWith('encounter.opening.')) {
  const fs = [...e.setup, ...(e.schedule ?? []).flatMap((s: any) => s.spawn ?? [])]
  console.log(e.id, '|', e.name, '|', e.mapId ?? e.map, '|', Object.keys(e).join(','), '|', fs.map((f: any) => (f.civilian ? 'civ:' : '') + f.unit).join(' '))
}
