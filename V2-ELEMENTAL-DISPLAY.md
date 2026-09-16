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

Full landing gate and final publication are pending this checkpoint. Human/GPU
acceptance remains separate; no denied browser route was bypassed.
