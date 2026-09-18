# V2 Block content plumbing — 2026-09-18

This is the flat-file prerequisite for engine `rule.block`, implementing COMBAT-V2-DESIGN section6. It does not migrate shield values, class powers or equipment balance.

Optional integer `block` and `rangedBlock` now transport through unit, item, badge, specialty and level compiler stat maps. Existing published units/gear retain their numbers. Stun's authored sentence now says it prevents blocking and compiles to `blocksAction:true, blocksBlock:true`. The activation-only TEST Daze remains unchanged; TEST Guard Open demonstrates defense suppression without losing activation.

Two Oathblade-derived TEST bodies carry distinct 75/25 and 30/90 defensive stats, with onBlock stripping versus Protection hooks. These are mechanism probes, not new campaign units or balance recommendations. No art changes.

Evidence: three initial compiler reds (unknown stats and absent Stun flag), then three green. Full content suite passed120 before adding three malformed-value checks; those final checks and normal transactional publication are pending. The isolated compiler harness preserves live pack bytes on every candidate failure. Five pre-existing untracked lock archives remain untouched.

Parent review found and focused reds proved two seams: audit rejected onBlock,
and lowercase badge prose dropped Ranged Block. The audit vocabulary now accepts
onBlock; its old bestiary cohort coverage remains explicitly legacy-scoped.
No unsupported claim is made that the legacy cohort covers the new TEST lane.
Badge prose maps both human-readable words and structured field names.
Full123 tests passed before these two focused regressions were added.

Final source checks:125/125 content tests pass (85.4s);8/8 focused Block probes. Normal transactional publication is the next check.
