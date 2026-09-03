"""Build VFX/STAT-BLOCK.html — five layouts for the panel's stat block.
Name left, number right; green when a modifier raises it, red when one lowers
it. Drawn at the real 472px panel width so the judgement is at true scale."""
import os
ROOT='/sessions/serene-ecstatic-sagan/mnt/Heroes of Blight and Tragic'
OUT=ROOT+'/VFX/STAT-BLOCK.html'
os.chdir(ROOT)

UP,DOWN,BASE='#7ec45f','#d1665c','#e8e5dc'

# (label, value, delta) — real Oathblade (ALPHA) numbers, two modifiers faked
# so both signal states are visible in every layout.
STATS=[('Move',5,0),('Armor',3,0),('Resist',1,0),
       ('Dodge',8,-2),('Accuracy',75,0),('Crit',5,+5),
       ('Max HP',22,0),('Strength',7,+2),('Precision',3,0)]

GROUPS=[('Offence',[('Accuracy',75,0),('Strength',7,+2),('Precision',3,0),('Crit',5,+5)]),
        ('Defence',[('Armor',3,0),('Resist',1,0),('Dodge',8,-2)]),
        ('Body',   [('Max HP',22,0),('Move',5,0)])]

def col(d): return UP if d>0 else DOWN if d<0 else BASE
def delta(d): return '' if d==0 else f'<em>{"+" if d>0 else ""}{d}</em>'

# ── A · ledger rows ──────────────────────────────────────────────────────
def look_a():
    rows=''.join(f'<div class="lrow"><span class="ln">{n}</span>'
                 f'<span class="lv" style="color:{col(d)}">{delta(d)}{v}</span></div>'
                 for n,v,d in STATS)
    return f'<div class="ledger">{rows}</div>'

# ── B · two columns ──────────────────────────────────────────────────────
def look_b():
    half=(len(STATS)+1)//2
    def side(items): return ''.join(
        f'<div class="lrow"><span class="ln">{n}</span>'
        f'<span class="lv" style="color:{col(d)}">{delta(d)}{v}</span></div>'
        for n,v,d in items)
    return (f'<div class="twocol"><div class="ledger">{side(STATS[:half])}</div>'
            f'<div class="ledger">{side(STATS[half:])}</div></div>')

# ── C · grouped ──────────────────────────────────────────────────────────
def look_c():
    out=''
    for gname,items in GROUPS:
        rows=''.join(f'<div class="lrow"><span class="ln">{n}</span>'
                     f'<span class="lv" style="color:{col(d)}">{delta(d)}{v}</span></div>'
                     for n,v,d in items)
        out+=f'<div class="ghead">{gname}</div><div class="ledger">{rows}</div>'
    return out

# ── D · leader dots ──────────────────────────────────────────────────────
def look_d():
    rows=''.join(f'<div class="drow"><span class="ln">{n}</span><i></i>'
                 f'<span class="lv" style="color:{col(d)}">{delta(d)}{v}</span></div>'
                 for n,v,d in STATS)
    return f'<div class="ledger dots">{rows}</div>'

# ── E · plated pairs ─────────────────────────────────────────────────────
def look_e():
    rows=''.join(f'<div class="prow"><span class="ln">{n}</span>'
                 f'<span class="lv" style="color:{col(d)}">{delta(d)}{v}</span></div>'
                 for n,v,d in STATS)
    return f'<div class="plates">{rows}</div>'

LOOKS=[('A · Ledger', 'One row per stat, full width, hairline between. The number '
        'sits on a hard right edge so the whole column scans as a list of figures.', look_a),
       ('B · Two columns', 'The same row, in two stacks. Half the height, and the panel '
        'has the width for it — but two right edges means two places for the eye to land.', look_b),
       ('C · Grouped', 'Offence, defence, body. The grouping is the information: you look '
        'for a defensive number in the defensive block instead of scanning nine rows.', look_c),
       ('D · Leader dots', 'A rule carries the eye from name to figure. Costs nothing, and '
        'holds up when a long name sits above a short one.', look_d),
       ('E · Plated', 'Each pair on its own plate. Most structure, most chrome — and the '
        'plates compete with the ability rows below for the same visual weight.', look_e)]

cards=''.join(f'''<figure class="spec">
  <div class="panelbox">{fn()}</div>
  <figcaption><b>{name}</b><span>{note}</span></figcaption></figure>'''
  for name,note,fn in LOOKS)

