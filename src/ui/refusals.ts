// viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the battle screen's turn-taking, ruled', point 5: every refusal says
// why in one plain line in the battle screen — never silent, never a raw code like activation-not-selectable). The engine
// refuses with a code (src/core/commands.ts, src/core/movement.ts); this table only words it. Who is named comes from the
// caller (the engine's own unit names); nothing here decides whether an order is legal (kingdom SWITCHES turnRefusalWords).
export type RefusalWho={actor?:string|null;target?:string|null;action?:string|null}

/** One plain sentence for an engine refusal code. An unknown code still reads as a sentence, never as the code. */
export function refusalLine(code:string,who:RefusalWho={}):string{
 const a=who.actor??'This hero',t=who.target??'That unit',x=who.action??'That action'
 if(code.startsWith('illegal-swap: '))return `Swap: ${code.slice('illegal-swap: '.length)}.`
 switch(code){
  case 'unreachable-destination':return `${a} cannot reach that hex.`
  case 'actor-rooted':return `${a} is rooted and cannot move.`
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
