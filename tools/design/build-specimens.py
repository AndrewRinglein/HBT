"""Build the token-furniture specimen sheet — VFX/TOKEN-FURNITURE.html.

A design surface, not playback: the numbers are chosen to show each state, not
read from a log. Everything is drawn in CSS and clip-path per the standing
constraint; the only images are the real token cutouts and one ground swatch,
so Root and the bars can be judged against a real silhouette at real size.
"""
import base64, io, os, json
from PIL import Image

ROOT = '/sessions/serene-ecstatic-sagan/mnt/Heroes of Blight and Tragic'
OUT  = ROOT + '/VFX/TOKEN-FURNITURE.html'
os.chdir(ROOT)

def b64(path, maxh=520):
    im = Image.open(path).convert('RGBA')
    if im.height > maxh:
        im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
    im = im.quantize(256)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

TOK = {
    'oathblade': b64('battle-tokens/units/oathblade_256.png'),
    'zombie':    b64('battle-tokens/units/zombie_256.png'),
    'airmage':   b64('battle-tokens/units/air-mage_256.png'),
}
GROUND = b64('VFX/battle-screen-mocks/art/hexPlains.png', 320)

# ── the drawn furniture ────────────────────────────────────────────────────
def token(art, h=132, tint='#e0b95e', extra='', aspect=0.50):
    w = round(h * aspect)
    return f'''<div class="tok" style="width:{w}px;height:{h}px">
      <div class="fring" style="border-color:{tint}"></div>
      <div class="shadow"></div>
      <div class="fig" style="background-image:url('{art}')"></div>
      {extra}</div>'''

def hpbar(hp, maxhp, proj=None, tint='#ff9d3c', lethal=False, h=132):
    frac = max(0.0, hp / maxhp)
    band = ''
    if lethal:
        band = (f'<i style="position:absolute;left:0;right:0;bottom:0;height:{frac*100:.1f}%;'
                f'background:repeating-linear-gradient(45deg,{tint}cc 0 3px,{tint}55 3px 6px);'
                f'border-top:2px solid #fff;box-shadow:0 0 8px {tint}"></i>')
    elif proj and proj > 0:                       # loss — inside the fill
        loss = min(frac, proj / maxhp)
        band = (f'<i style="position:absolute;left:0;right:0;bottom:{(frac-loss)*100:.1f}%;'
                f'height:{loss*100:.1f}%;background:{tint}d0;border-top:2px solid {tint}"></i>')
    elif proj and proj < 0:                       # gain — above the fill
        gain = min(1 - frac, -proj / maxhp)
        band = (f'<i style="position:absolute;left:0;right:0;bottom:{frac*100:.1f}%;'
                f'height:{gain*100:.1f}%;background:#8fe08a66;border-bottom:2px solid #8fe08a"></i>')
    # CONSTANT fill (ruled 2026-09-01) — colour on this bar means gain or loss
    # only; the health level is told by how much bar is left.
    return (f'<div class="hpbar" style="height:{h}px">'
            f'<i class="hpfill" style="height:{frac*100:.0f}%;'
            f'background:linear-gradient(#e9e3d2,#c3bba4)"></i>{band}</div>')

def protbar(pool, spent=0, h=132):
    if pool <= 0: return ''
    segs = ''.join(f'<i style="flex:1;border-radius:1px;background:'
                   f'{"#5aa8d8" if i < pool - spent else "#2f5b78"}"></i>'
                   for i in range(min(12, pool)))
    return f'<div class="protbar" style="height:{h}px">{segs}</div>'

GLYPH = {
 'stun': ('#f5d442','polygon(50% 0,62% 34%,98% 35%,69% 57%,79% 91%,50% 70%,21% 91%,31% 57%,2% 35%,38% 34%)'),
 'weak': ('#b48ae0','polygon(0 0,100% 0,54% 46%,100% 100%,0 100%,46% 54%)'),
 'up':   ('#7ec45f','polygon(50% 12%,100% 74%,72% 74%,72% 92%,28% 92%,28% 74%,0 74%)'),
 'down': ('#b48ae0','polygon(50% 88%,0 26%,28% 26%,28% 8%,72% 8%,72% 26%,100% 26%)'),
}
def glyph(kind, count=None, px=19, pip=12, pipfont=9):
    c, clip = GLYPH[kind]
    pipel = ('' if count is None else
             f'<b class="pip" style="background:{c};min-width:{pip}px;height:{pip}px;'
             f'line-height:{pip}px;font-size:{pipfont}px;border-radius:{pip/2}px">{count}</b>')
    return (f'<span class="gbadge" style="width:{px}px;height:{px}px">'
            f'<i style="background:{c};clip-path:{clip}"></i>{pipel}</span>')

