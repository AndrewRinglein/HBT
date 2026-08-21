import fs from 'fs';
const G='/home/claude/hbt/content/gen/';
const FILES=['weapons.json','armor-enchants.json','gear.json','settled-items.json','warrior.json','ranger.json','rogue.json','mage.json','priest.json','paladin.json','civilian.json'];
const DB={}; for(const f of FILES) DB[f]=JSON.parse(fs.readFileSync(G+f,'utf8'));
const index={};
for(const f of FILES){ const d=DB[f];
  for(const k of Object.keys(d)) if(Array.isArray(d[k])) d[k].forEach(e=>{ if(e&&e.id) index[e.id]={e,f}; }); }

let n=0;
function patch(id, note, fn){
  const hit=index[id]; if(!hit){ console.log('!! MISSING '+id); return; }
  fn(hit.e);
  const tag=' | 2026-08-17 design pass: '+note;
  hit.e.source = hit.e.source ? (hit.e.source+tag) : tag.slice(3);
  n++;
}

/* ============================================================
   JOB 1 — STAT BLENDING
   ============================================================ */

// --- Strength + Armor: the heavy-blade family -------------------------------
patch('attack.war-hammer.skullsplitter',
 'blended damage onto Strength + Armor and dropped the flat +3, so the heaviest, slowest fighter hits hardest instead of just hitting for a bigger printed number',
 a=>{ a.damage=0; a.addsStat='armor';
  a.description="Damage equals your Strength plus your Armor. The head is only as heavy as the person swinging it is willing to stand still, so the more plate you are carrying the harder it lands."; });

patch('attack.holy-shield.aegis-slam',
 'blended damage onto Strength + Armor, which is what a shield attack should have been scaling off all along',
 a=>{ a.damage=0; a.addsStat='armor';
  a.description="Damage equals your Strength plus your Armor: the shield arrives with everything you are wearing behind it."; });

patch('attack.tomb-sentinels-blade.grave-warden',
 'blended damage onto Strength + Armor and removed the unconditional onAttack rider, folding it into the base numbers',
 a=>{ a.damage=1; a.addsStat='armor'; a.triggers=[]; a.accuracy=5;
  a.description="Damage equals your Strength plus your Armor, and a further +1. A slow, heavy swing that rewards standing your ground in armour — without needing the game to check whether you moved."; });

// --- Strength + Magic: spellblades, and the Mage's melee option -------------
patch('attack.duel-runeblades.rune-cross',
 'made the runeblade an actual spellblade — damage blends Strength with the party Magic and lands as magic damage, which gives a Mage a melee attack worth holding',
 a=>{ a.damage=0; a.addsStat='magic'; a.damageType='magic';
  a.description="The runes take light on the cross-cut: damage equals your Strength plus the party's Magic, and it lands as magic damage. Twin Cut is still the cheap physical option; this is the one a caster picks the weapon up for."; });

patch('attack.cursed-sand-blade.the-cursed-swing',
 'blended damage onto Strength + Magic and moved it to magic damage, so the curse is doing the work instead of a flat +4',
 a=>{ a.damage=1; a.addsStat='magic'; a.damageType='magic';
  a.description="Damage equals your Strength plus the party's Magic, and a further +1, carried as magic damage — the sand goes where the curse tells it and neither of them cares how strong your arm is on its own."; });

// --- Magic + Spirit: a caster's melee attack --------------------------------
patch('attack.orb-of-the-soul-stealer.soul-tap',
 'turned the cheap tap into a melee attack whose damage blends Magic + Spirit, so a Mage or Priest finally has something to do in reach that spends the stats they already have',
 a=>{ a.range='melee'; a.targets='one enemy in melee reach'; a.tags=['staff','melee']; a.damage=0; a.stat='magic'; a.addsStat='spirit';
  a.description="You close your hand on it. Damage equals the party's Magic plus the party's Spirit — a melee attack built entirely out of caster stats, and the reason a Priest will carry a Mage's orb."; });

