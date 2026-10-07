// viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the battle screen's turn-taking, ruled', point 5: every refusal says
// why in one plain line in the battle screen — never silent, never a raw code like activation-not-selectable). The engine
// refuses with a code (src/core/commands.ts, src/core/movement.ts); this table only words it. Who is named comes from the
// caller (the engine's own unit names); nothing here decides whether an order is legal (kingdom SWITCHES turnRefusalWords).
export type RefusalWho={actor?:string|null;target?:string|null;action?:string|null;/** the name of the stand a knocked-down unit is granted (the engine's own action name) */stand?:string|null}

/** One plain sentence for an engine refusal code. An unknown code still reads as a sentence, never as the code. */
export function refusalLine(code:string,who:RefusalWho={}):string{
 const a=who.actor??'This hero',t=who.target??'That unit',x=who.action??'That action'
 if(code.startsWith('illegal-swap: '))return `Swap: ${code.slice('illegal-swap: '.length)}.`
 switch(code){
  case 'unreachable-destination':return `${a} cannot reach that hex.`
  case 'actor-rooted':return `${a} is rooted and cannot move.`
  // rule.prone-only-stand-up (engine DECISIONS.md 2026-10-05, Andrew: "yes, it cannot use attacks or powers until it stands."):
  // the engine refuses a knocked-down unit everything but its stand, with this code - the words the bar's greyed rows carry
  case 'actor-prone':return `Knocked down: ${who.stand??'stand up'} first.`
  case 'movement-slot-closed':return `${a} has already moved - attack, or End Activation.`
  case 'action-slot-closed':return `${a} has already used that part of its Activation.`
  case 'action-not-ready':return `${x} is not ready.`
  case 'actor-cannot-act':return `${a} cannot act now.`
  case 'illegal-target-or-action':return `${t} is out of reach of ${x}.`
  case 'illegal-hex-or-action':return `Nothing there for ${x} to strike.`
  case 'illegal-centre-or-action':return `${x} cannot be centred there.`
  case 'charge-out-of-reach':return `${t} is too far to charge.`
  case 'target-already-in-reach':return `${t} is already in reach - attack it instead of charging.`
  case 'forced-target':return `${a} is taunted and must strike the one who taunted it.`
  case 'battle-complete':return 'The battle is over.'
  case 'stale-sequence':return 'The battle moved on - try again.'
  case 'not-acting':case 'not-awaiting-player':return 'Wait - your heroes are not taking orders yet.'
  case 'not-current-actor':return `Only ${a} may act now - End Activation first.`
  case 'not-human-controlled':return `${t} is not yours to command.`
  case 'activation-not-selectable':return `${t} cannot begin an Activation now.`
  default:return code.startsWith('malformed-')?'That order was not understood.':'That cannot be done now.'
 }
}

/** viewer.unaffordable-actions-greyed (engine DECISIONS.md 2026-10-05 'a prone unit only stands; …; what cannot be paid is greyed; …', Andrew: "If a tax can't be paid for or a power can't be paid for, it should be grayed out." ('tax' is 'attack' - dictation)): why the engine's
    limits check refuses an action its unit holds — one plain line from the engine's own numbers. The engine answers yes or
    no (action.ts actionReady) and says no sentence; which of its questions failed is read by the caller in the order the
    check asks them (Stamina, then the Turn it is ready on, then a use), and worded here (kingdom SWITCHES unpaidWords). */
export type Unpaid={kind:'stamina';needs:number;has:number}|{kind:'cooldown';turns:number}|{kind:'warm-up';turns:number}|{kind:'uses'}|{kind:'other'}
export function unpaidLine(u:Unpaid):string{
 const turns=(n:number)=>`${n} ${n===1?'Turn':'Turns'}`
 switch(u.kind){
  case 'stamina':return `Not enough Stamina: needs ${u.needs}, has ${u.has}.`
  case 'cooldown':return `On cooldown: ready in ${turns(u.turns)}.`
  case 'warm-up':return `Warming up: ready in ${turns(u.turns)}.`
  case 'uses':return 'No uses left this Battle.'
  default:return 'Not ready.'
 }
}

/** viewer.used-up-power-stays-greyed (engine DECISIONS.md 2026-10-06 '… a used-up power stays on the bar, greyed', Andrew: "One,
    yes."): the line a used-up action's greyed row says — the row's own count of uses, the engine's (a once-per-Battle power
    says so). The bar words a replay's the same way (viewer src/actionbar.js). */
export const usedUpLine=(uses:number|undefined):string=>uses===1?'Used: once per Battle.':'No uses left.'

/** viewer.turn-taking point 4: the engine's `activation-not-selectable` for a switch to another hero, worded by why — the
    one asked for is not the player's, or has acted; or the hero acting has already moved or acted and must finish (no
    partial Activations). Every fact read here is the engine's (the unit's side, moveUsed, primaryUsed, the queue it gave). */
export type SwitchRefusal={kind:'not-yours';target:string}|{kind:'acted';target:string}|{kind:'down';target:string}|{kind:'busy';actor:string;did:'moved'|'acted'|'begun'}
export function switchLine(r:SwitchRefusal):string{
 if(r.kind==='not-yours')return `${r.target} is not yours to command.`
 if(r.kind==='acted')return `${r.target} has already acted this Phase.`
 if(r.kind==='down')return `${r.target} cannot act.`
 return r.did==='begun'?`${r.actor} has begun its Activation - End Activation first.`:`${r.actor} has already ${r.did} - End Activation first.`
}