def rootoverlay(turns=2, h=132, w=66):
    """Iron, not botanical: a shackle cuff and a hanging chain across the token."""
    links = ''.join(
        f'<i style="width:13px;height:9px;border:2.5px solid {"#8b8778" if i%2 else "#6b6659"};'
        f'border-radius:50%;transform:rotate({0 if i%2 else 90}deg);'
        f'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 1px 2px rgba(0,0,0,.8)"></i>'
        for i in range(7))
    return f'''<div class="rootwrap">
      <div class="rootband" style="width:{w+26}px">{links}</div>
      <div class="cuff" style="width:{w+8}px"></div>
      <b class="roottick">{turns}</b>
    </div>'''

def chip(text, side, tint='#ffe2a0', border=None, glyphclip=None, gcol=None):
    # NO PLATE (ruled 2026-09-01) — bare haloed numerals, both chips. The black
    # box was chrome around information that carries itself.
    g = (f'<i style="width:11px;height:11px;background:{gcol};clip-path:{glyphclip}"></i>'
         if glyphclip else '')
    return (f'<div class="chip {side}" style="color:{tint}">'
            f'<span>{text}</span>{g}</div>')

MELEE = 'polygon(50% 0,86% 56%,74% 92%,26% 92%,14% 56%)'
BOW   = 'polygon(0 100%,58% 0,72% 14%,16% 100%)'
CROSS = 'polygon(42% 0,58% 0,58% 42%,100% 42%,100% 58%,58% 58%,58% 100%,42% 100%,42% 58%,0 58%,0 42%,42% 42%)'

def spec(label, note, body, wide=False):
    return f'''<figure class="spec{' wide' if wide else ''}">
      <div class="stage">{body}</div>
      <figcaption><b>{label}</b><span>{note}</span></figcaption></figure>'''

# ── the page ──────────────────────────────────────────────────────────────
H = TOK['oathblade']; Z = TOK['zombie']; M = TOK['airmage']

root_specs = (
  spec('No Root', 'the silhouette as read normally — the comparison that matters',
       token(H)) +
  spec('Root, 2 turns', 'cuff and hanging chain across the whole token; count on the cuff',
       token(H, extra=rootoverlay(2))) +
  spec('Root on a bulkier figure', 'the identification test: shape still readable through the iron',
       token(Z, tint='#a964d8', aspect=0.62, extra=rootoverlay(1, w=82)))
)

hp_specs = (
  spec('Net loss', 'Burn 4 vs Resist 2 → −2, eaten downward from the top of the fill',
       token(H, extra=hpbar(14, 20, proj=2, tint='#ff9d3c'))) +
  spec('Net gain', 'Regeneration 6 → +6, reaching upward into the empty portion',
       token(H, extra=hpbar(11, 20, proj=-6))) +
  spec('Net zero', 'Burn 4 + Regeneration 6, netted — no marker at all',
       token(H, extra=hpbar(14, 20))) +
  spec('Lethal', 'the whole remaining fill hatched, hard white rule at the top',
       token(H, extra=hpbar(3, 20, proj=5, tint='#e05252', lethal=True)))
)

prot_specs = (
  spec('Protection 6', 'its own segmented bar, outboard of the health bar',
       token(H, extra=hpbar(16, 20) + protbar(6))) +
  spec('Protection 6, 3 spent', 'spent segments go dark rather than disappearing',
       token(H, extra=hpbar(16, 20) + protbar(6, spent=3))) +
  spec('Protection absorbs the tick', 'Poison 5 vs Resist 2 → the bar pays 3, health untouched',
       token(H, extra=hpbar(16, 20) + protbar(8, spent=3)))
)

over_specs = (
  spec('Typical unit', 'zero overhead glyphs — the common case, and the point of the rule',
       token(H)) +
  spec('Stun 2', 'count in a corner pip so it never covers the symbol',
       token(H, extra=f'<div class="overhead">{glyph("stun",2)}</div>')) +
  spec('Weak 3', 'the one status that kept its own glyph',
       token(H, extra=f'<div class="overhead">{glyph("weak",3)}</div>')) +
  spec('Chevron, up and down', 'one glyph for every named modifier — Karma, Berserk, Blinded',
       token(H, extra=f'<div class="overhead">{glyph("up")}{glyph("down")}</div>'))
)

chip_specs = (
  spec('Move 5 · danger 12 ranged', 'move lower-left, danger lower-right, enemies only',
       token(Z, tint='#a964d8', aspect=0.62,
             extra=chip('5','ll') + chip('12','lr','#d9b8f2','#5a3a7a',BOW,'#d9b8f2'))) +
  spec('Slowed', 'the move chip carries Slow as a reduced numeral — no glyph',
       token(H, extra=chip('2','ll','#6fb3df','#2f5b78'))) +
  spec('Rooted', 'the move chip is empty, not zero — it cannot move at all',
       token(H, extra=chip('—','ll','#6b6659','#3a332a') + rootoverlay(2))) +
  spec('Hybrid danger', 'crossed pair only where the hybrid nature is genuinely the point',
       token(Z, tint='#a964d8', aspect=0.62,
             extra=chip('9','lr','#d9b8f2','#5a3a7a',CROSS,'#d9b8f2')))
)

