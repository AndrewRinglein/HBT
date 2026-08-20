;
const EV = D.battle.events;

const TOKEN = {};            // typeId -> Image
for (const k in D.tokens) { const i = new Image(); i.src = D.tokens[k].d; TOKEN[k] = i; }
const art = new Image(); art.src = D.art;

// Tokens are anchored at the FEET and stand ~70px tall, so row 0 needs headroom
// or the top rank renders off-canvas. Pad the stage and offset every hex.
const PAD_T = 78, PAD_B = 16, PAD_X = 10;
const W = D.field.w + PAD_X*2, H = D.field.h + PAD_T + PAD_B;
const board = document.getElementById('board'), unitsC = document.getElementById('units'),
      fxC = document.getElementById('fx');
// The canvases keep their pixel space (W×H drawing buffers) — CSS scales the
// picture uniformly to whatever width the log column leaves the stage, so the
// board shrinks on narrow screens instead of pushing the log below itself.
for (const c of [board, unitsC, fxC]) { c.width = W; c.height = H; c.style.width = '100%'; c.style.height = '100%'; }
const stage = document.getElementById('stage');
stage.style.aspectRatio = W + ' / ' + H;
stage.style.maxWidth = W + 'px';
const bx = board.getContext('2d'), ux = unitsC.getContext('2d');
const fx = createHexVFX(fxC);

// hex id (row*12+col) -> pixel centre, straight from the map data
const PX = new Map();
for (const h of D.field.hexes) PX.set(h.r*12 + h.c, {x:h.px + PAD_X, y:h.py + PAD_T});
const HEXW = D.field.hexW, HEXH = D.field.hexH;
const posOf = (hex) => PX.get(hex) || {x:0,y:0};

// ── state, folded from events ───────────────────────────────────────────────
let U, cursor, playing, timer, speed = 1, showGrid = true, showCosts = false;

function reset() {
  U = new Map(); cursor = 0; playing = false; pending = null; impact = null;
  fxC.getContext('2d').clearRect(0,0,W,H);
  // seed from unit.enter only — nothing else is allowed to invent a unit
  for (const e of EV) {
    if (e.type !== 'unit.enter') continue;
    const p = posOf(e.hex);
    U.set(e.actor, { id:e.actor, name:e.name, side:e.side, typeId:e.typeId,
      hex:e.hex, hp:e.hp, maxHp:e.maxHp, stamina:e.stamina, maxStamina:e.maxStamina,
      life:'standing', statuses:{}, x:p.x, y:p.y, tx:p.x, ty:p.y,
      shake:0, dx:0, dy:0, alpha:1, flash:0, face:1, pops:[] });
  }
  cursor = EV.filter(e => e.type === 'unit.enter').length;
  drawRoster(); buildLog(); markLog(cursor);
}

// hexVFX moves nothing itself — motion is delegated back through these hooks
const HOOKS = {
  onShake: u => { u.shake = 20; },
  onLunge: (u, dx, dy) => { u.dx = dx; u.dy = dy; },
  onFade:  (u, a) => { u.alpha = a; },
};
const anchor = (u) => ({ get x(){return u.x+u.dx}, get y(){return u.y+u.dy+34}, h:64,
                         set shake(v){u.shake=v}, set dx(v){u.dx=v}, set dy(v){u.dy=v},
                         set alpha(v){u.alpha=v} });
const tierOf = (n) => n <= 3 ? 'low' : n <= 6 ? 'med' : n <= 10 ? 'high' : 'super';
const VFXTYPE = { physical:'phys', magic:'mag', true:'true' };

