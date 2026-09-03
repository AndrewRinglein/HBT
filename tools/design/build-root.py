"""Build VFX/ROOT-VARIANTS.html — eight ways to draw Root, plus the corrected
danger chip. CSS and clip-path only; real token art so the silhouette test is
honest. A design surface: pick one, or a pair to cross."""
import base64, io, os
from PIL import Image

ROOT = '/sessions/serene-ecstatic-sagan/mnt/Heroes of Blight and Tragic'
OUT  = ROOT + '/VFX/ROOT-VARIANTS.html'
os.chdir(ROOT)

def b64(path, maxh=520):
    im = Image.open(path).convert('RGBA')
    if im.height > maxh:
        im = im.resize((round(im.width*maxh/im.height), maxh), Image.LANCZOS)
    im = im.quantize(256)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

HERO   = b64('battle-tokens/units/oathblade_256.png')
BULKY  = b64('battle-tokens/units/zombie_256.png')
GROUND = b64('VFX/battle-screen-mocks/art/hexPlains.png', 320)

IRON_L, IRON_M, IRON_D = '#9a9285', '#6b6659', '#3c3830'

def tok(art, h=136, aspect=0.50, tint='#e0b95e', under='', over=''):
    w = round(h*aspect)
    return f'''<div class="tok" style="width:{w}px;height:{h}px">
      {under}
      <div class="fring" style="border-color:{tint}"></div>
      <div class="shadow"></div>
      <div class="fig" style="background-image:url('{art}')"></div>
      {over}</div>'''

def tick(n, cls='tick'):
    return f'<b class="{cls}">{n}</b>'

def links(n, w=11, h=8, gap=-1):
    return ''.join(
      f'<i style="width:{w}px;height:{h}px;border:2.5px solid {IRON_L if i%2 else IRON_M};'
      f'border-radius:50%;margin-left:{gap}px;transform:rotate({0 if i%2 else 90}deg);'
      f'box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 1px 2px rgba(0,0,0,.85)"></i>'
      for i in range(n))

# ── the eight ────────────────────────────────────────────────────────────
def v_shackle():   # A — ankle cuffs, short chain, stake in the ground
    return f'''<div class="ov">
      <div class="cuffL"></div><div class="cuffR"></div>
      <div class="sag">{links(5,9,7)}</div>
      <div class="stake"></div>{tick(2,'tick stake-tick')}</div>'''

def v_anchor():    # B — iron ring embedded in the hex, chains to the base
    return f'''<div class="ov">
      <div class="ring"></div>
      <div class="spoke" style="transform:rotate(20deg)">{links(3,8,6)}</div>
      <div class="spoke" style="transform:rotate(160deg)">{links(3,8,6)}</div>
      {tick(2,'tick ring-tick')}</div>'''

def v_staked():    # C — four taut chains from the feet to the hex rim
    return f'''<div class="ov">''' + ''.join(
      f'<div class="taut" style="transform:rotate({a}deg)"><i></i><b></b></div>'
      for a in (28, 152, 208, 332)) + f'{tick(2,"tick low-tick")}</div>'

def v_trap():      # D — iron jaws closed at the feet
    teeth = ''.join(f'<i style="left:{4+i*11}px"></i>' for i in range(7))
    return f'''<div class="ov">
      <div class="jawTop">{teeth}</div>
      <div class="jawBot">{teeth}</div>
      <div class="trapBody"></div>{tick(2,'tick trap-tick')}</div>'''

def v_bind():      # E — heavy diagonal bind with a padlock
    return f'''<div class="ov">
      <div class="bind">{links(9,12,9)}</div>
      <div class="lock"></div>{tick(2,'tick lock-tick')}</div>'''

def v_bars():      # F — three sparse cell bars, silhouette reads between them
    return '<div class="ov">' + ''.join(
      f'<div class="bar" style="left:{p}%"></div>' for p in (18, 50, 82)) + \
      f'<div class="barTop"></div>{tick(2,"tick bar-tick")}</div>'

def v_spikes():    # G — iron spikes driven through the base into the ground
    return '<div class="ov">' + ''.join(
      f'<div class="spike" style="left:{p}%;transform:rotate({r}deg)"></div>'
      for p, r in ((14,-26),(38,-8),(62,10),(86,28))) + \
      f'{tick(2,"tick low-tick")}</div>'

def v_ball():      # H — ball and chain at the ankle
    return f'''<div class="ov">
      <div class="cuffL" style="left:22%"></div>
      <div class="drape">{links(5,9,7)}</div>
      <div class="ball">{tick(2,'tick ball-tick')}</div></div>'''

