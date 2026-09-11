---
name: create-enemy-art
description: Put art on an enemy in Heroes of Blight and Tragic — find or cut its battle token, register it, and prove it on the board. Use when asked for enemy art, a creature token, a hex token, replacing an enemy placeholder, or filling the bestiary art gap. Covers the free-win check, the one-hop cut pipeline, the stature ladder and footprint cap, the calibrated QC gate, and the prop check no gate can do. Not for hero art and not for card art.
---

# Create enemy art

**HoBaT's enemy art is a battle token, not a card.** A transparent cutout that stands on
a hex, in three sizes, registered so the codex and the board can find it. Card art is an
*input* to that, and it lives in another repo.

This skill descends from `.claude/skills/create-enemy-art.md`, one of nine art skills
copied from hell-tcg on 2026-08-21. **That file is hell-tcg's, not ours** — 768×1152 card
art, `assets/cards/` paths, profile facing, Eve/Shadows/Skyship campaigns. Read it for
prompt craft if you like; take no dimension and no path from it. Every number below was
read off this project's disk on 2026-09-02.

**Ids are not yours to publish.** Nothing here goes into `ART-SETTLED.md` — publishing an
id is a breaking commitment for every downstream session, and it is Angela's call. Key off
ids she has already published.

---

## 0. The enemy must exist before its art does

Art does not invent enemies. The unit needs a bestiary uuid in
`content/art/bestiary-manifest.json` (144 today, keys shaped `enemy-<slug>`) before there
is anything to register a token against. If it does not, that is a content job — the
bestiary session's, through `6-BESTIARY-SETTLED.md` — and this skill stops.

```
cd content && python3 -c "import json;print('enemy-<slug>' in json.load(open('art/bestiary-manifest.json')))"
```

---

## 1. Check for a free win first — most enemies do not need generating

Three states, and only the third costs money. Run this before anything else:

```
cd content && python3 -c "
import json, os
bm = json.load(open('art/bestiary-manifest.json'))
hm = json.load(open('art-tools/bestiary-hex-map.json'))
slugs = {f.rsplit('_',1)[0] for f in os.listdir('../battle-tokens/units')}
for u in bm:
    s = u.replace('enemy-','')
    print(u, 'REGISTERED' if u in hm else ('CUT-NOT-REGISTERED' if s in slugs else 'NEEDS-CUTTING'))
"
```

| State | What it costs | Go to |
|---|---|---|
| **REGISTERED** | nothing — it is done | — |
| **CUT-NOT-REGISTERED** | nothing but a map line and a builder run | §4 |
| **NEEDS-CUTTING** | ~$0.15–0.18 and ~20s at 4-way concurrency | §2 |

As of 2026-09-02: **15 registered**, **7 cut and waiting** (imp, soldier, skeleton,
skeletal-archer, cultist, zombie, vampire), **~122 to cut — every one of which has its
card art already on this disk** (see §2).

**And a fourth state the check above cannot see: no card at all.** The 144 uuids are the
hell-tcg port. `content/gen/enemies-authored.json` holds **32 authored units, 21 of which
have no art anywhere** — Eyeblight, Nightstalker, Shadow Sorcerer, Balrog, Vampire Lord,
Iron Colossus and the rest. Those need §1a first. `HEX-TOKEN-HANDOFF.md` says nine free wins and lists bone-colossus among them; its
token exists but there is **no `enemy-bone-colossus` uuid in the bestiary manifest**, so
it is eight, not nine. It cannot be registered until the content side names it.

---

## 1a. No card at all — paint one first

An authored unit with no painting anywhere needs a card before it can have a token. Find
them:

```
cd content && python3 -c "
import json, os
d = json.load(open('gen/enemies-authored.json'))
cards = set()
for c in ('eve','shadows','skyship','hobat'):
    p = '../assets/bestiary/'+c
    if os.path.isdir(p): cards |= {f[:-4] for f in os.listdir(p)}
for u in d['units']:
    if u['id'].replace('unit.','') not in cards: print(u['id'], '-', u['name'])
"
```