// --- Precision + Spirit and friends: the priest weapons ---------------------
patch('attack.holy-texts.verse',
 'the priest weapon now reads damage = Precision + Spirit, the blend the guide names, instead of Spirit alone',
 a=>{ a.stat='precision'; a.damage=0; a.addsStat='spirit';
  a.description="Damage equals your Precision plus the party's Spirit. A priest is both halves of that and this is the weapon that pays for both."; });

patch('attack.book-of-exorcisms.rite-of-expulsion',
 'blended the rite onto Spirit + Resist, so warding and expelling are the same stat investment',
 a=>{ a.damage=0; a.addsStat='resist';
  a.description="Damage equals the party's Spirit plus your own Resist: you push with the same wards that keep it off you. As an area effect it does not roll and cannot crit."; });

patch('attack.scepter-of-salvation.rebuke',
 'blended the rebuke onto Spirit + Magic so a mixed caster party gets full value out of a priest signature',
 a=>{ a.damage=0; a.addsStat='magic';
  a.description="Damage equals the party's Spirit plus the party's Magic. The scepter does not much care which of the two you brought, only that somebody did."; });

patch('attack.hammer-of-justice.sentence',
 'blended the finisher onto Strength + Spirit and cut the flat +4, so a Paladin swinging it in a party with a Priest hits like the name promises',
 a=>{ a.damage=1; a.addsStat='spirit';
  a.description="Damage equals your Strength plus the party's Spirit, and a further +1. The sentence is only ever as heavy as the faith standing behind it."; });

// --- Precision + Strength: the ranged blends --------------------------------
patch('attack.siege-crossbow.siege-shot',
 'blended onto Precision + Strength and removed the "on a Turn in which you moved" rider, which is a condition the engine cannot check',
 a=>{ a.damage=1; a.addsStat='strength'; a.triggers=[];
  a.description="Damage equals your Precision plus your Strength, and a further +1. The span has to be cranked before it will shoot, and a marksman who never lifted anything heavy will never get the full pull out of it."; });

patch('attack.grappling-harpoon.hurl',
 'blended onto Precision + Strength — aim puts it on the target and shoulder puts it through',
 a=>{ a.damage=0; a.addsStat='strength';
  a.description="Damage equals your Precision plus your Strength. Aim puts it on the target; shoulder puts it through."; });

// --- Rogue: both halves of the class ----------------------------------------
patch('attack.demonic-shiv.the-devils-favour',
 'blended onto Strength + Precision so the signature rogue knife counts both stats a Rogue actually buys',
 a=>{ a.damage=0; a.addsStat='precision';
  a.description="Damage equals your Strength plus your Precision, as true damage. The favour is that it counts both hands of what a Rogue is instead of making you choose."; });

// --- Strength + Resist -------------------------------------------------------
patch('attack.stormforged-blade.thunder-strike',
 'blended onto Strength + Resist, so the blade that carries lightning wants a wielder who can hold it',
 a=>{ a.damage=0; a.addsStat='resist';
  a.description="The blade earths the storm through you before it lets go of it: damage equals your Strength plus your Resist."; });

// --- blends written as power modifiers --------------------------------------
patch('power.mystic.guidance',
 'rebuilt a flat +1/+1 ally buff into the spellblade modifier — the ally\'s sword attacks add the party Magic for the rest of the Battle',
 p=>{ p.description="For the rest of the Battle that ally's SWORD attacks add the party's Magic to their damage. You do not lend them strength, you lend them the spell: a Warrior with a longsword and a Mystic behind him is swinging for Strength plus Magic every Turn.";
  p.modifies={tags:['sword'],scope:'rest-of-battle',addsStat:'magic'}; p.cooldown=4; p.tags=['sword']; });

patch('power.war-priest.smite-evil',
 'rebuilt the flat +2 Strength into a Spirit blend, which is the melee attack a Priest should want and the Priest stat it should spend',
 p=>{ p.description="Your next MELEE attack adds the party's Spirit to its damage and deals true damage, and a further 3 against undead or demon.";
  p.modifies={tags:['melee'],scope:'next-attack',addsStat:'spirit'}; });

