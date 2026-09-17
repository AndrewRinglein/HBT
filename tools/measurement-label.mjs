// Read historical evidence conservatively; never rewrite its verdict or seal.
export function measurementLabel(run) {
  const seal = String(run.seal ?? '')
  if (/effect measurement errored/i.test(seal)) return 'measurement error'
  if (/effect measurement invalid/i.test(seal)) return 'measurement invalid'
  let result
  try {
    const last = String(run.effect ?? '').trim().split(/\r?\n/).at(-1)
    if (last?.startsWith('EFFECT_RESULT ')) result = JSON.parse(last.slice(14))
  } catch { /* malformed or legacy evidence is not proof of measurement */ }
  const versioned = result?.version === 1 && Array.isArray(result.unavailable)
  const unavailable = /effect measurement unavailable/i.test(seal)
  if (unavailable) {
    return versioned && result.status === 'unavailable'
      && result.unavailable.some(row => row?.reason === 'invalid-replicates')
      ? 'measurement unavailable (invalid battles)' : 'measurement unavailable'
  }
  // The gate only records a successful measured arm with this complete trailer.
  // Its error/unavailable verdict above always wins over contradictory output.
  if (versioned && result.status === 'measured' && result.unavailable.length === 0
    && run.disposition === 'landed' && typeof run.seal === 'string') return 'measured'
  return 'measurement status unverified'
}
