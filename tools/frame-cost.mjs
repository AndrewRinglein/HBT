// viewer.frame-cost-measured — what one frame of the battle screen costs, printed. Found 2026-10-05 (Andrew, engine/DECISIONS.md
// 'the battle screen must feel smooth: the speed first; …': "The game still feels clutzy … I want this to feel smooth like a AAA
// game."). The root chat measured it by hand; no tool said so, so nothing held it. This tool does the same by itself. It ASSERTS
// NOTHING: the items after it each name the column they bring down, and carry this table before and after in their landing note.
//
//   node tools/frame-cost.mjs [battle ...] [--page <built page>] [--frames N] [--software] [--json]
//
//   battle      an encounter id (encounter.opening.orphanage) or its short name (orphanage, lumberjack, bridge, cavern-trail,
//               gates, cathedral, caravan-aftermath); none named: the six opening battles and the caravan encounter
//   --page      the built page that plays a battle (default ../kingdom/BATTLE-SANDBOX.html), opened as ?play=<battle>
//   --frames    frames measured for each number (default 30, never fewer)
//   --software  draw with the software renderer (SwiftShader), as the kingdom's screenshot tools do; default: this machine's GPU
//   --json      print the rows as JSON instead of the table
//
// HOW (the hand method, kept): the built page is opened in real Chrome (playwright-core from ../engine, as
// kingdom/tools/camera-shows-edge-units.shot.mjs does) in a 1920x1080 window. Once the battle's 3D scene is up:
//   · window.requestAnimationFrame is replaced by a function that only STORES the callback — a hidden or headless page barely
//     fires it, and timers are throttled there — and the stored callbacks are called by hand, one frame at a time, every one of
//     them (so a glide, an effect or an edge scroll goes on as it would), the 3D scene's own (src/terrain3d.js frame()) timed
//     with the real performance.now();
//   · the page's performance.now() is stepped by hand between frames — this is the hand method's busy wait without the wait:
//     stepped by more than SEE_EVERY ms, every frame is one the see-through check may run in ("with the check"); stepped by
//     1 ms, none is ("without it" — the draw alone);
//   · WebGL2RenderingContext.prototype.drawElements, drawArrays, drawElementsInstanced and drawArraysInstanced are wrapped to
//     count draw calls and triangles, keyed by canvas and by whether a framebuffer is bound: the scene's canvas with one bound
//     is the shadow map, without one the scene; the bodies' canvas is its own pass.
// Each number is taken over --frames frames with nothing moving (the bodies idling where they stand), and again while the view
// scrolls (the edge scroll's own step, a little each frame, back and forth between the bounds).
//
// viewer.see-through-only-when-moved (2026-10-05) added the see-through check's own columns, read from what the page says of it
// (src/terrain3d.js V.seeThrough; a page built before that item has none and the columns read —): how often the check ran over
// the still frames and over the scrolling ones; what ONE asking of "which pieces hide a body now" costs, by the structure the
// check uses and by trying every triangle (the rule as first written — the cost it had); and, over a round of views — the
// view turned through its four quarters and scrolled at each — in how many the two name the same pieces (all of them, or what
// is drawn see-through has changed).
//
// viewer.scenery-shadow-drawn-once (2026-10-05) added two more, for the sun's shadow: the draw calls of a frame with the clock
// HELD (stepped by nothing, so no body animates — "a still frame": the shadow pass should draw nothing in it); and, over a
// round of views, the same frame drawn both ways — the scenery's shadow kept and the bodies' drawn over it, then the shadow
// asked for whole as it was first written (src/terrain3d.js V.sceneryShadow.whole = true) — and both canvases' pixels
// compared, every one (a page built before that item has no such switch and the column reads —). The frame is also drawn twice
// the SAME way, and that count is printed beside the other: what differs between two frames drawn the same way is not the
// shadow's doing. The scene's blended pieces (leaves and the like) are left out of the picture for the comparison — they
// still cast — because two frames of them drawn the same way differ by thousands of pixels (viewer SWITCHES
// blendedPiecesShimmer; the row's JSON carries that count too, blendedNoise).
//
// viewer.still-frame-draws-nothing (2026-10-05): a frame in which nothing changed is no longer drawn, so the clock-held column
// reads no draw call at all; and the comparison frames above — the clock held — are each drawn by moving the camera's
// version on (the view itself stays). One more comparison rides with the shadow's: the bodies' canvas takes the scene's depth
// from the pieces that can hide a body in the view (src/terrain3d.js V.bodiesDepth: how many), and the same frame is drawn
// with the depth of every solid piece (V.bodiesDepth.whole = true, as first written) and the pixels compared.
//
// viewer.frame-time-tests-hold-under-load (2026-10-05): the page tests that read this tool's JSON went red in loaded gates on
// milliseconds that measured the machine. The table above keeps its milliseconds — a report. For the tests the JSON also
// carries what load cannot move or moves on both sides alike, and they assert only these:
//   · each measure's wallMs — the tool's own clock over the frames it measured — beside ms.total, the frames' script time
//     added up: the one can never be more than the other, whatever the machine is doing (the unit, checked without a number);
//   · stillPaired — still frames taken turn about, one with the see-through check due and one without (A, B, A, B …), the
//     median of each kind, their ratio, and how often the check ran over them;
//   · seeThrough.pairs and seeThrough.ratio — the two askings "which pieces hide a body now" are already made back to back at
//     every view of the round (the structure, then every triangle): the ratio of their medians.
//
// viewer.solid-pieces-drawn-by-material (2026-10-05): the scene's solid pieces that share a material are drawn from one batch,
// in ONE call that draws many (WEBGL_multi_draw's multiDrawElementsWEBGL) — counted here as the one draw call it is, with
// every triangle it draws, and (JSON: draws.many, draws.inMany) how many such calls a frame makes and how many pieces they
// draw between them. A row says what the page says of its batches (src/terrain3d.js V.solidBatches: how many batches hold how
// many of the scene's solid pieces, and how long they took to build while the scene loaded). In the round of views that the
// shadow is compared over, every view is also drawn both ways — the pieces batched, then each piece by itself as first
// written (V.solidBatches.whole = true) — and every pixel of both canvases compared: the batched column. And at every view
// of the see-through round the page is asked whether every piece faded see-through is out of its batch and drawn by itself.
// The still frames are also measured once more with every piece drawn by itself (eachByItself): the draw calls the batches
// save, counted in the same run on the same view — and the triangles, which must be the very same.
//
// viewer.pixel-compare-tests-hold-against-frame-noise (2026-10-06): HOW TWO WAYS OF DRAWING A VIEW ARE COMPARED. This machine's
// graphics card, handed the very same calls with the very same numbers, gives a still frame one of a few pictures — a handful
// of pixels, the same ones for a view, one shade of 255 apart — and which one changes from frame to frame (found by folding
// every call of a frame into one number: forty frames, one number, more than one picture; the software renderer never does
// it; viewer SWITCHES.md, the item's section). One drawing of each way compared with one drawing of the other therefore read
// a few pixels now and then that were neither way's doing, and the page tests that asked for 0 went red one gate in three;
// the batched compare drew a differing view again, up to three times, which only made that rarer. NO COMPARE DRAWS AGAIN
// UNTIL IT MATCHES ANY MORE. Each of the three compares — the sun's shadow kept against whole, the bodies' depth from the
// pieces that can hide a body against every solid piece, the solid pieces batched against each by itself — draws each way
// COMPARE_DRAWS times, turn about (the way as first written is the reference), and counts a pixel as differing only if none
// of the one way's drawings shows a colour that one of the reference's shows there (tools/pixel-agree.mjs: the rule, and
// why it is this one). The JSON carries, for each compare, beside differing and worst: draws (how often each way was
// drawn), firstPair (the pixels in which the first drawing of each differed — what the old compare read), and the card's own
// noise in those very drawings — unsteady / unsteadyBy (pixels not the same in every drawing of the reference way, and by
// how much), otherUnsteady / otherUnsteadyBy (of the other way).
//
// viewer.foliage-drawn-once (2026-10-05): the scene's two-sided blended pieces — its foliage — are each drawn once where three
// drew each twice, behind a switch the page can be asked the other side of while it runs (src/terrain3d.js V.foliage.once; a
// page built before that item has none and the column reads —). A row says what the page says of its foliage (how many pieces
// in how many materials, how many are in the still view's sight, which way they are drawn), and carries (JSON: foliageWays)
// the still frames measured on the same view BOTH ways — drawn once, then twice as before: the draw calls, counted — and
// frames taken turn about, one drawn once and one drawn twice (once, twice, once, twice …), the median of each and their
// ratio: the two kinds timed under the same load. In the round of views the shadow is compared over, every view is also
// drawn both ways WITH its blended pieces in the picture, and every pixel of both canvases compared: how many differ, by how
// much at the most, how many by more than 16 of 255 — beside what two frames drawn the SAME way differ by, each way (the
// blended pieces' own frame-to-frame difference, viewer SWITCHES blendedPiecesShimmer: what is under it is not the switch's).
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {comparer} from './pixel-agree.mjs'
const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
/** how often each way of a compare is drawn at a view, turn about with the other (viewer.pixel-compare-tests-hold-against-frame-noise):
    fixed — never raised for a view that differs. Ten: a pixel the card colours two ways with even chances is coloured apart by
    all ten drawings of the two ways twice in a million views (2 x (1/4)^10) */
