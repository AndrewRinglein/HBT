// ============================================================
// hexVFX.js — Combat VFX for the Hex game
//
// Same visual language as hellVFX.js (dark-fantasy palette, additive
// glow, per-frame particles, phase choreography) re-grounded for an
// isometric hex battlefield.
//
// KEY DIFFERENCE FROM hellVFX.js
// The TCG version attached a canvas per card. Here there is ONE
// screen-space overlay canvas over the whole scene, and effects are
// addressed by UNIT, not by DOM element:
//
//   unit = { x, y, h }
//     x, y : screen position of the unit's FEET (ground contact point)
//     h    : body height in px (~120-160 for medium units)
//
// Because effects sit on a ground plane, impacts use ground ellipses
// (foreshortened by ISO_SQUASH) rather than circles, and anything that
// "lands" resolves at the feet while anything that "hits" resolves at
// chest height (see bodyY()).
//
// Every play* function returns a Promise resolving on completion.
// Concurrent effects are fine: the overlay runs a shared render loop
// and layers are z-sorted by ground Y so nearer units draw on top.
// ============================================================

// ---- math / easing (same set as hellVFX) ----
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeInCubic = t => t * t * t;
export const easeOutQuad = t => 1 - (1 - t) * (1 - t);
export const rand = (a, b) => Math.random() * (b - a) + a;
const TAU = Math.PI * 2;

/** Ground-plane foreshortening: a ground circle of radius r draws as an
 *  ellipse r wide and r * ISO_SQUASH tall. Match this to your grid. */
export const ISO_SQUASH = 0.5;

export const TIER_SCALE = { low: 0.8, med: 1.0, high: 1.35, super: 1.8 };

/** Chest height of a unit — where hits and grabs land. */
export const bodyY = u => u.y - (u.h || 140) * 0.55;
/** Top of a unit's head. */
export const headY = u => u.y - (u.h || 140);

/** Draw a ground-plane ellipse (a "circle" lying on the hex plane). */
function groundEllipse(ctx, x, y, r) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * ISO_SQUASH, 0, 0, TAU);
}

// HEX GEOMETRY — none here (viewer.reads-engine, review V13). This file once carried its own
// pointy-top axial hexToScreen/hexCorners — a second coordinate system for the same hexes, used
// only by tile effects board.js never called. They are gone with it: every effect is anchored on a
// unit's feet, which board.js reads off the one board the engine's field dump places.

// ============================================================
// OVERLAY ENGINE — one canvas, many concurrent effects
// ============================================================

/**
 * Wrap the scene's overlay canvas once, then fire effects at it.
 *   const fx = createHexVFX(document.querySelector('#vfxOverlay'));
 *   await fx.melee(attackerUnit, targetUnit, 'phys', 'high');
 * The loop only runs while effects are active.
 */
export function createHexVFX(canvas) {
    const layers = [];
    let running = false, last = 0;

    function resize() {
        const r = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
            canvas.width = r.width * dpr; canvas.height = r.height * dpr;
        }
        return { w: r.width, h: r.height, dpr };
    }

    function tick(now) {
        const { w, h, dpr } = resize();
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
        last = now;

        // near-to-far: sort by ground Y so closer effects overlay farther ones
        layers.sort((a, b) => (a.sortY ?? 0) - (b.sortY ?? 0));
        for (let i = layers.length - 1; i >= 0; i--) {
            const L = layers[i];
            if (L.start == null) L.start = now;
            const t = Math.min(Math.max((now - L.start) / L.dur, 0), 1);
            ctx.save();
            try { L.draw(ctx, w, h, t, now - L.start, L.P, dt); } catch (e) { console.error('[hexVFX]', e); }
            ctx.restore();
            if (t >= 1) { layers.splice(i, 1); L.resolve(); }
        }

        if (layers.length) requestAnimationFrame(tick);
        else { running = false; last = 0; ctx.clearRect(0, 0, w, h); }
    }

    /** Register a raw draw layer. Most callers use the named effects below. */
    function add(dur, draw, sortY = 0) {
        return new Promise(resolve => {
            layers.push({ dur, draw, P: [], resolve, sortY, start: null });
            if (!running) { running = true; requestAnimationFrame(tick); }
        });
    }

    const api = {
        canvas, add,
        clear() { layers.forEach(L => L.resolve()); layers.length = 0; },

        // ---- attacks ----
        melee: (a, t, type, tier, opts) => playMeleeAttack(api, a, t, type, tier, opts),
        arrow: (a, t, opts) => playArrow(api, a, t, opts),
        magicBolt: (a, t, tier, opts) => playMagicBolt(api, a, t, tier, opts),
        holyBolt: (a, t, tier, opts) => playHolyBolt(api, a, t, tier, opts),
        fireball: (a, t, tier, opts) => playFireball(api, a, t, tier, opts),

        // ---- status ----
        status: (u, type, ring) => playStatusApply(api, u, type, ring),
        statusTick: (u, type, ring) => playStatusTick(api, u, type, ring),
        statusWave: (units, type, stagger) => playStatusWave(api, units, type, stagger),

        // ---- deaths ----
        death: (u, cause) => playDeath(api, u, cause),


        // ---- unit-anchored ----
        aura: (u, color, dur) => playAura(api, u, color, dur)
    };
    return api;
}

// ---- unit reaction hooks -------------------------------------------------
// Effects can't move your sprites (they live in your scene, not the overlay),
// so impact/lunge motion is delegated. Pass callbacks in opts:
//   opts.onShake(unit)        — flinch the sprite
//   opts.onLunge(unit, dx,dy) — offset the sprite (dx,dy = 0,0 to return)
// Both optional; omit them and only the overlay animates.
const fire = (fn, ...args) => { if (typeof fn === 'function') fn(...args); };

// ============================================================
// MELEE — lunge along the ground, slash at chest height
// ============================================================

/* viewer.hit-slash (engine DECISIONS.md 2026-10-03, Andrew: "there's no red slash across the target that is part of a hit"): each
   style's `body` — the slash's own colour, laid down OPAQUE under the glow and the bright core. The glow and the core are
   additive ('lighter'): over the flat board's dark ground they read as the style's colour, but over a painted scene's bright
   grass they wash out to white, which is why the slash was drawn there and not seen as one. */
export const SLASH_STYLES = {
    phys: { core: '255,235,225', glow: '255,110,70', spark: '255,180,120', body: '214,28,28' },
    mag:  { core: '215,232,255', glow: '70,125,255', spark: '150,185,255', body: '48,92,228' },
    true: { core: '255,250,230', glow: '255,205,80', spark: '255,230,150', body: '232,172,40' }
};