VARIANTS = [
 ('A · Shackle and stake', 'Cuffs at the ankles, a short sag of chain, an iron stake driven '
  'into the hex. Nothing crosses the body — the silhouette is untouched.', v_shackle, HERO, 0.50),
 ('B · Ground anchor', 'A ring embedded in the ground with chains to the base. Reads as a '
  'property of the hex more than of the unit.', v_anchor, HERO, 0.50),
 ('C · Staked out', 'Four taut chains to the hex rim. The tension is the tell — the shape '
  'says pulled-in-four-directions before you read any iron.', v_staked, HERO, 0.50),
 ('D · Bear trap', 'Jaws closed at the feet. The most instantly legible of the eight, and '
  'the most violent — it may say wound rather than hold.', v_trap, HERO, 0.50),
 ('E · Diagonal bind', 'A heavy chain and padlock across the torso. This is the family the '
  'first attempt came from, drawn properly — still the worst for identification.', v_bind, HERO, 0.50),
 ('F · Cell bars', 'Three sparse bars in front of the unit. Silhouette reads between them; '
  'costs no ground space, which matters on a crowded hex.', v_bars, HERO, 0.50),
 ('G · Iron spikes', 'Spikes driven through the base. Cheap, quiet, and scales to a big '
  'figure without changing size.', v_spikes, BULKY, 0.62),
 ('H · Ball and chain', 'A weight beside the unit, cuffed at the ankle. Silhouette untouched, '
  'the count sits naturally on the ball, and it is readable at any zoom.', v_ball, HERO, 0.50),
]

cards = ''.join(f'''<figure class="spec">
  <div class="stage">{tok(art, aspect=asp, tint='#a964d8' if art is BULKY else '#e0b95e', over=fn())}</div>
  <figcaption><b>{name}</b><span>{note}</span></figcaption></figure>'''
  for name, note, fn, art, asp in VARIANTS)

# ── the corrected danger chip ────────────────────────────────────────────
SWORD = 'polygon(46% 0,54% 0,56% 62%,64% 70%,50% 78%,36% 70%,44% 62%)'
def swords():
    return ('<span class="dico">'
            f'<i style="clip-path:{SWORD};transform:rotate(34deg)"></i>'
            f'<i style="clip-path:{SWORD};transform:rotate(-34deg)"></i></span>')
def bow():
    return ('<span class="dico"><b class="bowarc"></b><b class="bowstr"></b>'
            '<b class="bowarr"></b></span>')

def dchip(n, kind, tint='#d9b8f2', border=None):
    # NO BOX (ruled 2026-09-01) — a bare number and its icon, haloed the way
    # the targeting numbers are. Same rule, same reason: the plate was reading
    # as chrome around information that can carry itself.
    return (f'<div class="dchip" style="color:{tint}">'
            f'<span class="dnum">{n}</span>{swords() if kind=="melee" else bow()}</div>')

danger = ''.join(f'''<figure class="spec sm">
  <div class="stage">{tok(BULKY, aspect=0.62, tint='#a964d8', over=f'<div class="dwrap">{dchip(n,k)}</div>')}</div>
  <figcaption><b>{lbl}</b><span>{note}</span></figcaption></figure>'''
  for n, k, lbl, note in [
    (12,'melee','12 · melee','bare on the ground — no plate, no border'),
    (4,'ranged','4 · ranged','the bow reads at a glance without a label or a box'),
    (2,'melee','2 · melee','a low number is the whole point — this thing is not the threat'),
  ])

