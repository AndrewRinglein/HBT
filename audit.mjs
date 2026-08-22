import fs from 'fs';
const D=JSON.parse(fs.readFileSync('hbt-content.json','utf8'));
const HOOKS=new Set(['startOfBattle','onAttack','onMiss','onHit','onCrit','onDamage','onTakingDamage','onKill','onDeath','onEquip','onActivationEnd','onDodge','aura','passive']);
const SLOTTED=new Set(['relic','trinket','idol']);
const F=[];
// NARROW exemptions only. A '*' here once hid power.berserker.draw-from-death for three
// rounds of sweeps. The settled trio are exempt from the THREE-STATS-ONE-ABILITY shape rule
// (AUTHORING-GUIDE.md), not from the vocabulary or the mechanics rules.
const ACCEPTED={'Marching Orders':'slotted-item-charges-slots','Bash':'power-is-just-an-attack','Pot Lid':'accuracy-too-cheap-a-cost',
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
  if(/zone of control|extra Movement to leave|leaving one provokes|Moves? out of a hex inside|extra Movement (?:when |on )?leaving|spends? \d+ extra Movement leaving|to leave the hex/i.test(t))
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
  if((e.itemClass==='weapon'||String(e.id).startsWith('enchant.')) && (e.statModifiers||{}).vision)
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
// R6 relics named as attributes
for(const r of D.items.filter(i=>i.itemClass==='relic')){
  if(!/\b(of|'s|charm|boots|beads|orders|tome|manifest|seal|banner|cradle|case|censer|torc|compass|crown|fragment|codex|quiver|gauntlets|furs|journal|standard|lantern|eyeglass|reliquary|vow|ring|amulet|pendant|idol|mask|key|coin|shard|horn|bell)\b/i.test(r.name))
    add('relic-not-an-object',r.name,'');
  const k=Object.keys(r.statModifiers||{});
  if(k.length!==2) add('relic-not-one-good-one-bad',r.name,JSON.stringify(r.statModifiers));
}
// R3 accuracy underpriced as the only cost
for(const e of all){ const M=e.statModifiers||{};
  const ups=Object.entries(M).filter(([k,v])=>v>0), dns=Object.entries(M).filter(([k,v])=>v<0);
  if(dns.length===1&&dns[0][0]==='accuracy'&&Math.abs(dns[0][1])<20){
    const strong=ups.some(([k,v])=>['armor','resist','spirit','magic','toughness','staminaRegen'].includes(k)||(k==='crit'&&v>=10));
    if(strong) add('accuracy-too-cheap-a-cost',e.name,JSON.stringify(M));
  } }
// R8 specialty shape
for(const s of D.specialties){
  const n=Object.keys(s.statModifiers||{}).length, tg=(s.triggers||[]).length;
  if(n>3&&!['specialty.berserker','specialty.shieldbearer','specialty.leader','specialty.sentinel'].includes(s.id)) add('specialty-too-many-stats',s.name,n+' stats');
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
    if(!readByRule && !enchTags.has(t)) add('form-tag-nothing-reads',t,'no rule says "'+t+' attacks" and no enchantment applies to it');
    // R56 every weapon form takes at least one enchantment, or that form's weapons are the
    // only ones in the game that cannot be upgraded — an invisible penalty nobody authored.
    if(!enchTags.has(t)) add('weapon-form-takes-no-enchantment',t,'no enchant lists this form in appliesToTags'); } }

// R57-R60 the TEST BESTIARY must stay obviously, deletably test.
//   Ruled 2026-08-20: "clearly designated as tests so they can be thrown away later,
//   or duplicated into real." That is only true if nothing real ever points at it.
if(D.bestiaryTest){ const B=D.bestiaryTest;
  const ENGINE_HOOKS=['onAttack','onMiss','onHit','onDamage','onCrit','onKill','onTakingDamage','onDeath','onActivationEnd'];
  const ENGINE_EFFECTS=['status.apply','status.remove','damage'];
  const ENGINE_STATUSES=new Set(['status.poison','status.burn','status.regeneration','status.stun',
    'status.bleed','status.protection','status.weak','status.slow']);
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
  for(const h of ENGINE_HOOKS) if(!seenHooks.has(h)) add('test-bestiary-misses-a-hook',h,'no test unit exercises it');
  for(const e of ENGINE_EFFECTS) if(!seenEffects.has(e)) add('test-bestiary-misses-an-effect',e,'no test unit exercises it');
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
  // GEAR MUST NOT UNDO THE CLASS RULE.
  for(const it of D.items){ const g=(it.grants||[]).filter(x=>/^power\.(flight|sidestep|side-roll|leap|focus|devotion)/.test(x));
    if(g.length && !it.classRestriction)
      add('gear-grants-a-movement-power-to-anyone',it.name,g.join(' ')+' — unrestricted, so a Mage or Priest can buy an escape the class ruling denies it'); }
}

// R15 the level tables must stay inside their own rules
if(D.levels) for(const c of D.levels.classes){
  const st=k=>c.rows.reduce((n,r)=>n+((r.grants||{})[k]||0),0);
  if(c.rows.length!==10) add('level-table-wrong-length',c.name,c.rows.length+' rows');
  if(c.id!=='class.civilian'&&st('staminaRegen')!==2) add('level-regen-count',c.name,'+'+st('staminaRegen'));
  if(c.id==='class.civilian'&&(st('staminaMax')||st('staminaRegen'))) add('civilian-granted-stamina',c.name,'');
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
    'armor','resist','health','magic','spirit','toughness','movement','staminaMax','staminaRegen',
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
    const wrong=Object.keys(want).filter(k=>got[k]!==want[k]);
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
  const hasRider = u => (u.attacks||[]).some(a=>(a.effects||[]).length) || (u.triggers||[]).length>0;
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
  const carries = e => e.status!=null || e.stat!=null || e.value!=null || (e.multiple!=null);
  // verbs that are complete on their own — they need no status, stat or number
  const SELF_SUFFICIENT = new Set(['enter stealth','reveal / break stealth','grant Flight',
    'move yourself','move WITHOUT provoking','stabilise a downed ally','deal damage (type from the weapon)']);

  const walk = (u, where, list) => {
    for(const e of (list||[])){
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
      walk(u, a.name, a.effects);
      if(a.targets!=null && !SH.has(a.targets))
        add('attack-shape-is-not-in-the-vocabulary', u.name, a.name+': "'+a.targets+'"');
    }
    for(const tr of (u.triggers||[])){
      walk(u, tr.name||tr.hook, tr.effects);
      if(tr.targets!=null && !SH.has(tr.targets))
        add('trigger-shape-is-not-in-the-vocabulary', u.name, (tr.name||tr.hook)+': "'+tr.targets+'"');
    }
  }
}

const by={}; F.forEach(f=>(by[f.rule]=by[f.rule]||[]).push(f));
for(const [r,list] of Object.entries(by).sort((a,b)=>b[1].length-a[1].length)){
  console.log('\n### '+r+'  ('+list.length+')');
  list.slice(0,14).forEach(f=>console.log('   '+f.who.padEnd(26)+f.detail));
  if(list.length>14) console.log('   ... '+(list.length-14)+' more');
}
console.log('\nTOTAL FINDINGS: '+F.length);