export function playMeleeAttack(fx, attacker, target, type = 'phys', tier = 'med', opts = {}) {
    const dx = target.x - attacker.x, dy = target.y - attacker.y;
    const dist = Math.hypot(dx, dy) || 1;
    // stop short of the target so sprites don't overlap
    const stop = Math.max(dist - (target.h || 140) * 0.42, dist * 0.25);
    const lungeX = dx / dist * stop, lungeY = dy / dist * stop;

    return new Promise(resolve => {
        const t0 = performance.now();
        const WIND = 130, IN = 190, HOLD = 90, BACK = 260;
        function step(now) {
            const e = now - t0;
            if (e < WIND) {                       // anticipation: pull back
                const p = e / WIND;
                fire(opts.onLunge, attacker, -lungeX * 0.12 * p, -lungeY * 0.12 * p);
            } else if (e < WIND + IN) {           // drive in
                const p = easeInCubic((e - WIND) / IN);
                fire(opts.onLunge, attacker, lerp(-lungeX * 0.12, lungeX, p), lerp(-lungeY * 0.12, lungeY, p));
            } else if (e < WIND + IN + HOLD) {
                fire(opts.onLunge, attacker, lungeX, lungeY);
            } else if (e < WIND + IN + HOLD + BACK) {   // recover
                const p = easeOutCubic((e - WIND - IN - HOLD) / BACK);
                fire(opts.onLunge, attacker, lungeX * (1 - p), lungeY * (1 - p));
            } else { fire(opts.onLunge, attacker, 0, 0); return; }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        setTimeout(() => {
            fire(opts.onShake, target);
            playMeleeImpact(fx, target, type, tier).then(resolve);
        }, WIND + IN);
    });
}

export function playMeleeImpact(fx, unit, type = 'phys', tier = 'med') {
    const S = SLASH_STYLES[type] || SLASH_STYLES.phys;
    const scale = TIER_SCALE[tier] || 1;
    const cross = tier === 'high' || tier === 'super';
    const cy = bodyY(unit), reach = (unit.h || 140) * 0.42 * scale;
    return fx.add(620, (ctx, w, h, t, ms, P, dt) => {
        ctx.globalCompositeOperation = 'lighter';
        if (t < 0.14) {
            const a = 1 - t / 0.14;
            const g = ctx.createRadialGradient(unit.x, cy, 0, unit.x, cy, reach * 1.6);
            g.addColorStop(0, `rgba(${S.core},${a * 0.8})`);
            g.addColorStop(1, `rgba(${S.glow},0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(unit.x, cy, reach * 1.6, 0, TAU); ctx.fill();
        }
        const slash = (ang, delay) => {
            const prog = (t - delay) / 0.3;
            if (prog <= 0) return;
            const p = easeOutCubic(Math.min(prog, 1));
            const alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
            const sx = unit.x - Math.cos(ang) * reach, sy = cy - Math.sin(ang) * reach * ISO_SQUASH * 1.6;
            const ex = unit.x + Math.cos(ang) * reach, ey = cy + Math.sin(ang) * reach * ISO_SQUASH * 1.6;
            const mx = (sx + ex) / 2 - Math.sin(ang) * reach * 0.42;
            const my = (sy + ey) / 2 + Math.cos(ang) * reach * 0.42;
            const qx = (a1, b1, c1, tt) => lerp(lerp(a1, b1, tt), lerp(b1, c1, tt), tt);
            const tipX = qx(sx, mx, ex, p), tipY = qx(sy, my, ey, p);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 24 * scale; ctx.shadowColor = `rgba(${S.glow},${alpha})`;
            ctx.strokeStyle = `rgba(${S.glow},${alpha * 0.55})`; ctx.lineWidth = 13 * scale;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, tipX, tipY); ctx.stroke();
            ctx.strokeStyle = `rgba(${S.core},${alpha})`; ctx.lineWidth = 4 * scale; ctx.stroke();
            ctx.shadowBlur = 0;
            /* viewer.hit-slash: the body — OPAQUE, in the style's own colour, over the halo above (which is additive and washes to
               white on a bright scene), with a thin glint along it */
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = `rgba(${S.body},${alpha * 0.96})`; ctx.lineWidth = 9 * scale;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, tipX, tipY); ctx.stroke();
            ctx.strokeStyle = `rgba(${S.core},${alpha * 0.85})`; ctx.lineWidth = 1.5 * scale; ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            if (prog < 1) for (let i = 0; i < 2; i++) { const an = rand(0, TAU), sp = rand(60, 220) * scale;
                P.push({ x: tipX, y: tipY, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 1, dec: rand(2, 3.4) }); }
        };
        slash(-0.9, 0);
        if (cross) slash(0.9, 0.18);
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 250 * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.strokeStyle = `rgba(${S.spark},${p.life})`; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }, unit.y);
}

// ============================================================
// PROJECTILES — arc through the air between two units
// ============================================================

/** Shared flight driver: chest-to-chest arc with an air-height arc. */
function flight(fx, from, to, dur, windup, arcMul, drawCore, sortY) {
    const sx = from.x, sy = bodyY(from);
    const ex = to.x, ey = bodyY(to);
    const arcH = Math.max(50, Math.hypot(ex - sx, ey - sy) * arcMul);
    return fx.add(dur, (ctx, w, h, t, ms, P, dt) => {
        ctx.globalCompositeOperation = 'lighter';
        if (t < windup) { drawCore(ctx, sx, sy, null, t / windup, true, P, dt, ms); return; }
        const raw = (t - windup) / (1 - windup);
        const ft = easeInCubic(raw) * 0.35 + raw * 0.65;
        const x = lerp(sx, ex, ft), y = lerp(sy, ey, ft) - Math.sin(ft * Math.PI) * arcH;
        const nt = Math.min(ft + 0.02, 1);
        const ny = lerp(sy, ey, nt) - Math.sin(nt * Math.PI) * arcH;
        const ang = Math.atan2(ny - y, lerp(sx, ex, nt) - x);
        drawCore(ctx, x, y, ang, ft, false, P, dt, ms);
        ctx.globalCompositeOperation = 'source-over';
    }, sortY ?? to.y);
}

/* viewer.attack-impact-timing: each projectile's time in the air (ms of the page's own clock) and the part of it spent gathering
   at the caster before it leaves (`windup`) — one place, so the pump can launch the effect that much before the attack
   motion's release and fold the hit when it lands. The three flights below read these. */
export const FLIGHTS = { arrow: { ms: 320, windup: 0 }, magic: { ms: 720, windup: 0.3 }, holy: { ms: 780, windup: 0.34 } };

// ---- ranged phys: arrow ----
export function playArrowFlight(fx, from, to) {
    return flight(fx, from, to, FLIGHTS.arrow.ms, FLIGHTS.arrow.windup, 0.06, (ctx, x, y, ang, ft, charging) => {
        if (charging) return;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i <= 5; i++) {
            ctx.strokeStyle = `rgba(220,225,235,${0.24 / i})`;
            ctx.lineWidth = 2.5 - i * 0.4;
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(ang) * i * 11, y - Math.sin(ang) * i * 11);
            ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = '#8a6b45'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#d8dde6';
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(4, -3.6); ctx.lineTo(4, 3.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(200,60,50,0.9)';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-33, 4.5 * s); ctx.lineTo(-21, 1.5 * s); ctx.closePath(); ctx.fill(); }
        ctx.restore();
    });
}

export function playArrowImpact(fx, unit) {
    const iy = bodyY(unit);
    return fx.add(550, (ctx, w, h, t, ms, P, dt) => {
        if (t < 0.1) for (let i = 0; i < 3; i++) { const a = rand(-2.6, -0.5), sp = rand(60, 190);
            P.push({ x: unit.x, y: iy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: rand(3, 7), life: 1, dec: rand(2, 3.2) }); }
        if (t < 0.15) {
            const a = 1 - t / 0.15;
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(unit.x, iy, 0, unit.x, iy, 34);
            g.addColorStop(0, `rgba(255,245,220,${a * 0.85})`); g.addColorStop(1, 'rgba(255,200,120,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(unit.x, iy, 34, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.strokeStyle = `rgba(210,190,150,${p.life})`; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 0.02 * p.len, p.y - p.vy * 0.02 * p.len); ctx.stroke();
        }
        const wob = Math.sin(ms / 28) * 0.14 * Math.exp(-ms / 180);
        const alpha = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.translate(unit.x, iy); ctx.rotate(-0.5 + wob);
        ctx.strokeStyle = '#8a6b45'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-4, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(200,60,50,0.9)';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-37, 4.5 * s); ctx.lineTo(-25, 1.5 * s); ctx.closePath(); ctx.fill(); }
        ctx.restore();
    }, unit.y);
}

export async function playArrow(fx, from, to, opts = {}) {
    await playArrowFlight(fx, from, to);
    fire(opts.onShake, to);
    await playArrowImpact(fx, to);
}

// ---- ranged magic: blue energy bolt ----
function boltPath(x1, y1, x2, y2, sway) {
    let pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    for (let it = 0; it < 5; it++) {
        const next = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            next.push({ x: (a.x + b.x) / 2 + rand(-sway, sway), y: (a.y + b.y) / 2 + rand(-sway * 0.4, sway * 0.4) }, b);
        }
        pts = next; sway *= 0.55;
    }
    return pts;
}

function drawBolt(ctx, pts, alpha, coreW) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowBlur = 22; ctx.shadowColor = `rgba(130,170,255,${alpha})`;
    ctx.strokeStyle = `rgba(90,130,255,${alpha * 0.55})`; ctx.lineWidth = coreW * 3.2;
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.strokeStyle = `rgba(235,242,255,${alpha})`; ctx.lineWidth = coreW; ctx.stroke();
    ctx.shadowBlur = 0;
}
export { boltPath, drawBolt };

export function playMagicBoltFlight(fx, from, to, tier = 'med') {
    const scale = TIER_SCALE[tier] || 1;
    return flight(fx, from, to, FLIGHTS.magic.ms, FLIGHTS.magic.windup, 0.14, (ctx, x, y, ang, ft, charging, P, dt, ms) => {
        if (charging) {
            const r = lerp(3, 13 * scale, easeOutQuad(ft));
            if (Math.random() < 0.5) {
                const a1 = rand(0, TAU), a2 = a1 + rand(-1, 1);
                drawBolt(ctx, boltPath(x + Math.cos(a1) * r * 2.2, y + Math.sin(a1) * r * 2.2,
                    x + Math.cos(a2) * r * 3.4, y + Math.sin(a2) * r * 3.4, 8), ft * 0.8, 1.2);
            }
            const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
            g.addColorStop(0, `rgba(225,238,255,${0.9 * ft})`);
            g.addColorStop(0.4, `rgba(90,140,255,${0.6 * ft})`);
            g.addColorStop(1, 'rgba(40,80,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill();
            return;
        }
        for (let i = 0; i < 2; i++)
            P.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-15, 15), vy: rand(-15, 15), sz: rand(2, 5) * scale, life: 1, dec: rand(2, 3) });
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 8; ctx.shadowColor = `rgba(100,150,255,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(170,200,255,${p.life * 0.85})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        const bl = 26 * scale, bw = 7 * scale;
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, bl * 1.8);
        g2.addColorStop(0, 'rgba(225,240,255,0.95)');
        g2.addColorStop(0.4, 'rgba(90,140,255,0.7)');
        g2.addColorStop(1, 'rgba(40,80,255,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(0, 0, bl * 1.8, bw * 2.2, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-bl * 0.2, 0, bl, bw, 0, 0, TAU);
        ctx.fillStyle = 'rgba(235,245,255,0.95)'; ctx.fill();
        if (Math.random() < 0.7) drawBolt(ctx, boltPath(0, 0, rand(-bl * 2, -bl * 0.5), rand(-14, 14), 7), 0.8, 1.2);
        ctx.restore();
    });
}

export function playMagicBoltImpact(fx, unit, tier = 'med') {
    const scale = TIER_SCALE[tier] || 1;
    const cy = bodyY(unit), maxR = (unit.h || 140) * 0.55 * scale;
    return fx.add(600, (ctx, w, h, t, ms, P, dt) => {
        if (t < 0.1) for (let i = 0; i < 7; i++) { const a = rand(0, TAU), sp = rand(100, 320) * scale;
            P.push({ x: unit.x, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sz: rand(2, 5.5), life: 1, dec: rand(1.6, 2.8) }); }
        ctx.globalCompositeOperation = 'lighter';
        if (t < 0.16) {
            const a = 1 - t / 0.16;
            const g = ctx.createRadialGradient(unit.x, cy, 0, unit.x, cy, maxR);
            g.addColorStop(0, `rgba(225,240,255,${a * 0.9})`);
            g.addColorStop(0.5, `rgba(90,140,255,${a * 0.55})`);
            g.addColorStop(1, 'rgba(40,80,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(unit.x, cy, maxR, 0, TAU); ctx.fill();
        }
        // rings expand on the GROUND plane (ellipses) — reads as grounded
        for (const [d, sp] of [[0, 0.5], [0.12, 0.62]]) {
            if (t > d && t < d + sp) {
                const rt = easeOutCubic((t - d) / sp), a = (1 - rt) * 0.75;
                ctx.lineWidth = lerp(5, 1, rt) * scale;
                ctx.strokeStyle = `rgba(140,180,255,${a})`;
                ctx.shadowBlur = 14; ctx.shadowColor = `rgba(80,120,255,${a})`;
                groundEllipse(ctx, unit.x, unit.y, rt * maxR * 1.3); ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
        if (t < 0.45 && Math.random() < 0.5)
            drawBolt(ctx, boltPath(unit.x + rand(-24, 24), cy + rand(-30, 30), unit.x + rand(-40, 40), unit.y - rand(0, 20), 14), 0.7, 1.3);
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 8; ctx.shadowColor = `rgba(100,150,255,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(180,205,255,${p.life * 0.85})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalCompositeOperation = 'source-over';
    }, unit.y);
}

export async function playMagicBolt(fx, from, to, tier = 'med', opts = {}) {
    await playMagicBoltFlight(fx, from, to, tier);
    fire(opts.onShake, to);
    await playMagicBoltImpact(fx, to, tier);
}

// ---- ranged true: priestly holy bolt ----
export function playHolyBoltFlight(fx, from, to, tier = 'med') {
    const scale = TIER_SCALE[tier] || 1;
    return flight(fx, from, to, FLIGHTS.holy.ms, FLIGHTS.holy.windup, 0.1, (ctx, x, y, ang, ft, charging, P, dt) => {
        if (charging) {
            // halo contracts over the caster's head, on the ground-plane tilt
            const hr = lerp(46, 16, easeOutQuad(ft)) * scale;
            ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,225,140,${ft * 0.9})`;
            ctx.shadowBlur = 16; ctx.shadowColor = `rgba(255,200,80,${ft})`;
            ctx.beginPath(); ctx.ellipse(x, y - 26, hr, hr * 0.4, 0, 0, TAU); ctx.stroke();
            ctx.shadowBlur = 0;
            const g = ctx.createRadialGradient(x, y, 0, x, y, 30 * ft * scale);
            g.addColorStop(0, `rgba(255,250,225,${ft * 0.85})`); g.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 30 * ft * scale, 0, TAU); ctx.fill();
            return;
        }
        for (let i = 0; i < 3; i++)
            P.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-40, 10), vy: rand(-24, 24), sz: rand(1.5, 4.5) * scale, life: 1, dec: rand(1.8, 3) });
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 6; ctx.shadowColor = `rgba(255,210,110,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(255,240,190,${p.life * 0.9})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        const cl = 30 * scale;
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, cl * 1.6);
        g2.addColorStop(0, 'rgba(255,252,235,0.95)');
        g2.addColorStop(0.4, 'rgba(255,210,100,0.7)');
        g2.addColorStop(1, 'rgba(255,170,40,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.moveTo(cl * 0.7, 0);
        ctx.quadraticCurveTo(0, -cl * 0.4, -cl * 1.6, 0);
        ctx.quadraticCurveTo(0, cl * 0.4, cl * 0.7, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(cl * 0.2, 0, 6 * scale, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,245,0.95)'; ctx.fill();
        ctx.restore();
    });
}

export function playHolyBoltImpact(fx, unit, tier = 'med') {
    const scale = TIER_SCALE[tier] || 1;
    const cy = bodyY(unit), maxR = (unit.h || 140) * 0.6 * scale;
    return fx.add(700, (ctx, w, h, t, ms, P, dt) => {
        if (t < 0.1) for (let i = 0; i < 8; i++) { const a = rand(0, TAU), sp = rand(80, 300) * scale;
            P.push({ x: unit.x, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(20, 60), sz: rand(2, 5), life: 1, dec: rand(1.4, 2.4) }); }
        ctx.globalCompositeOperation = 'lighter';
        if (t < 0.16) {
            const a = 1 - t / 0.16;
            const g = ctx.createRadialGradient(unit.x, cy, 0, unit.x, cy, maxR);
            g.addColorStop(0, `rgba(255,252,235,${a * 0.9})`); g.addColorStop(1, 'rgba(255,180,60,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(unit.x, cy, maxR, 0, TAU); ctx.fill();
        }
        // consecrated ground: halo rings on the hex plane
        for (const d of [0.05, 0.2]) {
            if (t > d && t < d + 0.55) {
                const rt = easeOutCubic((t - d) / 0.55), a = (1 - rt) * 0.7;
                ctx.lineWidth = lerp(4, 1, rt) * scale;
                ctx.strokeStyle = `rgba(255,225,140,${a})`;
                ctx.shadowBlur = 12; ctx.shadowColor = `rgba(255,190,60,${a})`;
                groundEllipse(ctx, unit.x, unit.y, rt * maxR * 1.5); ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 30 * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 7; ctx.shadowColor = `rgba(255,210,110,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(255,242,200,${p.life * 0.9})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalCompositeOperation = 'source-over';
    }, unit.y);
}

export async function playHolyBolt(fx, from, to, tier = 'med', opts = {}) {
    await playHolyBoltFlight(fx, from, to, tier);
    fire(opts.onShake, to);
    await playHolyBoltImpact(fx, to, tier);
}

// ---- fire spell: fireball (single-target fire class powers) ----
export function playFireballFlight(fx, from, to, tier = 'med') {
    const scale = TIER_SCALE[tier] || 1;
    return flight(fx, from, to, 820, 0.28, 0.22, (ctx, x, y, ang, ft, charging, P, dt, ms) => {
        if (charging) {
            const r = lerp(4, 16 * scale, easeOutQuad(ft));
            if (Math.random() < 0.6) { const a = rand(0, TAU), d = rand(30, 55);
                P.push({ kind: 'in', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, life: 1 }); }
            for (const p of P) {
                if (p.kind !== 'in') continue;
                p.x = lerp(p.x, p.tx, 0.18); p.y = lerp(p.y, p.ty, 0.18); p.life -= 0.05;
                if (p.life <= 0) continue;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU);
                ctx.fillStyle = `rgba(255,180,80,${p.life})`; ctx.fill();
            }
            const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
            g.addColorStop(0, `rgba(255,240,180,${0.9 * ft})`);
            g.addColorStop(0.4, `rgba(255,140,40,${0.6 * ft})`);
            g.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
            return;
        }
        for (let i = 0; i < 3; i++)
            P.push({ kind: 'fl', x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-30, 10), sz: rand(4, 9) * scale, life: 1, dec: rand(2.2, 3.4), hue: rand(15, 45) });
        if (Math.random() < 0.5)
            P.push({ kind: 'sm', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-10, 10), vy: rand(-40, -15), sz: rand(5, 12) * scale, life: 1, dec: rand(1.2, 1.8) });
        for (const p of P) {
            if (p.kind === 'in') continue;
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            if (p.kind === 'sm') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (1.6 - p.life * 0.6), 0, TAU);
                ctx.fillStyle = `rgba(40,30,28,${p.life * 0.35})`; ctx.fill();
                ctx.globalCompositeOperation = 'lighter';
            } else {
                const s = p.sz * p.life;
                ctx.shadowBlur = s * 3; ctx.shadowColor = `hsla(${p.hue},100%,55%,${p.life})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU);
                ctx.fillStyle = `hsla(${p.hue},100%,${55 + p.life * 20}%,${p.life})`; ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
        const cr = 11 * scale;
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, cr * 2.6);
        g2.addColorStop(0, 'rgba(255,255,220,0.95)');
        g2.addColorStop(0.35, 'rgba(255,170,60,0.8)');
        g2.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(0, 0, cr * 2.6, cr * 1.7, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, cr, cr * 0.75, 0, 0, TAU);
        ctx.fillStyle = 'rgba(255,250,230,0.95)'; ctx.fill();
        ctx.restore();
    });
}

export function playFireballExplosion(fx, unit, tier = 'med') {
    const scale = TIER_SCALE[tier] || 1;
    const cy = bodyY(unit), maxR = (unit.h || 140) * 0.7 * scale;
    return fx.add(700, (ctx, w, h, t, ms, P, dt) => {
        if (t < 0.12) for (let i = 0; i < 8; i++) { const a = rand(0, TAU), sp = rand(120, 380) * scale;
            P.push({ x: unit.x, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(0, 80), sz: rand(2.5, 7), life: 1, dec: rand(1.2, 2.2), hue: rand(15, 50) }); }
        ctx.globalCompositeOperation = 'lighter';
        if (t < 0.18) {
            const a = 1 - t / 0.18;
            const g = ctx.createRadialGradient(unit.x, cy, 0, unit.x, cy, maxR);
            g.addColorStop(0, `rgba(255,255,230,${a * 0.95})`);
            g.addColorStop(0.5, `rgba(255,160,50,${a * 0.6})`);
            g.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(unit.x, cy, maxR, 0, TAU); ctx.fill();
        }
        // blast wave rolls out across the ground
        if (t < 0.55) {
            const rt = easeOutCubic(t / 0.55), a = (1 - rt) * 0.8;
            ctx.lineWidth = lerp(7, 1, rt) * scale;
            ctx.strokeStyle = `rgba(255,190,90,${a})`;
            ctx.shadowBlur = 18; ctx.shadowColor = `rgba(255,120,20,${a})`;
            groundEllipse(ctx, unit.x, unit.y, rt * maxR * 1.5); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        if (t < 0.7 && Math.random() < 0.85)
            P.push({ x: unit.x + rand(-30, 30), y: unit.y - rand(0, 20), vx: rand(-25, 25), vy: rand(-160, -70) * scale, sz: rand(5, 13) * scale, life: 1, dec: rand(1.6, 2.6), hue: rand(15, 45) });
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            const s = p.sz * p.life, a = p.life * (1 - easeInCubic(t));
            ctx.shadowBlur = s * 3; ctx.shadowColor = `hsla(${p.hue},100%,55%,${a})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU);
            ctx.fillStyle = `hsla(${p.hue},100%,${50 + p.life * 25}%,${a})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        // scorch mark left on the tile
        ctx.globalCompositeOperation = 'source-over';
        if (t > 0.25) {
            const st = Math.min((t - 0.25) / 0.35, 1), fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
            const g = ctx.createRadialGradient(unit.x, unit.y, 0, unit.x, unit.y, maxR * 0.9);
            g.addColorStop(0, `rgba(30,10,5,${0.55 * st * fade})`);
            g.addColorStop(1, 'rgba(30,10,5,0)');
            ctx.fillStyle = g; groundEllipse(ctx, unit.x, unit.y, maxR * 0.9); ctx.fill();
        }
    }, unit.y);
}

export async function playFireball(fx, from, to, tier = 'med', opts = {}) {
    await playFireballFlight(fx, from, to, tier);
    fire(opts.onShake, to);
    await playFireballExplosion(fx, to, tier);
}

// ============================================================
// STATUS APPLICATIONS
// Unified language, re-grounded: a ring contracts DOWN the unit's
// body onto its tile (instead of shrinking onto a card), then
// type-specific particles rise around the unit.
// ============================================================

const STATUS_STYLES = {
    poison: { ring: '110,220,80',  glow: '60,180,40' },
    blight: { ring: '120,140,60',  glow: '60,80,30' },
    burn:   { ring: '255,150,50',  glow: '255,90,10' },
    weak:   { ring: '235,235,242', glow: '190,190,210' },
    frost:  { ring: '150,215,255', glow: '80,160,240' },
    bleed:  { ring: '230,50,50',   glow: '170,15,20' },
    karma:  { ring: '240,238,230', glow: '150,140,180' },
    affliction: { ring: '200,40,90', glow: '90,10,60' },
    shadow: { ring: '175,120,225', glow: '110,50,190' },
    heal:   { ring: '130,235,150', glow: '80,210,120' },
    regen:  { ring: '120,225,170', glow: '70,190,140' }
};
export { STATUS_STYLES };

/** Ring descends the body and settles as a ground ring on the tile. */
function drawDescendRing(ctx, u, t, S) {
    if (t > 0.4) return;
    const p = easeOutCubic(Math.min(t / 0.34, 1));
    const H = u.h || 140;
    const y = lerp(u.y - H * 1.15, u.y, p);
    const r = lerp(H * 0.5, H * 0.34, p);
    const a = Math.sin(Math.min(t / 0.4, 1) * Math.PI) * 0.9;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(${S.ring},${a})`;
    ctx.shadowBlur = 16; ctx.shadowColor = `rgba(${S.glow},${a})`;
    groundEllipse(ctx, u.x, y, r); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
}

/** Soft column of tint around the unit's silhouette. */
function bodyColumn(ctx, u, alpha, colour) {
    const H = u.h || 140, R = H * 0.34;
    const g = ctx.createLinearGradient(0, u.y - H, 0, u.y);
    g.addColorStop(0, `rgba(${colour},0)`);
    g.addColorStop(0.55, `rgba(${colour},${alpha})`);
    g.addColorStop(1, `rgba(${colour},${alpha * 0.5})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y - H * 0.5, R, H * 0.55, 0, 0, TAU);
    ctx.fill();
}

function drawStar(ctx, x, y, r, a, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        const an = i * Math.PI / 2;
        ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        ctx.lineTo(Math.cos(an + Math.PI / 4) * r * 0.32, Math.sin(an + Math.PI / 4) * r * 0.32);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawChevron(ctx, x, y, sz, a, col, up) {
    const d = up ? -1 : 1;
    ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - sz, y - sz * 0.6 * d); ctx.lineTo(x, y + sz * 0.6 * d); ctx.lineTo(x + sz, y - sz * 0.6 * d); ctx.stroke();
}

/** ring: an "r,g,b" the caller rings the effect in — the status's own hue (board.js fxStatus); the glow stays the effect's. */
export function playStatusApply(fx, u, type, ring) {
    const S0 = STATUS_STYLES[type] || STATUS_STYLES.poison, S = ring ? { ...S0, ring } : S0;
    const H = u.h || 140, R = H * 0.32;
    const spawnAround = () => ({ x: u.x + rand(-R, R), y: u.y - rand(0, H * 0.15) });
    return fx.add(950, (ctx, w, h, t, ms, P, dt) => {
        drawDescendRing(ctx, u, t, S);
        const swell = Math.sin(Math.min(t * 1.5, 1) * Math.PI);

        if (type === 'poison' || type === 'blight') {
            // toxic pool on the tile + bubbles rising up the body
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, R * 1.5);
            g.addColorStop(0, `rgba(${S.glow},${0.45 * swell})`);
            g.addColorStop(1, `rgba(${S.glow},0)`);
            ctx.fillStyle = g; groundEllipse(ctx, u.x, u.y, R * 1.5); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            if (type === 'blight') bodyColumn(ctx, u, 0.3 * swell, '25,35,12');
            if (t < 0.7 && Math.random() < 0.8) {
                const s = spawnAround();
                P.push({ ...s, vy: rand(-70, -35), sz: rand(2.5, 7), life: 1, dec: rand(0.9, 1.5), ph: rand(0, 6) });
            }
            for (const p of P) {
                p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                const wob = Math.sin(ms * 0.006 + p.ph) * 3;
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath(); ctx.arc(p.x + wob, p.y, p.sz, 0, TAU);
                ctx.fillStyle = `rgba(${S.ring},${p.life * 0.5})`; ctx.fill();
                ctx.beginPath(); ctx.arc(p.x + wob - p.sz * 0.3, p.y - p.sz * 0.3, p.sz * 0.3, 0, TAU);
                ctx.fillStyle = `rgba(230,255,220,${p.life * 0.6})`; ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

        } else if (type === 'burn') {
            if (t < 0.35) for (let i = 0; i < 3; i++) { const a = rand(0, TAU), sp = rand(50, 180);
                P.push({ x: u.x, y: bodyY(u), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(20, 60), sz: rand(3, 9), life: 1, dec: rand(1, 1.7), hue: rand(15, 50) }); }
            if (t < 0.6 && Math.random() < 0.75) {
                const s = spawnAround();
                P.push({ ...s, vx: rand(-10, 10), vy: rand(-110, -55), sz: rand(3, 8), life: 1, dec: rand(1.4, 2.2), hue: rand(15, 45) });
            }
            ctx.globalCompositeOperation = 'lighter';
            for (const p of P) {
                p.x += (p.vx || 0) * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                const s = p.sz * p.life;
                ctx.shadowBlur = s * 3; ctx.shadowColor = `hsla(${p.hue},100%,55%,${p.life})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU);
                ctx.fillStyle = `hsla(${p.hue},100%,${55 + p.life * 20}%,${p.life})`; ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.globalCompositeOperation = 'source-over';

        } else if (type === 'weak') {
            bodyColumn(ctx, u, 0.4 * swell, '18,18,24');
            if (t < 0.55 && Math.random() < 0.5)
                P.push({ x: u.x + rand(-R, R), y: u.y - H * rand(0.6, 0.95), vy: rand(35, 60), sz: rand(6, 11), life: 1, dec: rand(1, 1.5) });
            ctx.globalCompositeOperation = 'lighter';
            for (const p of P) {
                p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                drawChevron(ctx, p.x, p.y, p.sz, p.life * 0.9, S.ring, false);
            }
            ctx.globalCompositeOperation = 'source-over';

        } else if (type === 'frost') {
            bodyColumn(ctx, u, 0.42 * swell, '170,220,255');
            // rime creeping up from the tile
            ctx.globalCompositeOperation = 'lighter';
            const rime = easeOutQuad(Math.min(t / 0.5, 1));
            ctx.strokeStyle = `rgba(200,235,255,${0.7 * swell})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
            for (let i = 0; i < 9; i++) {
                const an = (i / 9) * TAU;
                const bx = u.x + Math.cos(an) * R, by = u.y + Math.sin(an) * R * ISO_SQUASH;
                ctx.beginPath(); ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(an) * 4, by - H * 0.3 * rime * rand(0.7, 1));
                ctx.stroke();
            }
            if (t < 0.6 && Math.random() < 0.7)
                P.push({ x: u.x + rand(-R * 1.2, R * 1.2), y: u.y - rand(0, H * 0.9), sz: rand(3, 8), life: 1, dec: rand(0.9, 1.5), rot: rand(0, Math.PI) });
            for (const p of P) {
                p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                const a = Math.sin(Math.min(p.life, 1) * Math.PI) * 0.9;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.strokeStyle = `rgba(200,235,255,${a})`; ctx.lineWidth = 1.6;
                ctx.shadowBlur = 6; ctx.shadowColor = `rgba(120,190,255,${a})`;
                for (let i = 0; i < 3; i++) { const an = i * Math.PI / 3;
                    ctx.beginPath(); ctx.moveTo(-Math.cos(an) * p.sz, -Math.sin(an) * p.sz);
                    ctx.lineTo(Math.cos(an) * p.sz, Math.sin(an) * p.sz); ctx.stroke(); }
                ctx.restore(); ctx.shadowBlur = 0;
            }
            ctx.globalCompositeOperation = 'source-over';

        } else if (type === 'bleed') {
            const cy = bodyY(u);
            if (t < 0.18) {
                const a = 1 - t / 0.18;
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `rgba(255,120,110,${a})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
                ctx.shadowBlur = 10; ctx.shadowColor = `rgba(220,30,30,${a})`;
                ctx.beginPath(); ctx.moveTo(u.x - R, cy - R * 0.7); ctx.lineTo(u.x + R * 0.8, cy + R * 0.3); ctx.stroke();
                ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
            }
            if (t < 0.5 && Math.random() < 0.6)
                P.push({ x: u.x + rand(-R, R * 0.8), y: cy + rand(-10, 10), vy: rand(40, 90), sz: rand(2, 4.5), life: 1, dec: rand(0.8, 1.3) });
            for (const p of P) {
                p.y += p.vy * dt; p.vy += 90 * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                // pool where drops reach the tile
                if (p.y >= u.y) {
                    ctx.fillStyle = `rgba(120,5,12,${p.life * 0.5})`;
                    groundEllipse(ctx, p.x, u.y, p.sz * 2.2); ctx.fill();
                    continue;
                }
                ctx.fillStyle = `rgba(190,20,25,${p.life * 0.9})`;
                ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz * 0.6, p.sz, 0, 0, TAU); ctx.fill();
            }

        } else if (type === 'karma') {
            // yin-yang seal hangs at chest height, rotating once
            const cy = bodyY(u);
            const ka = t < 0.2 ? easeOutCubic(t / 0.2) : t > 0.7 ? Math.max(1 - (t - 0.7) / 0.3, 0) : 1;
            const Rk = H * 0.24 * (0.85 + 0.15 * Math.min(t / 0.2, 1));
            const rot = easeOutQuad(Math.min(t / 0.85, 1)) * TAU;
            ctx.save(); ctx.translate(u.x, cy); ctx.rotate(rot); ctx.globalAlpha = ka;
            ctx.shadowBlur = 18; ctx.shadowColor = `rgba(${S.glow},${ka})`;
            ctx.fillStyle = 'rgba(245,243,235,0.95)';
            ctx.beginPath(); ctx.arc(0, 0, Rk, -Math.PI / 2, Math.PI / 2);
            ctx.arc(0, Rk / 2, Rk / 2, Math.PI / 2, -Math.PI / 2, true);
            ctx.arc(0, -Rk / 2, Rk / 2, Math.PI / 2, -Math.PI / 2, false);
            ctx.fill();
            ctx.fillStyle = 'rgba(25,20,40,0.95)';
            ctx.beginPath(); ctx.arc(0, 0, Rk, Math.PI / 2, -Math.PI / 2);
            ctx.arc(0, -Rk / 2, Rk / 2, -Math.PI / 2, Math.PI / 2, true);
            ctx.arc(0, Rk / 2, Rk / 2, -Math.PI / 2, Math.PI / 2, false);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(25,20,40,0.95)'; ctx.beginPath(); ctx.arc(0, -Rk / 2, Rk * 0.13, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(245,243,235,0.95)'; ctx.beginPath(); ctx.arc(0, Rk / 2, Rk * 0.13, 0, TAU); ctx.fill();
            ctx.strokeStyle = `rgba(${S.ring},${ka * 0.9})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, Rk * 1.18, 0, TAU); ctx.stroke();
            ctx.restore();
            if (t < 0.6 && Math.random() < 0.5)
                P.push({ an: rand(0, TAU), d: Rk * rand(1.3, 1.7), life: 1, dec: rand(1.2, 2), light: Math.random() < 0.5 });
            ctx.globalCompositeOperation = 'lighter';
            for (const p of P) {
                p.an += 2.2 * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                const px = u.x + Math.cos(p.an) * p.d, py = cy + Math.sin(p.an) * p.d;
                ctx.beginPath(); ctx.arc(px, py, 2.5 * p.life, 0, TAU);
                ctx.fillStyle = p.light ? `rgba(245,243,235,${p.life * 0.9})` : `rgba(120,100,190,${p.life * 0.9})`;
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';

        } else if (type === 'affliction') {
            // possession horror: darkness swallows the unit, claw-tendrils
            // rake in across the ground, wrong-red glow breathes at the core
            const cy = bodyY(u);
            const flick = Math.sin(ms * 0.045) > 0.55 || Math.sin(ms * 0.013) > 0.92 ? 0.55 : 1;
            bodyColumn(ctx, u, 0.75 * swell * flick, '6,1,6');
            const breathe = 0.75 + 0.25 * Math.sin(ms * 0.017);
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(u.x, cy, 0, u.x, cy, R * 2 * breathe);
            g.addColorStop(0, `rgba(140,5,40,${0.7 * swell * flick})`);
            g.addColorStop(0.6, `rgba(80,0,30,${0.35 * swell})`);
            g.addColorStop(1, 'rgba(40,0,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u.x, cy, R * 2 * breathe, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            if (t < 0.6 && Math.random() < 0.55) {
                const an = rand(0, TAU), d = R * rand(2.4, 3.4);
                P.push({ kind: 'claw', sx: u.x + Math.cos(an) * d, sy: u.y + Math.sin(an) * d * ISO_SQUASH, prog: 0, sp: rand(2.2, 3.6), life: 1, dec: rand(1.4, 2.2), wig: rand(0, 6) });
            }
            if (t < 0.6 && Math.random() < 0.7)
                P.push({ kind: 'wisp', an: rand(0, TAU), d: R * rand(1.8, 2.6), life: 1, dec: rand(1, 1.6) });
            for (const p of P) {
                p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                if (p.kind === 'claw') {
                    p.prog = Math.min(p.prog + p.sp * dt, 1);
                    const reach = easeOutCubic(p.prog), a = p.life * 0.85 * flick;
                    ctx.strokeStyle = `rgba(20,2,10,${a})`; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(p.sx, p.sy);
                    for (let i = 1; i <= 5 * reach; i++) {
                        const st = i / 5;
                        ctx.lineTo(lerp(p.sx, u.x, st) + Math.sin(p.wig + i * 2.1 + ms * 0.008) * 9 * (1 - st),
                                   lerp(p.sy, u.y, st) + Math.cos(p.wig + i * 1.7 + ms * 0.008) * 5 * (1 - st));
                    }
                    ctx.stroke();
                    ctx.strokeStyle = `rgba(200,20,60,${a * 0.6})`; ctx.lineWidth = 1.2; ctx.stroke();
                } else {
                    p.an += 3 * dt; p.d -= 55 * dt;
                    if (p.d < 6) continue;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.beginPath(); ctx.arc(u.x + Math.cos(p.an) * p.d, cy + Math.sin(p.an) * p.d, 3 * p.life, 0, TAU);
                    ctx.fillStyle = `rgba(230,40,80,${p.life * 0.8 * flick})`; ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

        } else if (type === 'shadow') {
            bodyColumn(ctx, u, 0.5 * swell, '12,5,25');
            if (t < 0.65 && Math.random() < 0.8) {
                const s = spawnAround();
                P.push({ ...s, vy: rand(-55, -25), sz: rand(4, 10), life: 1, dec: rand(0.9, 1.5), ph: rand(0, 6) });
            }
            for (const p of P) {
                p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                const wob = Math.sin(ms * 0.005 + p.ph) * 4;
                ctx.beginPath(); ctx.arc(p.x + wob, p.y, p.sz * (1.4 - p.life * 0.4), 0, TAU);
                ctx.fillStyle = `rgba(30,12,55,${p.life * 0.55})`; ctx.fill();
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath(); ctx.arc(p.x + wob, p.y, p.sz * 0.5 * p.life, 0, TAU);
                ctx.fillStyle = `rgba(180,130,255,${p.life * 0.5})`; ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

        } else { // heal / regen
            ctx.globalCompositeOperation = 'lighter';
            const ga = swell * 0.45;
            const g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, R * 1.8);
            g.addColorStop(0, `rgba(${S.ring},${ga})`); g.addColorStop(1, `rgba(${S.glow},0)`);
            ctx.fillStyle = g; groundEllipse(ctx, u.x, u.y, R * 1.8); ctx.fill();
            if (type === 'regen') {
                for (const d of [0, 0.28, 0.56]) {
                    if (t > d && t < d + 0.44) {
                        const rt = easeOutQuad((t - d) / 0.44), a = (1 - rt) * 0.6;
                        ctx.lineWidth = 2.2; ctx.strokeStyle = `rgba(${S.ring},${a})`;
                        groundEllipse(ctx, u.x, u.y, rt * R * 2); ctx.stroke();
                    }
                }
            }
            if (t < 0.65 && Math.random() < 0.85) {
                const s = spawnAround();
                P.push({ ...s, vy: rand(-90, -45), sz: rand(3, 7), life: 1, dec: rand(1, 1.7), chev: type === 'heal' && Math.random() < 0.35 });
            }
            for (const p of P) {
                p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                if (p.chev) drawChevron(ctx, p.x, p.y, p.sz + 3, p.life * 0.9, S.ring, true);
                else { ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${S.glow},${p.life})`;
                    drawStar(ctx, p.x, p.y, p.sz * p.life + 1.5, p.life * 0.95, '235,255,240'); ctx.shadowBlur = 0; }
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }, u.y);
}