html=f'''<title>The Stat Block</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;600;700&family=Spectral:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{{--ground:#0b0a08;--plate:#15120d;--panel:#191713;--border:#332c22;--brass:#6b5a33;
 --gold:#e0b95e;--ink:#e8e5dc;--dim:#8b8778;--faint:#5f594c}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--ground);color:var(--ink);
 font-family:'Barlow Semi Condensed',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1240px;margin:0 auto;padding:40px 26px 90px}}
header{{border-bottom:2px solid var(--brass);padding-bottom:18px}}
h1{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:32px;margin:0 0 8px;text-wrap:balance}}
.sub{{color:var(--dim);font-size:14.5px;line-height:1.55;max-width:68ch;margin:0}}
.sub b{{color:#c8bfa4;font-weight:600}}
.key{{display:flex;gap:20px;margin-top:14px;font-size:12.5px;color:var(--dim);flex-wrap:wrap}}
.key i{{font-style:normal;font-weight:700;font-family:ui-monospace,monospace}}
h2{{font-family:Spectral,Georgia,serif;font-weight:600;font-size:19px;margin:38px 0 18px;color:var(--gold)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}}
.spec{{margin:0;display:flex;flex-direction:column}}
.panelbox{{width:100%;max-width:472px;background:var(--panel);border:1px solid var(--border);
 border-radius:4px 4px 0 0;border-bottom:none;padding:14px}}
figcaption{{max-width:472px;border:1px solid var(--border);border-radius:0 0 4px 4px;
 background:#14120e;padding:9px 11px 11px;display:flex;flex-direction:column;gap:3px;flex:1}}
figcaption b{{font-size:13.5px;font-weight:700}}
figcaption span{{font-size:11.5px;line-height:1.45;color:var(--dim)}}

/* shared row grammar: name left, figure hard right */
.ledger{{display:flex;flex-direction:column}}
.lrow{{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
 padding:6px 2px;border-bottom:1px solid #241f17}}
.ledger .lrow:last-child{{border-bottom:none}}
.ln{{font:600 13.5px 'Barlow Semi Condensed',sans-serif;letter-spacing:.02em;color:#a9a394}}
.lv{{font:700 16px ui-monospace,monospace;font-variant-numeric:tabular-nums;
 white-space:nowrap}}
.lv em{{font-style:normal;font-size:10.5px;font-weight:700;opacity:.85;margin-right:5px}}

.twocol{{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}}
.ghead{{font:700 9.5px 'Barlow Semi Condensed',sans-serif;letter-spacing:.14em;
 text-transform:uppercase;color:var(--faint);margin:10px 0 2px}}
.ghead:first-child{{margin-top:0}}

.dots .drow{{display:flex;align-items:baseline;gap:7px;padding:6px 2px;border:none}}
.dots .drow i{{flex:1;border-bottom:1px dotted #3a3327;transform:translateY(-3px)}}

.plates{{display:flex;flex-direction:column;gap:4px}}
.prow{{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
 padding:6px 9px;background:var(--plate);border:1px solid var(--border);border-radius:2px}}
.note{{margin-top:20px;padding:13px 15px;border-left:3px solid var(--gold);background:#171410;
 font-size:13px;line-height:1.55;color:#cbc3ae;max-width:76ch}}
.note b{{color:var(--gold);font-weight:600}}
footer{{margin-top:48px;padding-top:16px;border-top:1px solid var(--border);color:var(--faint);
 font-size:11.5px;line-height:1.6}}
</style>
<div class="wrap">
<header>
  <h1>The Stat Block</h1>
  <p class="sub">Five layouts, all obeying the same rule: <b>name left, figure hard right</b>,
  the figure <b>green when a modifier raises it and red when one lowers it</b>. Real
  Oathblade numbers, with two modifiers present so both signal states show in every layout.
  Drawn at the panel's true 472px width.</p>
  <div class="key">
    <span><i style="color:{BASE}">22</i> unmodified</span>
    <span><i style="color:{UP}">+2 7</i> raised by a modifier</span>
    <span><i style="color:{DOWN}">-2 8</i> lowered by one</span>
  </div>
</header>

<h2>Five layouts</h2>
<div class="grid">{cards}</div>

<div class="note"><b>My pick is C, grouped</b> — it is the only one where the structure carries
information rather than decoration. Nine equal rows make you read all nine; offence / defence /
body means you go straight to the half you care about, and it is the arrangement that survives
the list growing. <b>A</b> is the right answer if you want the block to stay one quiet column,
and <b>D</b>'s leader dots are worth stealing into whichever you choose. <b>E is the one to
avoid</b>: plated rows fight the ability rows below for the same weight.
<br><br>The small delta before the figure (<i>+2</i>) is optional in all five — the colour
already carries the sign. Keep it if the exact amount matters, drop it if the direction is enough.</div>

<footer>Design surface for the battle screen · panel width 472px · numbers from
Oathblade (ALPHA) with two illustrative modifiers.</footer>
</div>
'''
open(OUT,'w',encoding='utf8').write(html)
print('wrote %s · %.0f KB' % (OUT,os.path.getsize(OUT)/1024))