// ── the render loop — continuous, independent of the event pump ─────────────
function frame() {
  ux.clearRect(0,0,W,H);
  const order = [...U.values()].sort((a,b) => a.y - b.y || a.id - b.id);
  for (const u of order) {
    // tween toward the logical hex
    u.x += (u.tx - u.x) * 0.28; u.y += (u.ty - u.y) * 0.28;
    if (u.shake > 0.4) u.shake *= 0.82; else u.shake = 0;
    u.dx *= 0.86; u.dy *= 0.86;
    if (u.life === 'dead' && u.alpha > 0.22) u.alpha = Math.max(0.22, u.alpha - 0.02);
    if (u.flash > 0) u.flash -= 0.06;

    const img = TOKEN[u.typeId]; if (!img || !img.complete) continue;
    const sx = u.x + u.dx + (u.shake ? (Math.random()-0.5)*u.shake : 0);
    const sy = u.y + u.dy;
    const sc = 0.46, w = img.width*sc, h = img.height*sc;

    ux.save(); ux.globalAlpha = u.alpha;
    // contact shadow — the tokens ship without one on purpose
    ux.fillStyle = 'rgba(0,0,0,.42)'; ux.beginPath();
    ux.ellipse(sx, sy+3, w*0.30, w*0.12, 0, 0, 7); ux.fill();
    // faction ring — also a runtime overlay by design
    ux.strokeStyle = u.side === 'hero' ? 'rgba(126,196,95,.85)' : 'rgba(209,102,92,.85)';
    ux.lineWidth = 2; ux.beginPath();
    ux.ellipse(sx, sy+3, w*0.33, w*0.14, 0, 0, 7); ux.stroke();
    // the Burning Zombie: same art as the zombie, identity carried by corpse-heat.
    // A pulsing ember ring plus drifting sparks — an overlay, like everything
    // else the tokens deliberately ship without.
    if (u.typeId === 'zombie-burning' && u.life === 'standing') {
      const pt = performance.now() / 1000;
      const pulse = 0.55 + 0.25 * Math.sin(pt * 3.1 + u.id);
      ux.strokeStyle = `rgba(255,140,40,${pulse})`;
      ux.lineWidth = 2.5; ux.beginPath();
      ux.ellipse(sx, sy+3, w*0.39, w*0.17, 0, 0, 7); ux.stroke();
      ux.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const ph = (pt * 0.55 + k / 3 + u.id * 0.17) % 1;
        const ex = sx + Math.sin((ph + k) * 12.9 + u.id) * w * 0.22;
        const ey = sy - ph * h * 0.85;
        ux.fillStyle = `rgba(255,${170 - ph * 90 | 0},60,${(1 - ph) * 0.8})`;
        ux.beginPath(); ux.arc(ex, ey, 1.6 + (1 - ph) * 1.3, 0, 7); ux.fill();
      }
      ux.globalCompositeOperation = 'source-over';
    }

    if (u.life !== 'standing') { ux.translate(sx, sy); ux.rotate(-Math.PI/2.4); ux.translate(-sx,-sy); }
    if (u.life === 'dead') ux.filter = 'grayscale(1)';
    if (u.face < 0) { ux.translate(sx*2, 0); ux.scale(-1, 1); }
    ux.drawImage(img, sx - w/2, sy - h, w, h);
    ux.restore();

    if (u.flash > 0) {
      ux.save(); ux.globalAlpha = u.flash; ux.globalCompositeOperation = 'lighter';
      ux.fillStyle = '#fff'; ux.beginPath(); ux.ellipse(sx, sy-h*0.5, w*0.4, h*0.35, 0,0,7); ux.fill(); ux.restore();
    }
    if (u.life !== 'dead') drawHealth(ux, u, sx, sy - h - 9);
    // a ring on the ground tinted by what the unit is standing in — cover is
    // invisible otherwise, and invisible cover is the thing that confuses a viewer
    const tid = D.field.terrainIds[u.hex];
    if (u.life === 'standing' && tid && tid !== 'terrain.open') {
      ux.save(); ux.globalAlpha = 0.85; ux.lineWidth = 2.5;
      ux.strokeStyle = TCOL[tid] || '#888';
      ux.beginPath(); ux.ellipse(sx, sy + 3, w*0.40, w*0.17, 0, 0, 7); ux.stroke(); ux.restore();
    }
    // floating damage numbers
    for (let i = u.pops.length-1; i >= 0; i--) {
      const p = u.pops[i]; p.t += 0.016;
      if (p.t > 1.1) { u.pops.splice(i,1); continue; }
      ux.save(); ux.globalAlpha = Math.max(0, 1 - p.t/1.1);
      ux.font = 'bold ' + (p.big ? 22 : 16) + 'px ui-sans-serif,sans-serif';
      ux.textAlign = 'center'; ux.lineWidth = 3; ux.strokeStyle = '#000';
      ux.fillStyle = p.col;
      const ty = sy - h - 16 - p.t*34;
      ux.strokeText(p.s, sx, ty); ux.fillText(p.s, sx, ty); ux.restore();
    }
  }
  requestAnimationFrame(frame);
}

