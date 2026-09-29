# engine — handoff 2026-09-28 22:43

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next encounter.opening.gates, 216 of 249 landed · 7 await review · 4 pending
Now: opening loop — 12 landed this chat: content.mage-staff (clean; Mage out-damages Ranger only from armor 3), map.opening-six (flagged), encounter.area-fall, capability.placed-remains, fix.raise-two, content.opening-units, content.flaming-longsword, encounter.opening.orphanage, encounter.opening.lumberjack, encounter.opening.cavern-trail, fix.raise-two-cursor (flagged), fix.opening-maps-off-panel (flagged). Tried: encounter.opening.bridge (abandoned: never wins with four Alpha heroes, capped 8/wipe 2 of 10, an AI stall); encounter.opening.gates authored and reverted, still pending (wipes four Alpha heroes 10 of 10). Noticed: an early clear wins the Orphanage on Turn 3 before its Turn 4-5 Zombies; both Lumberjack civilians die in every replicate; audit-all cannot fit a Cowork call, the full suite ran as 16 shards instead; kingdom sandbox tests refuse a stale shared-viewer metadata commit; git lock shim at $HOME/bin/git. Next: Andrew's answers on the Bridge and the Gates, then encounter.opening.cathedral and kingdom.encounter-battles.
New chat with Heroes of Blight and Tragic — engine: the Cathedral and the kingdom's encounter battles
  start engine
