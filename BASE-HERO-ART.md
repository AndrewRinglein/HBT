# Complete base-hero art bindings — 2026-09-17

Baseline viewer c11f7e1 had 6 of the 24 authored `hero.base.*` IDs mapped.
The remaining 18 now bind existing source cutouts and cards via prep-art.py.
Six prior rows, including Iron's 0.95 stature/cropped source pixels, are unchanged.

Sources: `battle-tokens/units/<suffix>_256.png` and
`crucible/art/base/<suffix>1.png` (Raven uses the existing .jpg).
Two exact existing aliases are retained: priest-scantily uses Lucius's published
cutout/card; paladin-shiney uses Osric's. Their established test/alpha mappings
identify these same bodies. Parent inspection of EVE-24-review.png is technical
provenance checking, not new user approval or human visual acceptance.

Stature is explicitly owned by root VFX/VISUAL-BATTLE-UPDATES.md section 3.3:
all Eve warrior bodies use 0.95; human default is 1.55. No new tuning rule,
pixel repair, image generation, repainting or source cropping was introduced.

## Reproduction and preservation

Run bundled Python (or compatible Pillow) with `tools/prep-art.py --only <id>`
for each newly mapped ID. The 18 exact IDs/source paths and all 48 source SHA256
values are recorded in tools/fixtures/base-hero-art.json. The first generation
added 32 derived files (16 cutouts + 16 cards) and 18 manifest rows.
All 48 source images and all 112 pre-existing generated image bytes remain
identical; every existing manifest row is unchanged.

Normal Pillow 12.3.0 reencoding was measured in memory first: Lucius/Osric PNGs
would change; both card JPEGs would remain byte-identical. Therefore a NEW
mapping sharing a filename with existing rows can bind that published file only
when every owner has the exact same source path in ARTMAP. Conflicts, unproven
owners or missing manifest references fail. This binds already-published art;
it does not claim to refresh it from current source. Token aspect is read from
the reused image, never copied from stale row metadata. `--only` on an EXISTING
row still refreshes normally; full generation still rebuilds normally. Partial
generation retains unrelated manifest membership and never deletes orphans.

## Evidence

Meaningful baseline reds: mage-fireaura has no explicit manifest row; the actual
mounted component falls back to ph-art-pending instead of its exact cutout.
The source hash check already passed. Four focused probes now cover all24
mappings/source assignments/statures, all48 source hashes, actual component
billboards/panel cards and built asset bytes, plus shared-file provenance and
refresh behavior. The art-only UI fixture directly populates presentation state;
it is explicitly TEST display data, not fabricated combat events or a claim of
24-hero battle simulation.

Two test harness errors were repaired and retained as evidence: the initial
legacy duel mount lacked its registry field identity, and the aspect assertion
used JS half-up rounding against Python's established ties-to-even contract.
The coordinator repaired the latter using published PNG dimensions and Python
round in a batch subprocess; no production rounding or existing assertion was
weakened. Focused four tests pass. Full gate commands are
`node tools/gate.mjs --fresh` and, after source commit,
`node tools/gate.mjs --land --fresh`; logs `.build/basehero-gate.log` and
`.build/basehero-land.log`.

All29 showcase inputs/events/metadata, engine, Kingdom, terrain maps and source
art remain unchanged. Kingdom roster expansion is a subsequent stage. Existing
browser security restrictions remain; no GPU/native-browser or human visual
acceptance is claimed.

Full fresh gate passed: 26 source + 66 built + 12 direct-map tests (104), all29
fold/seek checks and 29 byte-identical fresh replay histories. The candidate is
17.5 MB. Clean publication runs after the source commit and repeats these same
checks with the exact source stamp. No failed full gate or weakened assertion.