const COMPARE_DRAWS=10
export const BATTLES=['encounter.opening.orphanage','encounter.opening.lumberjack','encounter.opening.bridge','encounter.opening.cavern-trail','encounter.opening.gates','encounter.opening.cathedral','encounter.caravan-aftermath']
/** the see-through check's own spacing (src/terrain3d.js SEE_EVERY) is 120 ms: a frame this long after the last may run it */
const WITH_CHECK_MS=130,WITHOUT_CHECK_MS=1,WARM_UP=6,SCROLL_PX=14

const argv=process.argv.slice(2),flag=n=>argv.includes(n),valueOf=n=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:undefined}
const takesValue=new Set(['--page','--frames']),named=argv.filter((a,i)=>!a.startsWith('--')&&!takesValue.has(argv[i-1]))
const idOf=name=>name.startsWith('encounter.')?name:BATTLES.find(b=>b.endsWith('.'+name))??name
const battles=named.length?named.map(idOf):BATTLES
const PAGE=resolve(valueOf('--page')??resolve(here,'../../kingdom/BATTLE-SANDBOX.html'))
const FRAMES=Math.max(30,Number(valueOf('--frames')??30)||30)
if(!existsSync(PAGE)){console.error('frame-cost: no built page at '+PAGE);process.exit(2)}

