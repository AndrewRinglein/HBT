import os
"""Build VFX/PREVIEW-NUMBER.html — five treatments for the damage PROJECTION,
each shown beside the result float it must not be confused with."""
import base64, io, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))  # the project root, from this file
OUT=ROOT+'/VFX/PREVIEW-NUMBER.html'
os.chdir(ROOT)

def b64(p,maxh=460):
    im=Image.open(p).convert('RGBA')
    if im.height>maxh: im=im.resize((round(im.width*maxh/im.height),maxh),Image.LANCZOS)
    im=im.quantize(256); b=io.BytesIO(); im.save(b,'PNG',optimize=True)
    return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()

ZOM=b64('battle-tokens/units/zombie_256.png')
GROUND=b64('VFX/battle-screen-mocks/art/hexPlains.png',300)

HALO='text-shadow:0 2px 5px #000,0 0 14px rgba(0,0,0,.95),0 0 3px #000'

# each: (id, label, note, css for the damage numeral, css for the percent)
TREATMENTS=[
 ('bone','A · Bone',
  'The colour of the health bar fill — the substance being predicted. Neutral, '
  'and impossible to mistake for any damage type.',
  f'color:#e9e3d2;{HALO}', 'color:#ffd98a'),
 ('hollow','B · Hollow bone',
  'Same hue, drawn as outline instead of fill. Says <i>not yet real</i> in the '
  'form itself, so it survives being any colour later.',
  'color:transparent;-webkit-text-stroke:2px #e9e3d2;'
  'text-shadow:0 2px 6px rgba(0,0,0,.9)', 'color:#ffd98a'),
 ('brass','C · Brass, all one voice',
  'The projection becomes a single gold block — percent, damage, mitigation. '
  'Reads as one instrument, but the damage stops out-weighing the percent.',
  f'color:#e0b95e;{HALO}', 'color:#e0b95e'),
 ('steel','D · Cool steel',
  'A whole system in one move: <b>cool means forecast, warm means outcome</b>. '
  'The mitigation line is already this colour, so the aim column becomes one family.',
  f'color:#9fb6c8;{HALO}', 'color:#9fb6c8'),
 ('ledger','E · Bone on a rule',
  'Bone, with a hairline under the figure — a quoted number, the way a ledger '
  'quotes one. Colour stays free for something else entirely.',
  f'color:#e9e3d2;border-bottom:2px solid #6b6659;padding-bottom:2px;{HALO}',
  'color:#ffd98a'),
]

def card(tid,label,note,dmgcss,pctcss):
    return f'''<figure class="spec">
  <div class="stage">
    <div class="tok"><div class="fig" style="background-image:url('{ZOM}')"></div>
      <div class="fring"></div></div>
    <div class="aim">
      <div class="pct" style="{pctcss}">72%</div>
      <div class="dmg" style="{dmgcss}">13</div>
      <div class="mit">&minus;2 <span>ARMOR</span></div>
    </div>
    <div class="result">&minus;11</div>
  </div>
  <figcaption><b>{label}</b><span>{note}</span></figcaption></figure>'''

cards=''.join(card(*t) for t in TREATMENTS)

