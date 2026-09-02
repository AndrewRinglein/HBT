// The Kingdom's event vocabulary — `<noun>.<verb-past>`, what happened, not what
// was called. Transcribed from GLOSSARY.md "Events", strategic column, 2026-09-01.
//
// It is DATA, declared once, for two readers: the mutator module (every state
// change emits one of these, Law 3) and the landing gate's hardcode scan, which
// lets src/core name an event and nothing else with a dot in it — `stage.begun`
// is vocabulary, a Stage id is a row, and the scan tells them apart by this
// list. Adding a name here is a glossary change and goes in the same commit.
//
// The engine's vocabulary (`battle.begin`, `unit.enter`, `life.dead`) is a
// different language and stays one — THIN-SLICE-IMPLEMENTATION.md §4.3. The seam
// translates; nothing here is ever emitted by a battle.

export const KINGDOM_EVENTS = [
  'campaign.started', 'campaign.ended',
  'week.begun', 'week.ended',
  'stage.begun', 'stage.ended',
  'resource.spent', 'resource.gained',
  'building.built', 'building.upgraded', 'building.damaged', 'building.repaired',
  'territory.claimed', 'territory.lost',
  'hero.recruited', 'hero.rerolled', 'hero.committed', 'hero.released', 'hero.leveled', 'hero.wounded',
  'item.bought', 'item.equipped',
  'quest.sent', 'quest.resolved',
  'engagement.offered', 'engagement.declined',
  'reward.offered', 'reward.taken',
  'legacy.unlocked',
  // Added 2026-09-01 with campaign.state, and to GLOSSARY.md the same commit:
  // the cursor is the one field a load restores to (§2.2), so every move of it
  // is an event a save can be keyed to.
  'cursor.moved',
  // Added 2026-09-01 with combat.prep, and to GLOSSARY.md the same commit: the
  // War Council's draw and its pick. Tactics are lent for one battle, so they
  // are neither rewards nor unlocks and take their own two words.
  'council.offered', 'council.taken',
  // Added 2026-09-01 with battle.screen, and to GLOSSARY.md the same commit: in
  // the slice a battle is DECIDED by the panel, not fought; the word says which.
  'battle.decided',
  // Added 2026-09-01 with reckoning.apply, and to GLOSSARY.md the same commit:
  // what the one writer says as it writes. XP is its own noun (hero.leveled is
  // the level, not the points); a hero's death at this altitude has no word yet;
  // Renown is not a currency and takes no resource.* word; an Engagement is
  // resolved once, won or lost.
  'xp.gained', 'hero.died', 'renown.gained', 'engagement.resolved',
  // Added 2026-09-01 with opening.prologue, and to GLOSSARY.md the same commit:
  // the opening's draft and the civilians it rescues.
  'draft.offered', 'hero.drafted', 'hero.rescued',
  // Added 2026-09-01 with charter.renown, and to GLOSSARY.md the same commit.
  'unlock.purchased',
] as const

export type KingdomEventType = (typeof KINGDOM_EVENTS)[number]