/* ── in the page ── */
/** put the page's frames in the tool's hands: the stored callbacks, the stepped clock, the counted draws */
function install(){
 if(window.__frameCost)return true
 const realNow=performance.now.bind(performance)
 const S=window.__frameCost={queue:new Map(),id:0,fake:realNow(),realNow,counts:null,fb:new WeakMap()}
 window.requestAnimationFrame=cb=>{const id=++S.id;S.queue.set(id,cb);return id}
 window.cancelAnimationFrame=id=>{S.queue.delete(id)}
 performance.now=()=>S.fake
 /* the board's camera glides on Date.now() (src/board.js clockOf): stepped with the same hand, or a turn asked for here would
    still be easing — on the real clock — while frames said to be of one view are compared (found 2026-10-05: two frames drawn
    the same way differed along every edge in the picture) */
 const wall0=Date.now(),fake0=S.fake;Date.now=()=>Math.round(wall0+(S.fake-fake0))
 const P=WebGL2RenderingContext.prototype,bind=P.bindFramebuffer
 P.bindFramebuffer=function(target,f){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)S.fb.set(this,f);return bind.call(this,target,f)}
 const note=(gl,mode,count,instances,many=0)=>{if(!S.counts)return
  const bodies=gl.canvas?.classList?.contains('terrain3d-bodies'),scene=gl.canvas?.classList?.contains('terrain3d-canvas')
  const pass=bodies?'bodies':scene?(S.fb.get(gl)?'shadow':'scene'):'other'
  const tris=(mode===gl.TRIANGLES?count/3:mode===gl.TRIANGLE_STRIP||mode===gl.TRIANGLE_FAN?Math.max(0,count-2):0)*instances
  const c=S.counts[pass]||(S.counts[pass]={draws:0,triangles:0,many:0,inMany:0});c.draws++;c.triangles+=tris;if(many){c.many++;c.inMany+=many}}
 for(const [name,count,inst] of [['drawElements',1,-1],['drawArrays',2,-1],['drawElementsInstanced',1,4],['drawArraysInstanced',2,3]]){const real=P[name]
  P[name]=function(...a){note(this,a[0],a[count],inst<0?1:a[inst]);return real.apply(this,a)}}
 /* one call that draws many (a batch): the extension's own object is the one three already holds — its calls are counted on it */
 for(const c of document.querySelectorAll('canvas.terrain3d-canvas,canvas.terrain3d-bodies')){const gl=c.getContext('webgl2'),x=gl&&gl.getExtension('WEBGL_multi_draw');if(!x||x.__counted)continue;x.__counted=true
  const sum=(list,at,n)=>{let t=0;for(let i=0;i<n;i++)t+=list[at+i];return t}
  const elements=x.multiDrawElementsWEBGL;x.multiDrawElementsWEBGL=function(mode,counts,countsAt,type,offsets,offsetsAt,n){note(gl,mode,sum(counts,countsAt,n),1,n);return elements.apply(this,arguments)}
  const arrays=x.multiDrawArraysWEBGL;x.multiDrawArraysWEBGL=function(mode,firsts,firstsAt,counts,countsAt,n){note(gl,mode,sum(counts,countsAt,n),1,n);return arrays.apply(this,arguments)}}
 return true
}
/** one frame by hand: the clock stepped, every stored callback called once, the 3D scene's own timed */
function tick(step){
 const S=window.__frameCost;S.fake+=step;S.counts={}
 const run=[...S.queue.values()];S.queue.clear()
 let ms=null
 for(const cb of run){
  /* the 3D scene's frame is told from the others by its own words (the page is not minified) */
  if(/sawThrough/.test(String(cb))){const a=S.realNow();cb(S.fake);ms=S.realNow()-a}else cb(S.fake)}
 const counts=S.counts;S.counts=null
 return {ms,counts,runs:window.__sandbox.viewer._V.seeThrough?.runs??null}
}
/** the edge scroll's own step (src/board.js edgeScroll): the view shown as it goes, a little to one side; turned about at a bound */
/** which pieces hide a body now: by the structure and by every triangle — the same? and what each asking cost */
function hidingNow(){
 const s=window.__sandbox.viewer._V.seeThrough,S=window.__frameCost;if(!s?.hiding)return null
 const a=S.realNow(),fast=s.hiding(),b=S.realNow(),plain=s.hiding('plain'),c=S.realNow()
 return {same:fast.length===plain.length&&fast.every((x,i)=>x===plain[i]),hiding:plain.length,ms:b-a,plainMs:c-b}
}
/** what is faded see-through now, and — where the solid pieces are drawn from batches — is every faded piece out of its batch and drawn by itself? */
function fadedNow(){
 const V=window.__sandbox.viewer._V,b=V.solidBatches;if(!V.seeThrough)return null
 return {faded:V.seeThrough.faded.size,...(b?{out:b.out,inStep:b.inStep}:{})}
}
function quarterTurn(){window.__sandbox.viewer.turn(90);return true}
/** what the page says of its foliage — the two-sided blended pieces — and how many of them this view's pass draws */
function foliageNow(){const f=window.__sandbox.viewer._V.foliage;return f?{pieces:f.pieces,materials:f.materials,once:f.once,inSight:f.inSight()}:null}
/** ask for the foliage drawn once (true) or twice, as before (false) */
function foliageWay(once){window.__sandbox.viewer._V.foliage.once=once;return true}
/** the same frame drawn with the scenery's shadow kept, then with the shadow whole: are the two pictures the same, pixel for pixel? */
function shadowBothWays(DRAWS){
 const V=window.__sandbox.viewer._V,k=V.sceneryShadow,S=window.__frameCost;if(!k||!V.seeThrough)return null
 const read=()=>[...document.querySelectorAll('canvas.terrain3d-canvas,canvas.terrain3d-bodies')].map(c=>{const gl=c.getContext('webgl2'),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4)
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);return px})
 const differ=(A,B)=>{let n=0,worst=0;for(let c=0;c<A.length;c++){const a=A[c],b=B[c]
   for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]),Math.abs(a[i+3]-b[i+3]));if(d){n++;if(d>worst)worst=d}}}return {n,worst}}
 const drawnOf=a=>{let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}
 /* The clock is held for every frame here: nothing animates between the pictures.
    The scene's BLENDED pieces (its leaves and the like: several hundred on the Orphanage) are first counted as they are: two
    frames of them drawn the same way are not the same picture (found 2026-10-05 while this comparison was written: a few
    hundred to a few thousand pixels differ by a few shades from one identical frame to the next, and none once those pieces
    are left out — nothing of the shadow's). So for the comparison itself they are left out of the PICTURE — their colour not
    written; they cast in the shadow pass as always, and every other piece and every body is shaded by them. */
 /* (a frame in which nothing changed is not drawn — viewer.still-frame-draws-nothing — so each of these is drawn by moving the
    camera's version on: the view is the same, the frame is drawn, and no body has moved) */
 const draw=()=>{V.camVersion=(V.camVersion||0)+1;S.tick(0)}
 draw();const one=read();draw();const blendedNoise=differ(one,read()).n
 let scene=V.seeThrough.pieces()[0]?.o;while(scene?.parent)scene=scene.parent
 const blended=new Set();scene?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m&&m.transparent&&m.colorWrite)blended.add(m)})
 for(const m of blended)m.colorWrite=false
 /* viewer.pixel-compare-tests-hold-against-frame-noise: THE CARD DOES NOT GIVE A STILL FRAME THE SAME PICTURE EVERY TIME — a
    handful of pixels, the same ones for a view, are one shade off now and then, however the frame is drawn (the header; viewer
    SWITCHES frameNoiseOneShade). So each compare draws each way DRAWS times, turn about — the way as first written (the
    reference), then the other — and a pixel counts as differing only if no drawing of the other way shows a colour that a
    drawing of the reference shows there (S.comparer: tools/pixel-agree.mjs). Asking for the other way takes the scenery's
    shadow again on the next frame (the kept shadow and the batches both do), so the picture read is the frame AFTER it.
    No drawing is repeated for a view that differs. */
 /* (the drawings are not kept: each is read into the same pair of buffers and handed to the compare, which keeps what the
    rule needs of it — twenty whole pictures a compare held at once stalled the page now and then on a busy machine) */
 const scratch=[],readOver=()=>[...document.querySelectorAll('canvas.terrain3d-canvas,canvas.terrain3d-bodies')].map((c,i)=>{const gl=c.getContext('webgl2'),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight
  const px=scratch[i]&&scratch[i].length===w*h*4?scratch[i]:(scratch[i]=new Uint8Array(w*h*4));gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);return px})
 const turnAbout=(reference,other)=>{const c=S.comparer();for(let i=0;i<DRAWS;i++){reference();draw();draw();c.a(readOver());other();draw();draw();c.b(readOver())}return c.done()}
 let first,kept,shadow,depth=null,batched=null
 try{
  draw();first=read()
  draw();kept=read()
  /* the sun's shadow: whole on every drawn frame, as first written (the reference) — kept, the bodies' drawn over it */
  shadow=turnAbout(()=>{k.whole=true},()=>{k.whole=false})
  /* the bodies' depth: from every solid piece, as first written (the reference) — from the pieces that can hide a body */
  if(V.bodiesDepth){const got=turnAbout(()=>{V.bodiesDepth.whole=true},()=>{V.bodiesDepth.whole=false});depth={pieces:V.bodiesDepth.pieces,...got}}
  /* the solid pieces: each by itself, as first written (the reference) — from their batches */
  if(V.solidBatches){const out=V.solidBatches.out,got=turnAbout(()=>{V.solidBatches.whole=true},()=>{V.solidBatches.whole=false});batched={out,...got}}
 }finally{for(const m of blended)m.colorWrite=true}
 draw()
 /* viewer.foliage-drawn-once: LAST, when every older compare of this view is done and read (they are made on the very frames
    they were made on before this one existed: the switch is not thrown until here) — the same view with its foliage drawn once, then twice as before — the blended pieces IN the
    picture (they are what changes) — and, each way, the frame drawn again the same way: what two frames of one way differ by
    is the blended pieces' own (blendedPiecesShimmer), not the switch's. Counted besides: the pixels that differ by more than
    16 of 255 (a shade the eye can find). */
 let foliage=null
 if(V.foliage){const f=V.foliage,was=f.once
  const far=(A,B)=>{let n=0,worst=0,over=0;for(let c=0;c<A.length;c++){const a=A[c],b=B[c]
    for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]),Math.abs(a[i+3]-b[i+3]));if(d){n++;if(d>worst)worst=d;if(d>16)over++}}}return {n,worst,over}}
  const take=way=>{f.once=way;draw();draw();const a=read();draw();return [a,read()]}
  const [on,onAgain]=take(true),inSight=f.inSight(),[off,offAgain]=take(false);f.once=was;draw()
  const d=far(on,off),a=far(on,onAgain),b=far(off,offAgain)
  foliage={inSight,differing:d.n,worst:d.worst,over16:d.over,onceAgain:a.n,onceAgainWorst:a.worst,onceAgainOver16:a.over,twiceAgain:b.n,twiceAgainWorst:b.worst,twiceAgainOver16:b.over}}
 let pixels=0,drawn=0;for(const a of kept){pixels+=a.length/4;drawn+=drawnOf(a)}
 const same=differ(first,kept)
 /* (the bodies' own canvas is the second: what is drawn on it is the bodies in this view) */
 return {canvases:kept.length,pixels,drawn,bodies:kept[1]?drawnOf(kept[1]):0,...shadow,sameWay:same.n,blendedNoise,takes:k.takes,depth,batched,foliage}
}
function scrollStep(px){
 const v=window.__sandbox.viewer,V=v._V,S=window.__frameCost
 const before=V.camTarget?{...V.camTarget}:null
 const go=()=>{V.view.scrolling=true;try{v.pan((S.dir||(S.dir=1))*px,0)}finally{V.view.scrolling=false}}
 go();const after=V.camTarget
 if(before&&after&&Math.abs(after.x-before.x)<.01&&Math.abs(after.y-before.y)<.01){S.dir=-S.dir;go()}
 return true
}