function drawHealth(c, u, x, y) {
  const w = 34, h = 4;
  c.save();
  c.fillStyle = '#000c'; c.fillRect(x-w/2-1, y-1, w+2, h+2);
  c.fillStyle = u.side === 'hero' ? '#7ec45f' : '#d1665c';
  c.fillRect(x-w/2, y, w * Math.max(0, u.hp/u.maxHp), h);
  const st = Object.keys(u.statuses).filter(k => u.statuses[k] > 0);
  st.forEach((k, i) => { c.fillStyle = STCOL[k] || '#aaa';
    c.beginPath(); c.arc(x - w/2 + 3 + i*7, y + 9, 2.6, 0, 7); c.fill(); });
  c.restore();
}
const STCOL = { 'status.poison':'#8ed14f', 'status.burn':'#ff9d3c', 'status.regeneration':'#7cd9a6' };
// hexVFX's style table says 'regen'; the engine says 'status.regeneration'.
// Without this map the fallback silently painted regeneration poison-green.
const STVFX = (id) => { const n = id.replace('status.',''); return n === 'regeneration' ? 'regen' : n; };

// MAP-01's own legend colours, so the overlay agrees with map.json
const TCOL = {
  'terrain.open':'#6E7C34', 'terrain.forest':'#2C3A22', 'terrain.rocky':'#969694',
  'terrain.hills':'#CEBA28', 'terrain.rocky-hills':'#92683A', 'terrain.water':'#2C6084',
  'terrain.obstacle':'#805430',
};
const TNAME = {
  'terrain.open':'Flatland', 'terrain.forest':'Forest', 'terrain.rocky':'Rocky',
  'terrain.hills':'Hill', 'terrain.rocky-hills':'Rocky Hill', 'terrain.water':'Water',
  'terrain.obstacle':'Obstruction',
};
// Effects are DERIVED from the engine's own tables at build time, never typed here.
// They were hand-written once and immediately disagreed with the rules when a move
// cost changed — a legend that can drift from the thing it describes is worse than
// no legend, because it is believed.
const TEFFECT = {};
for (const row of D.field.table) {
  const bits = [row.passable ? `move ${row.moveCost}` : 'impassable'];
  for (const [k, lab] of [['accuracy','acc'],['reach','reach'],['dodge','dodge'],['armor','armor']]) {
    if (row[k]) bits.push(`${row[k] > 0 ? '+' : ''}${row[k]} ${lab}`);
  }
  TEFFECT[row.id] = bits.join(' · ');
}

function drawGrid() {
  bx.clearRect(0,0,W,H);
  bx.fillStyle = '#0b0c0e'; bx.fillRect(0,0,W,H);
  if (art.complete) {
    // headroom above row 0: a soft fade out of the map edge, not a hard letterbox
    const g = bx.createLinearGradient(0, 0, 0, PAD_T);
    g.addColorStop(0, '#0b0c0e'); g.addColorStop(1, '#2a3016');
    bx.fillStyle = g; bx.fillRect(0, 0, W, PAD_T + 2);
    bx.drawImage(art, PAD_X, PAD_T, D.field.w, D.field.h);
  }
  if (!showGrid && !showCosts) return;
  const w = HEXW/2, hh = HEXH/2, q = hh/2;
  for (const h of D.field.hexes) {
    const id = D.field.terrainIds[h.r * 12 + h.c];
    const cx = h.px + PAD_X, cy = h.py + PAD_T;
    const path = () => { bx.beginPath();
      bx.moveTo(cx, cy-hh); bx.lineTo(cx+w, cy-q); bx.lineTo(cx+w, cy+q);
      bx.lineTo(cx, cy+hh); bx.lineTo(cx-w, cy+q); bx.lineTo(cx-w, cy-q); bx.closePath(); };
    if (showGrid) {
      path();
      bx.fillStyle = (TCOL[id] || '#888') + '4d';   // 30% — tint, don't hide the art
      bx.fill();
      bx.lineWidth = 1;
      bx.strokeStyle = id === 'terrain.open' ? 'rgba(255,255,255,.10)' : (TCOL[id] || '#888') + 'cc';
      bx.stroke();
    }
    if (showCosts) {
      const c = D.field.moveCost[h.r * 12 + h.c];
      bx.font = 'bold 13px ui-sans-serif,sans-serif'; bx.textAlign = 'center';
      bx.lineWidth = 3; bx.strokeStyle = '#000c';
      bx.fillStyle = c >= 99 ? '#ff8f7d' : c === 1 ? '#9fb28a' : c === 2 ? '#e8d27a' : '#7fb2e0';
      const label = c >= 99 ? '×' : String(c);
      bx.strokeText(label, cx, cy + 5); bx.fillText(label, cx, cy + 5);
    }
  }
}

