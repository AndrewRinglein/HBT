// The four currencies — Law 18, four domains, no overlap. 7-KINGDOM-SETTLED.md
// "Currencies"; KINGDOM-DESIGN.md §12; GAME-ARCHITECTURE.md §1 (the purse row).
// Rows, not code: the purse is a Record keyed by these ids, and the machine
// learns which currencies exist by reading this list.

import { omitDisabled } from './disable.js'

export type CurrencyRow = {
  readonly id: string
  readonly name: string
  /** One line, from the settled table. Domains never overlap. */
  readonly domain: string
}

const RAW_CURRENCIES: readonly CurrencyRow[] = [
  { id: 'currency.salvage', name: 'Salvage', domain: 'construction — repair · found · upgrade buildings and structures' },
  { id: 'currency.supplies', name: 'Supplies', domain: 'materiel — gear, consumables, restock' },
  { id: 'currency.faith', name: 'Faith', domain: 'people and the divine — recruits, rerolls, Chapel services, hero pools' },
  { id: 'currency.mana', name: 'Mana', domain: 'the extraordinary — class powers, enchants, origins, spells' },
]

export const CURRENCIES: readonly CurrencyRow[] = omitDisabled(RAW_CURRENCIES)
