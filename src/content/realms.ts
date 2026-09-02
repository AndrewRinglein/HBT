// The realms — one Campaign map each (GLOSSARY.md: "anything that belongs to
// one campaign map carries the realm in its id"). The Load Game screen
// (research/mocks/Load Game.html, Andrew 2026-09-01; ruled the load game screen
// 2026-09-02) shows three campaigns in sequence, each unlocked by finishing
// the one before, with three party slots each. Only the first is built; the
// other two are names on locked cards, and their ids are provisional until
// their maps exist.

import { omitDisabled } from './disable.js'
import { REALM } from './territories.js'

export type RealmRow = {
  readonly id: string
  /** The campaign's title on the card. */
  readonly name: string
  readonly campaign: 'I' | 'II' | 'III'
  /** The realm that must be completed first, or null. */
  readonly after: string | null
  /** Whether a Campaign can be started here. */
  readonly playable: boolean
  /** The card's banner in generated/art (tools/prep-mock.py). */
  readonly banner: string
  readonly locked: string
}

const RAW_REALMS: readonly RealmRow[] = [
  { id: REALM, name: 'Eve of Ruin', campaign: 'I', after: null, playable: true, banner: 'eve-of-ruin', locked: '' },
  { id: 'realm.shadows-in-the-sand', name: 'Shadows in the Sand', campaign: 'II', after: REALM, playable: false, banner: 'shadows-in-the-sand', locked: 'Complete Eve of Ruin to unlock Shadows in the Sand.' },
  { id: 'realm.skyship', name: 'Skyship', campaign: 'III', after: 'realm.shadows-in-the-sand', playable: false, banner: 'skyship', locked: 'Complete Shadows in the Sand to unlock Skyship — an aerial campaign with unique mechanics.' },
]

export const REALMS: readonly RealmRow[] = omitDisabled(RAW_REALMS)

/** Three party slots per campaign — the mock's count; one autosave per Campaign, one Campaign per slot. */
export const SLOTS_PER_REALM = 3