function drawLegend() {
  const present = new Map();
  for (const id of D.field.terrainIds) present.set(id, (present.get(id) ?? 0) + 1);
  legend.innerHTML = [...present.entries()].sort((a,b) => b[1]-a[1]).map(([id, n]) =>
    `<div class="lg"><i style="background:${TCOL[id]||'#888'}"></i>` +
    `<span class="nm2">${TNAME[id] ?? id} <span class="ef">${n}</span></span>` +
    `<span class="ef">${TEFFECT[id] ?? ''}</span></div>`).join('');
}

// ── the event pump ──────────────────────────────────────────────────────────
// Events carry ORDER, not duration. The clock lives here, in the viewer, and the
// engine knows nothing about it — which is why it is a plain table.
const DUR = {
  'unit.enter':0, 'turn.begin':420, 'phase.begin':120, 'moved':125,
  'move.begin':60, 'attack.declared':60, 'attack.hit':0, 'attack.miss':320,
  'damage.applied':300, 'life.downed':420, 'life.dead':520, 'power.used':60,
  'status.applied':260, 'status.reduced':180, 'activation.idle':200,
  'heal.applied':260,
  'ai.tookHighGround':140, 'battle.end':600,
};

let pending = null;   // an attack.declared waiting for its hit/miss
let impact = null;    // the impact half of a swing, held until damage lands

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Play the travel half of an attack and leave the impact half in `impact`.
 * Melee has no projectile, so the wait is hexVFX's own wind-up + drive (130+190ms)
 * and playMeleeAttack draws its own impact on schedule.
 */
async function swing(u, t, dec, tier) {
  const type = VFXTYPE[dec.damageType] || 'phys';
  if (dec.kind === 'melee') {
    playMeleeAttack(fx, anchor(u), anchor(t), type, tier, HOOKS);
    await wait(320);
  } else if (dec.damageType === 'magic') {
    await playMagicBoltFlight(fx, anchor(u), anchor(t), tier);
    impact = () => { HOOKS.onShake(t); playMagicBoltImpact(fx, anchor(t), tier); };
  } else {
    await playArrowFlight(fx, anchor(u), anchor(t));
    impact = () => { HOOKS.onShake(t); playArrowImpact(fx, anchor(t)); };
  }
}

