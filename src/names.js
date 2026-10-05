/* ── A UNIT'S SHOWN NAME (viewer.unit-names-no-letters-or-numbers, 2026-10-05) — pure ─────────────────────────────────────
   Engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a letter' (Andrew: "None of the player units or enemy
   units should have numbers or letters. It's super dumb. It's okay to track them that way, but it shouldn't be Soldier A or
   Lumberjack 1 or Pyrowitch A. … It's fine for the zombies just to be zombie, zombie, zombie, zombie.").
   The engine names every unit it fields as its kind's name and ONE mark that tells it from another of its kind — a letter
   for a hero ("Forest Elf A"), a number for an enemy, a placed civilian or an arrival ("Zombie 3", "Lumberjack 1") — and
   its lines carry that name (core/setup.ts, core/encounter.ts). The engine's names, its ids and the recordings are not
   changed: the mark comes off HERE, for display, and everything a player reads takes the name through this one function —
   the fold (so the board's labels, the top cards, the panel, the pop-ups and notices), the log (log.js), and kingdom's
   screens (its play notes and its victory screen's civilians).
   One mark is taken, the engine's: a last word that is a single capital letter or a number. A kind whose own name ends in
   such a word keeps it under the mark ("Golem 7 2" is "Golem 7"); a name with no mark — a plain name, a host's short handle
   ("H0"), a hero's given name — is returned as it is. Two units of one kind are told apart by the board (hovering or
   clicking a log line marks its unit), never by a marker added here. No table, no DOM, no clock. */
const MARK = /^(.*\S) (?:[A-Z]|\d+)$/
export function shownName(name) {
  if (typeof name !== 'string') return name
  const m = MARK.exec(name)
  return m ? m[1] : name
}
