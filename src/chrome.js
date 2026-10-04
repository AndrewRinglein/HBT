/* ── THE PLAY CHROME (viewer.play-chrome, 2026-09-30; PLAYABLE-OPENING-PLAN.md item 8; engine DECISIONS.md 2026-09-29
   "the playable opening" and "the playable battle screen"). Mounted only for a host that plays (opts.onPlay): the
   End Turn button and its pop-up, End activation, the 2× speed button, and the battle log.
   "There should be a button for 'End whole turn,' but a shadow popup. If you have anybody who has not acted, it should
   pop up and say, 'Are you sure you want to end your turn? You have units that have not acted.'" — who has not acted is
   the engine's (heroesYetToAct, handed over as play facts endTurn.yetToAct); whether End Turn or End activation may be
   given at all is the host's facts (src/play.js). The pop-up is an element on the page, never window.confirm. The
   chrome decides nothing: a click is offered to the host (onPlay {kind:'end-turn'} / {kind:'end-activation'}), which
   gives the engine its command. The speed is the pump's own (viewer.speed — PRESENTATION-CLOCK.md); the log is
   log.js's sentences for the events already played, so an Enemy Phase reads as it animates. */
import { buildLog } from './log.js'

/** the ruled question, word for word (engine DECISIONS.md 2026-09-29 "the playable battle screen") */
export const END_TURN_ASK = 'Are you sure you want to end your turn? You have units that have not acted.'

/* viewer.bar-card-and-log (engine DECISIONS.md 2026-10-03 'the log collapses behind a button out of the way', Andrew: "collapse
   and put an expandable log button somewhere out of the way, not on the screen"): the log is collapsed at mount and its button
   is the top bar's last, at its right end (viewer SWITCHES barLogPlace); open, the log drops over the right-hand panel, never
   the board. Was: on the board beside 2×, the log open over the board's lower left. */
const LOGBTN = `<button id="playLogBtn" type="button" class="pcBtn" aria-pressed="false" aria-expanded="false" aria-controls="playLog" title="Show or hide the battle log">Log</button>`
const CHROME = `<button id="playSpeed" type="button" class="pcBtn" aria-pressed="false" title="Play at double speed">2&times;</button>`
/* viewer.battle-full-screen (engine DECISIONS.md 2026-09-30, Andrew: "You've got End Turn and End Activation on the battle
   map. They shouldn't be. Put them in the lower right-hand corner."): the two endings are off the board, in the screen's
   own lower right-hand corner — the foot of the right-hand panel, beside the action bar. 2× stays on the board (the Log button
   moved to the top bar with viewer.bar-card-and-log). */
const ENDS = `<button id="playEndAct" type="button" class="pcBtn" aria-disabled="true" title="End this hero's activation">End activation</button>`
  + `<button id="playEndTurn" type="button" class="pcBtn pcEnd" aria-disabled="true" title="End the Player Phase">End Turn</button>`
const ASK = `<div id="playAskBox" role="alertdialog" aria-modal="true" aria-labelledby="playAskText" aria-describedby="playAskWho">`
  + `<p id="playAskText"></p><p id="playAskWho"></p>`
  + `<div id="playAskBtns"><button id="playAskNo" type="button" class="pcBtn">Keep playing</button><button id="playAskYes" type="button" class="pcBtn pcEnd">End Turn</button></div></div>`

/* viewer.switch-hero-asks (engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes asks first
   ...', Andrew: "when you double-click on a hero but you still have a hero primary activation left, it should pop up and
   say, 'End activation of X hero and start activation of Y hero.' ... there needs to be some kind of check to make sure that
   I'm willing to end the activation of that other hero."; '... the switch pop-up is for any player unit': "by hero, I just
   mean any player unit ... And you can click yes or no."). One more question on the same path as End Turn's: an element on the
   page, never window.confirm. The chrome decides nothing — the pop-up stands exactly while the host's facts carry the
   question (play facts ask, src/play.js), names the two units as the fold names them, and offers the answer back
   ({kind:'answer', yes}); Esc is No. */