patch('power.champion.righteous-blow',
 'rebuilt a power that was just an attack into a next-attack Armor blend, so it scales with every weapon and every breastplate you will ever find',
 p=>{ p.description="Your next MELEE attack gains +5 Crit and adds your Armor to its damage; if it hits, heal 2.";
  p.targets='self'; p.modifies={tags:['melee'],scope:'next-attack',addsStat:'armor',statModifiers:{crit:5}}; });

patch('power.wayfinder.switch-to-melee',
 'the stance now blends Precision into your melee damage instead of handing out a flat +2 Strength, and the -2 Precision it already charged is now a real cost against its own payoff',
 p=>{ p.description="Stance: for the rest of the Battle your MELEE attacks add your Precision to their damage, you gain +5 Dodge, and you take -2 Precision and -1 Reach. The Precision you give up comes straight off the melee damage you just bought, which is the whole trade.";
  p.modifies={tags:['melee'],scope:'rest-of-battle',addsStat:'precision',statModifiers:{dodge:5,precision:-2,reach:-1}}; });

patch('power.shadowbound.void-strike',
 'the Magic it already added is now written into the modifies block as an explicit stat blend rather than living only in prose',
 p=>{ p.description="Your next DAGGER attack gains +1 Strength, adds the party's Magic to its damage, and deals true damage instead of physical.";
  p.modifies={tags:['dagger'],scope:'next-attack',addsStat:'magic',statModifiers:{strength:1}}; });

/* ============================================================
   JOB 2 — CONSUMING THE TARGET'S OWN STATUS
   ============================================================ */

// --- WEAK on brawl: the martial artist --------------------------------------
patch('specialty.wild-shaper',
 'gave the branch the brawl/Weak identity — its own Primal Roar hands out the Weak and its bare hands cash it in; the flat heal-2 moved out of the way for it',
 s=>{ s.triggers=[{hook:'onHit',effect:"your brawl attacks add the target's Weak to their damage. They READ it: the stacks stay on the target and keep working"}];
  s.intent="You gave up half of what a caster is for teeth. You put the Weak on them yourself and then you hit the soft place you just made — nothing else in the game finds a wound this fast."; });

patch('power.wild-shaper.claw',
 'the branch reads Weak; this power tears it out instead — the consuming, higher-tier version of the same family',
 p=>{ p.description="Your next BRAWL attack gains +2 Strength, can crit, and applies 2 Bleed on hit. It does not read the target's Weak the way the branch does — it CONSUMES it: add the target's Weak to the damage and remove every stack.";
  p.modifies={tags:['brawl'],scope:'next-attack',statModifiers:{strength:2},addsTargetStatus:{status:'weak',consumes:true}}; });

patch('attack.iron-claws.eviscerate',
 'brawl attack now adds the target\'s Weak, reading it rather than spending it, which is the tier-1 entry to the martial-artist family',
 a=>{ a.damage=1; a.addsTargetStatus={status:'weak',consumes:false};
  a.description="Damage is your Strength +1, plus the Weak already on the target. It READS the Weak — the stacks are left where they are, so the next hit finds them too."; });

patch('attack.pharaohs-gauntlets.the-kings-hands',
 'the tier-3 brawl signature now CONSUMES the target\'s Weak, the dramatic end of the family the iron claws start',
 a=>{ a.damage=2; a.addsTargetStatus={status:'weak',consumes:true};
  a.description="Two hits. Damage is your Strength +2, plus every stack of Weak on the target — and it CONSUMES them, all of it spent in one grip. Against something nobody has softened it is an ordinary pair of gauntlets."; });

// --- BURN on magic attacks ---------------------------------------------------
patch('power.fire-master.fireball',
 'the blast now cashes in the Burn already on each unit and consumes it, which is what makes a burning-terrain branch pay twice',
 p=>{ p.description="Deal 2 + Magic magic damage to every unit in the blast, plus every stack of Burn that unit is already carrying — the blast CONSUMES that Burn — and then set all seven hexes burning 2 for two Turns. It does not roll to hit, so it cannot crit; Resist reduces both the hit and each burn tick, and allies caught in it burn too. Thrown into a field you set alight last Turn, it is the biggest number this class produces."; });