/** Staggered application across several units — the AoE status wave. */
export function playStatusWave(fx, units, type, stagger = 110) {
    return Promise.all(units.map((u, i) =>
        new Promise(res => setTimeout(() => playStatusApply(fx, u, type).then(res), i * stagger))));
}

// ============================================================
// STATUS TICKS — the per-turn damage proc. Short, no ring.
// ============================================================

export function playStatusTick(fx, u, type, ring) {
    const S0 = STATUS_STYLES[type] || STATUS_STYLES.poison, S = ring ? { ...S0, ring } : S0;
    const H = u.h || 140, R = H * 0.3;
    return fx.add(550, (ctx, w, h, t, ms, P, dt) => {
        if (t < 0.2) bodyColumn(ctx, u, Math.sin((t / 0.2) * Math.PI) * 0.3, S.glow);
        if (type === 'burn') {
            if (t < 0.4 && Math.random() < 0.8)
                P.push({ x: u.x + rand(-R, R), y: u.y - rand(0, H * 0.3), vy: rand(-110, -60), sz: rand(2.5, 6), life: 1, dec: rand(1.8, 2.8), hue: rand(15, 45) });
            ctx.globalCompositeOperation = 'lighter';
            for (const p of P) {
                p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                const s = p.sz * p.life;
                ctx.shadowBlur = s * 3; ctx.shadowColor = `hsla(${p.hue},100%,55%,${p.life})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU);
                ctx.fillStyle = `hsla(${p.hue},100%,60%,${p.life})`; ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.globalCompositeOperation = 'source-over';
        } else if (type === 'poison' || type === 'blight') {
            if (t < 0.4 && Math.random() < 0.7)
                P.push({ x: u.x + rand(-R, R), y: u.y - rand(0, H * 0.35), vy: rand(-60, -30), sz: rand(2, 5), life: 1, dec: rand(1.6, 2.4), ph: rand(0, 6) });
            ctx.globalCompositeOperation = 'lighter';
            for (const p of P) {
                p.y += p.vy * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                ctx.beginPath(); ctx.arc(p.x + Math.sin(ms * 0.006 + p.ph) * 2.5, p.y, p.sz * p.life, 0, TAU);
                ctx.fillStyle = `rgba(${S.ring},${p.life * 0.6})`; ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        } else if (type === 'bleed') {
            if (t < 0.35 && Math.random() < 0.6)
                P.push({ x: u.x + rand(-R, R), y: bodyY(u) + rand(-10, 10), vy: rand(50, 90), sz: rand(2, 4), life: 1, dec: rand(1.4, 2) });
            for (const p of P) {
                p.y += p.vy * dt; p.vy += 80 * dt; p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                if (p.y >= u.y) { ctx.fillStyle = `rgba(120,5,12,${p.life * 0.5})`;
                    groundEllipse(ctx, p.x, u.y, p.sz * 2); ctx.fill(); continue; }
                ctx.fillStyle = `rgba(190,20,25,${p.life * 0.9})`;
                ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz * 0.6, p.sz, 0, 0, TAU); ctx.fill();
            }
        } else if (type === 'frost') {
            if (t < 0.4 && Math.random() < 0.7)
                P.push({ x: u.x + rand(-R, R), y: u.y - rand(0, H * 0.8), sz: rand(2.5, 6), life: 1, dec: rand(1.6, 2.4), rot: rand(0, Math.PI) });
            ctx.globalCompositeOperation = 'lighter';
            for (const p of P) {
                p.life -= p.dec * dt;
                if (p.life <= 0) continue;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.strokeStyle = `rgba(200,235,255,${p.life})`; ctx.lineWidth = 1.4;
                for (let i = 0; i < 3; i++) { const an = i * Math.PI / 3;
                    ctx.beginPath(); ctx.moveTo(-Math.cos(an) * p.sz, -Math.sin(an) * p.sz);
                    ctx.lineTo(Math.cos(an) * p.sz, Math.sin(an) * p.sz); ctx.stroke(); }
                ctx.restore();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }, u.y);
}

// ============================================================
// DEATHS — the unit collapses; the tile keeps a mark
// Pair with opts.onFade(unit, alpha) to dissolve your sprite.
// ============================================================

function drawSkullLite(ctx, cx, cy, t, glowCol, textCol, size = 48) {
    let sc, al;
    if (t < 0.25) { sc = easeOutCubic(t / 0.25) * 1.2; al = easeOutCubic(t / 0.25); }
    else if (t < 0.4) { sc = 1.2 - ((t - 0.25) / 0.15) * 0.2; al = 1; }
    else { sc = 1; al = 1; }
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.shadowBlur = 24; ctx.shadowColor = `rgba(${glowCol},${al * 0.7})`;
    ctx.font = `bold ${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(${textCol},${al * 0.9})`;
    ctx.fillText('\u2620', 0, 0);
    ctx.restore();
    ctx.shadowBlur = 0;
}
export { drawSkullLite };

/** Shared death close: sprite fade hook + skull rising off the tile. */
function deathClose(fx, u, t, ctx, from, glow, text, opts) {
    if (t <= from) return;
    const ft = (t - from) / (1 - from);
    fire(opts.onFade, u, 1 - easeOutCubic(ft));
    const H = u.h || 140;
    drawSkullLite(ctx, u.x, lerp(bodyY(u), bodyY(u) - H * 0.3, easeOutCubic(ft)), ft, glow, text, H * 0.34);
}

/** Ground scorch/stain left where a unit died. */
function tileStain(ctx, u, a, colour) {
    const R = (u.h || 140) * 0.36;
    const g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, R);
    g.addColorStop(0, `rgba(${colour},${a})`); g.addColorStop(1, `rgba(${colour},0)`);
    ctx.fillStyle = g; groundEllipse(ctx, u.x, u.y, R); ctx.fill();
}

export function playMeleeDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.36, cy = bodyY(u);
    return fx.add(1500, (ctx, w, h, t, ms, P, dt) => {
        const slash = (ang, d) => {
            const prog = Math.min(Math.max((t - d) / 0.12, 0), 1);
            if (prog <= 0) return;
            const a = t < 0.5 ? 1 : Math.max(1 - (t - 0.5) / 0.25, 0);
            const sx = u.x - Math.cos(ang) * R * 1.3, sy = cy - Math.sin(ang) * R * 1.3;
            const ex = u.x + Math.cos(ang) * R * 1.3, ey = cy + Math.sin(ang) * R * 1.3;
            const tx = lerp(sx, ex, easeOutCubic(prog)), ty = lerp(sy, ey, easeOutCubic(prog));
            ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
            ctx.shadowBlur = 18; ctx.shadowColor = `rgba(255,80,50,${a})`;
            ctx.strokeStyle = `rgba(255,120,80,${a * 0.5})`; ctx.lineWidth = 11;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
            ctx.strokeStyle = `rgba(255,240,230,${a})`; ctx.lineWidth = 3.5; ctx.stroke();
            ctx.shadowBlur = 0;
            if (prog < 1) for (let i = 0; i < 2; i++) { const an = rand(0, TAU), sp = rand(60, 240);
                P.push({ x: tx, y: ty, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 1, dec: rand(2, 3.2) }); }
            ctx.globalCompositeOperation = 'source-over';
        };
        slash(-0.85, 0.05);
        slash(0.85, 0.2);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.strokeStyle = `rgba(255,180,130,${p.life})`; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        if (t > 0.35) tileStain(ctx, u, 0.5 * Math.min((t - 0.35) / 0.3, 1), '80,6,8');
        deathClose(fx, u, t, ctx, 0.45, '255,0,0', '220,200,180', opts);
    }, u.y);
}

export function playMagicDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.4, cy = bodyY(u);
    return fx.add(1600, (ctx, w, h, t, ms, P, dt) => {
        ctx.globalCompositeOperation = 'lighter';
        if (t < 0.5 && Math.random() < 0.6)
            drawBolt(ctx, boltPath(u.x + rand(-R, R), u.y - rand(0, H), u.x + rand(-R, R), u.y - rand(0, H), 20), 0.7, 1.4);
        // motes implode toward the core
        if (t > 0.1 && t < 0.55) for (let i = 0; i < 3; i++) {
            const an = rand(0, TAU), d = R * rand(1.6, 2.4);
            P.push({ x: u.x + Math.cos(an) * d, y: cy + Math.sin(an) * d, life: 1, dec: rand(1.6, 2.4), sz: rand(2, 5) });
        }
        for (const p of P) {
            p.x = lerp(p.x, u.x, 0.09); p.y = lerp(p.y, cy, 0.09); p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 8; ctx.shadowColor = `rgba(90,130,255,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(180,205,255,${p.life * 0.85})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        if (t > 0.5 && t < 0.62) {
            const a = Math.sin(((t - 0.5) / 0.12) * Math.PI);
            const g = ctx.createRadialGradient(u.x, cy, 0, u.x, cy, R * 2);
            g.addColorStop(0, `rgba(220,235,255,${a * 0.9})`); g.addColorStop(1, 'rgba(60,100,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u.x, cy, R * 2, 0, TAU); ctx.fill();
            // implosion snap-ring on the ground
            ctx.strokeStyle = `rgba(150,190,255,${a * 0.8})`; ctx.lineWidth = 3;
            groundEllipse(ctx, u.x, u.y, R * (1 - a) * 2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        if (t > 0.45) tileStain(ctx, u, 0.35 * Math.min((t - 0.45) / 0.3, 1), '20,30,90');
        deathClose(fx, u, t, ctx, 0.55, '80,120,255', '200,210,240', opts);
    }, u.y);
}

export function playHolyDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.36;
    return fx.add(1600, (ctx, w, h, t, ms, P, dt) => {
        ctx.globalCompositeOperation = 'lighter';
        // bleaching light floods the unit
        const bleach = t < 0.4 ? easeOutQuad(t / 0.4) : Math.max(1 - (t - 0.4) / 0.3, 0);
        if (bleach > 0.01) bodyColumn(ctx, u, bleach * 0.8, '255,250,230');
        // consecrated ground under the corpse
        if (t < 0.75) {
            const a = Math.sin(Math.min(t / 0.75, 1) * Math.PI) * 0.6;
            ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,225,140,${a})`;
            ctx.shadowBlur = 12; ctx.shadowColor = `rgba(255,190,60,${a})`;
            groundEllipse(ctx, u.x, u.y, R * 1.6); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        if (t < 0.6 && Math.random() < 0.9)
            P.push({ x: u.x + rand(-R, R), y: u.y - rand(0, H * 0.6), vy: rand(-110, -55), sz: rand(2, 5.5), life: 1, dec: rand(1, 1.7) });
        for (const p of P) {
            p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 7; ctx.shadowColor = `rgba(255,210,110,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(255,244,210,${p.life * 0.9})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalCompositeOperation = 'source-over';
        deathClose(fx, u, t, ctx, 0.5, '220,180,60', '255,240,180', opts);
    }, u.y);
}

export function playPoisonDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.34;
    return fx.add(1600, (ctx, w, h, t, ms, P, dt) => {
        // the unit sinks into a spreading toxic pool
        const spread = easeOutQuad(Math.min(t / 0.7, 1));
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, R * (0.6 + spread));
        g.addColorStop(0, `rgba(40,110,25,${0.85 * spread})`);
        g.addColorStop(0.7, `rgba(25,70,15,${0.6 * spread})`);
        g.addColorStop(1, 'rgba(20,55,12,0)');
        ctx.fillStyle = g; groundEllipse(ctx, u.x, u.y, R * (0.6 + spread)); ctx.fill();
        // level of ooze climbing the body
        const level = u.y - H * 0.8 * spread;
        const lg = ctx.createLinearGradient(0, level, 0, u.y);
        lg.addColorStop(0, 'rgba(60,180,40,0)');
        lg.addColorStop(1, `rgba(45,140,30,${0.7 * spread})`);
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.ellipse(u.x, (level + u.y) / 2, R, (u.y - level) / 2, 0, 0, TAU); ctx.fill();
        // boiling bubbles at the surface
        if (t < 0.75 && Math.random() < 0.9)
            P.push({ x: u.x + rand(-R, R), y: level + rand(-6, 10), vy: rand(-50, -20), sz: rand(2.5, 7), life: 1, dec: rand(1, 1.8), ph: rand(0, 6) });
        ctx.globalCompositeOperation = 'lighter';
        for (const p of P) {
            p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            const wob = Math.sin(ms * 0.006 + p.ph) * 3;
            ctx.beginPath(); ctx.arc(p.x + wob, p.y, p.sz, 0, TAU);
            ctx.fillStyle = `rgba(110,220,80,${p.life * 0.5})`; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x + wob - p.sz * 0.3, p.y - p.sz * 0.3, p.sz * 0.3, 0, TAU);
            ctx.fillStyle = `rgba(230,255,220,${p.life * 0.6})`; ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        deathClose(fx, u, t, ctx, 0.55, '60,200,40', '190,235,175', opts);
    }, u.y);
}

export function playAshDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.32;
    return fx.add(1600, (ctx, w, h, t, ms, P, dt) => {
        // burn line sweeps UP the unit's body
        const p0 = easeOutQuad(Math.min(t / 0.75, 1));
        const lineY = u.y - H * p0;
        ctx.globalCompositeOperation = 'lighter';
        if (t < 0.8) {
            ctx.beginPath();
            for (let i = 0; i <= 14; i++) {
                const x = u.x - R + (2 * R) * (i / 14);
                const jag = Math.sin(i * 1.4 + ms * 0.02) * 3 + Math.sin(i * 0.6 - ms * 0.013) * 4;
                i === 0 ? ctx.moveTo(x, lineY + jag) : ctx.lineTo(x, lineY + jag);
            }
            ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(255,150,40,0.9)';
            ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(255,90,10,0.9)'; ctx.stroke();
            ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,240,190,0.9)'; ctx.stroke();
            ctx.shadowBlur = 0;
        }
        if (t < 0.75) for (let i = 0; i < 4; i++) {
            const ember = Math.random() < 0.4;
            P.push({ x: u.x + rand(-R, R), y: lineY + rand(-3, 6), vx: rand(-14, 14), vy: ember ? rand(-90, -40) : rand(-30, -8), sz: ember ? rand(1.5, 3.5) : rand(1.5, 4.5), life: 1, dec: rand(0.7, 1.3), ember });
        }
        for (const p of P) {
            p.x += p.vx * dt + Math.sin(ms * 0.004 + p.y) * 0.3; p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            if (p.ember) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.shadowBlur = 6; ctx.shadowColor = `rgba(255,120,20,${p.life})`;
                ctx.fillStyle = `rgba(255,${140 + p.life * 80},60,${p.life})`;
            } else {
                ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(70,62,58,${p.life * 0.8})`;
            }
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU); ctx.fill();
        }
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
        // ash pile / scorch left behind
        if (t > 0.3) tileStain(ctx, u, 0.6 * Math.min((t - 0.3) / 0.4, 1), '25,18,14');
        // sprite burns away from the bottom up
        if (t < 0.75) fire(opts.onFade, u, 1 - p0 * 0.85);
        deathClose(fx, u, t, ctx, 0.6, '255,120,20', '255,210,160', opts);
    }, u.y);
}

export function playBlightDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.32;
    return fx.add(1700, (ctx, w, h, t, ms, P, dt) => {
        const creep = easeOutQuad(Math.min(t / 0.8, 1));
        const lineY = u.y - H * creep;
        // rot climbing the body
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createLinearGradient(0, lineY, 0, u.y);
        g.addColorStop(0, 'rgba(14,20,8,0)');
        g.addColorStop(0.3, `rgba(14,20,8,${0.75 * creep})`);
        g.addColorStop(1, `rgba(10,16,6,${0.9 * creep})`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(u.x, (lineY + u.y) / 2, R, (u.y - lineY) / 2, 0, 0, TAU); ctx.fill();
        if (t < 0.85) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(140,170,70,0.7)';
            ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(100,130,40,0.8)';
            ctx.beginPath();
            for (let i = 0; i <= 12; i++) {
                const x = u.x - R + (2 * R) * (i / 12);
                const y = lineY + Math.sin(i * 0.9 + ms * 0.004) * 5 + Math.sin(i * 0.3) * 6;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke(); ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'source-over';
        }
        if (t < 0.7 && Math.random() < 0.6)
            P.push({ x: u.x + rand(-R, R), y: lineY + rand(-4, 10), vy: rand(-40, -12), sz: rand(1.5, 4), life: 1, dec: rand(0.8, 1.4), ph: rand(0, 6) });
        for (const p of P) {
            p.y += p.vy * dt; p.x += Math.sin(ms * 0.004 + p.ph) * 0.4; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(130,160,70,${p.life * 0.6})`; ctx.fill();
        }
        if (t > 0.3) tileStain(ctx, u, 0.55 * Math.min((t - 0.3) / 0.4, 1), '18,26,10');
        if (t < 0.8) fire(opts.onFade, u, 1 - creep * 0.8);
        deathClose(fx, u, t, ctx, 0.6, '90,120,40', '170,190,140', opts);
    }, u.y);
}

export function playBleedDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.32;
    return fx.add(1600, (ctx, w, h, t, ms, P, dt) => {
        const drain = easeOutQuad(Math.min(t / 0.7, 1));
        // pallor washes down the body
        bodyColumn(ctx, u, 0.5 * drain, '215,210,212');
        if (t < 0.6 && Math.random() < 0.8)
            P.push({ x: u.x + rand(-R, R), y: u.y - H * rand(0.55, 0.95), vy: rand(70, 140), wd: rand(1.5, 3.5), life: 1, dec: rand(0.7, 1.1) });
        for (const p of P) {
            p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            if (p.y >= u.y) continue;
            const len = p.vy * 0.2;
            const sg = ctx.createLinearGradient(p.x, p.y - len, p.x, p.y);
            sg.addColorStop(0, 'rgba(150,10,18,0)');
            sg.addColorStop(1, `rgba(190,15,25,${p.life * 0.85})`);
            ctx.strokeStyle = sg; ctx.lineWidth = p.wd; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        // blood pools out across the tile
        if (t > 0.2) {
            const pt = Math.min((t - 0.2) / 0.55, 1);
            const g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, R * 1.5 * pt);
            g.addColorStop(0, `rgba(120,5,12,${0.85 * pt})`);
            g.addColorStop(0.75, `rgba(100,4,10,${0.6 * pt})`);
            g.addColorStop(1, 'rgba(90,4,10,0)');
            ctx.fillStyle = g; groundEllipse(ctx, u.x, u.y, R * 1.5 * pt); ctx.fill();
        }
        deathClose(fx, u, t, ctx, 0.55, '200,20,30', '235,190,190', opts);
    }, u.y);
}

export function playSoulRipDeath(fx, u, opts = {}) {
    const H = u.h || 140, R = H * 0.3, cy = bodyY(u);
    return fx.add(1700, (ctx, w, h, t, ms, P, dt) => {
        bodyColumn(ctx, u, Math.min(t * 1.4, 0.7), '10,8,28');
        ctx.globalCompositeOperation = 'lighter';
        const wt = Math.min(t / 0.7, 1);
        const wy = lerp(cy, u.y - H * 1.6, easeInCubic(wt) * 0.3 + wt * 0.7);
        const wx = u.x + Math.sin(wt * Math.PI * 3) * R * 0.8 * (1 - wt * 0.5);
        if (t < 0.7) {
            for (let i = 0; i < 2; i++)
                P.push({ x: wx + rand(-8, 8), y: wy + rand(-4, 10), vx: rand(-12, 12), vy: rand(-20, 5), sz: rand(2, 6), life: 1, dec: rand(0.9, 1.6) });
            const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, R * 0.9);
            g.addColorStop(0, 'rgba(210,190,255,0.9)');
            g.addColorStop(0.4, 'rgba(140,90,230,0.5)');
            g.addColorStop(1, 'rgba(90,40,180,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx, wy, R * 0.9, 0, TAU); ctx.fill();
            if (t < 0.55) {
                const snap = 1 - t / 0.55;
                ctx.strokeStyle = `rgba(170,130,255,${0.55 * snap})`;
                ctx.lineWidth = lerp(4, 0.5, t / 0.55);
                ctx.beginPath(); ctx.moveTo(u.x, cy);
                ctx.quadraticCurveTo(u.x + Math.sin(ms * 0.01) * 14, (cy + wy) / 2, wx, wy);
                ctx.stroke();
            }
        }
        for (const p of P) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
            if (p.life <= 0) continue;
            ctx.shadowBlur = 8; ctx.shadowColor = `rgba(150,100,255,${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, TAU);
            ctx.fillStyle = `rgba(200,180,255,${p.life * 0.8})`; ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalCompositeOperation = 'source-over';
        if (t > 0.4) tileStain(ctx, u, 0.4 * Math.min((t - 0.4) / 0.3, 1), '25,10,45');
        deathClose(fx, u, t, ctx, 0.6, '120,0,200', '190,150,230', opts);
    }, u.y);
}

/** Death dispatcher — same cause vocabulary as hellVFX. */
export function playDeath(fx, u, cause, opts = {}) {
    switch (cause) {
        case 'melee': return playMeleeDeath(fx, u, opts);
        case 'magic': return playMagicDeath(fx, u, opts);
        case 'holy': return playHolyDeath(fx, u, opts);
        case 'poison': return playPoisonDeath(fx, u, opts);
        case 'burn': return playAshDeath(fx, u, opts);
        case 'blight': return playBlightDeath(fx, u, opts);
        case 'bleed': return playBleedDeath(fx, u, opts);
        case 'shadow': return playSoulRipDeath(fx, u, opts);
        default: return playMeleeDeath(fx, u, opts);
    }
}

// ============================================================
// UNIT-ANCHORED PRIMITIVES — auras
// ============================================================

/** Persistent aura ring around a unit (buff / threat radius). */
export function playAura(fx, u, color = '130,235,150', dur = 1400) {
    const R = (u.h || 140) * 0.4;
    return fx.add(dur, (ctx, w, h, t, ms) => {
        const fade = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 2; i++) {
            const p = ((ms / 1200) + i * 0.5) % 1;
            const a = (1 - p) * 0.6 * fade;
            ctx.lineWidth = 2.2; ctx.strokeStyle = `rgba(${color},${a})`;
            groundEllipse(ctx, u.x, u.y, R * (0.4 + p * 0.9)); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }, u.y);
}