/* ── out of it ── */
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null}
const round=(n,d=1)=>n==null?null:Math.round(n*10**d)/10**d
function summed(frames){
 const passes={};for(const f of frames)for(const [p,c] of Object.entries(f.counts)){(passes[p]??=[]).push(c)}
 const of=p=>({draws:median((passes[p]??[]).map(c=>c.draws).concat(Array(frames.length-(passes[p]?.length??0)).fill(0)))??0,triangles:Math.round(median((passes[p]??[]).map(c=>c.triangles).concat(Array(frames.length-(passes[p]?.length??0)).fill(0)))??0)})
 const shadow=of('shadow'),scene=of('scene'),bodies=of('bodies'),other=of('other')
 /* the calls that draw many, and the pieces they draw: the scene's pass, a middle frame's */
 const mid=(passes.scene??[]).map(c=>({many:c.many??0,inMany:c.inMany??0})).sort((a,b)=>a.many-b.many)[Math.floor((passes.scene?.length??0)/2)]??{many:0,inMany:0},many=(passes.scene?.length??0)*2>frames.length?mid:{many:0,inMany:0}
 const ms=frames.map(f=>f.ms).filter(n=>n!=null)
 return {frames:frames.length,ms:{median:round(median(ms)),min:round(Math.min(...ms)),max:round(Math.max(...ms)),total:round(ms.reduce((a,b)=>a+b,0))},
  draws:{all:shadow.draws+scene.draws+bodies.draws+other.draws,shadow:shadow.draws,scene:scene.draws,bodies:bodies.draws,...(other.draws?{other:other.draws}:{}),...(many.many?{many:many.many,inMany:many.inMany}:{})},
  triangles:{all:shadow.triangles+scene.triangles+bodies.triangles+other.triangles,shadow:shadow.triangles,scene:scene.triangles,bodies:bodies.triangles,...(other.triangles?{other:other.triangles}:{})}}
}
async function measure(page,step,scroll){
 const frames=[];let wall0=0
 for(let i=0;i<WARM_UP+FRAMES;i++){
  if(i===WARM_UP)wall0=Date.now()
  if(scroll)await page.evaluate(scrollStep,SCROLL_PX)
  const f=await page.evaluate(tick,step)
  if(f.ms==null)throw Error('the 3D scene\'s frame was not among the page\'s stored frames')
  if(i>=WARM_UP)frames.push(f)}
 const out=summed(frames),runs=frames.map(f=>f.runs)
 /* the tool's own clock over the measured frames (viewer.frame-time-tests-hold-under-load): each frame's script ran inside it */
 out.wallMs=Date.now()-wall0+1
 /* how often the see-through check ran over these frames, where the page says (src/terrain3d.js V.seeThrough.runs) */
 if(runs[0]!=null)out.checks=runs[runs.length-1]-runs[0]
 return out
}
/** still frames taken turn about — one with the see-through check due, one without (A, B, A, B …) — so the two kinds are
    timed under the same load, frame for frame (viewer.frame-time-tests-hold-under-load) */
