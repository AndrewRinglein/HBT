# Viewer corrections — 2026-09-16

The replay page opens directly on its selected battle. The separate Battle Atlas
is linked in the heading; the embedded map inspector is no longer mounted or
bundled into the replay page. Actual battle terrain and the 26-choice library stay.

Nine enemies now use their existing exact battle-token sources: skeleton, fast
zombie, powerful/fire/poison imp, bruiser/lieutenant demon, bloodhound and zombie
hound. Skeleton and six previously mismatched panel portraits use their exact
existing bestiary paintings. The gash-zombie fixture is explicitly assigned the
cohort zombie body, matching its authored identity as that zombie plus one rider.
All 28 enemy types fielded across the 26 published battles have non-placeholder
token assignments. Unfielded content is not implied to have complete art.

Opportunity reactions now say the mover tries to keep moving; a `move.stopped`
event whose reason is `hit` says “STOPPED BY HIT” at the event's hex. No movement
path or combat rule is calculated. The replay cannot show a cancelled next step
because the log carries no attempted-next-hex event. Engine events remain intact.

## Verification and preserved work

Meaningful red probes reproduced the skeleton placeholder, missing exact enemy
mappings, wrong panel portraits, missing continuation explanation, and embedded
inspector. The focused checks now pass, including the real Priory turn-five
reaction and equal seek/step state. Full fresh gate results are recorded below.

The first full gate correctly rejected the new hit-stop cue under its historical
zero-cues assertion. That 2026-09-04 assertion protected against the incorrect
“HELD” display. It was replaced with an exact cue/cause/hex/text assertion for
actual hits; the separate NO HELD and no zone-of-control-stop checks remain.
The inspector test now enforces the user's separate-map-viewer requirement,
including a working relative Atlas link and an unchanged selected battle.

Only requested art mappings were regenerated. Source paintings, token pixels,
map layouts, engine rules and battle event logs were not edited. Re-encoding the
existing shared zombie PNG changed its compressed bytes but its RGBA pixels are
identical. Dwarf stature/source art remains unchanged: its missing lower legs
require a separate source-art correction, not renderer resizing.

Browser/GPU and human visual acceptance remain unverified. Next: a configurable
human-versus-AI battle sandbox using the same engine and passive viewer, with the
Kingdom outcome picker preserved; dwarf token completion is a separate art stage.

`node tools/gate.mjs --fresh` passed: 26 complete production replays with exact
pure/pumped and seek/step agreement, 25 Atlas/player/presentation checks, 12
direct-map checks, four metadata checks, typecheck and all 22 registered maps.
All 26 fresh engine exports retain byte-identical events. Source/page commit IDs
live in Git; publication stamps the source commit in `BATTLE-VIEWER.html`.
