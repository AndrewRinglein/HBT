# Kingdom switches

The mirror of `engine/SWITCHES.md`, at the strategic altitude — created
2026-09-01 with the first switch, per `THIN-SLICE-IMPLEMENTATION.md` §10.
Ambiguity gets exposed, not decided. Each row is a question a sweep or Andrew
can answer; the default is what runs today (`src/content/switches.ts`).

**Answered switches keep their code path** so the alternative stays sweepable,
but the default freezes. **A value with a stated owner is not a switch** — if a
document names it, the row cites the document and this table never sees it.

| switch | question | default | status |
|---|---|---|---|
| `wound.fromDowned` | A hero who went down and lived — what wound level do they carry out? The Deathbed (which would decide it) is OUT of the slice; `KINGDOM-DESIGN.md` §9 names the levels (Wounded · Badly Wounded · Severe) but not the mapping. | `1` — Wounded | open |
| `salvage.perConquest` | How much Salvage does a first Conquer pay? Only Conquer pays it (SKELETON-SETTLED.md:104) and never twice (:108); no document names the amount. Building trees total 123–270 (7-KINGDOM-SETTLED.md). | `30` | open — soft |

## Notes

- The XP proposal's pieces are owned, not switched: 15 − enemy phases
  (SKELETON-NOTES.md B6), 3 per kill at rank 1 (3-UNITS-SETTLED.md), +10 to
  the MVP by weighted roll (B7). Enemy rank is not on the unit rows yet, so
  every kill pays the rank-1 bounty — a gap for the content lane, not a switch.