async function stillPaired(page){
 const a=[],b=[];let runs0=null,runs1=null
 for(let i=0;i<WARM_UP/2+FRAMES;i++){
  const A=await page.evaluate(tick,WITH_CHECK_MS),B=await page.evaluate(tick,WITHOUT_CHECK_MS)
  if(A.ms==null||B.ms==null)throw Error('the 3D scene\'s frame was not among the page\'s stored frames')
  if(i<WARM_UP/2){runs0=B.runs;continue}
  a.push(A.ms);b.push(B.ms);runs1=B.runs}
 const ma=median(a),mb=median(b)
 return {pairs:a.length,withCheck:round(ma,2),withoutCheck:round(mb,2),ratio:round(ma/mb,3),...(runs0!=null?{checks:runs1-runs0}:{})}
}
/** viewer.foliage-drawn-once: still frames taken turn about, one with the foliage drawn once and one with it drawn twice as
    before (once, twice, once, twice …) — the two kinds timed under the same load, frame for frame. A frame is drawn and let
    go after each change of way (three finds each material's shader again on it), and the next one is the frame timed. */
async function foliagePaired(page){
 const a=[],b=[]
 for(let i=0;i<WARM_UP/2+FRAMES;i++){
  await page.evaluate(foliageWay,true);await page.evaluate(tick,WITHOUT_CHECK_MS);const A=await page.evaluate(tick,WITHOUT_CHECK_MS)
  await page.evaluate(foliageWay,false);await page.evaluate(tick,WITHOUT_CHECK_MS);const B=await page.evaluate(tick,WITHOUT_CHECK_MS)
  if(A.ms==null||B.ms==null)throw Error('the 3D scene\'s frame was not among the page\'s stored frames')
  if(i<WARM_UP/2)continue
  a.push(A.ms);b.push(B.ms)}
 const ma=median(a),mb=median(b)
 return {pairs:a.length,once:round(ma,2),twice:round(mb,2),ratio:round(ma/mb,3)}
}
/** a round of views: the four quarters, the view scrolled at each — which pieces hide a body, both ways, at every one */
async function seeThroughRound(page){
 if(await page.evaluate(hidingNow)===null)return null
 const views=[]
 for(let q=0;q<4;q++){
  for(let i=0;i<8;i++){
   for(let k=0;k<3;k++){await page.evaluate(scrollStep,SCROLL_PX*4);await page.evaluate(tick,WITH_CHECK_MS)}
   views.push({...await page.evaluate(hidingNow),now:await page.evaluate(fadedNow)})}
  await page.evaluate(quarterTurn)
  /* the turn is a glide of about a second: let it arrive */
  for(let i=0;i<14;i++)await page.evaluate(tick,WITH_CHECK_MS)}
 const ms=views.map(v=>v.ms),plain=views.map(v=>v.plainMs)
 const built=await page.evaluate(()=>window.__sandbox.viewer._V.seeThrough.built||null)
 const batched=views.every(v=>v.now&&v.now.inStep!==undefined)
 return {...(built?{built:{pieces:built.pieces,triangles:built.triangles,ms:round(built.ms)}}:{}),views:views.length,same:views.filter(v=>v.same).length,withSomethingHiding:views.filter(v=>v.hiding>0).length,
  /* where the solid pieces are batched: in how many views is every faded piece out of its batch and drawn by itself, and in how many is one out at all */
  ...(batched?{fadedAlone:views.filter(v=>v.now.inStep).length,withAPieceOut:views.filter(v=>v.now.out>0).length,mostOut:Math.max(...views.map(v=>v.now.out))}:{}),
  /* the two askings are made back to back at every view: the ratio of their medians (viewer.frame-time-tests-hold-under-load) */
  pairs:views.length,ratio:round(median(ms)/median(plain),4),
  ms:{median:round(median(ms),2),max:round(Math.max(...ms),2)},plainMs:{median:round(median(plain),1),max:round(Math.max(...plain),1)}}
}
/** a round of views for the shadow: at each of the four quarters the view centred on the unit that acts (bodies and their
    shadows in the picture), then scrolled a little — the frame drawn both ways at every one */
