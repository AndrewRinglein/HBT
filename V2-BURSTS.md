# V2 burst content migration

The burst source migration is published from a086f64. Seven formerly area-damage actions now carry explicit burst profiles: Great Cleave, Halberd Cleave, TEST Arc Sweep, Lightning Staff Storm, Rain of Arrows, Fireball and Scorch. Existing IDs, damage types, magnitudes, costs, ranges, cooldowns and warmups are retained. The shared profile also supports TEST fire/shadow packets, healing and an onBurst percentage-save/Protection defender.

Class blasts use radius 1 and any-side eligibility. Fireball and Scorch retain their explicitly authored magic damage; their names do not silently retune them to fire. Compiler checks reject legacy area fields, malformed profiles, mixed attack/power payloads, and travelling area damage without a matching explicit burst profile. Class-burst payloads must agree with the supported damage sentence. Ordinary self-origin healing/buff pulses remain ordinary radius effects.

The obsolete unit-centred gap is removed for the three class blasts. Fireball Burn consumption and burning-ground riders remain gaps. Historical universal Resist wording is retained in Fireball's source notes as superseded; current Burn ticks use Fire Resist. Four TEST attack riders formerly attached to Sweep now attach to the existing ordinary Slam, preserving their exact effects/chances. No physical-burst knockback or broader balance tuning is claimed.

Verification: 15 compiler probes pass, including pre-fix classification and mixed-profile failures. Final full content suite: 117/117 tests, zero skipped or failed. Transactional publication rendered all 21 Codex tabs with zero verification failures, loaded 106 fielded definitions through the native engine loader and completed a heroClear smoke battle. Expected audit findings remain unchanged. Engine behavior reds, geometry/lifecycle tests, historical comparisons and gated landing are recorded in engine/V2-BURSTS.md.

Generated outputs were published through npm run ship; no generated pack was edited by hand. Five preexisting stale-lock archives remain untouched. This receipt does not claim human battlefield visual acceptance or completed viewer/Kingdom burst presentation.