patch('attack.apprentice-wand.surge',
 'the wand now adds the Burn already on the target, reading it — the cheap, safe tier-1 version of the family',
 a=>{ a.damage=1; a.addsTargetStatus={status:'burn',consumes:false};
  a.description="Damage is the party's Magic +1, plus the Burn already on the target. It READS the Burn and leaves it burning, so the stack it found is still there next Turn."; });

// --- FROST on magic attacks ---------------------------------------------------
patch('attack.wraith-touched-staff.grasp',
 'the grasp now closes on the target\'s Frost and takes it, giving the frost side of the caster roster a payoff attack',
 a=>{ a.damage=1; a.addsTargetStatus={status:'frost',consumes:true};
  a.description="Damage is the party's Magic +1, plus every stack of Frost on the target — and the grasp CONSUMES it, closing on the cold and taking it away with the hand. Shattering the Frost also gives up the physical amplification it was providing, which is the decision."; });

patch('power.storm-caller.storm-surge',
 'the surge now adds each target\'s Frost, reading it, so the branch that stands next to frost hexes gets paid for them',
 p=>{ p.description="Every enemy within 3 hexes takes 2 + Magic magic damage plus the Frost it is already carrying, and 1 Stun. It READS the Frost and leaves it in place, so the physical amplification survives for whoever swings next. Area — no roll, no crit, Resist applies to the damage."; });

// --- BLEED on physical attacks ------------------------------------------------
patch('attack.bloody-axe.butcher',
 'the axe now opens the wound that is already there — it consumes the target\'s Bleed, which is exactly what the weapon is named for',
 a=>{ a.damage=2; a.addsTargetStatus={status:'bleed',consumes:true};
  a.description="Damage is your Strength +2, plus every stack of Bleed on the target, which it CONSUMES — you find the cut that is already open and put the whole axe into it. It applies 3 fresh Bleed afterwards, so the clock restarts from nothing."; });

patch('attack.shadow-dagger.from-behind',
 'the knife now adds the target\'s Bleed, reading it, so a Nightblade party has something that cashes in without turning the clock off',
 a=>{ a.damage=2; a.addsTargetStatus={status:'bleed',consumes:false};
  a.description="Damage is your Strength +2, plus the Bleed already on the target. It READS the Bleed — every stack stays, still ticking, and Resist never touched any of it."; });

patch('attack.demon-whip.hellcoil',
 'the tier-3 whip now consumes the Bleed on each of the two targets it reaches',
 a=>{ a.damage=2; a.addsTargetStatus={status:'bleed',consumes:true};
  a.description="Two targets. Against each, damage is your Strength +2 plus every stack of Bleed that target is carrying, and the coil CONSUMES it. It leaves 3 Burn behind in its place."; });

// --- POISON ---------------------------------------------------------------------
patch('attack.poison-throwing-knives.venom-fan',
 'the fan now drinks the Poison already in each target it hits, the poison member of the status-consuming family',
 a=>{ a.damage=0; a.addsTargetStatus={status:'poison',consumes:true};
  a.description="Three targets. Against each, damage is your Precision plus every stack of Poison already in it — and the fan CONSUMES that Poison, calling the whole slow dose due at once. It leaves 2 fresh Poison in each on hit, so the clock starts again from a much smaller number."; });

// --- STUN ------------------------------------------------------------------------
patch('attack.iron-mace.crush',
 'the mace now adds the target\'s Stun, reading it — you hit them while they are still seeing stars',
 a=>{ a.damage=1; a.addsTargetStatus={status:'stun',consumes:false};
  a.description="Damage is your Strength +1, plus the Stun on the target. It READS the Stun and leaves it: you hit them while they are still seeing stars and they go on seeing them."; });

/* ============================================================
   JOB 3 — STEALTH AND REVEAL
   ============================================================ */