async function shadowRound(page){
 if(await page.evaluate(()=>!window.__sandbox.viewer._V.sceneryShadow))return null
 const arrive=async()=>{for(let i=0;i<14;i++)await page.evaluate(tick,WITH_CHECK_MS)}   // a glide is 1.1 s of the stepped clock
 const views=[]
 for(let q=0;q<4;q++){
  await page.evaluate(()=>{const s=window.__sandbox;s.viewer.centre(s.session.ctx.battleCursor.actor);return true});await arrive()
  views.push(await page.evaluate(shadowBothWays,COMPARE_DRAWS))
  for(let k=0;k<3;k++){await page.evaluate(scrollStep,SCROLL_PX*4);await page.evaluate(tick,WITH_CHECK_MS)}
  views.push(await page.evaluate(shadowBothWays,COMPARE_DRAWS))
  await page.evaluate(quarterTurn);await arrive()}
 /* a compare over the round's views: the most that differed at any view and by how much, the views with nothing differing,
    how often each way was drawn at a view, and the card's own noise in those drawings at its most */
 const most=(of,k)=>Math.max(...views.map(v=>of(v)[k]))
 const over=of=>({same:views.filter(v=>of(v).differing===0).length,differing:most(of,'differing'),worst:most(of,'worst'),draws:Math.min(...views.map(v=>of(v).draws)),firstPair:most(of,'firstPair'),
  unsteady:most(of,'unsteady'),unsteadyBy:most(of,'unsteadyBy'),otherUnsteady:most(of,'otherUnsteady'),otherUnsteadyBy:most(of,'otherUnsteadyBy')})
 return {views:views.length,pixels:views[0].pixels,drawn:Math.min(...views.map(v=>v.drawn)),bodies:Math.min(...views.map(v=>v.bodies)),
  ...over(v=>v),
  sameWay:Math.max(...views.map(v=>v.sameWay)),blendedNoise:Math.max(...views.map(v=>v.blendedNoise)),sceneryShadowDrawn:views[views.length-1].takes,
  ...(views[0].depth?{depth:{pieces:Math.max(...views.map(v=>v.depth.pieces)),...over(v=>v.depth)}}:{}),
  ...(views[0].batched?{batched:{views:views.length,withAPieceOut:views.filter(v=>v.batched.out>0).length,...over(v=>v.batched)}}:{}),
  /* viewer.foliage-drawn-once: over the views, the most and the fewest pixels the two ways differ by, the largest difference,
     and beside them the most two frames drawn the same way differ by, each way */
  ...(views[0].foliage?{foliage:{views:views.length,inSight:Math.max(...views.map(v=>v.foliage.inSight)),differing:Math.max(...views.map(v=>v.foliage.differing)),least:Math.min(...views.map(v=>v.foliage.differing)),
   worst:Math.max(...views.map(v=>v.foliage.worst)),over16:Math.max(...views.map(v=>v.foliage.over16)),
   onceAgain:Math.max(...views.map(v=>v.foliage.onceAgain)),onceAgainWorst:Math.max(...views.map(v=>v.foliage.onceAgainWorst)),onceAgainOver16:Math.max(...views.map(v=>v.foliage.onceAgainOver16)),
   twiceAgain:Math.max(...views.map(v=>v.foliage.twiceAgain)),twiceAgainWorst:Math.max(...views.map(v=>v.foliage.twiceAgainWorst)),twiceAgainOver16:Math.max(...views.map(v=>v.foliage.twiceAgainOver16))}}:{})}
}
/** each thing that can move a pixel, started with the clock held, and what the very next frame did (viewer.still-frame-draws-nothing) */
async function liveRound(page){
 const one=async(step=0)=>{const f=await page.evaluate(tick,step);return Object.values(f.counts).reduce((a,p)=>a+p.draws,0)}
 const out={}
 await one();await one();out.held=await one()                                  // nothing live: nothing drawn
 await page.evaluate(scrollStep,SCROLL_PX);out.camera=await one();out.afterCamera=await one()
 out.idle=await one(16);out.afterIdle=await one()                             // time passed with bodies on the board
 /* an effect on the effects layer (its own canvas, its own frames): started, drawn by the very next frame, and gone when done */
 out.effect=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,S=window.__frameCost,FX=V.fx&&V.fx.FX;if(!FX||!FX.add)return null
  let n=0;FX.add(300,()=>{n++});S.tick(0);const first=n;S.tick(16);const next=n;for(let i=0;i<30;i++)S.tick(16);const ended=n;S.tick(16);return {first,next,ended,after:n}})
 /* a notice: on the page at once and through the next frame */
 out.notice=await page.evaluate(()=>{const v=window.__sandbox.viewer,S=window.__frameCost
  const shown=()=>{const n=document.querySelector('#tutNotice');return !!n&&n.getClientRects().length>0&&/a notice, by hand/.test(n.textContent)}
  v.tell('a notice, by hand');const atOnce=shown();S.tick(0);const nextFrame=shown();v.clearTell();return {atOnce,nextFrame}})
 /* a hover: the pointer moved onto a hex of the board — its tip shows by the very next frame */
 const mid=await page.evaluate(()=>{const r=window.__sandbox.viewer._V.dom.stage.parentNode.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,restY:r.top>80?r.top/2:r.bottom+(window.innerHeight-r.bottom)/2}})
 await page.mouse.move(mid.x-40,mid.y-30);await page.mouse.move(mid.x,mid.y)
 out.hover=await page.evaluate(()=>{window.__frameCost.tick(0);const t=document.querySelector('#hexTip');return {tip:!!t&&t.getClientRects().length>0&&t.textContent.trim().length>0,words:t?t.textContent.trim().slice(0,80):''}})
 /* the pointer put away where it scrolls nothing: off the board, and not at an edge of the screen */
 await page.mouse.move(mid.x,mid.restY);await one()
 return out
}
async function battle(browser,port,id){
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[]
 page.on('pageerror',e=>errors.push(String(e)))
 try{
  const t0=Date.now()
  await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=${id}`)
  await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
  const name=await page.evaluate(()=>document.title||'')
  const flat=await page.evaluate(()=>!window.__sandbox.viewer._V.data.atlas)
  if(flat)return {battle:id,flat:true,note:'a flat battle: no 3D scene, nothing drawn by the 3D frame'}
  await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V,wr=V.dom.stage.parentNode;return wr.classList.contains('terrain3d-ready')||wr.classList.contains('terrain3d-failed')},null,{timeout:240000})
  const failed=await page.evaluate(()=>{const wr=window.__sandbox.viewer._V.dom.stage.parentNode;return wr.classList.contains('terrain3d-failed')?(wr.querySelector('#terrainStatus')?.textContent||'failed'):null})
  if(failed)return {battle:id,flat:true,note:'its 3D scene could not be drawn here: '+failed}
  const loadMs=Date.now()-t0
  const board=await page.evaluate(()=>{const wr=window.__sandbox.viewer._V.dom.stage.parentNode;return {w:wr.clientWidth,h:wr.clientHeight}})
  const gpu=await page.evaluate(()=>{const c=document.querySelector('canvas.terrain3d-canvas'),gl=c?.getContext('webgl2'),x=gl?.getExtension('WEBGL_debug_renderer_info');return gl?String(x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'?'})
  await page.evaluate(install)
  /* (the frame by hand, for the page's own use: a picture is taken in the same task as the frame that drew it) */
  await page.evaluate(src=>{window.__frameCost.tick=(0,eval)('('+src+')')},tick.toString())
  /* (and the rule two ways of drawing a view are compared by: tools/pixel-agree.mjs) */
  await page.evaluate(src=>{window.__frameCost.comparer=(0,eval)('('+src+')')},comparer.toString())
  /* the frames the browser already held are its own to fire: let them, so each lands in the tool's hands */
  await page.waitForFunction(()=>[...window.__frameCost.queue.values()].some(cb=>/sawThrough/.test(String(cb))),null,{timeout:30000})
  /* "nothing moving": the battle opens with a glide to the unit that begins — let it arrive before a still frame is counted */
  for(let i=0;i<40;i++){await page.evaluate(tick,WITH_CHECK_MS);if(!await page.evaluate(()=>!!window.__sandbox.viewer._V.camAnim))break}
  for(let i=0;i<3;i++)await page.evaluate(tick,WITH_CHECK_MS)
  const row={battle:id,name,board,gpu,loadMs}
  const batches=await page.evaluate(()=>{const b=window.__sandbox.viewer._V.solidBatches;return b?{batches:b.batches,pieces:b.pieces,solid:b.solid,ms:b.ms}:null});if(batches)row.batches={...batches,ms:round(batches.ms)}
  row.still={withCheck:await measure(page,WITH_CHECK_MS,false),withoutCheck:await measure(page,WITHOUT_CHECK_MS,false)}
  /* viewer.solid-pieces-drawn-by-material: the same still frames, on the same view, with every solid piece drawn by itself as
     first written — what the batches save is counted in the same run (the calls; the triangles must be the very same) */
  if(row.batches){await page.evaluate(()=>{window.__sandbox.viewer._V.solidBatches.whole=true;return true})
   row.eachByItself=await measure(page,WITHOUT_CHECK_MS,false)
   await page.evaluate(()=>{window.__sandbox.viewer._V.solidBatches.whole=false;return true});for(let i=0;i<3;i++)await page.evaluate(tick,WITH_CHECK_MS)}
  /* viewer.foliage-drawn-once: the same still frames, on the same view, with the foliage drawn once and then twice as before —
     the draw calls each way counted in the same run — and frames of the two ways taken turn about for their ratio */
  const foliage=await page.evaluate(foliageNow)
  if(foliage){row.foliage=foliage
   await page.evaluate(foliageWay,true);for(let i=0;i<3;i++)await page.evaluate(tick,WITHOUT_CHECK_MS)
   const once=await measure(page,WITHOUT_CHECK_MS,false)
   await page.evaluate(foliageWay,false);for(let i=0;i<3;i++)await page.evaluate(tick,WITHOUT_CHECK_MS)
   const twice=await measure(page,WITHOUT_CHECK_MS,false)
   row.foliageWays={once,twice,paired:await foliagePaired(page)}
   await page.evaluate(foliageWay,foliage.once);for(let i=0;i<3;i++)await page.evaluate(tick,WITH_CHECK_MS)}
  row.stillPaired=await stillPaired(page)
  row.scrolling={withCheck:await measure(page,WITH_CHECK_MS,true),withoutCheck:await measure(page,WITHOUT_CHECK_MS,true)}
  row.held=await measure(page,0,false)
  const seen=await seeThroughRound(page);if(seen)row.seeThrough=seen
  const shadow=await shadowRound(page);if(shadow)row.shadow=shadow
  /* last: it moves the pointer */
  row.live=await liveRound(page)
  if(errors.length)row.pageErrors=errors
  return row
 }finally{await page.close()}
}

const n=x=>x==null?'—':x.toLocaleString('en-US')
const short=id=>id.replace(/^encounter\.(opening\.)?/,'')
function table(rows){
 const head=['battle','draw calls a frame (shadow · scene · bodies)','triangles a frame (shadow · scene · bodies)','script ms, still: with the check / without','script ms, scrolling: with / without','draw calls scrolling','see-through checks run: still / scrolling','one check, ms: now / every triangle','same pieces both ways','clock held: draw calls (shadow · scene · bodies)','shadow kept against shadow whole: the same picture?','bodies\' depth: pieces drawn; same picture as every piece?','solid pieces: in batches; batched against each by itself: the same picture?','foliage: pieces, drawn once or twice; draw calls once / twice; once against twice: pixels that differ']
 const lines=rows.map(r=>r.flat?[short(r.battle),r.note,'','','','','','','','','','','','']:[short(r.battle),
  `${n(r.still.withoutCheck.draws.all)} (${n(r.still.withoutCheck.draws.shadow)} · ${n(r.still.withoutCheck.draws.scene)} · ${n(r.still.withoutCheck.draws.bodies)})`,
  `${n(r.still.withoutCheck.triangles.all)} (${n(r.still.withoutCheck.triangles.shadow)} · ${n(r.still.withoutCheck.triangles.scene)} · ${n(r.still.withoutCheck.triangles.bodies)})`,
  `${r.still.withCheck.ms.median} (${r.still.withCheck.ms.min}–${r.still.withCheck.ms.max}) / ${r.still.withoutCheck.ms.median} (${r.still.withoutCheck.ms.min}–${r.still.withoutCheck.ms.max})`,
  `${r.scrolling.withCheck.ms.median} (${r.scrolling.withCheck.ms.min}–${r.scrolling.withCheck.ms.max}) / ${r.scrolling.withoutCheck.ms.median} (${r.scrolling.withoutCheck.ms.min}–${r.scrolling.withoutCheck.ms.max})`,
  `${n(r.scrolling.withoutCheck.draws.all)}`,
  r.still.withCheck.checks==null?'—':`${r.still.withCheck.checks} / ${r.scrolling.withCheck.checks} of ${r.still.withCheck.frames}`,
  r.seeThrough?`${r.seeThrough.ms.median} (to ${r.seeThrough.ms.max}) / ${r.seeThrough.plainMs.median} (to ${r.seeThrough.plainMs.max})`:'—',
  r.seeThrough?`${r.seeThrough.same} of ${r.seeThrough.views} views (${r.seeThrough.withSomethingHiding} with a piece in the way)`:'—',
  `${n(r.held.draws.all)} (${n(r.held.draws.shadow)} · ${n(r.held.draws.scene)} · ${n(r.held.draws.bodies)})`,
  r.shadow?`at most ${n(r.shadow.differing)} of ${n(r.shadow.pixels)} pixels differ${r.shadow.differing?`, by ${r.shadow.worst} of 255`:''}, over ${r.shadow.views} views, each way drawn ${r.shadow.draws} times (the card's own: at most ${n(Math.max(r.shadow.unsteady,r.shadow.otherUnsteady))} pixels unsteady, by ${Math.max(r.shadow.unsteadyBy,r.shadow.otherUnsteadyBy)} of 255); bodies in every view: ${r.shadow.bodies>0?'yes':'NO'}`:'—',
  r.shadow?.depth?`at most ${n(r.shadow.depth.pieces)} pieces; ${n(r.shadow.depth.differing)} pixels differ${r.shadow.depth.differing?`, by ${r.shadow.depth.worst} of 255`:''}`:'—',
  r.batches?`${n(r.batches.pieces)} of ${n(r.batches.solid)} in ${n(r.batches.batches)} batches${r.shadow?.batched?`; at most ${n(r.shadow.batched.differing)} pixels differ${r.shadow.batched.differing?`, by ${r.shadow.batched.worst} of 255`:''}, over ${r.shadow.batched.views} views (${r.shadow.batched.withAPieceOut} with a piece out of its batch; the card's own: at most ${n(Math.max(r.shadow.batched.unsteady,r.shadow.batched.otherUnsteady))} pixels unsteady)`:''}`:'—',
  r.foliage?`${n(r.foliage.pieces)} in ${n(r.foliage.materials)} materials, drawn ${r.foliage.once?'once':'twice'}; ${n(r.foliageWays.once.draws.all)} / ${n(r.foliageWays.twice.draws.all)}${r.shadow?.foliage?`; at most ${n(r.shadow.foliage.differing)} pixels differ, by ${r.shadow.foliage.worst} of 255, ${n(r.shadow.foliage.over16)} by more than 16, over ${r.shadow.foliage.views} views (two frames the same way: once ${n(r.shadow.foliage.onceAgain)}, twice ${n(r.shadow.foliage.twiceAgain)})`:''}`:'—'])
 const w=head.map((h,i)=>Math.max(h.length,...lines.map(l=>l[i].length)))
 const row=c=>'| '+c.map((x,i)=>x.padEnd(w[i])).join(' | ')+' |'
 return [row(head),'|'+w.map(x=>'-'.repeat(x+2)).join('|')+'|',...lines.map(row)].join('\n')
}

const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
 child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d})})
