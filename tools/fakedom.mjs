/* A small fake DOM for verify.mjs — enough of the platform for the viewer to
   mount, fold every battle and render every surface without a browser. It
   parses innerHTML into a tree (ids, classes, data-*, styles kept as text)
   so querySelector works on the panel and the bar the way it does in a page.
   Not a DOM: no layout, no events beyond listener bookkeeping, no CSS. */

class Style { constructor() { this._p = {} }
  setProperty(k, v) { this._p[k] = v } getPropertyValue(k) { return this._p[k] ?? '' }
  get cssText() { return Object.entries(this._p).map(([k, v]) => `${k}:${v}`).join(';') }
  set cssText(v) { this._p = {}; String(v).split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) this._p[d.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = d.slice(i + 1).trim() }) } }
const styleProxy = () => new Proxy(new Style(), {
  get(t, k) { if (k in t || k === 'cssText') return typeof t[k] === 'function' ? t[k].bind(t) : t[k]; return t._p[k] ?? '' },
  set(t, k, v) { if (k === 'cssText') t.cssText = v; else t._p[k] = v; return true } })

const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link'])

export class El {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.tag = String(tag).toLowerCase(); this.children = []; this.parentNode = null; this.attrs = {}
    this.style = styleProxy(); this._text = ''; this.listeners = {}; this.dataset = {}; this.value = ''
    this.classList = { _s: new Set(), add: (...c) => c.forEach(x => this.classList._s.add(x)), remove: (...c) => c.forEach(x => this.classList._s.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !this.classList._s.has(c); f ? this.classList._s.add(c) : this.classList._s.delete(c); return f },
      contains: c => this.classList._s.has(c) } }
  get className() { return [...this.classList._s].join(' ') } set className(v) { this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)) }
  get id() { return this.attrs.id ?? '' } set id(v) { this.attrs.id = v }
  get firstChild() { return this.children[0] ?? null } get lastChild() { return this.children[this.children.length - 1] ?? null }
  get childNodes() { return this.children } get clientWidth() { return 1920 } get clientHeight() { return 1080 }
  get offsetWidth() { return 100 } get offsetHeight() { return 40 } get offsetTop() { return 0 } get scrollHeight() { return 400 } set scrollTop(v) {} get scrollTop() { return 0 }
  get textContent() { return this._text + this.children.map(c => c.textContent).join('') } set textContent(v) { this._text = String(v); this.children = [] }
  get innerHTML() { return this._html ?? '' }
  set innerHTML(v) { this._html = String(v); this.children = []; this._text = ''; parseInto(this, this._html) }
  insertAdjacentHTML(where, html) { const tmp = new El('div'); tmp.innerHTML = html; for (const c of [...tmp.children]) this.appendChild(c) }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c }
  insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; i < 0 ? this.children.push(c) : this.children.splice(i, 0, c); return c }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c }
  remove() { if (this.parentNode) this.parentNode.removeChild(this) }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v) }
  getAttribute(k) { return this.attrs[k] ?? null } hasAttribute(k) { return k in this.attrs }
  addEventListener(t, f) { (this.listeners[t] ??= []).push(f) } removeEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 } }
  getContext() { return new Proxy({}, { get: (t, k) => k === 'canvas' ? this : (() => {}) }) }
  matches(sel) { return matchSel(this, sel) }
  querySelector(sel) { const r = this.querySelectorAll(sel); return r[0] ?? null }
  querySelectorAll(sel) { const out = []; const walk = n => { for (const c of n.children) { if (matchSel(c, sel)) out.push(c); walk(c) } }; walk(this); return out }
  closest(sel) { for (let p = this; p; p = p.parentNode) if (p.matches && p.matches(sel)) return p; return null }
  focus() {} blur() {} scrollIntoView() {} scrollTo() {}
  contains(n) { for (let p = n; p; p = p.parentNode) if (p === this) return true; return false }
  /** every rendered string on this subtree — markup as set plus text */
  allHTML(out = []) { if (this._html) out.push(this._html); if (this._text) out.push(this._text); this.children.forEach(c => c.allHTML(out)); return out }
}
function matchSel(el, sel) {
  return sel.split(',').some(s => {
    s = s.trim()
    /* descendant chains: "#doc .sub" — the last part on el, the rest up the tree */
    const parts = s.split(/\s+/)
    if (parts.length > 1) {
      if (!matchSel(el, parts[parts.length - 1])) return false
      let p = el.parentNode, i = parts.length - 2
      while (p && i >= 0) { if (matchSel(p, parts[i])) i--; p = p.parentNode }
      return i < 0
    }
    let m
    if ((m = s.match(/^#([\w-]+)$/))) return el.id === m[1]
    if ((m = s.match(/^\.([\w-]+)$/))) return el.classList.contains(m[1])
    if ((m = s.match(/^\[data-([\w-]+)=([\w-]+)\]$/))) return el.attrs['data-' + m[1]] === m[2]
    if ((m = s.match(/^([a-z]+)$/))) return el.tag === m[1]
    return false
  })
}
function parseInto(parent, html) {
  const stack = [parent]
  const re = /<\/?([a-zA-Z][\w-]*)((?:\s+[^\s=>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)|(<!--[\s\S]*?-->)/g
  let m
  while ((m = re.exec(html))) {
    if (m[5]) continue
    if (m[4] !== undefined) { const t = m[4]; if (t.trim()) stack[stack.length - 1]._text += t; continue }
    const closing = m[0].startsWith('</'), tag = m[1].toLowerCase()
    if (closing) { for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break }; continue }
    const e = new El(tag)
    const attrRe = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
    let a
    while ((a = attrRe.exec(m[2] || ''))) { const k = a[1], v = a[2] ?? a[3] ?? a[4] ?? ''; if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v) }
    stack[stack.length - 1].appendChild(e)
    if (!m[3] && !VOID.has(tag)) stack.push(e)
  }
}

export function makeWindow() {
  const document = {
    body: new El('body'), documentElement: new El('html'), head: new El('head'),
    createElement: t => new El(t), createElementNS: (_, t) => new El(t), createTextNode: t => ({ textContent: t }),
    getElementById(id) { return this.body.querySelector('#' + id) ?? this.documentElement.querySelector('#' + id) },
    querySelector(s) { return this.body.querySelector(s) }, querySelectorAll(s) { return this.body.querySelectorAll(s) },
    addEventListener() {},
  }
  const timers = []; let now = 0
  const window = {
    document, innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
    addEventListener() {}, alert(m) { throw new Error('alert: ' + m) },
    requestAnimationFrame: f => { timers.push(f); return timers.length }, cancelAnimationFrame() {},
    setTimeout: (f, ms) => { timers.push(f); return timers.length }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), matchMedia: () => ({ matches: false, addEventListener() {} }),
    performance: { now: () => now }, localStorage: { getItem: () => null, setItem() {} },
    Date: class extends Date { static now() { return now } },
    _tick(ms) { now += ms }, _now: () => now,
  }
  window.window = window
  return window
}