patch('item.phantoms-mantle',
 'stealth rewritten to the settled definition — no duration clause, since stealth ends when you attack or use a power and never when you move',
 i=>{ i.triggers=[{hook:'passive',effect:'+5 Dodge'},
   {hook:'onKill',effect:'enters stealth: you cannot be seen and cannot be targeted by an attack. It breaks the moment you use an attack or a power — moving does not break it — and area effects, terrain and auras still reach you'}]; });

patch('power.torchbearer.raise-the-torch',
 '"cannot be attacked from stealth" is not a rule in this game — stealth breaks the instant its holder attacks — so the torch does the thing torches do and reveals instead',
 p=>{ p.description="Stance: for the rest of the Battle every ally within 3 hexes has +2 Vision, and the torch reveals stealthed units within 3 hexes of you — their stealth breaks and they can be targeted like anything else. It lapses the moment you go down, which is the whole tension of bringing you."; });

patch('power.torchbearer.flare',
 'reveal rewritten in the settled wording — it strips stealth from units in a radius rather than granting some standing see-through-stealth sense',
 p=>{ p.description="Light a hex within 6 and it burns for the rest of the Battle. It reveals stealthed units within 3 hexes of it — their stealth breaks — nothing within 3 hexes is hidden by darkness or fog, and every unit inside loses 5 Dodge."; });

patch('power.archivist.forbidden-tome',
 'reveal rewritten as a one-shot strip of stealth plus a lasting answer to darkness and fog, instead of a permanent map-wide anti-stealth field',
 p=>{ p.description="Take 3 true damage and read anyway: every enemy on the map is revealed and every one of them in stealth has it broken, and for the rest of the Battle darkness and fog hide nothing from you."; });

patch('power.mystic.second-sight',
 'an attack cannot strip stealth from its target, because a stealthed unit cannot be targeted by an attack in the first place — the reveal moved onto the casting',
 p=>{ p.description="Take 4 true damage. It reveals stealthed units within your Vision as you cast it — their stealth breaks — you gain +2 Vision for the rest of the Battle, and for the rest of the Battle your staff and ranged attacks have +10 Accuracy. The gamble is the map: in darkness, fog or against a hidden enemy the sight is the best thing you do all fight, and in an open field you have paid 4 Health for +10 Accuracy, which past 100 is +2.5 Crit."; });

patch('specialty.assassin',
 'stealth rewritten to the settled definition: it breaks on an attack OR a power, never on movement, and the invented "breaks when you gain Burn" clause is gone',
 s=>{ s.triggers=[{hook:'startOfBattle',effect:'you begin the Battle in stealth: you cannot be seen and cannot be targeted by an attack. Area effects, terrain and auras all still reach you. It breaks the moment you use an attack or a power, and whenever a reveal effect finds you — moving never breaks it'}]; });

patch('specialty.shadowdancer',
 '"move 2 hexes without breaking it" implied movement breaks stealth, which it never does — reworded so the branch reads the rule correctly',
 s=>{ s.triggers=[{hook:'onKill',effect:'immediately enter stealth, then move up to 2 hexes. Movement never breaks stealth; only using an attack or a power does'}]; });

patch('power.shadowdancer.vanish-in-shadow',
 'stealth rewritten to the settled definition and the invented Burn clause removed; using this power is what grants the stealth, so it is the next attack or power that ends it',
 p=>{ p.description="Immediately enter stealth: you cannot be seen and cannot be targeted by an attack. Area effects, terrain and auras still reach you. It breaks the moment you use an attack or another power — not when you move — and whenever a reveal effect finds you. Free, and usable even while an enemy is adjacent."; });

patch('specialty.demonic-ward',
 'the see-through-stealth half was a battle-start snapshot, which shows nothing at deployment; rebuilt as an aura, which is checked continuously, and written as a proper reveal',
 s=>{ s.triggers=[{hook:'aura',effect:'AURA radius 2 — you and every ally inside have +1 Resist and see every demon and undead within your Vision through darkness and fog; any stealthed demon or undead within your Vision is revealed and its stealth breaks'}]; });

for(const f of FILES) fs.writeFileSync(G+f, JSON.stringify(DB[f],null,1));
console.log('patched rows:', n);