html = f'''<title>Root, Eight Ways</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;600;700&family=Spectral:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{{--ground:#0b0a08;--plate:#15120d;--panel:#191713;--border:#332c22;--brass:#6b5a33;
 --gold:#e0b95e;--ink:#e8e5dc;--dim:#8b8778;--faint:#5f594c;
 --ironL:{IRON_L};--ironM:{IRON_M};--ironD:{IRON_D}}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--ground);color:var(--ink);
 font-family:'Barlow Semi Condensed',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding:40px 26px 90px}}
header{{border-bottom:2px solid var(--brass);padding-bottom:18px}}
h1{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:33px;margin:0 0 8px;text-wrap:balance}}
.sub{{color:var(--dim);font-size:14.5px;line-height:1.55;max-width:66ch;margin:0}}
.sub b{{color:#c8bfa4;font-weight:600}}
h2{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:20px;margin:44px 0 4px;color:var(--gold)}}
h2 + p{{margin:0 0 20px;color:var(--dim);font-size:13.5px;line-height:1.5;max-width:66ch}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(236px,1fr));gap:16px}}
.spec{{margin:0;display:flex;flex-direction:column}}
.spec .stage{{position:relative;height:236px;border:1px solid var(--border);border-radius:4px 4px 0 0;
 border-bottom:none;background:radial-gradient(ellipse at 50% 80%,rgba(224,185,94,.05),transparent 62%),
 url('{GROUND}') center 66%/176px no-repeat,var(--plate);
 display:flex;align-items:flex-end;justify-content:center;padding-bottom:52px;overflow:hidden}}
.spec.sm .stage{{height:200px}}
figcaption{{border:1px solid var(--border);border-radius:0 0 4px 4px;background:var(--panel);
 padding:9px 11px 11px;display:flex;flex-direction:column;gap:3px;flex:1}}
figcaption b{{font-size:13.5px;font-weight:700}}
figcaption span{{font-size:11.5px;line-height:1.45;color:var(--dim)}}

.tok{{position:relative}}
.fig{{position:absolute;inset:0;background-repeat:no-repeat;background-position:center bottom;background-size:contain}}
.fring{{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);width:76px;height:26px;
 border:2px solid;border-radius:50%;opacity:.5}}
.shadow{{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%) rotate(-14deg);
 width:72px;height:20px;border-radius:50%;background:rgba(4,4,3,.62)}}
.ov{{position:absolute;inset:0;pointer-events:none}}
.tick{{position:absolute;font:700 14px/1 ui-monospace,monospace;color:var(--ink);background:#100e0a;
 border:1px solid var(--ironL);border-radius:2px;padding:2px 6px;box-shadow:0 2px 6px rgba(0,0,0,.85);
 font-variant-numeric:tabular-nums}}

/* A — shackle and stake */
.cuffL,.cuffR{{position:absolute;bottom:2px;width:17px;height:11px;border:3px solid var(--ironL);
 border-radius:3px;background:linear-gradient(var(--ironM),var(--ironD));
 box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 4px rgba(0,0,0,.8)}}
.cuffL{{left:12%}} .cuffR{{right:12%}}
.sag{{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);display:flex;align-items:center}}
.stake{{position:absolute;left:50%;bottom:-19px;transform:translateX(-50%);width:7px;height:20px;
 background:linear-gradient(var(--ironL),var(--ironD));clip-path:polygon(0 0,100% 0,60% 100%,40% 100%);
 box-shadow:0 2px 5px rgba(0,0,0,.9)}}
.stake-tick{{left:calc(50% + 16px);bottom:-16px}}

/* B — ground anchor */
.ring{{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%) scaleY(.42);
 width:52px;height:52px;border:5px solid var(--ironL);border-radius:50%;
 box-shadow:inset 0 0 0 2px var(--ironD),0 3px 6px rgba(0,0,0,.85)}}
.spoke{{position:absolute;left:50%;bottom:-2px;transform-origin:0 50%;display:flex;align-items:center}}
.ring-tick{{left:calc(50% + 30px);bottom:-22px}}

/* C — staked out */
.taut{{position:absolute;left:50%;bottom:4px;width:60px;height:3px;transform-origin:0 50%}}
.taut i{{position:absolute;inset:0;background:repeating-linear-gradient(90deg,
 var(--ironL) 0 5px,var(--ironD) 5px 9px);border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.9)}}
.taut b{{position:absolute;right:-4px;top:-4px;width:9px;height:11px;background:var(--ironL);
 clip-path:polygon(0 0,100% 0,60% 100%,40% 100%)}}
.low-tick{{left:calc(50% + 34px);bottom:-20px}}

/* D — bear trap */
.jawTop,.jawBot{{position:absolute;left:50%;transform:translateX(-50%);width:82px;height:15px}}
.jawTop{{bottom:14px}} .jawBot{{bottom:-4px}}
.jawTop i,.jawBot i{{position:absolute;width:7px;height:13px;background:var(--ironL);
 box-shadow:0 1px 2px rgba(0,0,0,.9)}}
.jawTop i{{top:0;clip-path:polygon(0 0,100% 0,50% 100%)}}
.jawBot i{{bottom:0;clip-path:polygon(50% 0,100% 100%,0 100%)}}
.trapBody{{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%) scaleY(.5);
 width:66px;height:36px;border:4px solid var(--ironM);border-radius:50%;
 background:radial-gradient(ellipse,rgba(60,56,48,.9),rgba(28,26,22,.6))}}
.trap-tick{{left:calc(50% + 38px);bottom:-14px}}

/* E — diagonal bind */
.bind{{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-24deg);
 display:flex;align-items:center}}
.lock{{position:absolute;left:52%;top:56%;width:17px;height:15px;border-radius:2px;
 background:linear-gradient(var(--ironL),var(--ironD));border:1px solid #201d18;
 box-shadow:0 2px 5px rgba(0,0,0,.9)}}
.lock::before{{content:'';position:absolute;left:4px;top:-7px;width:9px;height:9px;
 border:2.5px solid var(--ironL);border-bottom:none;border-radius:5px 5px 0 0}}
.lock-tick{{left:calc(50% + 26px);top:52%}}

/* F — cell bars */
.bar{{position:absolute;top:-4px;bottom:-6px;width:6px;transform:translateX(-50%);
 background:linear-gradient(90deg,var(--ironD),var(--ironL) 42%,var(--ironD));
 border-radius:2px;box-shadow:0 0 5px rgba(0,0,0,.85)}}
.barTop{{position:absolute;left:8%;right:8%;top:-4px;height:6px;border-radius:2px;
 background:linear-gradient(var(--ironL),var(--ironD));box-shadow:0 2px 5px rgba(0,0,0,.9)}}
.bar-tick{{left:50%;transform:translateX(-50%);top:-26px}}

/* G — iron spikes */
.spike{{position:absolute;bottom:-8px;width:8px;height:30px;transform-origin:50% 100%;
 background:linear-gradient(var(--ironL),var(--ironD));
 clip-path:polygon(50% 0,100% 26%,68% 100%,32% 100%,0 26%);
 box-shadow:0 2px 5px rgba(0,0,0,.9)}}

/* H — ball and chain */
.drape{{position:absolute;left:26%;bottom:-2px;display:flex;align-items:center;transform:rotate(16deg)}}
.ball{{position:absolute;left:calc(26% + 46px);bottom:-14px;width:34px;height:34px;border-radius:50%;
 background:radial-gradient(circle at 34% 30%,#8e887b,#4a4640 46%,#211f1a);
 box-shadow:0 4px 9px rgba(0,0,0,.9),inset 0 -3px 6px rgba(0,0,0,.6);
 display:flex;align-items:center;justify-content:center}}
.ball-tick{{position:static;background:none;border:none;padding:0;box-shadow:none;
 color:#f0ece0;font-size:15px;text-shadow:0 1px 3px #000}}

/* ── danger chip ─────────────────────────────────────────────────────── */
.dwrap{{position:absolute;right:-24px;bottom:-14px}}
.dchip{{display:flex;align-items:center;gap:4px;
 filter:drop-shadow(0 1px 2px #000) drop-shadow(0 0 5px rgba(0,0,0,.95))}}
.dnum{{font:700 18px/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;
 text-shadow:0 2px 4px #000,0 0 9px rgba(0,0,0,.95),0 0 2px #000}}
.dico{{position:relative;width:15px;height:15px;flex:0 0 15px;display:block}}
.dico i{{position:absolute;inset:0;background:currentColor;display:block}}
.bowarc{{position:absolute;left:3px;top:0;width:9px;height:15px;border:2px solid currentColor;
 border-left:none;border-radius:0 9px 9px 0}}
.bowstr{{position:absolute;left:3px;top:0;width:1.5px;height:15px;background:currentColor;opacity:.85}}
.bowarr{{position:absolute;left:1px;top:6.5px;width:13px;height:2px;background:currentColor}}
.note{{margin-top:18px;padding:13px 15px;border-left:3px solid var(--gold);background:#171410;
 font-size:13px;line-height:1.55;color:#cbc3ae;max-width:74ch}}
.note b{{color:var(--gold);font-weight:600}}
footer{{margin-top:52px;padding-top:16px;border-top:1px solid var(--border);color:var(--faint);
 font-size:11.5px;line-height:1.6}}
</style>
<div class="wrap">
<header>
  <h1>Root, Eight Ways</h1>
  <p class="sub">The first attempt put a chain across the chest, which fought the silhouette
  instead of reading as <i>held</i>. These split into two families: <b>iron on the ground</b>,
  which leaves the figure alone, and <b>iron on the body</b>, which is more emphatic and costs
  identification. All CSS and clip-path; the figures are real cutouts so the silhouette test
  is honest.</p>
</header>

<h2>The eight</h2>
<p>Every one carries its turn count, and none of them is botanical — the sources will not all
be plants.</p>
<div class="grid">{cards}</div>

<div class="note"><b>If you want a recommendation:</b> H, ball and chain. It is the only one
that says <i>cannot leave</i> rather than <i>is being hurt</i>, it touches no part of the
silhouette, the count sits naturally on the ball, and it survives being shrunk. A and C are
the strongest alternates; C in particular reads at the smallest size because the tension
pattern is legible before any detail is.</div>

<h2>The danger chip, corrected</h2>
<p>Number first, then the type to its right — crossed swords for melee, a bow for ranged.
<b>No plate behind it</b>: a bare number and its icon, haloed the way the targeting numbers
are. Enemies and AI-controlled allies only; a player hero never carries one.</p>
<div class="grid">{danger}</div>

<footer>Design surface for the battle screen · Root and the danger chip drawn in CSS and
clip-path · figures from the battle-token cutout library.</footer>
</div>
'''
open(OUT,'w',encoding='utf8').write(html)
print('wrote %s · %.0f KB' % (OUT, os.path.getsize(OUT)/1024))