html=f'''<title>The Projection Number</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;600;700&family=Spectral:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{{--ground:#0b0a08;--plate:#15120d;--panel:#191713;--border:#332c22;--brass:#6b5a33;
 --gold:#e0b95e;--ink:#e8e5dc;--dim:#8b8778;--faint:#5f594c}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--ground);color:var(--ink);
 font-family:'Barlow Semi Condensed',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding:40px 26px 90px}}
header{{border-bottom:2px solid var(--brass);padding-bottom:18px}}
h1{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:32px;margin:0 0 8px;text-wrap:balance}}
.sub{{color:var(--dim);font-size:14.5px;line-height:1.55;max-width:68ch;margin:0}}
.sub b{{color:#c8bfa4;font-weight:600}}
h2{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:19px;margin:40px 0 4px;color:var(--gold)}}
h2 + p{{margin:0 0 18px;color:var(--dim);font-size:13.5px;line-height:1.5;max-width:66ch}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:16px}}
.spec{{margin:0;display:flex;flex-direction:column}}
.stage{{position:relative;height:250px;border:1px solid var(--border);border-radius:4px 4px 0 0;
 border-bottom:none;background:url('{GROUND}') 24% 74%/168px no-repeat,var(--plate);overflow:hidden}}
figcaption{{border:1px solid var(--border);border-radius:0 0 4px 4px;background:var(--panel);
 padding:9px 11px 11px;display:flex;flex-direction:column;gap:3px;flex:1}}
figcaption b{{font-size:13.5px;font-weight:700}}
figcaption span{{font-size:11.5px;line-height:1.45;color:var(--dim)}}
figcaption i{{color:#c8bfa4;font-style:italic}}
.tok{{position:absolute;left:16%;bottom:44px;width:74px;height:120px}}
.fig{{position:absolute;inset:0;background-repeat:no-repeat;background-position:center bottom;
 background-size:contain}}
.fring{{position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);width:74px;height:24px;
 border:2px solid #a964d8;border-radius:50%;opacity:.5}}
.aim{{position:absolute;left:47%;top:26px;display:flex;flex-direction:column;gap:2px}}
.pct{{font:700 24px/1 'Barlow Semi Condensed',sans-serif;{HALO}}}
.dmg{{font:700 46px/1 'Barlow Semi Condensed',sans-serif;align-self:flex-start}}
.mit{{font:600 20px/1 'Barlow Semi Condensed',sans-serif;color:#7f9ec0;{HALO}}}
.mit span{{font-size:11px;letter-spacing:.06em}}
.result{{position:absolute;left:14%;top:12px;font:700 36px/1 'Barlow Semi Condensed',sans-serif;
 color:#ff5346;{HALO}}}
.result::after{{content:'result';position:absolute;left:2px;top:38px;font:600 8.5px/1 'Barlow Semi Condensed',sans-serif;
 letter-spacing:.13em;text-transform:uppercase;color:var(--faint);text-shadow:none}}
.note{{margin-top:18px;padding:13px 15px;border-left:3px solid var(--gold);background:#171410;
 font-size:13px;line-height:1.55;color:#cbc3ae;max-width:76ch}}
.note b{{color:var(--gold);font-weight:600}}
footer{{margin-top:48px;padding-top:16px;border-top:1px solid var(--border);color:var(--faint);
 font-size:11.5px;line-height:1.6}}
</style>
<div class="wrap">
<header>
  <h1>The Projection Number</h1>
  <p class="sub">Red stopped being available: it is now the <b>result</b> colour for physical
  damage, so a red forecast reads as damage that already happened. Each card shows the
  projection in a candidate treatment with a red result float beside it &mdash; <b>the contrast
  between those two is the whole decision</b>.</p>
</header>

<h2>Five treatments</h2>
<p>Every one keeps the percent, the big figure and the mitigation line in the ruled order,
and none of them uses a plate or alpha.</p>
<div class="grid">{cards}</div>

<div class="note"><b>My pick is D, cool steel</b> &mdash; it is the only one that buys a rule
rather than a colour: <i>cool is a forecast, warm is what happened</i>. The mitigation line is
already steel, so the aim column becomes one coherent family, and every future prediction the
UI needs &mdash; a heal preview, a projected status, the phantom's numbers &mdash; inherits the
rule for free instead of needing its own decision. <b>B, hollow bone</b>, is the one to pick if
you would rather the tell be the <i>form</i> than the hue, since it stays legible whatever
colour it ends up.</div>

<footer>Design surface for the battle screen · numbers illustrative · figure from the
battle-token cutout library.</footer>
</div>
'''
open(OUT,'w',encoding='utf8').write(html)
print('wrote %s · %.0f KB' % (OUT,os.path.getsize(OUT)/1024))