### Design the card from the stat block, not from the name

This is the whole difference between art that fits the game and art that merely looks
like the genre. Read the unit's row and let the numbers dictate the picture. Eyeblight,
2026-09-02, is the worked example:

| The row says | So the picture shows |
|---|---|
| `attack.eyeblight.gaze`, range 9, `damage.stat: none`, type `true` | the eye **is** the weapon — it dominates the head, and nothing else about it looks dangerous |
| `strength: 2` and a melee Claw | arms too thin to be strong, ending in long hooked claws |
| onDeath "The Dark Rushes In", darkness radius 10 | darkness already leaking out of it, pooling at its feet |
| `types: ["Horror"]`, family `night` | a ruined moor at night, not a dungeon |

If the row does not tell you what it looks like, that is a design question for Angela, not
a gap to fill with invention.

### Generate with the SAME model the token hop uses

```
cd battle-tokens/pipeline
python3 cardlib.py card --slot <slug> --num 3 --prompt "<creature description>"
```

`cardlib.py` is tokenlib's sibling: same key file, same plumbing, `fal-ai/nano-banana-pro`
text-to-image at `aspect_ratio: "2:3"`, with the style, framing and negative clauses baked
in so they cannot be forgotten.

**Nano-banana-pro, not flux-pro, and the reason is mechanical.** The token master hop is
`nano-banana-pro/edit`, and `generate-enemy-pose-variants.md` records that NBP cannot
faithfully re-pose art made by a more photoreal model — Stone Golem and Possessed Troll
both had to be regenerated from scratch for exactly this. A card painted by NBP is native
to the hop that comes next. Eyeblight's master carried the creature over perfectly on the
first attempt, both variants.

### Picking among the three

In order: **no card frame** · clear margin on all four sides · narrowest stance ·
readable at thumbnail size.

**NBP adds a card frame roughly one time in three even though the negative prompt forbids
it.** Measured over a 60-image run on 2026-09-02: **16 framed, 27%.** One `fast-zombie`
came back as a complete Magic-style card — title bar reading "Fast Zombie", a type line
reading "Creature — Zybit", and a 1/1 in the corner. Printed text, from a prompt that
forbids text twice. Do not fight it with more negative words; generate three and discard.

