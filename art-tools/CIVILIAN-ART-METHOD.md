# Making civilian units — the differentiation method

Draft, 2026-08-21. **Untested — the art run was blocked on fal credit.** The method below
is reasoned from `content/gen/art-conventions.json` and the existing art tree, not yet
proven by generation. Run `gen-civilian-art.py`, look at the three farmers, then promote
this to a skill.

---

## The problem this exists to solve

Civilians are player units like any hero, and the roster wants **many of the same kind** —
a bunch of farmers, several refugees, a row of militia. They must be:

- **distinct from each other** — three farmers must be three people, not one farmer redrawn
- **obviously the same archetype** — all three must still read instantly as *farmer*

Those two pull against each other. Vary too little and you have duplicates; vary too much
and you have a peasant, a bandit and a beggar.

## Why this matters more than it looks

`art-conventions.json` records that reading a filename suffix wrong once **minted 106
heroes that were duplications of art** — 72 in the tutorial path, 29 in the Crucible's
variants, 4 more from a subtype copied under a second name. And `audit.mjs R22` collapses
every hero's art to a **character stem** and fails when two heroes land on the same one.

So "a different farmer" is not a cosmetic choice. Each one is its own character, its own
stem, its own directory. Producing three farmers that are really one farmer is a defect the
audit is built to catch.

---

## The method: hold the archetype, vary the person

Split the prompt into two parts and treat them completely differently.

**ARCHETYPE — identical across every unit of that kind.** This is what makes them read as
farmers. Never vary it, or the set stops being a set.

> A peasant farmer of a poor medieval village. NOT a soldier, NOT noble, NOT wealthy.
> Homespun undyed wool and patched linen, hand-me-down leather, no armour, no heraldry.

**AXES — deliberately separated across the set.** Pick a value per axis per unit, and make
sure no two units share a majority of them.

| axis | why it separates | example values |
|---|---|---|
| **life-stage** | strongest silhouette cue | late teens · forties · seventies |
| **build** | reads at token size | wiry · broad and thick-shouldered · gaunt and stooped |
| **sex** | free separation, use it | — |
| **implement** | the archetype signal *and* a silhouette | hoe · pitchfork · scythe · sickle · seed bag |
| **dress** | same vocabulary, different cut | patched smock · leather apron over jerkin · long sun-bleached coat |
| **wear state** | tells a story cheaply | mud to the knee · sunburnt and dusty · frayed and bleached |
| **bearing** | the face and the stance | wary, ready to bolt · exhausted and immovable · stubborn, past caring |
| **setting** | reinforces without changing the person | dawn barley field · churned plough furrow · stubble field at dusk |

**Rule of thumb: differ on at least four axes, and always on life-stage and implement.**
Those two carry the most silhouette, which is what survives being shrunk to a hex token.

### The three drafted farmers

| | farmhand-reed | ploughman-corbin | old-reaper-mattick |
|---|---|---|---|
| life-stage | late teens | forties | seventies |
| build | wiry | broad, thick-shouldered | gaunt, stooped |
| sex | woman | man | man |
| implement | long-handled hoe | iron-tined pitchfork | notched scythe |
| dress | patched grey smock, barefoot | mud-caked leather apron, clogs | sun-bleached long coat, wrapped legs |
| bearing | wary | exhausted, immovable | stubborn, past caring |
| setting | dawn barley, mist | ploughed field, grey cloud | stubble field, dusk, crows |

Every pair differs on six of seven. None of them can collapse to the same stem.

---

## The rest of the pipeline

**Card art** obeys hell-tcg's `create-hero-art.md` cardinal rules, copied into
`.claude/skills/`: 768×1152, full body head to feet with ground visible, **body facing RIGHT**
in profile with head turned to viewer, subtle environment background, alert stance, no text.
These are generated (text-to-image), not converted, because civilians have **no generative
template** — see `3-UNITS-SETTLED.md`, which currently says *"Civilian has no generative
template at all. Unresolved; do not build."* Treat this as prototyping toward resolving that,
not as authoring final roster art.

**Hex art** derives from the finished card art via the saved **`create-battle-token`** skill —
one hop, flat grey, BiRefNet matte, stature ladder plus footprint cap. A civilian is
`human` = 1.00 on the ladder; a child civilian is `child` = 0.60.

**Placement** follows the local tree declared in `art-conventions.json`:

```
content/art/heroes/<slug>/card/l1.png          (l1..l4 = four levels of ONE character)
content/art/heroes/<slug>/hex/<slug>_256.png   (_256, _1024, _full)
```

One directory per character, no `-vN` — a rejected retry never gets copied across. Note that
`content/art/heroes/` **does not currently exist**, and 43 manifest entries already point
into it with dangling `src` paths. Creating it is part of this job.

---

## Open questions before this becomes a skill

1. **Are these roster units or prototypes?** The units doc says do not build civilians
   against the current class list until the missing generative templates are resolved.
2. **Slugs are provisional.** `farmhand-reed`, `ploughman-corbin`, `old-reaper-mattick` are
   descriptive placeholders. HoBaT's naming authority means ids are Angela's to publish.
3. **How many per archetype?** The axis table supports maybe 6–8 genuinely distinct farmers
   before values start repeating. Beyond that, add an axis rather than reusing one.
4. **Do the 9 civilian *specialties* map to archetypes?** Apothecary, Torch-Bearer, Porter,
   Militia, Trickster, Archer, Archivist, Sage, Remembrancer are mechanical roles with no
   art. Whether a farmer *is* a Porter, or whether they are separate layers, is undecided.