pip_row = ''.join(
    f'<div class="pipcase"><div class="pipdemo">{glyph("stun",2,px=px,pip=pip,pipfont=pf)}</div>'
    f'<span>{lbl}<br><b>{pf:.1f}px numeral</b></span></div>'
    for px, pip, pf, lbl in [
        (15.5, 9.8, 7.3, 'far edge of the board'),
        (19.0, 12.0, 9.0, 'board centre'),
        (24.6, 15.6, 11.7, 'near edge'),
        (19.0, 17.0, 12.5, 'proposed: bigger pip'),
    ])

html = f'''<title>Token Furniture</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;600;700&family=Spectral:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{{
  --ground:#0b0a08; --plate:#15120d; --panel:#191713; --border:#332c22;
  --brass:#6b5a33; --gold:#e0b95e; --violet:#a964d8;
  --ink:#e8e5dc; --dim:#8b8778; --faint:#5f594c;
}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--ground);color:var(--ink);
  font-family:'Barlow Semi Condensed',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding:40px 26px 90px}}
header{{border-bottom:2px solid var(--brass);padding-bottom:18px;margin-bottom:8px}}
h1{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:33px;margin:0 0 8px;
  letter-spacing:.01em;text-wrap:balance}}
.sub{{color:var(--dim);font-size:14.5px;line-height:1.55;max-width:66ch;margin:0}}
.sub b{{color:#c8bfa4;font-weight:600}}
h2{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:20px;
  margin:44px 0 4px;color:var(--gold)}}
h2 + p{{margin:0 0 20px;color:var(--dim);font-size:13.5px;line-height:1.5;max-width:64ch}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:16px}}
.spec{{margin:0;display:flex;flex-direction:column;gap:0}}
.spec .stage{{position:relative;height:210px;border:1px solid var(--border);
  border-radius:4px 4px 0 0;border-bottom:none;background:
    radial-gradient(ellipse at 50% 78%,rgba(224,185,94,.05),transparent 62%),
    url('{GROUND}') center 62%/168px no-repeat, var(--plate);
  display:flex;align-items:flex-end;justify-content:center;padding-bottom:44px;overflow:hidden}}
figcaption{{border:1px solid var(--border);border-radius:0 0 4px 4px;background:var(--panel);
  padding:9px 11px 11px;display:flex;flex-direction:column;gap:3px}}
figcaption b{{font-size:13.5px;font-weight:700;letter-spacing:.01em}}
figcaption span{{font-size:11.5px;line-height:1.42;color:var(--dim)}}

/* ── the token and its furniture ─────────────────────────────────────── */
.tok{{position:relative}}
.fig{{position:absolute;inset:0;background-repeat:no-repeat;background-position:center bottom;
  background-size:contain}}
.fring{{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);
  width:74px;height:26px;border:2px solid;border-radius:50%;opacity:.5}}
.shadow{{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%) rotate(-14deg);
  width:70px;height:20px;border-radius:50%;background:rgba(4,4,3,.62);filter:none}}
.hpbar{{position:absolute;left:calc(100% + 7px);bottom:0;width:10px;border-radius:2px;
  background:rgba(8,8,6,.85);border:1px solid rgba(0,0,0,.75);overflow:hidden;
  display:flex;flex-direction:column-reverse}}
.hpfill{{width:100%;display:block}}
.protbar{{position:absolute;left:calc(100% + 20px);bottom:0;width:7px;
  display:flex;flex-direction:column-reverse;gap:1px}}
.overhead{{position:absolute;left:50%;top:-27px;transform:translateX(-50%);display:flex;gap:4px}}
.gbadge{{position:relative;display:inline-block;background:#100e0a;border:1px solid #3a3223;
  border-radius:3px}}
.gbadge i{{position:absolute;inset:20%;display:block}}
.pip{{position:absolute;right:-4px;bottom:-4px;padding:0 2px;color:#0b0a08;font-weight:700;
  font-family:ui-monospace,monospace;text-align:center;border:1px solid rgba(0,0,0,.6);
  font-variant-numeric:tabular-nums}}
.chip{{position:absolute;bottom:-15px;display:flex;align-items:center;gap:4px;
  font:700 17px/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;
  text-shadow:0 2px 4px #000,0 0 9px rgba(0,0,0,.95),0 0 2px #000;
  filter:drop-shadow(0 1px 2px #000)}}
.chip.ll{{left:-16px}} .chip.lr{{right:-16px}}

/* Root — iron, never botanical */
.rootwrap{{position:absolute;inset:0;pointer-events:none}}
.rootband{{position:absolute;left:50%;top:46%;transform:translateX(-50%);
  display:flex;align-items:center;justify-content:center;gap:1px}}
.cuff{{position:absolute;left:50%;top:calc(46% + 15px);transform:translateX(-50%);height:15px;
  border:3px solid #7d7768;border-radius:3px;
  background:linear-gradient(#5c574c,#2e2b25);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 2px 5px rgba(0,0,0,.8)}}
.roottick{{position:absolute;left:50%;top:calc(46% + 34px);transform:translateX(-50%);
  font:700 15px/1 ui-monospace,monospace;color:#e8e5dc;background:#100e0a;
  border:1px solid #7d7768;border-radius:2px;padding:2px 6px;
  box-shadow:0 2px 6px rgba(0,0,0,.8)}}

/* ── the pip measurement ─────────────────────────────────────────────── */
.pips{{display:flex;gap:26px;flex-wrap:wrap;padding:22px;border:1px solid var(--border);
  border-radius:4px;background:var(--panel)}}
.pipcase{{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:118px}}
.pipdemo{{height:34px;display:flex;align-items:center}}
.pipcase span{{font-size:11px;color:var(--dim);text-align:center;line-height:1.45}}
.pipcase b{{color:var(--ink);font-family:ui-monospace,monospace;font-size:11.5px}}
.note{{margin-top:16px;padding:13px 15px;border-left:3px solid var(--gold);
  background:#171410;font-size:13px;line-height:1.55;color:#cbc3ae;max-width:74ch}}
.note b{{color:var(--gold);font-weight:600}}
footer{{margin-top:52px;padding-top:16px;border-top:1px solid var(--border);
  color:var(--faint);font-size:11.5px;line-height:1.6}}
</style>
<div class="wrap">
<header>
  <h1>Token Furniture</h1>
  <p class="sub">Every state that can sit on a unit, drawn at the size it renders on a
  1080p board. <b>The figures and the ground are real art; every number is chosen to show
  the state</b> — this is a design surface, not playback. All furniture is CSS and
  clip-path, no image assets, per the standing constraint.</p>
</header>

<h2>Root</h2>
<p>Iron, not botanical — its sources will not all be plants. The overlay crosses the whole
token and carries its own turn count. The test it has to pass is the third specimen: the
silhouette must still identify the unit through the iron.</p>
<div class="grid">{root_specs}</div>

<h2>The health bar and its projection</h2>
<p>One netted marker, never two segments. <b>Direction is positional</b> — loss always
lives inside the fill, gain always outside it — so tint is free to carry identity alone:
fire, poison, blood, heal. <b>The fill itself is one constant colour</b> — a bar that turned amber then red was competing for the channel the projection needs.</p>
<div class="grid">{hp_specs}</div>

<h2>Protection</h2>
<p>Its own segmented bar, outboard of the health bar, so a pool that is spent reads
differently from health that is lost. When protection would absorb a tick, the projection
eats these segments and health is left alone.</p>
<div class="grid">{prot_specs}</div>

<h2>Overhead glyphs</h2>
<p>Stun, Weak, and one chevron for every named modifier. Nothing else — Burn, Bleed, Poison
and Regeneration moved into the health bar above, and Slow moved into the move chip.
A typical unit shows zero.</p>
<div class="grid">{over_specs}</div>

<h2>Base chips</h2>
<p>Move lower-left, danger lower-right, <b>both bare</b> — a haloed numeral and, for danger,
its type icon. No plate behind either. The danger figure is authored per bestiary entry and
makes no promise about reach or targeting; it is a learnable rating, not a forecast.</p>
<div class="grid">{chip_specs}</div>

<h2>The count pip, at true size</h2>
<p>The board carries a perspective, so a billboard's size depends on its depth. These are
the real measurements taken off the shipped viewer at 1920 wide.</p>
<div class="pips">{pip_row}</div>
<div class="note"><b>The glyph clears legibility everywhere; the pip does not.</b>
At the far edge of the board the count is a 7.3px digit. The fourth specimen is a
proposed fix — pip and numeral enlarged, glyph unchanged — kept here so the two can be
compared at true size rather than argued about in the abstract.</div>

<footer>Specimen sheet for the battle screen · furniture drawn in CSS and clip-path ·
figures from the battle-token cutout library · states and numbers are illustrative.</footer>
</div>
'''

open(OUT, 'w', encoding='utf8').write(html)
print('wrote %s · %.0f KB' % (OUT, os.path.getsize(OUT) / 1024))
