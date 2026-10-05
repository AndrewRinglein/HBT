import fs from 'fs';
import { validateMap } from './map-schema.mjs';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const HOOKS=new Set(['startOfBattle','onAttack','onMiss','onHit','onCrit','onDamage','onTakingDamage','onKill','onDeath','onEquip','onActivationEnd','onDodge','onBlock','aura','passive']);
const SLOTTED=new Set(['relic','trinket','idol']);
const F=[];
// NARROW exemptions only. A '*' here once hid power.berserker.draw-from-death for three
// rounds of sweeps. The settled trio are exempt from the THREE-STATS-ONE-ABILITY shape rule
// (AUTHORING-GUIDE.md), not from the vocabulary or the mechanics rules.
const ACCEPTED={'Marching Orders':'slotted-item-charges-slots','Bash':'power-is-just-an-attack',
  'Berserker':'specialty-too-many-stats','Shieldbearer':'specialty-too-many-stats','Leader':'specialty-too-many-stats','Sentinel':'specialty-too-many-stats'};
const add=(rule,who,detail)=>{ if(ACCEPTED[who]===rule||ACCEPTED[who]==='*') return; F.push({rule,who,detail}); };
const all=[...D.items,...D.enchants,...D.specialties,...D.attacks,...D.powers];
const txt=e=>[e.description,e.intent,...(e.triggers||[]).map(t=>t.effect||t.description||'')].filter(Boolean).join(' | ');