Last landing: 2026-09-28 22:32 (fix.opening-maps-off-panel). Previous chat ended: on a wrap, 2026-09-28 22:43
WRAP NOT COMMITTED: 2026-09-28 22:43 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: opening loop — 12 landed this chat: content.mage-staff (clean; Mage out-damages Ranger only from armor 3), map.opening-six (flagged), encounter.area-fall, capability.placed-remains, fix.raise-two, content.opening-units, content.flaming-longsword, encounter.opening.orphanage, encounter.opening.lumberjack, encounter.opening.cavern-trail, fix.raise-two-cursor (flagged), fix.opening-maps-off-panel (flagged). Tried: encounter.opening.bridge (abandoned: never wins with four Alpha heroes, capped 8/wipe 2 of 10, an AI stall); encounter.opening.gates authored and reverted, still pending (wipes four Alpha heroes 10 of 10). Noticed: an early clear wins the Orphanage on Turn 3 before its Turn 4-5 Zombies; both Lumberjack civilians die in every replicate; audit-all cannot fit a Cowork call, the full suite ran as 16 shards instead; kingdom sandbox tests refuse a stale shared-viewer metadata commit; git lock shim at $HOME/bin/git. Next: Andrew's answers on the Bridge and the Gates, then encounter.opening.cathedral and kingdom.encounter-battles."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data], then kingdom.encounter-battles [engine · plumbing]
Delegate: encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; kingdom.encounter-battles [engine · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs kingdom.encounter-battles, encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral
Calls since last wrap:
  aiSightLegality · 2026-09-28 · Does a hidden unit stop being a legal target for everyone, or only drop out of the AI's view?
  ignoresZocOnThePower · 2026-09-28 · Is "ignores ZoC" a property of the unit or of its movement power?
  ignoresZocRowName · 2026-09-28 · The Codex had no power row for the hounds' walk. What is it called?
  ignoresZocWalkCopiesMove · 2026-09-28 · Its stamina, cooldown and costs?
  ignoresZocPathOnly · 2026-09-28 · Can a sidestep or a flight carry ignoresZoc?
  ignoresZocLogs · 2026-09-28 · What does the log say when a walk ignores a zone?
  ignoresZocCharge · 2026-09-28 · Does a charge's walk read the property?
  stealthNoClock · 2026-09-28 · How long does stealth last?
  stealthStacking · 2026-09-28 · Stealth applied to a unit already in it?
  stealthFlags · 2026-09-28 · One flag or several?
  stealthPowerAim · 2026-09-28 · "Cannot be targeted by an attack" — may a power be aimed at a stealthed foe?
  stealthOwnSide · 2026-09-28 · May its own side still aim at it (a heal on a stealthed ally)?
  stealthReaction · 2026-09-28 · Attacks of opportunity?
  stealthBreakMoment · 2026-09-28 · When, inside an attack, does it break?
  stealthBurst · 2026-09-28 · A burst: attack or power?
  stealthMovement · 2026-09-28 · "Moving never breaks it" — what about a movement power (Blink, Shadow Dance's walk) or a power used in the movement slot?
  stealthRevealShape · 2026-09-28 · What is a reveal effect in the engine, and where is its radius?
  stealthRevealSide · 2026-09-28 · Does a reveal break its caster's own side's stealth?
  stealthBrokenLog · 2026-09-28 · What does the log say when it breaks?
  stealthMoveOntoHex · 2026-09-28 · COMBAT-DESIGN.md 265: "Attempting to move onto its hex stops the movement: 'You moved into a hidden object.'"
  surgeSpendFloorsAtZero · 2026-09-28 · A Surge that happens below 100 — take away 100 below zero, or stop at 0?
  surgeRelinkReadsLeftover · 2026-09-28 · Does a second Surge check in the same Activation check the leftover?
  surgeAutomaticNoRoll · 2026-09-28 · "Automatically … a surge activation" — is a roll still drawn at 100 or more?
  surgeAmountEvents · 2026-09-28 · How do the events show the amount before and after?
  mageStaffYardstick · 2026-09-28 · What is "out-damages" measured as?
  mageStaffArmoredRow · 2026-09-28 · Which armored row?
  openingDenseForest · 2026-09-28 · Dense forest (F) and a high obstacle (X) — one prop each, or the ground under them?
  openingCoverMaterial · 2026-09-28 · What is each low cover (c) made of?
  openingDeepWater · 2026-09-28 · Deep water (): what is it in the engine?
  openingCursedPaint · 2026-09-28 · Cursed ground (*) — the map's or the encounter's?
  openingNoEntries · 2026-09-28 · Doors and stairs on the houses and walls (H, W)?
  openingPanelDeploy · 2026-09-28 · Which edges does a ROLLED battle on these maps deploy on (the panel, the control battles, the probe)?
  areaFallIdKind · 2026-09-28 · What kind of id is a fall?
  areaFallWeight · 2026-09-28 · "Weighted to the middle" — what shape?
  areaFallCentre · 2026-09-28 · "A hex you can move to" — exactly?
  areaFallOverlap · 2026-09-28 · May areas overlap?
  areaFallOncePerUnit · 2026-09-28 · A unit inside two overlapping areas?
  areaFallStanding · 2026-09-28 · Downed units inside?
  areaFallNoEntryBeat · 2026-09-28 · Does the freshly painted ground also give its entry status at the landing (as the band does)?
  areaFallOnce · 2026-09-28 · "From Turn 4" — does it repeat?
  areaFallAi · 2026-09-28 · Does the AI step out of a marked area?
  areaFallCup · 2026-09-28 · The roll's key?
  areaFallLandingMoment · 2026-09-28 · "After the next Player Phase" — before or after that Phase's own end ladder?
  placedRemainsShape · 2026-09-28 · Where are placed remains authored?
  placedRemainsPaint · 2026-09-28 · Do the remains paint their own cursed ground?
  placedRemainsOrder · 2026-09-28 · When, and with what identity?
  placedRemainsSide · 2026-09-28 · Whose side is a placed body?
  raiseCountDefault · 2026-09-28 · A Raise row with no count?
  raiseTwoOrder · 2026-09-28 · Which two?
  wifeId · 2026-09-28 · Her id?
  wifeUndictated · 2026-09-28 · Her numbers the dictation does not give?
  soldierAttackDamage · 2026-09-28 · The bestiary's Soldier attacks say damage null (Attack, Heavy Strike) or melee (Heavy Blow) with a modifier. What do they deal?
  flamingIds · 2026-09-28 · The ids? The Ledger names the series, not ids.
  flamingSecondBase · 2026-09-28 · "Flaming Axe" — which axe?
  flamingBasicAttack · 2026-09-28 · Which attack is the basic attack?
  flamingFireDamage · 2026-09-28 · The 2 fire damage — how is it dealt?
  openingHeroZones · 2026-09-28 · Where do the heroes start? (Not stated for any of the six.)
  openingEndOfEnemyPhase · 2026-09-28 · An arrival "at the end of Turn N's Enemy Phase" (Lumberjack House, the first Skeletal Archer)?
  openingHeroZonesLumberjack · 2026-09-28 · The Lumberjack House heroes?
  openingHeroZonesCavern · 2026-09-28 · The Cavern Trail heroes?
  openingFallIds · 2026-09-28 · The real falls' ids?
  openingCiviliansNoAi · 2026-09-28 · The civilians' AI?
  mapPanelFalse · 2026-09-28 · How does a map stay registered but off the fixed control panel?
Stack for encounter.opening.gates:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (3a31a0d)

- ca25f34 2026-09-28 22:31 fix.opening-maps-off-panel: map.opening-six (landed 2026-09-28, ee50f50) put the opening's six maps
- f2df8aa 2026-09-28 21:56 fix.raise-two-cursor: fix.raise-two (landed 2026-09-28, 253e7c3) moved two battle-cursor cases
- ab14c58 2026-09-28 21:37 encounter.opening.cavern-trail: Battle 4, Cavern Trail - the Hunt (DECISIONS.md 2026-09-28 'battle 4 (Ca
- 222cc18 2026-09-28 21:32 abandon encounter.opening.bridge: ledger and gauntlet log (never wins with four Alpha heroes - replicates 0-9 capped 8, wipe 2; an AI stall from Turn 12)
- 83ae57a 2026-09-28 21:31 encounter.opening.lumberjack: Battle 2, Lumberjack House (DECISIONS.md 2026-09-28 'battle 2's final sc
- dbcb1cf 2026-09-28 21:27 encounter.opening.orphanage: Battle 1, Orphanage (DECISIONS.md 2026-09-28 'Battle 1 (Orphanage) redef
- 156e832 2026-09-28 21:18 content.flaming-longsword: The battle-2 reward, the standard tier-3 Flaming Longsword (DECISIONS.md
- e614e01 2026-09-28 21:09 content.opening-units: The two opening units the pack does not have. (1) The Lumberjack's Wife
- 253e7c3 2026-09-28 19:12 fix.raise-two: The Necromancer raises two bodies per turn (DECISIONS.md 2026-09-28 'the
- 5bcf806 2026-09-28 19:04 capability.placed-remains: Remains an encounter places at setup (DECISIONS.md 2026-09-28 'Gates is
- f2a5e9e 2026-09-28 18:57 encounter.area-fall: A telegraphed area fall, one mechanism for two rulings (DECISIONS.md 202
- ee50f50 2026-09-28 18:41 map.opening-six: The opening's six maps as combat maps, each at its own size (DECISIONS.m
- 5b0cfa1 2026-09-28 18:07 content.mage-staff: NOT A DEFECT — Angela: the Mage/Ranger split is intentional. The Mage de
- 5747e86 2026-09-28 17:32 wrap: planning — the opening loop cut into 15 backlog items (3599457), no code. Items: map.opening-six, encounter.area-fall, capability.placed-remains, fix.raise-two, content.opening-units, content.fl

## Next chat

New chat with Heroes of Blight and Tragic — engine: the Cathedral and the kingdom's encounter battles
```
start engine
```