**A unit's NAME will drag the model out of the setting.** `dark-sniper` came back holding
a rifle — the model read "sniper" and supplied the modern weapon that word implies. There
are no firearms anywhere in HoBaT; the only two hits in the whole project are a metaphor in
`COMBAT-DESIGN.md` and a skyship pirate in the Crucible. **Read the name for anachronism
before generating**, describe the weapon concretely, and name the era and the exclusion
outright (*"strictly medieval fantasy: NO firearm, NO gun, NO rifle, NO barrel, NO trigger,
NO scope"*). Re-rolled that way it produced a clean bone crossbow 3 of 3.

And when the row does not say what a unit holds, **that is Angela's ruling, not yours** —
the crossbow was ruled by Andrew on 2026-09-02 after the gun was rejected. Ask before
painting, not after.

**Never name a man as a size reference.** Prompts saying *"looming over a man"* or
*"twice the height of a man"* make the model draw the man: all three Balrogs came back
with a tiny human silhouette in frame for scale, which is a second figure the matte would
have to deal with and the `fragmented` gate would reject. Describe size absolutely — build,
proportion, what it towers beside in the world — and add *"no person, no silhouette, no
scale reference of any kind."* Re-rolled with that clause, Balrog came back clean 3 of 3.

### Where the card goes, and how it registers

New HoBaT-original art goes in **`assets/bestiary/hobat/<slug>.png`**. It does **not** go
in `eve/`, `shadows/` or `skyship/` — those three are mirrors of hell-tcg campaigns,
copied in by `build-bestiary-art.py`, and putting original work there is a provenance lie.

Registration then works normally, because **the map entry may carry its own `src`**:

```json
"enemy-eyeblight": { "slug": "eyeblight", "scale": 0.9, "render": "solid",
                     "src": "assets/bestiary/hobat/eyeblight.png" }
```

The reasoning, worth knowing before you touch that builder again: `bestiary-manifest.json`
is generated by `build-bestiary-art.py`, which copies art **out of hell-tcg**, so a
creature painted here can never appear in it. But `build-bestiary-hex-art.py` wanted only
**one** field from that manifest — a `src` string, md5'd to name the output webp. So the
fix was to let the hex map supply it (added 2026-09-02, three lines), not to hand-edit a
generated file and not to touch the hell-tcg-facing scanner. Entries record
`srcOrigin: "manifest"` (ported) or `"hexmap"` (HoBaT-original) so the two stay tellable
apart.

**The rule that still holds: never hand-edit `bestiary-manifest.json` or
`content/art/manifest.json`.** When a generated file blocks you, look for the seam in a
HoBaT-owned builder first.

---

## 2. Cut the token — one hop, never chained

`battle-tokens/pipeline/tokenlib.py` is the pipeline and it is the authority. Do not
re-derive its prompts.

```
card art ──one edit──> master (flat grey bg) ──birefnet──> cutout ──> despeckle ──> tiers ──> gate
```

**Every output is ONE hop from the original card art. Nothing is ever chained** — chained
edits turned a character into a different person within two hops.

```
cd battle-tokens/pipeline
python3 tokenlib.py master --src <card-art-path> --slot <slug> --kind enemy [--num 3]
python3 tokenlib.py cut    --slot <slug>
python3 tokenlib.py tiers  --slot <slug>
python3 tokenlib.py gate   --slot <slug>
```

Then move `tokens/tier/<slug>_{full,1024,256}.png` into `battle-tokens/units/` and record
the source path in `battle-tokens/manifest.json`.

### Before the first call

- **A fal key is required and is not in the repo — ask for it.** `tokenlib.py` reads
  `/tmp/.falkey`, which does not exist on a fresh machine. Do not proceed without it and
  do not put it in a tracked file.
- **`scipy` is not installed** (PIL and numpy are). `despeckle` and `gate` both import it.
  `pip install scipy` first, or every cut fails at the last step.
- **The source card art is already in this project. Do not mount hell-tcg to cut a token.**
  The manifest entry's `src` field (`assets/cards/enemies/<slug>.png`) resolves against
  hell-tcg and is the provenance pointer, not the working path. The `copies` field
  (`assets/bestiary/eve/<slug>.png`) **resolves against the project root, not `content/`**,
  and it is the same painting at the same 768×1152.

  Counted 2026-09-02: **all 144 bestiary creatures have a local card copy**, none missing.
  So `--src` for every remaining cut, and the `source | generated` sheet in §3, both come
  off this disk. Ask for hell-tcg only if a specific `copies` path is genuinely absent —
  and check before asking, because so far none is.

### If there is genuinely no source card art

Then this is new art, not a cut, and the enemy's look is a design question before it is a
generation one. Say so and ask. Do not invent a creature's appearance and register it as
though it were recovered.

### Two clauses in the prompt are load-bearing — do not "improve" them

- **`PROPS`.** An earlier version said *"holding their weapon lowered."* The model invented
  swords for three fire mages and deleted the flames that were their whole identity. All
  three passed every arithmetic gate. **Never name a prop the reference might not have.**
- **`BACKGROUND`** (*"completely empty, no scenery"*) deletes a spell effect the model reads
  as part of the scene. Measured over 96 status cuts: 92 kept everything, and all 4 losses
  were effects that floated rather than being gripped. **Anything a hand grips survives;
  anything merely floating near the character is a coin flip.** For a caster whose effect
  is not held, expect the loss and say so — the positive-assertion fix is untested and is a
  new prompt kind, which is a question, not a decision.
- **`FRAMING` says "single character only."** A group unit needs its own POSE variant, or
  six figures collapse into one. Name the group, forbid dropping or merging anyone, ask for
  every figure head-to-feet at a common scale.
- **Always generate `--num 2` masters, and pick the narrower stance.** This one flag does
  two jobs. It is the insurance against a lost effect — `balrog` master 1 came back with
  its molten cracks but **no fire mane**, master 2 kept it, same prompt, same run. And it
  is what preserves stature: `doombringer` and `iron-colossus` both sit at rung `huge`
  (2.20) and kept **1.88** and **1.76** because their masters stand narrow, while `golem`
  — cut from a wide-stance master — collapsed to **1.25** from the same rung. The master
  you pick decides how tall the creature is on the board.
- **A scene element can become an attached prop.** `zombie-hound`'s card had a lantern
  hanging in the background; the master hop attached it to the dog. Harmless here, but
  check the card for loose objects before the hop.
- **Wide subjects arrive pre-clipped.** For anything winged or long-limbed, name the span
  ("BOTH WINGS FULLY SPREAD, wingtip to wingtip"), generate `--num 3`, and keep one whose
  master alpha touches no frame edge.

### Check the fal balance before a batch, because the failure is lopsided

A dry account returns `HTTP 403 {"detail":"User is locked. Reason: TOP_UP."}` on every
call. **The lock is also intermittent under load** — at 5 concurrent workers it fired on a
funded account and cleared on its own within a minute. Cap concurrency at **3** and retry
TOP_UP with backoff (25s, 45s, 65s) rather than treating the first one as terminal; across
a 100-image run on 2026-09-02 every unit landed on attempt 1 or 2. Hit mid-batch (2026-09-02, a ten-unit run) the damage is uneven and worth knowing:

- **Masters survive.** They are files in `tokens/master/` the moment they are fetched, and
  they are the expensive half. Nothing generated is lost to the lock.
- **Cuts do not.** `cut`, and therefore `tiers` and `gate`, all die. The batch stops with
  masters on disk and no tokens.

So a lock costs the matte step only — cheap, and resumable by re-running `cut/tiers/gate`
on the masters already there. **Do not re-run `master`; you will pay twice for art you
have.** Generate masters for the whole batch first, review them in one sheet, then cut.

### When the edit hop is refused

fal's checker refuses some references outright — `orphan-child` was refused twice on very
different wording, which means **the trigger is the reference image, not the phrasing**.
Two attempts is the stopping point; a third rewrite is chipping at a classifier.

**Fallback: go straight to `birefnet/v2`, zero hops.** Background removal takes no text
prompt, so nothing is classified. The cost is real and must be stated, never hidden: a
zero-hop matte keeps the card's own pose, so the unit stands on the board mid-swing while
every other unit is at rest. It only works on a card that is full body, upright, feet
visible, clear margin, near-flat backdrop. Check before reaching for it, and get it
accepted per unit.

**Log refusals in their own bucket, separate from quality failures.** Counting them in the
retry stats poisons the numbers.

---

## 3. The gate — arithmetic only, and it does not check the thing that matters

`python3 tokenlib.py gate --slot <slug>` emits JSON. The bounds:

| Check | Bound | Was, and what it wrongly rejected |
|---|---|---|
| `alpha_coverage` | 0.08 – 0.55 | was ≤0.45 — full plate with a shield, a floor-length robe |
| `largest_component_frac` | ≥ 0.995 | real exceptions exist (orbiting grimoires) — carry `qc.gate_exception` |
| `speckle_hole_frac` | ≤ 0.005 | was ≤0.002 — bowstring and stray hair on clean mattes |
| `halo_sat_delta` | ≤ 0.22 | was ≤0.15 — a saturated red demon whose edges are correctly red |
| framing | reported, never failed | `tiers` crops to bbox, so master framing never reaches the token |

**Every one of those bounds was widened only after looking at the unit it rejected.** A
first pass with guessed numbers scored 16/23 and *all seven failures were the gate being
wrong.* Widen a bound only the same way — by looking. Never tighten one to "fix" a known
legitimate exception.

### The speckle bound is calibrated for solid humanoids, and the night family breaks it

Of 20 units cut on 2026-09-02, **four failed and all four were correct art**:
`skeleton-spider` (0.0060), `nightstalker` (0.0177), `shadow-sorcerer` (0.0083) tripped
speckle; `dark-sniper` tripped `fragmented` at 0.993 with 5 components.

They share a cause. The bounds were calibrated in August against 23 solid humanoids. The
`night` family's entire visual identity is **fine darkness tendrils that weave, float free
and enclose small gaps** — and the bone spider is mostly the space between eight thin legs.
The arithmetic is measuring the design, not a bad matte.

All four recorded as `qc.gate_exception` with a written reason, per the mage-thinking
precedent. **The bound was not widened.** But four exceptions in one batch, three of them
one family, is a pattern: if `night` grows, the speckle bound wants recalibrating against
tendril art specifically. That is a question, not a fix.

### The gate can reward the weaker picture

`dark-sniper` v1 failed `fragmented` (0.993, 5 components) because darkness ribbons trailed
free of its body. v2 lost those ribbons to the `BACKGROUND` clause and **passed clean at 1
component** — the gate scored the poorer art higher, because the thing it lost was the thing
being measured. Never read a clean gate as "this one is better." Compare against the card.

*(The fix, if a wispy effect must survive: paint it growing OUT of the body — Eyeblight's
darkness comes off its eye and stayed — rather than trailing loose.)*

**`prop_check` is `"human"`, always. The gate never claims it passed.** No arithmetic and
no vision model catches a lost prop or a lost defining quality — a VLM judge scored a
bowless archer 9/10, and a ghost that lost its translucency passed everything.

> Build a `source | generated` contact sheet every run and actually look at it.
> That step is not optional. It is the only thing standing between the project and a
> fire mage holding a sword.

Record the verdict in `battle-tokens/manifest.json` as `human` (with a note) or `FAILED`.
A `FAILED` unit's token and webp are placeholders and must be described as such.

---

## 4. Register it — the map line is the whole job

`content/art-tools/bestiary-hex-map.json` is **hand-authored**; everything downstream is
generated. Add one entry keyed by bestiary uuid:

```json
"enemy-werewolf": { "slug": "werewolf", "size": "large", "render": "solid" }
```

Then:

```
cd content/art-tools && python3 build-bestiary-hex-art.py
```

It writes `content/art/bestiary-hex/<md5>.webp` (280px, alpha preserved) and regenerates
`content/art/bestiary-hex-manifest.json`. **Watch the output for `CAPPED` lines.**

**Never hand-edit `content/art/manifest.json` or `bestiary-manifest.json`** — they are
generated by `build-hero-art.py` / `build-bestiary-art.py` and your edits will be
destroyed. That is exactly why the hex work lives in sibling manifests with their own
builders.

### `size` — the stature ladder

Assign by **what the creature is**, not by how its card art happens to be cropped.
Anchored on human = 1.00.

| rung | scale | who |
|---|---|---|
| `tiny` | 0.30 | mites, wisps, familiars |
| `small` | 0.45 | wolf, hound — a four-legged animal |
| `child` | 0.60 | children, halflings |
| `lesser` | 0.75 | imp, goblin, gremlin |
| **`human`** | **1.00** | the anchor — soldiers, cultists, skeletons, ghosts |
| `large` | 1.50 | werewolf, ogre, troll |
| `huge` | 2.20 | golem, colossus |
| `colossal` | 2.50 | dragons |

### Footprint is a different quantity, and conflating them caused every sizing bug

`FOOT_CAP = 0.72` hex-widths, measured from the bottom 12% of the alpha and applied
automatically. **A one-tile creature is one whose FEET fit the tile. The silhouette may
overhang into neighbouring hexes — that is correct, not a bug.** The bone dragon caps from
2.50 to ×1.11 and its wings cover two hexes, as intended.

Do **not** cap on silhouette width. A dragon's stance is ~38% of its own width; a width cap
either clips the wings or shrinks the creature to nothing. Both were tried.

**The ladder has a hole between `lesser` (0.75) and `human` (1.00).** Nothing expresses
"human-sized, a little smaller" — the commonest note a designer gives. Eyeblight was ruled
there by Andrew on 2026-09-02 (*"human-sized, maybe a little bit smaller. It's weak"*) and
took `scale: 0.9`. If this keeps happening, the ladder wants a rung, and that is a
question, not a fix.

**An explicit `scale` in the map entry overrides the rung** — `ent.get('scale', SIZES[size])`
— for a creature that genuinely fits no category. It is an override, not a tuning knob;
prefer fixing the rung.

### A wide stance silently costs stature, and that is worth reporting

*(Third instance found 2026-09-02: `enemy-golem`, rung `huge` 2.20, capped to **1.25**.
Every large creature cut so far has been flattened by this. It is now a pattern, not an
anecdote.)*

The cap is applied to the *pose the token happens to be in*, so a crouched or lunging
creature loses height that an upright one keeps. Measured 2026-09-02:

| unit | rung | stature | final | why |
|---|---|---:|---:|---|
| `enemy-werewolf` | `large` | 1.50 | **1.21** | crouched; plants 0.77 of its own width |
| `enemy-bone-dragon` | `colossal` | 2.50 | **1.09** | wings and a wide stance |
| every `human` unit | `human` | 1.00 | 1.00 | upright, narrow footprint |

A `large` creature that reads 21% taller than a soldier is not what "looms over a man"
meant. Both numbers are the cap working correctly — the feet do fit the tile — so this is
**not a bug to fix in the builder.** It is a fork: accept it, raise `FOOT_CAP` for the unit,
or re-cut the token in a narrower stance. **Report it; do not pick.**

### `render`

`"solid"` or `"incorporeal"`. Ghosts and wraiths generate as solid cutouts **by design** —
a clean opaque matte composited at runtime opacity beats baked semi-transparency, which
fights every effect layered over it. `"incorporeal"` is the flag that tells the board to
draw it at reduced opacity. **The renderer has not implemented it yet** (open decision 1 in
`HEX-TOKEN-HANDOFF.md`); set the flag anyway and name the gap.

---

## 5. Prove it on the board

A token nobody has seen on a hex is not finished. Hand off to `visual-replay/SKILL.md`:
export a real battle containing the unit and look at it at token scale next to a human
anchor. Stature errors are invisible in a file browser and obvious on a board.

---

## The checklist

- [ ] the enemy has a bestiary uuid — or, if HoBaT-original, its map entry carries `src`
- [ ] a unit with no card got one painted from its stat block, in `assets/bestiary/hobat/`
- [ ] checked for a free win before spending anything
- [ ] one hop from the original card art — nothing chained
- [ ] gate run, and its `fails` list empty (or the exception written down and justified)
- [ ] **`source | generated` sheet built and looked at by a human eye**
- [ ] props, defining effects and translucency survived — or the loss is named
- [ ] refusals logged separately from quality failures
- [ ] three tiers in `battle-tokens/units/`, source path recorded in `manifest.json`
- [ ] map line added, builder re-run, **`CAPPED` lines read and any lost stature reported**
- [ ] seen on a board at token scale
- [ ] **no new id published to `ART-SETTLED.md`**

## When to stop and ask

- No source card art, and the creature's look is undefined → design question, Angela's.
- A refusal that survives two attempts → stop; do not chip at the classifier.
- A creature that is genuinely multi-tile → `FOOT_CAP` is per-creature then, and raising it
  is a decision, not a fix. The ladder itself stays.
- A stature rung no existing rung covers → that is a new kind, which is a question.
- The two token registries (`hell-tcg/data/hexTokens.js`, 66 entries, and the HoBaT
  manifests) have not been reconciled. Do not deepen the divergence on your own judgment.