async function apply(e) {
  const u = e.actor != null ? U.get(e.actor) : null;
  const t = e.target != null ? U.get(e.target) : null;

  switch (e.type) {
    case 'moved': {
      const p = posOf(e.to);
      if (u) { u.face = p.x >= u.tx ? 1 : -1; u.tx = p.x; u.ty = p.y; u.hex = e.to; }
      break;
    }
    case 'attack.declared': pending = e; break;

    // A projectile takes ~700ms to fly. If the health bar drops and the number pops
    // the instant the bolt LAUNCHES, the bolt then lands on a target that has
    // already taken the damage — and it reads as "the mage hit for nothing".
    // So the swing is split at the seam hexVFX provides: await the flight here,
    // and let damage.applied play the impact.
    case 'attack.miss':
      if (u && t && pending) {
        u.face = t.x >= u.x ? 1 : -1;
        await swing(u, t, pending, 'low');
        t.pops.push({ s:'miss', col:'#cfcabb', t:0 });
        if (impact) { impact(); impact = null; }
      }
      pending = null; break;

    case 'attack.hit': {
      if (!u || !t || !pending) break;
      u.face = t.x >= u.x ? 1 : -1;
      await swing(u, t, pending, tierOf(pending.damageOnHit || 0));
      break;
    }

    case 'power.used':
      if (u && t) {
        u.face = t.x >= u.x ? 1 : -1;
        await playFireballFlight(fx, anchor(u), anchor(t), 'high');
        const tt = t;
        impact = () => playFireballExplosion(fx, anchor(tt), 'high');
      }
      break;

    case 'damage.applied':
      if (t) {
        if (impact) { impact(); impact = null; }
        t.hp = e.hpAfter; t.shake = 22; t.flash = 0.55;
        const total = e.amount + (e.overkill || 0);
        t.pops.push({ s:'-'+total, col: e.crit ? '#ffd257' : '#ff8f7d', t:0, big: !!e.crit || total >= 7 });
        if (e.resisted) t.pops.push({ s:`resist ${e.resisted}`, col:'#9fb6d9', t:-0.25 });
        drawRoster();
      }
      pending = null; break;

    case 'heal.applied': if (t) { t.hp = e.hpAfter; t.pops.push({s:'+'+e.amount,col:'#8ed14f',t:0}); drawRoster(); } break;

    case 'status.applied':
      if (t) { t.statuses[e.statusId] = e.after;
        playStatusApply(fx, anchor(t), STVFX(e.statusId));
        // The Burning Zombie's sear: corpse-heat answering the blow. Give the
        // retaliation its own read — a pop on the victim naming the source.
        if (e.causeId === 'trigger.zombie-burning.sear') t.pops.push({ s:'seared!', col:'#ff9d3c', t:0 });
        drawRoster(); }
      break;
    case 'status.reduced':
      if (t) { t.statuses[e.statusId] = e.after;
        if (e.causeId === 'terrain.water') {
          // the river takes it: frost-blue ripple + a wash pop, not a damage tick
          playStatusTick(fx, anchor(t), 'frost');
          t.pops.push({ s:'washed −1 '+e.statusId.replace('status.',''), col:'#8fd0ff', t:0 });
        } else {
          playStatusTick(fx, anchor(t), STVFX(e.statusId));
        }
        drawRoster(); }
      break;
    case 'status.expired': if (t) { delete t.statuses[e.statusId]; drawRoster(); } break;

    case 'life.downed': if (t) { t.life = 'downed'; drawRoster(); } break;
    case 'life.dead':
      if (t) {
        t.life = 'dead';
        const cause = String(e.causeId||'').includes('poison') ? 'poison'
                    : String(e.causeId||'').includes('burn') ? 'burn'
                    : String(e.causeId||'').includes('power.') ? 'magic' : 'melee';
        playDeath(fx, anchor(t), cause, HOOKS);
        drawRoster();
      }
      break;
  }
}

async function stepOnce() {
  if (cursor >= EV.length) { playing = false; syncBtns(); return false; }
  const e = EV[cursor++];
  await apply(e);
  markLog(cursor);
  const d = (DUR[e.type] ?? 0) / speed;
  if (d) await new Promise(r => timer = setTimeout(r, d));
  return true;
}

async function loop() {
  while (playing) { const more = await stepOnce(); if (!more) break; }
  syncBtns();
}

// ── side panel ──────────────────────────────────────────────────────────────
// Display names only — the engine's log names stay untouched (Law 12: the log
// is the record). The Burning Zombie deserves to be READ as one everywhere.
const dispName = (u) => u.typeId === 'zombie-burning' ? u.name.replace(/^Zombie/, 'Burning Zombie') : u.name;
function drawRoster() {
  for (const [side, el] of [['hero', heroes], ['enemy', enemies]]) {
    el.innerHTML = [...U.values()].filter(u => u.side === side).map(u => {
      const pct = Math.max(0, u.hp / u.maxHp * 100);
      const st = Object.keys(u.statuses).filter(k => u.statuses[k] > 0)
        .map(k => `<b style="background:${STCOL[k]||'#aaa'}" title="${k} ${u.statuses[k]}"></b>`).join('');
      return `<div class="u ${side} ${u.life==='dead'?'dead':u.life==='downed'?'down':''}">
        <span class="nm">${dispName(u)}</span>
        <span class="bar"><i style="width:${pct}%"></i></span>
        <span class="st">${st}</span>
        <span class="hp">${u.life==='dead'?'—':u.hp+'/'+u.maxHp}</span></div>`;
    }).join('');
  }
  const b = D.battle;
  hdr.innerHTML = `<div class="meta">seed <b>replicate ${b.seed.replicate}</b> · <b>${b.seed.mapId}</b> ·
    <b>${b.seed.enemyCount}</b> enemies<br>engine <b>${b.engineCommit}</b> · outcome
    <b>${b.outcome}</b> in <b>${b.turns}</b> turns<br>
    <span style="color:#8b8778">a battle is a seed, not a recording — this replays from the log the engine emitted</span></div>`;
}

