# The duplication review's pinned tree — the files its prior-art expect names

Verbatim `git show <sha>:<path>` copies (a `.txt` suffix, so neither tsc nor the inventory reads
them as source) of the files at the commits the review ran on (engine/REVIEW-DUPLICATION-2026-09-28.md;
the page "Duplication Review 2026-09-28"): engine 5747e86, kingdom aa5eb36, viewer b9f5d41.
`test/prior-art.test.ts` inventories them with no baseline and asserts the flags the backlog item
`tool.prior-art-audit` expects: LAYER_STATUS vs LAYER_IDS, OUTCOMES vs Outcome, the hook copies,
levelTableOf, loadoutOf, fnv1a, and movement.ts calling appliesOnEnterOf (finding E1).
The whole pinned tree (all four packages) is run by hand with
`node tools/prior-art.mjs --root <an export of the four> --fresh`.
