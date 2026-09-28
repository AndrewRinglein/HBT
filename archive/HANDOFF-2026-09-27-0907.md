# engine — handoff 2026-09-27 09:07

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next capability.charge, 199 of 230 landed · 23 await review · 4 pending
Now: fix.enemy-accuracy-mod — the enemy pack. Landed f5e9cf8 (content 35bfbfa), flagged for review: the regular enemy-attack lane of content/mkenginepack.mjs now carries a bestiary row's accuracyMod onto the attack's accuracy (station.accuracy-field), as the move lane already did — all seven rows carried (Necro Bolt, Bone Dragon Wings, Lieutenant Demon melee, Balrog Hurl, Mesmerize, Soul Rend, Crush), no new gaps; a sameAs reference with fields of its own is now a named gap (SWITCHES.md accuracyModSameAsOverride). Test test/enemy-accuracy-mod.test.ts reads every number from the Codex row and checks preview's SITUATIONAL accuracy row; red on the old pack, kill switch fails without Necro Bolt. Tried: the item declared a control-battle change, but the control battles field only Zombies and are byte-identical — corrected in its own backlog commit (31dd115) with Necro Bolt as the probe; the other six modded attacks are fielded by no scenario. showcase.prologue-enemies moved (the Necromancer's and Lieutenant Demon's +10), so it got a new frozen layer (test/fixtures/battle-cursor-accuracy-mod.json, tools/capture-accuracy-mod-cursor.mts); two lines of battle-cursor.test.ts hand off to it, hence the flag. Noticed: under load (average 6 on 2 CPUs) integration 'every attack a fielded unit carries' and audit 'observed hit rates converge' hit their own timeouts — identical on the old pack (400 audit battles hash-identical, 21.7 s both ways); eight shards green on tree b1c9dfa9a0 once the load dropped. audit-all still cannot fit one call; the shards stood in. Git ran through the lock-moving shim again ($HOME/bin/git). Next: capability.charge.
New chat with Heroes of Blight and Tragic — engine: capability.charge, a movement-slot action that moves and ends in an attack (Iron Colossus, Fast Zombie)
  start engine
Last landing: 2026-09-27 08:57 (fix.enemy-accuracy-mod). Previous chat ended: on a wrap, 2026-09-27 09:07
WRAP NOT COMMITTED: 2026-09-27 09:07 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: fix.enemy-accuracy-mod — the enemy pack. Landed f5e9cf8 (content 35bfbfa), flagged for review: the regular enemy-attack lane of content/mkenginepack.mjs now carries a bestiary row's accuracyMod onto the attack's accuracy (station.accuracy-field), as the move lane already did — all seven rows carried (Necro Bolt, Bone Dragon Wings, Lieutenant Demon melee, Balrog Hurl, Mesmerize, Soul Rend, Crush), no new gaps; a sameAs reference with fields of its own is now a named gap (SWITCHES.md accuracyModSameAsOverride). Test test/enemy-accuracy-mod.test.ts reads every number from the Codex row and checks preview's SITUATIONAL accuracy row; red on the old pack, kill switch fails without Necro Bolt. Tried: the item declared a control-battle change, but the control battles field only Zombies and are byte-identical — corrected in its own backlog commit (31dd115) with Necro Bolt as the probe; the other six modded attacks are fielded by no scenario. showcase.prologue-enemies moved (the Necromancer's and Lieutenant Demon's +10), so it got a new frozen layer (test/fixtures/battle-cursor-accuracy-mod.json, tools/capture-accuracy-mod-cursor.mts); two lines of battle-cursor.test.ts hand off to it, hence the flag. Noticed: under load (average 6 on 2 CPUs) integration 'every attack a fielded unit carries' and audit 'observed hit rates converge' hit their own timeouts — identical on the old pack (400 audit battles hash-identical, 21.7 s both ways); eight shards green on tree b1c9dfa9a0 once the load dropped. audit-all still cannot fit one call; the shards stood in. Git ran through the lock-moving shim again ($HOME/bin/git). Next: capability.charge."
Yours: (2026-08-27) item.bracer's replacement rule — look: GAME-BUILDER.html; (2026-09-03) Kinds approved BY POLICY this run, for your look — look: GAME-BUILDER.html; (2026-09-03) The Necromancer's Raise has no range on its row. — look: GAME-BUILDER.html; (2026-09-03) The schedule vs the Codex on Surge — look: GAME-BUILDER.html; (2026-09-03) The schedule stows spare weapons in item slots — look: GAME-BUILDER.html; (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html; (2026-09-03) 50 flagged landings await your review — look: GAME-BUILDER.html
Queue: capability.charge [engine · rule], then capability.move-ignores-zoc [engine · rule], then capability.stealth [engine · flag]
Delegate: capability.charge [engine · rule] — not yet gated; capability.move-ignores-zoc [engine · rule] — not yet gated; capability.stealth [engine · flag] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap:
  aiSightLegality · 2026-09-27 · Does a hidden unit stop being a legal target for everyone, or only drop out of the AI's view?
  aiSightAllies · 2026-09-27 · Does a unit's own side see it?
  aiSightScoring · 2026-09-27 · A burst or area power would strike a hidden foe. Is that counted?
  aiSightTauntHidden · 2026-09-27 · A unit is taunted by a foe that is hidden from it.
  aiSightTraps · 2026-09-27 · "Invisible traps are likewise unseen."
  aiSightDarkness · 2026-09-27 · Does darkness now hide a unit from the AI too?
  accuracyModSameAsOverride · 2026-09-27 · A unit's attack is a sameAs reference that carries fields of its own (an accuracyMod, say). Merge them over the source row, or not?
Stack for capability.charge:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (eac014c)

- 16f38eb 2026-09-27 08:57 fix.enemy-accuracy-mod: Found by pack.enemy-actions 2026-09-26: content/mkenginepack.mjs drops a
- 98fdc4d 2026-09-27 08:22 backlog: fix.enemy-accuracy-mod names its probe (Necro Bolt - fielded and fired by showcase.prologue-enemies; the other six modded attacks are fielded by no scenario) and declares no baseline change - the control battles field none of the seven units (Zombie x3 + Burning Zombie, src/content/index.ts:296); tools/baseline.mts is byte-identical with the fix applied
- ae4bbed 2026-09-27 08:14 ruling 2026-09-27: stealth gets a Codex row (status.stealth, copied from CODEX.md 475) and its own item — capability.stealth queued (targeting rule, breaks on an attack or a power, reveal effects), needs ai.sight
- b2e60fa 2026-09-27 08:06 wrap: ai.sight — the AI framework. Landed f5fb77f (content b04dad6): a status row may set hidesFromFoes; hiddenFrom (src/core/status.ts) takes such a unit out of every opposing AI's view — livingEnemi

## Next chat

New chat with Heroes of Blight and Tragic — engine: capability.charge, a movement-slot action that moves and ends in an attack (Iron Colossus, Fast Zombie)
```
start engine
```
