// All randomness. Hash-derived named streams — no mutable generator state anywhere.
//
// A roll's key says WHAT the roll is, never WHEN it happened (Constitution Law 4).
// That is what lets two arms of a sweep share dice: inserting a new draw cannot
// shift any other stream, because nothing is sequential.

export const STREAMS = [
  'to-hit',
  'crit',
  // The branch flip — damage arm or chart arm (station.crit 2026-08-27,
  // cup.crit-branch as dictated). Its own stream so the coin and the d10
  // cannot correlate.
  'crit-branch',
  'crit-effect',
  'deathbed',
  /** capability.surge (2026-09-03): the Surge check, keyed by unit, activation and loop index. */
  'surge',
  'schedule',
  'wave',
  'enemy-count',
  'enemy-placement',
  'hero-deployment',
  'terrain-event',
  'card',
  'trigger',
  'ai-tiebreak',
  'activation-order',
  'block', // append only: historical stream indices stay fixed
  // v2.kdb (COMBAT-V2 §15.4): does KDB fire, and which (back / down / both).
  // Keyed (target uid, per-unit ordinal, kind) — never a turn. Appended.
  'kdb-occurs',
  'kdb-type',
  // fix.opening-party (2026-09-29): the opening's stat-less draft — which three are offered and
  // which one is taken. Keyed (draft ordinal, 0 = the offer | 1 = the take) under a root seed from
  // the replicate alone, so a replicate's party grows by prefix across the six battles. Appended.
  'draft',
  // rule.afflictions-at-zero (2026-10-02): the Luck roll a Vampirism or Lycanthropy hero makes when it transforms at
  // 0 Health, in place of its Deathbed roll. Keyed (uid, the unit's Deathbed ordinal — its count of goes to 0). Appended.
  'transform',
] as const

export type Stream = (typeof STREAMS)[number]

const STREAM_ID: Record<Stream, number> = Object.fromEntries(
  STREAMS.map((s, i) => [s, i + 1]),
) as Record<Stream, number>

/**
 * FNV-1a over a list of integers. Exported (kingdom.reads-engine, review finding K12): the kingdom's
 * campaign rolls hash with this one function instead of a copy of it; its dice stay its own (its own
 * cups and keys), only the hash is shared.
 */
export function fnv1a(values: readonly number[]): number {
  let h = 0x811c9dc5
  for (const v of values) {
    // four bytes, low to high
    for (let b = 0; b < 4; b++) {
      h ^= (v >>> (b * 8)) & 0xff
      h = Math.imul(h, 0x01000193)
    }
  }
  return h >>> 0
}

/** splitmix32 finaliser — turns a hash into a well-distributed u32. */
function splitmix32(x: number): number {
  let z = (x + 0x9e3779b9) >>> 0
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0
  return (z ^ (z >>> 15)) >>> 0
}

export type Rng = {
  readonly rootSeed: number
  /** Dev/test only: every key tuple drawn this battle, for the uniqueness assert. */
  readonly seen: Map<string, number> | null
  readonly log: RollRecord[]
}

export type RollRecord = {
  stream: Stream
  keys: readonly number[]
  value: number
}

export function makeRng(rootSeed: number, opts?: { strict?: boolean }): Rng {
  return { rootSeed, seen: opts?.strict ? new Map() : null, log: [] }
}

/** Derive a battle's root seed from what the battle IS, so arms pair by construction. */
export function rootSeedOf(scenarioId: number, variantId: number, replicate: number): number {
  return fnv1a([scenarioId, variantId, replicate])
}

/** Raw u32 draw. Keys must be structural — unit ids and per-unit ordinals, never turn. */
export function draw(rng: Rng, stream: Stream, ...keys: number[]): number {
  if (rng.seen) {
    const k = `${stream}|${keys.join(',')}`
    const prior = rng.seen.get(k)
    if (prior !== undefined) {
      throw new Error(
        `RNG key collision: ${k} was drawn twice. A repeated key returns a bit-identical ` +
          `value, which silently turns a random mechanic deterministic. Add an ordinal to the key.`,
      )
    }
    rng.seen.set(k, 1)
  }
  const value = splitmix32(fnv1a([rng.rootSeed, STREAM_ID[stream], ...keys]))
  rng.log.push({ stream, keys: [...keys], value })
  return value
}

/** 1..100 inclusive. Percentages in this game are integers (Law 7). */
export function roll100(rng: Rng, stream: Stream, ...keys: number[]): number {
  return (draw(rng, stream, ...keys) % 100) + 1
}

/** 0..n-1. */
export function rollBelow(rng: Rng, n: number, stream: Stream, ...keys: number[]): number {
  return draw(rng, stream, ...keys) % n
}

/**
 * Deterministic sample of k distinct items, chosen by hashing each candidate.
 * Order-independent and stable: adding a draw elsewhere cannot perturb it.
 */
export function sample<T>(
  rng: Rng,
  items: readonly T[],
  k: number,
  stream: Stream,
  ...keys: number[]
): T[] {
  const scored = items.map((item, i) => ({
    item,
    i,
    score: splitmix32(fnv1a([rng.rootSeed, STREAM_ID[stream], ...keys, i])),
  }))
  scored.sort((a, b) => (a.score - b.score) || (a.i - b.i))
  return scored.slice(0, k).map((s) => s.item)
}
