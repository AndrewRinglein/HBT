// Equip rules that are content, not mechanism — GEAR-DESIGN.md §6.
//
// Which item classes may be paid for ONLY at prep: idols — "idols only relate to one
// battle. You shouldn't pay for it until the battle is about to happen" (Andrew,
// 2026-09-02). Bloodrunes are paid anywhere and stay. Core reads this list; it never
// names the class.

export const PREP_ONLY_CLASSES: readonly string[] = ['idol']

/**
 * During the opening — the Campaign still in its opening battles, before any Week — equipping costs nothing. Ruled
 * 2026-10-03 (Andrew, engine/DECISIONS.md 'the opening run, audited', question 4: "Should idols and bloodrunes be free
 * to equip during the opening, or be left out of the opening's rewards?" — "4 free"): the opening's purse is empty and
 * never grows, and its reward pool holds idols (Faith to equip) and bloodrunes (Mana). After the opening the rows' costs
 * are what they were. Core reads this row and the Campaign's own state (core/equip-session.ts equipCostOf); it never
 * names a class or a currency. kingdom.opening-free-equip.
 */
export const OPENING_EQUIPS_FREE = true
