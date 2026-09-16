// Only the passive viewer bundle has this boundary. A sandbox host can load
// its combat controller separately; this is not a rule for every app bundle.
const allowed = new Set(['core/types.ts', 'core/hex.ts', 'core/props.ts', 'core/geometry.ts',
  'content/terrain.ts', 'content/disable.ts', 'view/field.ts'])
// Inspect path components from esbuild data, never import a source path here.
const enginePart = p => {
  const parts = p.split('/'), at = parts.findIndex((part,i) => part === 'engine' && parts[i+1] === 'src')
  return at < 0 ? undefined : parts.slice(at+2).join('/')
}
export function assertRuntimeMetadata(metafile) {
  const emitted = new Set(Object.values(metafile.outputs).flatMap(o => Object.entries(o.inputs)
    .filter(([,v]) => v.bytesInOutput > 0).map(([p]) => p.replaceAll('\\','/'))))
  const forbidden = [...emitted].filter(p => enginePart(p) !== undefined && !allowed.has(enginePart(p)))
  if (forbidden.length) throw new Error('passive viewer emitted non-presentation engine modules: ' + forbidden.join(', '))
  return [...emitted].filter(p => enginePart(p) !== undefined)
}