for(const e of all){
  const t=txt(e), M=e.statModifiers||{};
  if(/\bflank/i.test([e.name,e.description,e.intent,...(e.triggers||[]).map(g=>g.effect||'')].join(' '))) add('flanking-does-not-exist',e.name,'');
  // R7b protection stacks with itself — ruled 2026-08-20
  if(/protection/i.test(t)&&/(does not stack|doesn.t stack|not stack with itself|discards whatever)/i.test(t))
    add('protection-does-stack',e.name,t.slice(0,90));
  // R7 protection duration
  if(/protection/i.test(t)&&/(until the end|for \d+ turn|expires|for the rest of the Battle,? (it )?last)/i.test(t)) add('protection-has-duration',e.name,t.slice(0,90));
  // R5 item slots charged on something that already occupies one
  if(SLOTTED.has(e.itemClass)&&M.itemSlots<0) add('slotted-item-charges-slots',e.name,JSON.stringify(M));
  // R11 battle-start enemy radius
  for(const g of (e.triggers||[])){
    if(g.hook==='startOfBattle'&&/(every|each|all) enem/i.test(g.effect||'')) add('battlestart-enemy-radius',e.name,g.effect.slice(0,80));
    if(g.hook&&!HOOKS.has(g.hook)) add('unknown-hook',e.name,g.hook);
  }
  // R31 no zone of control — taxing movement out of a hex is a subsystem. Ruled 2026-08-20.
  // Zones of control themselves are ruled in (COMBAT-DESIGN.md "Space — zones of control",
  // 2026-08-20: adjacency provokes an attack of opportunity), and a walk that ignores them is
  // capability.move-ignores-zoc (2026-09-28), so naming one is not a finding; the leave-tax
  // wording below is. fix.publish-audit, 2026-10-01 (GBH SWITCHES audit.zocWording).
  if(/extra Movement to leave|leaving one provokes|Moves? out of a hex inside|extra Movement (?:when |on )?leaving|spends? \d+ extra Movement leaving|to leave the hex/i.test(t))
    add('zone-of-control',e.name,t.slice(0,80));
  // R33 no naming function — ruled 2026-08-20. You do not use a power and then choose
  // again inside it. The choice is the power, or it is the target.
  if(/\bname one\b|\bnominate\b|\bthe tag you named\b|\bchosen all(y|ies)\b/i.test(t))
    add('naming-function',e.name,t.slice(0,80));
  // R32 no in-power choice — activating it IS the choice
  if(/you may (take|lose|spend) \d+ [a-zA-Z ]+ to gain|choose what it costs|\bOr lose\b/i.test(t))
    add('in-power-choice',e.name,t.slice(0,80));
  // R28 no "your next <form> attack" — nothing tracks which attack is next. Use a duration.
  if(/your next (?!Turn\b)[a-z' ]*attack/i.test(t)) add('next-attack-modifier',e.name,t.slice(0,80));
  // R29 no gate on a Health threshold or an event history. Ruled 2026-08-20.
  if(/usable only|at or below half Health|above half Health|Health you are currently missing/i.test(t))
    add('state-gated-power',e.name,t.slice(0,80));
  // R30 there is no ignoring a status — Immunity N is the mechanic
  if(/ignore the next|ignore all [A-Z]|ignore \w+ (penalties|applied to you)/i.test(t))
    add('ignoring-a-status',e.name,t.slice(0,80));
  // R25 nothing counts occurrences. Ruled 2026-08-20. No "first time", no Nth hit,
  // no per-Turn or per-Battle tally of how often something has happened.
  { const spent=/\b(trap|traps|snare|briar|watch|caltrops)\b/i.test(t);
    if(!spent && /\b(the )?(first|second|third|last) (time|hit|critical|magic damage|attack|enemy)\b|until you make your first|ticks a second time/i.test(t))
      add('counts-occurrences',e.name,t.slice(0,90)); }
  // R27 no cooldown manipulation — ruled 2026-08-20
  if(/reset the cooldown|goes on its full cooldown|reduce the cooldown/i.test(t))
    add('cooldown-manipulation',e.name,t.slice(0,80));
  // R26 "Free." is the word, on powers and on trinkets alike
  if(/does not use your action/i.test(t)) add('say-Free-not-a-sentence',e.name,t.slice(0,80));
  // R24 there is no stacking-limit feature. Ruled 2026-08-20. A cap on a repeating gain
  // held across a Battle is out; a clamp computed fresh inside one resolution is fine.
  { const NUM='\\d+|one|two|three|four|five|six|seven|eight|nine|ten';
    if(new RegExp('(stacks?|stacking) (up )?to (a maximum of )?[+-]?('+NUM+')','i').test(t)
     ||new RegExp('(up to|at most|no more than|maximum of) ('+NUM+') (times|stacks)','i').test(t)
     ||/to a (maximum|max|cap|floor|ceiling) of/i.test(t))
      add('stacking-limit',e.name,t.slice(0,110)); }
  // R23 flight is a granted MOVEMENT POWER, not a standing property. Ruled 2026-08-20.
  if(e.flight===true) add('flight-as-a-property',e.name,'set flight:true — grant power.flight or power.flight-swift instead');
  for(const g of (e.triggers||[]))
    if(/\bFLIGHT\b/.test(g.effect||'')) add('flight-in-a-trigger',e.name,(g.effect||'').slice(0,80));
  // R22 Vision is not something a weapon adds — ruled 2026-08-20. Armour, relics and
  // trinkets may; a weapon or a weapon enchant may not.
  // AMENDED 2026-09-02: the Burning Torch is the one weapon that lights the ground it swings
  // at — "this torch breaks the rule of giving a modifier to a stat: it gives +3 vision just
  // for being equipped." A Waystation row (waystationBand) may carry Vision; nothing else may.
  if((e.itemClass==='weapon'||String(e.id).startsWith('enchant.')) && (e.statModifiers||{}).vision && !e.waystationBand)
    add('weapon-grants-vision',e.name,'vision '+e.statModifiers.vision);
  // R21 conditions may look at you and your six neighbours. Not at the target's
  // neighbours, and never at remembered per-target state. Ruled 2026-08-20.
  if(/\b(if|while|when|unless)\b[^.|]*(ally|allies|enem\w*)[^.|]*\badjacent to (the )?(target|it)\b|\bwhile the target is adjacent\b/i.test(t))
    add('adjacency-to-the-target',e.name,t.slice(0,90));
  if(/against that target|against (that|this) (specific )?enem|until you hit it/i.test(t))
    add('per-target-state',e.name,t.slice(0,90));
  // R20 onAttack always fires, so an onAttack that only modifies its own attack is a stat
  // line wearing a trigger's clothes. Ruled 2026-08-20. A CONDITIONAL onAttack is fine.
  for(const g of (e.triggers||[])){
    const x=g.effect||'';
    if(g.hook!=='onAttack') continue;
    const conditional=/\b(if|while|against|unless|may not)\b/i.test(x);
    // only a modifier to THIS attack is the offence. Granting yourself something that
    // outlives the attack is a real effect and the hook is doing real work.
    const modifiesThisAttack=/this attack (has|gains|deals) /i.test(x);
    if(!conditional && modifiesThisAttack)
      add('onattack-is-just-a-stat-line',e.name,x.slice(0,90));
  }
  // R19 there is no crit damage multiplier — ruled 2026-08-20. Write an onCrit that deals crits.
  if(/crit[^.|]*(x\s?\d|\u00d7\s?\d|multiplier|double the damage)|(?:x|\u00d7)\s?\d(?:\.\d)?[^.|]*crit/i.test(t))
    add('no-crit-damage-multiplier',e.name,t.slice(0,90));
  // R17 enemies have no Vision — ruled 2026-08-20. A Vision debuff aimed at one does nothing.
  if(/(enem|target|foe)[^.|]*\b(lose|loses|-\s?\d+)\s*(\d+\s*)?Vision|Vision[^.|]*\b(on|to) (the )?(enem|target)/i.test(t))
    add('enemies-have-no-vision',e.name,t.slice(0,90));
  // R18 creature tags, Armor and Resist are already visible. Revealing them is not an effect.
  if(/reveal[^.|]*(creature tag|Armor and Resist)/i.test(t)) add('reveal-of-visible-data',e.name,t.slice(0,90));
  // R12 bespoke conditions that are not tag checks
  for(const g of (e.triggers||[])){
    const s=g.effect||'';
    if(/\b(if you (did not|do not|made no|have not|ended)|if no enem|took no damage|if you moved)\b/i.test(s)) add('bespoke-condition',e.name,s.slice(0,80));
  }
}
// R10 powers that are just an attack
for(const p of D.powers){
  const d=p.description||'';
  if((Array.isArray(p.triggers)?p.triggers:[]).length) continue;   // a trigger IS the distinguishing feature
  if(/\b(melee|ranged|bow|dagger|crossbow)?\s*attack\b/i.test(d) && !p.modifies &&
     !/(all |every |each |enemies within|hexes|adjacent enem|area|cannot crit|target hex|line|arc|trap|stealth|heal|move|true damage|magic damage instead|instead of physical|(?:gains?|applies|apply) \d+ (?:Slow|Stun|Weak|Burn|Poison|Bleed|Frost)|takes? \d+ Stun)/i.test(d))
    add('power-is-just-an-attack',p.name,d.slice(0,80));
}
// R6 relics named as attributes. The word list enumerates OBJECT words and is not a closed
// design list — 2026-09-02 it gained pack/bag/satchel/kit when the Backpack was recategorised
// here by ruling. Completing the vocabulary is not weakening the rule: the rule is 'a relic is
// a named object, never an attribute', and a pack is an object.
for(const r of D.items.filter(i=>i.itemClass==='relic')){
  if(!/\b(of|'s|charm|boots|beads|orders|tome|manifest|seal|banner|cradle|case|censer|torc|compass|crown|fragment|codex|quiver|gauntlets|furs|journal|standard|lantern|eyeglass|reliquary|vow|ring|amulet|pendant|idol|mask|key|coin|shard|horn|bell|backpack|pack|bag|satchel|kit)\b/i.test(r.name))
    add('relic-not-an-object',r.name,'');
  const k=Object.keys(r.statModifiers||{});
  if(k.length!==2) add('relic-not-one-good-one-bad',r.name,JSON.stringify(r.statModifiers));
}
// R3 accuracy underpriced as the only cost
for(const e of all){ const M=e.statModifiers||{};
  const ups=Object.entries(M).filter(([k,v])=>v>0), dns=Object.entries(M).filter(([k,v])=>v<0);
  if(dns.length===1&&dns[0][0]==='accuracy'&&Math.abs(dns[0][1])<20){
    const strong=ups.some(([k,v])=>['armor','resist','fireResist','poisonResist','shadowResist','coldResist','spirit','magic','toughness','staminaRegen'].includes(k)||(k==='crit'&&v>=10));
    if(strong) add('accuracy-too-cheap-a-cost',e.name,JSON.stringify(M));
  } }
// R8 specialty shape
for(const s of D.specialties){
  const n=Object.keys(s.statModifiers||{}).length, tg=(s.triggers||[]).length;
  // V2 migration: preserve the exact old three stats and convert Poison immunity3 only.
  const migratedPoisonMaster=s.id==='specialty.poison-master'&&n===4&&s.statModifiers.crit===3&&s.statModifiers.precision===1&&s.statModifiers.resist===2&&s.statModifiers.poisonResist===3&&s.source?.includes('V2 2026-09-16, COMBAT-V2-DESIGN sections 8/18');
  if(n>3&&!migratedPoisonMaster&&!['specialty.berserker','specialty.shieldbearer','specialty.leader','specialty.sentinel'].includes(s.id)) add('specialty-too-many-stats',s.name,n+' stats');
  if(tg>1) add('specialty-too-many-abilities',s.name,tg+' abilities');
}
// R13 every tag referenced anywhere must exist in the authored vocabulary
const TAGS=new Set(D.tags.map(t=>t.id.replace(/^tag\./,'')));
const tagRefs=e=>[...(e.tags||[]),...(e.appliesToTags||[]),
  ...Object.keys(e.slayer||{}),...(e.modifies?[...(e.modifies.tags||[]),...Object.keys(e.modifies.slayer||{})]:[])];
for(const e of all) for(const t of tagRefs(e))
  if(!TAGS.has(String(t).replace(/^tag\./,''))) add('tag-does-not-exist',e.name,String(t));

// R14 no two things of a nameable kind share a display name.
// attacks are exempt: they are namespaced under their weapon and always shown beneath it,
// which is why Stab, Swing and Bolt are deliberately reused.
{ const seen={};
  for(const e of [...D.items,...D.powers,...D.specialties,...D.enchants])
    (seen[e.name]=seen[e.name]||[]).push(e.id);
  for(const [n,ids] of Object.entries(seen)) if(ids.length>1) add('duplicate-display-name',n,ids.join(' , ')); }

// R31-R35 conditional-on-the-target: the predicate must be a TAG or a STATUS, nothing else.
//   Ruled 2026-08-20. COMBAT-SEQUENCE.md #Conditional-on-the-target is the requirement.
{ const TAGS=new Set(D.tags?D.tags.map(t=>(t.id||'').replace(/^tag\./,'')):[]);
  const STATUSES=/^(burn|poison|bleed|weak|stun|frost|regeneration|protection|karma)$/i;
  // phrases that are a legitimate "against" that is not a predicate at all
  const NOTPRED=/^(everything else|each|(the )?same enemy|(a )?different enemy|two different enemies|it|that attack|anyone except you|every target except you|your party|ranged attacks|melee)\b/i;
  // a trailing duration is part of the sentence, not part of the predicate
  const DUR=/\s+(for the (rest of the )?Battle|for the rest of the Turn|until the end of your next Turn)$/i;
  // mechanics only — intent is flavour prose and says "against most things it is a joke"
  const mech=e=>[e.description,...(e.triggers||[]).map(g=>g.effect||g.description||'')].filter(Boolean).join(' | ');
  for(const e of all){ const t=mech(e);
    if(/\+\s*\d+\s+slayer\b/i.test(t)) add('bespoke-slayer-word',e.name,t.match(/.{0,50}slayer.{0,20}/i)[0]);
    if(/against (every|any|each) creature tag/i.test(t)) add('vacuous-condition',e.name,'every enemy has a creature tag');
    if(/against [^.,;]*\b(standing on|on a) [a-z]+ hex/i.test(t)) add('terrain-predicate',e.name,t.match(/against[^.,;]{0,60}/i)[0]);
    if(/against [^.,;]*\badjacent\b/i.test(t)) add('target-adjacency-predicate',e.name,t.match(/against[^.,;]{0,60}/i)[0]);
    for(const g of t.matchAll(/\bagainst ((?:a |an |the )?[a-z][a-z, ]*?)(?=[.,;|]|$| and (?:-|\+))/gi)){
      let x=g[1].trim().replace(/^(a|an|the) /,'').replace(DUR,'');
      if(!x||NOTPRED.test(x)) continue;
      if(x.split(/\s+/).length>3) continue;   // a long tail is design commentary, not a predicate
      if(/^(something|anything|nothing|someone)\b/i.test(x)) continue;  // commentary, never a mechanic
      if(/^(unarmoured|unarmored|the unwary)$/i.test(x)) continue;
      const words=x.split(/,| or | and /).map(w=>w.trim().replace(/^(a|an|the) /,'')).filter(Boolean);
      const ok=words.every(w=>{w=w.replace(/s$/,'').replace(/^(target|enemy|ally|unit) /i,'');
        return TAGS.has(w)||TAGS.has(w+'s')||STATUSES.test(w)||(/^carrying /i.test(w)&&STATUSES.test(w.slice(9).trim()))});
      if(!ok) add('predicate-is-not-a-tag-or-status',e.name,'against '+x);
    }
  }
}

// ---- R36-R47 added 2026-08-20 after the third sweep ----
{ const ST='burn|poison|bleed|weak|stun|frost|regeneration|protection|karma';
  const mech=e=>[e.description,...(e.triggers||[]).map(g=>g.effect||g.description||'')].filter(Boolean).join(' | ');
  const attackNames=new Set(D.attacks.map(a=>a.name));
  for(const e of all){ const t=mech(e), d=e.description||'';
    // R36 statuses are proper nouns. "gain 2 protection" is the same drift as "weak 1".
    { const re=new RegExp('(?:\\d+ |points? of |Immunity to |(?:gain|gains|apply|applies|remove|removes|lose|loses|carrying|carries)s? )('+ST+')(?![A-Za-z-])','g');
      const m=t.match(re); if(m) add('lowercase-status',e.name,m[0]); }
    // R37 one duration, one wording
    if(/(?<!rest of the )\bfor the Battle\b/.test(t)) add('for-the-Battle-short-form',e.name,t.match(/.{0,40}for the Battle.{0,15}/)[0]);
    // R38 the word is "ally"
    if(!String(e.id).startsWith('rule.') && /\b(hero|heroes)\b/.test(t.replace(/[^.|]*\b(so on a|on a level|rather than a civilian|to each hero|about to be hit|already past)\b[^.|]*/g,'')))
      add('hero-not-ally',e.name,(t.match(/.{0,35}\bhero(es)?\b.{0,25}/)||[''])[0]);
    // R39 a hook belongs in the triggers array, not inside the sentence
    if(/\b(onHit|onKill|onAttack|onDamage|onMiss|onDeath|onTakingDamage|onCrit|onDodge|onEquip|onActivationEnd)\s*:/.test(d))
      add('hook-written-in-prose',e.name,d.slice(0,80));
    // R40 the targets field and the sentence must agree about the radius
    //   Only a contradiction when the SENTENCE names the same target noun at a different
    //   radius. "a hex within 8 hexes ... within 3 hexes of that hex" is a two-stage shape.
    if(e.targets){ const a=(String(e.targets).match(/within (\d+) hex/)||[])[1];
      const noun=(String(e.targets).match(/(downed all(?:y|ies)|all(?:y|ies)|enem(?:y|ies)|unit|hex)/)||[])[1];
      if(a&&noun){ const stem=noun.replace(/(y|ies)$/,''); 
        const re=new RegExp(stem+'\\w* within (\\d+) hex','g');
        const bs=[...d.matchAll(re)].map(x=>x[1]).filter((_,i)=>!/(of the first|of that hex|of it)\b/.test(d.slice(d.search(re))) );
        if(bs.length&&!bs.includes(a)) add('targets-field-disagrees-with-text',e.name,'field '+a+' vs text '+bs.join('/')); } }
    // R41 setting ground alight is an amount and a duration, or it is undefined behaviour
    //   R41 GROUND LAYERS ARE PERSISTENT. Ruled 2026-08-20. Four layers — burning, frost,
    //   poisoned, darkness. No number, no clock. A hex holds one; a new one replaces it.
    //   The old version of this rule demanded an amount and a duration. It had it backwards.
    { const SET=/[^.|]*(?:becomes? (?:burning|frost|poisoned|darkness)|set [^.|]{0,45}burning|are set burning|hexe?s? gains? (?:Frost|frost))[^.|]*/i;
      const cl=(t.match(SET)||[''])[0];
      if(cl){
        if(/(burning|burns|frost|poisoned|darkness) ?\d/i.test(cl)) add('ground-layer-has-an-amount',e.name,cl.trim().slice(0,72));
        if(/(for (?:two|three|\d+) Turns?|for the rest of the Battle|until the end of)/.test(cl)) add('ground-layer-has-a-duration',e.name,cl.trim().slice(0,72));
        if(/cancell?ing|puts? out|replaces? any (?:burning|frost)/i.test(cl)) add('ground-layer-restates-the-universal-rule',e.name,cl.trim().slice(0,72)); } }
    //   R48 flat damage reduction is PROTECTION. Ruled 2026-08-20. Toughness is injury
    //   capacity and the base for Deathbed Fighting; it does not reduce damage. Everything
    //   else is mitigated by Armor (physical) or Resist (magic), by damage type.
    if(/(takes? \d+ less damage|reduce all incoming|reduces? (?:the )?damage (?:you take )?by \d)/i.test(t))
      add('flat-damage-reduction-is-protection',e.name,t.slice(0,80));
    if(/Toughness[^.|]{0,40}(reduces?|absorbs?|mitigat|less damage)|(reduces?|absorbs?) [^.|]{0,20}(damage)[^.|]{0,20}Toughness/i.test(t))
      add('toughness-does-not-reduce-damage',e.name,t.slice(0,80));
    //   R52 an attack's range is a NUMBER of hexes, or the word "melee". Nothing else.
    //   "ranged" reads like a range and is not one — it says nothing about how far.
    //   R53 standing flight comes from the `grants` field. A one-off flying MOVE inside a
    //   power uses the power.assassin.dodge-behind wording. Flight is never asserted in prose.
    if(/\byou have power\.flight|gain(s)? power\.flight|have (Flight|flight) for/i.test(t))
      add('flight-granted-in-prose',e.name,t.slice(0,80));
    //   R54 a power may not grant another power for a duration — nothing tracks that.
    if(/(until the end of your next Turn|for the rest of the Battle)[^.|]*\bpower\./i.test(t))
      add('power-granted-for-a-duration',e.name,t.slice(0,80));
    //   R51 a cost may not scale with a count. Ruled 2026-08-20. "Take 2 true damage for
    //   each ally you healed" hides the price until after you have committed to it.
    if(/(take|gain|lose)s? \d+ [A-Za-z ]{0,20}for each\b/i.test(t))
      add('cost-scaled-by-a-count',e.name,t.slice(0,80));
    //   R49 a one-Turn Movement loss is the Slow status. Ruled 2026-08-20.
    if(/loses? \d+ Movement on its next Turn|[-−]\d+ Movement until the end of its next Turn/i.test(t))
      add('movement-loss-is-Slow',e.name,t.slice(0,80));
    // R42 nothing counts units on the board
    if(/for each (enemy|ally|unit|hero)[^.|]*(on the field|in the Battle|anywhere|remaining)/i.test(t))
      add('counts-units-on-the-field',e.name,t.slice(0,80));
    // R43 conditions look at the TARGET, never at who swung at you. Ruled 2026-08-20.
    if(/if the attacker (has|is|carries)/i.test(t)) add('attacker-has-tag',e.name,t.slice(0,80));
    // R44 nothing remembers where a unit stood earlier in the Turn
    if(/(began|started) the Turn (adjacent|within|on)|where it (stood|was) at the start/i.test(t))
      add('remembers-a-position',e.name,t.slice(0,80));
    // R45 a power is a duration modifier on your attacks OR a standalone effect. Not both.
    if(/\bPassive\b[^.|]*\.\s*Active\b/i.test(d)) add('passive-and-active-in-one-power',e.name,d.slice(0,80));
    // R46 notation, not prose
    if(/\b[A-Z]{4,}\b\./.test(d.replace(/\b(AURA|BEFORE|TRUE|READS|CONSUMES|NOT|EVERY|MAGIC|PHYSICAL|UNIVERSAL|RULE)\b/g,'')))
      add('all-caps-notation',e.name,d.slice(0,70));
    // R47 an attack and a power must not share a display name — the two lists sit side by side
    if(String(e.id).startsWith('power.')&&attackNames.has(e.name)) add('attack-and-power-share-a-name',e.name,e.id);
  }
}

// R50 every specialty carries four powers. Ruled by the shape of the level tables.
//     specialty.wild-shaper is deliberately SHORT until Bear Form is restored.
for(const sp of D.specialties){ const n=(sp.powers||[]).length;
  if(n!==4 && !['Berserker','Shieldbearer','Leader','Bowmaster','Winged Assassin'].includes(sp.name))
    add('specialty-not-four-powers',sp.name,n+' powers'); }

// R52 attack range: a number of hexes, or "melee"
for(const a of D.attacks){ const r=a.range;
  if(!(r==='melee'||(typeof r==='number'&&r>0)||/^\d+$/.test(String(r))))
    add('range-is-not-a-number-or-melee',a.name,JSON.stringify(r)); }

// R55 a tag that no rule reads and no enchantment applies to is vocabulary that does nothing.
{ const body=all.map(e=>[e.description,...(e.treiggers||e.triggers||[]).map(g=>g.effect||'')].filter(Boolean).join(' ')).join(' | ');
  const enchTags=new Set(D.enchants.flatMap(e=>e.appliesToTags||[]));
  const used=new Set(all.flatMap(e=>e.tags||[]));
  for(const t of used){
    if(D.tags.findIndex(x=>x.id==='tag.'+t)<0) continue;          // handled by tag-does-not-exist
    const grp=(D.tags.find(x=>x.id==='tag.'+t)||{}).group;
    if(grp!=='form') continue;                                     // only form tags must earn their keep
    const readByRule=new RegExp('\\b'+t+' attacks?\\b','i').test(body);
    // engine capability.set-bonus (2026-10-05): a set block reads its tag — "+1 Magic for every RING you are wearing" is a
    // rule that counts the rows bearing `ring` (GEAR-DESIGN §5: a set is a tag plus a block on the item that cares).
    const readBySet=D.items.some(i=>i.setBonus&&i.setBonus.tag===t);
    if(!readByRule && !enchTags.has(t) && !readBySet) add('form-tag-nothing-reads',t,'no rule says "'+t+' attacks", no enchantment applies to it and no set counts it');
    // R56 every weapon form takes at least one enchantment, or that form's weapons are the
    // only ones in the game that cannot be upgraded — an invisible penalty nobody authored.
    // (engine capability.set-bonus, 2026-10-05: the rule is of WEAPON forms — a form no weapon and no attack bears, the
    // rings' on a trinket and an idol, is not one. Until then every form tag in use was a weapon's.)
    const weaponForm=D.items.some(i=>i.itemClass==='weapon'&&(i.tags||[]).includes(t))||D.attacks.some(a=>(a.tags||[]).includes(t));
    if(weaponForm && !enchTags.has(t)) add('weapon-form-takes-no-enchantment',t,'no enchant lists this form in appliesToTags'); } }

// R57-R60 the TEST BESTIARY must stay obviously, deletably test.
//   Ruled 2026-08-20: "clearly designated as tests so they can be thrown away later,
//   or duplicated into real." That is only true if nothing real ever points at it.
if(D.bestiaryTest){ const B=D.bestiaryTest;
  // Coverage below is the historical bestiaryTest cohort only. New TEST-lane
  // onBlock coverage is verified by test/block.test.mjs and engine rule.block.
  const LEGACY_COVERAGE_HOOKS=['onAttack','onMiss','onHit','onDamage','onCrit','onKill','onTakingDamage','onDeath','onActivationEnd'];
  // plumbing.vocabulary-export (engine, 2026-09-28): what the engine fires and applies is the
  // engine's own export (../engine/generated/vocabulary.json), never a copy here. The statuses are
  // the Codex's rows the engine loads (settled.json statuses -> the pack), not an engine word list.
  const VOCAB=JSON.parse(fs.readFileSync('../engine/generated/vocabulary.json','utf8'));
  const ENGINE_HOOKS=VOCAB.hooks;
  const ENGINE_EFFECTS=VOCAB.effectKinds;   // engine fix.one-effect-vocabulary (2026-10-01): one effect list for every carrier
  const LEGACY_COVERAGE_EFFECTS=['status.apply','status.remove','damage'];
  const ENGINE_STATUSES=new Set((JSON.parse(fs.readFileSync('settled.json','utf8')).statuses||[]).map(r=>r.id));
  const seenHooks=new Set(), seenEffects=new Set();
  for(const u of B.units){
    if(!String(u.id).startsWith('test.')) add('test-unit-id-not-marked',u.name,u.id);
    if(!/^TEST — /.test(u.name||'')) add('test-unit-name-not-marked',u.name,'name must start "TEST — "');
    if(u.test!==true) add('test-unit-missing-flag',u.name,'test:true');
    for(const t of (u.triggers||[])){
      if(!String(t.id).startsWith('test.')) add('test-trigger-id-not-marked',u.name,t.id);
      if(!ENGINE_HOOKS.includes(t.hook)) add('test-hook-the-engine-lacks',u.name,t.hook);
      if(!ENGINE_EFFECTS.includes(t.effect.kind)) add('test-effect-the-engine-lacks',u.name,t.effect.kind);
      if(t.effect.statusId && !ENGINE_STATUSES.has(t.effect.statusId))
        add('test-status-the-engine-lacks',u.name,t.effect.statusId);
      if(!Number.isInteger(t.chance)||t.chance<0||t.chance>100) add('test-chance-out-of-range',u.name,String(t.chance));
      seenHooks.add(t.hook); seenEffects.add(t.effect.kind);
    }
  }
  // the whole point of the roster is COVERAGE — a gap is a finding, not a shrug
  for(const h of LEGACY_COVERAGE_HOOKS) if(!seenHooks.has(h)) add('test-bestiary-misses-a-hook',h,'no test unit exercises it');
  for(const e of LEGACY_COVERAGE_EFFECTS) if(!seenEffects.has(e)) add('test-bestiary-misses-an-effect',e,'no test unit exercises it');
  // nothing real may depend on a throwaway
  const real=[...D.items,...D.enchants,...D.specialties,...D.attacks,...D.powers];
  for(const e of real){ const t=JSON.stringify(e);
    if(/"test\./.test(t)||/TEST — /.test(t)) add('real-content-references-test-content',e.name,e.id); }
}

// R61 BONUS MOVES: one per base class, fixed distance, never reads the Movement stat.
//     Ruled 2026-08-21. An Activation spends ONE movement choice — a movement action
//     (Move / Flight, which read the stat) or your bonus move (which never does).
//     Mage and Priest get bonus moves that move them ZERO hexes on purpose: "a much
//     harsher penalty on mages and priests who get engaged in melee".
{ const BONUS={'power.sidestep':{stamina:0,cooldown:1,hexes:1,classes:['class.paladin']},
               'power.side-roll':{stamina:1,cooldown:0,hexes:1,classes:['class.rogue','class.ranger']},
               'power.leap'    :{stamina:2,cooldown:0,hexes:2,classes:['class.warrior']},
               'power.focus'   :{stamina:0,cooldown:0,hexes:0,classes:['class.mage']},
               'power.devotion':{stamina:0,cooldown:0,hexes:0,classes:['class.priest']}};
  const NONE=['class.civilian','class.beast'];
  const seen=new Map();
  for(const [id,want] of Object.entries(BONUS)){
    const p=D.powers.find(x=>x.id===id);
    if(!p){ add('bonus-move-missing',id,'the power does not exist'); continue; }
    if(p.bonusMove!==true) add('bonus-move-missing-flag',p.name,'bonusMove:true');
    if(p.stamina!==want.stamina) add('bonus-move-wrong-stamina',p.name,'stamina '+p.stamina+', want '+want.stamina);
    if(p.cooldown!==want.cooldown) add('bonus-move-wrong-cooldown',p.name,'cooldown '+p.cooldown+', want '+want.cooldown);
    if(p.universalToAllUnits) add('bonus-move-still-on-enemies',p.name,'an enemy carries ONE movement power in its data row, by ruling');
    const d=p.description||'';
    // the whole family shares this clause — a bonus move that reads the stat is not one
    if(!/does NOT add your Movement stat/.test(d)) add('bonus-move-may-read-the-Movement-stat',p.name,'must say it does not');
    if(/up to your Movement/.test(d)) add('bonus-move-scales-with-Movement',p.name,'that is a movement action, not a bonus move');
    if(want.hexes===0){ if(!/Do not move at all/.test(d)) add('zero-hex-bonus-move-unclear',p.name,'say "Do not move at all"'); }
    else { if(!d.includes('exactly '+want.hexes+' hex')) add('bonus-move-wrong-distance',p.name,'want exactly '+want.hexes+' hex(es)');
           for(const must of ['provokes nothing','terrain cost is irrelevant'])
             if(!d.includes(must)) add('bonus-moves-have-drifted-apart',p.name,'lost: "'+must+'"'); }
    const got=p.grantedToClasses||[];
    for(const c of want.classes) if(!got.includes(c)) add('bonus-move-class-missing',p.name,c);
    for(const c of got){
      if(NONE.includes(c)) add('bonus-move-granted-to-a-class-that-gets-none',p.name,c);
      if(seen.has(c)) add('class-has-two-bonus-moves',c,seen.get(c)+' and '+p.name); else seen.set(c,p.name); }
  }
  for(const c of D.classes) if(!NONE.includes(c.id) && !seen.has(c.id))
    add('class-has-no-bonus-move',c.name,c.id+' — every class is either on the list or deliberately on the none list');
  // movement ACTIONS are the mirror: they must read the stat, and must not be tagged bonus
  for(const p of D.powers.filter(x=>x.movementAction&&!x.bonusMove))
    if(!/up to your Movement/.test(p.description||'')) add('movement-action-does-not-read-the-stat',p.name,p.id);
  // R61b GENERAL-POOL BONUS MOVES. Ruled 2026-10-03 (engine/DECISIONS.md, the three Back Flip entries):
  //     Back Flip is "a general rogue and ranger class power" — a bonus move a hero UNLOCKS at a power
  //     grant, never a class's starting bonus move. The row says so with `generalPoolOf`, and is held to
  //     the family's clauses like the five above. It may not also be granted to a class from the start.
  { const POOLED={'power.back-flip':{stamina:1,cooldown:4,hexes:1,pool:['class.rogue','class.ranger']}};
    for(const [id,want] of Object.entries(POOLED)){
      const p=D.powers.find(x=>x.id===id);
      if(!p){ add('bonus-move-missing',id,'the power does not exist'); continue; }
      if(p.bonusMove!==true) add('bonus-move-missing-flag',p.name,'bonusMove:true');
      if(p.stamina!==want.stamina) add('bonus-move-wrong-stamina',p.name,'stamina '+p.stamina+', want '+want.stamina);
      if(p.cooldown!==want.cooldown) add('bonus-move-wrong-cooldown',p.name,'cooldown '+p.cooldown+', want '+want.cooldown);
      if(p.universalToAllUnits) add('bonus-move-still-on-enemies',p.name,'an enemy carries ONE movement power in its data row, by ruling');
      const d=p.description||'';
      if(!/does NOT add your Movement stat/.test(d)) add('bonus-move-may-read-the-Movement-stat',p.name,'must say it does not');
      if(/up to your Movement/.test(d)) add('bonus-move-scales-with-Movement',p.name,'that is a movement action, not a bonus move');
      if(!d.includes('exactly '+want.hexes+' hex')) add('bonus-move-wrong-distance',p.name,'want exactly '+want.hexes+' hex(es)');
      for(const must of ['provokes nothing','terrain cost is irrelevant'])
        if(!d.includes(must)) add('bonus-moves-have-drifted-apart',p.name,'lost: "'+must+'"');
      const pool=p.generalPoolOf||[];
      if(JSON.stringify(pool)!==JSON.stringify(want.pool)) add('general-pool-move-wrong-classes',p.name,'generalPoolOf '+JSON.stringify(pool)+', want '+JSON.stringify(want.pool));
      if((p.grantedToClasses||[]).length) add('general-pool-move-granted-from-the-start',p.name,(p.grantedToClasses||[]).join(' ')+' — it is unlocked at a power grant, never a starting move');
    }
    for(const p of D.powers.filter(x=>x.generalPoolOf&&!POOLED[x.id]))
      add('general-pool-power-with-no-ruling',p.name,p.id+' — add it to POOLED with the ruling that put it in a general pool');
  }
  // GEAR MUST NOT UNDO THE CLASS RULE.
  for(const it of D.items){ const g=(it.grants||[]).filter(x=>/^power\.(flight|sidestep|side-roll|back-flip|leap|focus|devotion)/.test(x));
    if(g.length && !it.classRestriction)
      add('gear-grants-a-movement-power-to-anyone',it.name,g.join(' ')+' — unrestricted, so a Mage or Priest can buy an escape the class ruling denies it'); }
}

// R27 THE ENCOUNTER BOARDS. Added 2026-09-04 with Stage A3. The rotation to heroes-west /
// enemies-east is the kind of change that looks finished and is not: the hard checks live in
// assemble (a placement off the board stops the build), and what is reported here is the
// DESIGN question the numbers cannot answer — did the sides actually end up on their edges.
if(D.encounters){
  const rows=[...(D.encounters.prologue||[]),...(D.encounters.scripted||[]),...(D.encounters.authored||[])];
  for(const r of rows){
    const b=r.board; if(!b) { add('encounter-has-no-board',r.name||r.id,''); continue; }
    // where does each side actually sit? enemies should skew EAST, the hero zone WEST.
    const cols=[]; const w=(o)=>{ if(!o||typeof o!=='object') return; if(Array.isArray(o)) return o.forEach(w);
      if(o.unit&&(o.at||o.hexes)) for(const p of (o.hexes||[o.at])) if(p&&typeof p.col==='number') cols.push(p.col);
      for(const k of Object.keys(o)) w(o[k]); };
    w(r.setup); w(r.schedule);
    // The west/east sides are the 2026-09-04 rotation's, on boards at least as wide as tall. A
    // taller board is laid out along its rows (map.opening.gates, 20x50: heroes south, the abbey's
    // defenders north — ruled 2026-09-28, engine DECISIONS.md 'Gates is the Curse'), so the
    // column test does not apply. fix.publish-audit, 2026-10-01 (GBH SWITCHES audit.tallBoardSides).
    const sided=b.height<=b.width;
    if(sided&&cols.length){
      const mean=cols.reduce((s,v)=>s+v,0)/cols.length;
      if(mean < (b.width-1)/2 - 1) add('encounter-units-skew-west',r.name||r.id,`mean col ${mean.toFixed(1)} on a ${b.width}-wide board — enemies deploy EAST; check this row was re-authored`);
    }
    const hz=r.heroZone&&r.heroZone.at&&(r.heroZone.at.near||r.heroZone.at);
    // A zone a dated ruling places east of the middle is not a row that missed the rotation: the row says so by citing the
    // ruling in `heroZoneRuling`, and the question this check asks is answered. engine fix.opening-orphanage-closer-start,
    // 2026-10-04 (engine DECISIONS.md 'the opening's tutorial … a closer start': "bring the hero forward to the end of the
    // bridge" — the Orphanage's zone at (10,5) on a 20-wide board); GBH SWITCHES audit.heroZoneRuledEast. A row without
    // the citation is reported as before.
    if(sided&&hz&&typeof hz.col==='number'&&hz.col>(b.width-1)/2&&!(typeof r.heroZoneRuling==='string'&&r.heroZoneRuling.trim())) add('hero-zone-is-not-west',r.name||r.id,`hero zone at col ${hz.col} on a ${b.width}-wide board`);
    if(r.band&&r.band.axis!=='col') add('band-still-walks-rows',r.name||r.id,'the board turned ninety degrees; the band did not');
  }
}

// R26 THE MAPS. Added 2026-09-04 with content.maps-as-rows. The board is the rows; a map
// that has invalid bounded dimensions, is not rectangular, uses a glyph outside MAP-01's
// legend, or restates the default deploy, is a finding — not a thing anyone notices at runtime.
if(D.maps){
  const FORMATS=new Set(['8x8','16x8','16x16','24x24']);
  const GLYPHS=new Set(JSON.parse(fs.readFileSync('../engine/generated/vocabulary.json','utf8')).terrain.map(t=>t.glyph));   // the engine's GLYPH (fix.ground-one-funnel, C4)
  const byFormat={};
  for(const m of D.maps){
    const w=(m.rows?.[0]||'').length, h=(m.rows||[]).length, fmt=w+'x'+h;
    byFormat[fmt]=(byFormat[fmt]||0)+1;
    try { validateMap(m); } catch(error) { add('map-invalid',m.name||m.id,error.message); continue; }
    for(const r of (m.rows||[])) if(r.length!==w){ add('map-not-rectangular',m.name||m.id,`a row of ${r.length} on a board ${w} wide`); break; }
    const bad=[...new Set([...(m.rows||[]).join('')].filter(g=>!GLYPHS.has(g)))];
    if(bad.length) add('map-glyph-not-in-legend',m.name||m.id,bad.join(' '));
    if(m.deploy&&m.deploy.hero==='west'&&m.deploy.enemy==='east') add('map-restates-default-deploy',m.name||m.id,'');
    if(/^test\./.test(m.id)) add('map-is-a-test-board',m.name||m.id,'the test.map.* lane belongs to the engine, not to content');
  }
  // Every ruled format needs at least one SHIPPING board, or the format is a promise.
  for(const f of FORMATS) if(!byFormat[f]) add('format-has-no-shipping-map',f,'the engine runs this board size and content offers nothing to run on it');
}

// R15 the level tables must stay inside their own rules
// Civilian TYPE tables (levels.civilianTypes) are walked with the class tables — ruled
// 2026-09-03. Every invariant a class table obeys, a civilian type table obeys. The two
// civilian-specific checks key off parentClass so a type table inherits them.
if(D.levels) for(const c of [...D.levels.classes, ...(D.levels.civilianTypes||[])]){
  const st=k=>c.rows.reduce((n,r)=>n+((r.grants||{})[k]||0),0);
  const isCivilian=(c.parentClass||c.id)==='class.civilian';
  if(c.rows.length!==10) add('level-table-wrong-length',c.name,c.rows.length+' rows');
  // 2026-09-03: the civilian stamina exemption is REVERSED. Every table, civilian included,
  // grants exactly +2 Stamina Regen and at least +2 Stamina Max. isCivilian survives only to
  // check WHERE the second regen lands: L10 for a combat class, L9 for a civilian.
  if(st('staminaRegen')!==2) add('level-regen-count',c.name,'+'+st('staminaRegen'));
  if(st('staminaMax')<2) add('level-staminamax-thin',c.name,'+'+st('staminaMax'));
  {const at=c.rows.filter(r=>(r.grants||{}).staminaRegen).map(r=>r.level).join(',');
   const want=isCivilian?'6,9':'6,10';
   if(at!==want) add('regen-placement',c.name,'at '+at+', want '+want);}
  const sp=c.rows.filter(r=>r.specialty), ch=c.rows.filter(r=>r.choice);
  if(sp.length!==1||sp[0].level!==2) add('specialty-pick-not-at-l2',c.name,'');
  if(ch.length!==1||ch[0].level!==5) add('choice-not-at-l5',c.name,'');
  for(const k of Object.keys(c.rows[0].grants||{})) add('level-1-grants-something',c.name,k);
}

// R16 hero extraction sanity
if(D.heroes) for(const h of D.heroes.heroes){
  if(!h.ported||!Object.keys(h.ported).length) add('hero-has-no-ported-stats',h.name,h.id);
  if(h.ported&&h.ported.health===0) add('hero-has-zero-health',h.name,h.id);
}

// R17 NO NAMED ROLE. Ruled 2026-08-21: there is one person on this project and no
//     named sign-off authority. A source note records WHAT was ruled and WHEN, never
//     WHO — attributing a ruling to a person invented an approval gate that chats then
//     deferred to, and it put a real person's name on 538 rows of provenance.
//     Passive voice: "Ruled 2026-08-20: …", not "<name> ruled …".
//     Swept 2026-08-21 across gen/*.json and settled.json; 538 -> 0.
//     Hero FICTION is untouched by this rule — backstories, quotes and flavour
//     descriptions may say anything, including a character's name and pronouns.
{
  const NAMES=/\b(Angela|Andrew)\b/;
  const PROV=['source','rule','offLadder','movement','notes','intent'];
  const seen=new Set();
  const walk=(node,who,key)=>{
    if(typeof node==='string'){
      if(PROV.includes(key)&&NAMES.test(node)&&!seen.has(who+key)){
        seen.add(who+key);
        add('provenance-names-a-person',who,`${key}: "${node.slice(0,90).replace(/\s+/g,' ')}…"`);
      }
      return;
    }
    if(Array.isArray(node)) return node.forEach(v=>walk(v,who,key));
    if(node&&typeof node==='object') return Object.entries(node).forEach(([k,v])=>walk(v,who,k));
  };
  for(const group of ['items','enchants','specialties','attacks','powers','badges'])
    for(const e of (D[group]||[])) walk(e,e.name||e.id||group,null);
}

// R18 A UNIT'S BONUS MOVE MUST MATCH ITS CLASS. Ruled 2026-08-21: one bonus move per base
//     class — Warrior Leap, Rogue/Ranger Side Roll, Paladin Sidestep, Mage Focus, Priest
//     Devotion, Civilian and Beast none. The mapping lives on the class row as `bonusMove`
//     (gen/classes.json), NOT in prose, because prose is what let it drift: the engine test
//     cohort spent weeks carrying the pre-rebuild assignment where nearly everyone had
//     Sidestep, and two sessions disagreed about which was right with nothing to settle it.
//     Every unit also needs `power.move` — a unit with no moves at all fails the engine
//     loader with a raw throw, which is how six test heroes took 34 test files down.
if(D.classes){
  const BONUS=Object.fromEntries(D.classes.map(c=>[c.id,c.bonusMove??undefined]));
  const ALLBONUS=new Set(['power.leap','power.side-roll','power.sidestep','power.focus','power.devotion']);
  const heroById=Object.fromEntries(((D.heroes&&D.heroes.heroes)||[]).map(h=>[h.id,h]));
  for(const c of D.classes)
    if(!('bonusMove' in c)) add('class-has-no-bonusMove',c.name,c.id+' — the mapping must be data, not prose');

  for(const u of ((D.testCohort&&D.testCohort.heroes)||[])){
    const moves=(u.engine&&u.engine.moves)||u.moves;
    if(!Array.isArray(moves)||!moves.length){
      add('unit-has-no-moves',u.name||u.typeId,'the engine loader throws on this'); continue; }
    if(!moves.includes('power.move'))
      add('unit-cannot-plain-move',u.name||u.typeId,moves.join(' '));
    const src=heroById[u.copyOf];
    if(!src||!src.class) continue;
    const want=BONUS[src.class];
    const got=moves.filter(m=>ALLBONUS.has(m));
    const expect=want?[want]:[];
    if(JSON.stringify(got)!==JSON.stringify(expect))
      add('bonus-move-does-not-match-class',u.name||u.typeId,
          src.class.replace('class.','')+' should have '+(want||'no bonus move')+', has '+(got.join(' ')||'none'));
  }
}

// R19 EVERY HERO HAS A SUBTYPE, and a fixed hero's subtype is its own name.
//     The identity model is class -> subtype -> type -> name. SUBTYPE is the roster
//     identity and you may hold only one of each per campaign; TYPE is the specific art.
//     Ruled 2026-08-21. A generative hero takes its subtype from its template; a fixed
//     hero has no template, so its subtype is its own name — they are all unique, and the
//     uniqueness check below is what proves that premise still holds.
if(D.heroes&&D.heroes.heroes){
  const H=D.heroes.heroes;
  for(const h of H){
    if(!h.subtype){ add('hero-has-no-subtype',h.name||h.id,h.id); continue; }
    if(h.templateName && h.subtype!==h.templateName)
      add('subtype-does-not-match-template',h.name||h.id,'subtype "'+h.subtype+'" vs template "'+h.templateName+'"');
    if(!h.templateName && h.subtype!==h.name)
      add('fixed-hero-subtype-is-not-its-name',h.name||h.id,'subtype "'+h.subtype+'"');
  }
  const fx=H.filter(h=>!h.templateName).map(h=>h.name);
  const dup=[...new Set(fx.filter((n,i)=>fx.indexOf(n)!==i))];
  for(const n of dup)
    add('two-fixed-heroes-share-a-name',n,'so they collide on subtype — the one-per-campaign rule breaks');

  // R20 NO PLACEHOLDER NAMES. Ruled 2026-08-21. 95 heroes were called "Priestess of Ire I"
  //     … "IV" because the TYPE — the specific art — had no name. It does now: the type is
  //     the name. A roman numeral on a hero name means a type went unnamed again.
  for(const h of H)
    if(/\s(I{1,3}|IV|V|VI{1,3})$/.test(h.name||''))
      add('hero-name-is-a-placeholder',h.name,h.id+' — name the TYPE (the art), do not number it');

  // R21 THE ASPIRING EIGHT ARE PARKED, NOT AUTHORED. Ruled 2026-08-21: they need a total
  //     redesign. Their stats are a FROZEN RANDOM ROLL kept only so the build is
  //     reproducible — gen/aspiring.json says so in three places. This rule stops the flag
  //     being quietly dropped, which would leave arbitrary numbers looking authored, and
  //     stops the Hell-TCG badge names coming back: 14 of the 17 the old generator rolled
  //     do not exist in this game, because HoBaT authored its own badges rather than
  //     porting the 238-row library (COMBAT-DESIGN.md §8).
  for(const h of H.filter(x=>x.path==='aspiring')){
    if(!h.needsRedesign)
      add('aspiring-hero-not-flagged',h.name,h.id+' — its stats are a frozen roll, not authored');
    if((h.originBadges||[]).length)
      add('aspiring-hero-has-badges',h.name,JSON.stringify(h.originBadges)+' — cleared 2026-08-21; if they want badges they come from content’s own set');
  }

  // A type is one picture, so two heroes may not claim the same one.
  const ty=H.filter(h=>h.type).map(h=>h.type);
  for(const t of [...new Set(ty.filter((x,i)=>ty.indexOf(x)!==i))])
    add('two-heroes-share-a-type',t,'a type is one piece of art and belongs to one hero');
}

// R24 BADGES ARE LINTED AT ALL, AND THEIR MACHINE-READABLE HALF IS CHECKED.
//     Found 2026-08-21: line 12's `all` array is items, enchants, specialties, attacks and
//     powers — the 128 badges passed through NONE of the ~60 rules. Two rows had been
//     breaking rulings unseen, and are listed as known findings below until resolved.
//     S14 also merged the Crucible's machine-readable fields onto 43 of them; the prose was
//     already byte-identical, so only statModifiers/hook/rollable/blockers/engineStatGap
//     were added. This checks the merged half stays valid.
if(D.badges){
  const STATSET=new Set(D.stats?D.stats.map(s=>s.id||s.name||s):[]);
  const KNOWN=new Set(['strength','precision','accuracy','crit','luck','reach','dodge','vision',
    'armor','resist','fireResist','poisonResist','shadowResist','coldResist','health','magic','spirit','toughness','movement','staminaMax','staminaRegen',
    'surge','itemSlots','deathbedFighting','corruption','favor']);
  for(const b of D.badges){
    // the banned vocabulary, now actually applied to badges
    const t=[b.name,b.payload].filter(Boolean).join(' | ');
    if(/\bflank/i.test(t)) add('flanking-does-not-exist',b.name,b.payload);
    if(/`?op: ?set`?|\bop: set\b/i.test(t)) add('stat-override',b.name,b.payload);
    if(/stacks? up to|may stack to|stacking up to|to a (maximum|max|cap|floor) of/i.test(t))
      add('stacking-limit',b.name,b.payload);
    if(/your next [a-z' ]*attack/i.test(t)) add('next-attack-modifier',b.name,b.payload);
    // the merged half must be valid
    if(b.hook&&!HOOKS.has(b.hook)) add('badge-unknown-hook',b.name,b.hook);
    const m=b.statModifiers;
    if(m){
      const keys=Array.isArray(m)?m.map(e=>e&&e.stat):Object.keys(m);
      for(const k of keys) if(k&&!KNOWN.has(k)) add('badge-unknown-stat',b.name,k);
      if(Array.isArray(m)) for(const e of m)
        if(e&&e.op&&!['add','sub','mul'].includes(e.op)) add('badge-unknown-statmod-op',b.name,e.op);
    }
  }
}

// R23 CONTENT OWNS THE DERIVED STATS. Ruled 2026-08-21 (S8). Six stats have no source in
//     Hell-TCG — accuracy, crit, luck, vision, movement, staminaMax, staminaRegen — and are
//     a per-class level-1 baseline, now on the class row as `derivedBase`.
//
//     The Crucible carried DIFFERENT numbers for these, copied per-template during the port:
//     it had the Duelist at 100 accuracy and 8 crit where the rogue table says 78 and 5, and
//     across the 116 heroes the two stores share, accuracy and luck disagreed on EVERY ONE.
//     Ruled: content/ wins, and the Crucible's copies are superseded rather than reconciled
//     — it stops having its own when it reads the generated pack.
//
//     So the table has to be data, not a constant inside build-heroes.mjs, or nothing can
//     check it. Every hero must match its class exactly.
if(D.heroes&&D.heroes.heroes&&D.classes){
  const TBL=Object.fromEntries(D.classes.filter(c=>c.derivedBase).map(c=>[c.id,c.derivedBase]));
  for(const c of D.classes)
    if(!c.derivedBase) add('class-has-no-derivedBase',c.name,c.id+' — the per-class baseline must be data, not a constant in the extractor');
  for(const h of D.heroes.heroes){
    const want=TBL[h.class]; if(!want) continue;
    const got=h.derivedBase||{};
    // A DECLARED deviation is allowed; an undeclared one is not. A hero that means to differ
    // from its class carries derivedDeltas saying by how much and why - that is the difference
    // between a design decision and the silent drift this rule exists to catch.
    const dd=h.derivedDeltas||{};
    const wrong=Object.keys(want).filter(k=>got[k]!==want[k]+(dd[k]||0));
    for(const k of Object.keys(dd)) if(!(k in want))
      add('hero-declares-a-delta-on-a-stat-its-class-does-not-have',h.name||h.id,k);
    if(Object.keys(dd).length && !h.derivedDeltaWhy)
      add('hero-deviates-from-its-class-without-saying-why',h.name||h.id,Object.keys(dd).join(', '));
    if(wrong.length)
      add('hero-derived-stats-do-not-match-its-class',h.name||h.id,
          String(h.class).replace('class.','')+' — '+wrong.map(k=>k+' '+got[k]+' should be '+want[k]).join(', '));
  }
}

// R22 ONE PIECE OF ART, ONE HERO. Ruled 2026-08-21, after the same mistake three times:
//     content/'s tutorial path made 96 heroes out of 24 by treating each hero's four LEVEL
//     images as four characters; the Crucible made 29 out of rejected RETRY files; and
//     Martial Artist was Open Hand's four pictures under a second name. 106 heroes that
//     were duplications of art.
//
//     The trap: `-v2` means OPPOSITE THINGS in different folders — a fourth DESIGN in
//     avtair/aeronissa, a rejected RETRY in the *-variants folders — and nothing in the
//     filename says which. So the meaning is data: gen/art-conventions.json. This rule
//     collapses each art path to a CHARACTER STEM under its folder's declared convention
//     and fails if two heroes land on the same one.
if(D.heroes&&D.heroes.heroes&&D.artConventions){
  const CONV=D.artConventions.conventions||[];
  const dirOf=p=>String(p).split('/').slice(0,-1).join('/');
  const fileOf=p=>String(p).split('/').pop();
  const esc=s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&');
  // EXACT by default. "New Art" must NOT swallow "New Art/some-new-batch" — a new folder
  // has to declare itself, which is the whole point. Only subtree:true matches below itself.
  const convFor=dir=>{
    let best=null;
    for(const c of CONV){
      const m=c.match;
      const hit = m.includes('*')
        ? new RegExp('^'+esc(m).replace(/\*/g,'[^/]*')+'$').test(dir)
        : (c.subtree ? (dir===m||dir.startsWith(m+'/')) : dir===m);
      if(hit && (!best || m.length>best.match.length)) best=c;
    }
    return best;
  };
  const stemOf=(path,c)=>{
    const dir=dirOf(path); let f=fileOf(path).replace(/\.[a-z0-9]+$/i,'');
    if(c.characterIsFolder) return dir;                     // the folder IS the character
    if(c.variantSuffix==='retry')  f=f.replace(/-(v\d+|new)$/i,'');
    if(c.levels==='-levelN')       f=f.replace(/-level\d+$/i,'');
    if(c.levels==='trailingDigit') f=f.replace(/\d+$/,'');
    if(typeof c.afflictions==='string'&&c.afflictions.startsWith('-'))
      f=f.replace(new RegExp('('+c.afflictions+')$','i'),'');
    if(c.afflictions==='trailingLPRV') f=f.replace(/[lprv]$/,'');
    return dir+'/'+f;
  };
  const arted=D.heroes.heroes.filter(h=>h.art);

  // (a) the same file, claimed twice
  const byPath={};
  for(const h of arted)(byPath[h.art]=byPath[h.art]||[]).push(h.name);
  for(const [p,who] of Object.entries(byPath))
    if(who.length>1) add('two-heroes-share-one-art-file',who.join(' + '),p);

  // (b) a folder that never said what its suffixes mean
  const undeclared=new Set();
  for(const h of arted) if(!convFor(dirOf(h.art))) undeclared.add(dirOf(h.art));
  for(const d of undeclared)
    add('art-folder-has-no-declared-convention',d,
        'add it to gen/art-conventions.json — a suffix means nothing until the folder says what it means');

  // (c) two heroes that are the same character under that folder's own rules
  const byStem={};
  for(const h of arted){ const c=convFor(dirOf(h.art)); if(!c) continue;
    (byStem[stemOf(h.art,c)]=byStem[stemOf(h.art,c)]||[]).push(h); }
  for(const [s,hs] of Object.entries(byStem)){
    if(hs.length<2) continue;
    const c=convFor(dirOf(hs[0].art));
    add('two-heroes-are-the-same-character',hs.map(h=>h.name).join(' + '),
        s+' — '+hs.map(h=>fileOf(h.art)).join(', ')+'  ['+c.match+': -vN means '+c.variantSuffix+']');
  }
}

// R25 ACCURACY IS NOT A FUNCTION OF RANK, AND HIGH ACCURACY MUST BE EARNED BY REACH.
// Ruled 2026-08-21. The first bestiary derivation set accuracy from rank and nothing else
// (55/65/85/110), which made every boss precise and every boss play the same way. Two questions
// killed it: "is there some reason a lich would never miss its attacks?" — no — and the
// observation that a long-reach thing blasting you from across the board is the one case where
// near-perfect accuracy makes sense. So:
//   (a) rank must not order accuracy. Every rank carries a wide spread, and the correlation
//       between rank and accuracy stays low. A rank-3 juggernaut swings in the sixties.
//   (b) nothing goes above 115 unless its reach is 4+. Menace is expressed as damage, health,
//       riders and summons — never as a hit chance.
// These are shape rules, not number rules; a sweep still owns every individual value.
if(D.bestiary && D.bestiary.length){
  const U=D.bestiary, acc=u=>(u.derivedBase||{}).accuracy;
  const scored=U.filter(u=>typeof acc(u)==='number');

  // (a) high accuracy has to be earned by reach
  for(const u of scored)
    if(acc(u)>115 && ((u.ported||{}).reach||0)<4)
      add('high-accuracy-without-the-reach-to-justify-it', u.name,
          'accuracy '+acc(u)+' at reach '+((u.ported||{}).reach||0)+
          ' — above 115 is for things that hit you from outside your reach. Express the menace as damage or a rider.');

  // (b) rank must not order accuracy: each populated rank needs real spread
  const byRank={};
  for(const u of scored)(byRank[u.rank]=byRank[u.rank]||[]).push(acc(u));
  for(const [r,list] of Object.entries(byRank)){
    if(list.length<10) continue;               // too few to say anything
    const lo=Math.min(...list), hi=Math.max(...list);
    if(hi-lo < 30)
      add('rank-has-no-accuracy-spread','rank '+r,
          list.length+' creatures spanning only '+lo+'-'+hi+
          ' — a rank is not an accuracy band. Vary it by what KIND of creature each one is.');
  }

  // (c) and the ranks must not simply be stacked on top of each other
  const ranks=Object.keys(byRank).filter(r=>byRank[r].length>=10).map(Number).sort((a,b)=>a-b);
  for(let i=1;i<ranks.length;i++){
    const lowerMax=Math.max(...byRank[ranks[i-1]]), upperMin=Math.min(...byRank[ranks[i]]);
    if(upperMin > lowerMax)
      add('accuracy-is-monotonic-in-rank','rank '+ranks[i-1]+' -> '+ranks[i],
          'every rank-'+ranks[i]+' creature is more accurate than every rank-'+ranks[i-1]+
          ' one (bands '+lowerMax+' | '+upperMin+'). That is a formula, not a bestiary.');
  }
}

// R26 A CREATURE IS PLAIN ONLY ON PURPOSE. Ruled 2026-08-21. 38 of the 219 came out of
// hell-tcg with nothing but a bare attack — no status, no rider, nothing to read. Each was
// given an effect taken from its own name (Explosive Mite explodes, Soul Siphon drains) and
// five were kept plain deliberately, because if everything has a rider then nothing does.
// The distinction has to be DECLARED, in gen/bestiary-riders.json, not inferred from silence:
// otherwise "we have not got to it yet" and "this one is meant to be simple" look identical,
// and the first quietly becomes the second.
if(D.bestiary && D.bestiary.length){
  const hasRider = u => (u.attacks||[]).some(a=>(a.effects||[]).length || (a.triggers||[]).length || a.sameAs || a.attackCount)
    || (u.triggers||[]).length>0 || (u.moves||[]).length>0 || (u.immunity||[]).length>0;
  const bare = D.bestiary.filter(u=>!hasRider(u));

  for(const u of bare)
    if(!u.baseline)
      add('creature-is-bare-and-nobody-said-why', u.name,
          'no rider on any attack and no trigger — give it an effect from its own name, or declare it a baseline in gen/bestiary-riders.json');

  // and the exception must stay an exception
  const baselines = D.bestiary.filter(u=>u.baseline);
  if(baselines.length > 8)
    add('too-many-declared-baselines', baselines.length+' creatures',
        'the plain enemies are a deliberate handful, not a parking space: '+
        baselines.map(u=>u.name).join(', '));
}

// R27 AN EFFECT THAT DOES NOTHING IS A DROPPED MECHANIC, NOT AN EFFECT. Ruled 2026-08-21,
// after a review asked the simplest possible question — does any enemy need a mechanic we do
// not have? — and found that 14 of them HAD one and it had been silently swallowed.
//
// hell-tcg's createAura is not a spatial aura: it fires when a unit ARRIVES on the board, and
// the payload rides inside the aura object. The port mapped the verb and dropped the payload,
// so all 14 became {grant an aura, null, null, null, null} — a legal-looking effect that does
// nothing at all. Nine were rank-3 bosses; one was the Demon King's signature ability. Every
// vocabulary check passed, because an empty effect uses no illegal words. That is the hole.
//
// So: an effect must DO something, and every target it names must be a real shape.
if(D.bestiary && D.bestiary.length){
  const SH=new Set(((D.functions||{}).shapes||[]).map(x=>typeof x==='string'?x:x.name));
  // A referent is not a shape and never will be, but it IS a legal target: onTakingDamage
  // exists so a thing can hit back at whoever hit it. gen/referents.json declares the two.
  const REF=new Set((D.referents||[]).map(r=>r.name));
  const legalTarget = v => SH.has(v) || REF.has(v);
  const carries = e => e.status!=null || e.stat!=null || e.value!=null || (e.multiple!=null)
    || e.affliction!=null || e.layer!=null || e.needs!=null || e.sameAs!=null || e.powerScale!=null;
  // verbs that are complete on their own — they need no status, stat or number
  const SELF_SUFFICIENT = new Set(['enter stealth','reveal / break stealth','grant Flight',
    'move yourself','move WITHOUT provoking','stabilise a downed ally','deal damage (type from the weapon)']);

  const walk = (u, where, list, needsAbove) => {
    for(const e of (list||[])){
      if(needsAbove) continue;   // the row declared its capability; its payload shape is that capability's business
      if(!SELF_SUFFICIENT.has(e.effect) && !carries(e))
        add('effect-does-nothing', u.name, where+': "'+e.effect+'" carries no status, stat or value — '+
            'if the payload was dropped in translation the mechanic went with it');
      if(e.target!=null && !legalTarget(e.target))
        add('effect-target-is-neither-shape-nor-referent', u.name, where+': target "'+e.target+'" is not one of the '+
            SH.size+' shapes nor one of the '+REF.size+' declared referents — a raw source string here reads BACKWARDS, since an enemy'+String.fromCharCode(39)+'s "allEnemies" is its own side');
    }
  };
  for(const u of D.bestiary){
    for(const a of (u.attacks||[])){
      if(a.sameAs) continue;
      walk(u, a.name, a.effects, (a.needs||[]).length);
      for(const tr of (a.triggers||[])) walk(u, a.name+'/'+(tr.name||tr.hook), tr.effects, (tr.needs||a.needs||[]).length);
      if(a.targets!=null && !SH.has(a.targets) && !(a.needs||[]).includes('capability.line-shape'))
        add('attack-shape-is-not-in-the-vocabulary', u.name, a.name+': "'+a.targets+'"');
    }
    for(const tr of (u.triggers||[])){
      walk(u, tr.name||tr.hook, tr.effects, (tr.needs||[]).length);
      // engine fix.fire-imp-burn-spares-self (2026-10-04; ruled 2026-10-03, engine DECISIONS.md 'the Fire Imp's burn does not
      // hit the imp itself'): "every other unit within N hexes" is the excluding-self form of the vocabulary's one area
      // shape "every unit within N hexes", not a new shape — legal exactly when that shape is. mkenginepack reads the same phrase.
      const shapeOf = s => s==='every other unit within N hexes' ? 'every unit within N hexes' : s;
      if(tr.targets!=null && !SH.has(shapeOf(tr.targets)))
        add('trigger-shape-is-not-in-the-vocabulary', u.name, (tr.name||tr.hook)+': "'+tr.targets+'"');
    }
  }
}

// R28 A RETIRED HOOK STAYS RETIRED, AND THE BOARD HAS NO LANES. Ruled 2026-08-22.
//
// COMBAT-DESIGN retires hooks by name and date, and content did not follow: onEnter and
// onWounded went on 2026-08-15, turnEnd was renamed onActivationEnd the same day, and onEquip
// went on 2026-08-20 — yet two items were still hanging effects on onEquip a week later. A
// retirement written only in prose is a suggestion. This makes it a build failure.
//
// The lane half is the same failure from the other direction. Hell-TCG is three columns and
// HoBaT is a hex board, so "the enemies in my row" and "deploys foremost" are not translations,
// they are imports of a board that does not exist. A radius is not a row.
{
  const RETIRED = {
    onEnter:      'removed 2026-08-15 — units do not arrive mid-battle',
    onWounded:    'removed 2026-08-15',
    turnEnd:      'renamed onActivationEnd 2026-08-15 — a unit\'s go, not a Turn',
    onEquip:      'retired 2026-08-20 — units start fully equipped, so equip-time IS startOfBattle',
  };
  const LANES = { placement:'lane placement in a three-column grid', row:'rows do not exist on a hex board',
                  sameRowEnemies:'ditto', attacksAllInRow:'ditto' };

  // (a) retired hooks, anywhere a hook is named
  for(const h of ((D.functions||{}).hooks||[])){
    const n = typeof h==='string' ? h : h.name;
    if(RETIRED[n]) add('retired-hook-still-in-use', n,
      RETIRED[n]+' — used by '+((h.ids||[]).slice(0,4).join(', ')||(h.uses+' rows')));
  }
  for(const u of (D.bestiary||[])) for(const tr of (u.triggers||[]))
    if(RETIRED[tr.hook]) add('retired-hook-still-in-use', u.name, tr.hook+': '+RETIRED[tr.hook]);

  // (b) lane and row concepts
  for(const u of (D.bestiary||[])){
    for(const k of Object.keys(u))
      if(/^(placement|row|lane)/i.test(k)) add('lane-concept-on-a-hex-board', u.name,
        'field "'+k+'" — a hex board has no lanes; the useful half is `deploys`');
    const shapes = [...(u.attacks||[]).map(a=>a.targets), ...(u.triggers||[]).map(x=>x.targets)];
    for(const s of shapes) if(s && /\brow\b/i.test(s))
      add('lane-concept-on-a-hex-board', u.name, 'shape "'+s+'" names a row');
  }
}

// R29 A FIELD IS DECLINED, NOT FORGOTTEN. Ruled 2026-08-22.
//
// "We decided not to port this" and "nobody opened that field" produce the identical output —
// nothing — and this extractor has now been caught by the second one three times: the aura
// payload, card.triggers, and specialMechanics were all dropped silently rather than declined
// deliberately, and between them they hid a whole mechanic, 96 creatures' worth of content and
// 193 hollow spells. gen/not-ported.json is the difference: every field left behind is written
// down with a reason and a date. Anything on that list is a decision. Anything NOT on it and
// not in the output is a bug nobody has noticed yet.
//
// This rule enforces the near half — a declined field must actually stay out. The far half is
// enforced by the extractor, which reports any source action it cannot map.
{
  const NP = D.notPorted || [];
  if(!NP.length) add('not-ported-list-is-missing','gen/not-ported.json',
    'the list of deliberately-declined source fields is not in the build — without it, a dropped field is indistinguishable from a decision');

  const declined = new Set(NP.map(x => x.field));
  const seen = new Map();
  const walk = (o, where) => {
    if(Array.isArray(o)) return o.forEach(x => walk(x, where));
    if(!o || typeof o !== 'object') return;
    for(const [k,v] of Object.entries(o)){
      if(declined.has(k) && v != null && !(Array.isArray(v) && !v.length)){
        if(k==='condition' && typeof v==='string' && !/^(melee|ranged)$/.test(v)){ /* the vocabulary's condition, not hell-tcg's */ }
        else seen.set(k, (seen.get(k)||0) + 1);
      }
      walk(v, where);
    }
  };
  walk(D.bestiary, 'bestiary');
  for(const [k,n] of seen){
    const row = NP.find(x => x.field === k);
    add('declined-field-reached-the-output', k,
        n+' occurrence(s) in the bestiary — declined '+(row?row.decided:'?')+': '+(row?row.why:'').slice(0,120));
  }

  // and the spells stay cut
  if(D.enemySpells && D.enemySpells.length)
    add('enemy-spells-are-back', D.enemySpells.length+' rows',
        'the 193 immediate-cast rows were cut 2026-08-22 — they were hollow (empty abilities arrays, effects hidden in triggers.onEnter) and the new game does not want them');
}

// R30 A DECLARED ART PATH MUST RESOLVE. Ruled 2026-08-22.
//
// Every art path in gen/heroes.json named a hell-tcg folder — 187 base paths and 140 levelArt
// paths, and not one of them resolved in this repo. That is worse than a missing path, because
// a populated levelArt array READS AS PRESENT: one session reported the level-ups were there,
// another could not find them, and both were looking at the same correct-looking data. The art
// itself was real and sitting in hell-tcg; nothing had ever been brought across.
//
// The rule is deliberately scoped to what has been migrated: IF a hero has a local art folder,
// content must point INSIDE it, and every file it names must exist. Heroes whose art has not
// been brought across yet are a counted gap in CONTENT-GAPS, not a lint failure — that is work
// outstanding, not a contradiction.
{
  const local = p => typeof p === 'string' && p.startsWith('art/heroes/');
  let unresolved = 0, remote = 0;
  for(const h of ((D.heroes||{}).heroes||[])){
    const paths = [h.art, ...(h.levelArt||[]), ...Object.values(h.afflictionArt||{}),
                   ...(h.anim||[]), ...(h.hexArt||[])].filter(Boolean);
    if(!paths.length) continue;

    // a hero that has been migrated must be migrated COMPLETELY — no half-local rows
    const anyLocal = paths.some(local);
    if(anyLocal){
      for(const p of paths){
        if(!local(p)){
          add('hero-art-is-half-migrated', h.name,
              'names a local folder but also "'+p+'" — one hero, one art location');
          continue;
        }
        if(!fs.existsSync('../'+p)){ unresolved++;
          add('declared-art-file-does-not-exist', h.name, p); }
      }
      // and a migrated hero should carry its whole set
      if((h.levelArt||[]).length && (h.levelArt||[]).length !== 4)
        add('hero-has-a-partial-level-set', h.name,
            (h.levelArt||[]).length+' of 4 levels — the convention is one hero at four levels');
    } else remote++;
  }
  if(remote)
    console.error('  (R30 note: '+remote+' heroes still name art outside this repo — counted in CONTENT-GAPS, not linted here)');
}

// R31 NOTHING HALF-FITS, AND NOTHING POINTS AT HELL-TCG. Ruled 2026-08-22: cutting beats
// half-fitting, and a broken reference is worse than an absence — an absence is obviously
// missing, a broken reference reads as content. That is precisely how one session reported the
// Eve level art present while another could not find it, and how 14 empty auras and 193 hollow
// spells sat in the Codex looking fine.
//
// Four things were cut off the hero rows and this keeps them off:
//   151 art paths into hell-tcg    · 146 unported hell-tcg trigger blocks
//    98 undefined badge names      ·  85 Personality_ tags mis-filed as badges
// All of it is parked in gen/cut-2026-08-22.json, so this rule is about REGROWTH, not loss.
{
  const H = (D.heroes||{}).heroes || [];
  const known = new Set((D.badges||[]).map(b => String(b.name).toLowerCase()));

  for(const h of H){
    // (a) no path may name the source project, ever
    const paths = [h.art, ...(h.levelArt||[]), ...Object.values(h.afflictionArt||{}),
                   ...(h.anim||[]), ...(h.hexArt||[])].filter(Boolean);
    for(const p of paths){
      if(/^New Art\/|hell-tcg/i.test(p))
        add('art-path-points-at-hell-tcg', h.name, p + ' — this repo cannot resolve it. Bring the file across or leave the field null.');
      else if(!fs.existsSync('../'+p))
        add('art-path-does-not-resolve', h.name, p);
    }
    // a hero with no art says so, rather than carrying a path to nowhere
    if(!h.art && !h.artMissing && paths.length)
      add('hero-has-level-art-but-no-base-art', h.name, 'levelArt without art is a half-row');

    // (b) hell-tcg trigger objects. Hero triggers were NEVER ported: 30 foreign action names,
    //     none of them a word this game has. The shape is the tell — ours are arrays.
    if(h.triggers && !Array.isArray(h.triggers))
      add('hero-carries-an-unported-trigger-object', h.name,
          'hell-tcg shape (an object keyed by hook, holding foreign action names). Cut 2026-08-22.');

    // (c) a badge NAME with no badge row is a promise nothing keeps
    for(const n of (h.originBadges||[])){
      if(/^Personality_/.test(n))
        add('personality-tag-filed-as-a-badge', h.name, n + ' — personality tags are their own field, not badges');
      else if(!known.has(String(n).toLowerCase()))
        add('hero-wears-a-badge-that-does-not-exist', h.name, n);
    }
  }
}

// R32 ART THAT EXISTS MUST REACH THE CODEX. Ruled 2026-08-22.
//
// art/manifest.json is what the Codex actually draws from — not the art paths on the hero rows.
// It had been generated ONCE and never regenerated, so it held 297 entries all pointing at
// hell-tcg, ninety-six of them naming heroes that no longer existed, and NOT ONE entry for
// hero.base.* — meaning the 24 Eve heroes, which own the most complete art in the repo, drew
// nothing at all. The art was on disk, the paths were on the rows, and the Codex showed a gap.
//
// So: if a hero owns local art, the manifest must know, and every thumb it names must exist.
if(D.heroes && D.heroes.heroes && fs.existsSync('art/manifest.json')){
  const MAN = JSON.parse(fs.readFileSync('art/manifest.json','utf8'));
  const live = new Set(D.heroes.heroes.map(h=>h.id));

  for(const [id,row] of Object.entries(MAN)){
    if(!live.has(id)) add('manifest-names-a-hero-that-does-not-exist', id,
      'left over from a hero that was cut — a dead reference in the file the Codex draws from');
    for(const v of (row.variants||[]))
      if(!fs.existsSync('art/thumbs/'+v.thumb))
        add('manifest-thumb-is-missing', id, v.label+' -> art/thumbs/'+v.thumb+' (renders as a blank box)');
  }

  for(const h of D.heroes.heroes){
    const owns = (h.levelArt||[]).length + Object.keys(h.afflictionArt||{}).length + (h.hexArt||[]).length;
    if(!owns) continue;
    const row = MAN[h.id];
    if(!row) { add('hero-has-art-but-no-manifest-entry', h.name,
      owns+' local art files on the row and nothing in the manifest — it will draw nothing. Run npm run thumbs.'); continue; }
    // the manifest must not be STALER than the row: art arriving later is exactly how this broke
    const want = (h.levelArt||[]).length + Object.keys(h.afflictionArt||{}).length
               + (h.hexArt||[]).filter(p=>/_256\./.test(p)).length;
    if((row.variants||[]).length < want)
      add('manifest-is-stale-for-this-hero', h.name,
        (row.variants||[]).length+' variants in the manifest but '+want+' art files on the row — rerun npm run thumbs');
  }
}

// R33 AN AUTHORED ENEMY NAMES WHAT IT NEEDS, AND A PLACEHOLDER SAYS SO. Ruled 2026-08-25,
// landing the first 28 real enemies. Three invariants:
//   (a) every `needs` entry anywhere on an authored row must name a capability DECLARED in
//       the file's own capabilities block — an undeclared need is a typo pretending to be a plan;
//   (b) every surviving ported row is marked placeholder:true, so nothing downstream mistakes
//       the hell-tcg port for a real enemy;
//   (c) xpByTier exists — tier is an XP price (2/5/15 ruled 2026-08-23), so a tierless or
//       priceless bestiary cannot be scored.
if(D.bestiary && D.bestiary.length){
  const caps = new Set(Object.keys(D.bestiaryCapabilities||{}).filter(k=>k!=='_note'));
  const collect = (o, bag) => { if(Array.isArray(o)) return o.forEach(x=>collect(x,bag));
    if(!o||typeof o!=='object') return;
    for(const [k,v] of Object.entries(o)){ if(k==='needs'&&Array.isArray(v)) v.forEach(n=>bag.push(n)); collect(v,bag); } };
  for(const u of D.bestiary){
    if(u.authored){
      const needs=[]; collect(u, needs);
      for(const n of needs) if(!caps.has(n))
        add('authored-enemy-needs-an-undeclared-capability', u.name, '"'+n+'" is not in the capabilities block');
      if(u.tier==null) add('authored-enemy-has-no-tier', u.name, 'tier is an XP price now');
    } else if(!u.placeholder)
      add('bestiary-row-is-neither-authored-nor-placeholder', u.name,
          'every row is one or the other — an unmarked row reads as real');
  }
  if(!D.xpByTier) add('xp-by-tier-is-missing','bestiary','tier 1/2/3 = 2/5/15 XP, ruled 2026-08-23');
}

// R34 AN ENCOUNTER NAMES ONLY UNITS THAT EXIST. Ruled 2026-08-25 with the prologue
// battles: a spawn or setup id that resolves to nothing is the dangling-reference bug in a
// new coat — it reads as content and produces an empty hex. Civilian objectives are hero
// rows, enemies are bestiary rows; both are checked.
if(D.encounters){
  const ids=new Set([...(D.bestiary||[]).map(u=>u.id), ...((D.heroes||{}).heroes||[]).map(h=>h.id)]);
  for(const b of (D.encounters.prologue||[])){
    const refs=[...(b.setup||[]), ...(b.schedule||[]).flatMap(s=>s.spawn||[])];
    for(const r of refs){ if(r.unit && !ids.has(r.unit))
      add('encounter-names-a-unit-that-does-not-exist', b.id, r.unit); if(r.heroes) continue; }
    // hex placements, ruled 2026-08-25: in bounds on the battle board, counts match, and
    // the zone vagueries are gone — a surviving `zone` is the old format leaking back.
    { const W=(b.board||{}).width||12, H=(b.board||{}).height||12;
      const chk=(who,h)=>{ if(h.col==null||h.row==null) return;
        if(h.col<0||h.col>=W||h.row<0||h.row>=H) add('placement-off-the-board',b.id,who+' at '+h.col+','+h.row+' on a '+W+'x'+H+' board'); };
      for(const r of refs){
        if(r.zone) add('placement-is-still-a-zone',b.id,(r.unit||'heroes')+': "'+r.zone+'" — hex placement was ruled 2026-08-25');
        if(r.at){ chk(r.unit||'heroes', r.at); if(r.at.near) chk(r.unit+' (near)', r.at.near);
          for(const o of (r.at.oneOf||[])) chk(r.unit+' (oneOf)',o); }
        for(const h of (r.hexes||[])) chk(r.unit,h);
        if(r.hexes && r.count && r.hexes.length!==r.count)
          add('placement-count-mismatch',b.id,r.unit+': count '+r.count+' but '+r.hexes.length+' hexes');
      } }
    for(const s of (b.schedule||[])) if(s.phase==null && s.enemyPhase==null && !s.event)
      add('encounter-schedule-entry-has-no-clock', b.id, JSON.stringify(s).slice(0,60));
  }
  for(const b of (D.encounters.prologue||[])) if(JSON.stringify(b).match(/\"turn\"/i))
    add('encounter-says-turn', b.id, 'the schedule clock is PHASES — ruled 2026-08-23');
}

// R35 A KIT NAMES REAL ITEMS AND A RANDOM POOL IS NEVER EMPTY. S12, ruled 2026-08-25:
// kits are per-hero with a class backup. Every explicit id must exist; every random spec
// must match at least two items (a random pick from a pool of one is a lie); every class
// has a kit entry; a kit never dictated is flagged provisional AS DATA.
if(D.kits){
  const itemById=new Map(D.items.map(i=>[i.id,i]));
  const resolvePool=f=>D.items.filter(i=>
    (!f.itemClass||i.itemClass===f.itemClass)&&(!f.hands||i.hands===f.hands)&&
    (!f.tier&&f.tier!==0||i.tier===f.tier)&&(!f.nameMatches||new RegExp(f.nameMatches,'i').test(i.name)));
  const checkPick=(who,pick)=>{
    if(pick.oneOf) for(const id of pick.oneOf){ if(!itemById.has(id)) add('kit-names-a-missing-item',who,id); }
    if(pick.random){ const pool=resolvePool(pick.from||{});
      if(pool.length<2) add('kit-random-pool-too-small',who,JSON.stringify(pick.from)+' -> '+pool.length+' item(s)'); }
  };
  for(const [cls,k] of Object.entries(D.kits.classKits||{})){
    for(const id of (k.items||[])) if(!itemById.has(id)) add('kit-names-a-missing-item',cls,id);
    if(k.pick) checkPick(cls,k.pick);
  }
  for(const c of D.classes) if(!(D.kits.classKits||{})[c.id])
    add('class-has-no-kit-entry',c.name,c.id+' — every class carries a kit entry, even an empty one');
  const heroIds=new Set(D.heroes.heroes.map(h=>h.id));
  // The kit grammar, ruled 2026-08-27: a plain ARRAY is the full kit; {pinned:[...]}
  // guarantees items and the class draw completes the rest. Both forms name real items.
  for(const [hid,kit] of Object.entries(D.kits.heroKits||{})){
    if(hid.startsWith('_'))continue;
    if(!heroIds.has(hid)) add('kit-names-a-missing-hero',hid,'hero override for a hero that does not exist');
    const items=Array.isArray(kit)?kit:(kit&&(kit.pinned||kit.items))||null;
    if(!items){ add('kit-override-has-no-items',hid,'neither an array nor {pinned/items} — not a form the 2026-08-27 grammar names'); continue; }
    for(const id of items) if(!itemById.has(id)) add('kit-names-a-missing-item',hid,id);
  }
}


// ── MERGED 2026-09-01 from the parallel content chat ─────────────────────────
// Eight rules that exist only on that branch, each enforcing one of the four universal
// rules merged into settled.json alongside them. Taken verbatim except for de-naming.

// R34 every enemy states its attacks, and melee is the floor — ruled 2026-08-30.
// "every enemy needs its attacks clearly defined. If it does not have a melee attack,
// an enemy has a basic melee S+0 damage attack." See rule.enemy-attacks in settled.json.
{
  const ATK=new Map(D.attacks.map(a=>[a.id,a]));
  const units=(D.bestiaryTest&&D.bestiaryTest.units)||[];
  for(const u of units){
    const ids=u.attacks||[];
    if(!ids.length){ add('enemy-has-no-attacks',u.name,u.id+' — an enemy with nothing listed is unfinished content'); continue; }
    let melee=false;
    for(const id of ids){
      const a=ATK.get(id);
      if(!a){ add('enemy-attack-id-does-not-resolve',u.name,id+' — not defined anywhere in the content'); continue; }
      if(a.range==='melee') melee=true;
    }
    if(!melee) add('enemy-has-no-melee-attack',u.name,ids.join(', ')+' — needs attack.basic.melee');
  }
  if(!ATK.has('attack.basic.melee')) add('basic-melee-attack-missing','settled.json','attack.basic.melee is the floor every enemy falls back to');
  else { const b=ATK.get('attack.basic.melee');
    if(b.range!=='melee'||b.stat!=='strength'||b.damage!==0)
      add('basic-melee-attack-changed','attack.basic.melee','must stay melee, strength, +0 — got '+b.range+'/'+b.stat+'/+'+b.damage); }
}

// R35 nothing outlasts the Battle — ruled 2026-08-31. "There's no permanent past the end of
// battle for anything." The longest duration is `rest of the Battle`; an action or a clause
// that claims permanence beyond it does not exist. See rule.nothing-outlasts-the-battle.
{
  const PERM=/\b(permanent(ly)?|forever|for good|never (?:wears? off|expires?|ends?)|carries? (?:over |on )?(?:in)?to the next (?:battle|mission|encounter)|between battles|for the rest of the campaign)\b/i;
  const ALLOW=/permanent(ly)? (?:apology|hole)/i;             // two flavour lines, ruled fine
  for(const e of all){
    if(e.id==='rule.nothing-outlasts-the-battle') continue;   // the rule may name the thing it bans
    const t=txt(e);
    if(PERM.test(t)&&!ALLOW.test(t)) add('claims-permanence-past-the-battle',e.name,(t.match(PERM)||[''])[0]+' — the ceiling is "rest of the Battle"');
  }
  const acts=new Set();
  if(D.heroes) for(const h of D.heroes.heroes)
    for(const arr of Object.values(h.triggers||{})) for(const g of (arr||[])){
      if(g.action) acts.add(g.action);
      if(g.description&&PERM.test(g.description)) add('claims-permanence-past-the-battle',h.name,g.description.slice(0,80));
    }
  for(const a of acts) if(/permanent/i.test(a)) add('permanent-action-name',a,'a trigger action may not be named permanent — rename it to ...ForBattle');
}
// R36 no damage-DEALT reduction — ruled 2026-09-01. one was written only because the game was thought to already have it; it does not. Mitigation sits on the receiving side: Armor, Resist,
// Protection. Lowering what a unit deals is not a thing.
{
  const DEALT=/(?:lower|reduce|lowers|reduces)[^.]{0,40}\b(?:damage (?:dealt|they deal|it deals|hero damage))|hero damage by|damage dealt by[^.]{0,20}\bby \d/i;
  for(const e of all){ const t=txt(e); if(DEALT.test(t)) add('reduces-damage-dealt',e.name,(t.match(DEALT)||[''])[0]+' — mitigation is Armor, Resist or Protection, on the receiving side'); }
}

// R37 a trinket is an OPTION, not a stat stick — ruled 2026-09-02. The per-unit limits on
// Armor, Idols, Blood Runes and Relics exist to stop every slot being additive in one
// direction; trinkets carry no limit BECAUSE they give options. A trinket whose whole content
// is statModifiers is a miscategorised armor piece and breaks the reason the limit is absent.
// Deliberate exception: status IMMUNITIES are additive but conditional — often worth nothing,
// so their value is the pre-battle question of who carries one today. They stay trinkets.
// See rule.item-limits. NOTE: the mirror check (a limited item carrying nothing additive) was
// written and REMOVED 2026-09-02 — additive weight lives in statModifiers, in the slayer{}
// field AND in prose, so it produced 8 false positives (the slayer runes, the immunity and
// Protection idols). A rule that cries wolf is worse than no rule.
{
  // AMENDED 2026-09-02: "We're occasionally going to break the trinkets with flat stat
  // modifiers." The Waystation's common items are the ruled break — a torch is +4 Vision and
  // nothing else, a backpack is slots for Movement — so a row the Waystation sells
  // (waystationBand) is exempt. The rule still holds for every other trinket, which is where
  // it was earning its keep.
  const IMMUNITY=/\bimmunit(y|ies)\b/i;
  for(const it of D.items){
    if(it.itemClass!=='trinket') continue;
    if(it.waystationBand) continue;                          // ruled 2026-09-02
    const sm=Object.keys(it.statModifiers||{}).length;
    const tg=(it.triggers||[]).length, gr=(it.grants||[]).length;
    const prose=(it.description||'')+' '+(it.intent||'');
    // V2 section18 explicitly replaces the immunity necklaces with flat elemental resistance.
    if(sm>0&&Object.keys(it.statModifiers).every(k=>['fireResist','poisonResist','shadowResist','coldResist'].includes(k)))continue;
    if(IMMUNITY.test(prose)) continue;                       // the ruled exception
    if(sm>0 && tg===0 && gr===0)
      add('trinket-is-a-stat-stick',it.name,
          Object.keys(it.statModifiers).join(', ')+' — a trinket gives an option; put flat stats in a limited category');
  }
}

// ART GAPS DO NOT STOP A SHIP. Ruled 2026-09-04 (engine/DECISIONS.md, "Missing art never
// breaks a ship"): "We will eventually have four paintings, but it's fine to have one. Things
// shouldn't break if we are missing art."
//
// These three still PRINT — a missing painting is a real thing someone has to do, and the list
// is the art queue — but they are counted separately and TOTAL FINDINGS excludes them, because
// TOTAL FINDINGS is what expect.mjs gates the pack on and art is never a reason to hold a pack.
// Anything that is not on this list still stops the ship.
const ART_GAPS=new Set(['hero-has-a-partial-level-set','declared-art-file-does-not-exist','art-path-does-not-resolve']);
const art=F.filter(f=>ART_GAPS.has(f.rule));
const F2=F.filter(f=>!ART_GAPS.has(f.rule));
const show=(rows,heading)=>{
  const by={}; rows.forEach(f=>(by[f.rule]=by[f.rule]||[]).push(f));
  const ent=Object.entries(by).sort((a,b)=>b[1].length-a[1].length);
  if(heading&&ent.length) console.log('\n'+heading);
  for(const [r,list] of ent){
    console.log('\n### '+r+'  ('+list.length+')');
    list.slice(0,14).forEach(f=>console.log('   '+f.who.padEnd(26)+f.detail));
    if(list.length>14) console.log('   ... '+(list.length-14)+' more');
  }
};
show(F2);
show(art,'──── ART GAPS — printed, NOT counted, never a reason to hold a pack (ruled 2026-09-04) ────');
if(art.length) console.log('\nART GAPS: '+art.length+' (not counted below)');
console.log('\nTOTAL FINDINGS: '+F2.length);