export const switchAsk = (from, to) => `End activation of ${from} and start activation of ${to}?`
const SWITCH = `<div id="playSwitchBox" role="alertdialog" aria-modal="true" aria-labelledby="playSwitchText">`
  + `<p id="playSwitchText"></p>`
  + `<div id="playSwitchBtns"><button id="playSwitchNo" type="button" class="pcBtn">No</button><button id="playSwitchYes" type="button" class="pcBtn pcEnd">Yes</button></div></div>`

/** V: the viewer context; host: {offer(input), speed(x)} — the viewer's own offer to onPlay and its speed() */
export function mountPlayChrome(V, host) {
  const left = V.dom.root.querySelector('#left'), wrap = V.dom.stage.parentNode
  const bar = document.createElement('div'); bar.id = 'playChrome'; bar.innerHTML = CHROME
  const ends = document.createElement('div'); ends.id = 'playEnds'; ends.innerHTML = ENDS
  const log = document.createElement('div'); log.id = 'playLog'; log.setAttribute('role', 'log'); log.setAttribute('aria-label', 'Battle log'); log.style.display = 'none'
  const top = V.dom.root.querySelector('#topbar'); top.insertAdjacentHTML('beforeend', LOGBTN); const logBtn = top.lastElementChild || top.children[top.children.length - 1]
  const ask = document.createElement('div'); ask.id = 'playAsk'; ask.style.display = 'none'; ask.innerHTML = ASK
  const sw = document.createElement('div'); sw.id = 'playSwitch'; sw.style.display = 'none'; sw.innerHTML = SWITCH
  wrap.appendChild(bar); V.dom.root.appendChild(log); left.appendChild(ask); left.appendChild(sw)
  V.dom.root.appendChild(ends); V.dom.root.classList.add('pcEndsOn')    /* the screen's corner, not the board (#left) */
  const q = (root, id) => root.querySelector('#' + id)
  const B = { log: logBtn, speed: q(bar, 'playSpeed'), endAct: q(ends, 'playEndAct'), endTurn: q(ends, 'playEndTurn'),
    text: q(ask, 'playAskText'), who: q(ask, 'playAskWho'), no: q(ask, 'playAskNo'), yes: q(ask, 'playAskYes'),
    swText: q(sw, 'playSwitchText'), swNo: q(sw, 'playSwitchNo'), swYes: q(sw, 'playSwitchYes') }
  B.text.textContent = END_TURN_ASK
  const off = b => b.getAttribute('aria-disabled') === 'true'
  const enable = (b, on) => { b.setAttribute('aria-disabled', on ? 'false' : 'true'); b.classList.toggle('pcOff', !on) }
  /* the chrome sits on the board: a press on it is not the camera's drag, a wheel over the log scrolls the log */
  const stop = e => { e.stopPropagation() }
  for (const n of [bar, ends, log, ask, sw, logBtn]) { n.addEventListener('pointerdown', stop); n.addEventListener('pointerup', stop); n.addEventListener('click', stop) }
  log.addEventListener('wheel', stop)

  /* ── the pop-up ── */
  const names = ids => ids.map(id => (V.S.U[id] && V.S.U[id].name) || ('#' + id)).join(', ')
  /* the two pop-ups share V.asking (the board's keys wait on the answer); only one stands at a time */
  const switching = () => sw.style.display !== 'none', ending = () => ask.style.display !== 'none'
  function open(ids) { V.asking = true; B.who.textContent = 'Not yet acted: ' + names(ids) + '.'; ask.style.display = ''; B.no.focus() }
  function close() { ask.style.display = 'none'; V.asking = switching() }
  /* viewer.switch-hero-asks: shown while the host asks, with the names the fold holds for the two units */
  function openSwitch(a) { const text = switchAsk(names([a.from]), names([a.to]))
    if (switching() && B.swText.textContent === text) return
    if (ending()) close()
    V.asking = true; B.swText.textContent = text; sw.style.display = ''; B.swNo.focus() }
  function closeSwitch() { sw.style.display = 'none'; V.asking = ending() }
  const answer = yes => { if (switching() && V.play && V.play.ask) host.offer({ kind: 'answer', yes }) }
  B.swNo.addEventListener('click', () => answer(false))
  B.swYes.addEventListener('click', () => answer(true))
  B.endTurn.addEventListener('click', () => {
    const end = V.play && V.play.endTurn
    if (off(B.endTurn) || !end) return
    if (end.yetToAct.length) open(end.yetToAct)
    else host.offer({ kind: 'end-turn' })      /* every hero has acted: nothing to ask */
  })
  B.no.addEventListener('click', close)
  B.yes.addEventListener('click', () => { const end = V.play && V.play.endTurn; close(); if (end) host.offer({ kind: 'end-turn' }) })
  B.endAct.addEventListener('click', () => { if (!off(B.endAct) && V.play && V.play.endActivation) host.offer({ kind: 'end-activation' }) })
  const key = e => { if (!V.asking || e.key !== 'Escape') return
    if (switching()) answer(false); else close()
    e.preventDefault() }
  document.addEventListener('keydown', key)

  /* ── 2× (engine DECISIONS.md 2026-09-29: "Enemy turns play out in full animation. Have a double-speed button.") ── */
  B.speed.addEventListener('click', () => { host.speed(V.speed === 2 ? 1 : 2); sync() })

  /* ── the log: the sentences of the events already played, appended as the pump plays them ── */
  let lines = [], shown = 0
  B.log.addEventListener('click', () => { const on = log.style.display === 'none'; log.style.display = on ? '' : 'none'
    B.log.classList.toggle('on', on); B.log.setAttribute('aria-pressed', String(on)); B.log.setAttribute('aria-expanded', String(on)); if (on) log.scrollTop = log.scrollHeight })
  /** the log's lines, rebuilt when events arrive (a live battle pushes more); battle.end names its own Turn */
  function relog() { const end = V.EV.find(e => e.type === 'battle.end'); lines = buildLog(V.EV, V.data.SN, end ? end.turn : V.meta.turns) }
  function row(l) { const d = document.createElement('div'); d.className = 'ln ' + l.cls; d.setAttribute('data-i', String(l.i)); d.innerHTML = l.t; return d }
  function syncLog() {
    let n = 0; while (n < lines.length && lines[n].i < V.cursor) n++
    if (n === shown) return
    if (n < shown) { log.innerHTML = ''; shown = 0 }           /* a seek back: the log is what has been played */
    for (; shown < n; shown++) log.appendChild(row(lines[shown]))
    log.scrollTop = log.scrollHeight                            /* scroll the log box, never the page (PLAYBACK-DESIGN §7.7) */
  }

  /** the buttons follow the host's facts and the pump's speed; the log follows the cursor */
  function sync() {
    const P = V.play
    enable(B.endTurn, !!(P && P.endTurn)); enable(B.endAct, !!(P && P.endActivation))
    if (ending() && !(P && P.endTurn)) close()                  /* the host took End Turn away (a beat is playing, the battle ended) */
    else if (ending()) B.who.textContent = 'Not yet acted: ' + names(P.endTurn.yetToAct) + '.'
    if (P && P.ask) openSwitch(P.ask); else if (switching()) closeSwitch()   /* the pop-up stands exactly while the host asks */
    const fast = V.speed === 2
    B.speed.classList.toggle('on', fast); B.speed.setAttribute('aria-pressed', String(fast))
    syncLog()
  }
  function dispose() { document.removeEventListener('keydown', key); V.asking = false; bar.remove(); ends.remove(); log.remove(); ask.remove(); sw.remove(); logBtn.remove(); V.dom.root.classList.remove('pcEndsOn') }
  return { sync, relog, dispose, dom: { bar, ends, log, ask, sw, ...B } }
}
