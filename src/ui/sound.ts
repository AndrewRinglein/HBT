// Sound — the slice's copy of Hell-TCG's src/shared/audioManager.js surface, as far
// as the copied screens use it: playSound(id, {volume, playbackRate, pitchVariance})
// and playMusic(id, {fadeIn}). The ids are Hell-TCG's own (tools/prep-after.py writes
// the id → file table into generated/art/index.json); the files are inlined by the
// build, so nothing is fetched. Default pitch variance 0.06, as there. Silent — never
// throwing — when the page has no audio (a headless smoke, a browser that refuses
// autoplay): a sound is never a rule.

import { ART } from './art.js'

type Row = { file: string; volume: number; pitchShift?: number; music?: boolean }
const rowOf = (id: string): Row | null => (ART?.audio?.[id] as Row | undefined) ?? null
const srcOf = (row: Row): string | null => ART?.data[row.file] ?? null

let muted = false
export const setMuted = (m: boolean): void => { muted = m }
export const isMuted = (): boolean => muted
/** Which ids the page can play — the smoke reads it; a missing id is a named gap, not a silent one. */
export const soundIds = (): string[] => Object.keys(ART?.audio ?? {}).sort()

export function playSound(id: string, o: { volume?: number; playbackRate?: number; pitchVariance?: number } = {}): void {
  const row = rowOf(id)
  if (!row) { console.warn(`sound '${id}' is not in the bundle (tools/prep-after.py)`); return }
  const src = srcOf(row)
  if (muted || !src || typeof Audio === 'undefined') return
  try {
    const a = new Audio(src)
    a.volume = Math.min(1, o.volume ?? row.volume)
    const variance = o.pitchVariance ?? 0.06
    const base = (o.playbackRate ?? 1) * (row.pitchShift ?? 1)
    a.playbackRate = base * (1 + (Math.random() * 2 - 1) * variance)
    void a.play().catch(() => { /* autoplay refused — a sound is never a rule */ })
  } catch { /* no audio here */ }
}

let music: HTMLAudioElement | null = null
export function playMusic(id: string, o: { fadeIn?: boolean } = {}): void {
  const row = rowOf(id)
  const src = row ? srcOf(row) : null
  if (!row || !src || muted || typeof Audio === 'undefined') return
  try {
    stopMusic()
    const a = new Audio(src)
    a.loop = true
    a.volume = o.fadeIn ? 0 : row.volume
    music = a
    void a.play().catch(() => {})
    if (o.fadeIn) {
      const target = row.volume, step = target / 20
      const t = setInterval(() => { if (music !== a) { clearInterval(t); return } a.volume = Math.min(target, a.volume + step); if (a.volume >= target) clearInterval(t) }, 100)
    }
  } catch { /* no audio here */ }
}
export function stopMusic(): void { if (music) { try { music.pause() } catch {} music = null } }
