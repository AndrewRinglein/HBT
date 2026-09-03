import base64, json, os, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
KEY=open('/tmp/.falkey').read().strip()
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','art','_civilian-drafts')
os.makedirs(OUT,exist_ok=True)
W,H=768,1152

# Style + composition come from hell-tcg's create-hero-art.md cardinal rules:
# full body head-to-feet, body facing RIGHT in profile with head turned to viewer,
# subtle environment background, battle-ready stance, no text.
STYLE=("Gwent card game artwork, dark fantasy trading card game art style like Witcher Gwent,"
 " muted earthy desaturated colours, heavy painterly brushstrokes, oil painting texture,"
 " dramatic moody side lighting, gritty weathered aesthetic, NOT smooth NOT digital.")
FRAME=(" FULL BODY portrait showing the ENTIRE figure from the top of the head to the bottom of the"
 " feet with the ground visible, character fills the full vertical frame, body facing RIGHT in side"
 " profile with the head turned slightly toward the viewer, alert braced stance."
 " No text, no signature, no watermark, no border, no card frame.")

# ONE archetype, THREE people. The archetype constants are what keep them all reading as
# farmers; the axes are what keep them from being the same farmer.
ARCHETYPE=("A peasant farmer of a poor medieval village. NOT a soldier, NOT noble, NOT wealthy."
 " Homespun undyed wool and patched linen, hand-me-down leather, no armour, no heraldry.")

FARMERS=[
 ("farmhand-reed",
  "A wiry young farmhand woman in her late teens, sunburnt and freckled, straw-blonde hair tied"
  " back in a kerchief. She grips a long-handled hoe like a staff. Patched grey smock over bare"
  " shins, bare feet, a seed bag on a cord at her hip. Wary, ready to bolt but not yet running."
  " Background: a dawn field of young barley, mist low between the rows."),
 ("ploughman-corbin",
  "A broad, thick-shouldered ploughman in his forties, black-bearded, mud to the knee, forearms"
  " like rope. He carries a heavy iron-tined pitchfork in both hands, held low and level."
  " A mud-caked leather apron over a sleeveless jerkin, heavy clogs. Exhausted and immovable."
  " Background: a churned ploughed field under heavy grey cloud, a broken furrow behind him."),
 ("old-reaper-mattick",
  "A gaunt old farmer in his seventies, stooped, white stubble, one eye clouded, knuckles swollen."
  " He holds a worn scythe upright, the blade notched from years of use. A sun-bleached long coat"
  " over wrapped legs, cracked boots. Stubborn, unafraid, past caring."
  " Background: a stubble field after harvest at dusk, crows on a bare tree."),
]

def post(ep,body,tries=3):
    last=None
    for i in range(tries):
        r=urllib.request.Request(f'https://fal.run/{ep}',data=json.dumps(body).encode(),
          headers={'Authorization':f'Key {KEY}','Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(r,timeout=420) as x: return json.load(x)
        except urllib.error.HTTPError as e:
            last=f'HTTP {e.code}: {e.read().decode()[:200]}'
            if e.code in (400,401,403,422): break
        except Exception as e: last=f'{type(e).__name__}: {e}'
        time.sleep(3+i*4)
    raise RuntimeError(last)

def to_card(p):
    im=Image.open(p).convert('RGB')
    if abs(im.width/im.height - W/H) > 1e-3:
        if im.width/im.height > W/H:
            nw=round(im.height*W/H); off=(im.width-nw)//2; im=im.crop((off,0,off+nw,im.height))
        else:
            nh=round(im.width*H/W); off=(im.height-nh)//2; im=im.crop((0,off,im.width,off+nh))
    im.resize((W,H),Image.LANCZOS).save(p); return Image.open(p).size

def go(job):
    slug,desc=job
    try:
        r=post('fal-ai/nano-banana-pro',{'prompt':STYLE+' '+ARCHETYPE+' '+desc+FRAME,
            'num_images':1,'output_format':'png','aspect_ratio':'2:3'})
        p=f'{OUT}/{slug}.png'
        with urllib.request.urlopen(r['images'][0]['url'],timeout=180) as resp:
            open(p,'wb').write(resp.read())
        print('OK',slug,to_card(p),flush=True)
    except Exception as e: print('FAIL',slug,str(e)[:180],flush=True)
list(ThreadPoolExecutor(max_workers=3).map(go,FARMERS))