const LOGLINE = [];
function buildLog() {
  const nm = new Map([...U.values()].map(u => [u.id, dispName(u)]));
  log.innerHTML = '';
  LOGLINE.length = 0;
  EV.forEach((e, i) => {
    let s = null, cls = '';
    const who = id => nm.get(id) ?? '?';
    if (e.type === 'turn.begin') { s = `── TURN ${e.turn}`; cls='t'; }
    else if (e.type === 'move.begin') s = `  ${who(e.actor)} moves ${e.hexes}`;
    else if (e.type === 'moved' && e.terrain !== 'terrain.open')
      s = `      into ${TNAME[e.terrain] ?? e.terrain} (cost ${e.cost})`;
    else if (e.type === 'attack.declared') s = `  ${who(e.actor)} → ${who(e.target)} (${e.attackId.replace('attack.','')}, ${e.hitChance}%)`;
    else if (e.type === 'attack.miss') s = `    miss (rolled ${e.roll})`;
    else if (e.type === 'damage.applied') { s = `    −${e.amount+(e.overkill||0)} ${e.damageType} → ${who(e.target)} ${e.hpBefore}→${e.hpAfter}${e.resisted ? ` (${e.resisted} resisted)` : ''}`; cls='d'; }
    else if (e.type === 'heal.applied') { if ((e.amount|0) > 0) { s = `    +${e.amount} heals ${who(e.target)} ${e.hpBefore}→${e.hpAfter}${e.halvedBy ? ' (halved by burn)' : ''}`; cls='h'; } }
    else if (e.type === 'status.reduced' && e.causeId === 'terrain.water') s = `    the river takes 1 ${e.statusId.replace('status.','')} off ${who(e.target)}`;
    else if (e.type === 'status.applied' && e.causeId === 'trigger.zombie-burning.sear') s = `    SEAR — ${who(e.target)} takes 1 burn for striking corpse-heat`;
    else if (e.type === 'status.applied') s = `    ${e.statusId.replace('status.','')} ${e.after} on ${who(e.target)}`;
    else if (e.type === 'power.used') s = `  ${who(e.actor)} casts ${e.name}`;
    else if (e.type === 'life.downed') { s = `  *** ${who(e.target)} goes down`; cls='k'; }
    else if (e.type === 'life.dead') { s = `  *** ${who(e.target)} dies`; cls='k'; }
    else if (e.type === 'activation.idle') s = `  ${who(e.actor)} holds (${e.reason})`;
    else if (e.type === 'ai.tookHighGround') s = `  ${who(e.actor)} takes the high ground`;
    else if (e.type === 'battle.end') { s = `>>> ${e.outcome}`; cls='t'; }
    if (s !== null) { const d = document.createElement('div'); d.className = cls; d.textContent = s;
                      log.appendChild(d); LOGLINE.push({ i, el:d }); }
  });
}
function markLog(c) {
  let last = null;
  for (const l of LOGLINE) { l.el.classList.remove('now'); if (l.i < c) last = l; }
  if (last) {
    last.el.classList.add('now');
    // Scroll the log BOX, not the page. scrollIntoView() walks up every scrollable
    // ancestor including <html>, so during playback the whole page crept upward and
    // the board drifted off screen — visible only when watching, never in a test.
    const box = log, el = last.el;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - el.offsetHeight) {
      box.scrollTop = top - box.clientHeight + el.offsetHeight * 3;
    }
  }
  pos.textContent = `event ${Math.min(c, EV.length)} / ${EV.length}`;
}

// ── controls ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const heroes = $('heroes'), enemies = $('enemies'), log = $('log'), hdr = $('hdr'), pos = $('pos'),
      legend = $('legend');
function syncBtns() { $('play').textContent = playing ? '❚❚ Pause' : '▶ Play'; }
$('play').onclick = () => { playing = !playing; syncBtns(); if (playing) loop(); else clearTimeout(timer); };
$('step').onclick = () => { if (!playing) stepOnce(); };
$('restart').onclick = () => { playing = false; clearTimeout(timer); reset(); syncBtns(); };
$('grid').onclick = (ev) => { showGrid = !showGrid; ev.target.classList.toggle('on', showGrid); drawGrid(); };
$('costs').onclick = (ev) => { showCosts = !showCosts; ev.target.classList.toggle('on', showCosts); drawGrid(); };
$('spd').oninput = (ev) => { speed = ev.target.value / 100; $('spdv').textContent = speed.toFixed(1)+'×'; };

art.onload = () => { drawGrid(); };
reset(); drawLegend(); drawGrid(); frame();
$('grid').classList.add('on');
</script>
</body></html>
