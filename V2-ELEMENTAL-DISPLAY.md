# Elemental and Protection host adoption — 2026-09-16

The sandbox adopts engine 6bb36dc and the shared passive viewer. It forwards the
published absorbing-status IDs so current shield counters remain visible, and
shows both resolved self-damage and actual self HP loss from engine previews.
The Kingdom outcome picker is unchanged.

Meaningful built-page reds: current pool metadata was an empty list; then an
actual Eldritch Might preview showed only Damage 0 / Healing 0 / Hit chance 100,
with self-damage missing. Both now pass in the built DOM smoke. ISC-069 additionally
checks exact preview/event parity and emitted pool spending through the command
host. Its ten tests and typecheck pass before landing. The existing full built
smoke still covers configuration, selection, commands, playback barriers, stale
input, reset/disposal, fault locks, saves/tamper checks, replay drop and AI outcome.

The shared viewer removed unsupported future tick/death and base-defense aim
predictions. It retains current HP, observed statuses/shields, actual Deathbed
marks and engine-emitted hit/damage numbers. Restoring a forecast requires a
separately gated engine-owned fact; no such forecast is claimed here.

The full landing gate passed 234 tests and all 62 P-tier probes, landing at
a4ef27d with its ruling warning recorded and seal withheld. An independent
post-land slice audit again passed all 62 probes. The first gate had correctly
rejected stale generated item rows; tools/mk-items.mjs and mk-progress.mjs
regenerated the owning data before the passing gate. A narrow counterfactual
that removed the two engine preview fields made the new ISC-069 assertion fail;
the exact core source bytes were restored before the final gate.

An additional in-memory check imports fieldedDef through src/engine.ts and
compares the regenerated ITEM_ROWS to actual equipped stats: the Fire necklace
adds fireResist 1, Poison necklace adds poisonResist 1, and Hearthmother idol
adds both by 1. These are flat resistance values, not immunity.

The final pages were generated from source 8db39fb against clean engine 6bb36dc.
The built slice smoke, complete sandbox interaction smoke and all three shared
Atlas component tests passed. Human/GPU acceptance remains separate; no denied
browser route was bypassed.