const args=flag('--software')?['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']
const browser=await chromium.launch({channel:'chrome',headless:true,args})
/* an overall deadline: a headless Chrome that hangs must not hold the run, or leave its server behind */
const deadline=setTimeout(()=>{console.error('frame-cost: gave up after '+(4*battles.length+2)+' minutes');child.kill();browser.close().finally(()=>process.exit(1))},(4*battles.length+2)*60000)
let code=0
try{
 const rows=[]
 for(const id of battles){
  try{rows.push(await battle(browser,port,id))}catch(error){rows.push({battle:id,flat:true,note:'not measured: '+String(error?.message||error).split('\n')[0]});code=1}
  if(!flag('--json'))console.error('  measured '+short(id))}
 if(flag('--json'))console.log(JSON.stringify({page:relative(ROOT,PAGE).replace(/\\/g,'/'),window:{w:1920,h:1080},frames:FRAMES,software:flag('--software'),rows},null,1))
 else{
  const first=rows.find(r=>!r.flat)
  console.log(`frame-cost: ${relative(ROOT,PAGE).replace(/\\/g,'/')} in a 1920x1080 window${first?`, the board ${first.board.w}x${first.board.h}, drawn by ${first.gpu}`:''}; each number the median of ${FRAMES} frames (lowest–highest), the bodies idling; script ms is one call of src/terrain3d.js frame()`)
  console.log(table(rows))
  for(const r of rows)if(r.seeThrough?.built)console.log(`  ${short(r.battle)}: the see-through structures — ${n(r.seeThrough.built.pieces)} pieces, ${n(r.seeThrough.built.triangles)} triangles — were built in ${r.seeThrough.built.ms} ms while the scene loaded (the page was ready ${n(r.loadMs)} ms after it was opened)`)
  for(const r of rows)if(r.batches)console.log(`  ${short(r.battle)}: the batches — ${n(r.batches.pieces)} solid pieces in ${n(r.batches.batches)}${r.eachByItself?`: ${n(r.still.withoutCheck.draws.all)} draw calls a frame where each piece by itself is ${n(r.eachByItself.draws.all)} (script ${r.still.withoutCheck.ms.median} ms where ${r.eachByItself.ms.median}), the same ${n(r.eachByItself.triangles.scene)} triangles in the scene's pass${r.eachByItself.triangles.scene===r.still.withoutCheck.triangles.scene?'':' — NOT the same: '+n(r.still.withoutCheck.triangles.scene)}`:''} — were built in ${r.batches.ms} ms while the scene loaded${r.seeThrough?.fadedAlone!=null?`; a piece faded see-through was out of its batch and drawn by itself in ${r.seeThrough.fadedAlone} of ${r.seeThrough.views} views (${r.seeThrough.withAPieceOut} with one out)`:''}`)
  for(const r of rows)if(r.foliage)console.log(`  ${short(r.battle)}: the foliage — ${n(r.foliage.pieces)} two-sided blended pieces in ${n(r.foliage.materials)} materials, ${n(r.foliage.inSight)} in the still view's sight — drawn once: ${n(r.foliageWays.once.draws.all)} draw calls a frame (the scene's pass ${n(r.foliageWays.once.draws.scene)}); drawn twice, as before: ${n(r.foliageWays.twice.draws.all)} (${n(r.foliageWays.twice.draws.scene)}); triangles handed to the card in the scene's pass: ${n(r.foliageWays.once.triangles.scene)} where ${n(r.foliageWays.twice.triangles.scene)} (drawn twice, every foliage triangle is handed over twice); script, frames taken turn about: once ${r.foliageWays.paired.once} ms where twice ${r.foliageWays.paired.twice} (${r.foliageWays.paired.ratio} of it)`)
  for(const r of rows)if(r.pageErrors)console.log(`  ${short(r.battle)}: page errors — ${r.pageErrors.join(' · ')}`)}
}finally{clearTimeout(deadline);await browser.close();child.kill()}
process.exitCode=code
